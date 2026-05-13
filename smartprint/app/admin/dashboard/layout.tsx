import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/auth");
  }

  // Check if admin is onboarded
  const admin = await prisma.admin.findUnique({
    where: { userId: session.user.id },
  });

  if (!admin || !admin.shopName) {
    redirect("/admin/onboarding");
  }

  // 3-day inactivity policy. lastLoginAt is advanced on sign-in, on every
  // dashboard visit, and on each "online" heartbeat from the Electron admin
  // app. If none of those have happened in 3 days → wipe session, force
  // re-login.
  const lastLogin = admin.lastLoginAt;
  const now = Date.now();
  const daysSinceLogin = lastLogin ? now - lastLogin.getTime() : Infinity;

  if (daysSinceLogin > THREE_DAYS_MS) {
    await prisma.session.deleteMany({
      where: { userId: session.user.id },
    });
    redirect("/admin/auth?reason=session_expired");
  }

  // Visiting the dashboard counts as activity — refresh so the session doesn't
  // expire while the admin is actively using the app from a browser (where the
  // Electron heartbeat doesn't run). Skip the write if we updated recently to
  // avoid hammering the DB on every render.
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (!lastLogin || now - lastLogin.getTime() > FIVE_MINUTES_MS) {
    await prisma.admin.update({
      where: { userId: session.user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  return <>{children}</>;
}
