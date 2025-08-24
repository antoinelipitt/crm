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
import { 
  IconLoader2, 
  IconChevronLeft, 
  IconChevronRight, 
  IconChevronsLeft, 
  IconChevronsRight,
  IconUsers,
  IconMail
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
import { useRouter } from "next/navigation"

interface Company {
  id: string
  domain: string
  name: string | null
  emailCount: number
  contactCount: number
  firstSeenAt: string
  lastSeenAt: string
  website: string | null
  industry: string | null
  size: string | null
  logoUrl: string | null
}

interface Contact {
  id: string
  email: string
  name: string | null
  emailsSent: number
  emailsReceived: number
  lastSeenAt: string
}

export default function CompaniesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCompanies, setTotalCompanies] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    if (session?.user) {
      fetchCompanies(1, pageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pageSize])

  const fetchCompanies = async (page: number = currentPage, limit: number = pageSize) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/companies?page=${page}&limit=${limit}`)
      const data = await response.json()
      
      if (data.success) {
        setCompanies(data.companies)
        setTotalCompanies(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
        setCurrentPage(data.pagination.page)
      } else {
        toast.error(data.error || "Failed to fetch companies")
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
      toast.error("Failed to fetch companies")
    } finally {
      setLoading(false)
    }
  }


  const viewCompany = async (company: Company) => {
    setSelectedCompany(company)
    setSheetOpen(true)
    
    // Fetch contacts for this company
    try {
      const response = await fetch(`/api/contacts?companyId=${company.id}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setCompanyContacts(data.contacts)
      }
    } catch (error) {
      console.error("Error fetching company contacts:", error)
    }
  }

  const navigateToContacts = (companyId: string) => {
    router.push(`/dashboard/contacts?companyId=${companyId}`)
  }

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: "name",
      header: "Company",
      cell: ({ row }) => {
        const company = row.original
        return (
          <div>
            <div className="font-medium">{company.name || company.domain}</div>
            <div className="text-sm text-muted-foreground">{company.domain}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "contactCount",
      header: "Contacts",
      cell: ({ row }) => {
        const count = row.original.contactCount
        return (
          <div className="flex items-center gap-2">
            <IconUsers className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "emailCount",
      header: "Emails",
      cell: ({ row }) => {
        const count = row.original.emailCount
        return (
          <div className="flex items-center gap-2">
            <IconMail className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
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
              {daysSince === 0 ? "Today" : `${daysSince} days ago`}
            </div>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: companies,
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
      <Tabs defaultValue="companies" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Companies</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search companies..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
        </div>

        <TabsContent value="companies" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
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
                      onClick={() => viewCompany(row.original)}
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
                      No companies found. Companies are automatically detected during email synchronization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCompanies)}-
              {Math.min(currentPage * pageSize, totalCompanies)} of {totalCompanies} companies
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
                  onClick={() => fetchCompanies(1, pageSize)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => fetchCompanies(currentPage - 1, pageSize)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => fetchCompanies(currentPage + 1, pageSize)}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Go to next page</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => fetchCompanies(totalPages, pageSize)}
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
          {selectedCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">
                  {selectedCompany.name || selectedCompany.domain}
                </SheetTitle>
                <SheetDescription>
                  {selectedCompany.domain}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Contacts</p>
                    <p className="text-2xl font-semibold">{selectedCompany.contactCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Emails</p>
                    <p className="text-2xl font-semibold">{selectedCompany.emailCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">First Seen</p>
                    <p className="text-sm">
                      {format(new Date(selectedCompany.firstSeenAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="text-sm">
                      {format(new Date(selectedCompany.lastSeenAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Recent Contacts</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSheetOpen(false)
                        navigateToContacts(selectedCompany.id)
                      }}
                    >
                      View All Contacts
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {companyContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {contact.name || contact.email}
                            </p>
                            {contact.name && (
                              <p className="text-sm text-muted-foreground">
                                {contact.email}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <IconMail className="h-3 w-3" />
                              <span>{contact.emailsSent + contact.emailsReceived}</span>
                            </div>
                            <div className="text-xs">
                              {format(new Date(contact.lastSeenAt), "MMM d")}
                            </div>
                          </div>
                        </div>
                      ))}
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