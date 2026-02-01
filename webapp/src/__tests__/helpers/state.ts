/**
 * State-Setting Test Helpers
 *
 * These functions create users in various progression states for E2E
 * testing and manual QA. Each builds on the previous state, forming
 * a directed graph of user lifecycle stages:
 *
 *   1. createSignedUpUser       - Account exists, nothing else
 *   2. createOnboardedUser      - Completed wizard, credential linked
 *   3. createUserWithCpdRecords - Has 6 realistic CPD activity records
 *   4. createUserWithEvidence   - Has PDF evidence files for 3 records
 *   5. createUserWithReminders  - Has deadline + progress reminders
 *   6. createUserWithQuizPass   - Has quiz with a passing attempt
 *   7. createUserWithCertificate- Has an issued certificate
 *   8. createPublishedActivity  - Published activity with 3 credit mappings
 *   9. createAdminUser          - Platform admin (role=admin)
 *  10. createFirmAdminUser      - Firm admin with associated Firm entity
 *  11. createMultiCredentialUser- Holds CFP (US) + FCA Adviser (GB)
 *  12. createUserApproachingDeadline - Renewal within 25 days
 *  13. createUserPastDeadline   - Renewal date in the past
 *  14. createUserAtFullCompletion - Met all CFP hour requirements (30h)
 *  15. createUserWithQuizExhausted - Failed all allowed quiz attempts
 *
 * Each helper returns all created entities so tests can assert on
 * exact values without re-querying. All test users use @e2e.local
 * email addresses for easy cleanup.
 *
 * Cleanup order matters due to foreign key constraints:
 *   certificates -> quiz attempts -> reminders -> evidence ->
 *   completion rules -> CPD records -> user credentials ->
 *   onboarding submissions -> user
 */

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

// Use a subclass that overrides createClient with the newer @libsql/client (0.17.0)
// to avoid SQLITE_IOERR_SHORT_READ in multi-process scenarios.
class TestPrismaLibSql extends (PrismaLibSql as unknown as { new(config: { url: string }): { connect(): Promise<unknown>; connectToShadowDb(): Promise<unknown>; createClient(config: { url: string }): unknown } }) {
  createClient(config: { url: string }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as { createClient: (c: { url: string }) => unknown };
    return createClient(config);
  }
}

const adapter = new TestPrismaLibSql({ url: "file:dev.db" }) as unknown as PrismaLibSql;
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
        status: ("status" in r ? r.status : undefined) ?? "completed",
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
// State 6: User with a quiz and passing attempt
// ------------------------------------------------------------------
export async function createUserWithQuizPass(overrides?: {
  passMark?: number;
  score?: number;
  hours?: number;
}) {
  const withRecords = await createUserWithCpdRecords();

  const quiz = await prisma.quiz.create({
    data: {
      title: "Ethics in Financial Planning Assessment",
      description: "Test your knowledge of ethics requirements.",
      passMark: overrides?.passMark ?? 70,
      maxAttempts: 3,
      hours: overrides?.hours ?? 1,
      category: "ethics",
      activityType: "structured",
      questionsJson: JSON.stringify([
        {
          question: "What is the primary purpose of CPD?",
          options: [
            "To meet regulatory requirements",
            "To maintain and enhance professional competence",
            "To earn certificates",
            "To satisfy employers",
          ],
          correctIndex: 1,
          explanation: "CPD ensures ongoing professional competence.",
        },
        {
          question: "How often must CFP professionals complete ethics CE?",
          options: ["Annually", "Every 2 years", "Every 5 years", "Never"],
          correctIndex: 1,
          explanation: "CFP ethics CE is required every 2-year cycle.",
        },
        {
          question: "Which is a structured CPD activity?",
          options: [
            "Reading a trade magazine",
            "Attending an accredited course",
            "Chatting with colleagues",
            "Browsing the internet",
          ],
          correctIndex: 1,
        },
      ]),
    },
  });

  const score = overrides?.score ?? 100;
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: withRecords.user.id,
      quizId: quiz.id,
      answers: JSON.stringify([1, 1, 1]),
      score,
      passed: score >= (overrides?.passMark ?? 70),
      completedAt: new Date(),
    },
  });

  return { ...withRecords, quiz, attempt };
}

