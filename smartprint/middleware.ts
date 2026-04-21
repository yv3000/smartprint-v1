import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Check for NextAuth session cookies directly to avoid importing Prisma in Edge Runtime
  // NextAuth v4 uses 'next-auth.session-token', v5 uses 'authjs.session-token'
  const sessionCookie = req.cookies.get('__Secure-authjs.session-token') ||
                        req.cookies.get('authjs.session-token') ||
                        req.cookies.get('next-auth.session-token') || 
                        req.cookies.get('__Secure-next-auth.session-token');
  const isLoggedIn = !!sessionCookie;

  // Admin routes — require authentication
  if (pathname.startsWith('/admin')) {
    // Allow auth page, electron callback, and bridge always
    if (pathname === '/admin/auth' || pathname === '/admin/electron-callback' || pathname === '/admin/auth-bridge') {
      return NextResponse.next()
    }
    // Allow NextAuth API routes
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    // Redirect to login if not authenticated
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/admin/auth', req.url))
    }
  }

  // User routes — always public, no auth needed
  if (pathname.startsWith('/user') || pathname === '/') {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/user/:path*',
    '/api/((?!auth).)*',
  ]
}
