import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/ingest/address - get or create the user's unique ingestion email
export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    let ingestion = await prisma.ingestionAddress.findUnique({
      where: { userId: session.user.id },
    });

    if (!ingestion) {
      // Generate a unique address
      const slug = session.user.id.slice(0, 12).toLowerCase();
      const address = `cpd-${slug}@ingest.auditreadycpd.com`;

      ingestion = await prisma.ingestionAddress.create({
        data: {
          userId: session.user.id,
          address,
          active: true,
        },
      });
    }

    return NextResponse.json({
      address: ingestion.address,
      active: ingestion.active,
      createdAt: ingestion.createdAt,
    });
  } catch (err) {
    return serverError(err);
  }
}
