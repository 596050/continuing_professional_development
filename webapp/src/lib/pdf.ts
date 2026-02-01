/**
 * PDF generation utilities for audit reports, compliance briefs, and certificates.
 * Uses PDFKit for server-side PDF generation.
 */

import PDFDocument from "pdfkit";
import QRCode from "qrcode";

interface UserInfo {
  name: string;
  email: string;
  plan: string;
}

interface CredentialInfo {
  name: string;
  body: string;
  region: string;
  hoursRequired: number;
  ethicsRequired: number;
  structuredRequired: number;
  cycleLengthYears: number;
}

interface ProgressInfo {
  totalHoursCompleted: number;
  hoursRequired: number;
  ethicsHoursCompleted: number;
  ethicsRequired: number;
  structuredHoursCompleted: number;
  structuredRequired: number;
  progressPercent: number;
  certificateCount: number;
}

interface DeadlineInfo {
  renewalDeadline: string | null;
  daysUntilDeadline: number | null;
  jurisdiction: string | null;
}

interface ActivityRecord {
  title: string;
  provider: string | null;
  activityType: string;
  hours: number;
  date: string;
  status: string;
  category: string | null;
}

interface EvidenceItem {
  fileName: string;
  fileType: string;
  uploadedAt: string;
  cpdRecordId: string | null;
}

