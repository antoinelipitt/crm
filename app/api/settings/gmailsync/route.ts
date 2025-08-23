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

    const organizationId = session.user.organization.id

    // Get or create settings for the organization
    let settings = await prisma.gmailSyncSettings.findUnique({
      where: { organizationId },
    })

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.gmailSyncSettings.create({
        data: {
          organizationId,
          maxEmailsPerSync: 50,
          syncFromDays: 30,
          useIncrementalSync: true,
          autoSyncEnabled: false,
          autoSyncInterval: 60,
        },
      })
    }

    return NextResponse.json({
      success: true,
      settings: {
        maxEmailsPerSync: settings.maxEmailsPerSync,
        syncFromDays: settings.syncFromDays,
        useIncrementalSync: settings.useIncrementalSync,
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSyncInterval: settings.autoSyncInterval,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching Gmail sync settings:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.organization?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is OWNER
    if (session.user.organization?.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Only organization owners can modify settings" },
        { status: 403 }
      )
    }

    const organizationId = session.user.organization.id
    const body = await request.json()

    // Validate input
    const {
      maxEmailsPerSync,
      syncFromDays,
      useIncrementalSync,
      autoSyncEnabled,
      autoSyncInterval,
    } = body

    if (
      typeof maxEmailsPerSync !== 'number' ||
      maxEmailsPerSync < 10 ||
      maxEmailsPerSync > 500
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid maxEmailsPerSync value (10-500)" },
        { status: 400 }
      )
    }

    if (
      typeof syncFromDays !== 'number' ||
      syncFromDays < 1 ||
      syncFromDays > 365
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid syncFromDays value (1-365)" },
        { status: 400 }
      )
    }

    if (typeof useIncrementalSync !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Invalid useIncrementalSync value" },
        { status: 400 }
      )
    }

    if (typeof autoSyncEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Invalid autoSyncEnabled value" },
        { status: 400 }
      )
    }

    if (
      typeof autoSyncInterval !== 'number' ||
      autoSyncInterval < 5 ||
      autoSyncInterval > 360
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid autoSyncInterval value (5-360)" },
        { status: 400 }
      )
    }

    // Update or create settings
    const settings = await prisma.gmailSyncSettings.upsert({
      where: { organizationId },
      update: {
        maxEmailsPerSync,
        syncFromDays,
        useIncrementalSync,
        autoSyncEnabled,
        autoSyncInterval,
        updatedBy: session.user.id,
      },
      create: {
        organizationId,
        maxEmailsPerSync,
        syncFromDays,
        useIncrementalSync,
        autoSyncEnabled,
        autoSyncInterval,
        updatedBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      settings: {
        maxEmailsPerSync: settings.maxEmailsPerSync,
        syncFromDays: settings.syncFromDays,
        useIncrementalSync: settings.useIncrementalSync,
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSyncInterval: settings.autoSyncInterval,
      },
    })
  } catch (error) {
    console.error("[API] Error updating Gmail sync settings:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}