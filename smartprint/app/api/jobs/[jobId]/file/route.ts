/**
 * GET /api/jobs/[jobId]/file — Serve file content
 * 
 * Streams the actual file from the temp directory.
 * Protected by signed token validation — never exposes raw file paths.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateFileToken, getFilePath, getJobDir } from "@/lib/storage";
import fs from "fs";
import path from "path";

// MIME type mapping for supported formats
const MIME_TYPES: Record<string, string> = {
  // PDF
  ".pdf": "application/pdf",
  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  // Documents
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".rtf": "application/rtf",
  // Spreadsheets
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".csv": "text/csv",
  // Presentations
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  // Text
  ".txt": "text/plain",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const name = searchParams.get("name");

    if (!token || !name) {
      return NextResponse.json(
        { error: "Missing token or filename" },
        { status: 400 }
      );
    }

    // Validate the signed token
    const valid = validateFileToken(token);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired file token" },
        { status: 403 }
      );
    }

    // Strict validation: Ensure token matches both requested job and file
    if (valid.jobId !== jobId || valid.fileName !== name) {
      return NextResponse.json(
        { error: "Token mismatch for requested document" },
        { status: 403 }
      );
    }

    // Get the sanitized file path
    const filePath = getFilePath(jobId, valid.fileName);
    const expectedDir = path.resolve(getJobDir(jobId));

    // Path traversal containment check
    if (!path.resolve(filePath).startsWith(expectedDir)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found — it may have been deleted" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(valid.fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Return file with strict security headers — no caching, no download sniffing
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${encodeURIComponent(valid.fileName)}"`,
      },
    });
  } catch (error) {
    console.error("[API] Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
