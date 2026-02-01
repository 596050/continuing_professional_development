/**
 * State-Setting Test Helpers
 *
 * These functions create users in various states for E2E testing
 * and manual QA. Each returns the created entities for assertions.
 *
 * Usage in tests:
 *   const { user } = await createSignedUpUser();
 *   const { user, submission, userCredential } = await createOnboardedUser();
 *   const { user, records } = await createUserWithCpdRecords();
 *   const { user, evidence } = await createUserWithEvidence();
 */

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: "file:dev.db" });
export const prisma = new PrismaClient({ adapter });

// Unique suffix to avoid collisions between test runs
let counter = 0;
function uid() {
  return `${Date.now()}-${++counter}`;
}

// ------------------------------------------------------------------
// State 1: Fresh signup (user exists, no onboarding, no credentials)
// ------------------------------------------------------------------
export async function createSignedUpUser(overrides?: {
  name?: string;
  email?: string;
  password?: string;
}) {
  const id = uid();
  const password = overrides?.password ?? "TestPass123!";
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  const user = await prisma.user.create({
    data: {
      name: overrides?.name ?? `Test User ${id}`,
      email: overrides?.email ?? `test-${id}@e2e.local`,
      passwordHash,
    },
  });

  return { user, password };
}

// ------------------------------------------------------------------
// State 2: Onboarded user (completed wizard, has credential linked)
// ------------------------------------------------------------------
export async function createOnboardedUser(overrides?: {
  credentialName?: string;
  jurisdiction?: string;
  hoursCompleted?: number;
  renewalDeadline?: string;
}) {
  const { user, password } = await createSignedUpUser();

  const credName = overrides?.credentialName ?? "CFP";
  const credential = await prisma.credential.findUnique({
    where: { name: credName },
  });
  if (!credential)
    throw new Error(`Credential "${credName}" not found. Run seed first.`);

  const submission = await prisma.onboardingSubmission.create({
    data: {
      userId: user.id,
      fullName: user.name ?? "Onboarded User",
      email: user.email,
      role: "Independent financial adviser / planner",
      primaryCredential: credName,
      jurisdiction: overrides?.jurisdiction ?? "US",
      renewalDeadline: overrides?.renewalDeadline ?? "2027-03-31",
      currentHoursCompleted: String(overrides?.hoursCompleted ?? 10),
      status: "complete",
    },
  });

  const userCredential = await prisma.userCredential.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      jurisdiction: overrides?.jurisdiction ?? "US",
      renewalDeadline: overrides?.renewalDeadline
        ? new Date(overrides.renewalDeadline)
        : new Date("2027-03-31"),
      hoursCompleted: overrides?.hoursCompleted ?? 10,
      isPrimary: true,
    },
  });

  return { user, password, credential, submission, userCredential };
}

// ------------------------------------------------------------------
// State 3: User with CPD records logged
// ------------------------------------------------------------------
export async function createUserWithCpdRecords(overrides?: {
  credentialName?: string;
  records?: Array<{
    title: string;
    hours: number;
    category: string;
    activityType: string;
    provider?: string;
    date?: string;
    status?: string;
  }>;
}) {
  const onboarded = await createOnboardedUser({
    credentialName: overrides?.credentialName,
  });

  const defaultRecords = [
    {
      title: "Ethics in Financial Planning",
      hours: 2,
      category: "ethics",
      activityType: "structured",
      provider: "CFP Board",
      date: "2026-01-15",
    },
    {
      title: "Tax Year-End Planning Strategies",
      hours: 3,
      category: "general",
      activityType: "structured",
      provider: "Kitces.com",
      date: "2026-01-22",
    },
    {
      title: "Client Communication & Vulnerability",
      hours: 1.5,
      category: "general",
      activityType: "structured",
      provider: "AuditReadyCPD",
      date: "2026-02-03",
    },
    {
      title: "Retirement Income Decumulation",
      hours: 2,
      category: "general",
      activityType: "structured",
      provider: "Morningstar",
      date: "2026-02-10",
    },
    {
      title: "Regulatory Update: 40-Hour CE Changes",
      hours: 1.5,
      category: "general",
      activityType: "structured",
      provider: "AuditReadyCPD",
      date: "2026-02-18",
    },
    {
      title: "Estate Planning Fundamentals",
      hours: 4,
      category: "general",
      activityType: "structured",
      provider: "CFP Board",
      date: "2026-03-01",
    },
  ];

  const recordDefs = overrides?.records ?? defaultRecords;
  const records = [];
  for (const r of recordDefs) {
    const record = await prisma.cpdRecord.create({
      data: {
        userId: onboarded.user.id,
        title: r.title,
        provider: r.provider ?? null,
        activityType: r.activityType,
        hours: r.hours,
        date: new Date(r.date ?? "2026-01-15"),
        status: r.status ?? "completed",
        category: r.category,
        source: "manual",
      },
    });
    records.push(record);
  }

  return { ...onboarded, records };
}

