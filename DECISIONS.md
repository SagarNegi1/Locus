# ClinicalAudit Decision Log

This file records material implementation decisions for the project. Each entry explains the decision, the reason for it, the alternatives considered, and why those alternatives were not selected. New decisions should be appended rather than rewriting historical entries.

## 2026-09-10 — Complete Level 1 as an end-to-end capability

**Decision:** Treat Level 1 as complete only when every field in the AI Intelligence Blueprint is represented in the structured Gemini schema, returned with confidence and citation metadata, persisted in `medical_records.extracted_data`, and available to the extraction and verification interfaces.

**Why:** Adding fields only to a prompt would make data technically extractable but not usable or auditable. The product's stated differentiator is citation-first verification, so storage and review are part of extraction completeness.

**Alternatives considered:**

- Prompt-only additions. Rejected because the UI and TypeScript model would silently omit or fail to expose much of the result.
- Separate API endpoints for each Level 1 category. Rejected because the current architecture already uses one schema-enforced extraction call, and splitting it now would add latency and coordination complexity without improving Level 1 accuracy by itself.
- A new normalized database table for every entity. Deferred because that is the Level 3 structured-memory redesign; the current JSONB record can persist all Level 1 data without a database migration.

## 2026-09-10 — Preserve compatibility with existing extracted records

**Decision:** Add new arrays and citation fields as optional in client-side types while ensuring new API responses always include them.

**Why:** Existing Supabase rows were created with the older shape. Optional reads prevent old records from breaking dashboards while all newly processed documents receive the complete shape.

**Alternatives considered:**

- Require and migrate every historical row immediately. Rejected because no Supabase schema or migration tooling is checked into this repository, and forcing the new shape would break existing records until an external migration was performed.
- Version the entire extraction API. Rejected as unnecessary for an additive data-model expansion.

## 2026-09-10 — Add page-aware citation metadata

**Decision:** Every cited extraction item will include `sourcePage` in addition to its normalized 1000×1000 `boundingBox`; legacy items without a page default to page 1.

**Why:** A bounding box alone is ambiguous in a multi-page PDF. Page-aware coordinates are required for a citation-first system to open the correct source location.

**Alternatives considered:**

- Keep page 1 hard-coded in the PDF viewer. Rejected because citations from later pages would appear over the wrong content.
- Encode the page number inside the bounding-box tuple. Rejected because it would break the established four-coordinate format and all saved records.

## 2026-09-10 — Use domain-specific field shapes

**Decision:** Use named clinical fields such as `symptom`, `onset`, `duration`, and `status` rather than reducing every category to generic `value` and `category` strings.

**Why:** Named fields retain clinical meaning, improve rendering, and support later longitudinal analysis while still satisfying the blueprint's requirement that each extracted fact carry a value, confidence, and citation.

**Alternatives considered:**

- A universal `{ value, category }` object. Rejected because important distinctions such as medication duration versus adherence and insurance provider versus policy number would be flattened into prose and become harder to query later.



## 2026-09-10 — Fix project diagnostics at their source

**Decision:** Configure Turbopack and ESLint to use the actual repository root, exclude the untracked nested duplicate from lint, and restructure the doctor dashboard asynchronous load effect with cancellation instead of disabling the React rule.

**Why:** The duplicate directory is not part of the active application, the inferred parent workspace causes misleading warnings, and cancellation prevents stale asynchronous responses from updating an unmounted component.

**Alternatives considered:**

- Delete the nested duplicate or the parent lockfile. Rejected because both are user-owned files outside the requested application changes.
- Disable `react-hooks/set-state-in-effect`. Rejected because restructuring the effect resolves the underlying lifecycle issue and retains useful lint protection.
- Delete the unused dialog close-button API. Rejected because the prop clearly represented intended behavior; restoring the accessible close control fixed both the warning and the missing interaction.
- Create placeholder Supabase credentials. Rejected because fake credentials would replace a clear configuration error with harder-to-diagnose authentication or network failures; the required real variables are already present in `.env.local`.

## 2026-09-10 — Apply compatible dependency security updates

**Decision:** Use the non-forced npm audit fix and remain within semver-compatible dependency ranges, followed by lint, type-check, build, audit, and runtime verification.

**Why:** The installed dependency tree reported 19 known vulnerabilities, including a critical direct Next.js advisory, and npm identified patched compatible releases.

**Alternatives considered:**

- Leave the vulnerabilities because the site builds. Rejected because a successful build does not mitigate known runtime security issues.
- Run `npm audit fix --force`. Rejected because forced major-version changes could introduce breaking API changes without being necessary.


## 2026-09-10 — Retain Next.js version-matched agent guidance

