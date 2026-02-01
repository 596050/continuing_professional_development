import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/certificates/export - Export certificates as CSV
export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id, status: "active" },
    orderBy: { issuedDate: "desc" },
  });

  const header = [
    "Certificate Code",
    "Title",
    "Hours",
    "Category",
    "Credential",
    "Provider",
    "Completed Date",
    "Issued Date",
    "Verification URL",
    "Status",
  ].join(",");

  const rows = certificates.map((cert) => {
    return [
      cert.certificateCode,
      `"${cert.title.replace(/"/g, '""')}"`,
      String(cert.hours),
      cert.category ?? "",
      cert.credentialName ?? "",
      `"${(cert.provider ?? "").replace(/"/g, '""')}"`,
      new Date(cert.completedDate).toISOString().slice(0, 10),
      new Date(cert.issuedDate).toISOString().slice(0, 10),
      cert.verificationUrl,
      cert.status,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="certificates_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