// ------------------------------------------------------------------
// State 4: User with evidence files uploaded
// ------------------------------------------------------------------
export async function createUserWithEvidence() {
  const withRecords = await createUserWithCpdRecords();

  const evidenceItems = [];
  for (const record of withRecords.records.slice(0, 3)) {
    const evidence = await prisma.evidence.create({
      data: {
        userId: withRecords.user.id,
        cpdRecordId: record.id,
        fileName: `certificate_${record.title.replace(/\s+/g, "_").toLowerCase()}.pdf`,
        fileType: "pdf",
        fileSize: 45000 + Math.floor(Math.random() * 10000),
        storageKey: `uploads/${withRecords.user.id}/${record.id}.pdf`,
        metadata: JSON.stringify({
          date: record.date.toISOString(),
          hours: record.hours,
          provider: record.provider,
          learningOutcome: record.title,
        }),
      },
    });
    evidenceItems.push(evidence);
  }

  return { ...withRecords, evidence: evidenceItems };
}

// ------------------------------------------------------------------
// State 5: User with reminders configured
// ------------------------------------------------------------------
export async function createUserWithReminders() {
  const withRecords = await createUserWithCpdRecords();

  const reminders = [];

  // Deadline reminder
  reminders.push(
    await prisma.reminder.create({
      data: {
        userId: withRecords.user.id,
        type: "deadline",
        title: "CFP cycle renewal deadline",
        message:
          "Your CFP CE cycle ends on 31 March 2027. You have 11.5 hours remaining.",
        triggerDate: new Date("2027-03-01"),
        channel: "both",
        credentialId: withRecords.credential.id,
      },
    })
  );

  // Progress nudge
  reminders.push(
    await prisma.reminder.create({
      data: {
        userId: withRecords.user.id,
        type: "progress",
        title: "Monthly CPD progress check",
        message:
          "You have completed 62% of your CFP CE hours. Keep going!",
        triggerDate: new Date("2026-03-01"),
        channel: "email",
      },
    })
  );

  return { ...withRecords, reminders };
}

// ------------------------------------------------------------------
// Cleanup: remove all test data for a user
// ------------------------------------------------------------------
export async function cleanupUser(userId: string) {
  await prisma.reminder.deleteMany({ where: { userId } });
  await prisma.evidence.deleteMany({ where: { userId } });
  await prisma.cpdRecord.deleteMany({ where: { userId } });
  await prisma.userCredential.deleteMany({ where: { userId } });
  await prisma.onboardingSubmission.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

// ------------------------------------------------------------------
// Cleanup: remove all test users (by email pattern)
// ------------------------------------------------------------------
export async function cleanupAllTestUsers() {
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: "@e2e.local" } },
    select: { id: true },
  });
  for (const u of testUsers) {
    await cleanupUser(u.id);
  }
}
