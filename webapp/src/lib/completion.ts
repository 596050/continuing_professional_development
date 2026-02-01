/**
 * Completion Rules Engine
 *
 * This module is the gatekeeper between "a user did an activity" and "a user
 * earned a certificate." It evaluates CompletionRule records attached to a
 * CpdRecord and returns a pass/fail for each rule, plus an overall eligibility
 * decision.
 *
 * WHY THIS EXISTS:
 * Different CPD activities have different evidence requirements. A live
 * webinar might only need attendance confirmation. An on-demand video needs
 * watch-time tracking. An ethics course needs a passing quiz score. Some
 * activities require MULTIPLE conditions (quiz + evidence). This engine
 * evaluates them all with AND logic: every rule must pass.
 *
 * RULE TYPES:
 *   quiz_pass       - User passed a specific quiz with score >= minScore
 *   evidence_upload - User uploaded N files (optionally of required types)
 *   watch_time      - User watched >= N% of a video (tracked in record.notes)
 *   attendance      - User confirmed attendance (stored in record.notes)
 *
 * DESIGN DECISIONS:
 * - Rules are linked to CpdRecords, not Activities, because the same activity
 *   can produce different records for different users/credentials.
 * - If no rules are defined, the activity is auto-complete. This supports
 *   manual CPD logging where the adviser is trusted to self-report.
 * - Watch time and attendance data are stored in CpdRecord.notes as JSON
 *   because these are transient metadata, not separate entities.
 * - The engine returns detailed evaluation results so the UI can show exactly
 *   which requirements are met and which are pending.
 *
 * USAGE:
 *   const result = await evaluateCompletionRules(userId, cpdRecordId);
 *   if (result.eligibleForCertificate) {
 *     // Generate certificate via POST /api/completion
 *   }
 */

import { prisma } from "@/lib/db";

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  passed: boolean;
  detail: string;
}

export interface CompletionCheckResult {
  allPassed: boolean;
  rules: RuleEvaluation[];
  eligibleForCertificate: boolean;
}

interface QuizPassConfig {
  quizId: string;
  minScore?: number;
}

interface EvidenceUploadConfig {
  minFiles?: number;
  requiredTypes?: string[];
}

interface WatchTimeConfig {
  minWatchPercent: number;
}

interface AttendanceConfig {
  confirmationRequired: boolean;
}

export async function evaluateCompletionRules(
  userId: string,
  cpdRecordId: string
): Promise<CompletionCheckResult> {
  // Find rules linked to this CPD record
  const rules = await prisma.completionRule.findMany({
    where: {
      cpdRecordId,
      active: true,
    },
  });

  // If no rules defined, activity is complete by default (manual logging)
  if (rules.length === 0) {
    return {
      allPassed: true,
      rules: [],
      eligibleForCertificate: true,
    };
  }

  const evaluations: RuleEvaluation[] = [];

  for (const rule of rules) {
    const config = JSON.parse(rule.config);
    let passed = false;
    let detail = "";

    switch (rule.ruleType) {
      case "quiz_pass": {
        const qConfig = config as QuizPassConfig;
        const bestAttempt = await prisma.quizAttempt.findFirst({
          where: {
            userId,
            quizId: qConfig.quizId,
            passed: true,
          },
          orderBy: { score: "desc" },
        });

        if (bestAttempt) {
          const minScore = qConfig.minScore ?? 0;
          passed = bestAttempt.score >= minScore;
          detail = `Score: ${bestAttempt.score}% (required: ${minScore}%)`;
        } else {
          detail = "No passing attempt found";
        }
        break;
      }

      case "evidence_upload": {
        const eConfig = config as EvidenceUploadConfig;
        const evidence = await prisma.evidence.findMany({
          where: { userId, cpdRecordId },
        });

        const minFiles = eConfig.minFiles ?? 1;
        if (evidence.length >= minFiles) {
          if (eConfig.requiredTypes && eConfig.requiredTypes.length > 0) {
            const uploadedTypes = new Set(evidence.map((e) => e.fileType));
            passed = eConfig.requiredTypes.every((t) => uploadedTypes.has(t));
            detail = passed
              ? `${evidence.length} file(s) uploaded with required types`
              : `Missing required file types: ${eConfig.requiredTypes.filter((t) => !uploadedTypes.has(t)).join(", ")}`;
          } else {
            passed = true;
            detail = `${evidence.length} file(s) uploaded (required: ${minFiles})`;
          }
        } else {
          detail = `${evidence.length} file(s) uploaded (required: ${minFiles})`;
        }
        break;
      }

      case "watch_time": {
        const wConfig = config as WatchTimeConfig;
        // Check the CPD record metadata for watch progress
        const record = await prisma.cpdRecord.findUnique({
          where: { id: cpdRecordId },
        });
        if (record?.notes) {
          try {
            const meta = JSON.parse(record.notes);
            const watchPercent = meta.watchPercent ?? 0;
            passed = watchPercent >= wConfig.minWatchPercent;
            detail = `Watched: ${watchPercent}% (required: ${wConfig.minWatchPercent}%)`;
          } catch {
            detail = "No watch time data found";
          }
        } else {
          detail = "No watch time data found";
        }
        break;
      }

      case "attendance": {
        const aConfig = config as AttendanceConfig;
        if (aConfig.confirmationRequired) {
          // Check for attendance confirmation in record notes
          const record = await prisma.cpdRecord.findUnique({
            where: { id: cpdRecordId },
          });
          if (record?.notes) {
            try {
              const meta = JSON.parse(record.notes);
              passed = meta.attendanceConfirmed === true;
              detail = passed
                ? "Attendance confirmed"
                : "Attendance not yet confirmed";
            } catch {
              detail = "No attendance data found";
            }
          } else {
            detail = "No attendance data found";
          }
        } else {
          // No confirmation needed, auto-pass
          passed = true;
          detail = "No confirmation required";
        }
        break;
      }

      default:
        detail = `Unknown rule type: ${rule.ruleType}`;
    }

    evaluations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      passed,
      detail,
    });
  }

  const allPassed = evaluations.every((e) => e.passed);

  return {
    allPassed,
    rules: evaluations,
    eligibleForCertificate: allPassed,
  };
}
