import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.organization?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const organizationId = session.user.organization.id
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filter parameters
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')

    // Build where clause
    interface WhereClause {
      organizationId: string;
      userId?: string;
      OR?: Array<{
        subject?: { contains: string; mode: 'insensitive' };
        from?: { contains: string; mode: 'insensitive' };
        snippet?: { contains: string; mode: 'insensitive' };
      }>;
    }

    const where: WhereClause = {
      organizationId,
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get emails with pagination
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        }
      }),
      prisma.email.count({ where })
    ])

    // Get sync status for all users in organization
    const syncStatuses = await prisma.emailSync.findMany({
      where: {
        user: {
          organizationMemberships: {
            some: {
              organizationId
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      syncStatuses,
    })
  } catch (error) {
    console.error("[API] Error fetching emails:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}