// ------------------------------------------------------------------
// State 7: User with a certificate
// ------------------------------------------------------------------
export async function createUserWithCertificate() {
  const withRecords = await createUserWithCpdRecords();

  const certificate = await prisma.certificate.create({
    data: {
      userId: withRecords.user.id,
      certificateCode: `CERT-TEST-${uid()}`,
      title: "Ethics in Financial Planning",
      credentialName: "CFP",
      hours: 2,
      category: "ethics",
      activityType: "structured",
      provider: "CFP Board",
      completedDate: new Date("2026-01-15"),
      verificationUrl: `http://localhost:3000/api/certificates/verify/CERT-TEST-${uid()}`,
      cpdRecordId: withRecords.records[0].id,
    },
  });

  return { ...withRecords, certificate };
}

// ------------------------------------------------------------------
// State 8: Published activity with credit mappings
// ------------------------------------------------------------------
export async function createPublishedActivity(overrides?: {
  type?: string;
  title?: string;
  jurisdictions?: string[];
}) {
  const activity = await prisma.activity.create({
    data: {
      type: overrides?.type ?? "on_demand_video",
      title: overrides?.title ?? "Ethics in Financial Planning Webinar",
      description: "A comprehensive overview of ethics requirements for financial advisers.",
      presenters: JSON.stringify(["Jane Smith", "John Doe"]),
      durationMinutes: 60,
      learningObjectives: JSON.stringify([
        "Understand key ethics obligations",
        "Identify common ethical dilemmas",
        "Apply ethical frameworks to case studies",
      ]),
      tags: JSON.stringify(["ethics", "compliance", "financial-planning"]),
      jurisdictions: JSON.stringify(overrides?.jurisdictions ?? ["US", "GB", "AU"]),
      publishStatus: "published",
      publishedAt: new Date(),
    },
  });

  // Add credit mappings for multiple jurisdictions
  const mappings = [];
  mappings.push(
    await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 1,
        creditCategory: "ethics",
        structuredFlag: "true",
        country: "US",
        validationMethod: "quiz",
      },
    })
  );
  mappings.push(
    await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 1,
        creditCategory: "ethics",
        structuredFlag: "true",
        country: "GB",
        validationMethod: "attendance",
      },
    })
  );
  mappings.push(
    await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 1,
        creditCategory: "ethics",
        structuredFlag: "true",
        country: "AU",
        validationMethod: "quiz",
      },
    })
  );

  return { activity, creditMappings: mappings };
}

// ------------------------------------------------------------------
// State 9: Admin user (role=admin, can manage activities/quizzes)
// ------------------------------------------------------------------
export async function createAdminUser(overrides?: {
  credentialName?: string;
}) {
  const onboarded = await createOnboardedUser({
    credentialName: overrides?.credentialName,
  });

  // Promote to admin
  const adminUser = await prisma.user.update({
    where: { id: onboarded.user.id },
    data: { role: "admin" },
  });

  return { ...onboarded, user: adminUser };
}

// ------------------------------------------------------------------
// State 10: Firm admin (role=firm_admin, firmId set, tenant-scoped)
// ------------------------------------------------------------------
export async function createFirmAdminUser(overrides?: {
  firmName?: string;
}) {
  const onboarded = await createOnboardedUser();
  const firmSlug = `test-firm-${uid()}`;

  const firm = await prisma.firm.create({
    data: {
      name: overrides?.firmName ?? `Test Firm ${firmSlug}`,
      slug: firmSlug,
      plan: "firm",
      seatsLimit: 50,
      active: true,
    },
  });

  const firmAdmin = await prisma.user.update({
    where: { id: onboarded.user.id },
    data: { role: "firm_admin", firmId: firm.id },
  });

  return { ...onboarded, user: firmAdmin, firm };
}

// ------------------------------------------------------------------
// State 11: Multi-credential user (holds two credentials from
//           different jurisdictions, enabling cross-region tests)
// ------------------------------------------------------------------
export async function createMultiCredentialUser() {
  const onboarded = await createOnboardedUser({
    credentialName: "CFP",
    jurisdiction: "US",
  });

  const fca = await prisma.credential.findUnique({
    where: { name: "FCA Adviser" },
  });
  if (!fca) throw new Error("FCA Adviser not found. Run seed first.");

  const secondCredential = await prisma.userCredential.create({
    data: {
      userId: onboarded.user.id,
      credentialId: fca.id,
      jurisdiction: "GB",
      renewalDeadline: new Date("2027-01-01"),
      hoursCompleted: 5,
      isPrimary: false,
    },
  });

  return { ...onboarded, secondCredential, fcaCredential: fca };
}

