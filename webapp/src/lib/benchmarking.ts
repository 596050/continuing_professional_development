/**
 * Peer Benchmarking Utilities
 *
 * Provides functions for calculating user percentiles relative to peers
 * who hold the same credential, and for generating pre-computed benchmark
 * snapshots that power the benchmarking API without expensive real-time
 * aggregation.
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Percentile calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the percentile rank of a value within a sorted array.
 * Uses the "percentage of values below" method.
 * Returns a number between 0 and 100.
 */
export function calculatePercentile(
  value: number,
  sortedValues: number[]
): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return value >= sortedValues[0] ? 100 : 0;

  let countBelow = 0;
  for (const v of sortedValues) {
    if (v < value) countBelow++;
  }

  return Math.round((countBelow / sortedValues.length) * 100);
}

/**
 * Get a specific percentile value from a sorted array.
 * For example, getPercentileValue(sorted, 25) returns the 25th percentile.
 */
export function getPercentileValue(
  sortedValues: number[],
  percentile: number
): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

// ---------------------------------------------------------------------------
// User benchmark lookup
// ---------------------------------------------------------------------------

export interface UserBenchmarkResult {
  credentialName: string;
  jurisdiction: string | null;
  userHours: number;
  userEthicsHours: number;
  userStructuredHours: number;
  percentile: number;
  ethicsPercentile: number;
  structuredPercentile: number;
  avgHours: number;
  medianHours: number;
  p25: number;
  p75: number;
  p90: number;
  avgEthicsHours: number;
  avgStructuredHours: number;
  totalPeers: number;
  message: string;
}

/**
 * Get benchmark data for a user's specific credential.
 *
 * First checks for a pre-computed BenchmarkSnapshot. If none exists,
 * calculates on-the-fly from CpdRecord aggregation.
 */
export async function getUserBenchmark(
  userId: string,
  credentialId: string
): Promise<UserBenchmarkResult | null> {
  // Load the user's credential and the credential details
  const userCredential = await prisma.userCredential.findUnique({
    where: {
      userId_credentialId: { userId, credentialId },
    },
    include: { credential: true },
  });

  if (!userCredential) return null;

  const credential = userCredential.credential;
  const jurisdiction = userCredential.jurisdiction;

  // Calculate the user's total hours from completed CPD records
  const userRecords = await prisma.cpdRecord.findMany({
    where: { userId, status: "completed" },
  });

  const userHours = userRecords.reduce((sum, r) => sum + r.hours, 0);
  const userEthicsHours = userRecords
    .filter((r) => r.category === "ethics")
    .reduce((sum, r) => sum + r.hours, 0);
  const userStructuredHours = userRecords
    .filter(
      (r) => r.activityType === "structured" || r.activityType === "verifiable"
    )
    .reduce((sum, r) => sum + r.hours, 0);

  // Try to find a pre-computed snapshot
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  const snapshot = await prisma.benchmarkSnapshot.findUnique({
    where: {
      credentialId_jurisdiction_period: {
        credentialId,
        jurisdiction: jurisdiction ?? "ALL",
        period: currentPeriod,
      },
    },
  });

  if (snapshot) {
    // Use pre-computed data
    const percentile = calculatePercentileFromSnapshot(userHours, snapshot);
    const message = generateMessage(
      percentile,
      credential.name,
      jurisdiction,
      "total hours"
    );

    return {
      credentialName: credential.name,
      jurisdiction,
      userHours,
      userEthicsHours,
      userStructuredHours,
      percentile,
      ethicsPercentile: 0, // Snapshots do not store per-user ethics distribution
      structuredPercentile: 0,
      avgHours: snapshot.avgHours,
      medianHours: snapshot.medianHours,
      p25: snapshot.p25Hours,
      p75: snapshot.p75Hours,
      p90: snapshot.p90Hours,
      avgEthicsHours: snapshot.avgEthicsHours,
      avgStructuredHours: snapshot.avgStructuredHours,
      totalPeers: snapshot.totalUsers,
      message,
    };
  }

  // No snapshot - calculate on-the-fly
  return calculateOnTheFly(
    userId,
    credentialId,
    credential.name,
    jurisdiction,
    userHours,
    userEthicsHours,
    userStructuredHours
  );
}

// ---------------------------------------------------------------------------
// On-the-fly calculation
// ---------------------------------------------------------------------------

