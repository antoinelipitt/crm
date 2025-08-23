import { prisma } from "@/lib/prisma"
import { GmailClient } from "@/lib/gmail"
import { getValidGoogleToken } from "@/lib/google-auth"

export interface UserSyncResult {
  userId: string
  userName: string
  userEmail: string
  success: boolean
  newEmails: number
  totalEmails: number
  error?: string
}

/**
 * Synchronize emails for a single user
 */
export async function syncUserEmails(
  userId: string, 
  organizationId: string
): Promise<UserSyncResult> {
  // Get user details for reporting
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true }
  })

  const result: UserSyncResult = {
    userId,
    userName: user?.name || "Unknown",
    userEmail: user?.email || "Unknown",
    success: false,
    newEmails: 0,
    totalEmails: 0,
  }

  try {
    // Check if user has a Google account connected
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google'
      }
    })

    if (!account) {
      result.error = "No Google account connected"
      return result
    }

    // Get valid access token (will refresh if needed)
    let tokens
    try {
      tokens = await getValidGoogleToken(userId)
    } catch (error: unknown) {
      result.error = error instanceof Error ? error.message : "Failed to get valid access token"
      return result
    }

    // Check if another sync is already in progress for this user
    const existingSync = await prisma.emailSync.findUnique({
      where: { userId },
    })

    if (existingSync?.syncStatus === 'syncing') {
      result.error = "Sync already in progress for this user"
      return result
    }

    // Initialize Gmail client and sync emails
    const gmailClient = new GmailClient(
      tokens.access_token,
      tokens.refresh_token ?? undefined,
      userId
    )
    
    const syncResult = await gmailClient.syncEmails(userId, organizationId)

    if (syncResult.success) {
      result.success = true
      result.newEmails = syncResult.count || 0
      result.totalEmails = syncResult.total || 0
    } else {
      result.error = syncResult.error || "Unknown sync error"
    }

    return result
  } catch (error) {
    console.error(`[Sync] Error syncing emails for user ${userId}:`, error)
    result.error = error instanceof Error ? error.message : "Internal error"
    return result
  }
}

/**
 * Synchronize emails for all members of an organization
 */
export async function syncOrganizationEmails(
  organizationId: string
): Promise<{
  success: boolean
  totalNewEmails: number
  totalEmails: number
  results: UserSyncResult[]
  summary: string
}> {
  try {
    // Get all members of the organization
    const organizationMembers = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          include: {
            accounts: {
              where: { provider: 'google' }
            }
          }
        }
      }
    })

    console.log(`[Sync] Found ${organizationMembers.length} members in organization ${organizationId}`)

    // Filter members who have Google accounts connected
    const membersWithGoogle = organizationMembers.filter(
      member => member.user.accounts.length > 0
    )

    console.log(`[Sync] ${membersWithGoogle.length} members have Google accounts connected`)

    if (membersWithGoogle.length === 0) {
      return {
        success: false,
        totalNewEmails: 0,
        totalEmails: 0,
        results: [],
        summary: "No members have Google accounts connected"
      }
    }

    // Sync emails for all members in parallel (with limit)
    const BATCH_SIZE = 3 // Process 3 users at a time to avoid overwhelming the API
    const results: UserSyncResult[] = []
    
    for (let i = 0; i < membersWithGoogle.length; i += BATCH_SIZE) {
      const batch = membersWithGoogle.slice(i, i + BATCH_SIZE)
      
      const batchPromises = batch.map(member =>
        syncUserEmails(member.userId, organizationId)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Handle rejected promise
          const member = batch[results.length % BATCH_SIZE]
          results.push({
            userId: member.userId,
            userName: member.user.name || "Unknown",
            userEmail: member.user.email,
            success: false,
            newEmails: 0,
            totalEmails: 0,
            error: result.reason?.message || "Sync failed"
          })
        }
      }
      
      console.log(`[Sync] Completed batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(membersWithGoogle.length / BATCH_SIZE)}`)
    }

    // Calculate totals
    const successfulSyncs = results.filter(r => r.success)
    const totalNewEmails = successfulSyncs.reduce((sum, r) => sum + r.newEmails, 0)
    const totalEmails = successfulSyncs.reduce((sum, r) => sum + r.totalEmails, 0)

    // Generate summary
    const summary = `Synced ${successfulSyncs.length}/${membersWithGoogle.length} users. ${totalNewEmails} new emails added.`

    return {
      success: successfulSyncs.length > 0,
      totalNewEmails,
      totalEmails,
      results,
      summary
    }
  } catch (error) {
    console.error(`[Sync] Error syncing organization emails:`, error)
    return {
      success: false,
      totalNewEmails: 0,
      totalEmails: 0,
      results: [],
      summary: error instanceof Error ? error.message : "Failed to sync organization emails"
    }
  }
}