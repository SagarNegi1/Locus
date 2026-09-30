import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Confidence = "High" | "Medium" | "Low";

interface CitationMetadata {
  confidence: Confidence;
  boundingBox: [number, number, number, number];
  sourcePage: number;
}

interface DiagnosisItem extends CitationMetadata {
  name: string;
  date: string;
}

interface MedicationItem extends CitationMetadata {
  name: string;
  date: string;
  dosage: string;
  frequency: string;
  duration: string;
  adherenceClues: string;
}

interface LabResultItem extends CitationMetadata {
  testName: string;
  date: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
}

interface AllergyItem extends CitationMetadata {
  allergen: string;
  reaction: string;
  severity: string;
}

interface ProcedureItem extends CitationMetadata {
  name: string;
  date: string;
  body_part: string;
}

interface VitalItem extends CitationMetadata {
  measurement: string;
  value: string;
  unit: string;
  date: string;
}

interface PhysicianItem extends CitationMetadata {
  name: string;
  role: string;
}

interface IcdCodeItem extends CitationMetadata {
  code: string;
  description: string;
}

interface FamilyHistoryItem extends CitationMetadata {
  condition: string;
  relative: string;
}

interface SocialHistoryItem extends CitationMetadata {
  category: "Smoking" | "Alcohol" | "Substance Use";
  status: string;
  details: string;
}

interface ImagingFindingItem extends CitationMetadata {
  bodyPart: string;
  finding: string;
}

interface DocumentDateItem extends CitationMetadata {
  date: string;
  dateType: string;
}

interface PathologyFindingItem extends CitationMetadata {
  specimen: string;
  finding: string;
  interpretation: string;
}

interface SymptomItem extends CitationMetadata {
  symptom: string;
  onset: string;
  duration: string;
  status: string;
}

interface ChronicDiseaseIndicatorItem extends CitationMetadata {
  condition: string;
  indicator: string;
  status: string;
}

interface VaccinationItem extends CitationMetadata {
  vaccine: string;
  date: string;
  dose: string;
}

interface CptCodeItem extends CitationMetadata {
  code: string;
  description: string;
}

interface FacilityItem extends CitationMetadata {
  hospitalName: string;
  department: string;
}

interface InsuranceItem extends CitationMetadata {
  provider: string;
  policyNumber: string;
  memberId: string;
}

interface EmergencyContactItem extends CitationMetadata {
  name: string;
  relationship: string;
  phone: string;
}

interface FollowUpRecommendationItem extends CitationMetadata {
  recommendation: string;
  timeframe: string;
}

interface PregnancyStatusItem extends CitationMetadata {
  status: string;
  gestationalAge: string;
  estimatedDueDate: string;
}

interface DischargeDetailItem extends CitationMetadata {
  disposition: string;
  instructions: string;
  diagnosis: string;
}

interface ReferralRecommendationItem extends CitationMetadata {
  specialty: string;
  reason: string;
  referredTo: string;
}

interface GeminiExtractionResult {
  encounter_date: string;
  documentDates: DocumentDateItem[];
  diagnoses: DiagnosisItem[];
  medications: MedicationItem[];
  labResults: LabResultItem[];
  allergies: AllergyItem[];
  procedures: ProcedureItem[];
  vitals: VitalItem[];
  physicians: PhysicianItem[];
  icdCodes: IcdCodeItem[];
  familyHistory: FamilyHistoryItem[];
  socialHistory: SocialHistoryItem[];
  imagingFindings: ImagingFindingItem[];
  pathologyFindings: PathologyFindingItem[];
  symptoms: SymptomItem[];
  chronicDiseaseIndicators: ChronicDiseaseIndicatorItem[];
  vaccinations: VaccinationItem[];
  cptCodes: CptCodeItem[];
  facilities: FacilityItem[];
  insuranceDetails: InsuranceItem[];
  emergencyContacts: EmergencyContactItem[];
  followUpRecommendations: FollowUpRecommendationItem[];
  pregnancyStatus: PregnancyStatusItem[];
  dischargeDetails: DischargeDetailItem[];
  referralRecommendations: ReferralRecommendationItem[];
}

interface SafetyAlerts {
  conflictFound: boolean;
  severity: "None" | "Moderate" | "CRITICAL RED ALERT";
  description: string;
}

