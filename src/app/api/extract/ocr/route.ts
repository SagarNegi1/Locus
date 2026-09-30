import { NextRequest, NextResponse } from "next/server";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LayoutBlock {
  text: string;
  bbox: BoundingBox;
}

interface PageLayout {
  pageNumber: number;
  width: number;
  height: number;
  blocks: LayoutBlock[];
}

interface OcrSuccessResponse {
  success: true;
  rawText: string;
  pages: PageLayout[];
}

interface OcrErrorResponse {
  success: false;
  error: string;
}

type DocumentTextAnchor = {
  textSegments?: { startIndex?: unknown; endIndex?: unknown }[] | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a substring from the full document text using Document AI
 * `textAnchor` offsets.
 */
function extractTextFromAnchor(
  fullText: string,
  textAnchor: DocumentTextAnchor | null | undefined,
): string {
  if (!textAnchor?.textSegments?.length) return "";

  return textAnchor.textSegments
    .map((segment) => {
      const start = Number(segment.startIndex ?? 0);
      const end = Number(segment.endIndex ?? 0);
      return fullText.substring(start, end);
    })
    .join("");
}

/**
 * Build a normalised bounding box from Document AI `normalizedVertices`.
 * Vertices are already 0–1 normalised; we scale them to the absolute page
 * dimensions so the consumer receives pixel coordinates directly.
 *
 * Returns a fallback zero-box when vertices are missing or incomplete.
 */
function buildBoundingBox(
  boundingPoly:
    | { normalizedVertices?: { x?: number | null; y?: number | null }[] | null }
    | null
    | undefined,
  pageWidth: number,
  pageHeight: number,
): BoundingBox {
  const verts = boundingPoly?.normalizedVertices;
  if (!verts || verts.length < 4) {
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  // Vertices arrive as [topLeft, topRight, bottomRight, bottomLeft]
  const xs = verts.map((v) => (v.x ?? 0) * pageWidth);
  const ys = verts.map((v) => (v.y ?? 0) * pageHeight);

  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
  };
}

// ---------------------------------------------------------------------------
// POST /api/extract/ocr
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
): Promise<NextResponse<OcrSuccessResponse | OcrErrorResponse>> {
  // ── 1. Parse & validate request body ────────────────────────────────
  let pdfUrl: string;

  try {
    const body = (await request.json()) as { pdfUrl?: unknown };
    if (!body.pdfUrl || typeof body.pdfUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'pdfUrl' in request body." },
        { status: 400 },
      );
    }
    pdfUrl = body.pdfUrl;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // Basic URL validation
  try {
    new URL(pdfUrl);
  } catch {
    return NextResponse.json(
      { success: false, error: "The provided 'pdfUrl' is not a valid URL." },
      { status: 400 },
    );
  }

  // Reject obviously non-PDF URLs (ignoring query strings for signed URLs)
  const urlPath = new URL(pdfUrl).pathname.toLowerCase();
  if (!urlPath.endsWith(".pdf") && !urlPath.includes(".pdf")) {
    // Firebase Storage URLs encode the path with %2F and often end with
    // the filename, but signed URLs append query params.  We only block
    // URLs whose pathname is *clearly* not a PDF (e.g. `.png`, `.jpg`).
    const extension = urlPath.split(".").pop() ?? "";
    const nonPdfExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff"];
    if (nonPdfExtensions.includes(extension)) {
      return NextResponse.json(
        { success: false, error: "The provided URL does not point to a PDF file." },
        { status: 400 },
      );
    }
  }

  // ── 2. Read required env vars ───────────────────────────────────────
  const projectId = process.env.DOCUMENT_AI_PROJECT_ID;
  const location = process.env.DOCUMENT_AI_LOCATION;
  const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;

  if (!projectId || !location || !processorId) {
    console.error(
      "Document AI environment variables are not configured. " +
        "Ensure DOCUMENT_AI_PROJECT_ID, DOCUMENT_AI_LOCATION, and DOCUMENT_AI_PROCESSOR_ID are set.",
    );
    return NextResponse.json(
      { success: false, error: "OCR service is not configured. Please contact the administrator." },
      { status: 500 },
    );
  }

  // ── 3. Fetch the PDF from the provided URL ─────────────────────────
  let pdfBuffer: Buffer;

  try {
    const pdfResponse = await fetch(pdfUrl);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch the PDF. Remote server responded with status ${pdfResponse.status}.`,
        },
        { status: 502 },
      );
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Error fetching PDF from URL:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve the PDF from the provided URL." },
      { status: 502 },
    );
  }

  if (pdfBuffer.length === 0) {
    return NextResponse.json(
      { success: false, error: "The fetched PDF is empty (0 bytes)." },
      { status: 400 },
    );
  }

  // ── 4. Process with Document AI ────────────────────────────────────
  try {
    const client = new DocumentProcessorServiceClient();
    const resourceName = client.processorPath(projectId, location, processorId);

    const [result] = await client.processDocument({
      name: resourceName,
      rawDocument: {
        content: pdfBuffer.toString("base64"),
        mimeType: "application/pdf",
      },
    });

    const document = result.document;
    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document AI returned an empty document." },
        { status: 500 },
      );
    }

    const fullText = document.text ?? "";

    // ── 5. Build simplified layout array ─────────────────────────────
    const pages: PageLayout[] = (document.pages ?? []).map((page, index) => {
      const pageWidth = page.dimension?.width ?? 0;
      const pageHeight = page.dimension?.height ?? 0;

      // Collect blocks (paragraphs → most useful granularity)
      const blocks: LayoutBlock[] = [];

      for (const block of page.blocks ?? []) {
        const text = extractTextFromAnchor(fullText, block.layout?.textAnchor);
        const bbox = buildBoundingBox(block.layout?.boundingPoly, pageWidth, pageHeight);

        if (text.trim().length > 0) {
          blocks.push({ text: text.trim(), bbox });
        }
      }

      // Fall back to paragraphs if no blocks are present
      if (blocks.length === 0) {
        for (const paragraph of page.paragraphs ?? []) {
          const text = extractTextFromAnchor(fullText, paragraph.layout?.textAnchor);
          const bbox = buildBoundingBox(paragraph.layout?.boundingPoly, pageWidth, pageHeight);

          if (text.trim().length > 0) {
            blocks.push({ text: text.trim(), bbox });
          }
        }
      }

      return {
        pageNumber: index + 1,
        width: pageWidth,
        height: pageHeight,
        blocks,
      };
    });

    // ── 6. Return structured response ────────────────────────────────
    const response: OcrSuccessResponse = {
      success: true,
      rawText: fullText,
      pages,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Document AI processing error:", err);
    return NextResponse.json(
      { success: false, error: "An error occurred while processing the document." },
      { status: 500 },
    );
  }
}
