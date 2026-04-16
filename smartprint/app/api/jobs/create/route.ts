<<<<<<< HEAD
/**
 * POST /api/jobs/create — Create a new print job
 */
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createJob } from "@/lib/db";
import { saveFiles } from "@/lib/storage";
import { getNextUserId } from "@/lib/usernames";
import { startCleanup } from "@/lib/cleanup";

let cleanupStarted = false;

export async function POST(request: NextRequest) {
  try {
    if (!cleanupStarted) { startCleanup(); cleanupStarted = true; }

    const formData = await request.formData();
    const settingsRaw = formData.get("settings") as string | null;
    const isEncrypted = formData.get("isEncrypted") === "true";
    
    let settingsObj = JSON.parse(settingsRaw || "{}");
    if (isEncrypted) {
      settingsObj.encryptionKeys = (formData.get("encryptionKeys") as string) || "";
      try {
        settingsObj.fileInfos = JSON.parse((formData.get("fileInfos") as string) || "[]");
      } catch {
        settingsObj.fileInfos = [];
      }
    }

    const files: { name: string; data: Buffer }[] = [];
    for (const [key, value] of Array.from(formData.entries())) {
      if (key === "files" && value instanceof File) {
        files.push({ name: value.name, data: Buffer.from(await value.arrayBuffer()) });
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const jobId = uuidv4();
    const userToken = uuidv4(); // Token for user-side deletion
    const userId = await getNextUserId();

    console.log("[Jobs Create] userId:", userId, "files:", files.length);

    const savedNames = await saveFiles(jobId, files);

    createJob({
      id: jobId,
      userId,
      userToken,
      isEncrypted,
      settings: JSON.stringify(settingsObj),
      fileCount: savedNames.length,
      fileNames: savedNames,
    });

=======
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/usernames";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
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

    // 2. Job Info
    const jobId = createId();
    const userId = generateFriendlyId();
    const userToken = createId(); // For user-side deletion
    const settings = JSON.parse(settingsStr || "{}");
    const isEncrypted = isEncryptedStr === "true";

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
    const storageDir = join(process.cwd(), "tmp", "smartprint", jobId);
    await mkdir(storageDir, { recursive: true });

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = join(storageDir, file.name);
      await writeFile(filePath, buffer);
    }

>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c
    return NextResponse.json({
      jobId,
      userId,
      userToken,
<<<<<<< HEAD
      expiresAt: Date.now() + 3600_000,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating job:", error);
    return NextResponse.json({ error: "Failed to create print job" }, { status: 500 });
=======
    });
  } catch (err: any) {
    console.error("Job Creation Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c
  }
}
