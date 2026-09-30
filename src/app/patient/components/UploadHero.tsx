"use client";

import { motion } from "motion/react";
import { ArrowUpRight, FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";

async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface UploadHeroProps {
  onUploadComplete?: (
    downloadUrl: string,
    expectedPatientName: string,
    expectedDob: string,
    fileHash: string,
    expectedSex: string,
    expectedBloodType: string,
    expectedLanguage: string,
    gatekeeperPrefs?: Record<string, unknown>
  ) => void;
}

export default function UploadHero({ onUploadComplete }: UploadHeroProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const uploadLock = useRef(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (uploadLock.current) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setUploadError("Choose a PDF document to continue.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("This PDF is larger than 20 MB. Please choose a smaller file.");
      return;
    }
    uploadLock.current = true;

    setIsUploading(true);
    setUploadedFileName(null);
    setUploadError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || "Unknown Patient";
      const userDob = user?.user_metadata?.dob || "Unknown Patient";
      const userSex = user?.user_metadata?.sex || "Unknown";
      const userBloodType = user?.user_metadata?.blood_type || "Unknown";
      const userLanguage = user?.user_metadata?.language || "English";
      const gatekeeperPrefs = user?.user_metadata?.gatekeeper_prefs || null;

      // Phase 2: Hash file and check for duplicates before expensive upload
      const fileHash = await generateFileHash(file);

      if (user) {
        const { data: existing } = await supabase
          .from("medical_records")
          .select("id")
          .eq("user_id", user.id)
          .eq("file_hash", fileHash)
          .limit(1);

        if (existing && existing.length > 0) {
          throw new Error(
            "This exact document has already been uploaded to your timeline."
          );
        }
      }

      const fileName = `${crypto.randomUUID()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("records")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from("records")
        .getPublicUrl(fileName);

      setUploadedFileName(file.name);
      onUploadComplete?.(urlData.publicUrl, userName, userDob, fileHash, userSex, userBloodType, userLanguage, gatekeeperPrefs);
    } catch (err) {
      console.error("Upload failed:", err);
      const msg =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(msg);
      setUploadedFileName(null);
    } finally {
      uploadLock.current = false;
      setIsUploading(false);
    }
  };

  const StatusIcon = isUploading
    ? Loader2
    : uploadError
      ? AlertCircle
      : uploadedFileName
        ? CheckCircle2
        : null;

  const statusText = isUploading
    ? "Sending file to secure storage."
    : uploadError
      ? uploadError
      : uploadedFileName
        ? `${uploadedFileName} uploaded. Analyzing document.`
        : null;

  return (
    <motion.section initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="workspace-upload" aria-label="Upload a medical record">
      <div className="upload-copy"><p className="eyebrow">A place for every part of your story</p><h3>Your next record.<br />A clearer picture.</h3><p>Add a report, prescription, or discharge note. We’ll help you find the details that matter.</p></div>
      <div className={`upload-dropzone ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); if (!isUploading) setIsDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) void handleFileUpload(file); }}>
        <FileUp size={28} strokeWidth={1.3} aria-hidden="true" />
        <p>Drop your medical PDF here</p><small>PDF documents · Up to 20 MB</small>
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" aria-label="Choose medical PDF" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFileUpload(file); event.target.value = ""; }} />
        <button type="button" className="button-lime" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>{isUploading ? <><Loader2 size={16} className="animate-spin" /> Uploading</> : <>Choose a document <ArrowUpRight size={16} /></>}</button>
      </div>
      {statusText && <div role={uploadError ? "alert" : "status"} className={`upload-status ${uploadError ? "is-error" : uploadedFileName ? "is-success" : ""}`}>{StatusIcon && <StatusIcon size={16} className={isUploading ? "animate-spin" : ""} />}<span>{statusText}</span></div>}
    </motion.section>
  );
}
