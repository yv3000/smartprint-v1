/**
 * Background Cleanup — SmartPrint
 * 
 * Migrated to Prisma (Postgres) for production compatibility.
 * Support for both interval and inline (request-time) cleanup.
 */

import prisma from "./prisma";
import { deleteJobFiles } from "./storage";

/**
 * Run a single cleanup pass synchronously (using Prisma)
 * Used for both background interval and inline request-time cleanup.
 */
export async function runCleanupSync(): Promise<void> {
  try {
    const now = new Date();
    
    // Pass 1: Jobs opened more than 100 seconds ago
    const expiredByOpen = await prisma.job.findMany({
      where: {
        status: "opened",
        openedAt: {
          lt: new Date(now.getTime() - 100 * 1000)
        }
      }
    });

    for (const job of expiredByOpen) {
      deleteJobFiles(job.id);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "expired", expiredAt: now }
      });
      console.log(`[Cleanup] Expired job ${job.id} — 100s TTL after open`);
    }

    // Pass 2: ALL jobs older than 1 hour from creation (opened or not)
    const staleJobs = await prisma.job.findMany({
      where: {
        status: { notIn: ["expired", "deleted"] },
        createdAt: {
          lt: new Date(now.getTime() - 60 * 60 * 1000)
        }
      }
    });

    for (const job of staleJobs) {
      deleteJobFiles(job.id);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "expired", expiredAt: now }
      });
      console.log(`[Cleanup] Expired stale job ${job.id} — 1hr from creation`);
    }
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanup(): void {
  if (cleanupInterval) return;
  
  // Note: On Vercel, this interval will only run as long as the 
  // serverless function is warm. We rely on runCleanupSync() being 
  // called inline in the API route for guaranteed cleanup.
  cleanupInterval = setInterval(runCleanupSync, 60_000); // Check every minute
  runCleanupSync();
}