type L2ReasonCode =
  | "NON_MEDICAL"
  | "WRONG_PATIENT"
  | "POOR_LEGIBILITY"
  | "UNSUPPORTED_LANGUAGE"
  | "DUPLICATE_DOCUMENT";

interface SuccessResponse {
  success: true;
  data: GeminiExtractionResult;
  safetyAlerts?: SafetyAlerts;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorType?: "VALIDATION_FAILED";
  reasonCode?: L2ReasonCode;
  message?: string;
  details?: Record<string, unknown>;
}

function validationFailedResponse(
  reasonCode: L2ReasonCode,
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      errorType: "VALIDATION_FAILED",
      reasonCode,
      message,
      error: message,
      ...(details ? { details } : {}),
    },
    { status: 400 },
  );
}

// ---------------------------------------------------------------------------
// JSON Schema for structured output enforcement
// ---------------------------------------------------------------------------

const TEXT = (description: string) => ({
  type: "string" as const,
  description,
});

const CITATION_PROPERTIES = {
  confidence: {
    type: "string" as const,
    enum: ["High", "Medium", "Low"],
    description: "Confidence in this exact extraction.",
  },
  boundingBox: {
    type: "array" as const,
    description:
      "Tight [ymin, xmin, ymax, xmax] coordinates for the source text, normalized to a 1000x1000 page.",
    items: { type: "integer" as const },
  },
  sourcePage: {
    type: "integer" as const,
    description: "One-based PDF page number containing the cited source text.",
  },
};

