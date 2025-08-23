"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
import { IconLoader2, IconPaperclip, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"
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
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

interface Email {
  id: string
  subject: string
  from: string
  to: string[]
  cc: string[]
  bodyText: string | null
  bodyHtml: string | null
  snippet: string | null
  receivedAt: string
  isStarred: boolean
  hasAttachments: boolean
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export default function MailsPage() {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalEmails, setTotalEmails] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    if (session?.user) {
      fetchEmails(1, pageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pageSize])

  // Listen for email sync events to refresh the list
  useEffect(() => {
    const handleEmailsSynced = (event: CustomEvent) => {
      const { success, count, total } = event.detail
      if (success) {
        fetchEmails(currentPage, pageSize) // Refresh the current page
        console.log(`Emails refreshed: ${count} new emails, ${total} total`)
      }
    }

    window.addEventListener('emailsSynced', handleEmailsSynced as EventListener)
    
    return () => {
      window.removeEventListener('emailsSynced', handleEmailsSynced as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEmails = async (page: number = currentPage, limit: number = pageSize) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/emails?page=${page}&limit=${limit}`)
      const data = await response.json()
      
      if (data.success) {
        setEmails(data.emails)
        setTotalEmails(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
        setCurrentPage(data.pagination.page)
      } else {
        toast.error(data.error || "Failed to fetch emails")
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
      toast.error("Failed to fetch emails")
    } finally {
      setLoading(false)
    }
  }

  const viewEmail = async (email: Email) => {
    setSelectedEmail(email)
    setSheetOpen(true)
  }

  const columns: ColumnDef<Email>[] = [
    {
      id: "attachments",
      header: "",
      cell: ({ row }) => {
        const email = row.original
        return email.hasAttachments ? (
          <IconPaperclip className="h-4 w-4 text-muted-foreground" />
        ) : null
      },
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || undefined} alt={user.name || ''} />
              <AvatarFallback>
                {user.name?.charAt(0) || user.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{user.name || user.email}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "from",
      header: "From",
      cell: ({ row }) => {
        const from = row.original.from
        // Extract email address if it's in "Name <email>" format
        const match = from.match(/<(.+)>/)
        const email = match ? match[1] : from
        const name = match ? from.replace(/<.+>/, '').trim() : from
        
        return (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{name}</div>
            {match && <div className="text-xs text-muted-foreground truncate">{email}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => {
        const email = row.original
        return (
          <div className="max-w-[400px]">
            <div className="truncate">{email.subject || "(No Subject)"}</div>
            {email.snippet && (
              <div className="text-sm text-muted-foreground truncate">
                {email.snippet}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "receivedAt",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.original.receivedAt)
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()
        
        return (
          <div className="text-sm text-muted-foreground">
            {isToday 
              ? format(date, "h:mm a")
              : format(date, "MMM d, yyyy")
            }
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: emails,
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
      <Tabs defaultValue="emails" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Emails</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search emails..."
            value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("subject")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      </div>

      <TabsContent value="emails" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
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
                    onClick={() => viewEmail(row.original)}
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
                    No emails found. Click &quot;Sync Emails&quot; to fetch your emails.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalEmails)}-{Math.min(currentPage * pageSize, totalEmails)} of {totalEmails} emails
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
                  setCurrentPage(1) // Reset to first page when changing page size
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
                onClick={() => fetchEmails(1, pageSize)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => fetchEmails(currentPage - 1, pageSize)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => fetchEmails(currentPage + 1, pageSize)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => fetchEmails(totalPages, pageSize)}
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
          {selectedEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">
                  {selectedEmail.subject || "(No Subject)"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={selectedEmail.user.image || undefined} 
                        alt={selectedEmail.user.name || ''} 
                      />
                      <AvatarFallback>
                        {selectedEmail.user.name?.charAt(0) || selectedEmail.user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{selectedEmail.from}</div>
                      <div className="text-sm text-muted-foreground">
                        to {selectedEmail.to.join(", ")}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedEmail.receivedAt), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                  {selectedEmail.cc.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      cc: {selectedEmail.cc.join(", ")}
                    </div>
                  )}
                </div>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selectedEmail.bodyHtml ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                        className="email-content"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {selectedEmail.bodyText || "No content"}
                      </pre>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}