// ------------------------------------------------------------------
// State 12: User approaching deadline (renewal within 30 days)
// ------------------------------------------------------------------
export async function createUserApproachingDeadline() {
  const daysFromNow = 25;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysFromNow);

  const onboarded = await createOnboardedUser({
    renewalDeadline: deadline.toISOString().split("T")[0],
    hoursCompleted: 5,
  });

  return { ...onboarded, daysUntilDeadline: daysFromNow };
}

// ------------------------------------------------------------------
// State 13: User past deadline (renewal date in the past)
// ------------------------------------------------------------------
export async function createUserPastDeadline() {
  const deadline = new Date("2025-12-31");

  const onboarded = await createOnboardedUser({
    renewalDeadline: "2025-12-31",
    hoursCompleted: 5,
  });

  return { ...onboarded, deadline };
}

// ------------------------------------------------------------------
// State 14: User at 100% completion (met all hour requirements)
// ------------------------------------------------------------------
export async function createUserAtFullCompletion() {
  // CFP requires 30h total, 2h ethics
  const onboarded = await createOnboardedUser({
    credentialName: "CFP",
    hoursCompleted: 0,
  });

  // Create records totaling exactly 30h with 2h ethics
  const records = [];
  records.push(
    await prisma.cpdRecord.create({
      data: {
        userId: onboarded.user.id,
        title: "Ethics Masterclass",
        activityType: "structured",
        hours: 2,
        date: new Date("2026-01-15"),
        status: "completed",
        category: "ethics",
        source: "manual",
      },
    })
  );
  records.push(
    await prisma.cpdRecord.create({
      data: {
        userId: onboarded.user.id,
        title: "Comprehensive Financial Planning",
        activityType: "structured",
        hours: 28,
        date: new Date("2026-02-01"),
        status: "completed",
        category: "general",
        source: "manual",
      },
    })
  );

  return { ...onboarded, records };
}

// ------------------------------------------------------------------
// State 15: User with quiz failure (exhausted all attempts)
// ------------------------------------------------------------------
export async function createUserWithQuizExhausted() {
  const withRecords = await createUserWithCpdRecords();

  const quiz = await prisma.quiz.create({
    data: {
      title: "Hard Ethics Assessment",
      passMark: 80,
      maxAttempts: 2,
      hours: 1,
      category: "ethics",
      questionsJson: JSON.stringify([
        {
          question: "Q1?",
          options: ["A", "B", "C", "D"],
          correctIndex: 2,
        },
        {
          question: "Q2?",
          options: ["A", "B"],
          correctIndex: 0,
        },
      ]),
    },
  });

  // Create 2 failing attempts (maxAttempts = 2)
  const attempts = [];
  for (let i = 0; i < 2; i++) {
    attempts.push(
      await prisma.quizAttempt.create({
        data: {
          userId: withRecords.user.id,
          quizId: quiz.id,
          answers: JSON.stringify([0, 1]),
          score: 50,
          passed: false,
          completedAt: new Date(),
        },
      })
    );
  }

  return { ...withRecords, quiz, attempts };
}

// ------------------------------------------------------------------
// Cleanup: remove test firms
// ------------------------------------------------------------------
export async function cleanupTestFirms() {
  const testFirms = await prisma.firm.findMany({
    where: { slug: { contains: "test-firm" } },
    select: { id: true },
  });
  for (const f of testFirms) {
    // Clean up firm compliance data before deleting
    await prisma.firmAlert.deleteMany({ where: { firmId: f.id } });
    await prisma.firmComplianceSnapshot.deleteMany({ where: { firmId: f.id } });
    // Unlink users from firm before deleting
    await prisma.user.updateMany({
      where: { firmId: f.id },
      data: { firmId: null },
    });
    await prisma.firm.delete({ where: { id: f.id } });
  }
}

// ------------------------------------------------------------------
// Cleanup: remove test activities
// ------------------------------------------------------------------
export async function cleanupTestActivities() {
  const testActivities = await prisma.activity.findMany({
    where: { title: { contains: "Test" } },
    select: { id: true },
  });
  for (const a of testActivities) {
    await prisma.creditMapping.deleteMany({ where: { activityId: a.id } });
    await prisma.activity.delete({ where: { id: a.id } });
  }
  // Also clean up activities created by test helpers
  const helperActivities = await prisma.activity.findMany({
    where: { title: { contains: "Webinar" } },
    select: { id: true },
  });
  for (const a of helperActivities) {
    await prisma.creditMapping.deleteMany({ where: { activityId: a.id } });
    await prisma.activity.delete({ where: { id: a.id } });
  }
}

