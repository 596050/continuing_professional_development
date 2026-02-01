import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import Database from "libsql";

// Configure SQLite for better concurrency (WAL mode + busy timeout)
// WAL mode persists in the database file and improves concurrent read/write.
try {
  const rawDb = new Database(process.env.DATABASE_PATH ?? "dev.db");
  rawDb.pragma("busy_timeout = 5000");
  rawDb.pragma("journal_mode = WAL");
  rawDb.close();
} catch {
  // May fail if database is locked by another process; WAL persists once set
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Override PrismaLibSql to use the project's @libsql/client (0.17.0) instead of
// the adapter's bundled version (0.8.1). This ensures consistent WAL snapshot
// visibility across all processes accessing the same SQLite file.
class AppPrismaLibSql extends (PrismaLibSql as unknown as {
  new (config: { url: string }): {
    connect(): Promise<unknown>;
    connectToShadowDb(): Promise<unknown>;
    createClient(config: { url: string }): unknown;
  };
}) {
  createClient(config: { url: string }) {
    return createClient(config);
  }
}

function createPrismaClient() {
  const adapter = new AppPrismaLibSql({
    url: "file:" + (process.env.DATABASE_PATH ?? "dev.db"),
  }) as unknown as PrismaLibSql;
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
