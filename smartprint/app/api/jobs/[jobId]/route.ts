/**
 * GET /api/jobs/[jobId] — Get job details
 * DELETE /api/jobs/[jobId] — Delete a job
 * 
 * GET records openedAt timestamp on first open (starts 100s countdown).
 * Returns job metadata and signed file URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getJob, markJobOpened, markJobDeleted } from "@/lib/db";
import { generateFileToken, deleteJobFiles, jobFilesExist } from "@/lib/storage";
import type { JobResponse } from "@/lib/types";

export async function GET(
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
        { error: "This job has expired and files have been deleted" },
        { status: 410 }
      );
    }

    // Record openedAt on first open — this starts the 100s countdown
    if (!job.opened_at) {
      markJobOpened(jobId);
      job.opened_at = Date.now();
      job.status = "opened";
    }

    // Generate signed file URLs
    const fileNames: string[] = job.file_names
      ? JSON.parse(job.file_names)
      : [];

    const fileUrls = fileNames.map((name) => {
      const token = generateFileToken(jobId, name);
      return `/api/jobs/${jobId}/file?token=${token}&name=${encodeURIComponent(name)}`;
    });

    // Calculate remaining seconds
    const remainingSeconds = job.opened_at
      ? Math.max(0, 100 - Math.floor((Date.now() - job.opened_at) / 1000))
      : 100;

    const response: JobResponse = {
      id: job.id,
      userId: job.user_id,
      createdAt: job.created_at,
      openedAt: job.opened_at,
      printedAt: job.printed_at,
      expiredAt: job.expired_at,
      isEncrypted: job.is_encrypted === 1,
      settings: job.settings ? JSON.parse(job.settings) : null,
      fileCount: job.file_count,
      status: job.status,
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
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If userToken is provided, verify it matches (user-side deletion)
    if (userToken && (job as any).user_token !== userToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    deleteJobFiles(jobId);
    markJobDeleted(jobId);

    return NextResponse.json({ success: true, message: "Job deleted" });
  } catch (error) {
    console.error("[API] Error deleting job:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