function citedArray(
  description: string,
  properties: Record<string, object>,
  required: string[],
) {
  return {
    type: "array" as const,
    description,
    items: {
      type: "object" as const,
      properties: { ...properties, ...CITATION_PROPERTIES },
      required: [...required, "confidence", "boundingBox", "sourcePage"],
    },
  };
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    encounter_date: TEXT(
      "Primary encounter or document date in YYYY-MM-DD format; return 'Unknown' only when no date is documented.",
    ),
    documentDates: citedArray(
      "Document, encounter, admission, discharge, collection, report, or service dates explicitly present.",
      {
        date: TEXT("Date in YYYY-MM-DD format."),
        dateType: TEXT("Label such as Encounter, Admission, Discharge, Collection, Report, or Service."),
      },
      ["date", "dateType"],
    ),
    diagnoses: citedArray(
      "Diagnoses and conditions explicitly documented.",
      {
        name: TEXT("Exact diagnosis or condition text."),
        date: TEXT("Most accurate associated clinical date in YYYY-MM-DD format, or 'Unknown'."),
      },
      ["name", "date"],
    ),
    medications: citedArray(
      "Medications and prescriptions explicitly documented.",
      {
        name: TEXT("Medication name."),
        date: TEXT("Most accurate associated date in YYYY-MM-DD format, or 'Unknown'."),
        dosage: TEXT("Dose and form; empty string when absent."),
        frequency: TEXT("Administration frequency; empty string when absent."),
        duration: TEXT("Documented treatment duration; empty string when absent."),
        adherenceClues: TEXT("Only explicit adherence evidence such as missed doses, stopped, compliant, or not taking; empty string when absent."),
      },
      ["name", "date", "dosage", "frequency", "duration", "adherenceClues"],
    ),
    labResults: citedArray(
      "Laboratory and pathology values.",
      {
        testName: TEXT("Test name."),
        date: TEXT("Specimen/result date in YYYY-MM-DD format, or 'Unknown'."),
        value: TEXT("Reported result value."),
        unit: TEXT("Reported unit; empty string when absent."),
        referenceRange: TEXT("Documented reference range; empty string when absent."),
        isAbnormal: {
          type: "boolean",
          description: "True when marked abnormal or outside the documented reference range.",
        },
      },
      ["testName", "date", "value", "unit", "referenceRange", "isAbnormal"],
    ),
    allergies: citedArray(
      "Food, medication, environmental, and other allergies.",
      {
        allergen: TEXT("Allergen name."),
        reaction: TEXT("Documented reaction; empty string when absent."),
        severity: TEXT("Documented severity; empty string when absent."),
      },
      ["allergen", "reaction", "severity"],
    ),
    procedures: citedArray(
      "Surgeries, procedures, interventions, and imaging examinations.",
      {
        name: TEXT("Procedure name."),
        date: TEXT("Procedure date in YYYY-MM-DD format, or 'Unknown'."),
        body_part: TEXT("Relevant body part; empty string when absent."),
      },
      ["name", "date", "body_part"],
    ),
    vitals: citedArray(
      "Vital signs including BP, heart rate, temperature, respiratory rate, SpO2, height, and weight.",
      {
        measurement: TEXT("Vital measurement name."),
        value: TEXT("Reported value."),
        unit: TEXT("Reported unit; empty string when absent."),
        date: TEXT("Measurement date in YYYY-MM-DD format, or 'Unknown'."),
      },
      ["measurement", "value", "unit", "date"],
    ),
    physicians: citedArray(
      "Attending, referring, ordering, consulting, or signing clinicians.",
      {
        name: TEXT("Clinician name."),
        role: TEXT("Role, department, or specialty; empty string when absent."),
      },
      ["name", "role"],
    ),
    icdCodes: citedArray(
      "ICD-10 or ICD-9 codes explicitly present; do not invent codes.",
      {
        code: TEXT("Exact ICD code."),
        description: TEXT("Documented code description; empty string when absent."),
      },
      ["code", "description"],
    ),
    cptCodes: citedArray(
      "CPT or HCPCS procedure codes explicitly present; do not infer billing codes.",
      {
        code: TEXT("Exact CPT or HCPCS code."),
        description: TEXT("Documented code description; empty string when absent."),
      },
      ["code", "description"],
    ),
    familyHistory: citedArray(
      "Family medical history.",
      {
        condition: TEXT("Documented family condition."),
        relative: TEXT("Affected relative; empty string when absent."),
      },
      ["condition", "relative"],
    ),
    socialHistory: citedArray(
      "Smoking, alcohol, and substance-use history.",
      {
        category: {
          type: "string",
          enum: ["Smoking", "Alcohol", "Substance Use"],
          description: "Social-history category.",
        },
        status: TEXT("Current, former, never, occasional, or other documented status."),
        details: TEXT("Quantity, duration, substance, or other details; empty string when absent."),
      },
      ["category", "status", "details"],
    ),
    imagingFindings: citedArray(
      "Radiology and imaging findings or impressions.",
      {
        bodyPart: TEXT("Body part or study."),
        finding: TEXT("Exact finding or impression."),
      },
      ["bodyPart", "finding"],
    ),
    pathologyFindings: citedArray(
      "Pathology, histology, cytology, and biopsy findings.",
      {
        specimen: TEXT("Specimen or tissue; empty string when absent."),
        finding: TEXT("Exact pathology finding."),
        interpretation: TEXT("Documented interpretation, grade, stage, or impression; empty string when absent."),
      },
      ["specimen", "finding", "interpretation"],
    ),
    symptoms: citedArray(
      "Symptoms and their documented timeline.",
      {
        symptom: TEXT("Symptom name or description."),
        onset: TEXT("Documented onset date or description; empty string when absent."),
        duration: TEXT("Documented duration; empty string when absent."),
        status: TEXT("Current, resolved, improving, worsening, intermittent, or other documented status."),
      },
      ["symptom", "onset", "duration", "status"],
    ),
    chronicDiseaseIndicators: citedArray(
      "Explicit indicators that a condition is chronic, recurrent, long-standing, controlled, or uncontrolled.",
      {
        condition: TEXT("Condition name."),
        indicator: TEXT("Exact chronicity evidence from the document."),
        status: TEXT("Documented state such as active, controlled, uncontrolled, or history of."),
      },
      ["condition", "indicator", "status"],
    ),
    vaccinations: citedArray(
      "Vaccination and immunization history.",
      {
        vaccine: TEXT("Vaccine or immunization name."),
        date: TEXT("Administration date in YYYY-MM-DD format, or 'Unknown'."),
        dose: TEXT("Dose number, manufacturer, or formulation; empty string when absent."),
      },
      ["vaccine", "date", "dose"],
    ),
    facilities: citedArray(
      "Hospitals, clinics, laboratories, and departments associated with the encounter.",
      {
        hospitalName: TEXT("Facility or hospital name."),
        department: TEXT("Department or service; empty string when absent."),
      },
      ["hospitalName", "department"],
    ),
    insuranceDetails: citedArray(
      "Insurance and policy identifiers explicitly printed in the document.",
      {
        provider: TEXT("Insurer or payer name; empty string when absent."),
        policyNumber: TEXT("Policy number; empty string when absent."),
        memberId: TEXT("Member, beneficiary, or subscriber ID; empty string when absent."),
      },
      ["provider", "policyNumber", "memberId"],
    ),
    emergencyContacts: citedArray(
      "Emergency or next-of-kin contacts.",
      {
        name: TEXT("Contact name."),
        relationship: TEXT("Relationship to patient; empty string when absent."),
        phone: TEXT("Phone number exactly as printed; empty string when absent."),
      },
      ["name", "relationship", "phone"],
    ),
    followUpRecommendations: citedArray(
      "Follow-up instructions and recommendations.",
      {
        recommendation: TEXT("Exact follow-up recommendation."),
        timeframe: TEXT("Documented timing such as 2 weeks or as needed; empty string when absent."),
      },
      ["recommendation", "timeframe"],
    ),
    pregnancyStatus: citedArray(
      "Pregnancy status and related gestational information when explicitly documented.",
      {
        status: TEXT("Pregnant, not pregnant, postpartum, unknown, or other exact documented status."),
        gestationalAge: TEXT("Documented gestational age; empty string when absent."),
        estimatedDueDate: TEXT("Estimated due date in YYYY-MM-DD format, or empty string when absent."),
      },
      ["status", "gestationalAge", "estimatedDueDate"],
    ),
    dischargeDetails: citedArray(
      "Discharge diagnoses, disposition, and patient instructions.",
      {
        disposition: TEXT("Discharge disposition; empty string when absent."),
        instructions: TEXT("Exact discharge instruction or restriction; empty string when absent."),
        diagnosis: TEXT("Discharge diagnosis; empty string when absent."),
      },
      ["disposition", "instructions", "diagnosis"],
    ),
    referralRecommendations: citedArray(
      "Recommendations or orders for referral to another clinician or service.",
      {
        specialty: TEXT("Target specialty or service; empty string when absent."),
        reason: TEXT("Documented reason for referral."),
        referredTo: TEXT("Named clinician or facility; empty string when absent."),
      },
      ["specialty", "reason", "referredTo"],
    ),
  },
  required: [
    "encounter_date",
    "documentDates",
    "diagnoses",
    "medications",
    "labResults",
    "allergies",
    "procedures",
    "vitals",
    "physicians",
    "icdCodes",
    "cptCodes",
    "familyHistory",
    "socialHistory",
    "imagingFindings",
    "pathologyFindings",
    "symptoms",
    "chronicDiseaseIndicators",
    "vaccinations",
    "facilities",
    "insuranceDetails",
    "emergencyContacts",
    "followUpRecommendations",
    "pregnancyStatus",
    "dischargeDetails",
    "referralRecommendations",
  ],
} as const;

