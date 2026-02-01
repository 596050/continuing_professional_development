/**
 * Completion Rules Engine
 *
 * Evaluates whether a user has met all completion criteria for a CPD activity.
 * Rules can require: quiz pass, evidence upload, watch time, or attendance.
 * When all rules for an activity pass, the activity is considered "complete"
 * and a certificate can be generated.
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
