import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // update every 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn attempt:", user?.email)
      
      // Update lastLoginAt for admin
      try {
        if (user?.id) {
          const admin = await prisma.admin.findUnique({
            where: { userId: user.id }
          })
          if (admin) {
            await prisma.admin.update({
              where: { userId: String(user.id) },
              data: { lastLoginAt: new Date() }
            })
          }
        }
      } catch (e) {
        console.error('Failed to update lastLoginAt:', e)
      }
      
      return true
    },
    async session({ session, user }) {
      console.log("Session created:", session?.user?.email)
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after successful login
      // BUT if we have a specific callbackUrl in the params, use it
      try {
        const searchParams = new URL(url, baseUrl).searchParams;
        const callbackUrl = searchParams.get('callbackUrl');
        
        if (callbackUrl && callbackUrl.includes('/admin/auth-bridge')) {
          return callbackUrl;
        }
      } catch (e) {
        // Fallback for invalid URLs
      }

      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      if (url.startsWith(baseUrl)) {
        return url
      }
      return `${baseUrl}/admin/dashboard`
    }
  },
  pages: {
    signIn: '/admin/auth',
    error: '/admin/auth',
  },
  debug: true,
})
