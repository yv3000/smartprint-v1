export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteJobFiles } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    const session = await auth();
    if (!isCronAuthorized && !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiredJobs = await prisma.job.findMany({
      where: {
        openedAt: { 
          not: null,
          lt: new Date(Date.now() - 100000) // More than 100s ago
        },
        status: { notIn: ["expired", "deleted"] },
      },
    });

    for (const job of expiredJobs) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "expired" },
      });

      try {
        deleteJobFiles(job.id);
      } catch (err) {
        // Ignore if already deleted
      }
    }

    return NextResponse.json({ cleaned: expiredJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
