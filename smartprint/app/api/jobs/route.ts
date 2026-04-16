/**
 * GET /api/jobs — List all active print jobs (admin only)
 * 
 * Protected by NextAuth session.
 * Returns all non-expired jobs sorted by newest first.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllActiveJobs } from "@/lib/db";
import { startCleanup } from "@/lib/cleanup";
import type { JobResponse } from "@/lib/types";

let cleanupStarted = false;

export async function GET(request: NextRequest) {
  try {
    // Start cleanup on first request
    if (!cleanupStarted) {
      startCleanup();
      cleanupStarted = true;
    }

    // Verify admin session via NextAuth
    const session = await auth();
    
    console.log("Jobs API - Session:", session?.user?.email);
    console.log("Jobs API - User ID:", session?.user?.id);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all active jobs
    const jobs = getAllActiveJobs();

    // Transform to response format
    const response: JobResponse[] = jobs.map((job) => ({
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
      fileNames: job.file_names ? JSON.parse(job.file_names) : [],
      remainingSeconds: job.opened_at
        ? Math.max(0, 100 - Math.floor((Date.now() - job.opened_at) / 1000))
        : undefined,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
