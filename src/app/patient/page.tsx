"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, FolderOpen, TrendingUp, Activity, Trash2, Download } from "lucide-react";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import UploadHero from "./components/UploadHero";
import { supabase } from "../../../lib/supabase";
import ExtractedDataCards, { type ExtractionData } from "./components/ExtractedDataCards";
import MedicalTimeline from "./components/MedicalTimeline";
import TimelineSection from "./components/TimelineSection";
import ProcessingTracker from "./components/ProcessingTracker";
import { Stethoscope, Pill, FlaskConical, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const CitationModal = dynamic(() => import("./components/CitationModal"), {
  ssr: false,
});

import ShareLinkModal from "./components/ShareLinkModal";
import ProfileSettingsModal from "./components/ProfileSettingsModal";
import GatekeeperSettingsModal from "./components/GatekeeperSettingsModal";
import HelpCenterSheet from "./components/HelpCenterSheet";

const VerificationView = dynamic(() => import("./components/VerificationView"), {
  ssr: false,
});

export type MedicalRecord = {
  id: string;
  created_at: string;
  pdf_url?: string | null;
  extracted_data?: Partial<ExtractionData> | null;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  relatedRecordId?: string;
};

type MasterTimelineEvent = {
  type: "diagnosis" | "medication" | "lab";
  title: string;
  detail: string;
  date: string;
  rawDate: string;
};

type ValidationReasonCode =
  | "NON_MEDICAL"
  | "WRONG_PATIENT"
  | "POOR_LEGIBILITY"
  | "UNSUPPORTED_LANGUAGE"
  | "DUPLICATE_DOCUMENT";

type ExtractionApiResponse =
  | { success: true; data: ExtractionData }
  | {
    success: false;
    error?: string;
    errorType?: "VALIDATION_FAILED";
    reasonCode?: ValidationReasonCode;
    message?: string;
  };

const VALIDATION_ERROR_MESSAGES: Record<ValidationReasonCode, string> = {
  NON_MEDICAL: "This document does not appear to be a valid medical record.",
  WRONG_PATIENT: "This document appears to belong to another patient.",
  POOR_LEGIBILITY: "The scan quality is too low. Please upload a clearer PDF.",
  UNSUPPORTED_LANGUAGE: "Only English medical documents are supported at this time.",
  DUPLICATE_DOCUMENT: "This exact document has already been uploaded to your timeline.",
};

function getExtractionErrorMessage(
  result: ExtractionApiResponse | null,
  fallback: string,
) {
  if (result && !result.success && result.reasonCode) {
    return VALIDATION_ERROR_MESSAGES[result.reasonCode] ?? result.message ?? result.error ?? fallback;
  }

  if (result && !result.success) {
    return result.message ?? result.error ?? fallback;
  }

  return fallback;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [patientHistory, setPatientHistory] = useState<MedicalRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGatekeeperModalOpen, setIsGatekeeperModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // ── Load Notification Read State ─────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("readNotificationIds");
      if (stored) {
        // eslint-disable-next-line
        setReadNotificationIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error("Failed to load read notifications state:", err);
    }
  }, []);

  // ── Global L2 Alert Scanner ─────────────────────────────────────────
  const notifications = useMemo<AppNotification[]>(() => {
    const newNotifications: AppNotification[] = [];

    patientHistory.forEach((record) => {
      if (!record.extracted_data) return;
      const data = record.extracted_data;
      const docName = record.pdf_url ? record.pdf_url.split("/").pop() : "Document";

      let abnormalCount = 0;
      data.labResults?.forEach((lab: { isAbnormal?: boolean }) => {
        if (lab.isAbnormal) abnormalCount++;
      });

      if (abnormalCount > 0) {
        const id = `alert-warn-${record.id}`;
        newNotifications.push({
          id,
          title: "Abnormal Lab Detected",
          message: `⚠️ ${abnormalCount} Abnormal Lab(s) Detected in ${docName}`,
          type: "warning",
          read: readNotificationIds.has(id),
          relatedRecordId: record.id,
        });
      }

      const allergyConflict = data.safetyAlerts?.conflictFound;
      if (allergyConflict) {
        const id = `alert-err-${record.id}`;
        newNotifications.push({
          id,
          title: "Safety Alert",
          message: data.safetyAlerts?.description || "Allergy conflict detected.",
          type: "error",
          read: readNotificationIds.has(id),
          relatedRecordId: record.id,
        });
      }
    });

    return newNotifications;
  }, [patientHistory, readNotificationIds]);

  // ── Onboarding Gate ─────────────────────────────────────────────────
  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/onboarding");
        return;
      }
      if (user.user_metadata?.onboarding_complete === true) {
        setIsOnboarded(true);
      } else {
        router.push("/onboarding");
      }
    };
    checkOnboarding();
  }, [router]);

  // ── Derived Master Timeline ─────────────────────────────────────────
  const masterTimeline = React.useMemo(() => {
    if (!patientHistory || patientHistory.length === 0) return [];

    const events: MasterTimelineEvent[] = [];
    const uniqueEvents = new Map<string, MasterTimelineEvent>();
    const getEventKey = (event: MasterTimelineEvent) =>
      `${event.type}:${event.title.trim().toLowerCase()}`;
    patientHistory.forEach((record) => {
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
          events.push({ type: 'diagnosis', title: d.name, detail: `Confidence: ${d.confidence}`, date, rawDate });
        });
      }
      if (data?.medications) {
        data.medications.forEach((m) => {
          const { date, rawDate } = getTimelineDate(m.date);
          events.push({ type: 'medication', title: m.name, detail: [m.dosage, m.frequency].filter(Boolean).join(' · '), date, rawDate });
        });
      }
      if (data?.labResults) {
        data.labResults.forEach((l) => {
          const { date, rawDate } = getTimelineDate(l.date);
          events.push({ type: 'lab', title: l.testName, detail: `${l.value} ${l.unit || ''}`, date, rawDate });
        });
      }
    });

    events.forEach((event) => {
      const key = getEventKey(event);
      const existing = uniqueEvents.get(key);

      if (!existing || new Date(event.rawDate).getTime() > new Date(existing.rawDate).getTime()) {
        uniqueEvents.set(key, event);
      }
    });

    return Array.from(uniqueEvents.values()).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [patientHistory]);

  // ── Derived Analytics ───────────────────────────────────────────────
  const analyticsData = React.useMemo(() => {
    const uniqueDiagnoses = new Set<string>();
    const uniqueMedications = new Set<string>();
    const uniqueLabs = new Set<string>();
    const uniqueRecentActivity = new Map<string, MasterTimelineEvent>();

    masterTimeline.forEach((event) => {
      const key = `${event.type}:${event.title.trim().toLowerCase()}`;

      if (event.type === 'diagnosis') {
        uniqueDiagnoses.add(key);
        if (!uniqueRecentActivity.has(key)) {
          uniqueRecentActivity.set(key, event);
        }
      } else if (event.type === 'medication') {
        uniqueMedications.add(key);
        if (!uniqueRecentActivity.has(key)) {
          uniqueRecentActivity.set(key, event);
        }
      } else if (event.type === 'lab') {
        uniqueLabs.add(key);
      }
    });

    const totalDiagnoses = uniqueDiagnoses.size;
    const totalMedications = uniqueMedications.size;
    const totalLabs = uniqueLabs.size;

    const recentActivity = Array.from(uniqueRecentActivity.values()).slice(0, 5);

    return { totalDiagnoses, totalMedications, totalLabs, recentActivity };
  }, [masterTimeline]);

  // ── Fetch Patient History ──────────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("medical_records")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) throw error;
          if (data) setPatientHistory(data as MedicalRecord[]);
        }
      } catch (err) {
        console.error("Failed to fetch patient history:", err);
      }
    };

    fetchHistory();
  }, []);

  // ── Extraction state ───────────────────────────────────────────────
  const [loadedPdfUrl, setLoadedPdfUrl] = useState<string | null>(null);
  const [expectedIdentity, setExpectedIdentity] = useState<{
    name: string; dob: string; sex: string; bloodType: string; language: string;
  } | null>(null);
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(
    null,
  );
  const [activeHighlight, setActiveHighlight] = useState<
    [number, number, number, number] | null
  >(null);
  const [activeSourcePage, setActiveSourcePage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);


  // ── Help Center Handler ────────────────────────────────────────────
  const handleHelpClick = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  // ── Core extraction function ───────────────────────────────────────
  const processDocument = useCallback(async (
    pdfUrl: string,
    expectedPatientName?: string,
    expectedDob?: string,
    fileHash?: string,
    expectedSex?: string,
    expectedBloodType?: string,
    expectedLanguage?: string,
    gatekeeperPrefs?: Record<string, unknown>
  ) => {
    setIsProcessing(true);
    setExtractionData(null);
    setActiveHighlight(null);
    setExtractionError(null);

    // If expected identity is explicitly passed, use it and update state, otherwise use state for retries
    const finalPatientName = expectedPatientName ?? expectedIdentity?.name;
    const finalDob = expectedDob ?? expectedIdentity?.dob;
    const finalSex = expectedSex ?? expectedIdentity?.sex;
    const finalBloodType = expectedBloodType ?? expectedIdentity?.bloodType;
    const finalLanguage = expectedLanguage ?? expectedIdentity?.language;

    if (expectedPatientName && expectedDob) {
      setExpectedIdentity({
        name: expectedPatientName,
        dob: expectedDob,
        sex: expectedSex || "Unknown",
        bloodType: expectedBloodType || "Unknown",
        language: expectedLanguage || "English",
      });
    }

    try {
      const response = await fetch("/api/extract/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl,
          expectedPatientName: finalPatientName,
          expectedDob: finalDob,
          expectedSex: finalSex,
          expectedBloodType: finalBloodType,
          expectedLanguage: finalLanguage,
          gatekeeperPrefs: gatekeeperPrefs,
        }),
      });

      const result = (await response.json().catch(() => null)) as ExtractionApiResponse | null;

      if (!response.ok || !result?.success) {
        throw new Error(
          getExtractionErrorMessage(
            result,
            response.ok ? "Extraction failed." : `Extraction failed: ${response.statusText}`,
          ),
        );
      }

      setExtractionData(result.data);

      // Safe DB Injection
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("No authenticated user found for database save.");
        }

        const { data: insertData, error: insertError } = await supabase.from('medical_records').insert([{
          user_id: user.id,
          pdf_url: pdfUrl,
          extracted_data: result.data,
          ...(fileHash && { file_hash: fileHash }),
        }]).select();

        if (insertError) throw insertError;

        if (insertData && insertData.length > 0) {
          setPatientHistory((prev) => [insertData[0] as MedicalRecord, ...prev]);
        }

        setToast({ message: "Saved to secure database", type: "success" });
      } catch (dbError) {
        console.error("Failed to save medical record to database:", dbError);
        setToast({ message: "Failed to save to database", type: "error" });
      }
    } catch (err) {
      console.error("Document extraction failed:", err);
      setExtractionError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [expectedIdentity]);

  // ── Upload complete handler — triggers extraction automatically ────
  const handleUploadComplete = useCallback(
    (downloadUrl: string, expectedPatientName: string, expectedDob: string, fileHash: string, expectedSex: string, expectedBloodType: string, expectedLanguage: string, gatekeeperPrefs?: Record<string, unknown>) => {
      setLoadedPdfUrl(downloadUrl);
      processDocument(downloadUrl, expectedPatientName, expectedDob, fileHash, expectedSex, expectedBloodType, expectedLanguage, gatekeeperPrefs);
    },
    [processDocument],
  );

  // ── Hard Delete handler ─────────────────────────────────────────────
  const handleDeleteRecord = useCallback(async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/records/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          recordId: recordToDelete.id,
          pdfUrl: recordToDelete.pdf_url,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Delete failed.");
      }

      // Domino Effect: filtering patientHistory re-triggers masterTimeline + analyticsData
      setPatientHistory((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setToast({ message: "Record permanently deleted", type: "success" });
    } catch (err) {
      console.error("Delete failed:", err);
      setToast({ message: err instanceof Error ? err.message : "Failed to delete record", type: "error" });
    } finally {
      setRecordToDelete(null);
      setIsDeleting(false);
    }
  }, [recordToDelete]);

  // ── Sign-Out Handler (shared by Sidebar + TopBar avatar dropdown) ───
  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch {
      setToast({ message: "Could not sign out. Please try again.", type: "error" });
    }
  }, [router]);

  // ── Global Search Result Handler ────────────────────────────────────
  const handleSearchResultClick = useCallback((record: MedicalRecord, boundingBox: [number, number, number, number]) => {
    if (record.pdf_url) {
      setLoadedPdfUrl(record.pdf_url);
    }
    if (record.extracted_data) {
      setExtractionData(record.extracted_data as ExtractionData);
    }
    setActiveHighlight(boundingBox);
    setIsModalOpen(true);
  }, []);

  const handleCitationModalClose = useCallback(() => {
    setLoadedPdfUrl(null);
    setExtractionData(null);
    setActiveHighlight(null);
    setActiveSourcePage(1);
    setIsModalOpen(false);
  }, []);

  // ── Notification Click Handler ──────────────────────────────────────
  const handleNotificationClick = useCallback((notification: AppNotification) => {
    // 1. Persist Read State
    const newReadIds = new Set(readNotificationIds);
    newReadIds.add(notification.id);
    setReadNotificationIds(newReadIds);
    try {
      localStorage.setItem("readNotificationIds", JSON.stringify(Array.from(newReadIds)));
    } catch (err) {
      console.error("Failed to save read notification state:", err);
    }

    // 2. Deep Link
    if (notification.relatedRecordId) {
      const record = patientHistory.find((r) => r.id === notification.relatedRecordId);
      if (record) {
        let boundingBox: [number, number, number, number] | null = null;
        if (notification.type === 'warning') {
          const abnormalLab = record.extracted_data?.labResults?.find((l) => l.isAbnormal);
          if (abnormalLab) boundingBox = abnormalLab.boundingBox;
        } else if (notification.type === 'error') {
          const allergy = record.extracted_data?.allergies?.[0];
          if (allergy) boundingBox = allergy.boundingBox;
        }
        handleSearchResultClick(record, boundingBox || [0, 0, 0, 0]);
      }
    }
  }, [patientHistory, handleSearchResultClick, readNotificationIds]);


  const renderMasterTimeline = (showHeader = true) => (
    masterTimeline.length === 0 ? (
      <div className="workspace-empty">
        <FileText className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">No medical records yet</h3>
        <p className="text-slate-500 mt-1 max-w-sm">Upload your first PDF medical document to start extracting insights and building your timeline.</p>
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
        showHeader={showHeader}
      />
    )
  );

  // ── Full-screen loading spinner while identity check is in flight ──
  if (!isOnboarded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="locus-workspace font-body antialiased flex min-h-screen"><a href="#workspace-content" className="skip-link">Skip to workspace</a>
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed right-6 top-6 z-[9999] max-w-sm rounded-2xl border px-5 py-4 text-sm font-medium shadow-lg ${toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
            }`}
        >
          {toast.message}
        </div>
      )}

      <HelpCenterSheet open={isHelpOpen} onOpenChange={setIsHelpOpen} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onHelpClick={handleHelpClick}
      />

      {/* Main workspace — margin tracks sidebar width */}
      <main
        id="workspace-content" className={`workspace-main flex-1 flex flex-col min-h-screen ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
          }`}
      >
        <TopBar
          onHelpClick={handleHelpClick}
          records={patientHistory}
          onSearchResultClick={handleSearchResultClick}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onAvatarClick={() => setIsProfileModalOpen(true)}
          onSettingsClick={() => setIsGatekeeperModalOpen(true)}
          onShareClick={() => setIsShareModalOpen(true)}
          onExportPdf={async () => {
            setIsExporting(true);
            try {
              const { generateDossier } = await import("../../utils/generateDossier");
              await generateDossier(masterTimeline);
              setToast({ message: "Clinical dossier downloaded", type: "success" });
            } catch (err) {
              console.error("PDF generation failed:", err);
              setToast({ message: err instanceof Error ? err.message : "Failed to generate PDF", type: "error" });
            } finally {
              setIsExporting(false);
            }
          }}
          isExporting={isExporting}
          onSignOut={handleSignOut}
        />

        {/* Single-column dashboard canvas */}
        <div className={`workspace-canvas flex flex-col mx-auto w-full ${activeTab === "verification" ? "max-w-none" : ""}`}>
          {activeTab === "upload" && (
            <>
              <div className="workspace-heading"><div><p className="eyebrow">Your health, connected</p><h2>A clearer picture starts here.</h2><p>Your records, the details, and everything in between.</p></div><span className="workspace-date">{patientHistory.length} {patientHistory.length === 1 ? "record" : "records"}<br />in your workspace</span></div>
              <UploadHero onUploadComplete={handleUploadComplete} />

              {/* Active Processing Tracker */}
              {(isProcessing || (loadedPdfUrl && !extractionData && !extractionError)) && (
                <ProcessingTracker tasks={[{
                  filename: loadedPdfUrl ? loadedPdfUrl.split('/').pop() || "Document" : "Document",
                  status: isProcessing ? "Extracting Facts" : "Queued",
                  statusColor: isProcessing ? "text-blue-600" : "text-slate-500",
                  progress: isProcessing ? 50 : 0,
                  detail: isProcessing ? "Verifying against clinical taxonomy..." : "Ready to process...",
                  active: isProcessing
                }]} />
              )}

              {/* Extraction error banner */}
              {extractionError && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 ">
                    <span className="text-red-600 text-xl font-bold">!</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-red-800 tracking-tight">
                      Extraction Failed
                    </p>
                    <p className="text-sm text-red-600/90 truncate mt-0.5">
                      {extractionError}
                    </p>
                  </div>
                  {loadedPdfUrl && (
                    <button
                      onClick={() => processDocument(loadedPdfUrl)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium shadow-[0_2px_10px_-3px_rgba(220,38,38,0.4)] hover:shadow-[0_4px_15px_-3px_rgba(220,38,38,0.5)] hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* High-Level Summary */}
              {(extractionData || isProcessing) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Diagnoses Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 ">
                      {isProcessing ? <Loader2 className="w-7 h-7 text-blue-600 animate-spin" /> : <Stethoscope className="w-7 h-7 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                        {isProcessing ? "-" : extractionData?.diagnoses.length || 0}
                      </p>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Diagnoses Found</p>
                    </div>
                  </div>

                  {/* Medications Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 ">
                      {isProcessing ? <Loader2 className="w-7 h-7 text-amber-600 animate-spin" /> : <Pill className="w-7 h-7 text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                        {isProcessing ? "-" : extractionData?.medications.length || 0}
                      </p>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Medications</p>
                    </div>
                  </div>

                  {/* Lab Results Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 ">
                      {isProcessing ? <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" /> : <FlaskConical className="w-7 h-7 text-emerald-600" />}
                    </div>
                    <div>
                      <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                        {isProcessing ? "-" : extractionData?.labResults.length || 0}
                      </p>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Lab Results</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Timeline */}
              {extractionData && !isProcessing && (
                <MedicalTimeline
                  data={extractionData}
                  showHeader={false}
                  onItemClick={(box, sourcePage) => {
                    setActiveHighlight(box);
                    setActiveSourcePage(sourcePage ?? 1);
                    setIsModalOpen(true);
                  }}
                />
              )}
              {extractionData && !isProcessing && (
                <ExtractedDataCards
                  data={extractionData}
                  isProcessing={false}
                  activeHighlight={activeHighlight}
                  activeSourcePage={activeSourcePage}
                  onHighlight={(box, sourcePage) => {
                    setActiveHighlight(box);
                    setActiveSourcePage(sourcePage ?? 1);
                    if (box) setIsModalOpen(true);
                  }}
                />
              )}


              {renderMasterTimeline(false)}
            </>)}

          {activeTab === "records" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your records</h2>
                <p className="text-slate-500 text-sm mt-1">Review your previously processed medical documents.</p>
              </div>

              {patientHistory.length === 0 ? (
                <div className="workspace-empty">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No medical records yet</h3>
                  <p className="text-slate-500 mt-1 max-w-sm">Upload your first PDF medical document to start extracting insights and building your timeline.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {patientHistory.map((record) => {
                    const data = record.extracted_data;
                    const dCount = data?.diagnoses?.length || 0;
                    const mCount = data?.medications?.length || 0;
                    const lCount = data?.labResults?.length || 0;

                    return (
                      <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-none hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors ">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                            {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-800 truncate">Document Record</h3>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          Contains <span className="font-medium text-slate-700">{dCount}</span> diagnoses, <span className="font-medium text-slate-700">{mCount}</span> medications, and <span className="font-medium text-slate-700">{lCount}</span> labs.
                        </p>
                        {/* Action row */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                          {record.pdf_url && (
                            <a href={record.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setRecordToDelete(record); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors ml-auto cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your health timeline</h2>
                <p className="text-slate-500 text-sm mt-1">A unified chronological view of all extracted medical events.</p>
              </div>

              {renderMasterTimeline()}
            </div>
          )}

          {activeTab === "verification" && (
            <VerificationView
              records={patientHistory}
              onRecordsUpdate={setPatientHistory}
              onToast={(message, type) => setToast({ message, type })}
            />
          )}

          {activeTab === "analytics" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your health at a glance</h2>
                <p className="text-slate-500 text-sm mt-1">Aggregate insights across your entire medical history.</p>
              </div>

              {patientHistory.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 text-slate-400">
                    <Activity className="w-8 h-8" />
                  </div>
                  <p className="text-slate-500 font-medium">No data available for analytics.</p>
                  <p className="text-slate-400 text-sm mt-1">Upload a medical document to generate your health insights.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Top Level Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none transition-all duration-300">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 ">
                        <Stethoscope className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                          {analyticsData.totalDiagnoses}
                        </p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Diagnoses Found</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none transition-all duration-300">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 ">
                        <Pill className="w-7 h-7 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                          {analyticsData.totalMedications}
                        </p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Medications</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-5 shadow-none transition-all duration-300">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 ">
                        <FlaskConical className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-normal text-slate-800 tracking-tight leading-none">
                          {analyticsData.totalLabs}
                        </p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2">Lab Results</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4 px-2">
                      <TrendingUp className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-bold text-slate-800">Recent Activity & Trends</h3>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      {analyticsData.recentActivity.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No recent diagnoses or medications found.</div>
                      ) : (
                        <div className="flex flex-col divide-y divide-slate-100">
                          {analyticsData.recentActivity.map((activity, idx) => (
                            <div key={idx} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0  border ${activity.type === 'diagnosis' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                  }`}>
                                  {activity.type === 'diagnosis' ? <Stethoscope className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{activity.title}</p>
                                  <p className="text-xs font-medium text-slate-500 mt-0.5">{activity.detail}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                {activity.date}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(!["upload", "records", "timeline", "analytics", "verification"].includes(activeTab)) && (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm mt-8 animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                <FolderOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight capitalize">{activeTab} View</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">
                This view is part of the next phase. You currently have <span className="font-semibold text-slate-700">{patientHistory.length}</span> saved records in the database.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Citation Modal */}
      <CitationModal
        isOpen={isModalOpen}
        onClose={handleCitationModalClose}
        pdfUrl={loadedPdfUrl}
        activeHighlight={activeHighlight}
        activeSourcePage={activeSourcePage}
        extractionData={extractionData}
        onItemClick={(box, sourcePage) => {
          setActiveHighlight(box);
          setActiveSourcePage(sourcePage ?? 1);
        }}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5 border border-red-100">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Delete Medical Record?</h3>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Are you sure? This action cannot be undone. The document will be permanently
              deleted and all associated diagnoses, medications, and labs will be instantly
              removed from your Timeline and Analytics.
            </p>
            <div className="flex items-center gap-3 mt-7">
              <button onClick={() => setRecordToDelete(null)} disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDeleteRecord} disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-[0_2px_10px_-3px_rgba(220,38,38,0.4)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSuccess={(message) => setToast({ message, type: "success" })}
        onError={(message) => setToast({ message, type: "error" })}
      />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={(message) => setToast({ message, type: "success" })}
        onError={(message) => setToast({ message, type: "error" })}
        onSettingsUpdate={(sex, bloodType, language) => {
          setExpectedIdentity((prev) =>
            prev ? { ...prev, sex, bloodType, language } : null
          );
        }}
      />

      {/* Gatekeeper Settings Modal */}
      <GatekeeperSettingsModal
        isOpen={isGatekeeperModalOpen}
        onClose={() => setIsGatekeeperModalOpen(false)}
        onSuccess={(message) => setToast({ message, type: "success" })}
        onError={(message) => setToast({ message, type: "error" })}
      />
    </div>
  );
}
