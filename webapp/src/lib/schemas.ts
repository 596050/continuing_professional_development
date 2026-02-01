/**
 * Shared Zod schemas for API input validation.
 *
 * All API routes should import from here for consistent validation.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enums / constants
// ---------------------------------------------------------------------------

export const ACTIVITY_TYPES = [
  "structured",
  "unstructured",
  "participatory",
  "verifiable",
  "non-verifiable",
] as const;

export const CPD_CATEGORIES = [
  "ethics",
  "technical",
  "general",
  "firm_element",
  "practice_mgmt",
  "professionalism",
  "other",
] as const;

export const CPD_STATUSES = [
  "completed",
  "in_progress",
  "planned",
  "upcoming",
] as const;

export const EVIDENCE_KINDS = [
  "certificate",
  "transcript",
  "agenda",
  "screenshot",
  "other",
] as const;

export const EVIDENCE_STATUSES = ["inbox", "assigned", "deleted"] as const;

export const EVIDENCE_STRENGTHS = [
  "manual_only",
  "url_only",
  "certificate_attached",
  "provider_verified",
] as const;

export const REMINDER_TYPES = ["deadline", "progress", "custom"] as const;
export const REMINDER_CHANNELS = ["email", "calendar", "both"] as const;

export const NOTIFICATION_TYPES = [
  "deadline_warning",
  "evidence_match",
  "import_complete",
  "certificate_issued",
  "plan_upgraded",
  "general",
] as const;

export const USER_ROLES = [
  "user",
  "admin",
  "firm_admin",
  "firm_member",
] as const;

export const CONTENT_TYPES = [
  "live_webinar",
  "on_demand_video",
  "article",
  "assessment_only",
  "bundle",
] as const;

export const PUBLISH_STATUSES = [
  "draft",
  "review",
  "published",
  "archived",
] as const;

// ---------------------------------------------------------------------------
// Evidence strength ranking (reusable helper)
// ---------------------------------------------------------------------------
export const EVIDENCE_STRENGTH_RANK: Record<string, number> = {
  manual_only: 0,
  url_only: 1,
  certificate_attached: 2,
  provider_verified: 3,
};

// ---------------------------------------------------------------------------
// Shared refinements
// ---------------------------------------------------------------------------

const safeString = (max = 500) =>
  z.string().trim().min(1).max(max);

const optionalSafeString = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform(v => v || undefined);

// ---------------------------------------------------------------------------
// CPD Record schemas
// ---------------------------------------------------------------------------

export const createCpdRecordSchema = z.object({
  title: safeString(300),
  provider: optionalSafeString(200),
  activityType: z.enum(ACTIVITY_TYPES),
  hours: z.coerce.number().gt(0, "Hours must be greater than 0").lte(100, "Hours must not exceed 100"),
  date: z.coerce.date({ message: "Invalid date" }),
  status: z.enum(CPD_STATUSES).default("completed"),
  category: z.enum(CPD_CATEGORIES).default("general"),
  learningOutcome: optionalSafeString(2000),
  notes: optionalSafeString(5000),
});

export const updateCpdRecordSchema = z.object({
  title: safeString(300).optional(),
  provider: optionalSafeString(200),
  activityType: z.enum(ACTIVITY_TYPES).optional(),
  hours: z.coerce.number().gt(0).lte(100).optional(),
  date: z.coerce.date().optional(),
  status: z.enum(CPD_STATUSES).optional(),
  category: z.enum(CPD_CATEGORIES).optional(),
  learningOutcome: optionalSafeString(2000),
  notes: optionalSafeString(5000),
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: "At least one field must be provided",
});

// ---------------------------------------------------------------------------
// Reminder schemas
// ---------------------------------------------------------------------------

export const createReminderSchema = z.object({
  type: z.enum(REMINDER_TYPES),
  title: safeString(300),
  message: optionalSafeString(2000),
  triggerDate: z.coerce.date({ message: "Invalid trigger date" }),
  channel: z.enum(REMINDER_CHANNELS).default("email"),
  credentialId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Notification schemas
// ---------------------------------------------------------------------------

export const markNotificationsReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }),
]);

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const signupSchema = z.object({
  name: optionalSafeString(200),
  email: z.string().trim().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// ---------------------------------------------------------------------------
// Activity schemas
// ---------------------------------------------------------------------------

export const createActivitySchema = z.object({
  type: z.enum(CONTENT_TYPES),
  title: safeString(300),
  description: optionalSafeString(5000),
  presenters: z.array(z.string().max(200)).max(20).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(10000).optional(),
  learningObjectives: z.array(z.string().max(500)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  jurisdictions: z.array(z.string().max(10)).max(50).optional(),
  creditMappings: z.array(z.object({
    creditUnit: z.string().max(20).default("hours"),
    creditAmount: z.coerce.number().gt(0).lte(100),
    creditCategory: z.string().max(50),
    structuredFlag: z.string().max(20).default("true"),
    country: z.string().max(10),
    stateProvince: z.array(z.string().max(10)).optional(),
    exclusions: z.array(z.string().max(10)).optional(),
    validationMethod: z.string().max(30).default("attendance"),
    credentialId: z.string().max(100).optional(),
  })).max(50).optional(),
});

// ---------------------------------------------------------------------------
// Evidence upload metadata schema
// ---------------------------------------------------------------------------

export const evidenceMetadataSchema = z.object({
  date: z.string().optional(),
  hours: z.coerce.number().optional(),
  provider: z.string().max(200).optional(),
  learningOutcome: z.string().max(2000).optional(),
}).optional();

// ---------------------------------------------------------------------------
// Allocation schemas
// ---------------------------------------------------------------------------

export const saveAllocationsSchema = z.object({
  allocations: z.array(z.object({
    cpdRecordId: z.string().min(1),
    userCredentialId: z.string().min(1),
    hours: z.coerce.number().gt(0).lte(100),
  })).max(100),
});

// ---------------------------------------------------------------------------
// Onboarding schema
// ---------------------------------------------------------------------------

export const onboardingSchema = z.object({
  fullName: optionalSafeString(200),
  email: z.string().trim().email().max(254).optional(),
  role: optionalSafeString(100),
  credential: optionalSafeString(200),
  additionalCredentials: z.array(z.string().max(200)).max(20).optional(),
  jurisdiction: optionalSafeString(100),
  renewalDeadline: z.string().optional(),
  currentHoursCompleted: z.union([z.string(), z.number()]).optional(),
  preferredLearningFormat: z.array(z.string().max(100)).max(10).optional(),
  biggestPainPoint: optionalSafeString(2000),
});

// ---------------------------------------------------------------------------
// Quiz schemas
// ---------------------------------------------------------------------------

const quizQuestionSchema = z.object({
  question: safeString(1000),
  options: z.array(z.string().max(500)).min(2).max(10),
  correctIndex: z.number().int().min(0),
  explanation: z.string().max(2000).optional(),
});

export const createQuizSchema = z.object({
  title: safeString(300),
  description: optionalSafeString(5000),
  credentialId: z.string().optional(),
  activityType: z.string().max(50).optional(),
  passMark: z.coerce.number().int().min(0).max(100).default(70),
  maxAttempts: z.coerce.number().int().min(1).max(100).default(3),
  timeLimit: z.coerce.number().int().min(1).max(600).optional(),
  hours: z.coerce.number().min(0).max(100).default(0),
  category: z.string().max(50).optional(),
  questions: z.array(quizQuestionSchema).min(1).max(200),
});

export const updateQuizSchema = z.object({
  title: safeString(300).optional(),
  description: optionalSafeString(5000),
  passMark: z.coerce.number().int().min(0).max(100).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(100).optional(),
  timeLimit: z.coerce.number().int().min(1).max(600).nullable().optional(),
  hours: z.coerce.number().min(0).max(100).optional(),
  category: z.string().max(50).nullable().optional(),
  activityType: z.string().max(50).nullable().optional(),
  questionsJson: z.string().max(100000).optional(),
  active: z.boolean().optional(),
});

export const submitQuizAttemptSchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1).max(200),
});

// ---------------------------------------------------------------------------
// Certificate schemas
// ---------------------------------------------------------------------------

export const createCertificateSchema = z.object({
  cpdRecordId: z.string().optional(),
  title: safeString(300),
  hours: z.coerce.number().min(0).max(1000),
  category: z.string().max(50).optional(),
  activityType: z.string().max(50).optional(),
  provider: z.string().max(200).optional(),
  completedDate: z.coerce.date({ message: "Invalid date" }),
  quizScore: z.coerce.number().min(0).max(100).optional(),
});

export const updateCertificateSchema = z.object({
  status: z.enum(["active", "revoked"]),
});

// ---------------------------------------------------------------------------
// Evidence update schema
// ---------------------------------------------------------------------------

export const updateEvidenceSchema = z.object({
  fileName: z.string().max(255).optional(),
  metadata: z.string().max(10000).nullable().optional(),
  extractedMetadata: z.union([z.string().max(10000), z.record(z.string(), z.unknown())]).nullable().optional(),
  kind: z.enum(EVIDENCE_KINDS).optional(),
  status: z.enum(EVIDENCE_STATUSES).optional(),
  cpdRecordId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Rule pack schemas
// ---------------------------------------------------------------------------

export const createRulePackSchema = z.object({
  credentialId: z.string().min(1),
  name: safeString(300),
  rules: z.union([z.string().max(50000), z.record(z.string(), z.unknown()), z.array(z.unknown())]),
  effectiveFrom: z.coerce.date({ message: "Invalid date" }),
  effectiveTo: z.coerce.date().optional(),
  changelog: optionalSafeString(5000),
});

export const updateRulePackSchema = z.object({
  name: safeString(300).optional(),
  rules: z.union([z.string().max(50000), z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
  changelog: optionalSafeString(5000),
});

// ---------------------------------------------------------------------------
// Settings update schema
// ---------------------------------------------------------------------------

export const updateSettingsSchema = z.object({
  name: z.string().trim().max(200).optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) return false;
    if (data.currentPassword && !data.newPassword) return false;
    return true;
  },
  { message: "Both currentPassword and newPassword must be provided together" }
);

// ---------------------------------------------------------------------------
// Completion rule schema
// ---------------------------------------------------------------------------

export const createCompletionRuleSchema = z.object({
  cpdRecordId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Transcript import schemas
// ---------------------------------------------------------------------------

export const transcriptImportSchema = z.object({
  sourceCode: safeString(100),
  content: z.string().min(1),
  fileName: z.string().max(255).optional(),
});

export const confirmImportSchema = z.object({
  entries: z.array(z.object({
    index: z.number().int().min(0),
    credentialId: z.string().optional(),
    category: z.string().max(50).optional(),
    include: z.boolean().optional(),
  })).optional(),
});

// ---------------------------------------------------------------------------
// Firm compliance risk scoring schemas
// ---------------------------------------------------------------------------

export const FIRM_ALERT_TYPES = [
  "compliance_risk",
  "deadline_approaching",
  "member_overdue",
  "milestone",
] as const;

export const FIRM_ALERT_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const firmAlertsQuerySchema = z.object({
  read: z.enum(["true", "false"]).optional(),
  type: z.string().max(50).optional(),
  severity: z.string().max(20).optional(),
});

export const firmAlertsPatchSchema = z.object({
  alertIds: z.array(z.string().min(1)).min(1).max(100),
  read: z.boolean().optional(),
  resolvedAt: z.string().optional(),
});

export const complianceSnapshotQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function parsePagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") ?? "1") || 1;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20") || 20, 100);
  return { page: Math.max(1, page), limit, skip: (Math.max(1, page) - 1) * limit };
}

// ---------------------------------------------------------------------------
// Marketplace schemas
// ---------------------------------------------------------------------------

export const MARKETPLACE_CATEGORIES = [
  "ethics",
  "technical",
  "general",
  "structured",
  "unstructured",
] as const;

export const MARKETPLACE_ACTIVITY_TYPES = [
  "webinar",
  "course",
  "workshop",
  "self_study",
  "conference",
] as const;

export const MARKETPLACE_LISTING_STATUSES = [
  "draft",
  "published",
  "archived",
  "cancelled",
] as const;

export const MARKETPLACE_ENROLLMENT_STATUSES = [
  "enrolled",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
] as const;

export const createMarketplaceListingSchema = z.object({
  title: safeString(300),
  description: optionalSafeString(5000),
  category: z.enum(MARKETPLACE_CATEGORIES),
  activityType: z.enum(MARKETPLACE_ACTIVITY_TYPES),
  hours: z.coerce.number().gt(0, "Hours must be greater than 0").lte(100, "Hours must not exceed 100"),
  price: z.coerce.number().min(0, "Price cannot be negative").max(99999).default(0),
  currency: z.string().max(10).default("USD"),
  credentialIds: z.array(z.string().max(100)).max(50).optional(),
  maxEnrollment: z.coerce.number().int().min(1).max(100000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  enrollmentDeadline: z.coerce.date().optional(),
  thumbnailUrl: z.string().url().max(2000).optional(),
  syllabus: z.array(z.string().max(500)).max(100).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
});

export const updateMarketplaceListingSchema = z.object({
  title: safeString(300).optional(),
  description: optionalSafeString(5000),
  category: z.enum(MARKETPLACE_CATEGORIES).optional(),
  activityType: z.enum(MARKETPLACE_ACTIVITY_TYPES).optional(),
  hours: z.coerce.number().gt(0).lte(100).optional(),
  price: z.coerce.number().min(0).max(99999).optional(),
  currency: z.string().max(10).optional(),
  credentialIds: z.array(z.string().max(100)).max(50).optional(),
  maxEnrollment: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  enrollmentDeadline: z.coerce.date().nullable().optional(),
  status: z.enum(MARKETPLACE_LISTING_STATUSES).optional(),
  thumbnailUrl: z.string().url().max(2000).nullable().optional(),
  syllabus: z.array(z.string().max(500)).max(100).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  featured: z.boolean().optional(),
});

export const marketplaceSearchSchema = z.object({
  category: z.enum(MARKETPLACE_CATEGORIES).optional(),
  activityType: z.enum(MARKETPLACE_ACTIVITY_TYPES).optional(),
  credential: z.string().max(100).optional(),
  minHours: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
});

export const enrollmentCompleteSchema = z.object({
  notes: optionalSafeString(5000),
});

// ---------------------------------------------------------------------------
// API Key schemas
// ---------------------------------------------------------------------------

export const API_KEY_PERMISSIONS = [
  "read:employees",
  "read:compliance",
  "webhook:manage",
] as const;

export const createApiKeySchema = z.object({
  name: safeString(200),
  permissions: z
    .array(z.enum(API_KEY_PERMISSIONS))
    .min(1, "At least one permission is required")
    .max(10),
});

// ---------------------------------------------------------------------------
// Webhook schemas
// ---------------------------------------------------------------------------

export const WEBHOOK_EVENTS = [
  "compliance_changed",
  "deadline_approaching",
  "member_added",
] as const;

export const createWebhookSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .max(2000)
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "At least one event is required")
    .max(20),
});

// ---------------------------------------------------------------------------
// External API query schemas
// ---------------------------------------------------------------------------

export const externalEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const externalComplianceQuerySchema = z.object({
  userId: z.string().max(100).optional(),
});
