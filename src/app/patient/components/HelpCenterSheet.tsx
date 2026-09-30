"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { dummyMedicalRecord } from "./tourMockData";
import MedicalTimeline from "./MedicalTimeline";
import dynamic from "next/dynamic";
import type { ExtractionData } from "./ExtractedDataCards";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
});

interface HelpCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpCenterSheet({ open, onOpenChange }: HelpCenterSheetProps) {
  // Localized state specifically for the Help Center. 
  // No global state or context is imported or mutated here.
  const [activeHighlight, setActiveHighlight] = useState<[number, number, number, number] | null>(null);

  const extractionData = dummyMedicalRecord.extracted_data as ExtractionData;
  const pdfUrl = dummyMedicalRecord.pdf_url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="help-center-sheet w-[94vw] sm:max-w-2xl overflow-hidden z-50 p-0 flex flex-col gap-0 border-l shadow-2xl">
        
        <SheetHeader className="p-8 border-b border-slate-200 shrink-0 bg-slate-50/80 backdrop-blur-sm">
          <SheetTitle className="text-2xl font-bold tracking-tight text-slate-900">LOCUS Help Center</SheetTitle>
          <div className="mt-4 text-sm text-slate-600 space-y-3 leading-relaxed">
            <p className="font-semibold text-slate-800">The AI extracts structured facts.</p>
            <p>But it doesn&apos;t just guess. It mathematically maps the fact to the source.</p>
            <p>Clicking a fact below highlights the exact pixels it was extracted from in the document, ensuring 100% verifiability.</p>
          </div>
        </SheetHeader>

        <div className="flex flex-col flex-1 min-h-0 bg-white overflow-hidden">
          {/* Top Section - Interactive Timeline */}
          <div className="help-example-panel w-full shrink-0 border-b p-8 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-widest">Example Extraction</h3>
            <MedicalTimeline 
              data={extractionData} 
              onItemClick={(bbox) => setActiveHighlight(bbox)} 
            />
          </div>

          {/* Bottom Section - PDF Viewer */}
          <div className="help-document-panel w-full flex-1 relative min-h-[360px] overflow-hidden">
            {open && pdfUrl && (
              <PdfViewer
                pdfUrl={pdfUrl}
                activeHighlight={activeHighlight}
                onClearHighlight={() => setActiveHighlight(null)}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
