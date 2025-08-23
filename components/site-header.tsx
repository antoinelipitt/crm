"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { IconRefresh, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isSyncing, setIsSyncing] = React.useState(false)
  
  // Parse pathname to get breadcrumb segments
  const segments = pathname
    .split('/')
    .filter(segment => segment && segment !== 'dashboard')
  
  // Capitalize first letter of each segment
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  const handleSyncEmails = async () => {
    if (!session?.user) {
      toast.error("You must be logged in to sync emails")
      return
    }

    setIsSyncing(true)
    
    try {
      const response = await fetch('/api/emails/sync', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || "Emails synced successfully")
        
        // Show details if available
        if (data.details && data.details.length > 0) {
          const successCount = data.details.filter((d: { success: boolean }) => d.success).length
          const totalCount = data.details.length
          console.log(`Synced ${successCount}/${totalCount} users:`, data.details)
        }
        
        // Emit custom event to notify emails page to refresh
        window.dispatchEvent(new CustomEvent('emailsSynced', { 
          detail: { 
            success: true, 
            count: data.count, 
            total: data.total,
            message: data.message,
            details: data.details 
          } 
        }))
      } else {
        toast.error(data.error || "Failed to sync emails")
      }
    } catch (error) {
      console.error("Error syncing emails:", error)
      toast.error("Failed to sync emails")
    } finally {
      setIsSyncing(false)
    }
  }
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.length === 0 ? (
              <BreadcrumbItem>
                <span>Home</span>
              </BreadcrumbItem>
            ) : (
              segments.map((segment, index) => {
                const path = `/dashboard/${segments.slice(0, index + 1).join('/')}`
                const isLast = index === segments.length - 1
                
                return (
                  <React.Fragment key={path}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <span>{capitalize(segment)}</span>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={path}>
                            {capitalize(segment)}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                )
              })
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncEmails}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <IconRefresh className="h-4 w-4" />
                Sync Emails
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
