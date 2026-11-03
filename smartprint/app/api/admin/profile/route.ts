export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        shopName: true,
        qrCode: true,
        shopId: true,
        address: true,
        latitude: true,
        longitude: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "No admin profile found" }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
