# AI disclosure — Locus

This document describes AI use in the Locus Samsung PRISM Gen AI Hackathon submission. It should be included with the repository and updated if the team changes the product or uses additional AI-generated submission material.

## AI used in the product

| Technology | Role in Locus | Input | Output |
| --- | --- | --- | --- |
| Google Gemini (`gemini-3-flash-preview` in the current server route) | Screens a PDF, performs structured extraction, and identifies a documented allergy/medication conflict | User-uploaded PDF and the user-provided identity context | Schema-constrained JSON containing extracted facts, confidence, source page, and bounding-box citations |
| Google Cloud Document AI | Optional OCR/layout endpoint | A PDF URL | Raw document text plus page layout blocks and bounding boxes |
| AI-generated visual asset | The repository decision log records that the blue glass-heart hero image was originally generated for this project | Text prompt created for the project | Local WebP asset in `public/images/` |

## What the AI is instructed to do

- Extract only facts explicitly documented in the uploaded medical record.
- Return structured data rather than a free-form medical summary.
- Link every extracted fact to a normalized bounding box and source-page number.
- Pre-check whether the file appears to be a medical document, legible, primarily English, and associated with the expected patient.
- Surface a possible drug/allergy conflict as a review alert when documented data indicates one.

## Safeguards and human role

- The product labels extraction confidence and provides source-document citations so a person can verify the result.
- The app rejects several clearly unsuitable inputs before full extraction: non-medical documents, obvious wrong-patient documents, poor-legibility documents, and non-English documents.
- The model is instructed not to diagnose, infer facts, or invent codes that do not appear in the source.
- A patient, clinician, or reviewer must validate the original record. Locus must not be used as the sole basis for clinical care, diagnosis, treatment, emergency decisions, or identity verification.

## Data and privacy note

Use only synthetic or fully de-identified records in the hackathon demo. Do not commit API keys, service-account credentials, `.env.local`, or real patient data. The current prototype must receive security hardening, access-control validation, and privacy/compliance review before any real-world health-data use.

## Development-assistance declaration

The repository itself documents the product's AI service use and the AI-generated visual asset above. Each team member should add any generative-AI tools they personally used for code, writing, slide creation, video production, or design before submitting, including the tool name and the extent of human review. Do not claim that an AI tool was or was not used unless the team can verify it.

## Known limitations

- Model output may be incomplete, inaccurate, or incorrectly cited.
- Current intake is limited to English PDFs and a 20 MB client-side upload limit.
- Document quality, handwriting, image quality, and formatting can reduce extraction quality.
- The application is a hackathon prototype, not a certified medical device.
