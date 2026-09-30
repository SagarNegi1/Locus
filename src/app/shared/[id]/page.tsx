import { createClient } from "@supabase/supabase-js";
import SharedTimelineView from "./SharedTimelineView";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Server-side Supabase client (uses service role or anon key for reads)
// ---------------------------------------------------------------------------

function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SharedPageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function SharedPage({ params }: SharedPageProps) {
  const { id } = await params;
  const supabase = createServerSupabase();

  // 1. Fetch the shared link
  const { data: link, error: linkError } = await supabase
    .from("shared_links")
    .select("*")
    .eq("id", id)
    .single();

  // 2. Validate: not found or expired
  const isExpired =
    !link || linkError || new Date(link.expires_at) <= new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl border border-slate-200/60 p-10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Link Expired or Invalid
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              This secure medical summary link has either expired or does not
              exist. For your security, shared links are time-limited and
              automatically deactivated.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            <Shield className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            Protected by LOCUS secure sharing
          </p>
        </div>
      </div>
    );
  }

  // 3. Fetch medical records for this user
  const { data: records, error: recordsError } = await supabase
    .from("medical_records")
    .select("*")
    .eq("user_id", link.user_id)
    .order("created_at", { ascending: false });

  if (recordsError || !records) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl border border-slate-200/60 p-10 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Unable to Load Records
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              An error occurred while loading the medical records. Please try
              again later or contact the patient for a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SharedTimelineView
      records={records}
      expiresAt={link.expires_at}
    />
  );
}
