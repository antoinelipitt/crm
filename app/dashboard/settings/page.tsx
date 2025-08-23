"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  IconUser, 
  IconMail, 
  IconChevronRight,
  IconBuilding,
  IconSettings
} from "@tabler/icons-react"

interface SettingsCard {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresOwner?: boolean
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.organization?.role === "OWNER"

  const settingsCards: SettingsCard[] = [
    {
      title: "Account",
      description: "Manage your personal account information and preferences",
      href: "/dashboard/settings/account",
      icon: IconUser,
    },
    {
      title: "Organization",
      description: "Manage organization settings and team members",
      href: "/dashboard/settings/organization",
      icon: IconBuilding,
    },
    {
      title: "Gmail Sync",
      description: "Configure email synchronization from Gmail for your organization",
      href: "/dashboard/settings/gmailsync",
      icon: IconMail,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization preferences
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((card) => {
            // Skip cards that require owner permission if user is not owner
            if (card.requiresOwner && !isOwner) {
              return null
            }

            const Icon = card.icon

            return (
              <Link
                key={card.href}
                href={card.href}
                className="transition-all hover:scale-[1.02]"
              >
                <Card className="h-full hover:shadow-lg hover:border-primary/50 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{card.title}</CardTitle>
                        </div>
                      </div>
                      <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{card.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Additional Settings Info */}
      <div className="px-4 lg:px-6">
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IconSettings className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Info
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Your Role</span>
              <span className="font-medium">{session?.user?.organization?.role || 'Member'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Organization</span>
              <span className="font-medium">{session?.user?.organization?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Email</span>
              <span className="font-medium">{session?.user?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}