"use client";

import { motion } from "motion/react";
import {
  Stethoscope,
  Pill,
  FlaskConical,
  ChevronRight,
} from "lucide-react";
import type { ExtractionData } from "./ExtractedDataCards";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BoundingBox = [number, number, number, number];

interface TimelineEntry {
  id: string;
  category: "diagnosis" | "medication" | "lab";
  label: string;
  detail?: string;
  badge?: { text: string; className: string };
  boundingBox: BoundingBox;
  sourcePage: number;
}

interface MedicalTimelineProps {
  data: ExtractionData;
  onItemClick: (boundingBox: BoundingBox, sourcePage?: number) => void;
  showHeader?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_META = {
  diagnosis: {
    icon: Stethoscope,
    dotColor: "bg-blue-500",
    label: "Diagnosis",
    tagClass: "bg-blue-50 text-blue-700 border-blue-200",
    hoverBorder: "hover:border-blue-300",
  },
  medication: {
    icon: Pill,
    dotColor: "bg-amber-500",
    label: "Medication",
    tagClass: "bg-amber-50 text-amber-700 border-amber-200",
    hoverBorder: "hover:border-amber-300",
  },
  lab: {
    icon: FlaskConical,
    dotColor: "bg-emerald-500",
    label: "Lab Result",
    tagClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverBorder: "hover:border-emerald-300",
  },
} as const;

function buildTimeline(data: ExtractionData): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const confidenceClass = (c: string) => {
    if (c === "High") return "bg-clinical-verified/15 text-clinical-verified border-clinical-verified/30";
    if (c === "Medium") return "bg-citation-highlight/40 text-on-surface border-citation-border/50";
    return "bg-error-container/40 text-error border-error/20";
  };

  data.diagnoses.forEach((d, i) => {
    entries.push({
      id: `diag-${i}`,
      category: "diagnosis",
      label: d.name,
      badge: { text: d.confidence, className: confidenceClass(d.confidence) },
      boundingBox: d.boundingBox,
      sourcePage: d.sourcePage ?? 1,
    });
  });

  data.medications.forEach((m, i) => {
    const parts = [m.dosage, m.frequency].filter(Boolean);
    entries.push({
      id: `med-${i}`,
      category: "medication",
      label: m.name,
      detail: parts.length > 0 ? parts.join(" · ") : undefined,
      boundingBox: m.boundingBox,
      sourcePage: m.sourcePage ?? 1,
    });
  });

  data.labResults.forEach((l, i) => {
    entries.push({
      id: `lab-${i}`,
      category: "lab",
      label: l.testName,
      detail: `${l.value}${l.unit ? ` ${l.unit}` : ""}`,
      boundingBox: l.boundingBox,
      sourcePage: l.sourcePage ?? 1,
    });
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MedicalTimeline({
  data,
  onItemClick,
  showHeader = true,
}: MedicalTimelineProps) {
  const entries = buildTimeline(data);

  if (entries.length === 0) return null;

  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-md text-on-surface">
            Extracted Medical History
          </h2>
          <span className="text-citation-code text-on-surface-variant">
            {entries.length} items
          </span>
        </div>
      )}

      {/* Timeline track */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-document-border" />

        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => {
            const meta = CATEGORY_META[entry.category];
            const Icon = meta.icon;

            return (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
                onClick={() => onItemClick(entry.boundingBox, entry.sourcePage)}
                className={`group relative flex items-center gap-4 w-full text-left px-4 py-3 rounded-xl border border-document-border bg-surface transition-all duration-200 cursor-pointer active:scale-[0.995] hover:bg-surface-container-low ${meta.hoverBorder} ${i === 0 ? "tour-timeline-card" : ""}`}
              >
                {/* Dot on the timeline line */}
                <span
                  className={`absolute -left-8 top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full ring-2 ring-surface ${meta.dotColor}`}
                />

                {/* Category icon */}
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-on-surface-variant" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category tag */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${meta.tagClass}`}
                    >
                      {meta.label}
                    </span>

                    {/* Confidence badge (diagnoses only) */}
                    {entry.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${entry.badge.className}`}
                      >
                        {entry.badge.text}
                      </span>
                    )}
                  </div>

                  <p className="text-body-sm font-medium text-on-surface mt-1 truncate">
                    {entry.label}
                  </p>

                  {entry.detail && (
                    <p className="text-citation-code text-on-surface-variant truncate">
                      {entry.detail}
                    </p>
                  )}
                </div>

                {/* Arrow hint */}
                <ChevronRight className="w-4 h-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
