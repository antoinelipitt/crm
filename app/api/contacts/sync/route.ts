import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  parseEmailString, 
  generateCompanyName,
  isPersonalEmailDomain 
} from '@/lib/email-parser'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.organization?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const organizationId = session.user.organization.id

    console.log(`[API] Starting retroactive contact/company sync for org ${organizationId}`)

    // Get all emails for the organization
    const emails = await prisma.email.findMany({
      where: { organizationId },
      select: {
        from: true,
        to: true,
        cc: true,
        bcc: true,
        receivedAt: true,
      }
    })

    console.log(`[API] Processing ${emails.length} emails for contact/company extraction`)

    // Track unique emails and domains
    const contactsMap = new Map<string, {
      name?: string
      domain?: string
      emailsSent: number
      emailsReceived: number
      firstSeen: Date
      lastSeen: Date
    }>()
    
    const companiesMap = new Map<string, {
      name: string
      emailCount: number
      firstSeen: Date
      lastSeen: Date
    }>()

    // Process all emails
    for (const email of emails) {
      const allEmailStrings = [
        email.from,
        ...email.to,
        ...email.cc,
        ...email.bcc
      ].filter(Boolean)

      const fromParsed = parseEmailString(email.from)
      
      for (const emailStr of allEmailStrings) {
        const parsed = parseEmailString(emailStr)
        if (!parsed) continue

        const isFrom = parsed.email === fromParsed?.email
        
        // Update contact info
        const existing = contactsMap.get(parsed.email) || {
          name: parsed.name,
          domain: parsed.domain,
          emailsSent: 0,
          emailsReceived: 0,
          firstSeen: email.receivedAt,
          lastSeen: email.receivedAt
        }
        
        if (parsed.name && !existing.name) {
          existing.name = parsed.name
        }
        
        if (isFrom) {
          existing.emailsSent++
        } else {
          existing.emailsReceived++
        }
        
        if (email.receivedAt < existing.firstSeen) {
          existing.firstSeen = email.receivedAt
        }
        if (email.receivedAt > existing.lastSeen) {
          existing.lastSeen = email.receivedAt
        }
        
        contactsMap.set(parsed.email, existing)
        
        // Track company domain
        if (parsed.domain && !parsed.isPersonal) {
          const companyExisting = companiesMap.get(parsed.domain) || {
            name: generateCompanyName(parsed.domain),
            emailCount: 0,
            firstSeen: email.receivedAt,
            lastSeen: email.receivedAt
          }
          
          companyExisting.emailCount++
          
          if (email.receivedAt < companyExisting.firstSeen) {
            companyExisting.firstSeen = email.receivedAt
          }
          if (email.receivedAt > companyExisting.lastSeen) {
            companyExisting.lastSeen = email.receivedAt
          }
          
          companiesMap.set(parsed.domain, companyExisting)
        }
      }
    }

    console.log(`[API] Found ${contactsMap.size} unique contacts and ${companiesMap.size} companies`)

    // Save companies first
    const companyIdByDomain = new Map<string, string>()
    
    for (const [domain, data] of companiesMap) {
      const company = await prisma.company.upsert({
        where: {
          domain_organizationId: {
            domain,
            organizationId
          }
        },
        update: {
          emailCount: data.emailCount,
          firstSeenAt: data.firstSeen,
          lastSeenAt: data.lastSeen,
        },
        create: {
          domain,
          name: data.name,
          emailCount: data.emailCount,
          firstSeenAt: data.firstSeen,
          lastSeenAt: data.lastSeen,
          organizationId
        }
      })
      companyIdByDomain.set(domain, company.id)
    }

    // Save contacts
    let contactsCreated = 0
    let contactsUpdated = 0
    
    for (const [email, data] of contactsMap) {
      const companyId = data.domain && !isPersonalEmailDomain(data.domain) 
        ? companyIdByDomain.get(data.domain) 
        : undefined
      
      const existing = await prisma.contact.findUnique({
        where: {
          email_organizationId: {
            email,
            organizationId
          }
        }
      })
      
      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name: data.name || existing.name,
            emailsSent: data.emailsSent,
            emailsReceived: data.emailsReceived,
            firstSeenAt: data.firstSeen,
            lastSeenAt: data.lastSeen,
            companyId
          }
        })
        contactsUpdated++
      } else {
        await prisma.contact.create({
          data: {
            email,
            name: data.name,
            emailsSent: data.emailsSent,
            emailsReceived: data.emailsReceived,
            firstSeenAt: data.firstSeen,
            lastSeenAt: data.lastSeen,
            companyId,
            organizationId
          }
        })
        contactsCreated++
      }
    }

    // Update company contact counts
    for (const companyId of companyIdByDomain.values()) {
      const contactCount = await prisma.contact.count({
        where: { companyId }
      })
      await prisma.company.update({
        where: { id: companyId },
        data: { contactCount }
      })
    }

    const summary = `Sync completed: ${contactsCreated} contacts created, ${contactsUpdated} contacts updated, ${companiesMap.size} companies processed`
    console.log(`[API] ${summary}`)

    return NextResponse.json({
      success: true,
      message: summary,
      stats: {
        contactsCreated,
        contactsUpdated,
        totalContacts: contactsMap.size,
        companiesProcessed: companiesMap.size,
      }
    })
  } catch (error) {
    console.error("[API] Error syncing contacts/companies:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}