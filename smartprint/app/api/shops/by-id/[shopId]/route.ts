export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminOnline } from "@/lib/adminPresence";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> | { shopId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const shopId = resolvedParams.shopId;

    if (!shopId || typeof shopId !== "string") {
      return NextResponse.json({ success: false, error: "Invalid Shop ID" }, { status: 400 });
    }

    const shop = await prisma.admin.findUnique({
      where: { shopId: String(shopId).toLowerCase().trim() },
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
