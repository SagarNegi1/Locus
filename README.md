# Locus — Citation-First Medical Intake

> Samsung PRISM Gen AI Hackathon 2026 submission by Team Kraken.

Locus is a web prototype that helps patients and clinicians turn medical PDFs into a reviewable, longitudinal health record. A user uploads a medical PDF; the system screens the document, extracts structured facts with Gemini, attaches a confidence level and page-aware source location to each fact, and presents the result in a patient timeline and clinician workspace.

The goal is not to replace clinical judgement. It is to reduce the time required to locate information in scattered medical records while retaining a direct path back to the source document for human review.

## Problem

Medical histories are often split across lab reports, prescriptions, discharge summaries, imaging reports, and clinical notes. Manually assembling a usable timeline is slow, and an extracted summary without evidence is difficult to trust. Locus addresses both problems by combining structured extraction with citation-first verification.

## What Locus does

- Accepts PDF medical records up to 20 MB and rejects non-PDF uploads in the client.
- Hashes uploads to detect duplicate documents before costly processing.
- Performs an AI pre-check for non-medical documents, wrong-patient records, poor legibility, and unsupported languages.
- Extracts explicitly documented clinical information into a schema rather than free-form prose.
- Associates extracted items with `High`, `Medium`, or `Low` confidence plus a normalized bounding box and source-page number.
- Displays diagnoses, medications, lab results, allergies, procedures, vitals, codes, symptoms, imaging/pathology findings, follow-ups, referrals, and other documented record details.
- Builds a de-duplicated timeline and flags abnormal labs and documented allergy/medication conflicts for review.
- Provides patient onboarding, a patient workspace, a clinician triage view, source-PDF review, time-limited sharing, export, and authenticated record deletion.

## How it works

```text
Patient signs in
      |
      v
Upload PDF -> SHA-256 duplicate check -> Supabase Storage
      |                                      |
      v                                      v
Gemini pre-check and schema-enforced extraction
      |
      v
Structured JSON + confidence + page/bounding-box citations
      |
      +--> Supabase `medical_records` --> Patient timeline / clinician triage / sharing
      |
      +--> Source viewer for human verification
```

The main extraction route is `POST /api/extract/gemini`. It retrieves the uploaded PDF server-side and invokes Google Gemini with a structured JSON schema. The project also contains `POST /api/extract/ocr`, which uses Google Cloud Document AI to return raw text and layout blocks for OCR-oriented integrations.

## Core AI design

Locus asks the model to extract only facts explicitly present in the source document. Each extracted item is paired with:

- a confidence level (`High`, `Medium`, or `Low`),
- a bounding box in `[ymin, xmin, ymax, xmax]` format, normalized to a 1000 × 1000 page, and
- a one-based source page number.

The extraction schema covers encounter/document dates, diagnoses, medications, lab results, allergies, procedures, vitals, physicians, ICD/CPT codes, family/social history, imaging/pathology findings, symptoms, chronic-disease indicators, vaccinations, facilities, insurance, emergency contacts, follow-up recommendations, pregnancy status, discharge details, and referral recommendations.

Before full extraction, the app rejects a document when the AI identifies it as non-medical, belonging to a different patient, too illegible, or not primarily English. The patient can enable a stricter identity-match preference. These checks reduce bad inputs; they are not a substitute for clinical or identity verification.

## Technology stack

| Area | Technology |
| --- | --- |
| Web framework | Next.js 16, React 19, TypeScript |
| Styling and UI | Tailwind CSS, Radix UI, shadcn/ui, Motion, Lucide |
| Generative AI | Google Gemini via `@google/genai` |
| OCR/layout endpoint | Google Cloud Document AI |
| Authentication, database, storage | Supabase |
| PDF viewing and export | react-pdf, jsPDF, jsPDF-AutoTable |

See [`requirement.txt`](requirement.txt) for the full direct dependency and service manifest. `package.json` and `package-lock.json` remain the canonical install manifests for this JavaScript project.

## Local setup

### Prerequisites

- Node.js `>= 20.9.0` (required by the installed Next.js version)
- npm
- A Supabase project
- A Gemini API key
- Google Cloud Document AI configuration if the OCR endpoint will be used

### Install and run

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd medical-intakev3
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Fill in `.env.local` before trying authentication, upload, or AI extraction. Do not commit that file.

### Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and replace every placeholder with your own project values.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the web client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key used by the web client |
| `GEMINI_API_KEY` | Server-side Gemini extraction requests |
| `DOCUMENT_AI_PROJECT_ID` | Google Cloud project for the OCR endpoint |
| `DOCUMENT_AI_LOCATION` | Region of the Document AI processor |
| `DOCUMENT_AI_PROCESSOR_ID` | Document AI processor ID |