const PRECHECK_SCHEMA = {
  type: "object",
  properties: {
    isMedical: {
      type: "boolean",
      description:
        "true if the document is a medical record, lab report, prescription, or clinical note; false otherwise.",
    },
    reason: {
      type: "string",
      description: "A one-sentence explanation for the classification.",
    },
    isWrongPatient: {
      type: "boolean",
      description: "true if the document explicitly belongs to a different patient than expected.",
    },
    detectedPatientName: {
      type: "string",
      description: "The name of the patient the document belongs to, if isWrongPatient is true.",
    },
    isLegible: {
      type: "boolean",
      description:
        "true if the document text is readable enough for reliable clinical extraction; false if blurry, corrupted, too low-resolution, or otherwise unreadable.",
    },
    detectedLanguage: {
      type: "string",
      description: "The primary language of the document, such as English, Spanish, French, or Unknown.",
    },
    isSupportedLanguage: {
      type: "boolean",
      description: "true only if the document's primary language is English; false for non-English documents.",
    },
  },
  required: ["isMedical", "reason", "isWrongPatient", "isLegible", "detectedLanguage", "isSupportedLanguage"],
} as const;

const CONFLICT_SCHEMA = {
  type: "object",
  properties: {
    conflictFound: {
      type: "boolean",
      description: "True if a drug-allergy conflict exists, false otherwise.",
    },
    severity: {
      type: "string",
      enum: ["None", "Moderate", "CRITICAL RED ALERT"],
      description: "The severity of the identified conflict.",
    },
    description: {
      type: "string",
      description: "Explanation of the conflict (e.g., 'Patient is allergic to Sulfa; prescribed Bactrim').",
    },
  },
  required: ["conflictFound", "severity", "description"],
} as const;