// ------------------------------------------------------------------
// Cleanup: remove all test data for a user
// ------------------------------------------------------------------
export async function cleanupUser(userId: string) {
  await prisma.firmAlert.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.certificate.deleteMany({ where: { userId } });
  await prisma.quizAttempt.deleteMany({ where: { userId } });
  await prisma.reminder.deleteMany({ where: { userId } });
  await prisma.evidence.deleteMany({ where: { userId } });
  await prisma.externalTranscriptImport.deleteMany({ where: { userId } });
  await prisma.ingestionAddress.deleteMany({ where: { userId } });
  await prisma.completionEvent.deleteMany({ where: { userId } });
  await prisma.cpdRecord.deleteMany({ where: { userId, source: "auto" } });
  // Remove allocations linked to user's CPD records
  const userRecords = await prisma.cpdRecord.findMany({
    where: { userId },
    select: { id: true },
  });
  if (userRecords.length > 0) {
    await prisma.cpdAllocation.deleteMany({
      where: { cpdRecordId: { in: userRecords.map((r) => r.id) } },
    });
    await prisma.completionRule.deleteMany({
      where: { cpdRecordId: { in: userRecords.map((r) => r.id) } },
    });
  }
  await prisma.cpdRecord.deleteMany({ where: { userId } });
  // Remove allocations linked to user's credentials
  const userCreds = await prisma.userCredential.findMany({
    where: { userId },
    select: { id: true },
  });
  if (userCreds.length > 0) {
    await prisma.cpdAllocation.deleteMany({
      where: { userCredentialId: { in: userCreds.map((c) => c.id) } },
    });
  }
  await prisma.userCredential.deleteMany({ where: { userId } });
  await prisma.onboardingSubmission.deleteMany({ where: { userId } });
  // Unlink from firm before deleting user
  await prisma.user.update({
    where: { id: userId },
    data: { firmId: null },
  });
  await prisma.user.delete({ where: { id: userId } });
}

// ------------------------------------------------------------------
// Cleanup: remove test quizzes
// ------------------------------------------------------------------
export async function cleanupTestQuizzes() {
  // Delete attempts first, then quizzes with test titles
  const testQuizzes = await prisma.quiz.findMany({
    where: { title: { contains: "Assessment" } },
    select: { id: true },
  });
  for (const q of testQuizzes) {
    await prisma.quizAttempt.deleteMany({ where: { quizId: q.id } });
    await prisma.quiz.delete({ where: { id: q.id } });
  }
}

// ------------------------------------------------------------------
// State 16: User with inbox evidence (unassigned evidence items)
// ------------------------------------------------------------------
export async function createUserWithInboxEvidence() {
  const withRecords = await createUserWithCpdRecords();

  const inboxEvidence = [];
  inboxEvidence.push(
    await prisma.evidence.create({
      data: {
        userId: withRecords.user.id,
        fileName: "cpd_certificate_ethics.pdf",
        fileType: "pdf",
        fileSize: 52000,
        storageKey: `uploads/${withRecords.user.id}/inbox_cert.pdf`,
        kind: "certificate",
        status: "inbox",
        extractedMetadata: JSON.stringify({
          title: "Ethics Training Certificate",
          hours: 2,
          provider: "CFP Board",
          date: "2026-03-15",
        }),
      },
    })
  );
  inboxEvidence.push(
    await prisma.evidence.create({
      data: {
        userId: withRecords.user.id,
        fileName: "webinar_transcript.pdf",
        fileType: "pdf",
        fileSize: 31000,
        storageKey: `uploads/${withRecords.user.id}/inbox_transcript.pdf`,
        kind: "transcript",
        status: "inbox",
      },
    })
  );
  inboxEvidence.push(
    await prisma.evidence.create({
      data: {
        userId: withRecords.user.id,
        cpdRecordId: withRecords.records[0].id,
        fileName: "assigned_doc.pdf",
        fileType: "pdf",
        fileSize: 20000,
        storageKey: `uploads/${withRecords.user.id}/assigned.pdf`,
        kind: "other",
        status: "assigned",
      },
    })
  );

  return { ...withRecords, inboxEvidence };
}

// ------------------------------------------------------------------
// Cleanup: remove test rule packs
// ------------------------------------------------------------------
export async function cleanupTestRulePacks() {
  await prisma.credentialRulePack.deleteMany({
    where: { name: { contains: "Test" } },
  });
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
  await cleanupTestQuizzes();
  await cleanupTestFirms();
}