The Document AI SDK also needs Application Default Credentials or an equivalent server-side Google Cloud authentication setup. Never commit a service-account key, API key, `.env.local`, or real medical document to Git.

### Supabase setup expected by the app

This repository contains the application code but no Supabase migration files. Configure the following resources in the project used for local development or deployment:

- Enable Supabase Auth with the sign-in methods used by the team.
- Create a `records` Storage bucket. The current upload flow calls `getPublicUrl`, so use non-sensitive demo data only until production-grade private storage, signed URLs, and row-level access policies are in place.
- Create a `medical_records` table with fields used by the app: `id`, `user_id`, `pdf_url`, `extracted_data` (JSON/JSONB), `file_hash`, `created_at`, and optionally `clinic_id` for clinician filtering.
- Create a `shared_links` table with at least `id`, `user_id`, and `expires_at` for temporary sharing links.
- Add row-level security policies appropriate to the deployment. Users should only access records and shares they are authorized to see.

## Project structure

```text
src/
  app/
    api/extract/gemini/   Structured extraction and pre-check route
    api/extract/ocr/      Document AI OCR/layout route
    api/records/delete/   Authenticated record deletion route
    patient/              Patient dashboard, upload, timeline, source review
    doctor/               Clinician triage and patient review screens
    shared/               Expiring shared-timeline screen
    onboarding/           Patient and clinician onboarding
  components/             Shared experience and UI components
  utils/                  PDF dossier and Supabase helpers
lib/
  supabase.ts             Shared Supabase client
public/
  images/                 Local visual assets
Lab Reports Gen/          Demo PDF fixtures for presentation/testing
```

## Useful commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npx tsc --noEmit  # Type-check without emitting files
npm run build     # Create a production build
npm run start     # Serve a completed production build
```

No automated test suite is currently checked into this repository. For a demo, use only synthetic or fully de-identified records and validate each extracted item against the linked source location.

## Routes and product surfaces

| Route | Purpose |
| --- | --- |
| `/` | Welcome experience and authentication entry point |
| `/onboarding` | Collects patient or clinician profile details |
| `/patient` | Upload, extracted data, source review, timeline, insights, and sharing |
| `/doctor` | Clinic triage queue grouped by patient |
| `/doctor/patient/[id]` | Detailed clinician view for a selected patient |
| `/shared/[id]` | Expiring shared timeline |

## Safety, privacy, and limitations

- Locus is a hackathon prototype and **not a diagnostic device, emergency service, or substitute for a licensed clinician**.
- AI output can be incomplete or incorrect. Users and clinicians must review original documents before acting on extracted information.
- The current intake experience accepts English PDFs only and has a 20 MB client-side size limit.
- Never upload real patient health information to a public demo, repository, or unapproved cloud project.
- Keep secrets only in deployment environment variables. If a secret was ever exposed, revoke/rotate it before publishing the repository or demo.
- The current public-URL storage implementation is suitable only for controlled demo data; it requires additional access controls before any real-world use.

## AI disclosure

See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for the technologies, roles, safeguards, and known limitations of AI used in this submission.

## Hackathon submission checklist

Included in this repository:

- [x] Source code
- [x] Dependency manifest: [`requirement.txt`](requirement.txt), `package.json`, and `package-lock.json`
- [x] Detailed README
- [x] AI disclosure
- [x] Demo PDF fixtures

To be added by Team Kraken before final submission:

- [ ] Presentation deck (for example, `docs/Team-Kraken-PRISM-2026.pptx`)
- [ ] Demo video or a YouTube/Drive link placed in this README
- [ ] A pushed Git tag named `PRISM_GENAI_HACKATHON_Y2026`
- [ ] Repository URL in the Samsung PRISM form

## Create the required Git tag

After committing the final submission files, create and push the exact tag requested by the form:

```bash
git add README.md requirement.txt .env.example AI_DISCLOSURE.md
git commit -m "docs: prepare PRISM Gen AI Hackathon submission"
git tag -a PRISM_GENAI_HACKATHON_Y2026 -m "Samsung PRISM Gen AI Hackathon 2026"
git push origin HEAD
git push origin PRISM_GENAI_HACKATHON_Y2026
```

On GitHub, verify that the tag appears under **Releases → Tags**. A Git tag is a named pointer to the exact committed submission version; it is not an APK, a file you upload manually, or a different AI feature.

## Team

**Team Kraken**

Samsung PRISM | Gen AI Hackathon | 2026

Update this section with the complete team roster, college, presentation link, and demo video link before the final GitHub submission.