// ---------------------------------------------------------------------------
// System instruction
function buildSystemInstruction(sex: string, bloodType: string, language: string): string {
  return `You are a medical document analysis AI specializing in extracting structured clinical data from PDF documents.

TASK:
Extract every explicitly documented Level 1 fact covered by the response schema: dates, diagnoses, medications, labs, allergies, procedures, vitals, clinicians, ICD/CPT codes, family and social history, imaging and pathology findings, symptoms, chronic-disease indicators, vaccinations, facilities, insurance, emergency contacts, follow-up recommendations, pregnancy status, discharge details, and referrals.

BOUNDING BOX RULES:
- For every extracted item that asks for a bounding box, provide the 2D spatial bounding box where that text appears in the document.
- Bounding boxes use the format [ymin, xmin, ymax, xmax].
- All coordinates are integers normalized to a 1000×1000 scale, where (0, 0) is the top-left corner and (1000, 1000) is the bottom-right corner.
- The bounding box should tightly enclose the relevant text region.
- sourcePage is the one-based PDF page containing that exact bounding box.

EXTRACTION RULES:
- Extract ONLY information that is explicitly present in the document. Do NOT hallucinate, diagnose, invent codes, or infer facts that are not written.
- Identify any patient allergies, specifically food or drug allergies, the reaction, and severity.
- Identify past medical procedures, surgeries, or imaging (e.g., appendectomy, MRI).
- Extract vital signs such as Blood Pressure, Heart Rate, Temperature, Respiratory Rate, SpO2, Weight, and Height. Include the measurement name, value, and unit.
- Identify attending or referring physicians with their name and role or specialty.
- Extract any ICD-10 (or ICD-9) codes along with their descriptions.
- Extract family medical history: conditions that run in the patient's family and which relative is affected (e.g., "Father - diabetes", "Mother - breast cancer").
- Extract social history for smoking, alcohol, and substance use. Record the category, current status, and explicit quantity or duration details.
- Extract imaging and radiology findings including the body part examined, the finding/impression, and confidence level.
- For lab results, prioritize the reference range and abnormal flag printed in the document. If a value is not marked and no reference range is printed, use established adult reference ranges cautiously and lower confidence when demographic context is insufficient.
- The patient's biological sex is ${sex}, blood type is ${bloodType}, and primary language is ${language}. Use biological sex only when a clinical reference range genuinely depends on it.
- If a category has no data in the document, return an empty array for that category.
- For confidence: use "High" for clearly and unambiguously stated items, "Medium" for probable items, "Low" for ambiguous or partially legible items.
- For dosage, frequency, medication duration, and adherence clues: use an empty string "" if the information is not explicitly specified.
- For lab result units: use an empty string "" if not specified.
- ENCOUNTER DATE: Actively search for the date of the medical encounter, visit, or when the document was created/authored. Look for headers like "Date of Visit", "Date of Service", "Report Date", "Encounter Date", "Date of Exam", or any document-level date. Return in YYYY-MM-DD format. If no date can be determined, return "Unknown".

TEMPORAL DIRECTIVE: For dated items, use the most accurate explicitly associated clinical date.
- Look for specific dates next to the item (e.g., a lab draw date).
- If a specific item date is missing, use the document encounter date only when the item clearly belongs to that encounter; otherwise return "Unknown".
- Format known dates as strict ISO 8601 YYYY-MM-DD strings.

OUTPUT:
Return ONLY the structured JSON object. No explanations, no markdown, no commentary.`;
}

