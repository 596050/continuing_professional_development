import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import Database from "libsql";

// Configure SQLite for better concurrency (WAL mode + busy timeout)
// WAL mode persists in the database file and improves concurrent read/write.
try {
  const rawDb = new Database("dev.db");
  rawDb.pragma("busy_timeout = 5000");
  rawDb.pragma("journal_mode = WAL");
  rawDb.close();
} catch {
  // May fail if database is locked by another process; WAL persists once set
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: "file:dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
