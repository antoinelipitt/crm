import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface DeletionStats {
  contactsDeleted: number
  companiesDeleted: number
  emailsDeleted: number
  emailSyncsDeleted: number
}

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.organization?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only organization owners can delete all data
    if (session.user.organization.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Only organization owners can delete synchronized data" },
        { status: 403 }
      )
    }

    const organizationId = session.user.organization.id

    console.log(`[DELETE-ALL] Starting data deletion for organization ${organizationId} by user ${session.user.id}`)

    const stats: DeletionStats = {
      contactsDeleted: 0,
      companiesDeleted: 0,
      emailsDeleted: 0,
      emailSyncsDeleted: 0
    }

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // 1. Delete all contacts for the organization
      const contactsResult = await tx.contact.deleteMany({
        where: { organizationId }
      })
      stats.contactsDeleted = contactsResult.count
      console.log(`[DELETE-ALL] Deleted ${stats.contactsDeleted} contacts`)

      // 2. Delete all companies for the organization
      const companiesResult = await tx.company.deleteMany({
        where: { organizationId }
      })
      stats.companiesDeleted = companiesResult.count
      console.log(`[DELETE-ALL] Deleted ${stats.companiesDeleted} companies`)

      // 3. Delete all emails for the organization
      const emailsResult = await tx.email.deleteMany({
        where: { organizationId }
      })
      stats.emailsDeleted = emailsResult.count
      console.log(`[DELETE-ALL] Deleted ${stats.emailsDeleted} emails`)

      // 4. Delete email sync records for all organization members
      const organizationMembers = await tx.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true }
      })

      for (const member of organizationMembers) {
        const emailSyncResult = await tx.emailSync.deleteMany({
          where: { userId: member.userId }
        })
        stats.emailSyncsDeleted += emailSyncResult.count
      }
      console.log(`[DELETE-ALL] Deleted ${stats.emailSyncsDeleted} email sync records`)

      // 5. Reset Gmail sync settings if they exist
      await tx.gmailSyncSettings.updateMany({
        where: { organizationId },
        data: {
          maxEmailsPerSync: 50,
          syncFromDays: 30,
          useIncrementalSync: true,
          autoSyncEnabled: false,
          autoSyncInterval: 60,
          updatedAt: new Date(),
          updatedBy: session.user.id
        }
      })
      console.log(`[DELETE-ALL] Reset Gmail sync settings`)
    })

    const totalDeleted = stats.contactsDeleted + stats.companiesDeleted + stats.emailsDeleted + stats.emailSyncsDeleted
    const summary = `Data deletion completed: ${stats.emailsDeleted} emails, ${stats.contactsDeleted} contacts, ${stats.companiesDeleted} companies, and ${stats.emailSyncsDeleted} sync records deleted`
    
    console.log(`[DELETE-ALL] ${summary}`)

    // Log the action for security audit
    console.log(`[SECURITY-AUDIT] Organization data deleted by user ${session.user.email} (${session.user.id}) for organization ${organizationId}`)

    return NextResponse.json({
      success: true,
      message: summary,
      stats: {
        ...stats,
        totalDeleted,
        organizationId
      }
    })
  } catch (error) {
    console.error("[DELETE-ALL] Error deleting organization data:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}