// ---------------------------------------------------------------------------
// POST /api/extract/gemini
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  // ── 1. Parse & validate request body ────────────────────────────────
  let pdfUrl: string;
  let expectedPatientName: string | undefined;
  let expectedDob: string | undefined;
  let expectedSex: string | undefined;
  let expectedBloodType: string | undefined;
  let expectedLanguage: string | undefined;
  let gatekeeperPrefs: Record<string, unknown> | undefined;

  try {
    const body = (await request.json()) as {
      pdfUrl?: unknown; expectedPatientName?: unknown; expectedDob?: unknown;
      expectedSex?: unknown; expectedBloodType?: unknown; expectedLanguage?: unknown;
      gatekeeperPrefs?: Record<string, unknown>;
    };
    if (!body.pdfUrl || typeof body.pdfUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'pdfUrl' in request body." },
        { status: 400 },
      );
    }
    pdfUrl = body.pdfUrl;
    expectedPatientName = typeof body.expectedPatientName === "string" ? body.expectedPatientName : undefined;
    expectedDob = typeof body.expectedDob === "string" ? body.expectedDob : undefined;
    expectedSex = typeof body.expectedSex === "string" ? body.expectedSex : undefined;
    expectedBloodType = typeof body.expectedBloodType === "string" ? body.expectedBloodType : undefined;
    expectedLanguage = typeof body.expectedLanguage === "string" ? body.expectedLanguage : undefined;
    
    // Default gatekeeper prefs if not provided
    const defaultGatekeeperPrefs = { strictIdentityMatch: false, allergySensitivity: 'high' };
    gatekeeperPrefs = typeof body.gatekeeperPrefs === "object" && body.gatekeeperPrefs !== null 
      ? { ...defaultGatekeeperPrefs, ...body.gatekeeperPrefs } 
      : defaultGatekeeperPrefs;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // Reject non-HTTP(S) URLs (e.g. local file paths like C:/...)
  if (!/^https?:\/\//i.test(pdfUrl)) {
    return NextResponse.json(
      { success: false, error: "Invalid URL provided. File must be uploaded to storage first." },
      { status: 400 },
    );
  }

  // Basic URL validation
  try {
    new URL(pdfUrl);
  } catch {
    return NextResponse.json(
      { success: false, error: "The provided 'pdfUrl' is not a valid URL." },
      { status: 400 },
    );
  }

  // Reject obviously non-PDF URLs (permissive for Supabase public URLs)
  const urlPath = new URL(pdfUrl).pathname.toLowerCase();
  const extension = urlPath.split(".").pop() ?? "";
  const nonPdfExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff"];
  if (nonPdfExtensions.includes(extension)) {
    return NextResponse.json(
      { success: false, error: "The provided URL does not appear to point to a PDF file." },
      { status: 400 },
    );
  }

  // ── 2. Read required env vars ───────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json(
      { success: false, error: "Extraction service is not configured. Please contact the administrator." },
      { status: 500 },
    );
  }

  // ── Shared Gemini client ───────────────────────────────────────────
  const ai = new GoogleGenAI({ apiKey });

  // ── 3. Fetch the PDF from the provided URL ─────────────────────────
  let pdfBase64: string;

  try {
    const pdfResponse = await fetch(pdfUrl);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch the PDF. Remote server responded with status ${pdfResponse.status}.`,
        },
        { status: 502 },
      );
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "The fetched PDF is empty (0 bytes)." },
        { status: 400 },
      );
    }

    pdfBase64 = buffer.toString("base64");
  } catch (err) {
    console.error("Error fetching PDF from URL:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve the PDF from the provided URL." },
      { status: 502 },
    );
  }

  // ── 3.5  Fast-fail pre-check: classify document ────────────────────
  try {
    let triageSystemInstruction = `You are a triage AI. The securely logged-in patient is ${expectedPatientName || 'Unknown'}, born ${expectedDob || 'Unknown'}, Biological Sex: ${expectedSex || 'Unknown'}, Blood Type: ${expectedBloodType || 'Unknown'}, Primary Language: ${expectedLanguage || 'Unknown'}.

Analyze the document before extraction and return the structured precheck JSON only.
- Set isLegible to false if the scan is blurry, corrupted, too low-resolution, mostly blank, or otherwise not readable enough for reliable clinical extraction.
- Set detectedLanguage to the document's primary language. Set isSupportedLanguage to true only when the primary document language is English.
- Set isMedical to false if it is not a medical record, lab report, prescription, clinical note, imaging report, discharge summary, or similar health document.
- Set isWrongPatient to true if the document explicitly belongs to a different patient than expected, and extract detectedPatientName when visible.
- Use reason to explain the most important rejection or acceptance signal in one sentence.`;

    if (gatekeeperPrefs?.strictIdentityMatch) {
      triageSystemInstruction += " STRICT IDENTITY MATCH IS ENABLED: If the name does not match perfectly or is missing, you MUST flag isWrongPatient as true.";
    }

    const triageResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
            { text: "Classify this document." },
          ],
        },
      ],
      config: {
        systemInstruction: triageSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: PRECHECK_SCHEMA,
      },
    });

    const triageText = triageResponse.text;

    if (triageText) {
      const triage = JSON.parse(triageText) as {
        isMedical: boolean;
        reason: string;
        isWrongPatient: boolean;
        detectedPatientName?: string;
        isLegible: boolean;
        detectedLanguage: string;
        isSupportedLanguage: boolean;
      };

      if (!triage.isLegible) {
        return validationFailedResponse(
          "POOR_LEGIBILITY",
          "Document quality is too poor for reliable extraction.",
          {
            reason: triage.reason,
          },
        );
      }

      if (!triage.isSupportedLanguage) {
        return validationFailedResponse(
          "UNSUPPORTED_LANGUAGE",
          "Only English medical documents are currently supported.",
          {
            detectedLanguage: triage.detectedLanguage,
            reason: triage.reason,
          },
        );
      }

      if (!triage.isMedical) {
        return validationFailedResponse(
          "NON_MEDICAL",
          "This does not appear to be a medical document.",
          {
            reason: triage.reason,
          },
        );
      }

      if (triage.isWrongPatient) {
        return validationFailedResponse(
          "WRONG_PATIENT",
          "Document name does not match the logged-in user.",
          {
            detectedPatientName: triage.detectedPatientName,
            expectedPatientName: expectedPatientName || "the current user",
            reason: triage.reason,
          },
        );
      }
    }
  } catch (err) {
    // Pre-check failed — log and proceed to main extraction rather than blocking
    console.warn("Pre-check triage failed; proceeding to extraction.", err);
  }

  // ── 4. Call Gemini API ─────────────────────────────────────────────
  try {

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              text: "Perform the complete Level 1 extraction defined by the response schema. Return every explicitly documented fact with confidence, sourcePage, and a tight normalized boundingBox. Return empty arrays for absent categories.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: buildSystemInstruction(
          expectedSex || "Unknown",
          expectedBloodType || "Unknown",
          expectedLanguage || "Unknown"
        ),
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
      },
    });

    // ── 5. Parse and validate the response ───────────────────────────
    const rawText = response.text;

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "Gemini returned an empty response." },
        { status: 500 },
      );
    }

    let parsed: GeminiExtractionResult;

    try {
      parsed = JSON.parse(rawText) as GeminiExtractionResult;
    } catch {
      console.error("Failed to parse Gemini response as JSON:", rawText);
      return NextResponse.json(
        { success: false, error: "Failed to parse the extraction results." },
        { status: 500 },
      );
    }

    // Ensure all expected arrays exist (defensive)
    const data: GeminiExtractionResult = {
      encounter_date: typeof parsed.encounter_date === "string" ? parsed.encounter_date : "Unknown",
      documentDates: Array.isArray(parsed.documentDates) ? parsed.documentDates : [],
      diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      labResults: Array.isArray(parsed.labResults) ? parsed.labResults : [],
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
      procedures: Array.isArray(parsed.procedures) ? parsed.procedures : [],
      vitals: Array.isArray(parsed.vitals) ? parsed.vitals : [],
      physicians: Array.isArray(parsed.physicians) ? parsed.physicians : [],
      icdCodes: Array.isArray(parsed.icdCodes) ? parsed.icdCodes : [],
      cptCodes: Array.isArray(parsed.cptCodes) ? parsed.cptCodes : [],
      familyHistory: Array.isArray(parsed.familyHistory) ? parsed.familyHistory : [],
      socialHistory: Array.isArray(parsed.socialHistory) ? parsed.socialHistory : [],
      imagingFindings: Array.isArray(parsed.imagingFindings) ? parsed.imagingFindings : [],
      pathologyFindings: Array.isArray(parsed.pathologyFindings) ? parsed.pathologyFindings : [],
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      chronicDiseaseIndicators: Array.isArray(parsed.chronicDiseaseIndicators) ? parsed.chronicDiseaseIndicators : [],
      vaccinations: Array.isArray(parsed.vaccinations) ? parsed.vaccinations : [],
      facilities: Array.isArray(parsed.facilities) ? parsed.facilities : [],
      insuranceDetails: Array.isArray(parsed.insuranceDetails) ? parsed.insuranceDetails : [],
      emergencyContacts: Array.isArray(parsed.emergencyContacts) ? parsed.emergencyContacts : [],
      followUpRecommendations: Array.isArray(parsed.followUpRecommendations) ? parsed.followUpRecommendations : [],
      pregnancyStatus: Array.isArray(parsed.pregnancyStatus) ? parsed.pregnancyStatus : [],
      dischargeDetails: Array.isArray(parsed.dischargeDetails) ? parsed.dischargeDetails : [],
      referralRecommendations: Array.isArray(parsed.referralRecommendations) ? parsed.referralRecommendations : [],
    };

    // Normalize all citation metadata before it is persisted or rendered.
    const clampBox = (box: number[]): [number, number, number, number] => {
      const clamp = (value: number) =>
        Math.max(0, Math.min(1000, Math.round(Number(value) || 0)));
      return [
        clamp(box[0] ?? 0),
        clamp(box[1] ?? 0),
        clamp(box[2] ?? 0),
        clamp(box[3] ?? 0),
      ];
    };

    const citedCollections: CitationMetadata[][] = [
      data.documentDates,
      data.diagnoses,
      data.medications,
      data.labResults,
      data.allergies,
      data.procedures,
      data.vitals,
      data.physicians,
      data.icdCodes,
      data.cptCodes,
      data.familyHistory,
      data.socialHistory,
      data.imagingFindings,
      data.pathologyFindings,
      data.symptoms,
      data.chronicDiseaseIndicators,
      data.vaccinations,
      data.facilities,
      data.insuranceDetails,
      data.emergencyContacts,
      data.followUpRecommendations,
      data.pregnancyStatus,
      data.dischargeDetails,
      data.referralRecommendations,
    ];

    for (const collection of citedCollections) {
      for (const item of collection) {
        item.boundingBox = clampBox(
          Array.isArray(item.boundingBox) ? item.boundingBox : [],
        );
        item.sourcePage = Math.max(1, Math.round(Number(item.sourcePage) || 1));
      }
    }

    let safetyAlerts: SafetyAlerts | undefined = undefined;

    if (data.allergies.length > 0 && data.medications.length > 0) {
      try {
          let conflictSystemInstruction = "You are a clinical safety AI. Analyze the provided allergies and medications and detect if there are any dangerous drug-allergy interactions.";
          if (gatekeeperPrefs?.allergySensitivity === 'low') {
            conflictSystemInstruction += " ONLY flag critical, life-threatening conflicts. Ignore minor or theoretical interactions.";
          } else {
            conflictSystemInstruction += " Flag all potential interactions including minor and theoretical ones.";
          }

          const conflictResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Here is a patient's extracted allergy list: ${JSON.stringify(
                      data.allergies
                    )}. Here is their prescribed medication list: ${JSON.stringify(
                      data.medications
                    )}. Are there any dangerous drug-allergy interactions here?`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: conflictSystemInstruction,
              responseMimeType: "application/json",
              responseSchema: CONFLICT_SCHEMA,
            },
          });

        const conflictText = conflictResponse.text;
        if (conflictText) {
          safetyAlerts = JSON.parse(conflictText) as SafetyAlerts;
        }
      } catch (err) {
        console.warn("Safety check failed; proceeding without alerts.", err);
      }
    }

    // ── 6. Return structured response ────────────────────────────────
    return NextResponse.json({ success: true, data, safetyAlerts }, { status: 200 });
  } catch (err) {
    console.error("Gemini API error:", err);

    // Surface quota/rate-limit errors clearly
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { success: false, error: "API rate limit exceeded. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { success: false, error: "An error occurred while processing the document with AI." },
      { status: 500 },
    );
  }
}
