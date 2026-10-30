/**
 * GET /api/shops/nearby?lat=X&lng=Y — Find nearby shops
 */
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdminOnline } from "@/lib/adminPresence";

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
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius");

    // Default coordinates: Kandivali East, Mumbai (where shop is registered)
    const lat = latParam ? parseFloat(latParam) : 19.19908;
    const lng = lngParam ? parseFloat(lngParam) : 72.86681;
    const maxRadius = radiusParam ? parseFloat(radiusParam) : 50; // 50 km default radius

    const admins = await prisma.admin.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { shopName: true, qrCode: true, latitude: true, longitude: true, address: true, lastLoginAt: true },
    });

    const shopsWithDistance = admins
      .map((a) => {
        const dist = haversineDistance(lat, lng, a.latitude!, a.longitude!);
        return {
          shopName: a.shopName,
          qrCode: a.qrCode,
          latitude: a.latitude,
          longitude: a.longitude,
          address: a.address || "",
          isOnline: isAdminOnline(a.lastLoginAt),
          distance: dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`,
          distanceKm: dist,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Return shops within radius; if none within radius, return nearest shops so map is never empty
    const nearby = shopsWithDistance.filter((s) => s.distanceKm <= maxRadius);
    const results = nearby.length > 0 ? nearby : shopsWithDistance.slice(0, 5);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in /api/shops/nearby:", error);
    return NextResponse.json({ error: "Failed to fetch nearby shops" }, { status: 500 });
  }
}
