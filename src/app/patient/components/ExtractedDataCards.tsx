"use client";

import { motion } from "motion/react";
import { Stethoscope, Pill, FlaskConical, AlertTriangle, Activity, User, Hash, Syringe, Users, Wine, Scan, FileText } from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirroring the API response shape)
// ---------------------------------------------------------------------------

export type Confidence = "High" | "Medium" | "Low";
export type BoundingBox = [number, number, number, number];

export interface CitedExtractionItem {
  confidence: Confidence;
  boundingBox: BoundingBox;
  sourcePage?: number;
  verified_by?: string;
}

interface DiagnosisItem extends CitedExtractionItem {
  name: string;
  date?: string;
}

interface MedicationItem extends CitedExtractionItem {
  name: string;
  date?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  adherenceClues?: string;
}

interface LabResultItem extends CitedExtractionItem {
  testName: string;
  date?: string;
  value: string;
  unit: string;
  referenceRange?: string;
  isAbnormal?: boolean;
}

interface AllergyItem extends CitedExtractionItem {
  allergen: string;
  reaction?: string;
  severity?: string;
}

interface ProcedureItem extends CitedExtractionItem {
  name: string;
  date?: string;
  body_part?: string;
}

interface VitalItem extends CitedExtractionItem {
  measurement: string;
  value: string;
  unit?: string;
  date?: string;
}

interface PhysicianItem extends CitedExtractionItem {
  name: string;
  role?: string;
  specialty?: string;
}

interface CodeItem extends CitedExtractionItem {
  code: string;
  description?: string;
}

interface FamilyHistoryItem extends CitedExtractionItem {
  condition: string;
  relative: string;
}

interface SocialHistoryItem extends CitedExtractionItem {
  category: "Smoking" | "Alcohol" | "Substance Use";
  status: string;
  details: string;
}

interface ImagingFindingItem extends CitedExtractionItem {
  bodyPart: string;
  finding: string;
}

interface DocumentDateItem extends CitedExtractionItem {
  date: string;
  dateType: string;
}

interface PathologyFindingItem extends CitedExtractionItem {
  specimen: string;
  finding: string;
  interpretation: string;
}

interface SymptomItem extends CitedExtractionItem {
  symptom: string;
  onset: string;
  duration: string;
  status: string;
}

interface ChronicDiseaseIndicatorItem extends CitedExtractionItem {
  condition: string;
  indicator: string;
  status: string;
}

interface VaccinationItem extends CitedExtractionItem {
  vaccine: string;
  date: string;
  dose: string;
}

interface FacilityItem extends CitedExtractionItem {
  hospitalName: string;
  department: string;
}

interface InsuranceItem extends CitedExtractionItem {
  provider: string;
  policyNumber: string;
  memberId: string;
}

interface EmergencyContactItem extends CitedExtractionItem {
  name: string;
  relationship: string;
  phone: string;
}

interface FollowUpRecommendationItem extends CitedExtractionItem {
  recommendation: string;
  timeframe: string;
}

interface PregnancyStatusItem extends CitedExtractionItem {
  status: string;
  gestationalAge: string;
  estimatedDueDate: string;
}

interface DischargeDetailItem extends CitedExtractionItem {
  disposition: string;
  instructions: string;
  diagnosis: string;
}

interface ReferralRecommendationItem extends CitedExtractionItem {
  specialty: string;
  reason: string;
  referredTo: string;
}

