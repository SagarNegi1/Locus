"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  FlaskConical,
  FolderOpen,
  Pill,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

import AuthGuard from "../../../../components/AuthGuard";
import { supabase } from "../../../../../lib/supabase";
import ExtractedDataCards, {
  type ExtractionData,
} from "../../../patient/components/ExtractedDataCards";
import TimelineSection from "../../../patient/components/TimelineSection";

type MedicalRecord = {
  id: string;
  user_id: string | null;
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

const formatPatientId = (userId: string) => userId.slice(0, 8);

export default function DoctorPatientProfile() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<
    [number, number, number, number] | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPatientRecords = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: recordsError } = await supabase
          .from("medical_records")
          .select("*")
          .eq("user_id", patientId)
          .order("created_at", { ascending: false });

        if (recordsError) {
          throw recordsError;
        }

        if (isMounted) {
          setRecords((data ?? []) as MedicalRecord[]);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this patient's records."
          );
          setRecords([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPatientRecords();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const masterTimeline = useMemo<MasterTimelineEvent[]>(() => {
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

      data?.diagnoses?.forEach((diagnosis) => {
        const { date, rawDate } = getTimelineDate(diagnosis.date);
        events.push({
          type: "diagnosis",
          title: diagnosis.name,
          detail: `Confidence: ${diagnosis.confidence}`,
          date,
          rawDate,
        });
      });

      data?.medications?.forEach((medication) => {
        const { date, rawDate } = getTimelineDate(medication.date);
        events.push({
          type: "medication",
          title: medication.name,
          detail: [medication.dosage, medication.frequency]
            .filter(Boolean)
            .join(" · "),
          date,
          rawDate,
        });
      });

      data?.labResults?.forEach((lab) => {
        const { date, rawDate } = getTimelineDate(lab.date);
        events.push({
          type: "lab",
          title: lab.testName,
          detail: `${lab.value} ${lab.unit || ""}`,
          date,
          rawDate,
        });
      });
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

  const analyticsData = useMemo(() => {
    const uniqueDiagnoses = new Set<string>();
    const uniqueMedications = new Set<string>();
    const uniqueLabs = new Set<string>();
    const uniqueRecentActivity = new Map<string, MasterTimelineEvent>();

    masterTimeline.forEach((event) => {
      const key = `${event.type}:${event.title.trim().toLowerCase()}`;

      if (event.type === "diagnosis") {
        uniqueDiagnoses.add(key);
        if (!uniqueRecentActivity.has(key)) {
          uniqueRecentActivity.set(key, event);
        }
      } else if (event.type === "medication") {
        uniqueMedications.add(key);
        if (!uniqueRecentActivity.has(key)) {
          uniqueRecentActivity.set(key, event);
        }
      } else if (event.type === "lab") {
        uniqueLabs.add(key);
      }
    });

    return {
      totalDiagnoses: uniqueDiagnoses.size,
      totalMedications: uniqueMedications.size,
      totalLabs: uniqueLabs.size,
      recentActivity: Array.from(uniqueRecentActivity.values()).slice(0, 5),
    };
  }, [masterTimeline]);

  const aggregatedExtractionData = useMemo<ExtractionData>(() => {
    const safetyAlerts = records
      .map((record) => record.extracted_data?.safetyAlerts)
      .find((alert) => alert?.conflictFound);

    return {
      encounter_date: records[0]?.extracted_data?.encounter_date,
      diagnoses: records.flatMap(
        (record) => record.extracted_data?.diagnoses ?? []
      ),
      medications: records.flatMap(
        (record) => record.extracted_data?.medications ?? []
      ),
      labResults: records.flatMap(
        (record) => record.extracted_data?.labResults ?? []
      ),
      allergies: records.flatMap(
        (record) => record.extracted_data?.allergies ?? []
      ),
      procedures: records.flatMap(
        (record) => record.extracted_data?.procedures ?? []
      ),
      vitals: records.flatMap((record) => record.extracted_data?.vitals ?? []),
      physicians: records.flatMap(
        (record) => record.extracted_data?.physicians ?? []
      ),
      icdCodes: records.flatMap(
        (record) => record.extracted_data?.icdCodes ?? []
      ),
      familyHistory: records.flatMap(
        (record) => record.extracted_data?.familyHistory ?? []
      ),
      socialHistory: records.flatMap(
        (record) => record.extracted_data?.socialHistory ?? []
      ),
      imagingFindings: records.flatMap(
        (record) => record.extracted_data?.imagingFindings ?? []
      ),
      documentDates: records.flatMap((record) => record.extracted_data?.documentDates ?? []),
      cptCodes: records.flatMap((record) => record.extracted_data?.cptCodes ?? []),
      pathologyFindings: records.flatMap((record) => record.extracted_data?.pathologyFindings ?? []),
      symptoms: records.flatMap((record) => record.extracted_data?.symptoms ?? []),
      chronicDiseaseIndicators: records.flatMap(
        (record) => record.extracted_data?.chronicDiseaseIndicators ?? []
      ),
      vaccinations: records.flatMap((record) => record.extracted_data?.vaccinations ?? []),
      facilities: records.flatMap((record) => record.extracted_data?.facilities ?? []),
      insuranceDetails: records.flatMap((record) => record.extracted_data?.insuranceDetails ?? []),
      emergencyContacts: records.flatMap((record) => record.extracted_data?.emergencyContacts ?? []),
      followUpRecommendations: records.flatMap(
        (record) => record.extracted_data?.followUpRecommendations ?? []
      ),
      pregnancyStatus: records.flatMap((record) => record.extracted_data?.pregnancyStatus ?? []),
      dischargeDetails: records.flatMap((record) => record.extracted_data?.dischargeDetails ?? []),
      referralRecommendations: records.flatMap(
        (record) => record.extracted_data?.referralRecommendations ?? []
      ),
      safetyAlerts,
    };
  }, [records]);

  const timelineEvents = masterTimeline.map((event) => ({
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
  }));

  return (
    <AuthGuard requiredRole="doctor">
      <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/doctor"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Queue
              </Link>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
                Patient Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Patient {formatPatientId(patientId)}
              </h1>
              <p className="mt-2 font-mono text-sm text-slate-500">{patientId}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Records
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {records.length}
              </p>
            </div>
          </header>

          {isLoading ? (
            <div className="space-y-6" aria-label="Loading patient profile">
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load patient records</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-16 text-center">
              <FolderOpen className="h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No medical records yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                This patient has not uploaded any medical records.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <ExtractedDataCards
                data={aggregatedExtractionData}
                isProcessing={false}
                activeHighlight={activeHighlight}
                onHighlight={setActiveHighlight}
              />

              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                    Master Timeline
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    A unified chronological view of extracted medical events.
                  </p>
                </div>
                {timelineEvents.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
                    No dated clinical events found.
                  </div>
                ) : (
                  <TimelineSection events={timelineEvents} />
                )}
              </section>

              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                    Health Analytics
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Aggregate insights across this patient&apos;s medical history.
                  </p>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 ">
                        <Stethoscope className="h-7 w-7 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal leading-none tracking-tight text-slate-800">
                          {analyticsData.totalDiagnoses}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                          Diagnoses Found
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 ">
                        <Pill className="h-7 w-7 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal leading-none tracking-tight text-slate-800">
                          {analyticsData.totalMedications}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                          Medications
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ">
                        <FlaskConical className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal leading-none tracking-tight text-slate-800">
                          {analyticsData.totalLabs}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                          Lab Results
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2 px-2">
                      <TrendingUp className="h-5 w-5 text-slate-600" />
                      <h3 className="text-lg font-bold text-slate-800">
                        Recent Activity &amp; Trends
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {analyticsData.recentActivity.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          No recent diagnoses or medications found.
                        </div>
                      ) : (
                        <div className="flex flex-col divide-y divide-slate-100">
                          {analyticsData.recentActivity.map((activity, index) => (
                            <div
                              key={`${activity.type}-${activity.title}-${index}`}
                              className="flex items-center justify-between p-5 transition-colors hover:bg-slate-50/50"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border  ${activity.type === "diagnosis"
                                    ? "border-blue-100 bg-blue-50 text-blue-600"
                                    : "border-amber-100 bg-amber-50 text-amber-600"
                                    }`}
                                >
                                  {activity.type === "diagnosis" ? (
                                    <Stethoscope className="h-5 w-5" />
                                  ) : (
                                    <Pill className="h-5 w-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {activity.title}
                                  </p>
                                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    {activity.detail}
                                  </p>
                                </div>
                              </div>
                              <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-400">
                                {activity.date}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
