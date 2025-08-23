import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { syncOrganizationEmails } from "@/lib/sync-helpers"

export async function POST() {
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

    console.log(`[API] Starting organization-wide email sync for org ${organizationId} requested by user ${userId}`)

    // Sync emails for all organization members
    const result = await syncOrganizationEmails(organizationId)

    if (result.success) {
      // Log details for monitoring
      console.log(`[API] Sync completed: ${result.summary}`)
      
      // Log individual results for debugging
      for (const userResult of result.results) {
        if (userResult.success) {
          console.log(`[API] ✓ ${userResult.userEmail}: ${userResult.newEmails} new, ${userResult.totalEmails} total`)
        } else {
          console.log(`[API] ✗ ${userResult.userEmail}: ${userResult.error}`)
        }
      }

      return NextResponse.json({
        success: true,
        message: result.summary,
        count: result.totalNewEmails,
        total: result.totalEmails,
        details: result.results, // Include detailed results for transparency
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.summary,
          details: result.results 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[API] Error syncing emails:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}