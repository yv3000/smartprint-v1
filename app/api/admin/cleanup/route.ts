import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rm } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  try {
    const expiredJobs = await prisma.job.findMany({
      where: {
        openedAt: { not: null },
        status: { notIn: ["expired", "deleted"] },
        openedAt: {
          lt: new Date(Date.now() - 100000), // More than 100s ago
        },
      },
    });

    for (const job of expiredJobs) {
      // 1. Mark as expired
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "expired" },
      });

      // 2. Delete files
      const storageDir = join(process.cwd(), "tmp", "smartprint", job.id);
      try {
        await rm(storageDir, { recursive: true, force: true });
        console.log(`Cleaned up job ${job.id}`);
      } catch (err) {
        // Already gone or permission error
      }
    }

    return NextResponse.json({ cleaned: expiredJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
