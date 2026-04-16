/**
 * File Storage — SmartPrint
 * 
 * Handles saving, retrieving, and deleting uploaded files.
 * Files are stored in a temp directory and auto-purged.
 * Signed URLs use HMAC tokens for time-limited access.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// Temp directory for file storage
const STORAGE_DIR = path.join(process.cwd(), "tmp", "smartprint");

// Ensure storage directory exists on import
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Secret for signing URLs — derived from admin ID
const URL_SECRET = process.env.ADMIN_ID || "smartprint_default_secret";

/**
 * Get the directory path for a specific job
 */
export function getJobDir(jobId: string): string {
  return path.join(STORAGE_DIR, jobId);
}

/**
 * Save uploaded files to the job's temp directory.
 * Returns an array of saved file names.
 */
export async function saveFiles(
  jobId: string,
  files: { name: string; data: Buffer }[]
): Promise<string[]> {
  const jobDir = getJobDir(jobId);

  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const savedNames: string[] = [];

  for (const file of files) {
    // Sanitize filename — remove path separators and null bytes
    const safeName = file.name
      .replace(/[/\\:*?"<>|\0]/g, "_")
      .replace(/\.\./g, "_");

    const filePath = path.join(jobDir, safeName);
    fs.writeFileSync(filePath, file.data);
    savedNames.push(safeName);
  }

  return savedNames;
}

/**
 * Get the full file path for a specific file in a job
 */
export function getFilePath(jobId: string, fileName: string): string {
  // Sanitize to prevent directory traversal
  const safeName = path.basename(fileName);
  return path.join(getJobDir(jobId), safeName);
}

/**
 * Check if a job's files exist on disk
 */
export function jobFilesExist(jobId: string): boolean {
  const jobDir = getJobDir(jobId);
  return fs.existsSync(jobDir);
}

/**
 * Delete all files for a specific job
 */
export function deleteJobFiles(jobId: string): void {
  const jobDir = getJobDir(jobId);

  if (fs.existsSync(jobDir)) {
    // Remove all files in the directory
    const files = fs.readdirSync(jobDir);
    for (const file of files) {
      fs.unlinkSync(path.join(jobDir, file));
    }
    // Remove the directory itself
    fs.rmdirSync(jobDir);
  }
}

/**
 * Generate a signed token for file access.
 * Token expires after the specified duration (default: 120 seconds).
 */
export function generateFileToken(
  jobId: string,
  fileName: string,
  expiresInSeconds: number = 120
): string {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const data = `${jobId}:${fileName}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", URL_SECRET)
    .update(data)
    .digest("hex");

  // Base64 encode the token payload
  const payload = Buffer.from(
    JSON.stringify({ jobId, fileName, expiresAt, hmac })
  ).toString("base64url");

  return payload;
}

/**
 * Validate a signed file access token.
 * Returns the decoded payload if valid, null otherwise.
 */
export function validateFileToken(
  token: string
): { jobId: string; fileName: string; expiresAt: number } | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8")
    );

    const { jobId, fileName, expiresAt, hmac } = decoded;

    // Check expiration
    if (Date.now() > expiresAt) {
      return null;
    }

    // Verify HMAC
    const data = `${jobId}:${fileName}:${expiresAt}`;
    const expectedHmac = crypto
      .createHmac("sha256", URL_SECRET)
      .update(data)
      .digest("hex");

    if (hmac !== expectedHmac) {
      return null;
    }

    return { jobId, fileName, expiresAt };
  } catch {
    return null;
  }
}

/**
 * List all files in a job's directory
 */
export function listJobFiles(jobId: string): string[] {
  const jobDir = getJobDir(jobId);

  if (!fs.existsSync(jobDir)) {
    return [];
  }

  return fs.readdirSync(jobDir);
}
