"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Eye, EyeOff, FileText, Loader2, ScanLine } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Brand from "./Brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const steps = [
  { number: "01", title: "Bring your records together.", text: "Upload a medical PDF. Keep reports, prescriptions, and discharge notes in one place." },
  { number: "02", title: "See what matters.", text: "Review diagnoses, medications, lab results, and more in a structured view." },
  { number: "03", title: "Go straight to the source.", text: "Open a finding to see the exact passage in your original document. Review it before you rely on it." },
];

export default function WelcomeExperience() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || !session) return;
      const meta = session.user.user_metadata;
      router.replace(!meta?.onboarding_complete ? "/onboarding" : meta.role === "doctor" ? "/doctor" : "/patient");
    }).catch(() => { /* Keep the welcome page usable if the session check fails. */ });
    return () => { active = false; };
  }, [router]);

  const openAuth = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setAuthOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { role } } });
        if (authError) throw authError;
        if (data.session) router.push("/onboarding");
        else setSuccess("Check your email to confirm your account, then sign in here.");
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        const meta = data.session.user.user_metadata;
        router.push(!meta?.onboarding_complete ? "/onboarding" : meta.role === "doctor" ? "/doctor" : "/patient");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <section className="welcome-hero">
        <header className="welcome-header">
          <Brand />
          <nav aria-label="Main navigation"><a href="#approach">The approach</a><a href="#inside-locus">Inside Locus</a></nav>
          <button className="button-outline-light" onClick={() => openAuth("login")}>Sign in <ArrowUpRight size={15} /></button>
        </header>

        <main id="main-content" className="hero-stage" tabIndex={-1}>
          <div className="hero-grid" aria-hidden="true" />
          <motion.div className="hero-art" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reducedMotion ? 0 : 1.5 }}>
            <Image src="/images/locus-glass-heart.webp" alt="A sculptural anatomical heart made of translucent blue glass" fill priority sizes="(max-width: 700px) 95vw, 58vw" />
          </motion.div>
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.9, delay: 0.12 }}>
            <p className="eyebrow"><span className="status-dot" /> A clearer view of your care</p>
            <h1>Your health.<br />In <em>perspective.</em></h1>
            <p className="hero-description">A lifetime of medical records.<br />One place to make sense of them.</p>
            <button className="button-lime" onClick={() => openAuth("signup")}>Find your clarity <span><ArrowUpRight size={20} /></span></button>
            <p className="hero-caption">For patients. Built for better conversations.</p>
          </motion.div>
          <div className="art-caption" aria-hidden="true"><span>THE HUMAN PERSPECTIVE</span><i /><span>01 / LOCUS</span></div>
          <a href="#approach" className="hero-scroll"><span>Explore a different perspective</span><ArrowDown size={18} /></a>
          <motion.aside className="hero-note" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.8, delay: 0.4 }}>
            <span className="note-index">Connected to the source</span>
            <div className="note-icon"><ScanLine size={24} strokeWidth={1.3} /></div>
            <p>Every finding.<br /><strong>A place to look closer.</strong></p>
            <span className="note-footer">Your original document, always in view <ArrowUpRight size={15} /></span>
          </motion.aside>
        </main>
        <div className="hero-bottom"><span>Medical records, made readable.</span><span>Organize <i /> Understand <i /> Review</span><span>Designed around you <span className="tiny-star">✳</span></span></div>
      </section>

      <section id="approach" className="approach-section">
        <div className="section-intro"><p className="eyebrow">01 — The approach</p><h2>Less searching.<br /><span>More understanding.</span></h2><p>Your health story deserves more than a folder full of PDFs. Locus connects the details so you can come prepared.</p></div>
        <div className="approach-steps">{steps.map((step, index) => (
          <motion.article key={step.number} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: reducedMotion ? 0 : 0.6, delay: index * 0.07 }}>
            <span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowUpRight size={21} strokeWidth={1.2} />
          </motion.article>
        ))}</div>
      </section>

      <section id="inside-locus" className="inside-section">
        <div className="inside-copy"><p className="eyebrow">02 — Inside Locus</p><h2>The whole story.<br /><em>With the details intact.</em></h2><p>A quieter space for your records, a connected timeline, and a direct path back to the source.</p><button className="text-action" onClick={() => openAuth("signup")}>Create your workspace <ArrowUpRight size={20} /></button><span className="inside-footnote">AI-assisted extraction. Human review at the center.</span></div>
        <motion.div className="record-preview" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reducedMotion ? 0 : 0.75 }}>
          <div className="preview-top"><span><span className="preview-dot" /> Your health, connected</span><span>Illustrative preview</span></div>
          <div className="preview-document"><div className="document-icon"><FileText size={25} strokeWidth={1.3} /></div><div><strong>Annual checkup</strong><p>Medical report · 3 pages</p></div><span className="preview-check"><Check size={16} /></span></div>
          <div className="preview-path"><i /><span>Original document → Structured record</span></div>
          <div className="preview-finding"><div><span className="eyebrow">Extracted finding</span><h3>Blood pressure</h3><p>Recorded during your visit</p></div><span className="preview-value">120/80<small>mmHg</small></span></div>
          <div className="preview-source"><ScanLine size={17} /><span>Linked to the source</span><span>Page 02</span></div>
        </motion.div>
      </section>

      <footer className="welcome-footer"><Brand /><p>A little more clarity. A better conversation.</p><button onClick={() => openAuth("login")}>Your workspace <ArrowRight size={17} /></button><span>© {new Date().getFullYear()} Locus</span></footer>

      <Dialog open={authOpen} onOpenChange={(open) => { if (!loading) setAuthOpen(open); }}>
        <DialogContent className="auth-dialog" showCloseButton={!loading}>
          <Brand />
          <div className="auth-heading"><p className="eyebrow">Your next chapter</p><DialogTitle className="auth-title">{mode === "login" ? "Welcome back." : "Make room for clarity."}</DialogTitle><DialogDescription>{mode === "login" ? "Sign in to your health workspace." : "Create your account to bring your records together."}</DialogDescription></div>
          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && <fieldset className="role-options"><legend>I’m joining as a</legend>{(["patient", "doctor"] as const).map((item) => <label key={item}><input type="radio" name="role" value={item} checked={role === item} onChange={() => setRole(item)} disabled={loading} /><span>{item === "patient" ? "Patient" : "Clinician"}</span></label>)}</fieldset>}
            <label htmlFor="auth-email">Email address<input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></label>
            <label htmlFor="auth-password">Password<span className="password-field"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 6 : undefined} required placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
            {error && <p role="alert" className="form-error">{error}</p>}
            {success && <p role="status" className="form-success">{success}</p>}
            <button className="button-navy" type="submit" disabled={loading}>{loading ? <><Loader2 size={18} className="animate-spin" /> Please wait</> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowUpRight size={18} /></>}</button>
          </form>
          <p className="auth-switch">{mode === "login" ? "New to Locus?" : "Already have an account?"} <button disabled={loading} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSuccess(null); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
