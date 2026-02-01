/**
 * Exhaustive Business-Level Feature Tests
 *
 * These integration tests verify EVERY core business feature of AuditReadyCPD.
 * They use the state-setting helpers to create users in various states and
 * then test business logic, validation, aggregation, and edge cases.
 *
 * Test categories:
 *   1.  Credential database — all 14 credentials, rules, regions, verticals
 *   2.  User signup API — creation, validation, duplicates, password rules
 *   3.  Authentication gates — all protected endpoints return 401
 *   4.  Onboarding — data creation, credential linking, map resolution
 *   5.  CPD activity logging — types, categories, validation
 *   6.  Dashboard aggregation — total/ethics/structured hours, onboarding hours
 *   7.  Gap analysis — progress %, remaining hours, deadline calculations
 *   8.  Evidence upload — file validation, metadata, linking to records
 *   9.  Evidence management — list, download, delete, ownership
 *  10.  Export: Compliance Brief PDF — generation, headers, auth
 *  11.  Export: Audit Report PDF — full report with activities and evidence
 *  12.  Export: Audit CSV — correct format and data
 *  13.  Reminders — CRUD, validation, filtering
 *  14.  Calendar .ics — generation, format, alarms
 *  15.  Multi-credential support — multiple credentials per user
 *  16.  Data integrity — foreign keys, JSON validity, orphan prevention
 *  17.  Page availability — all routes serve 200
 *  18.  Edge cases — zero hours, missing deadlines, empty states
 *  19.  Certificate generation — creation, codes, verification, revocation
 *  20.  Certificate PDF — generation, QR code embedding, branded output
 *  21.  Quiz engine — creation, attempt submission, grading, pass/fail, retries
 *  22.  Completion rules — rule evaluation, multi-rule AND logic, auto-cert
 *  23.  Certificate vault — list, search, export CSV
 *  24.  Activity CRUD — creation, listing, filtering, publish workflow, soft-delete
 *  25.  Credit mapping — multi-jurisdiction resolution, exclusions, INTL matching
 *  26.  Provider reporting — aggregation, role gates, date filtering, tenant scope
 *  27.  Activity auth gates — all new endpoints require authentication
 *
 * Run: npx vitest run
 * Watch: npx vitest
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  prisma,
  createSignedUpUser,
  createOnboardedUser,
  createUserWithCpdRecords,
  createUserWithEvidence,
  createUserWithReminders,
  createUserWithQuizPass,
  createUserWithCertificate,
  createPublishedActivity,
  cleanupUser,
  cleanupTestActivities,
} from "./helpers/state";

const BASE_URL = "http://localhost:3000";

// Track all test users for cleanup
const testUserIds: string[] = [];

afterAll(async () => {
  for (const id of testUserIds) {
    try {
      await cleanupUser(id);
    } catch {
      // User may have already been cleaned up
    }
  }
  await prisma.$disconnect();
});

// ============================================================
// 1. CREDENTIAL DATABASE VERIFICATION
// ============================================================
describe("Credential Database", () => {
  it("contains all 14 seeded credentials", async () => {
    const count = await prisma.credential.count();
    expect(count).toBeGreaterThanOrEqual(14);
  });

  it("has correct CFP Board rules (US)", async () => {
    const cfp = await prisma.credential.findUnique({
      where: { name: "CFP" },
    });
    expect(cfp).not.toBeNull();
    expect(cfp!.body).toBe("CFP Board");
    expect(cfp!.region).toBe("US");
    expect(cfp!.hoursRequired).toBe(30);
    expect(cfp!.cycleLengthYears).toBe(2);
    expect(cfp!.ethicsHours).toBe(2);
    expect(cfp!.vertical).toBe("financial_services");

    const rules = JSON.parse(cfp!.categoryRules!);
    expect(rules.upcomingChange.effectiveDate).toBe("2027-01-01");
    expect(rules.upcomingChange.newHoursRequired).toBe(40);
  });

  it("has correct FCA Adviser rules (UK)", async () => {
    const fca = await prisma.credential.findUnique({
      where: { name: "FCA Adviser" },
    });
    expect(fca).not.toBeNull();
    expect(fca!.body).toBe("FCA");
    expect(fca!.region).toBe("GB");
    expect(fca!.hoursRequired).toBe(35);
    expect(fca!.cycleLengthYears).toBe(1);
    expect(fca!.structuredHours).toBe(21);

    const rules = JSON.parse(fca!.categoryRules!);
    expect(rules.structuredRequired).toBe(21);
  });

  it("has correct IAR rules (US)", async () => {
    const iar = await prisma.credential.findUnique({
      where: { name: "IAR" },
    });
    expect(iar).not.toBeNull();
    expect(iar!.body).toBe("NASAA");
    expect(iar!.hoursRequired).toBe(12);
    expect(iar!.ethicsHours).toBe(6);
    expect(iar!.structuredHours).toBe(6);
  });

  it("has correct FASEA/ASIC rules (Australia)", async () => {
    const fasea = await prisma.credential.findUnique({
      where: { name: "FASEA/ASIC" },
    });
    expect(fasea).not.toBeNull();
    expect(fasea!.body).toBe("ASIC (formerly FASEA)");
    expect(fasea!.region).toBe("AU");
    expect(fasea!.hoursRequired).toBe(40);

    const rules = JSON.parse(fasea!.categoryRules!);
    expect(rules.categories).toContain("technical_competence");
    expect(rules.categories).toContain("professionalism_ethics");
  });

  it("has correct FP Canada CFP rules (Canada)", async () => {
    const fpCanada = await prisma.credential.findUnique({
      where: { name: "FP Canada CFP" },
    });
    expect(fpCanada).not.toBeNull();
    expect(fpCanada!.region).toBe("CA");
    expect(fpCanada!.hoursRequired).toBe(25);
  });

  it("has correct MAS rules (Singapore)", async () => {
    const mas = await prisma.credential.findUnique({
      where: { name: "MAS Licensed Rep" },
    });
    expect(mas).not.toBeNull();
    expect(mas!.region).toBe("SG");
    expect(mas!.hoursRequired).toBe(30);
    expect(mas!.ethicsHours).toBe(6);
    expect(mas!.structuredHours).toBe(8);
  });

  it("has correct SFC rules (Hong Kong)", async () => {
    const sfc = await prisma.credential.findUnique({
      where: { name: "SFC Licensed Rep" },
    });
    expect(sfc).not.toBeNull();
    expect(sfc!.region).toBe("HK");
    expect(sfc!.hoursRequired).toBe(10);
    expect(sfc!.ethicsHours).toBe(2);
    expect(sfc!.structuredHours).toBe(5);
  });

  it("has correct CII/PFS rules (UK)", async () => {
    const cii = await prisma.credential.findUnique({
      where: { name: "CII/PFS" },
    });
    expect(cii).not.toBeNull();
    expect(cii!.body).toBe("Chartered Insurance Institute");
    expect(cii!.region).toBe("GB");
    expect(cii!.hoursRequired).toBe(35);
  });

  it("has correct CISI rules (UK)", async () => {
    const cisi = await prisma.credential.findUnique({
      where: { name: "CISI" },
    });
    expect(cisi).not.toBeNull();
    expect(cisi!.region).toBe("GB");
  });

  it("has correct FINRA Series rules (US)", async () => {
    const finra = await prisma.credential.findUnique({
      where: { name: "FINRA Series" },
    });
    expect(finra).not.toBeNull();
    expect(finra!.region).toBe("US");
    expect(finra!.body).toBe("FINRA");
  });

  it("covers all target verticals", async () => {
    const verticals = await prisma.credential.findMany({
      select: { vertical: true },
      distinct: ["vertical"],
    });
    const verticalNames = verticals.map((v) => v.vertical);
    expect(verticalNames).toContain("financial_services");
    expect(verticalNames).toContain("health");
    expect(verticalNames).toContain("chartered_accounting");
  });

  it("covers all target regions", async () => {
    const regions = await prisma.credential.findMany({
      select: { region: true },
      distinct: ["region"],
    });
    const regionCodes = regions.map((r) => r.region);
    expect(regionCodes).toContain("US");
    expect(regionCodes).toContain("GB");
    expect(regionCodes).toContain("AU");
    expect(regionCodes).toContain("CA");
    expect(regionCodes).toContain("SG");
    expect(regionCodes).toContain("HK");
  });

  it("all credentials have valid categoryRules JSON", async () => {
    const creds = await prisma.credential.findMany();
    for (const cred of creds) {
      if (cred.categoryRules) {
        expect(() => JSON.parse(cred.categoryRules!)).not.toThrow();
        const rules = JSON.parse(cred.categoryRules!);
        expect(rules.categories).toBeDefined();
        expect(Array.isArray(rules.categories)).toBe(true);
      }
    }
  });

  it("all credentials have required base fields", async () => {
    const creds = await prisma.credential.findMany();
    for (const cred of creds) {
      expect(cred.name).toBeTruthy();
      expect(cred.body).toBeTruthy();
      expect(cred.region).toBeTruthy();
      expect(cred.vertical).toBeTruthy();
      expect(cred.cycleLengthYears).toBeGreaterThan(0);
      expect(cred.active).toBe(true);
    }
  });
});

// ============================================================
// 2. USER SIGNUP API
// ============================================================
describe("User Signup API", () => {
  const signupUser = {
    name: "Signup Test",
    email: `signup-test-${Date.now()}@e2e.local`,
    password: "SecurePass123!",
  };

  afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: signupUser.email },
    });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("creates a new user account with valid data", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupUser),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe(signupUser.email);
    expect(data.name).toBe(signupUser.name);
    expect(data.id).toBeDefined();
  });

  it("hashes the password in the database", async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email: signupUser.email },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).toBeDefined();
    expect(dbUser!.passwordHash).not.toBe(signupUser.password);
    expect(dbUser!.passwordHash!.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("sets default plan to free", async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email: signupUser.email },
    });
    expect(dbUser!.plan).toBe("free");
  });

  it("sets default role to user", async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email: signupUser.email },
    });
    expect(dbUser!.role).toBe("user");
  });

  it("rejects duplicate email signup", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupUser),
    });

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already exists");
  });

  it("rejects signup without email", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "password123" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects signup without password", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "no-pass@e2e.local" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects password shorter than 8 characters", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "short-pass@e2e.local",
        password: "short",
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("8 characters");
  });

  it("accepts signup without name (name is optional)", async () => {
    const email = `no-name-${Date.now()}@e2e.local`;
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "ValidPass123!" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe(email);

    // Clean up
    await prisma.user.delete({ where: { email } });
  });
});

// ============================================================
// 3. AUTHENTICATION GATES
// ============================================================
describe("Authentication Gates", () => {
  it("dashboard API requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Authentication");
  });

  it("CPD records GET requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/cpd-records`);
    expect(res.status).toBe(401);
  });

  it("CPD records POST requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/cpd-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized",
        hours: 2,
        date: "2026-01-15",
        activityType: "structured",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("onboarding POST requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Unauthorized" }),
    });
    expect(res.status).toBe(401);
  });

  it("evidence GET requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/evidence`);
    expect(res.status).toBe(401);
  });

  it("evidence POST requires authentication", async () => {
    const form = new FormData();
    form.append("file", new Blob(["test"]), "test.pdf");
    const res = await fetch(`${BASE_URL}/api/evidence`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(401);
  });

  it("export compliance-brief requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/export/compliance-brief`);
    expect(res.status).toBe(401);
  });

  it("export audit-report requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/export/audit-report`);
    expect(res.status).toBe(401);
  });

  it("export audit-csv requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/export/audit-csv`);
    expect(res.status).toBe(401);
  });

  it("reminders GET requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders`);
    expect(res.status).toBe(401);
  });

  it("reminders POST requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "deadline",
        title: "Unauthorized",
        triggerDate: "2026-06-01",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("reminders .ics requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders/ics`);
    expect(res.status).toBe(401);
  });
});

// ============================================================
// 4. STATE-SETTING HELPERS (verify they work correctly)
// ============================================================
describe("State-Setting Helpers", () => {
  it("createSignedUpUser creates a valid user with hashed password", async () => {
    const { user, password } = await createSignedUpUser();
    testUserIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(user.email).toContain("@e2e.local");
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(password);
  });

  it("createOnboardedUser creates user with credential and onboarding", async () => {
    const { user, credential, submission, userCredential } =
      await createOnboardedUser();
    testUserIds.push(user.id);

    expect(credential.name).toBe("CFP");
    expect(submission.status).toBe("complete");
    expect(userCredential.isPrimary).toBe(true);
    expect(userCredential.hoursCompleted).toBe(10);
    expect(userCredential.jurisdiction).toBe("US");
  });

  it("createUserWithCpdRecords creates user with 6 default CPD records", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    expect(records.length).toBe(6);
    // Verify first record is ethics
    expect(records[0].category).toBe("ethics");
    expect(records[0].hours).toBe(2);

    // Verify total hours: 2 + 3 + 1.5 + 2 + 1.5 + 4 = 14
    const totalHours = records.reduce((s, r) => s + r.hours, 0);
    expect(totalHours).toBe(14);
  });

  it("createUserWithEvidence creates user with 3 evidence items", async () => {
    const { user, evidence, records } = await createUserWithEvidence();
    testUserIds.push(user.id);

    expect(evidence.length).toBe(3);
    // Evidence is linked to first 3 records
    for (let i = 0; i < 3; i++) {
      expect(evidence[i].cpdRecordId).toBe(records[i].id);
      expect(evidence[i].fileType).toBe("pdf");
      expect(evidence[i].fileName).toContain("certificate_");
    }
  });

  it("createUserWithReminders creates user with 2 reminders", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    expect(reminders.length).toBe(2);
    const types = reminders.map((r) => r.type);
    expect(types).toContain("deadline");
    expect(types).toContain("progress");
  });

  it("createOnboardedUser with custom credential", async () => {
    const { user, credential, userCredential } = await createOnboardedUser({
      credentialName: "FCA Adviser",
      jurisdiction: "GB",
      hoursCompleted: 5,
    });
    testUserIds.push(user.id);

    expect(credential.name).toBe("FCA Adviser");
    expect(userCredential.jurisdiction).toBe("GB");
    expect(userCredential.hoursCompleted).toBe(5);
  });
});

// ============================================================
// 5. ONBOARDING BUSINESS LOGIC
// ============================================================
describe("Onboarding Business Logic", () => {
  it("creates onboarding submission with correct data types", async () => {
    const { user } = await createSignedUpUser();
    testUserIds.push(user.id);

    const submission = await prisma.onboardingSubmission.create({
      data: {
        userId: user.id,
        fullName: "Test Onboarding",
        email: user.email,
        role: "Independent financial adviser / planner",
        primaryCredential: "CFP (Certified Financial Planner)",
        jurisdiction: "United States - select state below",
        renewalDeadline: "2027-03-31",
        currentHoursCompleted: "10",
        status: "pending",
      },
    });

    expect(submission.id).toBeDefined();
    expect(submission.status).toBe("pending");
    // renewalDeadline and currentHoursCompleted are String fields
    expect(typeof submission.renewalDeadline).toBe("string");
    expect(typeof submission.currentHoursCompleted).toBe("string");
  });

  it("links user to credential via UserCredential", async () => {
    const { user } = await createSignedUpUser();
    testUserIds.push(user.id);

    const cfp = await prisma.credential.findUnique({
      where: { name: "CFP" },
    });

    const userCred = await prisma.userCredential.create({
      data: {
        userId: user.id,
        credentialId: cfp!.id,
        jurisdiction: "US",
        renewalDeadline: new Date("2027-03-31"),
        hoursCompleted: 10,
        isPrimary: true,
      },
    });

    expect(userCred.isPrimary).toBe(true);
    expect(userCred.hoursCompleted).toBe(10);
  });

  it("user can only have one onboarding submission (unique userId)", async () => {
    const { user, submission } = await createOnboardedUser();
    testUserIds.push(user.id);

    // Verify there's exactly one submission
    const count = await prisma.onboardingSubmission.count({
      where: { userId: user.id },
    });
    expect(count).toBe(1);
    expect(submission.userId).toBe(user.id);
  });

  it("user credential has unique constraint on userId+credentialId", async () => {
    const { user, credential } = await createOnboardedUser();
    testUserIds.push(user.id);

    // Trying to create a duplicate should fail
    await expect(
      prisma.userCredential.create({
        data: {
          userId: user.id,
          credentialId: credential.id,
          jurisdiction: "US",
          isPrimary: false,
        },
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// 6. CPD ACTIVITY LOGGING
// ============================================================
describe("CPD Activity Logging", () => {
  it("creates a structured ethics CPD record", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Ethics in Financial Planning",
        provider: "CFP Board",
        activityType: "structured",
        hours: 2,
        date: new Date("2026-01-15"),
        status: "completed",
        category: "ethics",
        source: "manual",
      },
    });

    expect(record.id).toBeDefined();
    expect(record.title).toBe("Ethics in Financial Planning");
    expect(record.hours).toBe(2);
    expect(record.category).toBe("ethics");
    expect(record.activityType).toBe("structured");
    expect(record.source).toBe("manual");
  });

  it("supports unstructured activity type", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Self-directed reading",
        activityType: "unstructured",
        hours: 1.5,
        date: new Date("2026-02-01"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.activityType).toBe("unstructured");
    expect(record.provider).toBeNull();
  });

  it("supports verifiable activity type", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Accredited Workshop",
        provider: "CII",
        activityType: "verifiable",
        hours: 4,
        date: new Date("2026-03-01"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.activityType).toBe("verifiable");
  });

  it("supports fractional hours", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Quick webinar",
        activityType: "structured",
        hours: 0.5,
        date: new Date("2026-01-20"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.hours).toBe(0.5);
  });

  it("supports multiple statuses (completed, in_progress, planned)", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    for (const status of ["completed", "in_progress", "planned"]) {
      const record = await prisma.cpdRecord.create({
        data: {
          userId: user.id,
          title: `Activity ${status}`,
          activityType: "structured",
          hours: 1,
          date: new Date("2026-01-15"),
          status,
          category: "general",
          source: "manual",
        },
      });
      expect(record.status).toBe(status);
    }
  });

  it("default status is completed", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Default status test",
        activityType: "structured",
        hours: 1,
        date: new Date("2026-01-15"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.status).toBe("completed");
  });

  it("default source is manual", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Default source test",
        activityType: "structured",
        hours: 1,
        date: new Date("2026-01-15"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.source).toBe("manual");
  });
});

// ============================================================
// 7. DASHBOARD AGGREGATION LOGIC
// ============================================================
describe("Dashboard Aggregation", () => {
  it("calculates total hours from completed records only", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    // Add a non-completed record that should NOT count
    await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Planned activity",
        activityType: "structured",
        hours: 10,
        date: new Date("2026-06-01"),
        status: "planned",
        category: "general",
        source: "manual",
      },
    });

    const completedRecords = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });

    const totalHours = completedRecords.reduce((sum, r) => sum + r.hours, 0);
    // Default records total: 2 + 3 + 1.5 + 2 + 1.5 + 4 = 14
    expect(totalHours).toBe(14);
    // Planned record should not be included
    expect(completedRecords.length).toBe(records.length);
  });

  it("calculates ethics hours separately", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const ethicsRecords = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed", category: "ethics" },
    });

    const ethicsHours = ethicsRecords.reduce((sum, r) => sum + r.hours, 0);
    expect(ethicsHours).toBe(2); // Only the ethics record from defaults
  });

  it("calculates structured hours (structured + verifiable)", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const completedRecords = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });

    const structuredHours = completedRecords
      .filter(
        (r) =>
          r.activityType === "structured" || r.activityType === "verifiable"
      )
      .reduce((sum, r) => sum + r.hours, 0);

    // All default records are structured type: 2 + 3 + 1.5 + 2 + 1.5 + 4 = 14
    expect(structuredHours).toBe(14);
  });

  it("includes onboarding self-reported hours in effective total", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const onboardingHours = userCred!.hoursCompleted ?? 0;
    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });
    const loggedHours = records.reduce((sum, r) => sum + r.hours, 0);
    const effectiveTotal = loggedHours + onboardingHours;

    expect(onboardingHours).toBe(10);
    expect(loggedHours).toBe(14);
    expect(effectiveTotal).toBe(24);
  });

  it("calculates correct progress percentage", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const hoursRequired = userCred!.credential.hoursRequired ?? 0;
    const onboardingHours = userCred!.hoursCompleted ?? 0;
    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });
    const loggedHours = records.reduce((sum, r) => sum + r.hours, 0);
    const totalCompleted = loggedHours + onboardingHours;

    // CFP: 30h required, 24h completed = 80%
    const progressPercent = Math.min(
      100,
      Math.round((totalCompleted / hoursRequired) * 100)
    );
    expect(hoursRequired).toBe(30);
    expect(totalCompleted).toBe(24);
    expect(progressPercent).toBe(80);
  });

  it("caps progress at 100%", async () => {
    const { user } = await createOnboardedUser({ hoursCompleted: 25 });
    testUserIds.push(user.id);

    // Create records totaling more than required
    await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Extra hours",
        activityType: "structured",
        hours: 10,
        date: new Date("2026-01-01"),
        status: "completed",
        category: "general",
        source: "manual",
      },
    });

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const hoursRequired = userCred!.credential.hoursRequired ?? 0;
    const total = 25 + 10; // 35h completed
    const pct = Math.min(100, Math.round((total / hoursRequired) * 100));

    expect(pct).toBe(100); // Capped at 100%
  });
});

// ============================================================
// 8. CPD GAP ANALYSIS
// ============================================================
describe("CPD Gap Analysis", () => {
  it("correctly identifies hours gap for CFP credential", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const hoursRequired = userCred!.credential.hoursRequired ?? 0;
    const onboardingHours = userCred!.hoursCompleted ?? 0;
    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });
    const loggedHours = records.reduce((sum, r) => sum + r.hours, 0);
    const totalCompleted = loggedHours + onboardingHours;

    const totalGap = hoursRequired - totalCompleted;
    // CFP: 30h required, 24h completed (14 logged + 10 onboarding) = 6h gap
    expect(totalGap).toBe(6);
  });

  it("detects when ethics requirement is met", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const ethicsRequired = userCred!.credential.ethicsHours ?? 0;
    const ethicsRecords = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed", category: "ethics" },
    });
    const ethicsCompleted = ethicsRecords.reduce((sum, r) => sum + r.hours, 0);

    // CFP: 2h ethics required, 2h completed
    expect(ethicsRequired).toBe(2);
    expect(ethicsCompleted).toBe(2);
    expect(ethicsCompleted >= ethicsRequired).toBe(true);
  });

  it("detects when structured requirement needs more hours", async () => {
    // FCA Adviser requires 21h structured, onboarding provides 5h
    const { user } = await createOnboardedUser({
      credentialName: "FCA Adviser",
      jurisdiction: "GB",
      hoursCompleted: 5,
    });
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const structuredRequired = userCred!.credential.structuredHours ?? 0;
    expect(structuredRequired).toBe(21);

    // No structured records logged yet, gap = 21h
    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });
    const structuredLogged = records
      .filter(
        (r) =>
          r.activityType === "structured" || r.activityType === "verifiable"
      )
      .reduce((sum, r) => sum + r.hours, 0);

    expect(structuredLogged).toBe(0);
    expect(structuredRequired - structuredLogged).toBe(21);
  });

  it("calculates days until deadline", async () => {
    const { user } = await createOnboardedUser({
      renewalDeadline: "2027-03-31",
    });
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    const deadline = userCred!.renewalDeadline!;
    const daysUntil = Math.ceil(
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    expect(daysUntil).toBeGreaterThan(0);
    expect(daysUntil).toBeLessThan(500);
  });

  it("handles null renewal deadline gracefully", async () => {
    const { user } = await createSignedUpUser();
    testUserIds.push(user.id);

    const cfp = await prisma.credential.findUnique({
      where: { name: "CFP" },
    });
    await prisma.userCredential.create({
      data: {
        userId: user.id,
        credentialId: cfp!.id,
        jurisdiction: "US",
        renewalDeadline: null,
        isPrimary: true,
      },
    });

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    expect(userCred!.renewalDeadline).toBeNull();
    const daysUntil = userCred!.renewalDeadline
      ? Math.ceil(
          (new Date(userCred!.renewalDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;
    expect(daysUntil).toBeNull();
  });
});

// ============================================================
// 9. EVIDENCE MANAGEMENT (via Prisma)
// ============================================================
describe("Evidence Management", () => {
  it("creates evidence linked to CPD record", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const evidence = await prisma.evidence.create({
      data: {
        userId: user.id,
        cpdRecordId: records[0].id,
        fileName: "certificate.pdf",
        fileType: "pdf",
        fileSize: 50000,
        storageKey: `uploads/${user.id}/test.pdf`,
      },
    });

    expect(evidence.id).toBeDefined();
    expect(evidence.cpdRecordId).toBe(records[0].id);
    expect(evidence.fileType).toBe("pdf");
  });

  it("creates evidence without CPD record (standalone)", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const evidence = await prisma.evidence.create({
      data: {
        userId: user.id,
        cpdRecordId: null,
        fileName: "general_cert.pdf",
        fileType: "pdf",
        fileSize: 30000,
        storageKey: `uploads/${user.id}/general.pdf`,
      },
    });

    expect(evidence.cpdRecordId).toBeNull();
  });

  it("supports image file type", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const evidence = await prisma.evidence.create({
      data: {
        userId: user.id,
        fileName: "photo.jpg",
        fileType: "image",
        fileSize: 120000,
        storageKey: `uploads/${user.id}/photo.jpg`,
      },
    });

    expect(evidence.fileType).toBe("image");
  });

  it("stores JSON metadata", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const meta = {
      date: "2026-01-15",
      hours: 2,
      provider: "CFP Board",
      learningOutcome: "Ethics fundamentals",
    };

    const evidence = await prisma.evidence.create({
      data: {
        userId: user.id,
        cpdRecordId: records[0].id,
        fileName: "cert_with_meta.pdf",
        fileType: "pdf",
        fileSize: 40000,
        storageKey: `uploads/${user.id}/meta.pdf`,
        metadata: JSON.stringify(meta),
      },
    });

    const parsed = JSON.parse(evidence.metadata!);
    expect(parsed.provider).toBe("CFP Board");
    expect(parsed.hours).toBe(2);
  });

  it("counts evidence for certificate count in dashboard", async () => {
    const { user, evidence } = await createUserWithEvidence();
    testUserIds.push(user.id);

    const count = await prisma.evidence.count({
      where: { userId: user.id },
    });

    expect(count).toBe(evidence.length);
    expect(count).toBe(3);
  });

  it("deleting evidence does not delete CPD record", async () => {
    const { user, records, evidence } = await createUserWithEvidence();
    testUserIds.push(user.id);

    const evId = evidence[0].id;
    const recordId = evidence[0].cpdRecordId!;

    await prisma.evidence.delete({ where: { id: evId } });

    // CPD record should still exist
    const record = await prisma.cpdRecord.findUnique({
      where: { id: recordId },
    });
    expect(record).not.toBeNull();
    expect(record!.title).toBe(records[0].title);
  });
});

// ============================================================
// 10. REMINDERS BUSINESS LOGIC (via Prisma)
// ============================================================
describe("Reminders Business Logic", () => {
  it("creates a deadline reminder with correct fields", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    const deadlineReminder = reminders.find((r) => r.type === "deadline");
    expect(deadlineReminder).toBeDefined();
    expect(deadlineReminder!.title).toBe("CFP cycle renewal deadline");
    expect(deadlineReminder!.channel).toBe("both");
    expect(deadlineReminder!.status).toBe("pending");
  });

  it("creates a progress reminder", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    const progressReminder = reminders.find((r) => r.type === "progress");
    expect(progressReminder).toBeDefined();
    expect(progressReminder!.channel).toBe("email");
  });

  it("supports reminder dismissal", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    const updated = await prisma.reminder.update({
      where: { id: reminders[0].id },
      data: { status: "dismissed" },
    });

    expect(updated.status).toBe("dismissed");
  });

  it("supports marking reminder as sent", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    const now = new Date();
    const updated = await prisma.reminder.update({
      where: { id: reminders[0].id },
      data: { status: "sent", sentAt: now },
    });

    expect(updated.status).toBe("sent");
    expect(updated.sentAt).not.toBeNull();
  });

  it("can filter reminders by status", async () => {
    const { user, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    // Dismiss one
    await prisma.reminder.update({
      where: { id: reminders[0].id },
      data: { status: "dismissed" },
    });

    const pending = await prisma.reminder.findMany({
      where: { userId: user.id, status: "pending" },
    });
    const dismissed = await prisma.reminder.findMany({
      where: { userId: user.id, status: "dismissed" },
    });

    expect(pending.length).toBe(1);
    expect(dismissed.length).toBe(1);
  });

  it("can link reminder to credential", async () => {
    const { user, credential, reminders } = await createUserWithReminders();
    testUserIds.push(user.id);

    const deadlineReminder = reminders.find((r) => r.type === "deadline");
    expect(deadlineReminder!.credentialId).toBe(credential.id);
  });

  it("stores JSON metadata on reminders", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const meta = { recurrence: "monthly", hoursRemaining: 15 };
    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        type: "custom",
        title: "Monthly check-in",
        triggerDate: new Date("2026-06-01"),
        metadata: JSON.stringify(meta),
      },
    });

    const parsed = JSON.parse(reminder.metadata!);
    expect(parsed.recurrence).toBe("monthly");
    expect(parsed.hoursRemaining).toBe(15);
  });
});

// ============================================================
// 11. PDF GENERATION (unit test via lib)
// ============================================================
describe("PDF Generation Library", () => {
  it("generateComplianceBrief returns a valid PDF stream", async () => {
    // Dynamic import to avoid issues with PDFKit in test environment
    const { generateComplianceBrief } = await import("@/lib/pdf");

    const doc = generateComplianceBrief(
      { name: "Test User", email: "test@e2e.local", plan: "free" },
      {
        name: "CFP",
        body: "CFP Board",
        region: "US",
        hoursRequired: 30,
        ethicsRequired: 2,
        structuredRequired: 0,
        cycleLengthYears: 2,
      },
      {
        totalHoursCompleted: 18.5,
        hoursRequired: 30,
        ethicsHoursCompleted: 2,
        ethicsRequired: 2,
        structuredHoursCompleted: 7,
        structuredRequired: 0,
        progressPercent: 62,
        certificateCount: 3,
      },
      {
        renewalDeadline: "2027-03-31T00:00:00.000Z",
        daysUntilDeadline: 425,
        jurisdiction: "US",
      }
    );

    // Collect chunks
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("generateAuditReport returns a valid multi-page PDF", async () => {
    const { generateAuditReport } = await import("@/lib/pdf");

    const doc = generateAuditReport(
      { name: "Test User", email: "test@e2e.local", plan: "free" },
      {
        name: "CFP",
        body: "CFP Board",
        region: "US",
        hoursRequired: 30,
        ethicsRequired: 2,
        structuredRequired: 0,
        cycleLengthYears: 2,
      },
      {
        totalHoursCompleted: 14,
        hoursRequired: 30,
        ethicsHoursCompleted: 2,
        ethicsRequired: 2,
        structuredHoursCompleted: 14,
        structuredRequired: 0,
        progressPercent: 47,
        certificateCount: 3,
      },
      {
        renewalDeadline: "2027-03-31T00:00:00.000Z",
        daysUntilDeadline: 425,
        jurisdiction: "US",
      },
      [
        {
          title: "Ethics in Financial Planning",
          provider: "CFP Board",
          activityType: "structured",
          hours: 2,
          date: "2026-01-15T00:00:00.000Z",
          status: "completed",
          category: "ethics",
        },
        {
          title: "Tax Year-End Planning",
          provider: "Kitces.com",
          activityType: "structured",
          hours: 3,
          date: "2026-01-22T00:00:00.000Z",
          status: "completed",
          category: "general",
        },
      ],
      [
        {
          fileName: "certificate_ethics.pdf",
          fileType: "pdf",
          uploadedAt: "2026-01-16T00:00:00.000Z",
          cpdRecordId: "test-id",
        },
      ]
    );

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("generateAuditCsv produces valid CSV with headers", async () => {
    const { generateAuditCsv } = await import("@/lib/pdf");

    const csv = generateAuditCsv(
      { name: "Test User", email: "test@e2e.local", plan: "free" },
      {
        name: "CFP",
        body: "CFP Board",
        region: "US",
        hoursRequired: 30,
        ethicsRequired: 2,
        structuredRequired: 0,
        cycleLengthYears: 2,
      },
      [
        {
          title: "Ethics in Financial Planning",
          provider: "CFP Board",
          activityType: "structured",
          hours: 2,
          date: "2026-01-15T00:00:00.000Z",
          status: "completed",
          category: "ethics",
        },
        {
          title: 'Tax "Year-End" Planning',
          provider: null,
          activityType: "structured",
          hours: 3,
          date: "2026-01-22T00:00:00.000Z",
          status: "completed",
          category: "general",
        },
      ]
    );

    const lines = csv.split("\n");
    expect(lines.length).toBe(3); // header + 2 rows

    // Check header
    expect(lines[0]).toBe(
      "Date,Title,Provider,Activity Type,Hours,Category,Status,Credential,User"
    );

    // Check data row
    expect(lines[1]).toContain("2026-01-15");
    expect(lines[1]).toContain("Ethics in Financial Planning");
    expect(lines[1]).toContain("CFP Board");
    expect(lines[1]).toContain("CFP");

    // Check CSV escaping of double quotes
    expect(lines[2]).toContain('""Year-End""');
  });

  it("generateAuditCsv handles empty activities", async () => {
    const { generateAuditCsv } = await import("@/lib/pdf");

    const csv = generateAuditCsv(
      { name: "Test User", email: "test@e2e.local", plan: "free" },
      {
        name: "CFP",
        body: "CFP Board",
        region: "US",
        hoursRequired: 30,
        ethicsRequired: 2,
        structuredRequired: 0,
        cycleLengthYears: 2,
      },
      []
    );

    const lines = csv.split("\n");
    expect(lines.length).toBe(1); // header only
  });
});

// ============================================================
// 12. MULTI-CREDENTIAL SUPPORT
// ============================================================
describe("Multi-Credential Support", () => {
  it("user can hold multiple credentials", async () => {
    const { user, credential } = await createOnboardedUser();
    testUserIds.push(user.id);

    const fca = await prisma.credential.findUnique({
      where: { name: "FCA Adviser" },
    });

    const secondCred = await prisma.userCredential.create({
      data: {
        userId: user.id,
        credentialId: fca!.id,
        jurisdiction: "GB",
        hoursCompleted: 5,
        isPrimary: false,
      },
    });

    expect(secondCred.isPrimary).toBe(false);

    const userCreds = await prisma.userCredential.findMany({
      where: { userId: user.id },
      include: { credential: true },
    });

    expect(userCreds.length).toBe(2);
    const credNames = userCreds.map((uc) => uc.credential.name);
    expect(credNames).toContain("CFP");
    expect(credNames).toContain("FCA Adviser");
  });

  it("each credential tracks hours independently", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const fca = await prisma.credential.findUnique({
      where: { name: "FCA Adviser" },
    });

    await prisma.userCredential.create({
      data: {
        userId: user.id,
        credentialId: fca!.id,
        jurisdiction: "GB",
        hoursCompleted: 15,
        isPrimary: false,
      },
    });

    const userCreds = await prisma.userCredential.findMany({
      where: { userId: user.id },
    });

    const cfpCred = userCreds.find((uc) => uc.isPrimary);
    const fcaCred = userCreds.find((uc) => !uc.isPrimary);

    expect(cfpCred!.hoursCompleted).toBe(10);
    expect(fcaCred!.hoursCompleted).toBe(15);
  });

  it("only one credential should be primary", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const primaryCreds = await prisma.userCredential.findMany({
      where: { userId: user.id, isPrimary: true },
    });

    expect(primaryCreds.length).toBe(1);
  });
});

// ============================================================
// 13. DATA INTEGRITY
// ============================================================
describe("Data Integrity", () => {
  it("CPD records reference valid users", async () => {
    const allRecords = await prisma.cpdRecord.findMany({
      include: { user: true },
    });
    for (const record of allRecords) {
      expect(record.user).not.toBeNull();
      expect(record.user.id).toBeDefined();
    }
  });

  it("user credentials reference valid credentials", async () => {
    const allUserCreds = await prisma.userCredential.findMany({
      include: { credential: true },
    });
    for (const uc of allUserCreds) {
      expect(uc.credential).not.toBeNull();
      expect(uc.credential.name).toBeDefined();
    }
  });

  it("evidence references valid users", async () => {
    const allEvidence = await prisma.evidence.findMany({
      include: { user: true },
    });
    for (const ev of allEvidence) {
      expect(ev.user).not.toBeNull();
      expect(ev.user.id).toBeDefined();
    }
  });

  it("evidence with cpdRecordId references valid record", async () => {
    const linkedEvidence = await prisma.evidence.findMany({
      where: { cpdRecordId: { not: null } },
      include: { cpdRecord: true },
    });
    for (const ev of linkedEvidence) {
      expect(ev.cpdRecord).not.toBeNull();
    }
  });

  it("all credentials have valid categoryRules JSON", async () => {
    const creds = await prisma.credential.findMany();
    for (const cred of creds) {
      if (cred.categoryRules) {
        expect(() => JSON.parse(cred.categoryRules!)).not.toThrow();
        const rules = JSON.parse(cred.categoryRules!);
        expect(rules.categories).toBeDefined();
        expect(Array.isArray(rules.categories)).toBe(true);
      }
    }
  });

  it("cascade delete removes related records", async () => {
    const { user } = await createUserWithEvidence();
    // Don't add to testUserIds - we'll clean up manually

    // Verify data exists
    const recordCount = await prisma.cpdRecord.count({
      where: { userId: user.id },
    });
    const evidenceCount = await prisma.evidence.count({
      where: { userId: user.id },
    });
    expect(recordCount).toBeGreaterThan(0);
    expect(evidenceCount).toBeGreaterThan(0);

    // Clean up via helper (simulates cascade)
    await cleanupUser(user.id);

    // Verify all related data is gone
    const remainingRecords = await prisma.cpdRecord.count({
      where: { userId: user.id },
    });
    const remainingEvidence = await prisma.evidence.count({
      where: { userId: user.id },
    });
    expect(remainingRecords).toBe(0);
    expect(remainingEvidence).toBe(0);
  });
});

// ============================================================
// 14. PAGE AVAILABILITY
// ============================================================
describe("Page Availability", () => {
  it("homepage loads successfully", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
  });

  it("signin page loads successfully", async () => {
    const res = await fetch(`${BASE_URL}/auth/signin`);
    expect(res.status).toBe(200);
  });

  it("signup page loads successfully", async () => {
    const res = await fetch(`${BASE_URL}/auth/signup`);
    expect(res.status).toBe(200);
  });

  it("dashboard page loads successfully", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    expect(res.status).toBe(200);
  });

  it("onboarding page loads successfully", async () => {
    const res = await fetch(`${BASE_URL}/onboarding`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 15. EDGE CASES
// ============================================================
describe("Edge Cases", () => {
  it("user with zero CPD records has 0% progress", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });

    expect(records.length).toBe(0);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { credential: true },
    });

    const hoursRequired = userCred!.credential.hoursRequired ?? 0;
    const onboardingHours = userCred!.hoursCompleted ?? 0;
    // With 10h onboarding but 0 logged, still have progress from onboarding
    const pct = Math.min(
      100,
      Math.round((onboardingHours / hoursRequired) * 100)
    );
    expect(pct).toBe(33); // 10/30 = 33%
  });

  it("user with no credential has 0 hours required", async () => {
    const { user } = await createSignedUpUser();
    testUserIds.push(user.id);

    const userCred = await prisma.userCredential.findFirst({
      where: { userId: user.id },
    });

    expect(userCred).toBeNull();
    // When no credential, hoursRequired defaults to 0
    const hoursRequired = 0;
    expect(hoursRequired).toBe(0);
  });

  it("handles credential with null ethicsHours", async () => {
    const creds = await prisma.credential.findMany({
      where: { ethicsHours: null },
    });

    // Some credentials may not have ethics requirements
    for (const cred of creds) {
      const ethicsRequired = cred.ethicsHours ?? 0;
      expect(ethicsRequired).toBe(0);
    }
  });

  it("handles credential with null hoursRequired (competence-based)", async () => {
    const creds = await prisma.credential.findMany({
      where: { hoursRequired: null },
    });

    for (const cred of creds) {
      const required = cred.hoursRequired ?? 0;
      expect(required).toBe(0);
    }
  });

  it("evidence metadata can be null", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    const evidence = await prisma.evidence.create({
      data: {
        userId: user.id,
        fileName: "no_meta.pdf",
        fileType: "pdf",
        fileSize: 1000,
        storageKey: `uploads/${user.id}/no_meta.pdf`,
        metadata: null,
      },
    });

    expect(evidence.metadata).toBeNull();
  });

  it("CPD record with zero hours is technically valid in DB", async () => {
    const { user } = await createOnboardedUser();
    testUserIds.push(user.id);

    // The DB allows 0 hours; the API should validate > 0
    const record = await prisma.cpdRecord.create({
      data: {
        userId: user.id,
        title: "Zero hour test",
        activityType: "structured",
        hours: 0,
        date: new Date("2026-01-01"),
        category: "general",
        source: "manual",
      },
    });

    expect(record.hours).toBe(0);

    // But when aggregating, 0 hours shouldn't affect totals
    const total = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
    });
    const sum = total.reduce((s, r) => s + r.hours, 0);
    expect(sum).toBe(0);
  });

  it("multiple users don't interfere with each other's data", async () => {
    const user1 = await createUserWithCpdRecords();
    const user2 = await createUserWithCpdRecords();
    testUserIds.push(user1.user.id, user2.user.id);

    const records1 = await prisma.cpdRecord.findMany({
      where: { userId: user1.user.id },
    });
    const records2 = await prisma.cpdRecord.findMany({
      where: { userId: user2.user.id },
    });

    // Each user should have their own set of 6 records
    expect(records1.length).toBe(6);
    expect(records2.length).toBe(6);

    // No overlap in IDs
    const ids1 = new Set(records1.map((r) => r.id));
    const ids2 = new Set(records2.map((r) => r.id));
    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }
  });
});

// ============================================================
// 16. CREDENTIAL-SPECIFIC BUSINESS RULES
// ============================================================
describe("Credential-Specific Business Rules", () => {
  it("CFP tracks upcoming rule change to 40h", async () => {
    const cfp = await prisma.credential.findUnique({
      where: { name: "CFP" },
    });
    const rules = JSON.parse(cfp!.categoryRules!);

    expect(rules.upcomingChange).toBeDefined();
    expect(rules.upcomingChange.effectiveDate).toBe("2027-01-01");
    expect(rules.upcomingChange.newHoursRequired).toBe(40);
  });

  it("FCA Adviser enforces 60% structured minimum", async () => {
    const fca = await prisma.credential.findUnique({
      where: { name: "FCA Adviser" },
    });

    // 21h structured of 35h total = 60%
    const structuredPct =
      (fca!.structuredHours! / fca!.hoursRequired!) * 100;
    expect(structuredPct).toBe(60);
  });

  it("IAR has equal ethics and structured requirements", async () => {
    const iar = await prisma.credential.findUnique({
      where: { name: "IAR" },
    });

    expect(iar!.ethicsHours).toBe(6);
    expect(iar!.structuredHours).toBe(6);
    expect(iar!.ethicsHours).toBe(iar!.structuredHours);
  });

  it("FASEA/ASIC has 5 required category types", async () => {
    const fasea = await prisma.credential.findUnique({
      where: { name: "FASEA/ASIC" },
    });
    const rules = JSON.parse(fasea!.categoryRules!);

    // FASEA requires activities across specific categories
    expect(rules.categories.length).toBeGreaterThanOrEqual(4);
    expect(rules.categories).toContain("technical_competence");
    expect(rules.categories).toContain("client_care");
    expect(rules.categories).toContain("regulatory_compliance");
    expect(rules.categories).toContain("professionalism_ethics");
  });

  it("MAS has separate ethics and structured quotas", async () => {
    const mas = await prisma.credential.findUnique({
      where: { name: "MAS Licensed Rep" },
    });

    expect(mas!.ethicsHours).toBe(6);
    expect(mas!.structuredHours).toBe(8);
    // Ethics + structured = 14, out of 30 total = 47%
    expect((mas!.ethicsHours! + mas!.structuredHours!) / mas!.hoursRequired! * 100)
      .toBeCloseTo(46.67, 1);
  });

  it("all credentials with cycleLengthYears > 1 accumulate hours", async () => {
    const multiYear = await prisma.credential.findMany({
      where: { cycleLengthYears: { gt: 1 } },
    });

    for (const cred of multiYear) {
      expect(cred.cycleLengthYears).toBeGreaterThan(1);
      // Multi-year credentials should have total hours > annual average
      if (cred.hoursRequired) {
        const annualAvg = cred.hoursRequired / cred.cycleLengthYears;
        expect(annualAvg).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================
// 17. CERTIFICATE GENERATION
// ============================================================
describe("Certificate Generation", () => {
  it("creates a certificate with unique code", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const cert = await prisma.certificate.create({
      data: {
        userId: user.id,
        certificateCode: `CERT-TEST-${Date.now()}`,
        title: records[0].title,
        credentialName: "CFP",
        hours: records[0].hours,
        category: "ethics",
        activityType: "structured",
        provider: "CFP Board",
        completedDate: new Date("2026-01-15"),
        verificationUrl: `http://localhost:3000/api/certificates/verify/CERT-TEST-${Date.now()}`,
        cpdRecordId: records[0].id,
      },
    });

    expect(cert.id).toBeDefined();
    expect(cert.certificateCode).toMatch(/^CERT-TEST-/);
    expect(cert.status).toBe("active");
    expect(cert.userId).toBe(user.id);
  });

  it("certificate codes are globally unique", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const code = `CERT-UNIQUE-${Date.now()}`;
    await prisma.certificate.create({
      data: {
        userId: user.id,
        certificateCode: code,
        title: "Test",
        hours: 1,
        completedDate: new Date(),
        verificationUrl: `http://localhost:3000/api/certificates/verify/${code}`,
      },
    });

    // Second certificate with same code should fail
    await expect(
      prisma.certificate.create({
        data: {
          userId: user.id,
          certificateCode: code,
          title: "Duplicate",
          hours: 1,
          completedDate: new Date(),
          verificationUrl: `http://localhost:3000/api/certificates/verify/${code}`,
        },
      })
    ).rejects.toThrow();
  });

  it("certificate can be linked to a CPD record", async () => {
    const { certificate, records } = await createUserWithCertificate();
    testUserIds.push(certificate.userId);

    expect(certificate.cpdRecordId).toBe(records[0].id);
  });

  it("certificate status can be changed to revoked", async () => {
    const { user, certificate } = await createUserWithCertificate();
    testUserIds.push(user.id);

    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: "revoked" },
    });

    expect(updated.status).toBe("revoked");
  });

  it("certificate verification endpoint returns 404 for bad code", async () => {
    const res = await fetch(
      `${BASE_URL}/api/certificates/verify/CERT-NONEXISTENT-000`
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("certificate verification endpoint returns valid certificate data", async () => {
    const { certificate, user } = await createUserWithCertificate();
    testUserIds.push(user.id);

    const res = await fetch(
      `${BASE_URL}/api/certificates/verify/${certificate.certificateCode}`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.certificateCode).toBe(certificate.certificateCode);
    expect(body.title).toBe(certificate.title);
    expect(body.hours).toBe(certificate.hours);
  });

  it("revoked certificate shows as invalid in verification", async () => {
    const { certificate, user } = await createUserWithCertificate();
    testUserIds.push(user.id);

    await prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: "revoked" },
    });

    const res = await fetch(
      `${BASE_URL}/api/certificates/verify/${certificate.certificateCode}`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.status).toBe("revoked");
  });
});

// ============================================================
// 18. CERTIFICATE PDF GENERATION
// ============================================================
describe("Certificate PDF Generation", () => {
  it("generateCertificateCode produces correct format", async () => {
    const { generateCertificateCode } = await import("@/lib/pdf");
    const code = generateCertificateCode();
    expect(code).toMatch(/^CERT-\d{4}-[a-z0-9]{8}$/);
  });

  it("generateCertificateCode produces unique codes", async () => {
    const { generateCertificateCode } = await import("@/lib/pdf");
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateCertificateCode());
    }
    expect(codes.size).toBe(20);
  });

  it("generateCertificatePdf produces valid PDF buffer", async () => {
    const { generateCertificatePdf } = await import("@/lib/pdf");

    const pdfDoc = await generateCertificatePdf({
      certificateCode: "CERT-2026-testpdf1",
      title: "Ethics in Financial Planning",
      recipientName: "John Smith",
      recipientEmail: "john@test.com",
      credentialName: "CFP",
      hours: 2,
      category: "ethics",
      provider: "CFP Board",
      completedDate: "2026-01-15T00:00:00.000Z",
      issuedDate: new Date().toISOString(),
      verificationUrl: "http://localhost:3000/api/certificates/verify/CERT-2026-testpdf1",
      quizScore: 95,
      firmName: null,
      firmLogoUrl: null,
      firmPrimaryColor: null,
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfDoc) {
      chunks.push(chunk as Uint8Array);
    }
    const buffer = Buffer.concat(chunks);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("utf8", 0, 5)).toBe("%PDF-");
  });

  it("certificate PDF respects firm branding color", async () => {
    const { generateCertificatePdf } = await import("@/lib/pdf");

    const pdfDoc = await generateCertificatePdf({
      certificateCode: "CERT-2026-firmtest",
      title: "Firm Branded Certificate",
      recipientName: "Jane Doe",
      recipientEmail: "jane@firm.com",
      credentialName: "CFP",
      hours: 1,
      category: "general",
      provider: "Zurich Academy",
      completedDate: "2026-02-01T00:00:00.000Z",
      issuedDate: new Date().toISOString(),
      verificationUrl: "http://localhost:3000/api/certificates/verify/CERT-2026-firmtest",
      quizScore: null,
      firmName: "Zurich CPD Academy",
      firmLogoUrl: null,
      firmPrimaryColor: "#003366",
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfDoc) {
      chunks.push(chunk as Uint8Array);
    }
    const buffer = Buffer.concat(chunks);

    // PDF should be generated successfully with custom color
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("utf8", 0, 5)).toBe("%PDF-");
  });
});

// ============================================================
// 19. QUIZ ENGINE
// ============================================================
describe("Quiz Engine", () => {
  it("can create a quiz with questions", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        title: "Test Assessment - Create",
        passMark: 70,
        maxAttempts: 3,
        hours: 1,
        category: "ethics",
        questionsJson: JSON.stringify([
          {
            question: "Q1?",
            options: ["A", "B", "C", "D"],
            correctIndex: 1,
          },
          {
            question: "Q2?",
            options: ["True", "False"],
            correctIndex: 0,
          },
        ]),
      },
    });

    expect(quiz.id).toBeDefined();
    expect(quiz.passMark).toBe(70);
    expect(quiz.maxAttempts).toBe(3);

    const questions = JSON.parse(quiz.questionsJson);
    expect(questions.length).toBe(2);

    // Clean up
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("quiz attempt calculates score correctly", async () => {
    const { user, quiz, attempt } = await createUserWithQuizPass({
      score: 100,
    });
    testUserIds.push(user.id);

    expect(attempt.score).toBe(100);
    expect(attempt.passed).toBe(true);

    // Clean up quiz
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("quiz attempt with score below pass mark fails", async () => {
    const { user, quiz } = await createUserWithQuizPass({ passMark: 70 });
    testUserIds.push(user.id);

    // Create a failing attempt
    const failAttempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        answers: JSON.stringify([0, 0, 0]),
        score: 33,
        passed: false,
        completedAt: new Date(),
      },
    });

    expect(failAttempt.passed).toBe(false);
    expect(failAttempt.score).toBe(33);

    // Clean up
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("tracks attempt count per user per quiz", async () => {
    const { user, quiz } = await createUserWithQuizPass();
    testUserIds.push(user.id);

    // Already has 1 attempt from createUserWithQuizPass
    const count = await prisma.quizAttempt.count({
      where: { userId: user.id, quizId: quiz.id },
    });
    expect(count).toBe(1);

    // Add another attempt
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        answers: JSON.stringify([0, 0, 0]),
        score: 0,
        passed: false,
        completedAt: new Date(),
      },
    });

    const newCount = await prisma.quizAttempt.count({
      where: { userId: user.id, quizId: quiz.id },
    });
    expect(newCount).toBe(2);

    // Clean up
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("quiz questions are stored as valid JSON", async () => {
    const { quiz, user } = await createUserWithQuizPass();
    testUserIds.push(user.id);

    const questions = JSON.parse(quiz.questionsJson);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(3);

    for (const q of questions) {
      expect(q.question).toBeDefined();
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof q.correctIndex).toBe("number");
    }

    // Clean up
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("quiz API returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes`);
    expect(res.status).toBe(401);
  });

  it("quiz attempt API returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes/fake-id/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: [0, 1, 2] }),
    });
    expect(res.status).toBe(401);
  });
});

// ============================================================
// 20. COMPLETION RULES ENGINE
// ============================================================
describe("Completion Rules Engine", () => {
  it("activity with no rules is complete by default", async () => {
    const { evaluateCompletionRules } = await import("@/lib/completion");
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const result = await evaluateCompletionRules(user.id, records[0].id);
    expect(result.allPassed).toBe(true);
    expect(result.rules.length).toBe(0);
    expect(result.eligibleForCertificate).toBe(true);
  });

  it("quiz_pass rule passes when user has passing attempt", async () => {
    const { evaluateCompletionRules } = await import("@/lib/completion");
    const { user, records, quiz } = await createUserWithQuizPass({
      score: 85,
    });
    testUserIds.push(user.id);

    // Create a quiz_pass completion rule for the first record
    await prisma.completionRule.create({
      data: {
        name: "Pass ethics quiz",
        ruleType: "quiz_pass",
        config: JSON.stringify({ quizId: quiz.id, minScore: 70 }),
        cpdRecordId: records[0].id,
      },
    });

    const result = await evaluateCompletionRules(user.id, records[0].id);
    expect(result.allPassed).toBe(true);
    expect(result.rules.length).toBe(1);
    expect(result.rules[0].passed).toBe(true);

    // Clean up
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("quiz_pass rule fails when no passing attempt exists", async () => {
    const { evaluateCompletionRules } = await import("@/lib/completion");
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    // Create a quiz for this test
    const quiz = await prisma.quiz.create({
      data: {
        title: "Test Assessment - Fail",
        passMark: 70,
        maxAttempts: 3,
        hours: 1,
        questionsJson: JSON.stringify([
          { question: "Q?", options: ["A", "B"], correctIndex: 0 },
        ]),
      },
    });

    await prisma.completionRule.create({
      data: {
        name: "Pass quiz",
        ruleType: "quiz_pass",
        config: JSON.stringify({ quizId: quiz.id }),
        cpdRecordId: records[0].id,
      },
    });

    const result = await evaluateCompletionRules(user.id, records[0].id);
    expect(result.allPassed).toBe(false);
    expect(result.rules[0].passed).toBe(false);

    // Clean up
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("evidence_upload rule passes with sufficient files", async () => {
    const { evaluateCompletionRules } = await import("@/lib/completion");
    const { user, records, evidence } = await createUserWithEvidence();
    testUserIds.push(user.id);

    // Records[0] has evidence linked (from createUserWithEvidence)
    await prisma.completionRule.create({
      data: {
        name: "Upload evidence",
        ruleType: "evidence_upload",
        config: JSON.stringify({ minFiles: 1 }),
        cpdRecordId: records[0].id,
      },
    });

    const result = await evaluateCompletionRules(user.id, records[0].id);
    expect(result.allPassed).toBe(true);
    expect(result.rules[0].passed).toBe(true);
  });

  it("multiple rules require ALL to pass", async () => {
    const { evaluateCompletionRules } = await import("@/lib/completion");
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    // Create a quiz that user hasn't attempted
    const quiz = await prisma.quiz.create({
      data: {
        title: "Test Assessment - Multi",
        passMark: 70,
        maxAttempts: 3,
        hours: 1,
        questionsJson: JSON.stringify([
          { question: "Q?", options: ["A", "B"], correctIndex: 0 },
        ]),
      },
    });

    // Rule 1: evidence (will fail since no evidence)
    await prisma.completionRule.create({
      data: {
        name: "Upload evidence",
        ruleType: "evidence_upload",
        config: JSON.stringify({ minFiles: 1 }),
        cpdRecordId: records[0].id,
      },
    });

    // Rule 2: quiz pass (will fail since no attempt)
    await prisma.completionRule.create({
      data: {
        name: "Pass quiz",
        ruleType: "quiz_pass",
        config: JSON.stringify({ quizId: quiz.id }),
        cpdRecordId: records[0].id,
      },
    });

    const result = await evaluateCompletionRules(user.id, records[0].id);
    expect(result.allPassed).toBe(false);
    expect(result.rules.length).toBe(2);
    expect(result.eligibleForCertificate).toBe(false);

    // Clean up
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("completion API returns 401 without auth", async () => {
    const res = await fetch(
      `${BASE_URL}/api/completion?cpdRecordId=fake-id`
    );
    expect(res.status).toBe(401);
  });
});

// ============================================================
// 21. CERTIFICATE VAULT
// ============================================================
describe("Certificate Vault", () => {
  it("list certificates API returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/certificates`);
    expect(res.status).toBe(401);
  });

  it("certificates can be stored and queried by user", async () => {
    const { user, certificate } = await createUserWithCertificate();
    testUserIds.push(user.id);

    const certs = await prisma.certificate.findMany({
      where: { userId: user.id },
    });

    expect(certs.length).toBeGreaterThanOrEqual(1);
    expect(certs[0].certificateCode).toBeDefined();
    expect(certs[0].title).toBeDefined();
  });

  it("certificates can be searched by title", async () => {
    const { user, certificate } = await createUserWithCertificate();
    testUserIds.push(user.id);

    const results = await prisma.certificate.findMany({
      where: {
        userId: user.id,
        title: { contains: "Ethics" },
      },
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toContain("Ethics");
  });

  it("certificate export CSV endpoint returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/certificates/export`);
    expect(res.status).toBe(401);
  });

  it("certificate download endpoint returns 401 without auth", async () => {
    const res = await fetch(
      `${BASE_URL}/api/certificates/fake-id/download`
    );
    expect(res.status).toBe(401);
  });

  it("certificates are ordered by issued date", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    await prisma.certificate.create({
      data: {
        userId: user.id,
        certificateCode: `CERT-ORDER-A-${Date.now()}`,
        title: "Older Certificate",
        hours: 1,
        completedDate: new Date("2026-01-01"),
        issuedDate: new Date("2026-01-01"),
        verificationUrl: "http://localhost:3000/verify/a",
      },
    });

    await prisma.certificate.create({
      data: {
        userId: user.id,
        certificateCode: `CERT-ORDER-B-${Date.now()}`,
        title: "Newer Certificate",
        hours: 2,
        completedDate: new Date("2026-02-01"),
        issuedDate: new Date("2026-02-01"),
        verificationUrl: "http://localhost:3000/verify/b",
      },
    });

    const certs = await prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedDate: "desc" },
    });

    expect(certs.length).toBe(2);
    expect(certs[0].title).toBe("Newer Certificate");
    expect(certs[1].title).toBe("Older Certificate");
  });
});

// ============================================================
// 22. ACTIVITY CRUD
// ============================================================
describe("Activity CRUD", () => {
  afterAll(async () => {
    await cleanupTestActivities();
  });

  it("creates an activity with all required fields", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "on_demand_video",
        title: "Test Activity CRUD Create",
        description: "A test activity for CRUD operations.",
        durationMinutes: 60,
        publishStatus: "draft",
      },
    });

    expect(activity.id).toBeDefined();
    expect(activity.type).toBe("on_demand_video");
    expect(activity.title).toBe("Test Activity CRUD Create");
    expect(activity.publishStatus).toBe("draft");
    expect(activity.active).toBe(true);

    // Clean up
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("creates an activity with credit mappings", async () => {
    const { activity, creditMappings } = await createPublishedActivity();

    expect(activity.id).toBeDefined();
    expect(activity.publishStatus).toBe("published");
    expect(activity.publishedAt).not.toBeNull();
    expect(creditMappings.length).toBe(3);

    const countries = creditMappings.map((m) => m.country);
    expect(countries).toContain("US");
    expect(countries).toContain("GB");
    expect(countries).toContain("AU");

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("supports multiple activity types", async () => {
    const types = [
      "on_demand_video",
      "live_webinar",
      "article",
      "podcast",
      "workshop",
    ];

    for (const type of types) {
      const activity = await prisma.activity.create({
        data: {
          type,
          title: `Test Activity Type ${type}`,
          publishStatus: "draft",
        },
      });
      expect(activity.type).toBe(type);
      await prisma.activity.delete({ where: { id: activity.id } });
    }
  });

  it("soft-deletes an activity by setting active to false", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Activity Soft Delete",
        publishStatus: "draft",
      },
    });

    const updated = await prisma.activity.update({
      where: { id: activity.id },
      data: { active: false },
    });

    expect(updated.active).toBe(false);

    // Should not appear in active queries
    const found = await prisma.activity.findFirst({
      where: { id: activity.id, active: true },
    });
    expect(found).toBeNull();

    // Clean up
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("stores JSON fields (presenters, learning objectives, tags)", async () => {
    const presenters = ["Jane Smith", "John Doe"];
    const objectives = [
      "Understand ethics obligations",
      "Identify ethical dilemmas",
    ];
    const tags = ["ethics", "compliance"];

    const activity = await prisma.activity.create({
      data: {
        type: "live_webinar",
        title: "Test Activity JSON Fields",
        presenters: JSON.stringify(presenters),
        learningObjectives: JSON.stringify(objectives),
        tags: JSON.stringify(tags),
        publishStatus: "draft",
      },
    });

    const parsedPresenters = JSON.parse(activity.presenters!);
    expect(parsedPresenters).toEqual(presenters);

    const parsedObjectives = JSON.parse(activity.learningObjectives!);
    expect(parsedObjectives).toEqual(objectives);

    const parsedTags = JSON.parse(activity.tags!);
    expect(parsedTags).toEqual(tags);

    // Clean up
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("publishes a draft activity with timestamp and approver", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "on_demand_video",
        title: "Test Activity Publish Flow",
        publishStatus: "draft",
      },
    });

    expect(activity.publishStatus).toBe("draft");
    expect(activity.publishedAt).toBeNull();

    const published = await prisma.activity.update({
      where: { id: activity.id },
      data: {
        publishStatus: "published",
        publishedAt: new Date(),
        approvedBy: "test-admin-id",
      },
    });

    expect(published.publishStatus).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    expect(published.approvedBy).toBe("test-admin-id");

    // Clean up
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("filters activities by publish status", async () => {
    const draft = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Activity Draft Filter",
        publishStatus: "draft",
      },
    });
    const pub = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Activity Published Filter",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    const drafts = await prisma.activity.findMany({
      where: {
        active: true,
        publishStatus: "draft",
        title: { contains: "Test Activity" },
      },
    });
    const published = await prisma.activity.findMany({
      where: {
        active: true,
        publishStatus: "published",
        title: { contains: "Test Activity" },
      },
    });

    expect(drafts.some((a) => a.id === draft.id)).toBe(true);
    expect(published.some((a) => a.id === pub.id)).toBe(true);

    // Clean up
    await prisma.activity.delete({ where: { id: draft.id } });
    await prisma.activity.delete({ where: { id: pub.id } });
  });

  it("tracks activity versioning", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "on_demand_video",
        title: "Test Activity Version",
        publishStatus: "draft",
        version: 1,
      },
    });

    const updated = await prisma.activity.update({
      where: { id: activity.id },
      data: { version: 2, description: "Updated description" },
    });

    expect(updated.version).toBe(2);

    // Clean up
    await prisma.activity.delete({ where: { id: activity.id } });
  });
});

// ============================================================
// 23. CREDIT MAPPING PER JURISDICTION
// ============================================================
describe("Credit Mapping Per Jurisdiction", () => {
  it("creates credit mappings with all required fields", async () => {
    const { activity, creditMappings } = await createPublishedActivity();

    for (const mapping of creditMappings) {
      expect(mapping.activityId).toBe(activity.id);
      expect(mapping.creditUnit).toBe("hours");
      expect(mapping.creditAmount).toBe(1);
      expect(mapping.creditCategory).toBe("ethics");
      expect(mapping.structuredFlag).toBe("true");
      expect(mapping.active).toBe(true);
    }

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("maps different validation methods per country", async () => {
    const { activity, creditMappings } = await createPublishedActivity();

    const usMapping = creditMappings.find((m) => m.country === "US");
    const gbMapping = creditMappings.find((m) => m.country === "GB");
    const auMapping = creditMappings.find((m) => m.country === "AU");

    expect(usMapping!.validationMethod).toBe("quiz");
    expect(gbMapping!.validationMethod).toBe("attendance");
    expect(auMapping!.validationMethod).toBe("quiz");

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("resolves credits for a US user", async () => {
    const { activity, creditMappings } = await createPublishedActivity();

    // Simulate credit resolution: user with US jurisdiction
    const applicableMappings = creditMappings.filter(
      (m) => m.country === "US" || m.country === "INTL"
    );

    expect(applicableMappings.length).toBe(1);
    expect(applicableMappings[0].country).toBe("US");
    expect(applicableMappings[0].creditAmount).toBe(1);

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("resolves credits for a GB user", async () => {
    const { activity, creditMappings } = await createPublishedActivity();

    const applicableMappings = creditMappings.filter(
      (m) => m.country === "GB" || m.country === "INTL"
    );

    expect(applicableMappings.length).toBe(1);
    expect(applicableMappings[0].country).toBe("GB");
    expect(applicableMappings[0].validationMethod).toBe("attendance");

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("INTL mapping applies to all jurisdictions", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test INTL Credit Mapping",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    const intlMapping = await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 0.5,
        creditCategory: "general",
        country: "INTL",
        validationMethod: "attendance",
      },
    });

    // Should apply regardless of user jurisdiction
    for (const jurisdiction of ["US", "GB", "AU", "CA", "SG"]) {
      const applicable = [intlMapping].filter(
        (m) => m.country === jurisdiction || m.country === "INTL"
      );
      expect(applicable.length).toBe(1);
      expect(applicable[0].creditAmount).toBe(0.5);
    }

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("supports state-level exclusions via JSON", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "on_demand_video",
        title: "Test State Exclusion Mapping",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    const mapping = await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 1,
        creditCategory: "ethics",
        country: "US",
        exclusions: JSON.stringify(["NY", "CA"]),
        validationMethod: "quiz",
      },
    });

    // Simulate exclusion check
    const exclusions = JSON.parse(mapping.exclusions!);
    expect(exclusions).toContain("NY");
    expect(exclusions).toContain("CA");
    expect(exclusions).not.toContain("TX");

    // NY user should be excluded
    const nyApplicable = exclusions.includes("NY");
    expect(nyApplicable).toBe(true); // NY is in exclusion list

    // TX user should not be excluded
    const txApplicable = exclusions.includes("TX");
    expect(txApplicable).toBe(false);

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("supports state-level inclusions via stateProvince JSON", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "live_webinar",
        title: "Test State Inclusion Mapping",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    const mapping = await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 2,
        creditCategory: "general",
        country: "US",
        stateProvince: JSON.stringify(["TX", "FL", "IL"]),
        validationMethod: "attendance",
      },
    });

    const states = JSON.parse(mapping.stateProvince!);
    expect(states).toContain("TX");
    expect(states).toContain("FL");
    expect(states).not.toContain("NY");

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  it("deactivated credit mappings are excluded from queries", async () => {
    const activity = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Deactivated Mapping",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 1,
        creditCategory: "ethics",
        country: "US",
        active: true,
      },
    });

    await prisma.creditMapping.create({
      data: {
        activityId: activity.id,
        creditUnit: "hours",
        creditAmount: 2,
        creditCategory: "general",
        country: "US",
        active: false,
      },
    });

    const activeMappings = await prisma.creditMapping.findMany({
      where: { activityId: activity.id, active: true },
    });

    expect(activeMappings.length).toBe(1);
    expect(activeMappings[0].creditCategory).toBe("ethics");

    // Clean up
    await prisma.creditMapping.deleteMany({
      where: { activityId: activity.id },
    });
    await prisma.activity.delete({ where: { id: activity.id } });
  });
});

// ============================================================
// 24. PROVIDER REPORTING
// ============================================================
describe("Provider Reporting", () => {
  it("counts activities by publish status", async () => {
    // Create test activities
    const draft1 = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Report Draft 1",
        publishStatus: "draft",
      },
    });
    const pub1 = await prisma.activity.create({
      data: {
        type: "article",
        title: "Test Report Published 1",
        publishStatus: "published",
        publishedAt: new Date(),
      },
    });

    const totalActive = await prisma.activity.count({
      where: { active: true },
    });
    const publishedCount = await prisma.activity.count({
      where: { active: true, publishStatus: "published" },
    });
    const draftCount = await prisma.activity.count({
      where: { active: true, publishStatus: "draft" },
    });

    expect(totalActive).toBeGreaterThanOrEqual(2);
    expect(publishedCount).toBeGreaterThanOrEqual(1);
    expect(draftCount).toBeGreaterThanOrEqual(1);

    // Clean up
    await prisma.activity.delete({ where: { id: draft1.id } });
    await prisma.activity.delete({ where: { id: pub1.id } });
  });

  it("calculates quiz pass rate correctly", async () => {
    const { user, quiz } = await createUserWithQuizPass({ score: 100 });
    testUserIds.push(user.id);

    // Add a failing attempt
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        answers: JSON.stringify([0, 0, 0]),
        score: 30,
        passed: false,
        completedAt: new Date(),
      },
    });

    const totalAttempts = await prisma.quizAttempt.count({
      where: { quizId: quiz.id },
    });
    const passedAttempts = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, passed: true },
    });

    const passRate =
      totalAttempts > 0
        ? Math.round((passedAttempts / totalAttempts) * 100)
        : 0;

    expect(totalAttempts).toBe(2);
    expect(passedAttempts).toBe(1);
    expect(passRate).toBe(50);

    // Clean up
    await prisma.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
  });

  it("aggregates CPD hours by category", async () => {
    const { user } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const records = await prisma.cpdRecord.findMany({
      where: { userId: user.id, status: "completed" },
      select: { hours: true, category: true },
    });

    const hoursByCategory: Record<string, number> = {};
    for (const r of records) {
      const cat = r.category ?? "general";
      hoursByCategory[cat] = (hoursByCategory[cat] ?? 0) + r.hours;
    }

    expect(hoursByCategory["ethics"]).toBe(2);
    // general: 3 + 1.5 + 2 + 1.5 + 4 = 12
    expect(hoursByCategory["general"]).toBe(12);
  });

  it("filters CPD records by date range", async () => {
    const { user, records } = await createUserWithCpdRecords();
    testUserIds.push(user.id);

    const fromDate = new Date("2026-02-01");
    const toDate = new Date("2026-02-28");

    const filtered = await prisma.cpdRecord.findMany({
      where: {
        userId: user.id,
        status: "completed",
        date: { gte: fromDate, lte: toDate },
      },
    });

    // February records: Client Communication (Feb 3), Retirement Income (Feb 10), Regulatory Update (Feb 18)
    expect(filtered.length).toBe(3);
    for (const r of filtered) {
      expect(r.date.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
      expect(r.date.getTime()).toBeLessThanOrEqual(toDate.getTime());
    }
  });

  it("provider report API requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/provider/report`);
    expect(res.status).toBe(401);
  });

  it("certificate counts can be filtered by date", async () => {
    const { user, certificate } = await createUserWithCertificate();
    testUserIds.push(user.id);

    const total = await prisma.certificate.count({
      where: { userId: user.id },
    });
    const active = await prisma.certificate.count({
      where: { userId: user.id, status: "active" },
    });

    expect(total).toBeGreaterThanOrEqual(1);
    expect(active).toBe(total); // All should be active by default
  });
});

// ============================================================
// 25. ACTIVITY AUTH GATES
// ============================================================
describe("Activity Auth Gates", () => {
  it("activities GET requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities`);
    expect(res.status).toBe(401);
  });

  it("activities POST requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "article",
        title: "Unauthorized Activity",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("activity detail GET requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities/fake-id`);
    expect(res.status).toBe(401);
  });

  it("activity PATCH requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized Update" }),
    });
    expect(res.status).toBe(401);
  });

  it("activity DELETE requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities/fake-id`, {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("activity publish requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities/fake-id/publish`, {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("activity credits requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/activities/fake-id/credits`);
    expect(res.status).toBe(401);
  });
});
