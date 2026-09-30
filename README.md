# LOCUS — Citation-First Clinical Intelligence Platform
THIS has all been done during mid sems, right in the middle. 

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Samsung PRISM](https://img.shields.io/badge/Samsung%20PRISM-Gen%20AI%20Hackathon%202026-blue)](https://github.com/SagarNegi1/Locus)

**LOCUS** is a citation-first medical document intelligence prototype. It helps users convert uploaded medical PDFs into structured, reviewable clinical records while keeping a direct path back to the source document for human verification.

Repository: `https://github.com/SagarNegi1/Locus`

> This project is a hackathon prototype. It is not a diagnostic device, emergency service, or substitute for a licensed clinician.

---

## Problem

Patients and clinicians often deal with scattered lab reports, prescriptions, discharge summaries, imaging reports, and clinical notes. Manually assembling a useful timeline is slow, and AI-generated summaries are hard to trust when the source evidence is hidden.

LOCUS focuses on **evidence-first medical intake**: extract structured facts, attach confidence and source locations, and let a reviewer open the original PDF to verify the claim.

---

## Theme 4 fit — Streaming Live RAG

Theme 4 asks for retrieval that can understand natural requests, split multiple intents, retrieve the right context, and refine an answer when new details arrive. LOCUS applies that idea to medical-record review by turning uploaded documents into a session-grounded evidence layer.

The final demo should show the current implemented workflow honestly. If the submitted build includes a live transcript/replay route, use it for the Theme 4 section. If the submitted build only includes medical PDF intake, describe it as a citation-first intake foundation and do not claim full-duplex streaming RAG benchmarks.

---

## What LOCUS does

- Accepts PDF medical records and rejects unsupported files at upload time.
- Uses SHA-256 hashing to detect duplicate documents before expensive processing.
- Runs AI-based checks for non-medical documents, wrong-patient uploads, poor legibility, and unsupported language.
- Extracts documented clinical facts into structured JSON instead of unsupported free-form summaries.
- Extracts diagnoses, medications, lab results, allergies, procedures, vitals, codes, symptoms, imaging/pathology findings, follow-ups, referrals, and related record details where present.
- Attaches confidence labels, source-page metadata, and normalized bounding boxes to extracted facts.
- Builds a de-duplicated timeline and supports source-PDF review, clinician triage, temporary sharing, export, and authenticated deletion.

---

## Architecture

```text
Patient / clinician signs in
        |
        v
Upload PDF -> SHA-256 duplicate check -> Supabase Storage
        |
        v
Gemini pre-check -> structured extraction -> safety/review signals
        |
        v
Supabase medical_records table
        |
        +--> Patient timeline / clinician workspace
        +--> Source PDF viewer with citation highlights
        +--> Export and sharing flows
```

Main routes and modules:

- `POST /api/extract/gemini` — Gemini-based pre-check and structured extraction.
- `POST /api/extract/ocr` — optional Google Cloud Document AI OCR/layout route.
- `/patient` — upload, extracted facts, timeline, source review, sharing, export.
- `/doctor` and `/doctor/patient/[id]` — clinician triage and patient review.
- `/shared/[id]` — expiring shared timeline view.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, Radix UI / shadcn-style components, Motion, Lucide icons |
| AI | Google Gemini via `@google/genai` |
| OCR/layout endpoint | Google Cloud Document AI |
| Backend/data | Next.js API routes, Supabase Auth, PostgreSQL, Supabase Storage |
| PDF | `react-pdf`, PDF.js, `jsPDF`, `jspdf-autotable` |

See [`requirement.txt`](requirement.txt) for the dependency and service summary. `package.json` and `package-lock.json` are the canonical dependency manifests.

---

## Local setup

### Prerequisites

- Node.js `>= 20.9.0`
- npm
- Supabase project
- Gemini API key
- Google Cloud Document AI configuration if using the OCR route

### Run locally

```bash
git clone https://github.com/SagarNegi1/Locus.git
cd Locus
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and fill `.env.local` before testing authentication, upload, extraction, or OCR.

### Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
DOCUMENT_AI_PROJECT_ID=your_google_cloud_project_id
DOCUMENT_AI_LOCATION=your_document_ai_location
DOCUMENT_AI_PROCESSOR_ID=your_document_ai_processor_id
```

Never commit `.env.local`, service-account files, API keys, or real patient data.

---

## Supabase setup expected by the app

Configure these resources in the Supabase project used for demo or deployment:

- Supabase Auth with the selected sign-in method.
- A `records` Storage bucket. Use only synthetic or de-identified demo data unless private storage and signed URLs are fully configured.
- A `medical_records` table with at least: `id`, `user_id`, `pdf_url`, `extracted_data`, `file_hash`, `created_at`, and optionally `clinic_id`.
- A `shared_links` table with `id`, `user_id`, `expires_at`, and any fields used by the sharing route.
- Row-level security policies appropriate to the demo environment.

---

## Useful commands

```bash
npm run dev       # start development server
npm run lint      # run ESLint
npx tsc --noEmit  # type-check
npm run build     # production build
npm run start     # serve production build
```

---

## Demo Video

[Watch the LOCUS demo video on Google Drive](https://drive.google.com/file/d/1DcEpTUA0IMhCuFKehLE-BHw70ZPRBk0N/view?usp=sharing)

---

## AI disclosure

See [`AI_DISCLOSURE.md`](AI_DISCLOSURE.md). The project uses Gemini at runtime for document pre-check/extraction and used generative AI tools during development and documentation. Human review is required for all AI-produced outputs.

---

## Safety and limitations

- LOCUS is a hackathon prototype, not a medical device.
- AI output can be incomplete, inaccurate, or incorrectly cited.
- Users must verify source documents before acting on extracted facts.
- Use only synthetic or fully de-identified records in demos.
- The current public-demo storage approach requires additional privacy, security, access-control, and compliance review before any real health-data use.

---

## Samsung PRISM submission checklist

- [x] Source code in repository
- [x] README
- [x] Dependency/service summary
- [x] AI disclosure
- [x] Presentation deck prepared
- [x] Demo video link added to README
- [ ] Final release tag pushed: `PRISM_GENAI_HACKATHON_Y2026`
- [ ] Google Form submitted manually by the team

Create the required tag only after the final PPT/video references and documentation are committed:

```bash
git add README.md requirement.txt AI_DISCLOSURE.md .env.example .gitignore
git commit -m "docs: finalize Samsung PRISM submission materials"
git tag -a PRISM_GENAI_HACKATHON_Y2026 -m "Samsung PRISM Gen AI Hackathon 2026"
git push origin main
git push origin PRISM_GENAI_HACKATHON_Y2026
```

---

## Team

**Team Kraken**  
College: **VIT Vellore / VITV**  
Theme: **04 — Streaming Live RAG**  
Project: **LOCUS**

