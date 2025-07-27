import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getOrganizationMembers, getUserOrganization } from "@/lib/organization"

export async function GET() {
  try {
    // Get the current session
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log(`[API] Fetching organization members for user ${session.user.id}`)

    // Get user's organization
    const userOrg = await getUserOrganization(session.user.id)
    
    if (!userOrg) {
      return NextResponse.json(
        { success: false, error: "User is not part of any organization" },
        { status: 404 }
      )
    }

    console.log(`[API] User belongs to organization ${userOrg.organization.id}`)

    // Get all members of the organization
    const members = await getOrganizationMembers(userOrg.organization.id)

    // Transform the data to match the expected format
    const transformedMembers = members.map(member => ({
      id: member.id,
      user: {
        id: member.user.id,
        name: member.user.name || "Unknown User",
        email: member.user.email,
        image: member.user.image || "",
      },
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    }))

    console.log(`[API] Returning ${transformedMembers.length} members`)

    return NextResponse.json({
      success: true,
      members: transformedMembers
    })

  } catch (error) {
    console.error("[API] Error fetching organization members:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}