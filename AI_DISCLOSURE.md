# AI disclosure — LOCUS

This document describes AI use in the LOCUS Samsung PRISM Gen AI Hackathon submission.

## Product AI use

| Technology | Role | Input | Output |
| --- | --- | --- | --- |
| Google Gemini via `@google/genai` | Medical-document pre-check, structured extraction, confidence labeling, source citation metadata, and review alerts | Uploaded PDF and expected identity/context supplied by the app | Schema-constrained JSON containing extracted facts, confidence labels, source-page/bounding-box metadata, and safety/review signals |
| Google Cloud Document AI | Optional OCR/layout endpoint | PDF URL or PDF content handled by the server route | OCR text and layout blocks |

## Development AI use

The team used generative AI tools during development and documentation:

- Gemini chats were used for ideation, feature planning, implementation prompts, and debugging strategy.
- Antigravity/coding-agent workflows were used to generate and revise parts of the Next.js application from team instructions.
- ChatGPT/Codex-style assistance was used to review requirements and prepare offline submission materials.

The team remains responsible for reviewing, testing, and accepting all generated code, writing, slides, and documentation before submission.

## What the runtime AI is instructed to do

- Extract only facts explicitly present in the uploaded record.
- Prefer structured JSON over unsupported narrative summaries.
- Attach confidence and source metadata to extracted facts.
- Reject or flag unsuitable inputs such as non-medical, wrong-patient, low-quality, or unsupported-language documents.
- Avoid diagnosis, treatment advice, or invented medical codes.

## Human review and safeguards

- LOCUS presents extracted data as reviewable facts, not final clinical decisions.
- Users must verify the original source documents.
- The app is not a medical device, emergency service, or substitute for a licensed clinician.
- Demo data should be synthetic or fully de-identified.
- Secrets, service-account files, `.env.local`, and real patient data must not be committed.

## Known limitations

- AI output may be incomplete, inaccurate, or incorrectly cited.
- Document quality, handwriting, scan quality, language, formatting, and OCR errors can reduce extraction quality.
- Production use would require stronger privacy controls, access-control validation, audit logging, clinical safety validation, and compliance review.
