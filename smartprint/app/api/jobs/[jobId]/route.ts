import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFileToken, deleteJobFiles, listJobFiles } from "@/lib/storage";
import { auth } from "@/auth";
import type { JobResponse } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Verify authenticated admin session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    if (!admin) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 403 });
    }
    
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Ownership check — job must belong to current admin
    if (job.adminId !== admin.id) {
      return NextResponse.json(
        { error: "Forbidden: Job does not belong to this terminal" },
        { status: 403 }
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
      where: { id: jobId },
      include: { admin: true }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check authorization:
    // 1. User-side deletion requires matching userToken
    const isUserAuthorized = Boolean(userToken && job.userToken === userToken);

    // 2. Admin-side deletion requires active authenticated session belonging to the shop admin
    let isAdminAuthorized = false;
    if (!isUserAuthorized) {
      const session = await auth();
      if (session?.user?.id && job.admin?.userId === session.user.id) {
        isAdminAuthorized = true;
      }
    }

    if (!isUserAuthorized && !isAdminAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
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
