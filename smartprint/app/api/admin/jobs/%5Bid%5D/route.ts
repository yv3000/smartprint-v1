import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { join } from "path";
import { readdirSync } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { admin: { include: { user: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Multi-admin isolation check
  if (job.admin.user.email !== session.user.email) {
    return NextResponse.json({ error: "Unauthorized access to this job" }, { status: 403 });
  }

  // Security check: if expired or deleted
  if (["expired", "deleted"].includes(job.status)) {
    return NextResponse.json({ error: "Job no longer available" }, { status: 403 });
  }

  // Record openedAt if first time
  let updatedJob = job;
  if (!job.openedAt) {
    updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: { 
        openedAt: new Date(),
        status: "opened"
      },
      include: { admin: { include: { user: true } } },
    });
  }

  // Generate temp file URLs (In production this would uses signed URLs)
  // For hackathon, we'll serve them via /api/jobs/[id]/file/[filename]
  const storageDir = join(process.cwd(), "tmp", "smartprint", params.id);
  let fileNames: string[] = [];
  try {
    fileNames = readdirSync(storageDir);
  } catch (err) {
    // Files might have been deleted but DB not updated yet
  }

  const fileUrls = fileNames.map(name => `/api/jobs/${params.id}/file/${encodeURIComponent(name)}`);

  return NextResponse.json({
    ...updatedJob,
    fileNames,
    fileUrls,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.update({
    where: { id: params.id },
    data: { 
      status: "printed",
      printedAt: new Date(),
      printCount: { increment: 1 }
    },
  });

  return NextResponse.json(job);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const userToken = searchParams.get("userToken");

  // Auth: either admin session or userToken
  const job = await prisma.job.findUnique({
    where: { id: params.id },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isAdmin = !!session?.user?.email;
  const isOwner = userToken && job.userToken === userToken;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete from DB and disk
  await prisma.job.update({
    where: { id: params.id },
    data: { status: "deleted" },
  });

  // Physically delete files from /tmp/
  const storageDir = join(process.cwd(), "tmp", "smartprint", params.id);
  const { rm } = await import("fs/promises");
  try {
    await rm(storageDir, { recursive: true, force: true });
  } catch (err) {
    console.error("FS Delete Error:", err);
  }

  return NextResponse.json({ success: true });
}
