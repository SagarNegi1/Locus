"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Clock, Copy, Check, X, Loader2, Link2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Duration = { label: string; hours: number };

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DURATION_OPTIONS: Duration[] = [
  { label: "24 Hours", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "7 Days", hours: 168 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShareLinkModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: ShareLinkModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<Duration>(
    DURATION_OPTIONS[0]
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const expiresAt = new Date(
        Date.now() + selectedDuration.hours * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("shared_links")
        .insert([{ user_id: user.id, expires_at: expiresAt }])
        .select("id")
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/shared/${data.id}`;
      setGeneratedUrl(url);

      await navigator.clipboard.writeText(url);
      setCopied(true);
      onSuccess("Secure link copied to clipboard");
    } catch (err) {
      console.error("Failed to generate share link:", err);
      onError(
        err instanceof Error ? err.message : "Failed to generate share link"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAgain = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError("Failed to copy link");
    }
  };

  const handleClose = () => {
    setGeneratedUrl(null);
    setCopied(false);
    setSelectedDuration(DURATION_OPTIONS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="share-summary-backdrop fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="share-summary-dialog relative w-full max-w-md mx-4 overflow-hidden"
        >
          <div className="relative p-7 sm:p-8">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="share-summary-close absolute top-4 right-4"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="share-summary-mark">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="share-summary-kicker">A private link</p>
                <h2 className="share-summary-title">
                  Share your summary
                </h2>
                <p className="share-summary-subtitle">
                  Choose how long it stays available.
                </p>
              </div>
            </div>

            {!generatedUrl ? (
              <>
                {/* Duration selector */}
                <div className="mb-6">
                  <label className="share-summary-label">
                    <Clock className="w-3.5 h-3.5" />
                    Availability
                  </label>
                  <div className="share-duration-grid">
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.hours}
                        onClick={() => setSelectedDuration(option)}
                        className={`share-duration ${
                          selectedDuration.hours === option.hours
                            ? "is-selected"
                            : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security notice */}
                <div className="share-security-note">
                  <Shield className="share-security-icon" aria-hidden="true" />
                  <p>
                    <span>Private by design.</span>{" "}
                    The link uses a 128-bit cryptographic ID and automatically
                    expires after{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedDuration.label.toLowerCase()}
                    </span>
                    . Read-only access — no modifications possible.
                  </p>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="share-summary-primary w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Secure Link...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Generate & Copy Link
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Success icon */}
                <div className="flex justify-center mb-5">
                  <div className="share-summary-success-mark">
                    <Check className="w-7 h-7" />
                  </div>
                </div>

                <p className="share-summary-success-copy">
                  Link copied to your clipboard
                </p>

                {/* URL display */}
                <div className="share-summary-url">
                  <code>
                    {generatedUrl}
                  </code>
                  <button
                    onClick={handleCopyAgain}
                    className="share-summary-copy"
                    title="Copy again"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="share-summary-expiry">
                  Expires in{" "}
                  <span className="font-semibold text-slate-600">
                    {selectedDuration.label.toLowerCase()}
                  </span>
                </p>

                <button
                  onClick={handleClose}
                  className="share-summary-secondary w-full"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