**Decision:** Keep the `AGENTS.md` and `CLAUDE.md` files generated by Next.js 16.3 during development startup.

**Why:** The installed Next.js guide recommends these files so coding agents consult documentation bundled with the exact framework version, reducing incorrect edits after framework API changes.

**Alternatives considered:**

- Set `agentRules: false` and delete both files. Rejected after reading the installed guide because it would remove useful version-specific safeguards solely to avoid two small generated files.

## 2026-09-10 — Clear only stale generated framework state

**Decision:** Remove `.next/dev` once after the Next.js upgrade and allow the framework to regenerate it.

**Why:** Its old `routes.d.ts` was not a module and caused the only remaining TypeScript/build failure; `.next` contains disposable build output rather than application source.

**Alternatives considered:**

- Exclude `.next/dev` from TypeScript permanently. Rejected because current Next.js development types should remain checked and only the stale pre-upgrade cache was invalid.
- Edit the generated declaration manually. Rejected because the framework would overwrite it and the underlying cache mismatch would remain.


## 2026-09-12 — Establish the blue-glass Locus visual direction

**Decision:** Follow the supplied references with steel-blue and navy surfaces, ivory reading areas, lime primary actions, a custom glass-heart hero, oversized editorial type, and a consistent compact wordmark. Use the existing Geist and Manrope fonts through their actual CSS variables.

**Why:** The references use sculptural clinical imagery and deliberate hierarchy. The former interface mixed indigo/teal gradients, disconnected palettes, and technical copy. The redesign skill informed the typography, spacing, interaction states, and removal of generic treatments. The reference palette takes precedence over the skill's generic caution about blue palettes.

**Alternatives:** A full dark reading interface was rejected because long medical records benefit from light reading surfaces. A 3D runtime was rejected because an optimized local image delivers the visual direction with lower loading and interaction costs. Replacing icon libraries was rejected because a consistent stroke treatment preserves the existing vocabulary without another dependency.

## 2026-09-12 — Separate the welcome experience from authentication

**Decision:** Give visitors an editorial welcome page and an accessible sign-in/create-account dialog. Keep Supabase credentials, role metadata, onboarding gates, and authenticated destinations. Use one validated form submit for each mode, visible field labels, password visibility, and inline errors.

**Why:** The previous screen exposed system terminology immediately and had two competing actions with inconsistent form validation. The welcome page now explains the actual product; the dialog makes the next action explicit.

**Alternatives:** Separate auth routes would add navigation for a short form. A custom modal would duplicate the installed Radix focus/keyboard behavior. Fake outcomes or unverified security/medical claims were rejected; the sample record is explicitly illustrative.

## 2026-09-12 — Make the patient workspace usable on smaller screens

**Decision:** Replace the hidden floating upload action with an inline PDF drop zone, clear format/size feedback, and an in-flight upload lock. Keep a compact desktop sidebar and use labeled bottom navigation on phones. Preserve records, timeline, insights, source review, sharing, and export handlers.

**Why:** Upload is the primary task and needs to be discoverable. The former fixed sidebar consumed most of a phone screen. A 20 MB client limit provides immediate feedback before hashing/uploading oversized documents.

**Alternatives:** A hamburger-only mobile menu would hide the main destinations. A floating plus button alone would keep the main task unclear. Rebuilding the extraction/data layer was rejected because this task concerns UI and UX.

## 2026-09-12 — Restrained, accessible animation

**Decision:** Use the existing Motion library for staged entrances, scroll reveals, and the navigation indicator, plus a slow CSS float for the heart. Set MotionConfig reducedMotion to user and disable CSS animation/smooth scrolling when reduced motion is requested.

**Why:** Motion should clarify hierarchy and interaction without disrupting reading. Most animated properties are transform and opacity.

**Alternatives:** Scroll hijacking, cursor replacement, and perpetual document animations were rejected because they interfere with standard navigation and focused review.

## 2026-09-12 — Hero asset provenance

**Decision:** Generate a single original asset with the built-in image generator, then serve an optimized WebP from public/images/locus-glass-heart.webp.

**Final prompt:** A sculptural anatomical heart made entirely of translucent cobalt-blue crystal and optical glass, with arcing aorta vessels, icy cyan reflections and realistic refraction; suspended three-quarter view, portrait composition, muted steel-blue #345c78 studio backdrop, softbox upper left, tiny lime reflections. Luxury scientific CGI. No tissue, blood, text, logo, watermark, UI, or extra objects.

**Alternatives:** Copying the reference artwork was rejected in favor of an original asset. Remote hotlinked imagery was rejected so the shipped site owns its assets and does not rely on third-party image URLs.


