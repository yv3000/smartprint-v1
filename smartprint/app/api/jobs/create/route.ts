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

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = join(storageDir, file.name);
      await writeFile(filePath, buffer);
    }

    return NextResponse.json({
      jobId,
      userId,
      userToken,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Job Creation Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
