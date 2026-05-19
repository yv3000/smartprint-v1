/**
 * POST /api/preview/upload
 *
 * Used by the user-side step-2 live preview (and admin previews) to
 * stage a file for embedding in the Microsoft Office Online viewer.
 * The MS viewer fetches the file URL from public Microsoft servers, so
 * we expose a short-lived signed URL that hands the bytes back without
 * any auth, then expires.
 *
 * Architecture decision (round 25):
 * Tokens are HMAC-signed payloads (NOT in-memory Map state). This
 * survives Vercel serverless cold starts where every invocation might
 * land on a different container — an in-memory store would 404 on the
 * follow-up GET. Same approach as lib/storage.ts already uses for job
 * file URLs.
 *
 * File lives at /tmp/smartprint-preview/<random-name>. The token
 * carries the disk path + filename + expiry. /tmp is the only writable
 * directory on Vercel; files are evicted by the platform when the
 * container is reaped.
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { randomBytes, createHmac } from "crypto";

export const runtime = "nodejs";

const PREVIEW_DIR = "/tmp/smartprint-preview";
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — slides can get big
const SECRET =
  process.env.PREVIEW_TOKEN_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.ADMIN_ID ||
  "smartprint_preview_default_secret";

// MIME types we accept. Mirrors the FilePreview component's ext sets.
// Browsers report MIME inconsistently for some types (.rtf, .csv, .odt
// often come through as `application/octet-stream` on Windows), so we
// also accept-by-extension below as a fallback.
const ALLOWED_TYPES = new Set<string>([
  // Documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
  // Spreadsheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  // Presentations
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.presentation",
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  // Text
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set<string>([
  // Documents
  "doc", "docx", "odt", "rtf",
  // Spreadsheets
  "xls", "xlsx", "ods", "csv",
  // Presentations
  "ppt", "pptx", "odp",
  // PDF
  "pdf",
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
  // Text
  "txt",
]);

function isAllowed(file: File): boolean {
  if (file.type && ALLOWED_TYPES.has(file.type)) return true;
  const ext = extname(file.name).replace(/^\./, "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function signToken(payload: object): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` field" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  if (!isAllowed(file)) {
    return NextResponse.json(
      {
        error: `Unsupported file type${file.type ? ` (${file.type})` : ""}`,
      },
      { status: 415 },
    );
  }

  // Sanitise the filename — strip directory separators so we never
  // escape PREVIEW_DIR. The original name is preserved in the token
  // payload (used later for Content-Disposition).
  const safeOriginalName = file.name.replace(/[/\\:*?"<>|\0]/g, "_");

  // The on-disk filename uses a random prefix to avoid collisions and
  // to make it impossible to guess existing files by name alone.
  const diskName = `${randomBytes(16).toString("hex")}-${safeOriginalName}`;

  await mkdir(PREVIEW_DIR, { recursive: true });
  const filePath = join(PREVIEW_DIR, diskName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const token = signToken({
    n: diskName, // disk filename
    f: safeOriginalName, // original filename (for Content-Disposition)
    e: Date.now() + TTL_MS, // expiry epoch ms
  });

  return NextResponse.json(
    { token, expiresInMs: TTL_MS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