export interface ExtractionData {
  encounter_date?: string;
  documentDates?: DocumentDateItem[];
  diagnoses: DiagnosisItem[];
  medications: MedicationItem[];
  labResults: LabResultItem[];
  allergies?: AllergyItem[];
  procedures?: ProcedureItem[];
  vitals?: VitalItem[];
  physicians?: PhysicianItem[];
  icdCodes?: CodeItem[];
  cptCodes?: CodeItem[];
  familyHistory?: FamilyHistoryItem[];
  socialHistory?: SocialHistoryItem[];
  imagingFindings?: ImagingFindingItem[];
  pathologyFindings?: PathologyFindingItem[];
  symptoms?: SymptomItem[];
  chronicDiseaseIndicators?: ChronicDiseaseIndicatorItem[];
  vaccinations?: VaccinationItem[];
  facilities?: FacilityItem[];
  insuranceDetails?: InsuranceItem[];
  emergencyContacts?: EmergencyContactItem[];
  followUpRecommendations?: FollowUpRecommendationItem[];
  pregnancyStatus?: PregnancyStatusItem[];
  dischargeDetails?: DischargeDetailItem[];
  referralRecommendations?: ReferralRecommendationItem[];
  safetyAlerts?: {
    conflictFound: boolean;
    severity: string;
    description: string;
  };
}


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExtractedDataCardsProps {
  data: ExtractionData;
  isProcessing: boolean;
  activeHighlight: [number, number, number, number] | null;
  activeSourcePage?: number;
  onHighlight: (box: [number, number, number, number] | null, sourcePage?: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExtractedDataCards({
  data,
  isProcessing,
  activeHighlight,
  activeSourcePage,
  onHighlight,
}: ExtractedDataCardsProps) {
  // ── Helpers ────────────────────────────────────────────────────────
  const isActiveBox = (box: [number, number, number, number], sourcePage?: number) =>
    activeHighlight &&
    box[0] === activeHighlight[0] &&
    box[1] === activeHighlight[1] &&
    box[2] === activeHighlight[2] &&
    box[3] === activeHighlight[3] &&
    (!activeSourcePage || !sourcePage || activeSourcePage === sourcePage);

  const toggleHighlight = (item: CitedExtractionItem) =>
    onHighlight(isActiveBox(item.boundingBox, item.sourcePage) ? null : item.boundingBox, item.sourcePage);

  const confidenceBadge = (level: "High" | "Medium" | "Low") => {
    const styles = {
      High: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
      Medium: "bg-amber-50 text-amber-700 border-amber-200 shadow-sm",
      Low: "bg-red-50 text-red-700 border-red-200 shadow-sm",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[level]}`}
      >
        {level}
      </span>
    );
  };
  const joinDetails = (...values: Array<string | undefined>) =>
    values.filter((value): value is string => Boolean(value)).join(" | ");

  const additionalSections: Array<{
    key: string;
    title: string;
    items: Array<{
      item: CitedExtractionItem;
      title: string;
      detail: string;
    }>;
  }> = [
    {
      key: "document-dates",
      title: "Document Dates",
      items: (data.documentDates ?? []).map((item) => ({
        item,
        title: item.date,
        detail: item.dateType,
      })),
    },
    {
      key: "pathology",
      title: "Pathology Findings",
      items: (data.pathologyFindings ?? []).map((item) => ({
        item,
        title: item.finding,
        detail: joinDetails(item.specimen, item.interpretation),
      })),
    },
    {
      key: "symptoms",
      title: "Symptoms Timeline",
      items: (data.symptoms ?? []).map((item) => ({
        item,
        title: item.symptom,
        detail: joinDetails(item.onset, item.duration, item.status),
      })),
    },
    {
      key: "chronic",
      title: "Chronic Disease Indicators",
      items: (data.chronicDiseaseIndicators ?? []).map((item) => ({
        item,
        title: item.condition,
        detail: joinDetails(item.status, item.indicator),
      })),
    },
    {
      key: "vaccinations",
      title: "Vaccinations",
      items: (data.vaccinations ?? []).map((item) => ({
        item,
        title: item.vaccine,
        detail: joinDetails(item.date, item.dose),
      })),
    },
    {
      key: "cpt",
      title: "CPT / HCPCS Codes",
      items: (data.cptCodes ?? []).map((item) => ({
        item,
        title: item.code,
        detail: item.description ?? "",
      })),
    },
    {
      key: "facilities",
      title: "Hospital & Department",
      items: (data.facilities ?? []).map((item) => ({
        item,
        title: item.hospitalName,
        detail: item.department,
      })),
    },
    {
      key: "insurance",
      title: "Insurance Details",
      items: (data.insuranceDetails ?? []).map((item) => ({
        item,
        title: item.provider || "Insurance record",
        detail: joinDetails(item.policyNumber, item.memberId),
      })),
    },
    {
      key: "contacts",
      title: "Emergency Contacts",
      items: (data.emergencyContacts ?? []).map((item) => ({
        item,
        title: item.name,
        detail: joinDetails(item.relationship, item.phone),
      })),
    },
    {
      key: "follow-up",
      title: "Follow-up Recommendations",
      items: (data.followUpRecommendations ?? []).map((item) => ({
        item,
        title: item.recommendation,
        detail: item.timeframe,
      })),
    },
    {
      key: "pregnancy",
      title: "Pregnancy Status",
      items: (data.pregnancyStatus ?? []).map((item) => ({
        item,
        title: item.status,
        detail: joinDetails(item.gestationalAge, item.estimatedDueDate),
      })),
    },
    {
      key: "discharge",
      title: "Discharge Details",
      items: (data.dischargeDetails ?? []).map((item) => ({
        item,
        title: item.diagnosis || item.disposition || "Discharge detail",
        detail: joinDetails(item.disposition, item.instructions),
      })),
    },
    {
      key: "referrals",
      title: "Referral Recommendations",
      items: (data.referralRecommendations ?? []).map((item) => ({
        item,
        title: item.specialty || item.referredTo || "Referral",
        detail: joinDetails(item.reason, item.referredTo),
      })),
    },
  ].filter((section) => section.items.length > 0);


  // ── Render ─────────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                <div className="w-24 h-5 rounded-md bg-slate-200 animate-pulse" />
              </div>
              <div className="space-y-3 mt-2">
                <div className="w-full h-4 rounded bg-slate-100 animate-pulse" />
                <div className="w-5/6 h-4 rounded bg-slate-100 animate-pulse" />
                <div className="w-4/6 h-4 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {/* ── Safety Banner ── */}
      {data.safetyAlerts?.conflictFound && (
        <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg mb-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-100" />
          <div>
            <h2 className="text-lg font-bold tracking-tight uppercase">Critical Safety Alert</h2>
            <p className="text-red-50 mt-1 font-medium">{data.safetyAlerts.description}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Diagnoses ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 ">
              <Stethoscope className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Diagnoses
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.diagnoses.length}
            </span>
          </div>

          {data.diagnoses.length === 0 && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No diagnoses found.
            </p>
          )}

          {data.diagnoses.map((d, i) => (
            <motion.div
              key={`diag-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(d)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(d.boundingBox)
                  ? "border-blue-500 bg-blue-50/50 shadow-[0_0_0_1px_rgba(59,130,246,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-800 leading-snug">
                  {d.name}
                </span>
                {d.confidence && confidenceBadge(d.confidence)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Medications ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 ">
              <Pill className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Medications
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.medications.length}
            </span>
          </div>

          {data.medications.length === 0 && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No medications found.
            </p>
          )}

          {data.medications.map((m, i) => (
            <motion.div
              key={`med-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(m)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(m.boundingBox)
                  ? "border-amber-500 bg-amber-50/50 shadow-[0_0_0_1px_rgba(245,158,11,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-medium text-slate-800 block leading-snug">
                    {m.name}
                  </span>
                  {(m.dosage || m.frequency || m.duration || m.adherenceClues) && (
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {[m.dosage, m.frequency, m.duration, m.adherenceClues].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                {m.confidence && confidenceBadge(m.confidence)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Lab Results ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 ">
              <FlaskConical className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Lab Results
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.labResults.length}
            </span>
          </div>

          {data.labResults.length === 0 && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No lab results found.
            </p>
          )}

          {data.labResults.map((l, i) => (
            <motion.div
              key={`lab-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(l)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(l.boundingBox)
                  ? "border-emerald-500 bg-emerald-50/50 shadow-[0_0_0_1px_rgba(16,185,129,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800 leading-snug">
                  {l.testName}
                </span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-2 py-1 rounded-md border ${l.isAbnormal ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                    {l.value}
                    {l.unit && (
                      <span className={`${l.isAbnormal ? 'text-orange-500/80' : 'text-emerald-600/80'} font-medium ml-1`}>
                        {l.unit}
                      </span>
                    )}
                  </span>
                  {l.confidence && confidenceBadge(l.confidence)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Allergies ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-red-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 ">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Allergies
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.allergies?.length || 0}
            </span>
          </div>

          {(!data.allergies || data.allergies.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No allergies extracted.
            </p>
          )}

          {data.allergies?.map((a, i) => (
            <motion.div
              key={`allergy-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(a)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(a.boundingBox)
                  ? "border-red-500 bg-red-50/50 shadow-[0_0_0_1px_rgba(239,68,68,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-red-300 hover:bg-red-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-red-600 leading-snug">
                    {a.allergen}
                  </span>
                  {(a.reaction || a.severity) && (
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {[a.reaction, a.severity].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {a.confidence && confidenceBadge(a.confidence)}
                  {a.sourcePage && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      Pg {a.sourcePage}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Procedures ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-indigo-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 ">
              <Syringe className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Procedures
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.procedures?.length || 0}
            </span>
          </div>

          {(!data.procedures || data.procedures.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No procedures extracted.
            </p>
          )}

          {data.procedures?.map((p, i) => (
            <motion.div
              key={`procedure-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(p)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(p.boundingBox)
                  ? "border-indigo-500 bg-indigo-50/50 shadow-[0_0_0_1px_rgba(99,102,241,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-slate-800 leading-snug">
                    {p.name}
                  </span>
                  {(p.date || p.body_part) && (
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {[p.date, p.body_part].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.confidence && confidenceBadge(p.confidence)}
                  {p.sourcePage && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      Pg {p.sourcePage}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Vitals ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-sky-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 ">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Vitals
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.vitals?.length || 0}
            </span>
          </div>

          {(!data.vitals || data.vitals.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No vitals extracted.
            </p>
          )}

          {data.vitals?.map((v, i) => (
            <motion.div
              key={`vital-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(v)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(v.boundingBox)
                  ? "border-sky-500 bg-sky-50/50 shadow-[0_0_0_1px_rgba(14,165,233,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800 leading-snug">
                  {v.measurement}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-100">
                    {v.value}
                    {v.unit && (
                      <span className="text-sky-600/80 font-medium ml-1">
                        {v.unit}
                      </span>
                    )}
                  </span>
                  {v.confidence && confidenceBadge(v.confidence)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Physicians ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-violet-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 ">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Physicians
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.physicians?.length || 0}
            </span>
          </div>

          {(!data.physicians || data.physicians.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No physicians extracted.
            </p>
          )}

          {data.physicians?.map((ph, i) => (
            <motion.div
              key={`physician-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(ph)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(ph.boundingBox)
                  ? "border-violet-500 bg-violet-50/50 shadow-[0_0_0_1px_rgba(139,92,246,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-slate-800 leading-snug">
                    {ph.name}
                  </span>
                  {(ph.role || ph.specialty) && (
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {ph.role || ph.specialty}
                    </span>
                  )}
                </div>
                {ph.confidence && confidenceBadge(ph.confidence)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── ICD Codes ── */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-pink-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 ">
              <Hash className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              ICD Codes
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {data.icdCodes?.length || 0}
            </span>
          </div>

          {(!data.icdCodes || data.icdCodes.length === 0) && (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">
              No ICD codes extracted.
            </p>
          )}

          {data.icdCodes?.map((icd, i) => (
            <motion.div
              key={`icd-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() =>
                toggleHighlight(icd)
              }
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(icd.boundingBox)
                  ? "border-pink-500 bg-pink-50/50 shadow-[0_0_0_1px_rgba(236,72,153,1)] scale-[1.02]"
                  : "border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-pink-600 leading-snug">
                    {icd.code}
                  </span>
                  {icd.description && (
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {icd.description}
                    </span>
                  )}
                </div>
                {icd.confidence && confidenceBadge(icd.confidence)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Family History ── */}
        {data.familyHistory && data.familyHistory.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-rose-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 ">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                Family History
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {data.familyHistory.length}
              </span>
            </div>

            {data.familyHistory.map((fh, i) => (
              <motion.div
                key={`family-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleHighlight(fh)}
                className="p-4 rounded-2xl border border-slate-200 bg-white mb-3 last:mb-0 cursor-pointer hover:border-rose-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 leading-snug">
                      {fh.condition}
                    </span>
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {fh.relative}
                    </span>
                  </div>
                  {confidenceBadge(fh.confidence)}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Social History ── */}
        {data.socialHistory && data.socialHistory.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-fuchsia-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 ">
                <Wine className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                Social History
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {data.socialHistory.length}
              </span>
            </div>

            {data.socialHistory.map((sh, i) => (
              <motion.div
                key={`social-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleHighlight(sh)}
                className="p-4 rounded-2xl border border-slate-200 bg-white mb-3 last:mb-0 cursor-pointer hover:border-fuchsia-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 leading-snug">
                      {sh.category}
                    </span>
                    <span className="text-xs font-medium text-slate-500 mt-1.5 block">
                      {[sh.status, sh.details].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {confidenceBadge(sh.confidence)}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Imaging Findings ── */}
        {data.imagingFindings && data.imagingFindings.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-cyan-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 ">
                <Scan className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                Imaging Findings
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {data.imagingFindings.length}
              </span>
            </div>

            {data.imagingFindings.map((img, i) => (
              <motion.div
                key={`imaging-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() =>
                  toggleHighlight(img)
                }
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 ${isActiveBox(img.boundingBox)
                    ? "border-cyan-500 bg-cyan-50/50 shadow-[0_0_0_1px_rgba(6,182,212,1)] scale-[1.02]"
                    : "border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30 hover:-translate-y-0.5 hover:shadow-sm"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 leading-snug block mb-1">
                      {img.bodyPart}
                    </span>
                    <span className="text-xs font-medium text-slate-500 leading-relaxed block">
                      {img.finding}
                    </span>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {img.confidence && confidenceBadge(img.confidence)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {additionalSections.map((section) => (
          <div
            key={section.key}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 ">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                {section.title}
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {section.items.length}
              </span>
            </div>

            {section.items.map(({ item, title, detail }, index) => (
              <motion.button
                type="button"
                key={section.key + "-" + index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => toggleHighlight(item)}
                className={
                  "w-full text-left p-4 rounded-2xl border cursor-pointer transition-all duration-300 mb-3 last:mb-0 " +
                  (isActiveBox(item.boundingBox, item.sourcePage)
                    ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800 leading-snug block">
                      {title}
                    </span>
                    {detail && (
                      <span className="text-xs font-medium text-slate-500 mt-1.5 block leading-relaxed">
                        {detail}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-2 block">
                      Page {item.sourcePage ?? 1}
                    </span>
                  </div>
                  {confidenceBadge(item.confidence)}
                </div>
              </motion.button>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
