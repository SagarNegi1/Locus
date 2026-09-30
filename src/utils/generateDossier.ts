import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------------------------------
// Types (self-contained — mirrors the MasterTimelineEvent from patient/page)
// ---------------------------------------------------------------------------

interface MasterTimelineEvent {
  type: "diagnosis" | "medication" | "lab";
  title: string;
  detail: string;
  date: string;
  rawDate: string;
}

// ---------------------------------------------------------------------------
// Color palette (matches the app's Tailwind design tokens)
// ---------------------------------------------------------------------------

const COLORS = {
  headerBg: [15, 23, 42] as [number, number, number], // slate-900
  headerText: [255, 255, 255] as [number, number, number],
  sectionDiagnosis: [37, 99, 235] as [number, number, number], // blue-600
  sectionMedication: [217, 119, 6] as [number, number, number], // amber-600
  sectionLab: [5, 150, 105] as [number, number, number], // emerald-600
  textPrimary: [15, 23, 42] as [number, number, number], // slate-900
  textSecondary: [100, 116, 139] as [number, number, number], // slate-500
  tableBorder: [226, 232, 240] as [number, number, number], // slate-200
  tableHeaderBg: [241, 245, 249] as [number, number, number], // slate-100
  tableAltRow: [248, 250, 252] as [number, number, number], // slate-50
  footerLine: [203, 213, 225] as [number, number, number], // slate-300
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateDossier(
  masterTimeline: MasterTimelineEvent[]
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // ── Header Bar ──────────────────────────────────────────────────────

  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 36, "F");

  // Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.headerText);
  doc.text("CLINICALAUDIT", margin, 16);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Clinical Dossier", margin, 23);

  // Generation date (right-aligned)
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  doc.setFontSize(9);
  doc.text(
    `Generated: ${formattedDate} at ${formattedTime}`,
    pageWidth - margin,
    16,
    { align: "right" }
  );

  doc.text(
    `${masterTimeline.length} medical event${masterTimeline.length !== 1 ? "s" : ""} synthesized`,
    pageWidth - margin,
    23,
    { align: "right" }
  );

  // Thin accent line below header
  doc.setDrawColor(...COLORS.sectionDiagnosis);
  doc.setLineWidth(0.8);
  doc.line(0, 36, pageWidth, 36);

  let cursorY = 46;

  // ── Empty State ─────────────────────────────────────────────────────

  if (masterTimeline.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
      "No medical data available. Upload medical documents to generate your clinical dossier.",
      pageWidth / 2,
      cursorY + 20,
      { align: "center", maxWidth: contentWidth }
    );
    addFooter(doc, pageWidth, pageHeight, margin);
    triggerDownload(doc, now);
    return;
  }

  // ── Group events ────────────────────────────────────────────────────

  const diagnoses = masterTimeline.filter((e) => e.type === "diagnosis");
  const medications = masterTimeline.filter((e) => e.type === "medication");
  const labs = masterTimeline.filter((e) => e.type === "lab");

  // ── Render sections ─────────────────────────────────────────────────

  const sections: {
    title: string;
    color: [number, number, number];
    headers: string[];
    rows: string[][];
    emptyText: string;
  }[] = [
      {
        title: "Active Diagnoses",
        color: COLORS.sectionDiagnosis,
        headers: ["Diagnosis", "Date Recorded", "Confidence"],
        rows: diagnoses.map((d) => [d.title, d.date, d.detail]),
        emptyText: "No diagnoses found in uploaded records.",
      },
      {
        title: "Current Medications",
        color: COLORS.sectionMedication,
        headers: ["Medication", "Date Recorded", "Dosage & Frequency"],
        rows: medications.map((m) => [m.title, m.date, m.detail]),
        emptyText: "No medications found in uploaded records.",
      },
      {
        title: "Lab Results",
        color: COLORS.sectionLab,
        headers: ["Test Name", "Date Recorded", "Result"],
        rows: labs.map((l) => [l.title, l.date, l.detail]),
        emptyText: "No lab results found in uploaded records.",
      },
    ];

  for (const section of sections) {
    // Check if we need a page break before this section header
    if (cursorY > pageHeight - 50) {
      addFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 20;
    }

    // Section accent bar
    doc.setFillColor(...section.color);
    doc.roundedRect(margin, cursorY, 3, 10, 1.5, 1.5, "F");

    // Section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(section.title.toUpperCase(), margin + 8, cursorY + 7);

    // Count badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textSecondary);
    const countText = `${section.rows.length} item${section.rows.length !== 1 ? "s" : ""}`;
    doc.text(countText, pageWidth - margin, cursorY + 7, { align: "right" });

    cursorY += 15;

    if (section.rows.length === 0) {
      // Empty state for section
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(section.emptyText, margin + 8, cursorY + 4);
      cursorY += 16;
    } else {
      // Render table
      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [section.headers],
        body: section.rows,
        theme: "grid",
        headStyles: {
          fillColor: section.color,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
          halign: "left",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: COLORS.textPrimary,
          cellPadding: 3.5,
          lineColor: COLORS.tableBorder,
          lineWidth: 0.3,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAltRow,
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.42, fontStyle: "bold" },
          1: { cellWidth: contentWidth * 0.25 },
          2: { cellWidth: contentWidth * 0.33 },
        },
        didDrawPage: () => {
          addFooter(doc, pageWidth, pageHeight, margin);
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursorY = (doc as any).lastAutoTable.finalY + 12;
    }
  }

  // ── Final footer & download ─────────────────────────────────────────

  addFooter(doc, pageWidth, pageHeight, margin);
  triggerDownload(doc, now);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  const totalPages = doc.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;

  // Divider line
  doc.setDrawColor(...COLORS.footerLine);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

  // Left: confidentiality
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text("CONFIDENTIAL · ClinicalAudit Medical Dossier", margin, pageHeight - 9);

  // Right: page number
  doc.text(
    `Page ${currentPage} of ${totalPages}`,
    pageWidth - margin,
    pageHeight - 9,
    { align: "right" }
  );
}

function triggerDownload(doc: jsPDF, date: Date): void {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  doc.save(`Clinical_Dossier_${yyyy}-${mm}-${dd}.pdf`);
}
