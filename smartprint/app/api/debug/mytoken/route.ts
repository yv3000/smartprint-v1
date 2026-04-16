import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in. Go to /admin/auth first." });
  }

  const admin = await prisma.admin.findUnique({
    where: { userId: session.user.id },
    select: { qrCode: true, shopName: true },
  });

  if (!admin) {
    return NextResponse.json({
      error: "No admin profile. Complete onboarding at /admin/onboarding first.",
      userId: session.user.id,
      email: session.user.email,
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartprint-tau.vercel.app";

  return NextResponse.json({
    shopName: admin.shopName,
    qrCode: admin.qrCode,
    userPortalUrl: `${baseUrl}/user?shop=${admin.qrCode}`,
    note: "DELETE THIS ENDPOINT BEFORE PRODUCTION",
  });
}
