import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const params = await context.params
  try {
    // Get the current session
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log(`[API] Updating role for member ${params.memberId} by user ${session.user.id}`)

    // Get the request body
    const { role } = await request.json()
    
    if (!role || !["OWNER", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Must be OWNER or MEMBER" },
        { status: 400 }
      )
    }

    // Check if the current user is an owner
    const currentUserMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true }
    })

    if (!currentUserMembership || currentUserMembership.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Only organization owners can change member roles" },
        { status: 403 }
      )
    }

    console.log(`[API] Current user is owner of organization ${currentUserMembership.organization.id}`)

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: params.memberId },
      include: { organization: true }
    })

    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Check if the target member is in the same organization
    if (targetMember.organizationId !== currentUserMembership.organizationId) {
      return NextResponse.json(
        { success: false, error: "Member not in your organization" },
        { status: 403 }
      )
    }

    // If trying to demote an owner, check that there will be at least one owner left
    if (role === "MEMBER" && targetMember.role === "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: currentUserMembership.organizationId,
          role: "OWNER"
        }
      })

      if (ownerCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot demote the last owner. There must be at least one owner in the organization." },
          { status: 400 }
        )
      }
    }

    // Update the member's role
    const updatedMember = await prisma.organizationMember.update({
      where: { id: params.memberId },
      data: { role: role as Role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    console.log(`[API] Successfully updated member ${params.memberId} role to ${role}`)

    return NextResponse.json({
      success: true,
      member: {
        id: updatedMember.id,
        user: updatedMember.user,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt.toISOString()
      }
    })

  } catch (error) {
    console.error("[API] Error updating member role:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}