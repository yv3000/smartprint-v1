/**
 * Background Cleanup — SmartPrint
 * 
 * Runs every 10 seconds to purge expired jobs.
 * Two cleanup passes:
 * 1. Jobs opened more than 100 seconds ago → expire + delete files
 * 2. Jobs older than 1 hour from CREATION (whether opened or not) → expire + delete files
 */

import { getExpiredJobs, getStaleJobs, markJobExpired } from "./db";
import { deleteJobFiles } from "./storage";

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Run a single cleanup pass
 */
function runCleanup(): void {
  try {
    // Pass 1: Jobs opened > 100 seconds ago
    const expiredJobs = getExpiredJobs();
    for (const job of expiredJobs) {
      deleteJobFiles(job.id);
      markJobExpired(job.id);
      console.log(`[Cleanup] Expired job ${job.id} (user: ${job.user_id}) — 100s TTL after open`);
    }

    // Pass 2: ALL jobs older than 1 hour from creation (opened or not)
    const staleJobs = getStaleJobs();
    for (const job of staleJobs) {
      deleteJobFiles(job.id);
      markJobExpired(job.id);
      console.log(`[Cleanup] Expired stale job ${job.id} (user: ${job.user_id}) — 1hr from creation`);
    }
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}

/**
 * Start the background cleanup job.
 * Runs every 10 seconds. Safe to call multiple times — only starts once.
 */
export function startCleanup(): void {
  if (cleanupInterval) return; // Already running

  console.log("[Cleanup] Background cleanup started (every 10s)");
  cleanupInterval = setInterval(runCleanup, 10_000);

  // Run immediately on start
  runCleanup();
}

/**
 * Stop the background cleanup job
 */
export function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("[Cleanup] Background cleanup stopped");
  }
}
