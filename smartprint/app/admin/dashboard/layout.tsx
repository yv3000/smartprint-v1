import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  // Check 3 days inactivity
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const lastLogin = admin.lastLoginAt || new Date();
  const daysSinceLogin = Date.now() - lastLogin.getTime();
  
  if (daysSinceLogin > THREE_DAYS_MS) {
    // Invalidate session in DB
    await prisma.session.deleteMany({
      where: { userId: session.user.id }
    });
    redirect("/admin/auth?reason=session_expired");
  }

  return <>{children}</>;
}
