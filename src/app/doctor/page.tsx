"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FolderOpen, RefreshCw, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "../../../lib/supabase";

type ExtractedData = {
  diagnoses?: unknown[];
  medications?: unknown[];
  labResults?: unknown[];
};

type MedicalRecord = {
  id: string;
  user_id: string | null;
  created_at: string;
  extracted_data: ExtractedData | null;
};

type PatientRow = {
  userId: string;
  documentCount: number;
  latestUpload: string;
  totalDiagnoses: number;
  totalMedications: number;
  totalLabs: number;
};

const countItems = (value: unknown) =>
  Array.isArray(value) ? value.length : 0;

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatPatientId = (userId: string) => userId.slice(0, 8);

export default function DoctorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadRecords = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (isCancelled) return;

      if (userError) {
        setError(userError.message);
        setRecords([]);
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("Unable to identify the signed-in doctor.");
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const clinicId = user.user_metadata?.clinic_id;
      let query = supabase
        .from("medical_records")
        .select("id, user_id, created_at, extracted_data")
        .order("created_at", { ascending: false })
        .limit(50);

      if (typeof clinicId === "string" && clinicId.length > 0) {
        query = query.eq("clinic_id", clinicId);
      }

      const { data, error: recordsError } = await query;

      if (isCancelled) return;

      if (recordsError) {
        setError(recordsError.message);
        setRecords([]);
        setIsLoading(false);
        return;
      }

      setRecords((data ?? []) as MedicalRecord[]);
      setIsLoading(false);
    };

    void loadRecords();

    return () => {
      isCancelled = true;
    };
  }, []);

  const patientRows = useMemo<PatientRow[]>(() => {
    const recordsByPatient = new Map<string, MedicalRecord[]>();

    records.forEach((record) => {
      const userId = record.user_id ?? "unassigned";
      const patientRecords = recordsByPatient.get(userId) ?? [];

      patientRecords.push(record);
      recordsByPatient.set(userId, patientRecords);
    });

    return Array.from(recordsByPatient.entries())
      .map(([userId, patientRecords]) => {
        const latestRecord = patientRecords.reduce((latest, record) => {
          if (!latest) return record;

          return new Date(record.created_at).getTime() >
            new Date(latest.created_at).getTime()
            ? record
            : latest;
        }, patientRecords[0]);

        return patientRecords.reduce<PatientRow>(
          (patient, record) => ({
            ...patient,
            totalDiagnoses:
              patient.totalDiagnoses +
              countItems(record.extracted_data?.diagnoses),
            totalMedications:
              patient.totalMedications +
              countItems(record.extracted_data?.medications),
            totalLabs:
              patient.totalLabs +
              countItems(record.extracted_data?.labResults),
          }),
          {
            userId,
            documentCount: patientRecords.length,
            latestUpload: latestRecord?.created_at ?? "",
            totalDiagnoses: 0,
            totalMedications: 0,
            totalLabs: 0,
          }
        );
      })
      .sort(
        (a, b) =>
          new Date(b.latestUpload).getTime() -
          new Date(a.latestUpload).getTime()
      );
  }, [records]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            <Users className="h-4 w-4" />
            Clinician Workspace
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clinic Triage Queue
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review recent clinic uploads grouped by patient, with key clinical
            totals ready for triage.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to load clinic records</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-semibold text-slate-900">
              Loading clinic records
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Fetching the latest patient uploads.
            </p>
          </div>
        ) : patientRows.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-16 text-center">
            <FolderOpen className="h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No patients in the queue
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Patients with uploaded medical records will appear here for
              clinical triage.
            </p>
          </div>
        ) : patientRows.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.4fr_1fr_1.5fr_1.4fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
              <span>Patient ID</span>
              <span>Documents</span>
              <span>Clinical Totals</span>
              <span>Latest Upload</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-slate-100">
              {patientRows.map((patient) => (
                <article
                  key={patient.userId}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_1.5fr_1.4fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Patient ID
                    </p>
                    <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900">
                      {formatPatientId(patient.userId)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 md:hidden">
                      Documents
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 md:mt-0">
                      {patient.documentCount}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      Diagnoses {patient.totalDiagnoses}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      Meds {patient.totalMedications}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      Labs {patient.totalLabs}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 md:hidden">
                      Latest Upload
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700 md:mt-0">
                      {formatDate(patient.latestUpload)}
                    </p>
                  </div>

                  <Button asChild variant="outline" className="w-full md:w-auto">
                    <Link href={`/doctor/patient/${patient.userId}`}>
                      View Patient
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
