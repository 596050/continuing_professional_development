/**
 * Quiz Pack Import Script
 *
 * Imports quiz modules from data/quiz-pack-v1.json into the database.
 * Resolves credential slugs (e.g., "CFP") to actual database credential IDs.
 *
 * Usage: npx tsx prisma/import-quizzes.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "fs";
import { join } from "path";

const adapter = new PrismaLibSql({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface QuizModule {
  title: string;
  description?: string;
  credentialSlug: string;
  category: string;
  activityType: string;
  passMark: number;
  maxAttempts: number;
  hours: number;
  questions: QuizQuestion[];
}

async function main() {
  console.log("Loading quiz pack v1...");

  const dataPath = join(process.cwd(), "data", "quiz-pack-v1.json");
  const raw = readFileSync(dataPath, "utf-8");
  const quizModules: QuizModule[] = JSON.parse(raw);

  console.log(`Found ${quizModules.length} quiz modules to import.`);

  // Build credential name-to-ID mapping
  const credentials = await prisma.credential.findMany({
    select: { id: true, name: true },
  });
  const credentialMap = new Map(credentials.map((c) => [c.name, c.id]));

  console.log(`Loaded ${credentials.length} credentials from database.`);

  let imported = 0;
  let skipped = 0;

  for (const mod of quizModules) {
    // Check if quiz already exists (by exact title)
    const existing = await prisma.quiz.findFirst({
      where: { title: mod.title },
    });

    if (existing) {
      console.log(`  SKIP: "${mod.title}" (already exists, id=${existing.id})`);
      skipped++;
      continue;
    }

    // Resolve credential ID
    const credentialId = credentialMap.get(mod.credentialSlug) ?? null;
    if (!credentialId) {
      console.warn(`  WARN: No credential found for slug "${mod.credentialSlug}". Importing without credential link.`);
    }

    // Create the quiz
    const quiz = await prisma.quiz.create({
      data: {
        title: mod.title,
        description: mod.description ?? null,
        credentialId,
        category: mod.category,
        activityType: mod.activityType,
        passMark: mod.passMark,
        maxAttempts: mod.maxAttempts,
        hours: mod.hours,
        questionsJson: JSON.stringify(mod.questions),
      },
    });

    console.log(`  OK: "${mod.title}" (${mod.questions.length} questions, ${mod.hours}h ${mod.category}) -> id=${quiz.id}`);
    imported++;
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}, Total: ${quizModules.length}`);

  // Summary by credential
  console.log("\nQuiz pack summary:");
  const byCred = new Map<string, { count: number; hours: number }>();
  for (const mod of quizModules) {
    const key = mod.credentialSlug;
    const entry = byCred.get(key) ?? { count: 0, hours: 0 };
    entry.count++;
    entry.hours += mod.hours;
    byCred.set(key, entry);
  }
  for (const [slug, { count, hours }] of byCred) {
    console.log(`  ${slug}: ${count} modules, ${hours}h total`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
