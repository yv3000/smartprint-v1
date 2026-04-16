/**
 * DELETE /api/jobs/clear-completed — Delete all printed/expired/deleted jobs
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteJobFiles } from "@/lib/storage";

import getDb from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.admin.findUnique({ where: { userId: session.user.id } });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const db = getDb();
  const completedJobs = db.prepare(`
    SELECT * FROM jobs 
    WHERE status IN ('printed', 'expired', 'deleted')
  `).all() as any[];

  let deleted = 0;
  for (const job of completedJobs) {
    try { deleteJobFiles(job.id); } catch {}
    db.prepare(`DELETE FROM jobs WHERE id = ?`).run(job.id);
    deleted++;
  }

  return NextResponse.json({ success: true, deleted });
}
