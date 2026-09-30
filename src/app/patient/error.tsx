"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function PatientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient dashboard error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-lg shadow-slate-200/60">
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-600" strokeWidth={2} />
        </div>

        {/* Heading */}
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          System Error
        </h1>

        {/* Body */}
        <p className="mt-3 text-sm leading-6 text-slate-500">
          We encountered an unexpected issue while loading your medical data.
          Your records are safe — please try again.
        </p>

        {/* Digest (dev aid) */}
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">
            Ref: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            Try again
          </button>

          <Link
            href="/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Return to home
          </Link>
        </div>
      </div>
    </main>
  );
}
