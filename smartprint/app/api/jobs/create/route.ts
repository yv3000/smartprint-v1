import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextUserId } from "@/lib/usernames";
import { isAdminOnline } from "@/lib/adminPresence";
import { mkdir, writeFile } from "fs/promises";
import { join, basename, extname } from "path";
import { createId } from "@paralleldrive/cuid2";

// Increase body size limit for file uploads
export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set([
  // Documents
  "pdf", "docx", "doc", "odt", "rtf", "txt",
  // Spreadsheets
  "xlsx", "xls", "ods", "csv",
  // Presentations
  "pptx", "ppt", "odp",
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
  // Encrypted payloads from client-side Web Crypto
  "enc"
]);

function isExtensionAllowed(fileName: string): boolean {
  const ext = extname(fileName).replace(/^\./, "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

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

    // Validate file extensions
    for (const file of files) {
      if (!isExtensionAllowed(file.name)) {
        return NextResponse.json(
          { error: `File type not supported for printing: ${file.name}` },
          { status: 400 }
        );
      }
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
    
    // Sanitize filenames and prevent path traversal
    const safeFileNames = files.map((f) =>
      basename(f.name).replace(/[/\\:*?"<>|\0]/g, "_").replace(/\.\./g, "_")
    );
    settings.fileNames = safeFileNames;

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

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = safeFileNames[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = join(storageDir, safeName);
      await writeFile(filePath, buffer);
    }

    return NextResponse.json({
      jobId,
      userId,
      userToken,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Job Creation Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create print job" }, { status: 500 });
  }
}
