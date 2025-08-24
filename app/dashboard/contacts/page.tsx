"use client"

import { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { 
  IconLoader2, 
  IconChevronLeft, 
  IconChevronRight, 
  IconChevronsLeft, 
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconBuilding
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface Company {
  id: string
  name: string | null
  domain: string
}

interface Contact {
  id: string
  email: string
  name: string | null
  emailsSent: number
  emailsReceived: number
  firstSeenAt: string
  lastSeenAt: string
  company: Company | null
}

interface Email {
  id: string
  subject: string
  from: string
  receivedAt: string
  snippet: string | null
}

function ContactsPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyIdFilter = searchParams.get('companyId')
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactEmails, setContactEmails] = useState<Email[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalContacts, setTotalContacts] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    if (session?.user) {
      fetchContacts(1, pageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pageSize, companyIdFilter])

  const fetchContacts = async (page: number = currentPage, limit: number = pageSize) => {
    try {
      setLoading(true)
      let url = `/api/contacts?page=${page}&limit=${limit}`
      if (companyIdFilter) {
        url += `&companyId=${companyIdFilter}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setContacts(data.contacts)
        setTotalContacts(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
        setCurrentPage(data.pagination.page)
      } else {
        toast.error(data.error || "Failed to fetch contacts")
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
      toast.error("Failed to fetch contacts")
    } finally {
      setLoading(false)
    }
  }

  const viewContact = async (contact: Contact) => {
    setSelectedContact(contact)
    setSheetOpen(true)
    
    // Fetch recent emails for this contact
    try {
      const response = await fetch(`/api/emails?search=${encodeURIComponent(contact.email)}&limit=10`)
      const data = await response.json()
      
      if (data.success) {
        setContactEmails(data.emails)
      }
    } catch (error) {
      console.error("Error fetching contact emails:", error)
    }
  }

  const navigateToCompany = () => {
    router.push(`/dashboard/companies`)
  }


  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "name",
      header: "Contact",
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div>
            <div className="font-medium">
              {contact.name || contact.email}
            </div>
            {contact.name && (
              <div className="text-sm text-muted-foreground">
                {contact.email}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => {
        const company = row.original.company
        if (!company) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div>
            <div className="text-sm">{company.name || company.domain}</div>
            <div className="text-xs text-muted-foreground">{company.domain}</div>
          </div>
        )
      },
    },
    {
      id: "emailActivity",
      header: "Email Activity",
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <IconArrowUp className="h-3 w-3 text-muted-foreground" />
              <span>{contact.emailsSent} sent</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <IconArrowDown className="h-3 w-3 text-muted-foreground" />
              <span>{contact.emailsReceived} received</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "firstSeenAt",
      header: "First Seen",
      cell: ({ row }) => {
        const date = new Date(row.original.firstSeenAt)
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </div>
        )
      },
    },
    {
      accessorKey: "lastSeenAt",
      header: "Last Activity",
      cell: ({ row }) => {
        const date = new Date(row.original.lastSeenAt)
        
        // Normalize dates to midnight for calendar day comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const activityDate = new Date(date)
        activityDate.setHours(0, 0, 0, 0)
        
        const daysSince = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return (
          <div>
            <div className="text-sm">{format(date, "MMM d, yyyy")}</div>
            <div className="text-xs text-muted-foreground">
              {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince} days ago`}
            </div>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize,
      },
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="contacts" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Contacts</h1>
            {companyIdFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/contacts')}
              >
                Clear filter
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search contacts..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
        </div>

        <TabsContent value="contacts" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => viewContact(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No contacts found. Contacts are automatically detected during email synchronization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalContacts)}-
              {Math.min(currentPage * pageSize, totalContacts)} of {totalContacts} contacts
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => fetchContacts(1, pageSize)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => fetchContacts(currentPage - 1, pageSize)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => fetchContacts(currentPage + 1, pageSize)}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Go to next page</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => fetchContacts(totalPages, pageSize)}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Go to last page</span>
                  <IconChevronsRight />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">
                  {selectedContact.name || selectedContact.email}
                </SheetTitle>
                {selectedContact.name && (
                  <SheetDescription>
                    {selectedContact.email}
                  </SheetDescription>
                )}
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {selectedContact.company && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <IconBuilding className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {selectedContact.company.name || selectedContact.company.domain}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedContact.company.domain}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSheetOpen(false)
                        navigateToCompany()
                      }}
                    >
                      View Company
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Emails Sent</p>
                    <p className="text-2xl font-semibold">{selectedContact.emailsSent}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Emails Received</p>
                    <p className="text-2xl font-semibold">{selectedContact.emailsReceived}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">First Interaction</p>
                    <p className="text-sm">
                      {format(new Date(selectedContact.firstSeenAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Interaction</p>
                    <p className="text-sm">
                      {format(new Date(selectedContact.lastSeenAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Recent Emails</h3>
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {contactEmails.map((email) => (
                        <div
                          key={email.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">
                              {email.subject || "(No Subject)"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(email.receivedAt), "MMM d")}
                            </p>
                          </div>
                          {email.snippet && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {email.snippet}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            From: {email.from}
                          </p>
                        </div>
                      ))}
                      {contactEmails.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No recent emails found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ContactsPageContent />
    </Suspense>
  )
}