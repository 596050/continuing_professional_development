/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header against stored API key hashes.
 * Returns firm context if valid, 401/403 response if not.
 *
 * Keys are stored as SHA-256 hashes. The raw key is only returned once
 * at creation time and never stored.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface ApiKeyContext {
  firmId: string;
  keyId: string;
  permissions: string[];
}

/**
 * Hash an API key using SHA-256.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key with a recognizable prefix.
 * Format: "cpd_" + 48 random hex characters = 52 chars total.
 */
export function generateApiKey(): string {
  return `cpd_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Validate an API key from the request and check permissions.
 *
 * Returns either a valid ApiKeyContext or a NextResponse error.
 * Updates lastUsedAt on successful validation.
 */
export async function requireApiKey(
  req: Request,
  ...requiredPermissions: string[]
): Promise<ApiKeyContext | NextResponse> {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required. Provide X-API-Key header.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const keyHash = hashApiKey(apiKey);

  const storedKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!storedKey) {
    return NextResponse.json(
      { error: "Invalid API key", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (storedKey.revoked) {
    return NextResponse.json(
      { error: "API key has been revoked", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "API key has expired", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Parse permissions
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(storedKey.permissions);
  } catch {
    permissions = [];
  }

  // Check required permissions
  for (const perm of requiredPermissions) {
    if (!permissions.includes(perm)) {
      return NextResponse.json(
        {
          error: `Missing required permission: ${perm}`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }
  }

  // Update lastUsedAt (non-blocking)
  prisma.apiKey
    .update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Silently ignore update failures - do not block the request
    });

  return {
    firmId: storedKey.firmId,
    keyId: storedKey.id,
    permissions,
  };
}