## 2026-09-12 — Remove misleading interaction and verification cues

**Decision:** Present timeline details as readable information rather than dead citation buttons, remove the empty hash-link, and label the timeline as extracted history instead of verified events. Distinguish an empty review queue from having no uploaded records. Give the review queue keyboard selection and a stacked mobile layout. Wait for sign-out to finish before redirecting.

**Why:** A polished interface must accurately communicate what can be done and what has been reviewed. The old timeline had controls without handlers and an always-verified visual; the empty review queue incorrectly claimed universal verification. Premature sign-out redirects could race the landing page session check.

**Alternatives:** Keeping clickable-looking details without functionality was rejected. Inferring clinical verification merely from the absence of queue entries was rejected. Source review remains available through the existing review and record citation workflows.


### Redesign verification — 2026-09-12

- Production build and project-wide ESLint passed without errors or warnings; build includes TypeScript validation. Git diff whitespace check passed.
- Chromium checks covered 1440px desktop and 320px, 390px, and 768px welcome layouts; account dialog labels, password visibility, Escape dismissal, signup clinician role, confirmation state, and login error handling.
- Browser checks used intercepted Supabase responses and synthetic records for patient overview, all five navigation destinations, mobile search, invalid PDF feedback, clinician directory, and clinician onboarding. No real account was created and no medical data was uploaded in these tests. Live extraction quality was outside this UI change.
- Reduced-motion preference disables the heart animation. New artwork is a 1000×1500 WebP of approximately 250 KB, served locally.
- A local production preview runs on 127.0.0.1:3100 for review; no deployment or commit was made.


## 2026-09-12 — Refine the heart with minimal floating motion

**Decision:** Sharpen the existing heart's presentation with a slightly wider opaque mask, 3.5% more contrast, and slightly reduced saturation. Replace its straight up/down loop with a slow 9.5-second float: about 23px vertical travel, 7px lateral travel, and less than one degree of tilt. Reduce travel on phones and explicitly freeze the heart for reduced-motion users.

**Why:** The user requested a better heart with a little more floating, while keeping it minimal. Small changes to clarity and an asymmetric drift give the existing sculpture a more suspended feel without adding visual clutter or another asset download.

**Alternatives:** Regenerating the artwork was unnecessary for this presentation adjustment. Particles, pulsing glow, large rotations, and pointer-following effects were rejected because they would exceed the requested restraint. The original straight 12px bob was too subtle for the requested increase in floating.


## 2026-09-12 — Add a restrained heartbeat to the floating heart

**Decision:** Add a repeating 1.65-second double pulse: a 1.8% expansion, return to rest, a smaller 0.8% expansion, then a longer rest. Animate the independent CSS scale property so the existing slow float continues uninterrupted. Disable both movements for reduced-motion users.

**Why:** The user requested a heartbeat while retaining the previous instruction to keep motion minimal. A small paired pulse makes the sculpture feel alive without dominating the page.

**Alternatives:** A large single zoom looked like a generic breathing animation. Animating transform in two competing animations would override the existing drift. Sound, flashing light, and extra decorative effects were rejected as unnecessary.

## 2026-09-12 — Replace the revoked Gemini credential

**Decision:** Replace the disabled GEMINI_API_KEY in the ignored local environment file, validate the replacement with a non-sensitive request, and restart the running Next.js server so it loads the new value. Never record the credential itself in project documentation or logs.

**Why:** Google rejected the previous credential with 403 PERMISSION_DENIED because it had been reported as leaked. The replacement was accepted by Gemini, and a running Next.js process retains environment values from startup.

**Alternatives:** Retrying extraction with the old key could not succeed. Changing the PDF or extraction schema was rejected because the failure occurred during credential authorization. Keeping the old server running was rejected because it could continue using the revoked in-memory value.


## 2026-09-12 — Align sharing and Help source review with the Locus workspace

**Decision:** Replace the generic blue-purple glass sharing modal with an ivory, navy, and lime Locus dialog using smaller radii, tinted shadows, clear availability choices, and a quieter security note. In Help and Guidance, mount the PDF viewer only while its sheet is open, give the sheet a bounded flex layout, and wait for a measured viewer width before rendering PDF.js.

**Why:** The prior share screen used a disconnected gradient and oversized rounded controls. The Help viewer was initialized during the sheet transition and inside competing scroll containers, allowing PDF.js to render against unstable dimensions.

**Alternatives:** A full modal framework replacement was rejected because the existing sharing and Radix interactions work. Disabling PDF rendering in Help was rejected because the source-highlight demonstration is useful. A fixed PDF width was rejected because it would fail on narrower sheets and phones.