// ------------------------------------------------------------------
// Compliance Brief (1-page summary)
// ------------------------------------------------------------------
export function generateComplianceBrief(
  user: UserInfo,
  credential: CredentialInfo,
  progress: ProgressInfo,
  deadline: DeadlineInfo
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Header
  doc
    .fontSize(10)
    .fillColor("#6F777B")
    .text("AuditReadyCPD - Compliance Brief", 50, 40)
    .text(
      `Generated: ${new Date().toLocaleDateString("en-GB")}`,
      50,
      40,
      { align: "right" }
    );

  doc
    .moveTo(50, 60)
    .lineTo(545, 60)
    .strokeColor("#00857C")
    .lineWidth(2)
    .stroke();

  // Title
  doc
    .fontSize(22)
    .fillColor("#1B2A4A")
    .text("CPD Compliance Brief", 50, 80);

  doc
    .fontSize(12)
    .fillColor("#505A5F")
    .text(`Prepared for ${user.name || user.email}`, 50, 110);

  // Credential Details Box
  doc.rect(50, 145, 495, 100).fillColor("#F3F2F1").fill();

  doc
    .fontSize(14)
    .fillColor("#1B2A4A")
    .text("Credential Details", 65, 155);

  doc.fontSize(10).fillColor("#505A5F");
  doc.text(`Credential: ${credential.name}`, 65, 180);
  doc.text(`Regulatory Body: ${credential.body}`, 65, 195);
  doc.text(
    `Jurisdiction: ${deadline.jurisdiction ?? credential.region}`,
    65,
    210
  );
  doc.text(
    `Cycle: ${credential.cycleLengthYears} year${credential.cycleLengthYears > 1 ? "s" : ""}`,
    65,
    225
  );

  doc.text(
    `Hours Required: ${credential.hoursRequired}h per cycle`,
    300,
    180
  );
  if (credential.ethicsRequired > 0) {
    doc.text(`Ethics Required: ${credential.ethicsRequired}h`, 300, 195);
  }
  if (credential.structuredRequired > 0) {
    doc.text(
      `Structured Required: ${credential.structuredRequired}h`,
      300,
      210
    );
  }
  if (deadline.renewalDeadline) {
    doc.text(
      `Deadline: ${new Date(deadline.renewalDeadline).toLocaleDateString("en-GB")}`,
      300,
      225
    );
  }

  // Progress Section
  doc
    .fontSize(14)
    .fillColor("#1B2A4A")
    .text("Current Progress", 50, 270);

  // Progress bar
  const barY = 295;
  const barWidth = 400;
  const barHeight = 20;
  const fillWidth = Math.min(
    barWidth,
    (progress.progressPercent / 100) * barWidth
  );

  doc.rect(65, barY, barWidth, barHeight).fillColor("#E8E8E8").fill();

  const barColor =
    progress.progressPercent >= 100
      ? "#00703C"
      : progress.progressPercent >= 75
        ? "#00857C"
        : progress.progressPercent >= 50
          ? "#B35F00"
          : "#D4351C";
  doc.rect(65, barY, fillWidth, barHeight).fillColor(barColor).fill();

  doc
    .fontSize(10)
    .fillColor("#1D252C")
    .text(
      `${progress.totalHoursCompleted}h / ${progress.hoursRequired}h (${progress.progressPercent}%)`,
      475,
      barY + 4
    );

  // Breakdown table
  const tableY = 330;
  doc.fontSize(10).fillColor("#505A5F");

  const rows = [
    [
      "Total Hours",
      `${progress.totalHoursCompleted}`,
      `${progress.hoursRequired}`,
      progress.totalHoursCompleted >= progress.hoursRequired
        ? "Complete"
        : `${progress.hoursRequired - progress.totalHoursCompleted}h remaining`,
    ],
  ];

  if (credential.ethicsRequired > 0) {
    rows.push([
      "Ethics Hours",
      `${progress.ethicsHoursCompleted}`,
      `${credential.ethicsRequired}`,
      progress.ethicsHoursCompleted >= credential.ethicsRequired
        ? "Complete"
        : `${credential.ethicsRequired - progress.ethicsHoursCompleted}h remaining`,
    ]);
  }

  if (credential.structuredRequired > 0) {
    rows.push([
      "Structured Hours",
      `${progress.structuredHoursCompleted}`,
      `${credential.structuredRequired}`,
      progress.structuredHoursCompleted >= credential.structuredRequired
        ? "Complete"
        : `${credential.structuredRequired - progress.structuredHoursCompleted}h remaining`,
    ]);
  }

  // Table header
  doc.fillColor("#1B2A4A").font("Helvetica-Bold");
  doc.text("Category", 65, tableY);
  doc.text("Completed", 220, tableY);
  doc.text("Required", 310, tableY);
  doc.text("Status", 400, tableY);

  doc.font("Helvetica").fillColor("#505A5F");
  rows.forEach((row, i) => {
    const y = tableY + 18 + i * 16;
    doc.text(row[0], 65, y);
    doc.text(row[1], 220, y);
    doc.text(row[2], 310, y);
    doc.text(row[3], 400, y);
  });

  // Deadline Section
  if (deadline.daysUntilDeadline !== null) {
    const deadlineY = tableY + 18 + rows.length * 16 + 30;
    doc.rect(50, deadlineY, 495, 50).fillColor("#FFF4E6").fill();

    const urgencyColor =
      deadline.daysUntilDeadline <= 30
        ? "#D4351C"
        : deadline.daysUntilDeadline <= 90
          ? "#B35F00"
          : "#1B2A4A";

    doc
      .fontSize(12)
      .fillColor(urgencyColor)
      .text(
        `${deadline.daysUntilDeadline} days until deadline`,
        65,
        deadlineY + 10
      );
    doc
      .fontSize(10)
      .fillColor("#505A5F")
      .text(
        `Renewal date: ${new Date(deadline.renewalDeadline!).toLocaleDateString("en-GB")}`,
        65,
        deadlineY + 28
      );
  }

  // Evidence summary
  const evidenceY = 500;
  doc
    .fontSize(14)
    .fillColor("#1B2A4A")
    .text("Evidence Summary", 50, evidenceY);
  doc
    .fontSize(10)
    .fillColor("#505A5F")
    .text(
      `Certificates on file: ${progress.certificateCount}`,
      65,
      evidenceY + 22
    );

  // Footer
  doc
    .fontSize(8)
    .fillColor("#6F777B")
    .text(
      "This document is generated by AuditReadyCPD for compliance planning purposes.",
      50,
      750
    )
    .text(
      "It does not constitute legal or regulatory advice. Verify requirements with your regulatory body.",
      50,
      762
    );

  doc.end();
  return doc;
}