async function calculateOnTheFly(
  userId: string,
  credentialId: string,
  credentialName: string,
  jurisdiction: string | null,
  userHours: number,
  userEthicsHours: number,
  userStructuredHours: number
): Promise<UserBenchmarkResult> {
  // Find all users who hold this credential
  const peerCredentials = await prisma.userCredential.findMany({
    where: { credentialId },
    select: { userId: true },
  });

  const peerUserIds = peerCredentials.map((pc) => pc.userId);

  // Aggregate hours for each peer
  const peerData = await Promise.all(
    peerUserIds.map(async (peerId) => {
      const records = await prisma.cpdRecord.findMany({
        where: { userId: peerId, status: "completed" },
      });
      const totalHours = records.reduce((s, r) => s + r.hours, 0);
      const ethicsHours = records
        .filter((r) => r.category === "ethics")
        .reduce((s, r) => s + r.hours, 0);
      const structuredHours = records
        .filter(
          (r) =>
            r.activityType === "structured" || r.activityType === "verifiable"
        )
        .reduce((s, r) => s + r.hours, 0);
      return { totalHours, ethicsHours, structuredHours };
    })
  );

  const sortedTotal = peerData.map((d) => d.totalHours).sort((a, b) => a - b);
  const sortedEthics = peerData
    .map((d) => d.ethicsHours)
    .sort((a, b) => a - b);
  const sortedStructured = peerData
    .map((d) => d.structuredHours)
    .sort((a, b) => a - b);

  const totalPeers = peerData.length;
  const avgHours =
    totalPeers > 0
      ? peerData.reduce((s, d) => s + d.totalHours, 0) / totalPeers
      : 0;
  const avgEthicsHours =
    totalPeers > 0
      ? peerData.reduce((s, d) => s + d.ethicsHours, 0) / totalPeers
      : 0;
  const avgStructuredHours =
    totalPeers > 0
      ? peerData.reduce((s, d) => s + d.structuredHours, 0) / totalPeers
      : 0;

  const medianHours = getPercentileValue(sortedTotal, 50);
  const p25 = getPercentileValue(sortedTotal, 25);
  const p75 = getPercentileValue(sortedTotal, 75);
  const p90 = getPercentileValue(sortedTotal, 90);

  const percentile = calculatePercentile(userHours, sortedTotal);
  const ethicsPercentile = calculatePercentile(userEthicsHours, sortedEthics);
  const structuredPercentile = calculatePercentile(
    userStructuredHours,
    sortedStructured
  );

  const message = generateMessage(
    percentile,
    credentialName,
    jurisdiction,
    "total hours"
  );

  return {
    credentialName,
    jurisdiction,
    userHours,
    userEthicsHours,
    userStructuredHours,
    percentile,
    ethicsPercentile,
    structuredPercentile,
    avgHours: Math.round(avgHours * 100) / 100,
    medianHours: Math.round(medianHours * 100) / 100,
    p25: Math.round(p25 * 100) / 100,
    p75: Math.round(p75 * 100) / 100,
    p90: Math.round(p90 * 100) / 100,
    avgEthicsHours: Math.round(avgEthicsHours * 100) / 100,
    avgStructuredHours: Math.round(avgStructuredHours * 100) / 100,
    totalPeers,
    message,
  };
}

// ---------------------------------------------------------------------------
// Snapshot generation
// ---------------------------------------------------------------------------

/**
 * Generate (or update) a BenchmarkSnapshot for a given credential and period.
 * Aggregates all users holding that credential and computes distribution stats.
 */
