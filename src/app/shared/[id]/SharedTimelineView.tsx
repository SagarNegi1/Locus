"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Clock,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  Eye,
} from "lucide-react";
import TimelineSection from "../../patient/components/TimelineSection";
import MedicalTimeline from "../../patient/components/MedicalTimeline";
import type { ExtractionData } from "../../patient/components/ExtractedDataCards";
import dynamic from "next/dynamic";

const CitationModal = dynamic(
  () => import("../../patient/components/CitationModal"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MedicalRecord = {
  id: string;
  created_at: string;
  pdf_url?: string | null;
  extracted_data?: Partial<ExtractionData> | null;
};

type MasterTimelineEvent = {
  type: "diagnosis" | "medication" | "lab";
  title: string;
  detail: string;
  date: string;
  rawDate: string;
};

interface SharedTimelineViewProps {
  records: MedicalRecord[];
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) return `${days}d ${remainingHours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m remaining`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SharedTimelineView({
  records,
  expiresAt,
}: SharedTimelineViewProps) {
  const [activeHighlight, setActiveHighlight] = useState<
    [number, number, number, number] | null
  >(null);
  const [activeSourcePage, setActiveSourcePage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // ── Derive Master Timeline (same logic as patient/page.tsx) ──────────
  const masterTimeline = useMemo(() => {
    if (!records || records.length === 0) return [];

    const events: MasterTimelineEvent[] = [];
    const uniqueEvents = new Map<string, MasterTimelineEvent>();
    const getEventKey = (event: MasterTimelineEvent) =>
      `${event.type}:${event.title.trim().toLowerCase()}`;

    records.forEach((record) => {
      const data = record.extracted_data;
      const isIsoDate = (value: unknown): value is string =>
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
      const getTimelineDate = (itemDate?: string) => {
        const clinicalDate = isIsoDate(itemDate)
          ? itemDate
          : isIsoDate(data?.encounter_date)
            ? data.encounter_date
            : undefined;
        const dateSource = clinicalDate
          ? new Date(`${clinicalDate}T00:00:00.000Z`)
          : new Date(record.created_at);

        return {
          date: dateSource.toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          rawDate: clinicalDate ? dateSource.toISOString() : record.created_at,
        };
      };

      if (data?.diagnoses) {
        data.diagnoses.forEach((d) => {
          const { date, rawDate } = getTimelineDate(d.date);
          events.push({
            type: "diagnosis",
            title: d.name,
            detail: `Confidence: ${d.confidence}`,
            date,
            rawDate,
          });
        });
      }
      if (data?.medications) {
        data.medications.forEach((m) => {
          const { date, rawDate } = getTimelineDate(m.date);
          events.push({
            type: "medication",
            title: m.name,
            detail: [m.dosage, m.frequency].filter(Boolean).join(" · "),
            date,
            rawDate,
          });
        });
      }
      if (data?.labResults) {
        data.labResults.forEach((l) => {
          const { date, rawDate } = getTimelineDate(l.date);
          events.push({
            type: "lab",
            title: l.testName,
            detail: `${l.value} ${l.unit || ""}`,
            date,
            rawDate,
          });
        });
      }
    });

    events.forEach((event) => {
      const key = getEventKey(event);
      const existing = uniqueEvents.get(key);

      if (
        !existing ||
        new Date(event.rawDate).getTime() > new Date(existing.rawDate).getTime()
      ) {
        uniqueEvents.set(key, event);
      }
    });

    return Array.from(uniqueEvents.values()).sort(
      (a, b) =>
        new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );
  }, [records]);

  // ── Analytics ─────────────────────────────────────────────────────────
  const analyticsData = useMemo(() => {
    const uniqueDiagnoses = new Set<string>();
    const uniqueMedications = new Set<string>();
    const uniqueLabs = new Set<string>();

    masterTimeline.forEach((event) => {
      const key = `${event.type}:${event.title.trim().toLowerCase()}`;
      if (event.type === "diagnosis") uniqueDiagnoses.add(key);
      else if (event.type === "medication") uniqueMedications.add(key);
      else if (event.type === "lab") uniqueLabs.add(key);
    });

    return {
      totalDiagnoses: uniqueDiagnoses.size,
      totalMedications: uniqueMedications.size,
      totalLabs: uniqueLabs.size,
    };
  }, [masterTimeline]);

  // ── Find records with extraction data for the Citation viewer ────────
  const recordsWithData = useMemo(
    () =>
      records.filter(
        (r) =>
          r.extracted_data &&
          r.pdf_url &&
          ((r.extracted_data.diagnoses?.length ?? 0) > 0 ||
            (r.extracted_data.medications?.length ?? 0) > 0 ||
            (r.extracted_data.labResults?.length ?? 0) > 0)
      ),
    [records]
  );

  const selectedRecord = recordsWithData[selectedRecordIndex] ?? null;

  return (
    <div className="clinical-shell text-slate-900 font-body antialiased">
      {/* ── Top Banner ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-[0.2em] text-slate-900 dark:text-white select-none">
              LOCUS
            </span>
            <div className="h-6 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5" />
              Read-Only
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">Secure Share</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                {isMounted ? formatTimeRemaining(expiresAt) : "Calculating..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 ">
              <Stethoscope className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                {analyticsData.totalDiagnoses}
              </p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">
                Diagnoses Found
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 ">
              <Pill className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                {analyticsData.totalMedications}
              </p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">
                Medications
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 ">
              <FlaskConical className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                {analyticsData.totalLabs}
              </p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">
                Lab Results
              </p>
            </div>
          </div>
        </div>

        {/* ── Per-Record Extraction Viewer ──────────────────────────── */}
        {recordsWithData.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                Extracted Medical Data
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Click any item to view its source citation in the original
                document.
              </p>
            </div>

            {/* Record selector (if multiple) */}
            {recordsWithData.length > 1 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {recordsWithData.map((record, idx) => (
                  <button
                    key={record.id}
                    onClick={() => {
                      setSelectedRecordIndex(idx);
                      setActiveHighlight(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      selectedRecordIndex === idx
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                    Record{" "}
                    {new Date(record.created_at).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                      month: "short",
                      day: "numeric",
                    })}
                  </button>
                ))}
              </div>
            )}

            {/* Medical Timeline (clickable — opens CitationModal) */}
            {selectedRecord?.extracted_data && (
              <MedicalTimeline
                data={selectedRecord.extracted_data as ExtractionData}
                onItemClick={(box, sourcePage) => {
                  setActiveHighlight(box);
                  setActiveSourcePage(sourcePage ?? 1);
                  setIsModalOpen(true);
                }}
              />
            )}
          </div>
        )}

        {/* ── Master Timeline ────────────────────────────────────────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              Master Timeline
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              A unified chronological view of all extracted medical events.
            </p>
          </div>

          {masterTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">
                No medical records yet
              </h3>
              <p className="text-slate-500 mt-1 max-w-sm">
                No extracted data is available in this shared summary.
              </p>
            </div>
          ) : (
            <TimelineSection
              events={masterTimeline.map((event) => ({
                date: event.date,
                category: event.type.toUpperCase(),
                categoryColor:
                  event.type === "diagnosis"
                    ? "bg-blue-100 text-blue-700"
                    : event.type === "medication"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700",
                fact: event.title,
                source: "Master Timeline",
                citation: event.detail || "General Record",
              }))}
            />
          )}
        </div>
      </main>

      {/* ── Citation Modal (Bounding Box Viewer) ──────────────────── */}
      <CitationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedRecord?.pdf_url ?? null}
        activeHighlight={activeHighlight}
        activeSourcePage={activeSourcePage}
        extractionData={
          (selectedRecord?.extracted_data as ExtractionData) ?? null
        }
        onItemClick={(box, sourcePage) => {
          setActiveHighlight(box);
          setActiveSourcePage(sourcePage ?? 1);
        }}
      />

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              Secured by LOCUS · Expires{" "}
              {isMounted ? new Date(expiresAt).toLocaleString() : "Loading..."}
            </span>
          </div>
          <span>Read-only shared view · No modifications permitted</span>
        </div>
      </footer>
    </div>
  );
}
