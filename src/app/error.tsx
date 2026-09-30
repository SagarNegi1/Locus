"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  //hlo
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected application error:", error);
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
          No information has been lost — you can safely retry.
        </p>

        {/* Digest (dev aid — hidden from patients) */}
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">
            Ref: {error.digest}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
