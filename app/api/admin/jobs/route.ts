import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find admin by email
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const jobs = await prisma.job.findMany({
    where: {
      adminId: admin.id,
      status: { notIn: ["deleted", "expired"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}
