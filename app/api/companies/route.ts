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
    const sortBy = searchParams.get('sortBy') || 'lastSeenAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    interface WhereClause {
      organizationId: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        domain?: { contains: string; mode: 'insensitive' };
      }>;
    }

    const where: WhereClause = {
      organizationId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build orderBy
    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    // Get companies with pagination
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              contacts: true
            }
          }
        }
      }),
      prisma.company.count({ where })
    ])

    return NextResponse.json({
      success: true,
      companies: companies.map(company => ({
        ...company,
        contactCount: company._count.contacts
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[API] Error fetching companies:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}