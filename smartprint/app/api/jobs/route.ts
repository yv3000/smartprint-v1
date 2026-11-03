export const dynamic = "force-dynamic";

/**
 * GET /api/jobs — List all active print jobs (admin only)
 * 
 * Protected by NextAuth session.
 * Returns all non-expired jobs sorted by newest first.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { runCleanupSync } from "@/lib/cleanup";
import type { JobResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Run cleanup synchronously on every request to ensure Vercel purges expired jobs
    await runCleanupSync();

    // Verify admin session via NextAuth
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Admin profile for this user
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    // Get all active jobs for this admin via Prisma
    const jobs = await prisma.job.findMany({
      where: {
        adminId: admin.id,
        status: { notIn: ["expired", "deleted", "printed"] }
      },
      orderBy: { createdAt: "desc" }
    });

    // Transform to response format
    const response: JobResponse[] = jobs.map((job) => ({
      id: job.id,
      userId: job.userId,
      createdAt: job.createdAt.getTime(),
      openedAt: job.openedAt?.getTime() || null,
      printedAt: job.printedAt?.getTime() || null,
      expiredAt: job.expiredAt?.getTime() || null,
      isEncrypted: job.isEncrypted,
      settings: job.settings as any,
      fileCount: job.fileCount,
      status: job.status,
      fileNames: (job.settings as any)?.fileNames || [], 
      remainingSeconds: job.openedAt
        ? Math.max(0, 100 - Math.floor((Date.now() - job.openedAt.getTime()) / 1000))
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
