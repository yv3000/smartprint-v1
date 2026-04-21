import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Generate one-time transfer token
    const transferToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes

    // Store in database
    await prisma.electronTransferToken.create({
      data: {
        token: transferToken,
        userId: session.user.id,
        expiresAt,
        used: false
      }
    })

    return NextResponse.json({ transferToken })
  } catch (error) {
    console.error('Transfer token error:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Verify and consume the transfer token
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  try {
    const transferRecord = await prisma.electronTransferToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!transferRecord) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (transferRecord.used) {
      return NextResponse.json({ error: 'Token already used' }, { status: 410 })
    }

    if (transferRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }

    // Mark as used
    await prisma.electronTransferToken.update({
      where: { token },
      data: { used: true }
    })

    // Get the actual NextAuth session token for this user
    const dbSession = await prisma.session.findFirst({
      where: {
        userId: transferRecord.userId,
        expires: { gt: new Date() }
      },
      orderBy: { expires: 'desc' }
    })

    if (!dbSession) {
      return NextResponse.json({ error: 'No active session' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      sessionToken: dbSession.sessionToken,
      userEmail: transferRecord.user.email,
      userName: transferRecord.user.name,
      userId: transferRecord.userId
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
