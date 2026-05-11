import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOfflineTimestamp } from "@/lib/adminPresence";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  const clientHint = req.headers.get("x-smartprint-client") || "";
  const isElectron = userAgent.includes("Electron") || clientHint.toLowerCase() === "electron";

  if (!isElectron) {
    return NextResponse.json({ error: "Heartbeat allowed only from admin app" }, { status: 403 });
  }

  let body: { state?: "online" | "offline" } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const nextSeenAt = body.state === "offline" ? getOfflineTimestamp() : new Date();

  await prisma.admin.update({
    where: { userId: session.user.id },
    data: { lastLoginAt: nextSeenAt },
  });

  return NextResponse.json({ success: true, state: body.state === "offline" ? "offline" : "online" });
}
