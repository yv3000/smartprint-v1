/**
 * GET /api/preview/file/[token]
 *
 * Serves a previously-uploaded preview file to the Microsoft Office
 * Online viewer (or any other consumer with the token). Stateless:
 * the token itself carries the disk filename + original filename +
 * expiry, signed with HMAC-SHA256 so it can be validated without any
 * shared state across serverless instances.
 *
 * CORS: Microsoft fetches this URL from `view.officeapps.live.com`
 * servers. Browsers don't enforce CORS on iframe-loaded resources, but
 * we set `Access-Control-Allow-Origin: *` anyway so the viewer's own
 * range-fetches succeed.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

const PREVIEW_DIR = "/tmp/smartprint-preview";
const SECRET =
  process.env.PREVIEW_TOKEN_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.ADMIN_ID ||
  "smartprint_preview_default_secret";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".rtf": "application/rtf",
  ".txt": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".csv": "text/csv",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

interface TokenPayload {
  n: string; // disk filename
  f: string; // original filename
  e: number; // expiry epoch ms
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  // timingSafeEqual requires equal-length inputs; bail otherwise.
  if (sig.length !== expected.length) return null;
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (!timingSafeEqual(a, b)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload?.n !== "string" || typeof payload?.f !== "string") return null;
  if (typeof payload?.e !== "number") return null;
  return payload;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const payload = verifyToken(token);
  if (!payload) {
    console.warn("[preview/file] invalid token");
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 403 },
    );
  }
  if (Date.now() > payload.e) {
    console.warn(`[preview/file] expired name=${payload.f}`);
    return NextResponse.json(
      { error: "Token expired" },
      { status: 410 },
    );
  }

  // basename() strips any directory components in the disk filename —
  // belt-and-braces against a forged token attempting traversal.
  const safe = basename(payload.n);
  const filePath = join(PREVIEW_DIR, safe);

  if (!existsSync(filePath)) {
    console.warn(
      `[preview/file] missing on disk name=${payload.f} disk=${safe}`,
    );
    return NextResponse.json(
      { error: "Preview file no longer available" },
      { status: 404 },
    );
  }

  const ext = "." + (payload.f.split(".").pop() || "").toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  const buffer = await readFile(filePath);

  console.log(
    `[preview/file] serve name=${payload.f} ct=${contentType} bytes=${buffer.length}`,
  );

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
      "Content-Disposition": `inline; filename="${payload.f}"`,
      // MS viewer fetches from view.officeapps.live.com servers.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
