"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ExtractionData } from "./ExtractedDataCards";
import MedicalTimeline from "./MedicalTimeline";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
});

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  activeHighlight: [number, number, number, number] | null;
  activeSourcePage?: number;
  extractionData: ExtractionData | null;
  onItemClick: (boundingBox: [number, number, number, number] | null, sourcePage?: number) => void;
}

export default function CitationModal({
  isOpen,
  onClose,
  pdfUrl,
  activeHighlight,
  activeSourcePage,
  extractionData,
  onItemClick,
}: CitationModalProps) {
  if (!isOpen || !pdfUrl || !extractionData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] h-[96vh] p-0 bg-white rounded-3xl overflow-hidden flex flex-row shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-slate-200/50 z-50 [&>button[aria-label='Close']]:hidden gap-0">
        <DialogTitle className="sr-only">Medical History Citation</DialogTitle>
        <DialogDescription className="sr-only">View the PDF citation and highlights</DialogDescription>
        
        {/* Left Column - Details/Timeline */}
        <div className="w-[30%] h-full overflow-y-auto border-r border-slate-200/60 bg-slate-50/50 p-8 shrink-0">
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mb-8">Medical History</h2>
          <MedicalTimeline data={extractionData} onItemClick={onItemClick} />
        </div>

        {/* Right Column - PDF Viewer */}
        <div className="w-[70%] h-full bg-slate-100/50 flex flex-col relative overflow-hidden shrink-0">
          <PdfViewer
            pdfUrl={pdfUrl}
            activeHighlight={activeHighlight}
            activePage={activeSourcePage}
            onClearHighlight={() => onItemClick(null)}
            headerActions={
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 border border-slate-200 transition-all z-[60] cursor-pointer"
              >
                <X className="w-6 h-6 text-slate-700" />
              </button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