export async function generateBenchmarkSnapshot(
  credentialId: string,
  period: string,
  jurisdiction?: string
): Promise<void> {
  // Find all users holding this credential
  const userCredentials = await prisma.userCredential.findMany({
    where: {
      credentialId,
      ...(jurisdiction ? { jurisdiction } : {}),
    },
    select: { userId: true },
  });

  const peerUserIds = userCredentials.map((uc) => uc.userId);

  if (peerUserIds.length === 0) return;

  // Aggregate hours for each user
  const peerData = await Promise.all(
    peerUserIds.map(async (uid) => {
      const records = await prisma.cpdRecord.findMany({
        where: { userId: uid, status: "completed" },
      });
      const totalHours = records.reduce((s, r) => s + r.hours, 0);
      const ethicsHours = records
        .filter((r) => r.category === "ethics")
        .reduce((s, r) => s + r.hours, 0);
      const structuredHours = records
        .filter(
          (r) =>
            r.activityType === "structured" || r.activityType === "verifiable"
        )
        .reduce((s, r) => s + r.hours, 0);
      return { totalHours, ethicsHours, structuredHours };
    })
  );

  const totalUsers = peerData.length;
  const sortedTotal = peerData.map((d) => d.totalHours).sort((a, b) => a - b);

  const avgHours =
    peerData.reduce((s, d) => s + d.totalHours, 0) / totalUsers;
  const avgEthicsHours =
    peerData.reduce((s, d) => s + d.ethicsHours, 0) / totalUsers;
  const avgStructuredHours =
    peerData.reduce((s, d) => s + d.structuredHours, 0) / totalUsers;

  const medianHours = getPercentileValue(sortedTotal, 50);
  const p25Hours = getPercentileValue(sortedTotal, 25);
  const p75Hours = getPercentileValue(sortedTotal, 75);
  const p90Hours = getPercentileValue(sortedTotal, 90);

  const jurisdictionKey = jurisdiction ?? "ALL";

  await prisma.benchmarkSnapshot.upsert({
    where: {
      credentialId_jurisdiction_period: {
        credentialId,
        jurisdiction: jurisdictionKey,
        period,
      },
    },
    update: {
      totalUsers,
      avgHours: Math.round(avgHours * 100) / 100,
      medianHours: Math.round(medianHours * 100) / 100,
      p25Hours: Math.round(p25Hours * 100) / 100,
      p75Hours: Math.round(p75Hours * 100) / 100,
      p90Hours: Math.round(p90Hours * 100) / 100,
      avgEthicsHours: Math.round(avgEthicsHours * 100) / 100,
      avgStructuredHours: Math.round(avgStructuredHours * 100) / 100,
      calculatedAt: new Date(),
    },
    create: {
      credentialId,
      jurisdiction: jurisdictionKey,
      period,
      totalUsers,
      avgHours: Math.round(avgHours * 100) / 100,
      medianHours: Math.round(medianHours * 100) / 100,
      p25Hours: Math.round(p25Hours * 100) / 100,
      p75Hours: Math.round(p75Hours * 100) / 100,
      p90Hours: Math.round(p90Hours * 100) / 100,
      avgEthicsHours: Math.round(avgEthicsHours * 100) / 100,
      avgStructuredHours: Math.round(avgStructuredHours * 100) / 100,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculatePercentileFromSnapshot(
  userHours: number,
  snapshot: { p25Hours: number; p75Hours: number; p90Hours: number; medianHours: number; avgHours: number }
): number {
  // Estimate percentile from snapshot percentile markers
  if (userHours <= snapshot.p25Hours) {
    return userHours === 0 && snapshot.p25Hours === 0 ? 0 : Math.round((userHours / Math.max(snapshot.p25Hours, 0.01)) * 25);
  }
  if (userHours <= snapshot.medianHours) {
    const range = snapshot.medianHours - snapshot.p25Hours;
    if (range === 0) return 50;
    return 25 + Math.round(((userHours - snapshot.p25Hours) / range) * 25);
  }
  if (userHours <= snapshot.p75Hours) {
    const range = snapshot.p75Hours - snapshot.medianHours;
    if (range === 0) return 75;
    return 50 + Math.round(((userHours - snapshot.medianHours) / range) * 25);
  }
  if (userHours <= snapshot.p90Hours) {
    const range = snapshot.p90Hours - snapshot.p75Hours;
    if (range === 0) return 90;
    return 75 + Math.round(((userHours - snapshot.p75Hours) / range) * 15);
  }
  return 95; // Above p90
}

function generateMessage(
  percentile: number,
  credentialName: string,
  jurisdiction: string | null,
  metric: string
): string {
  const locationStr = jurisdiction ? ` in ${jurisdiction}` : "";
  if (percentile >= 90) {
    return `You are in the top 10% for ${metric} among ${credentialName} holders${locationStr}`;
  }
  if (percentile >= 75) {
    return `You are in the top 25% for ${metric} among ${credentialName} holders${locationStr}`;
  }
  if (percentile >= 50) {
    return `You are above the median for ${metric} among ${credentialName} holders${locationStr}`;
  }
  if (percentile >= 25) {
    return `You are in the lower half for ${metric} among ${credentialName} holders${locationStr}`;
  }
  return `You are in the bottom 25% for ${metric} among ${credentialName} holders${locationStr}`;
}
