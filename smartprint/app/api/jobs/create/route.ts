import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextUserId } from "@/lib/usernames";
import { isAdminOnline } from "@/lib/adminPresence";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";
import { uploadToDrive } from "@/lib/googleDrive";

// Increase body size limit for file uploads
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr: any) {
      console.error("[Job Create] FormData parse error:", parseErr);
      return NextResponse.json({ error: "Failed to process upload. File may be too large (max ~4MB)." }, { status: 413 });
    }

    const settingsStr = formData.get("settings") as string;
    const isEncryptedStr = formData.get("isEncrypted") as string;
    const shopToken = formData.get("shopToken") as string;
    const files = formData.getAll("files") as File[];

    if (!shopToken || !files.length) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // 1. Find Admin
    const admin = await prisma.admin.findUnique({
      where: { qrCode: shopToken },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid shop" }, { status: 404 });
    }

    if (!isAdminOnline(admin.lastLoginAt)) {
      return NextResponse.json({ error: "Shop is offline right now" }, { status: 409 });
    }

    // 2. Job Info
    const jobId = createId();
    const userId = await getNextUserId();
    const userToken = createId(); // For user-side deletion
    
    let settings: any = {};
    try {
      settings = JSON.parse(settingsStr || "{}");
    } catch (jsonErr) {
      console.error("[Job Create] Settings JSON parse error:", jsonErr, "Raw:", settingsStr?.substring(0, 200));
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 });
    }
    
    const isEncrypted = isEncryptedStr === "true";
    
    // Store filenames in settings since they are not in the top-level schema
    settings.fileNames = files.map(f => f.name);

    console.log("[Job Create] Saving to Prisma for admin:", admin.id);

    // 3. Create DB Entry
    const job = await prisma.job.create({
      data: {
        id: jobId,
        userId,
        userToken,
        adminId: admin.id,
        isEncrypted,
        settings,
        fileCount: files.length,
        status: "waiting",
      },
    });

    // 4. Save Files to /tmp/smartprint/[jobId]/
    // Use /tmp which is the only writable directory on Vercel
    const storageDir = join("/tmp", "smartprint", jobId);
    await mkdir(storageDir, { recursive: true });

    // Captured during the file loop, returned in response so the
    // SuccessScreen can embed the Drive iframe immediately without an
    // extra round-trip to /api/jobs/[id] (which has side-effects).
    let driveViewUrl: string | null = null;
    let driveError: string | null = null;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = join(storageDir, file.name);
      await writeFile(filePath, buffer);

      // Drive upload for DOCX preview. Skipped for encrypted jobs (we
      // never decrypt server-side, so we'd be uploading ciphertext that
      // Drive can't render). Failure is logged but does not abort the
      // upload — the admin preview will fall back to the unavailable
      // state if driveViewUrl is null.
      if (!isEncrypted && /\.docx$/i.test(file.name)) {
        try {
          const { fileId, previewUrl } = await uploadToDrive(buffer, file.name);
          driveViewUrl = previewUrl;
          await prisma.job.update({
            where: { id: jobId },
            data: { driveFileId: fileId, driveViewUrl: previewUrl },
          });
        } catch (driveErr: any) {
          console.error("[Job Create] Drive upload failed:", driveErr);
          // Surface a short message to the client so SuccessScreen can
          // render a useful error instead of silently hiding the iframe.
          driveError =
            driveErr?.message ||
            driveErr?.errors?.[0]?.message ||
            "Drive upload failed";
        }
      }
    }

    return NextResponse.json({
      jobId,
      userId,
      userToken,
      driveViewUrl,
      driveError,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Job Creation Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create print job" }, { status: 500 });
  }
}
