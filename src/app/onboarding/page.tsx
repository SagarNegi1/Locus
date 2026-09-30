"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import Brand from "@/components/Brand";
import {
  BriefcaseMedical,
  Camera,
  CheckCircle2,
  CloudUpload,
  Heart,
  Loader2,
  Shield,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type DoctorOnboardingFormProps = {
  email: string;
  userId: string;
};

function DoctorOnboardingForm({
  email,
  userId,
}: DoctorOnboardingFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

  const handleCredentialChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentialFile(event.target.files?.[0] ?? null);
    setErrorMsg(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);

    if (!credentialFile) {
      setErrorMsg("Please upload your medical license or certificate.");
      return;
    }

    if (!termsAccepted) {
      setErrorMsg(
        "You must accept the Terms of Service and HIPAA compliance consent to continue."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const safeFileName = credentialFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );
      const filePath = "credentials/" + userId + "-" + safeFileName;
      const { error: uploadError } = await supabase.storage
        .from("records")
        .upload(filePath, credentialFile, { upsert: true });

      if (uploadError) {
        throw new Error("Credential upload failed: " + uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("records").getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: fullName,
          specialty,
          credential_url: publicUrl,
          onboarding_complete: true,
          is_verified_physician: false,
        },
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push("/doctor");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-shell min-h-screen flex font-display">
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[900px] h-[900px] bg-gradient-to-tr from-indigo-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(15, 23, 42, 0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center justify-start px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <Brand />
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Set up your{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              clinical workspace
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground font-sans">
            Add your professional details to prepare your clinic workspace.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-400" />

          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <BriefcaseMedical className="h-4.5 w-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Professional Identity
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="doctor-email" className={labelClass}>
                    Email Address
                  </label>
                  <input
                    id="doctor-email"
                    type="email"
                    value={email}
                    disabled
                    className={inputClass + " cursor-not-allowed bg-slate-50 text-slate-500"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="doctor-full-name" className={labelClass}>
                    Legal Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="doctor-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClass}
                    placeholder="Your full name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="doctor-specialty" className={labelClass}>
                    Medical Specialty <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Stethoscope className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      id="doctor-specialty"
                      required
                      value={specialty}
                      onChange={(event) => setSpecialty(event.target.value)}
                      className={inputClass + " pl-11"}
                    >
                      <option value="" disabled>
                        Select your specialty...
                      </option>
                      <option value="General Practice">General Practice</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Family Medicine">Family Medicine</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Psychiatry">Psychiatry</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <CloudUpload className="h-4.5 w-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Professional Credential
                </h2>
              </div>

              <label htmlFor="doctor-credential" className={labelClass}>
                Medical License / Certificate{" "}
                <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="doctor-credential"
                className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-5 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-slate-50"
              >
                <CloudUpload className="h-9 w-9 text-indigo-500" />
                <span className="mt-4 text-sm font-semibold text-primary">
                  {credentialFile ? "Replace credential" : "Upload credential"}
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
                  PDF, JPG, PNG, or WebP
                </span>
                {credentialFile && (
                  <span className="mt-3 max-w-full truncate text-sm font-medium text-slate-600">
                    {credentialFile.name}
                  </span>
                )}
                <input
                  id="doctor-credential"
                  type="file"
                  required={!credentialFile}
                  accept="application/pdf,image/*"
                  onChange={handleCredentialChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="border-t border-slate-100" />

            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  id="doctor-terms"
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded border-slate-300 text-primary focus:ring-indigo-500"
                />
                <label
                  htmlFor="doctor-terms"
                  className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
                >
                  I agree to the{" "}
                  <span className="font-semibold text-slate-800">
                    Terms of Service
                  </span>{" "}
                  and confirm that I will handle patient information in
                  accordance with{" "}
                  <span className="font-semibold text-slate-800">
                    HIPAA compliance requirements
                  </span>
                  . <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>
                  Your credential will be reviewed by an administrator before
                  physician verification is granted.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex w-full items-center justify-center gap-2.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Securing Credentials...
                  </>
                ) : (
                  "Open your clinical workspace"
                )}
              </span>
            </button>
          </form>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>
            STATUS:{" "}
            <span className="font-semibold uppercase text-primary">Secure</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>Credential review required</span>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  // ── Auth state ──────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ── Form fields ─────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [language, setLanguage] = useState("");
  const [address, setAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Submission state ────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Auth check on mount ─────────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");
      setRole(user.user_metadata?.role ?? null);
      setCheckingAuth(false);
    };

    checkUser();
  }, [router]);

  // ── Avatar preview ──────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  // ── Submit handler ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!consentGiven) {
      setErrorMsg(
        "You must consent to the Privacy Policy & Medical Data Processing to continue."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile && userId) {
        const filePath = `avatars/${userId}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("records")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("records").getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // Persist all fields to user_metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name,
          dob,
          sex,
          phone,
          blood_type: bloodType,
          language,
          address,
          avatar_url: avatarUrl,
          consent_given: true,
          onboarding_complete: true,
        },
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push("/patient");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-sans">
            Securing connection...
          </p>
        </div>
      </div>
    );
  }

  if (role === "doctor" && userId) {
    return <DoctorOnboardingForm email={email} userId={userId} />;
  }

  if (role !== "patient") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <Shield className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Account type unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We could not determine the onboarding flow for this account. Please
            sign out and try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Shared input classes ────────────────────────────────────────────
  const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-800 font-sans text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
  const sectionDelay = 0.15;

  return (
    <div className="onboarding-shell min-h-screen flex font-display">
      {/* ── Background effects ─────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[900px] h-[900px] bg-gradient-to-tr from-indigo-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(15, 23, 42, 0.04) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── Main container ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center justify-start px-6 py-12 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brand />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
            Your story starts with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">
              you
            </span>
          </h1>
          <p className="text-base text-slate-500 font-sans max-w-md mx-auto">
            Add your details to help match documents to your profile.
          </p>
        </motion.div>

        {/* ── Glassmorphism card ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="w-full p-8 sm:p-10 bg-white/70 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/30 rounded-xl relative overflow-hidden group"
        >
          {/* Ambient hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            {/* ═══ Section 1: Identity ═══════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionDelay * 1 }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                  <UserCircle className="w-4.5 h-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Identity
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Email (read-only) */}
                <div className="sm:col-span-2">
                  <label htmlFor="onboarding-email" className={labelClass}>
                    Email Address
                  </label>
                  <input
                    id="onboarding-email"
                    type="email"
                    value={email}
                    disabled
                    className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
                  />
                </div>

                {/* Legal Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="onboarding-name" className={labelClass}>
                    Legal Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="onboarding-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="John A. Doe"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="onboarding-dob" className={labelClass}>
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="onboarding-dob"
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Biological Sex */}
                <div>
                  <label htmlFor="onboarding-sex" className={labelClass}>
                    Biological Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="onboarding-sex"
                    required
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select...
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* ═══ Section 2: Medical Profile ═══════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionDelay * 2 }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                  <Heart className="w-4.5 h-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Medical Profile
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
                <div>
                  <label htmlFor="onboarding-phone" className={labelClass}>
                    Phone Number
                  </label>
                  <input
                    id="onboarding-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Blood Type */}
                <div>
                  <label htmlFor="onboarding-blood" className={labelClass}>
                    Blood Type
                  </label>
                  <select
                    id="onboarding-blood"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Unknown / Prefer not to say</option>
                    <option value="A+">A+</option>
                    <option value="A-">A−</option>
                    <option value="B+">B+</option>
                    <option value="B-">B−</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB−</option>
                    <option value="O+">O+</option>
                    <option value="O-">O−</option>
                  </select>
                </div>

                {/* Primary Language */}
                <div>
                  <label htmlFor="onboarding-language" className={labelClass}>
                    Primary Language
                  </label>
                  <input
                    id="onboarding-language"
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={inputClass}
                    placeholder="English"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label htmlFor="onboarding-address" className={labelClass}>
                    Address
                  </label>
                  <textarea
                    id="onboarding-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="123 Main St, Suite 4B, City, State ZIP"
                  />
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* ═══ Section 3: Verification ═════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionDelay * 3 }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                  <Shield className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Verification
                </h2>
              </div>

              {/* Profile Photo Upload */}
              <div className="mb-6">
                <label className={labelClass}>Profile Photo</label>
                <div className="flex items-center gap-5">
                  {/* Preview circle */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden hover:border-indigo-400 hover:bg-slate-50/50 transition-all cursor-pointer shrink-0 group/avatar"
                  >
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar preview"
                        fill
                        className="object-cover rounded-2xl"
                      />
                    ) : (
                      <Camera className="w-7 h-7 text-slate-400 group-hover/avatar:text-indigo-500 transition-colors" />
                    )}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-primary hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      {avatarPreview ? "Change photo" : "Upload a photo"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG, or WebP. Max 5 MB.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="onboarding-avatar"
                  />
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
                <input
                  id="onboarding-consent"
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 w-4.5 h-4.5 rounded border-slate-300 text-primary focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <label
                  htmlFor="onboarding-consent"
                  className="text-sm text-slate-600 leading-relaxed cursor-pointer"
                >
                  I consent to the{" "}
                  <span className="font-semibold text-slate-800">
                    Privacy Policy
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-slate-800">
                    Medical Data Processing Agreement
                  </span>
                  . I understand that my clinical data will be stored securely
                  and used exclusively for healthcare purposes.{" "}
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </motion.div>

            {/* ── Error Banner ──────────────────────────────────────── */}
            {errorMsg && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl text-center border border-red-100 font-medium">
                {errorMsg}
              </div>
            )}

            {/* ── Submit Button ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionDelay * 4 }}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full overflow-hidden rounded-xl p-[1px] group/btn disabled:opacity-70 cursor-pointer"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-xl opacity-80 group-hover/btn:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2.5 bg-white w-full py-4 rounded-xl transition-all group-hover/btn:bg-transparent text-slate-800 group-hover/btn:text-white font-semibold shadow-sm text-base">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </div>
              </button>
            </motion.div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs font-mono text-slate-400"
        >
          <span>
            STATUS:{" "}
            <span className="text-primary uppercase font-semibold">
              Secure
            </span>
          </span>
          <span className="text-slate-300">·</span>
          <span>AES-256 Encrypted</span>
        </motion.div>
      </div>
    </div>
  );
}
