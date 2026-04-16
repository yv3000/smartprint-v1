import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, shop });
  } catch (error) {
    console.error("Shop lookup error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
