/**
 * POST /api/jobs/[jobId]/print — Mark job as printed
 * 
 * Marks the job as printed and immediately deletes the files.
 * This allows the admin to clean up before the 100s timer expires.
 * Protected by NextAuth session to prevent unauthorized job destruction.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteJobFiles } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { admin: true }
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Verify admin ownership
    if (job.admin?.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized for this shop" }, { status: 403 });
    }

    if (job.status === "expired" || job.status === "deleted") {
      return NextResponse.json(
        { error: "This job has already expired" },
        { status: 410 }
      );
    }

    // Mark as printed and immediately delete files
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "printed", printedAt: new Date() }
    });
    
    deleteJobFiles(jobId);

    return NextResponse.json({
      success: true,
      message: "Job marked as printed. Files have been securely deleted.",
    });
  } catch (error) {
    console.error("[API] Error marking job as printed:", error);
    return NextResponse.json(
      { error: "Failed to mark job as printed" },
      { status: 500 }
    );
  }
}
