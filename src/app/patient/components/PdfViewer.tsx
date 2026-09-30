"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion } from "motion/react";
import { Loader2, AlertCircle, X, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PdfViewerProps {
  pdfUrl: string;
  activeHighlight: [number, number, number, number] | null;
  activePage?: number;
  onClearHighlight: () => void;
  headerActions?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PdfViewer({
  pdfUrl,
  activeHighlight,
  activePage = 1,
  onClearHighlight,
  headerActions,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(Math.max(1, Math.round(activePage || 1)));
  }, [activePage]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const nextWidth = Math.floor(entries[0].contentRect.width);
        setContainerWidth((previousWidth) =>
          previousWidth === nextWidth ? previousWidth : nextWidth,
        );
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col relative"
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 h-14 bg-surface/80 backdrop-blur-md border-b border-document-border flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-secondary" />
          <h2 className="text-body-lg font-semibold text-on-surface">Document View</h2>
        </div>
        <div className="flex flex-row items-center gap-4 shrink-0">
          {numPages > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-md p-1 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-citation-code text-on-surface-variant">
                Page {Math.min(currentPage, numPages)} of {numPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((page) => Math.min(numPages, page + 1))}
                className="rounded-md p-1 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {activeHighlight && (
            <button
              onClick={onClearHighlight}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-document-border text-body-sm font-medium text-on-surface hover:bg-surface-variant rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <X className="w-4 h-4" />
              Clear Selection
            </button>
          )}
          {headerActions}
        </div>
      </div>

      {/* PDF Container */}
      <div 
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-auto flex justify-center bg-gray-100 pt-20 pb-12 px-8"
      >
        <Document
          file={`/api/proxy-pdf?url=${encodeURIComponent(
            encodeURI(
              (() => {
                let decoded = pdfUrl;
                try {
                  while (decoded !== decodeURIComponent(decoded)) {
                    decoded = decodeURIComponent(decoded);
                  }
                } catch {
                  // ignore
                }
                return decoded;
              })()
            )
          )}`}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            setCurrentPage((page) => Math.min(Math.max(1, page), n));
          }}
          loading={
            <div className="flex items-center gap-2 mt-20 text-on-surface-variant">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-body-sm">Loading PDF...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center gap-2 mt-20 text-error">
              <AlertCircle className="w-6 h-6" />
              <span className="text-body-sm">
                Failed to load PDF. Check the URL.
              </span>
            </div>
          }
        >
          {/* Wait for a stable measured viewport before rendering PDF.js. */}
          {containerWidth > 0 && (
            <div className="relative inline-block shadow-2xl bg-white border border-document-border tour-pdf-viewer">
              <Page
                pageNumber={Math.min(currentPage, Math.max(numPages, 1))}
                width={Math.min(800, containerWidth)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />

            {/* ── Bounding Box Highlight Overlay ── */}
              {activeHighlight && (
                <div
                className="absolute bg-yellow-300 opacity-50 mix-blend-multiply border border-yellow-500 rounded z-50 pointer-events-none transition-all duration-300"
                style={{
                  top: `${(activeHighlight[0] / 1000) * 100}%`,
                  left: `${(activeHighlight[1] / 1000) * 100}%`,
                  width: `${((activeHighlight[3] - activeHighlight[1]) / 1000) * 100}%`,
                  height: `${((activeHighlight[2] - activeHighlight[0]) / 1000) * 100}%`,
                }}
                />
              )}
            </div>
          )}
        </Document>
      </div>
    </motion.div>
  );
}
