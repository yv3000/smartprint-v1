/**
 * GET /api/shops/nearby?lat=X&lng=Y — Find nearby shops
 */
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const admins = await prisma.admin.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { shopName: true, qrCode: true, latitude: true, longitude: true, address: true },
  });

  const nearby = admins
    .map((a) => {
      const dist = haversineDistance(lat, lng, a.latitude!, a.longitude!);
      return {
        shopName: a.shopName,
        qrCode: a.qrCode,
        latitude: a.latitude,
        longitude: a.longitude,
        address: a.address || "",
        distance: dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`,
        distanceKm: dist,
      };
    })
    .filter((s) => s.distanceKm <= 1) // Within 1km
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json(nearby);
}
