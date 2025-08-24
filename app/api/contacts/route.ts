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
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const sortBy = searchParams.get('sortBy') || 'lastSeenAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    interface WhereClause {
      organizationId: string;
      companyId?: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    }

    const where: WhereClause = {
      organizationId,
    }

    if (companyId) {
      where.companyId = companyId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build orderBy
    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    // Get contacts with pagination
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              domain: true,
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ])

    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[API] Error fetching contacts:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}