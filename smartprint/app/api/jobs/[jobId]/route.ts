import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFileToken, deleteJobFiles } from "@/lib/storage";
import type { JobResponse } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status === "expired" || job.status === "deleted" || job.status === "printed") {
      return NextResponse.json(
        { error: "This job has expired or been printed, and files have been deleted" },
        { status: 410 }
      );
    }

    let updatedJob = job;
    // Record openedAt on first open — this starts the 100s countdown
    if (!job.openedAt) {
      updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: { 
          openedAt: new Date(),
          status: "opened"
        }
      });
    }

    // Generate signed file URLs
    // In Prisma, we don't store fileNames, so we list them from disk
    const { listJobFiles } = await import("@/lib/storage");
    const fileNames = listJobFiles(jobId);

    const fileUrls = fileNames.map((name) => {
      const token = generateFileToken(jobId, name);
      return `/api/jobs/${jobId}/file?token=${token}&name=${encodeURIComponent(name)}`;
    });

    // Calculate remaining seconds
    const remainingSeconds = updatedJob.openedAt
      ? Math.max(0, 100 - Math.floor((Date.now() - updatedJob.openedAt.getTime()) / 1000))
      : 100;

    const response: JobResponse = {
      id: updatedJob.id,
      userId: updatedJob.userId,
      createdAt: updatedJob.createdAt.getTime(),
      openedAt: updatedJob.openedAt?.getTime() || null,
      printedAt: updatedJob.printedAt?.getTime() || null,
      expiredAt: updatedJob.expiredAt?.getTime() || null,
      isEncrypted: updatedJob.isEncrypted,
      settings: updatedJob.settings as any,
      fileCount: updatedJob.fileCount,
      status: updatedJob.status,
      fileNames,
      fileUrls,
      remainingSeconds,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get("userToken");
    
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If userToken is provided, verify it matches (user-side deletion)
    if (userToken && job.userToken !== userToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    deleteJobFiles(jobId);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "deleted" }
    });

    return NextResponse.json({ success: true, message: "Job deleted" });
  } catch (error) {
    console.error("[API] Error deleting job:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
