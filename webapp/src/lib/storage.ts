/**
 * Storage abstraction layer.
 *
 * Supports local filesystem (development) and S3-compatible storage (production).
 * Set UPLOAD_PROVIDER=s3 and configure AWS_* env vars for production.
 *
 * Usage:
 *   import { storage } from "@/lib/storage";
 *   await storage.put("uploads/user123/file.pdf", buffer);
 *   const data = await storage.get("uploads/user123/file.pdf");
 *   await storage.del("uploads/user123/file.pdf");
 *   const url = await storage.url("uploads/user123/file.pdf");
 */

import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import path from "path";

interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  del(key: string): Promise<void>;
  url(key: string, expiresIn?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Local filesystem provider (development)
// ---------------------------------------------------------------------------
class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? process.cwd();
  }

  async put(key: string, data: Buffer): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);
    return readFile(fullPath);
  }

  async del(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await unlink(fullPath);
    } catch {
      // File may not exist
    }
  }

  async url(key: string): Promise<string> {
    // For local dev, return a relative path
    return `/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, key);
      await readFile(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// S3-compatible provider (production)
// ---------------------------------------------------------------------------
class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint: string | undefined;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET ?? "auditreadycpd-uploads";
    this.region = process.env.AWS_REGION ?? "eu-west-1";
    this.endpoint = process.env.AWS_S3_ENDPOINT; // For R2/MinIO
  }

  private getBaseUrl(): string {
    if (this.endpoint) return this.endpoint;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const url = `${this.getBaseUrl()}/${key}`;
    const response = await fetch(url, {
      method: "PUT",
      body: data as unknown as BodyInit,
      headers: {
        "Content-Length": String(data.length),
      },
    });
    if (!response.ok) {
      throw new Error(`S3 PUT failed: ${response.status}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const url = `${this.getBaseUrl()}/${key}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`S3 GET failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async del(key: string): Promise<void> {
    const url = `${this.getBaseUrl()}/${key}`;
    await fetch(url, { method: "DELETE" });
  }

  async url(key: string, expiresIn?: number): Promise<string> {
    // For production, generate a pre-signed URL
    // In a real implementation, use AWS SDK's getSignedUrl
    const expiry = expiresIn ?? 3600;
    return `${this.getBaseUrl()}/${key}?expires=${expiry}`;
  }

  async exists(key: string): Promise<boolean> {
    const url = `${this.getBaseUrl()}/${key}`;
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
function createStorage(): StorageProvider {
  const provider = process.env.UPLOAD_PROVIDER ?? "local";
  if (provider === "s3") {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}

export const storage = createStorage();
export type { StorageProvider };
