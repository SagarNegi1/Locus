export const dummyMedicalRecord = {
  id: "tour-dummy-record",
  created_at: new Date().toISOString(),
  pdf_url: "/sample.pdf",
  extracted_data: {
    encounter_date: "2026-06-08",
    patientName: "John Doe",
    dob: "1980-01-01",
    sex: "Male",
    bloodType: "O+",
    language: "English",
    diagnoses: [
      {
        name: "Essential Hypertension",
        confidence: "High",
        boundingBox: [150, 150, 200, 400] as [number, number, number, number],
      },
    ],
    medications: [],
    labResults: [],
    allergies: [],
    safetyAlerts: { conflictFound: false, severity: "low", description: "" },
  },
};
