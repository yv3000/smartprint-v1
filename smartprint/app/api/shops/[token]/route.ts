import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminOnline } from "@/lib/adminPresence";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    console.log("Looking up shop with token:", token);

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

    console.log("Found admin:", admin);

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
      adminId: admin.id,
      isOnline: online,
      sessionStatus: online ? "online" : "offline",
    });
  } catch (error) {
    console.error("Shop lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