// ------------------------------------------------------------------
// Audit Report (full multi-page report)
// ------------------------------------------------------------------
export function generateAuditReport(
  user: UserInfo,
  credential: CredentialInfo,
  progress: ProgressInfo,
  deadline: DeadlineInfo,
  activities: ActivityRecord[],
  evidenceList: EvidenceItem[]
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // ---- Page 1: Cover + Summary ----
  doc
    .fontSize(10)
    .fillColor("#6F777B")
    .text("AuditReadyCPD - Audit Report", 50, 40)
    .text(
      `Generated: ${new Date().toLocaleDateString("en-GB")}`,
      50,
      40,
      { align: "right" }
    );

  doc
    .moveTo(50, 60)
    .lineTo(545, 60)
    .strokeColor("#00857C")
    .lineWidth(2)
    .stroke();

  doc
    .fontSize(24)
    .fillColor("#1B2A4A")
    .text("CPD Audit Report", 50, 85);

  doc
    .fontSize(14)
    .fillColor("#505A5F")
    .text(`${user.name || user.email}`, 50, 120);
  doc
    .fontSize(11)
    .text(
      `${credential.name} - ${credential.body} (${deadline.jurisdiction ?? credential.region})`,
      50,
      140
    );

  // Summary box
  doc.rect(50, 170, 495, 80).fillColor("#F3F2F1").fill();
  doc.fontSize(12).fillColor("#1B2A4A");
  doc.text("Summary", 65, 180);
  doc.fontSize(10).fillColor("#505A5F");
  doc.text(
    `Total Hours: ${progress.totalHoursCompleted} / ${progress.hoursRequired} (${progress.progressPercent}%)`,
    65,
    200
  );
  doc.text(`Activities Logged: ${activities.length}`, 65, 216);
  doc.text(`Evidence Files: ${evidenceList.length}`, 65, 232);
  doc.text(
    `Certificates: ${progress.certificateCount}`,
    300,
    200
  );
  if (deadline.renewalDeadline) {
    doc.text(
      `Deadline: ${new Date(deadline.renewalDeadline).toLocaleDateString("en-GB")}`,
      300,
      216
    );
  }
  if (deadline.daysUntilDeadline !== null) {
    doc.text(`Days Remaining: ${deadline.daysUntilDeadline}`, 300, 232);
  }

  // ---- Activity Log ----
  doc
    .fontSize(16)
    .fillColor("#1B2A4A")
    .text("Activity Log", 50, 280);

  let y = 305;

  // Table headers
  doc.fontSize(9).fillColor("#1B2A4A").font("Helvetica-Bold");
  doc.text("Date", 50, y);
  doc.text("Title", 110, y);
  doc.text("Provider", 310, y);
  doc.text("Hours", 420, y);
  doc.text("Type", 465, y);
  doc.text("Status", 510, y);

  doc.font("Helvetica").fillColor("#505A5F");
  y += 15;

  for (const act of activities) {
    if (y > 730) {
      doc.addPage();
      y = 50;
    }

    const dateStr = new Date(act.date).toLocaleDateString("en-GB");
    doc.fontSize(8);
    doc.text(dateStr, 50, y, { width: 55 });
    doc.text(act.title.substring(0, 40), 110, y, { width: 195 });
    doc.text((act.provider ?? "-").substring(0, 20), 310, y, { width: 105 });
    doc.text(String(act.hours), 420, y, { width: 40 });
    doc.text(act.activityType.substring(0, 8), 465, y, { width: 45 });
    doc.text(act.status.substring(0, 8), 510, y, { width: 45 });
    y += 14;
  }

  // ---- Evidence Inventory ----
  if (evidenceList.length > 0) {
    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    y += 20;
    doc
      .fontSize(16)
      .fillColor("#1B2A4A")
      .text("Evidence Inventory", 50, y);
    y += 25;

    doc.fontSize(9).fillColor("#1B2A4A").font("Helvetica-Bold");
    doc.text("File Name", 50, y);
    doc.text("Type", 320, y);
    doc.text("Uploaded", 400, y);
    doc.font("Helvetica").fillColor("#505A5F");
    y += 15;

    for (const ev of evidenceList) {
      if (y > 730) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(8);
      doc.text(ev.fileName.substring(0, 55), 50, y, { width: 265 });
      doc.text(ev.fileType, 320, y, { width: 75 });
      doc.text(
        new Date(ev.uploadedAt).toLocaleDateString("en-GB"),
        400,
        y,
        { width: 100 }
      );
      y += 14;
    }
  }

  // Footer on last page
  doc
    .fontSize(8)
    .fillColor("#6F777B")
    .text(
      "Generated by AuditReadyCPD. This report provides a record of CPD activities and evidence for audit purposes.",
      50,
      750
    );

  doc.end();
  return doc;
}

