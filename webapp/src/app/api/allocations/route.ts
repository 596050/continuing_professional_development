import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/allocations?cpdRecordId=xxx - get allocations for a CPD record
// GET /api/allocations?userCredentialId=xxx - get allocations for a user credential
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cpdRecordId = searchParams.get("cpdRecordId");
    const userCredentialId = searchParams.get("userCredentialId");

    if (!cpdRecordId && !userCredentialId) {
      return NextResponse.json(
        { error: "cpdRecordId or userCredentialId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {};
    if (cpdRecordId) where.cpdRecordId = cpdRecordId;
    if (userCredentialId) where.userCredentialId = userCredentialId;

    const allocations = await prisma.cpdAllocation.findMany({
      where,
      include: {
        cpdRecord: { select: { id: true, title: true, hours: true, userId: true } },
        userCredential: {
          select: {
            id: true,
            userId: true,
            credential: { select: { name: true, body: true } },
          },
        },
      },
    });

    // Verify all returned allocations belong to the authenticated user
    const filtered = allocations.filter(
      (a) => a.cpdRecord.userId === session.user!.id
    );

    return NextResponse.json({
      allocations: filtered.map((a) => ({
        id: a.id,
        cpdRecordId: a.cpdRecordId,
        userCredentialId: a.userCredentialId,
        hours: a.hours,
        recordTitle: a.cpdRecord.title,
        recordHours: a.cpdRecord.hours,
        credentialName: a.userCredential.credential.name,
        credentialBody: a.userCredential.credential.body,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/allocations - set allocations for a CPD record
// Body: { cpdRecordId, allocations: [{ userCredentialId, hours }] }
// Replaces all existing allocations for the record.
// Validates: sum of allocated hours <= record.hours
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.cpdRecordId || !Array.isArray(body.allocations)) {
      return NextResponse.json(
        { error: "cpdRecordId and allocations array are required" },
        { status: 400 }
      );
    }

    // Verify record belongs to user
    const record = await prisma.cpdRecord.findFirst({
      where: { id: body.cpdRecordId, userId: session.user.id },
    });
    if (!record) {
      return NextResponse.json({ error: "CPD record not found" }, { status: 404 });
    }

    // Validate allocations
    let totalAllocated = 0;
    for (const alloc of body.allocations) {
      if (!alloc.userCredentialId || typeof alloc.hours !== "number") {
        return NextResponse.json(
          { error: "Each allocation must have userCredentialId and hours" },
          { status: 400 }
        );
      }
      if (alloc.hours <= 0) {
        return NextResponse.json(
          { error: "Allocated hours must be positive" },
          { status: 400 }
        );
      }
      totalAllocated += alloc.hours;
    }

    // Validate: sum of allocations <= record hours
    if (totalAllocated > record.hours) {
      return NextResponse.json(
        {
          error: `Total allocated hours (${totalAllocated}) exceeds record hours (${record.hours})`,
        },
        { status: 400 }
      );
    }

    // Verify all user credentials belong to the user
    const userCredentialIds = body.allocations.map((a: { userCredentialId: string }) => a.userCredentialId);
    const userCredentials = await prisma.userCredential.findMany({
      where: {
        id: { in: userCredentialIds },
        userId: session.user.id,
      },
    });
    if (userCredentials.length !== userCredentialIds.length) {
      return NextResponse.json(
        { error: "One or more user credentials not found" },
        { status: 404 }
      );
    }

    // Check for duplicate credential allocations
    const uniqueIds = new Set(userCredentialIds);
    if (uniqueIds.size !== userCredentialIds.length) {
      return NextResponse.json(
        { error: "Duplicate credential allocations not allowed" },
        { status: 400 }
      );
    }

    // Delete existing allocations and create new ones
    await prisma.cpdAllocation.deleteMany({
      where: { cpdRecordId: body.cpdRecordId },
    });

    const created = [];
    for (const alloc of body.allocations) {
      const allocation = await prisma.cpdAllocation.create({
        data: {
          cpdRecordId: body.cpdRecordId,
          userCredentialId: alloc.userCredentialId,
          hours: alloc.hours,
        },
      });
      created.push(allocation);
    }

    return NextResponse.json({
      allocations: created.map((a) => ({
        id: a.id,
        cpdRecordId: a.cpdRecordId,
        userCredentialId: a.userCredentialId,
        hours: a.hours,
      })),
      totalAllocated,
      recordHours: record.hours,
      unallocated: record.hours - totalAllocated,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
