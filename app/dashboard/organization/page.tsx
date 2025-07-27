"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconDotsVertical } from "@tabler/icons-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface OrganizationMember {
  id: string
  user: {
    id: string
    name: string
    email: string
    image: string
  }
  role: "OWNER" | "MEMBER"
  joinedAt: string
}

export default function OrganizationPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrganizationMembers() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        console.log("[Organization Page] Fetching organization members...")
        const response = await fetch('/api/organization/members')
        const data = await response.json()

        if (data.success) {
          console.log(`[Organization Page] Loaded ${data.members.length} members`)
          setMembers(data.members)
        } else {
          console.error("[Organization Page] Failed to fetch members:", data.error)
          // Fallback to empty array if there's an error
          setMembers([])
        }
      } catch (error) {
        console.error("[Organization Page] Error fetching members:", error)
        // Fallback to empty array if there's an error
        setMembers([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizationMembers()
  }, [session])

  if (!session?.user) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading organization information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleRoleChange = async (memberId: string, newRole: "OWNER" | "MEMBER") => {
    if (session?.user?.organization?.role !== "OWNER") {
      toast.error("Only owners can change member roles")
      return
    }

    // Check if we're trying to demote the last owner
    if (newRole === "MEMBER") {
      const ownerCount = members.filter(m => m.role === "OWNER").length
      if (ownerCount <= 1) {
        toast.error("Cannot demote the last owner. There must be at least one owner in the organization.")
        return
      }
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/organization/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberId 
              ? { ...member, role: newRole }
              : member
          )
        )
        toast.success(`Member ${newRole === "OWNER" ? "promoted to" : "demoted to"} ${newRole.toLowerCase()}`)  
      } else {
        toast.error(data.error || "Failed to update member role")
      }
    } catch (error) {
      console.error("Error updating member role:", error)
      toast.error("Failed to update member role")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and members
        </p>
      </div>

      <div className="grid gap-6">
        {/* Organization Overview */}
        {loading ? (
          <div className="px-4 lg:px-6">
            <Card>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardContent>
            </Card>
          </div>
        ) : (
          session.user.organization && (
            <div className="px-4 lg:px-6">
              <Card>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{session.user.organization.name}</h3>
                  <p className="text-muted-foreground">@{session.user.email?.split('@')[1]}</p>
                </div>
              </CardContent>
              </Card>
            </div>
          )
        )}

        {/* Organization Members */}
        {loading ? (
          <div className="px-4 lg:px-6">
            <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        ) : (
          <div className="px-4 lg:px-6">
            <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.image} alt={member.user.name} />
                          <AvatarFallback>
                            {getInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {session?.user?.organization?.role === "OWNER" && member.user.id !== session.user.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 ml-auto"
                              size="icon"
                              disabled={loading}
                            >
                              <IconDotsVertical />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === "MEMBER" ? (
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, "OWNER")}>
                                Upgrade to Owner
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, "MEMBER")}>
                                Downgrade to Member
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}