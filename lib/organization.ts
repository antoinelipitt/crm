import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export function extractDomain(email: string): string {
  const domain = email.split('@')[1]
  if (!domain) {
    throw new Error('Invalid email format')
  }
  return domain.toLowerCase()
}

export function generateOrganizationName(domain: string): string {
  // Convert domain to a readable organization name
  // example.com -> Example
  // my-company.co.uk -> My Company
  const baseName = domain.split('.')[0]
  return baseName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function getOrCreateOrganization(userEmail: string, userId: string) {
  console.log(`[getOrCreateOrganization] Starting for user ${userId} with email ${userEmail}`)
  
  const domain = extractDomain(userEmail)
  const organizationName = generateOrganizationName(domain)
  console.log(`[getOrCreateOrganization] Domain: ${domain}, Organization name: ${organizationName}`)

  // Verify user exists first
  const userExists = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!userExists) {
    console.error(`[getOrCreateOrganization] User ${userId} does not exist in database`)
    throw new Error(`User ${userId} not found`)
  }
  console.log(`[getOrCreateOrganization] User ${userId} exists in database`)

  // Check if organization exists
  let organization = await prisma.organization.findUnique({
    where: { domain },
    include: {
      members: {
        where: { userId },
      },
    },
  })

  let isNewOrganization = false
  let userRole: Role = Role.MEMBER

  if (!organization) {
    console.log(`[getOrCreateOrganization] Organization for domain ${domain} does not exist, creating...`)
    // Create new organization
    organization = await prisma.organization.create({
      data: {
        name: organizationName,
        domain,
      },
      include: {
        members: true,
      },
    })
    isNewOrganization = true
    userRole = Role.OWNER
    console.log(`[getOrCreateOrganization] Created organization ${organization.id} with name ${organizationName}`)
  } else {
    console.log(`[getOrCreateOrganization] Found existing organization ${organization.id} for domain ${domain}`)
  }

  // Check if user is already a member
  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: organization.id,
      },
    },
  })

  if (!existingMembership) {
    console.log(`[getOrCreateOrganization] User ${userId} is not a member, adding with role ${userRole}`)
    // Add user to organization
    await prisma.organizationMember.create({
      data: {
        userId,
        organizationId: organization.id,
        role: userRole,
      },
    })
    console.log(`[getOrCreateOrganization] Successfully added user ${userId} to organization ${organization.id}`)
  } else {
    console.log(`[getOrCreateOrganization] User ${userId} is already a member with role ${existingMembership.role}`)
  }

  console.log(`[getOrCreateOrganization] Completed for user ${userId}`)
  return {
    organization,
    isNewOrganization,
    userRole: existingMembership?.role || userRole,
  }
}

export async function getUserOrganization(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: true,
    },
  })

  return membership ? {
    organization: membership.organization,
    role: membership.role,
    joinedAt: membership.joinedAt,
  } : null
}

export async function getOrganizationMembers(organizationId: string) {
  console.log(`[getOrganizationMembers] Fetching members for organization ${organizationId}`)
  
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }
    },
    orderBy: [
      { role: 'asc' }, // OWNER first, then MEMBER
      { joinedAt: 'asc' }
    ]
  })

  console.log(`[getOrganizationMembers] Found ${members.length} members`)
  return members
}
export async function updateMemberRole(memberId: string, newRole: Role, currentUserId: string) {
  console.log(`[updateMemberRole] Updating member ${memberId} to role ${newRole} by user ${currentUserId}`)

  // Get current user's membership to verify they're an owner
  const currentUserMembership = await prisma.organizationMember.findFirst({
    where: { userId: currentUserId },
    include: { organization: true }
  })

  if (!currentUserMembership || currentUserMembership.role !== Role.OWNER) {
    throw new Error('Only organization owners can change member roles')
  }

  // Get target member
  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    include: { organization: true }
  })

  if (!targetMember) {
    throw new Error('Member not found')
  }

  // Verify same organization
  if (targetMember.organizationId !== currentUserMembership.organizationId) {
    throw new Error('Member not in your organization')
  }

  // Check last owner constraint
  if (newRole === Role.MEMBER && targetMember.role === Role.OWNER) {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId: currentUserMembership.organizationId,
        role: Role.OWNER
      }
    })

    if (ownerCount <= 1) {
      throw new Error('Cannot demote the last owner. There must be at least one owner in the organization.')
    }
  }

  // Update the role
  const updatedMember = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole },
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

  console.log(`[updateMemberRole] Successfully updated member ${memberId} to ${newRole}`)
  return updatedMember
}