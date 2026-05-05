/**
 * DELETE /api/jobs/clear-all — Delete all jobs for this admin
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteJobFiles } from "@/lib/storage";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.admin.findUnique({ where: { userId: session.user.id } });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  // Find all jobs for this admin in Prisma
  const allJobs = await prisma.job.findMany({
    where: {
      adminId: admin.id
    }
  });

  let deleted = 0;
  for (const job of allJobs) {
    try { 
      deleteJobFiles(job.id); 
      // Fully delete from DB to keep it clean
      await prisma.job.delete({
        where: { id: job.id }
      });
      deleted++;
    } catch (e) {
      console.error(`Failed to delete job ${job.id}:`, e);
    }
  }

  return NextResponse.json({ success: true, deleted });
}
