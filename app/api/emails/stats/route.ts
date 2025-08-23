import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.organization?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const organizationId = session.user.organization.id

    // Get sync stats for the current user
    const emailSync = await prisma.emailSync.findUnique({
      where: { userId },
    })

    // Get total email count for the organization
    const totalEmails = await prisma.email.count({
      where: { organizationId },
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalEmails,
        lastSyncAt: emailSync?.lastSyncAt,
        syncStatus: emailSync?.syncStatus || 'idle',
        lastError: emailSync?.lastError,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching email stats:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}