/**
 * POST /api/jobs/[jobId]/print — Mark job as printed
 * 
 * Marks the job as printed and immediately deletes the files.
 * This allows the admin to clean up before the 100s timer expires.
 */

import { NextRequest, NextResponse } from "next/server";
import { getJob, markJobPrinted } from "@/lib/db";
import { deleteJobFiles } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status === "expired" || job.status === "deleted") {
      return NextResponse.json(
        { error: "This job has already expired" },
        { status: 410 }
      );
    }

    // Mark as printed and immediately delete files
    markJobPrinted(jobId);
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
