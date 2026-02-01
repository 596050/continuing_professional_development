import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/ingest/email - webhook endpoint for inbound email provider
// Receives forwarded emails and extracts attachments into Evidence Inbox
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expected payload from email provider (SendGrid, Mailgun, etc.)
    const {
      to,           // recipient address (our ingestion address)
      from,         // sender email
      subject,      // email subject
      attachments,  // array of { filename, content_type, data (base64) }
    } = body;

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
    }

    // Find the ingestion address to identify the user
    const toAddress = Array.isArray(to) ? to[0] : to;
    const ingestion = await prisma.ingestionAddress.findUnique({
      where: { address: toAddress.toLowerCase() },
    });

    if (!ingestion || !ingestion.active) {
      return NextResponse.json({ error: "Unknown ingestion address" }, { status: 404 });
    }

    const userId = ingestion.userId;
    const createdEvidence = [];

    // Process attachments
    const attachmentList = Array.isArray(attachments) ? attachments : [];
    for (const attachment of attachmentList) {
      const { filename, content_type, data } = attachment;
      if (!filename || !data) continue;

      // Determine file type
      let fileType = "pdf";
      if (content_type?.startsWith("image/")) fileType = "image";
      else if (content_type === "text/plain") fileType = "text";

      // Determine kind from filename/content_type
      let kind = "other";
      const lowerName = (filename as string).toLowerCase();
      if (lowerName.includes("certificate") || lowerName.includes("cert")) kind = "certificate";
      else if (lowerName.includes("transcript")) kind = "transcript";
      else if (lowerName.includes("agenda")) kind = "agenda";

      // Decode and save file
      const fileBuffer = Buffer.from(data, "base64");
      const storageKey = `uploads/${userId}/email_${Date.now()}_${filename}`;
      const fs = await import("fs/promises");
      const path = await import("path");
      const dir = path.dirname(storageKey);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(storageKey, fileBuffer);

      // Create evidence record
      const evidence = await prisma.evidence.create({
        data: {
          userId,
          fileName: filename,
          fileType,
          fileSize: fileBuffer.length,
          storageKey,
          kind,
          status: "inbox",
          metadata: JSON.stringify({
            source: "email_forward",
            senderEmail: from,
            subject,
            receivedAt: new Date().toISOString(),
          }),
        },
      });

      createdEvidence.push(evidence);
    }

    // If no attachments but email body could be useful, create a text evidence
    if (attachmentList.length === 0 && subject) {
      const evidence = await prisma.evidence.create({
        data: {
          userId,
          fileName: `email_${Date.now()}.txt`,
          fileType: "text",
          fileSize: 0,
          storageKey: `uploads/${userId}/email_${Date.now()}.txt`,
          kind: "other",
          status: "inbox",
          metadata: JSON.stringify({
            source: "email_forward",
            senderEmail: from,
            subject,
            receivedAt: new Date().toISOString(),
            note: "No attachments found in forwarded email",
          }),
        },
      });
      createdEvidence.push(evidence);
    }

    return NextResponse.json({
      processed: true,
      evidenceCount: createdEvidence.length,
      evidenceIds: createdEvidence.map((e) => e.id),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
