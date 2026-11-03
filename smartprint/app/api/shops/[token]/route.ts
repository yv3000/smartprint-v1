export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminOnline } from "@/lib/adminPresence";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { qrCode: token },
      select: {
        id: true,
        shopName: true,
        qrCode: true,
        address: true,
        latitude: true,
        longitude: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Shop not found. Invalid or expired QR code." },
        { status: 404 }
      );
    }

    const online = isAdminOnline(admin.lastLoginAt);

    return NextResponse.json({
      valid: true,
      shopName: admin.shopName,
      qrCode: admin.qrCode,
      address: admin.address,
      isOnline: online,
      sessionStatus: online ? "online" : "offline",
    });
  } catch (error) {
    console.error("Shop token lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
