/**
 * GET /api/jobs/[jobId]/file — Serve file content
 * 
 * Streams the actual file from the temp directory.
 * Protected by signed token validation — never exposes raw file paths.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateFileToken, getFilePath } from "@/lib/storage";
import fs from "fs";
import path from "path";

// MIME type mapping for supported formats
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

    // Ensure token matches the requested job
    if (valid.jobId !== jobId) {
      return NextResponse.json(
        { error: "Token does not match job" },
        { status: 403 }
      );
    }

    // Get the file path
    const filePath = getFilePath(jobId, name);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found — it may have been deleted" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(name).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Return file with security headers — no caching, no download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Content-Disposition": `inline; filename="${name}"`, // Prevent download prompt
        "X-Content-Type-Options": "nosniff",
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
