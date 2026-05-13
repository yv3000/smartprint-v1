import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  // IMPORTANT: only advance lastLoginAt on "online" pings.
  // A previous bug here wrote `new Date(0)` on "offline" pings which instantly
  // tripped the 3-day inactivity check in the dashboard layout and forced the
  // admin to sign in on every restart. Offline state is now tracked purely in
  // the UI; the DB only remembers the most recent time the admin was active.
  if (body.state === "offline") {
    return NextResponse.json({ success: true, state: "offline" });
  }

  await prisma.admin.update({
    where: { userId: session.user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({ success: true, state: "online" });
}
