import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeleteSuccessResponse {
  success: true;
}

interface DeleteErrorResponse {
  success: false;
  error: string;
}

// ---------------------------------------------------------------------------
// POST /api/records/delete
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
): Promise<NextResponse<DeleteSuccessResponse | DeleteErrorResponse>> {
  // ── 1. Parse & validate request body ──────────────────────────────
  let recordId: string;
  let pdfUrl: string;

  try {
    const body = (await request.json()) as {
      recordId?: unknown;
      pdfUrl?: unknown;
    };

    if (!body.recordId || typeof body.recordId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'recordId' in request body." },
        { status: 400 },
      );
    }
    if (!body.pdfUrl || typeof body.pdfUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'pdfUrl' in request body." },
        { status: 400 },
      );
    }

    recordId = body.recordId;
    pdfUrl = body.pdfUrl;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // ── 2. Create authenticated Supabase client ───────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return NextResponse.json(
      { success: false, error: "Missing Authorization header." },
      { status: 401 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 3. Verify authentication ──────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  // ── 4. Extract filename from pdfUrl ───────────────────────────────
  let fileName: string;

  try {
    const rawSegment = new URL(pdfUrl).pathname.split("/").pop();
    if (!rawSegment) {
      return NextResponse.json(
        { success: false, error: "Could not extract filename from pdfUrl." },
        { status: 400 },
      );
    }
    fileName = decodeURIComponent(rawSegment);
  } catch {
    return NextResponse.json(
      { success: false, error: "The provided 'pdfUrl' is not a valid URL." },
      { status: 400 },
    );
  }

  // ── 5. Storage wipe + Database wipe ───────────────────────────────
  try {
    // Delete file from Supabase Storage ('records' bucket)
    const { error: storageError } = await supabase.storage
      .from("records")
      .remove([fileName]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      return NextResponse.json(
        { success: false, error: "Failed to delete file from storage." },
        { status: 500 },
      );
    }

    // Delete row from 'medical_records' table, scoped to authenticated user
    const { error: dbError } = await supabase
      .from("medical_records")
      .delete()
      .match({ id: recordId, user_id: user.id });

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to delete record from database." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Hard delete failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while deleting the record.",
      },
      { status: 500 },
    );
  }
}
