import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminOnline } from "@/lib/adminPresence";

export async function GET(
  req: Request,
  { params }: { params: { shopId: string } }
) {
  try {
    const { shopId } = params;

    const shop = await prisma.admin.findUnique({
      where: { shopId: String(shopId).toLowerCase() },
      select: {
        shopName: true,
        qrCode: true,
        lastLoginAt: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    const online = isAdminOnline(shop.lastLoginAt);
    if (!online) {
      return NextResponse.json({ success: false, error: "Shop is offline", isOnline: false }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      shop: { shopName: shop.shopName, qrCode: shop.qrCode, isOnline: true },
    });
  } catch (error) {
    console.error("Shop lookup error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
