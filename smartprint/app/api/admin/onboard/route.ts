import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUniqueShopId } from "@/lib/shopId";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shopName, address, latitude, longitude } = await req.json();

    if (!shopName) {
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    }

    // Generate permanent shop ID
    const shopId = await ensureUniqueShopId();
    // Unique QR Code based on date and user
    const qrCode = Math.random().toString(36).substring(2, 12);

    const admin = await prisma.admin.upsert({
      where: { userId: session.user.id },
      update: {
        shopName,
        address,
        latitude,
        longitude,
        lastLoginAt: new Date(),
      },
      create: {
        userId: session.user.id,
        shopName,
        address,
        shopId: String(shopId),
        qrCode,
        latitude,
        longitude,
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json(admin);
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
