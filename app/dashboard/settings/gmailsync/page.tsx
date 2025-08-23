"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { IconLoader2, IconRefresh, IconAlertCircle, IconCheck } from "@tabler/icons-react"

interface GmailSyncSettings {
  maxEmailsPerSync: number
  syncFromDays: number
  useIncrementalSync: boolean
  autoSyncEnabled: boolean
  autoSyncInterval: number
}

interface SyncStats {
  totalEmails: number
  lastSyncAt: string | null
  syncStatus: string
  lastError: string | null
}

export default function GmailSyncPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<GmailSyncSettings>({
    maxEmailsPerSync: 50,
    syncFromDays: 30,
    useIncrementalSync: true,
    autoSyncEnabled: false,
    autoSyncInterval: 60,
  })
  const [originalSettings, setOriginalSettings] = useState<GmailSyncSettings | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  const isOwner = session?.user?.organization?.role === "OWNER"
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  useEffect(() => {
    if (session?.user) {
      fetchSettings()
      fetchSyncStats()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/gmailsync')
      const data = await response.json()
      
      if (data.success && data.settings) {
        setSettings(data.settings)
        setOriginalSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStats = async () => {
    try {
      const response = await fetch('/api/emails/stats')
      const data = await response.json()
      
      if (data.success) {
        setSyncStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching sync stats:", error)
    }
  }

  const handleSaveSettings = async () => {
    if (!isOwner) {
      toast.error("Only organization owners can modify settings")
      return
    }

    setSaving(true)
    
    try {
      const response = await fetch('/api/settings/gmailsync', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success("Settings saved successfully")
        setOriginalSettings(settings)
      } else {
        toast.error(data.error || "Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    
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
          const failedCount = data.details.filter((d: { success: boolean }) => !d.success).length
          
          if (failedCount > 0) {
            toast.warning(`Synced ${successCount} users successfully, ${failedCount} failed`)
          }
          
          // Log details to console for debugging
          console.log("Sync details:", data.details)
        }
        
        // Emit custom event to refresh emails page if open
        window.dispatchEvent(new CustomEvent('emailsSynced', { 
          detail: { 
            success: true, 
            count: data.count, 
            total: data.total,
            message: data.message,
            details: data.details 
          } 
        }))
        // Refresh stats
        fetchSyncStats()
      } else {
        toast.error(data.error || "Failed to sync emails")
        
        // Show details of failures if available
        if (data.details && data.details.length > 0) {
          const failed = data.details.filter((d: { success: boolean }) => !d.success)
          if (failed.length > 0) {
            console.error("Sync failures:", failed)
          }
        }
      }
    } catch (error) {
      console.error("Error syncing emails:", error)
      toast.error("Failed to sync emails")
    } finally {
      setSyncing(false)
    }
  }

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Gmail Sync</h1>
        <p className="text-muted-foreground">
          Configure how emails are synchronized from Gmail for your organization
        </p>
      </div>

      {/* Sync Statistics */}
      <div className="px-4 lg:px-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sync Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Total Emails</Label>
              <p className="text-2xl font-semibold">{syncStats?.totalEmails || 0}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Sync</Label>
              <p className="text-sm">
                {syncStats?.lastSyncAt 
                  ? new Date(syncStats.lastSyncAt).toLocaleString()
                  : "Never"
                }
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant={
                syncStats?.syncStatus === 'completed' ? 'default' :
                syncStats?.syncStatus === 'syncing' ? 'secondary' :
                syncStats?.syncStatus === 'failed' ? 'destructive' :
                'outline'
              }>
                {syncStats?.syncStatus || 'idle'}
              </Badge>
            </div>
            <div>
              <Button 
                onClick={handleSyncNow}
                disabled={syncing || syncStats?.syncStatus === 'syncing'}
                className="w-full"
              >
                {syncing ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <IconRefresh className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {syncStats?.lastError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <IconAlertCircle className="h-4 w-4 mt-0.5" />
                <span>Last sync error: {syncStats.lastError}</span>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* Sync Settings */}
      <div className="px-4 lg:px-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sync Configuration
          </CardTitle>
          <CardDescription>
            {isOwner 
              ? "Configure how emails are synchronized from Gmail"
              : "View sync configuration (Owner access required to modify)"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Emails Per Sync */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxEmails">Max Emails Per Sync</Label>
              <span className="text-sm text-muted-foreground">
                {settings.maxEmailsPerSync} emails
              </span>
            </div>
            <Slider
              id="maxEmails"
              min={10}
              max={500}
              step={10}
              value={[settings.maxEmailsPerSync]}
              onValueChange={([value]) => 
                isOwner && setSettings({ ...settings, maxEmailsPerSync: value })
              }
              disabled={!isOwner}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Number of emails to fetch in each synchronization batch
            </p>
          </div>

          <Separator />

          {/* Sync Period */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="syncDays">Sync Period</Label>
              <span className="text-sm text-muted-foreground">
                Last {settings.syncFromDays} days
              </span>
            </div>
            <Slider
              id="syncDays"
              min={1}
              max={365}
              step={1}
              value={[settings.syncFromDays]}
              onValueChange={([value]) => 
                isOwner && setSettings({ ...settings, syncFromDays: value })
              }
              disabled={!isOwner || settings.useIncrementalSync || settings.autoSyncEnabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {settings.useIncrementalSync || settings.autoSyncEnabled 
                ? "Sync period is disabled when incremental sync or auto sync is enabled"
                : "Fetch emails from the last X days when not using incremental sync"
              }
            </p>
          </div>

          <Separator />

          {/* Incremental Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="incremental">Incremental Sync</Label>
              <p className="text-xs text-muted-foreground">
                Only fetch new emails since last sync (recommended)
              </p>
            </div>
            <Switch
              id="incremental"
              checked={settings.useIncrementalSync}
              onCheckedChange={(checked) => 
                isOwner && setSettings({ ...settings, useIncrementalSync: checked })
              }
              disabled={!isOwner}
            />
          </div>

          <Separator />

          {/* Auto Sync */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSync">Automatic Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync emails at regular intervals
                </p>
              </div>
              <Switch
                id="autoSync"
                checked={settings.autoSyncEnabled}
                onCheckedChange={(checked) => 
                  isOwner && setSettings({ ...settings, autoSyncEnabled: checked })
                }
                disabled={!isOwner}
              />
            </div>
            
            {settings.autoSyncEnabled && (
              <div className="space-y-2 ml-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="syncInterval">Sync Interval</Label>
                  <span className="text-sm text-muted-foreground">
                    Every {settings.autoSyncInterval} minutes
                  </span>
                </div>
                <Slider
                  id="syncInterval"
                  min={5}
                  max={360}
                  step={5}
                  value={[settings.autoSyncInterval]}
                  onValueChange={([value]) => 
                    isOwner && setSettings({ ...settings, autoSyncInterval: value })
                  }
                  disabled={!isOwner}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isOwner && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {hasChanges && "You have unsaved changes"}
                </p>
                <div className="flex gap-2">
                  {hasChanges && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={saving}
                    >
                      Reset
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving || !hasChanges}
                  >
                    {saving ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <IconCheck className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
        </Card>
      </div>

      {!isOwner && (
        <div className="px-4 lg:px-6">
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <IconAlertCircle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-500" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                You need to be an organization owner to modify these settings.
                Contact your organization owner to request changes.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}