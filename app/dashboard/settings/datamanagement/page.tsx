"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  IconLoader2,
  IconTrash,
  IconAlertTriangle,
  IconMail,
  IconUsers,
  IconBuilding,
  IconShieldCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"

interface DataStats {
  totalEmails: number
  totalContacts: number
  totalCompanies: number
}

interface DeleteProgress {
  isRunning: boolean
  progress: number
  currentStep: string
  logs: string[]
}

export default function DataManagementPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DataStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({
    isRunning: false,
    progress: 0,
    currentStep: '',
    logs: []
  })
  const [confirmationText, setConfirmationText] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)

  const isOwner = session?.user?.organization?.role === "OWNER"

  useEffect(() => {
    if (session?.user && isOwner) {
      fetchStats()
    }
  }, [session, isOwner])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch emails count
      const emailsResponse = await fetch('/api/emails/stats')
      const emailsData = await emailsResponse.json()
      
      // Fetch contacts count
      const contactsResponse = await fetch('/api/contacts?limit=1')
      const contactsData = await contactsResponse.json()
      
      // Fetch companies count
      const companiesResponse = await fetch('/api/companies?limit=1')
      const companiesData = await companiesResponse.json()
      
      setStats({
        totalEmails: emailsData.success ? emailsData.stats?.totalEmails || 0 : 0,
        totalContacts: contactsData.success ? contactsData.pagination?.total || 0 : 0,
        totalCompanies: companiesData.success ? companiesData.pagination?.total || 0 : 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to fetch data statistics")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = () => {
    setShowConfirmation(true)
    setConfirmationText("")
  }

  const executeDataDeletion = async () => {
    if (confirmationText !== "DELETE ALL DATA") {
      toast.error("Please type 'DELETE ALL DATA' to confirm")
      return
    }

    try {
      setDeleteProgress({
        isRunning: true,
        progress: 0,
        currentStep: 'Preparing to delete all data...',
        logs: ['Starting data deletion process...']
      })
      setShowConfirmation(false)

      const response = await fetch('/api/data/delete-all', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setDeleteProgress(prev => ({
          ...prev,
          isRunning: false,
          progress: 100,
          currentStep: 'Completed',
          logs: [...prev.logs, 'Data deletion completed successfully!']
        }))
        
        // Refresh stats
        fetchStats()
        
        toast.success(data.message)
      } else {
        setDeleteProgress(prev => ({
          ...prev,
          isRunning: false,
          logs: [...prev.logs, `Error: ${data.error}`]
        }))
        toast.error(data.error || "Failed to delete data")
      }
    } catch (error) {
      setDeleteProgress(prev => ({
        ...prev,
        isRunning: false,
        logs: [...prev.logs, `Error: ${error}`]
      }))
      console.error("Error deleting data:", error)
      toast.error("Failed to delete data")
    }
  }

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
          <p className="text-muted-foreground">
            Manage synchronized data for your organization
          </p>
        </div>
        
        <div className="px-4 lg:px-6">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <IconShieldCheck className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  Only organization owners can access data management features.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">
          Manage and delete synchronized data for your organization
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <IconMail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmails || 0}</div>
              <p className="text-xs text-muted-foreground">
                Synchronized from Gmail
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalContacts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Extracted from emails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
              <p className="text-xs text-muted-foreground">
                Detected from domains
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Data Section */}
      <div className="px-4 lg:px-6">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete all synchronized data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!deleteProgress.isRunning && !showConfirmation ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <h4 className="font-medium text-red-900 mb-2">This will permanently delete:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• All {stats?.totalEmails || 0} synchronized emails</li>
                    <li>• All {stats?.totalContacts || 0} contacts and their data</li>
                    <li>• All {stats?.totalCompanies || 0} companies and their data</li>
                    <li>• All email synchronization settings and history</li>
                  </ul>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={handleDeleteRequest}
                  disabled={!stats || (stats.totalEmails === 0 && stats.totalContacts === 0 && stats.totalCompanies === 0)}
                  className="w-full sm:w-auto"
                >
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete All Synchronized Data
                </Button>
              </div>
            ) : showConfirmation ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmation">Type &quot;DELETE ALL DATA&quot; to confirm:</Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="DELETE ALL DATA"
                    className="font-mono"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={executeDataDeletion}
                    disabled={confirmationText !== "DELETE ALL DATA"}
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Confirm Deletion
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmation(false)
                      setConfirmationText("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{deleteProgress.currentStep}</span>
                    <span>{deleteProgress.progress}%</span>
                  </div>
                  <Progress value={deleteProgress.progress} className="w-full" />
                </div>
                
                {deleteProgress.logs.length > 0 && (
                  <ScrollArea className="h-32 w-full rounded border p-3">
                    <div className="space-y-1">
                      {deleteProgress.logs.map((log, index) => (
                        <div key={index} className="text-xs font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}