// ------------------------------------------------------------------
// CSV Export
// ------------------------------------------------------------------
export function generateAuditCsv(
  user: UserInfo,
  credential: CredentialInfo,
  activities: ActivityRecord[]
): string {
  const header = [
    "Date",
    "Title",
    "Provider",
    "Activity Type",
    "Hours",
    "Category",
    "Status",
    "Credential",
    "User",
  ].join(",");

  const rows = activities.map((act) => {
    const dateStr = new Date(act.date).toISOString().slice(0, 10);
    return [
      dateStr,
      `"${act.title.replace(/"/g, '""')}"`,
      `"${(act.provider ?? "").replace(/"/g, '""')}"`,
      act.activityType,
      String(act.hours),
      act.category ?? "",
      act.status,
      credential.name,
      `"${(user.name ?? user.email).replace(/"/g, '""')}"`,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

// ------------------------------------------------------------------
// Certificate Code Generator
// ------------------------------------------------------------------
export function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CERT-${year}-${suffix}`;
}

// ------------------------------------------------------------------
// Certificate PDF
// ------------------------------------------------------------------
export interface CertificateInfo {
  certificateCode: string;
  title: string;
  recipientName: string;
  recipientEmail: string;
  credentialName: string | null;
  hours: number;
  category: string | null;
  provider: string | null;
  completedDate: string;
  issuedDate: string;
  verificationUrl: string;
  quizScore: number | null;
  firmName: string | null;
  firmLogoUrl: string | null;
  firmPrimaryColor: string | null;
}

export async function generateCertificatePdf(
  cert: CertificateInfo
): Promise<InstanceType<typeof PDFDocument>> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });

  const primaryColor = cert.firmPrimaryColor ?? "#1B2A4A";
  const accentColor = "#00857C";

  // Border
  doc.rect(20, 20, 802, 555).lineWidth(3).strokeColor(accentColor).stroke();
  doc.rect(25, 25, 792, 545).lineWidth(1).strokeColor(primaryColor).stroke();

  // Header
  const issuerName = cert.firmName ?? "AuditReadyCPD";
  doc
    .fontSize(11)
    .fillColor("#6F777B")
    .text(issuerName, 50, 45, { align: "center" });

  // Title
  doc
    .fontSize(32)
    .fillColor(primaryColor)
    .text("Certificate of Completion", 50, 75, { align: "center" });

  // Decorative line
  doc
    .moveTo(250, 120)
    .lineTo(592, 120)
    .strokeColor(accentColor)
    .lineWidth(2)
    .stroke();

  // "This certifies that"
  doc
    .fontSize(13)
    .fillColor("#505A5F")
    .text("This certifies that", 50, 140, { align: "center" });

  // Recipient name
  doc
    .fontSize(26)
    .fillColor(primaryColor)
    .text(cert.recipientName || cert.recipientEmail, 50, 165, {
      align: "center",
    });

  // "has successfully completed"
  doc
    .fontSize(13)
    .fillColor("#505A5F")
    .text("has successfully completed", 50, 205, { align: "center" });

  // Activity title
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .text(cert.title, 50, 230, { align: "center" });

  // Details box
  doc.rect(150, 270, 542, 90).fillColor("#F8F8F8").fill();

  doc.fontSize(10).fillColor("#505A5F");
  const detailY = 280;
  doc.text(`Hours: ${cert.hours}`, 170, detailY);
  if (cert.category) {
    doc.text(`Category: ${cert.category}`, 170, detailY + 15);
  }
  if (cert.credentialName) {
    doc.text(`Credential: ${cert.credentialName}`, 170, detailY + 30);
  }
  if (cert.provider) {
    doc.text(`Provider: ${cert.provider}`, 170, detailY + 45);
  }

  doc.text(
    `Completed: ${new Date(cert.completedDate).toLocaleDateString("en-GB")}`,
    450,
    detailY
  );
  doc.text(
    `Issued: ${new Date(cert.issuedDate).toLocaleDateString("en-GB")}`,
    450,
    detailY + 15
  );
  if (cert.quizScore !== null) {
    doc.text(`Assessment Score: ${cert.quizScore}%`, 450, detailY + 30);
  }

  // QR Code
  try {
    const qrBuffer = await QRCode.toBuffer(cert.verificationUrl, {
      width: 80,
      margin: 1,
      color: { dark: "#1B2A4A", light: "#FFFFFF" },
    });
    doc.image(qrBuffer, 380, 380, { width: 80, height: 80 });
  } catch {
    // Fallback: just print the URL if QR generation fails
    doc
      .fontSize(7)
      .fillColor("#6F777B")
      .text(cert.verificationUrl, 350, 400, { align: "center", width: 140 });
  }

  // Certificate code
  doc
    .fontSize(9)
    .fillColor("#6F777B")
    .text(`Certificate ID: ${cert.certificateCode}`, 50, 470, {
      align: "center",
    });

  // Verification URL text
  doc
    .fontSize(8)
    .fillColor(accentColor)
    .text(`Verify: ${cert.verificationUrl}`, 50, 485, { align: "center" });

  // Footer
  doc
    .fontSize(8)
    .fillColor("#6F777B")
    .text(
      `This certificate was issued by ${issuerName}. Verify authenticity using the QR code or URL above.`,
      50,
      520,
      { align: "center" }
    );

  doc.end();
  return doc;
}
