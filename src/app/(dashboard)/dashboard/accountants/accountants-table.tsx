"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Eye, MapPin, Mail, Phone, Plus, Search, UserRound, X } from "lucide-react"
import toast from "react-hot-toast"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type AccountantApiItem = {
  id?: number | string
  name?: string
  email?: string
  phone?: string
  address?: string
  joining_date?: string
  created_at?: string
  updated_at?: string
}

type AccountantRow = {
  id: number | string
  name: string
  email: string
  phone: string
  address: string
  joiningDate: string
}

type AccountantFormState = {
  name: string
  email: string
  phone: string
  address: string
}

const PAGE_SIZES = [5, 10, 15, 20, 50]

const EMPTY_FORM: AccountantFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
}

function formatDate(value?: string) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function mapApiAccountant(item: AccountantApiItem): AccountantRow {
  return {
    id: item.id ?? `accountant-${Date.now()}`,
    name: String(item.name ?? "Unnamed Accountant"),
    email: String(item.email ?? "-"),
    phone: String(item.phone ?? "-"),
    address: String(item.address ?? "-"),
    joiningDate: formatDate(item.joining_date),
  }
}

export default function AccountantsTable() {
  const { user } = useAuth()

  const [rows, setRows] = useState<AccountantRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [totalAccountants, setTotalAccountants] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedAccountant, setSelectedAccountant] = useState<AccountantRow | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState<AccountantFormState>(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    "demo-tenant"

  const isDemoTenant = !tenantId || tenantId === "demo-tenant"

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, itemsPerPage])

  useEffect(() => {
    if (isDemoTenant) {
      setRows([])
      setTotalAccountants(0)
      setTotalPages(1)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    const loadAccountants = async () => {
      try {
        const response = await api.get(`/api/tenants/${tenantId}/accountants`, {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: debouncedSearch || undefined,
          },
        })

        const payload = response?.data
        const rawItems = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload)
              ? payload
              : []

        const mappedRows = rawItems.map((item: AccountantApiItem) => mapApiAccountant(item))
        const total = Number(payload?.meta?.total ?? payload?.total ?? mappedRows.length)
        const pages = Number(payload?.meta?.totalPages ?? payload?.totalPages ?? Math.max(1, Math.ceil(total / itemsPerPage)))

        if (!active) return
        setRows(mappedRows)
        setTotalAccountants(total)
        setTotalPages(Math.max(1, pages))
      } catch {
        if (!active) return
        setRows([])
        setTotalAccountants(0)
        setTotalPages(1)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAccountants()

    return () => {
      active = false
    }
  }, [tenantId, currentPage, itemsPerPage, debouncedSearch, isDemoTenant])

  const stats = useMemo(() => {
    return {
      total: totalAccountants,
      currentPageCount: rows.length,
      withPhone: rows.filter((row) => row.phone && row.phone !== "-").length,
      withAddress: rows.filter((row) => row.address && row.address !== "-").length,
    }
  }, [rows, totalAccountants])

  const safePage = Math.min(currentPage, totalPages)

  const handleResetFilters = () => {
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleExport = () => {
    const csv = [
      ["ID", "Name", "Email", "Phone", "Address", "Joining Date"],
      ...rows.map((row) => [
        String(row.id),
        row.name,
        row.email,
        row.phone,
        row.address,
        row.joiningDate,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "accountants.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const openAccountantDetails = async (id: number | string) => {
    if (isDemoTenant) {
      toast.error("Tenant information is missing. Please sign in again.")
      return
    }

    setSelectedAccountant(null)
    setDetailsDialogOpen(true)
    setDetailsLoading(true)
    try {
      const response = await api.get(`/api/tenants/${tenantId}/accountants/${id}`)
      const payload = response?.data
      const data = payload?.data ?? payload

      if (!data) {
        toast.error("Accountant details not found")
        return
      }

      setSelectedAccountant(mapApiAccountant(data as AccountantApiItem))
    } catch {
      toast.error("Failed to load accountant details")
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleAddAccountant = async () => {
    if (isDemoTenant) {
      toast.error("Tenant information is missing. Please sign in again.")
      return
    }

    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error("Name and email are required")
      return
    }

    setAddLoading(true)
    try {
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || undefined,
        address: addForm.address.trim() || undefined,
      }

      const response = await api.post(`/api/tenants/${tenantId}/accountants`, payload)
      const created = response?.data?.data ?? response?.data

      toast.success("Accountant created successfully")
      setAddDialogOpen(false)
      setAddForm(EMPTY_FORM)

      if (created) {
        setRows((prev) => [mapApiAccountant(created as AccountantApiItem), ...prev])
      }

      setCurrentPage(1)
      setDebouncedSearch("")
      setSearchQuery("")

      const refreshResponse = await api.get(`/api/tenants/${tenantId}/accountants`, {
        params: { page: 1, limit: itemsPerPage },
      })

      const refreshPayload = refreshResponse?.data
      const rawItems = Array.isArray(refreshPayload?.data)
        ? refreshPayload.data
        : Array.isArray(refreshPayload?.items)
          ? refreshPayload.items
          : Array.isArray(refreshPayload)
            ? refreshPayload
            : []

      setRows(rawItems.map((item: AccountantApiItem) => mapApiAccountant(item)))
      const total = Number(refreshPayload?.meta?.total ?? refreshPayload?.total ?? rawItems.length)
      const pages = Number(refreshPayload?.meta?.totalPages ?? refreshPayload?.totalPages ?? Math.max(1, Math.ceil(total / itemsPerPage)))
      setTotalAccountants(total)
      setTotalPages(Math.max(1, pages))
    } catch {
      toast.error("Failed to create accountant")
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="adm-root space-y-4">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Accountant Management</h1>
          <p>Manage and monitor all accountants with the same list and quick view pattern used in other modules</p>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#e0e7ff" }}>
            <UserRound className="size-4 text-indigo-600" />
          </div>
          <div className="adm-stat-val">{stats.total}</div>
          <div className="adm-stat-label">Total Accountants</div>
          <div className="adm-stat-corner" style={{ background: "#6366f1" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#dcfce7" }}>
            <Eye className="size-4 text-emerald-600" />
          </div>
          <div className="adm-stat-val">{stats.currentPageCount}</div>
          <div className="adm-stat-label">Visible This Page</div>
          <div className="adm-stat-corner" style={{ background: "#10b981" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#fef3c7" }}>
            <Phone className="size-4 text-amber-600" />
          </div>
          <div className="adm-stat-val">{stats.withPhone}</div>
          <div className="adm-stat-label">With Phone</div>
          <div className="adm-stat-corner" style={{ background: "#f59e0b" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#fee2e2" }}>
            <MapPin className="size-4 text-rose-600" />
          </div>
          <div className="adm-stat-val">{stats.withAddress}</div>
          <div className="adm-stat-label">With Address</div>
          <div className="adm-stat-corner" style={{ background: "#ef4444" }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">All Accountants</span>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by accountant name"
                className="pl-9"
              />
            </div>

            <Button variant="ghost" onClick={handleResetFilters}>
              <X className="mr-1 size-4" /> Reset filters
            </Button>

            <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
              <Download className="mr-1 size-4" /> Export
            </Button>

            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1 size-4" /> Add Accountant
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{totalAccountants} accountants found</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <select
                value={String(itemsPerPage)}
                onChange={(event) => setItemsPerPage(Number(event.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`accountant-skeleton-${index}`}>
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <UserRound className="size-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium">No accountants found</p>
                          <p className="text-sm text-muted-foreground">
                            {isDemoTenant
                              ? "Tenant information is missing, so accountants cannot be loaded yet."
                              : "Try adjusting filters or create a new accountant."}
                          </p>
                        </div>
                        <Button variant="outline" onClick={handleResetFilters}>Reset filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">#{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{row.address}</TableCell>
                      <TableCell>{row.joiningDate}</TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" onClick={() => openAccountantDetails(row.id)}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {(safePage - 1) * itemsPerPage + (rows.length > 0 ? 1 : 0)} to {Math.min(safePage * itemsPerPage, totalAccountants)} of {totalAccountants} accountants
            </p>

            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (safePage > 1) setCurrentPage((prev) => prev - 1)
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={safePage === page}
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage(page)
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (safePage < totalPages) setCurrentPage((prev) => prev + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      <Dialog
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open)
          if (!open) {
            setSelectedAccountant(null)
            setDetailsLoading(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAccountant?.name ?? "Accountant Details"}</DialogTitle>
            <DialogDescription>Details loaded from the specific accountant endpoint.</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : selectedAccountant ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <UserRound className="size-4 text-slate-400" />
                <span>{selectedAccountant.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="size-4 text-slate-400" />
                <span>{selectedAccountant.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="size-4 text-slate-400" />
                <span>{selectedAccountant.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="mt-0.5 size-4 text-slate-400" />
                <span>{selectedAccountant.address}</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Joining date: {selectedAccountant.joiningDate}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDetailsDialogOpen(false)
                setSelectedAccountant(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Accountant</DialogTitle>
            <DialogDescription>Joining date is generated by the backend, so it is not included in this form.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <Input
                value={addForm.name}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nusrat Jahan"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="accountant@smartz.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={addForm.phone}
                onChange={(event) => setAddForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="01712345678"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Address</label>
              <Textarea
                value={addForm.address}
                onChange={(event) => setAddForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Mirpur, Dhaka"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddAccountant} disabled={addLoading}>
              {addLoading ? "Creating..." : "Create Accountant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
