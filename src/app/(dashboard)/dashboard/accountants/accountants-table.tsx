"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Download, Eye, MapPin, Mail, Phone, Plus, Search, UserRound, X } from "lucide-react"
import toast from "react-hot-toast"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  user_id?: string
  tenant_id?: string
  accountant_id?: string | null
  department?: string | null
  payroll_type?: string | null
  monthly_salary?: string | null
  per_class_rate?: string | null
  per_batch_rate?: string | null
  bank_account?: string | null
  gender?: string | null
  date_of_birth?: string | null
  nid_number?: string | null
  qualification?: string | null
  name?: string
  email?: string
  phone?: string
  address?: string
  profile_completion_pct?: number
  joining_date?: string
  created_at?: string
  updated_at?: string
  user?: {
    id?: string
    name?: string
    email?: string
    phone?: string
    is_active?: boolean
  }
}

type AccountantRow = {
  id: number | string
  name: string
  email: string
  phone: string
  address: string
  joiningDate: string
  status: "Active" | "Inactive"
  department: string
  payrollType: string
  monthlySalary: string
  bankAccount: string
  gender: string
  dateOfBirth: string
  nidNumber: string
  qualification: string
  profileCompletionPct: number
  createdAt: string
  updatedAt: string
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

function formatCurrency(value?: string | null) {
  if (!value) return "-"
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount)
}

function mapApiAccountant(item: AccountantApiItem): AccountantRow {
  const nestedUser = item.user ?? {}
  const resolvedName = nestedUser.name ?? item.name
  const resolvedEmail = nestedUser.email ?? item.email
  const resolvedPhone = nestedUser.phone ?? item.phone
  const resolvedId = item.user_id ?? nestedUser.id ?? item.id

  return {
    id: resolvedId ?? `accountant-${Date.now()}`,
    name: String(resolvedName ?? "Unnamed Accountant"),
    email: String(resolvedEmail ?? "-"),
    phone: String(resolvedPhone ?? "-"),
    address: String(item.address ?? "-"),
    joiningDate: formatDate(item.joining_date ?? item.created_at),
    status: nestedUser.is_active === false ? "Inactive" : "Active",
    department: String(item.department ?? "-"),
    payrollType: String(item.payroll_type ?? "-"),
    monthlySalary: formatCurrency(item.monthly_salary),
    bankAccount: String(item.bank_account ?? "-"),
    gender: String(item.gender ?? "-"),
    dateOfBirth: formatDate(item.date_of_birth ?? undefined),
    nidNumber: String(item.nid_number ?? "-"),
    qualification: String(item.qualification ?? "-"),
    profileCompletionPct: Number(item.profile_completion_pct ?? 0),
    createdAt: formatDate(item.created_at),
    updatedAt: formatDate(item.updated_at),
  }
}

export default function AccountantsTable() {
  const { user, isAuthReady } = useAuth()

  const [rows, setRows] = useState<AccountantRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [totalAccountants, setTotalAccountants] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [quickViewId, setQuickViewId] = useState<number | string | null>(null)
  const [selectedAccountant, setSelectedAccountant] = useState<AccountantRow | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusTargetIds, setStatusTargetIds] = useState<Array<number | string>>([])
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusValue, setStatusValue] = useState<"Active" | "Inactive">("Active")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState<AccountantFormState>(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)

  const tenantId = useMemo(() => {
    const userTenantId =
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id

    if (userTenantId) return userTenantId

    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          return (
            parsedUser?.tenant_id ??
            parsedUser?.tenantId ??
            parsedUser?.tenant?.id ??
            "demo-tenant"
          )
        }
      } catch {
        // Ignore malformed local storage and fall back below.
      }
    }

    return "demo-tenant"
  }, [user])

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
    if (!isAuthReady) {
      setLoading(true)
      return
    }

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
  }, [tenantId, currentPage, itemsPerPage, debouncedSearch, isDemoTenant, isAuthReady])

  const stats = useMemo(() => {
    return {
      total: totalAccountants,
      currentPageCount: rows.length,
      withPhone: rows.filter((row) => row.phone && row.phone !== "-").length,
      withAddress: rows.filter((row) => row.address && row.address !== "-").length,
    }
  }, [rows, totalAccountants])

  const safePage = Math.min(currentPage, totalPages)
  const allCheckedOnPage = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))
  const selectedAccountants = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds]
  )

  const handleResetFilters = () => {
    setSearchQuery("")
    setCurrentPage(1)
    setSelectedIds([])
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
    setQuickViewId(id)
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

  const openStatusDialogFor = (ids: Array<number | string>) => {
    if (ids.length === 0) return

    const first = rows.find((row) => row.id === ids[0])
    setStatusTargetIds(ids)
    setStatusValue(first?.status ?? "Active")
    setStatusDialogOpen(true)
  }

  const applyStatusUpdate = async () => {
    if (isDemoTenant) {
      toast.error("Tenant information is missing. Please sign in again.")
      return
    }

    if (statusTargetIds.length === 0) return

    setStatusUpdating(true)
    try {
      await Promise.all(
        statusTargetIds.map((id) =>
          api.patch(`/api/tenants/${tenantId}/accountants/${id}/account-status`, {
            is_active: statusValue === "Active",
          })
        )
      )

      setRows((prev) =>
        prev.map((row) =>
          statusTargetIds.includes(row.id)
            ? { ...row, status: statusValue }
            : row
        )
      )

      setSelectedAccountant((prev) =>
        prev && statusTargetIds.includes(prev.id)
          ? { ...prev, status: statusValue }
          : prev
      )

      toast.success(
        statusTargetIds.length === 1
          ? "Accountant status updated"
          : `${statusTargetIds.length} accountants updated`
      )
      setStatusDialogOpen(false)
      setStatusTargetIds([])
      setSelectedIds([])
    } catch {
      toast.error("Failed to update accountant status")
    } finally {
      setStatusUpdating(false)
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
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allCheckedOnPage}
                      onChange={(event) => {
                        if (event.target.checked) {
                          const next = new Set(selectedIds)
                          rows.forEach((row) => next.add(row.id))
                          setSelectedIds(Array.from(next))
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => !rows.some((row) => row.id === id)))
                        }
                      }}
                    />
                  </TableHead>
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
                      {Array.from({ length: 9 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
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
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => openAccountantDetails(row.id)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedIds((prev) => Array.from(new Set([...prev, row.id])))
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== row.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{row.address}</TableCell>
                      <TableCell>{row.joiningDate}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "Active" ? "default" : "destructive"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
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

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur transition-transform duration-300 ${selectedIds.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{selectedIds.length} accountants selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openStatusDialogFor(selectedIds)}>
              <ArrowUpDown className="mr-1 size-4" /> Change Status
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setSelectedIds([])}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      <Sheet
        open={!!quickViewId}
        onOpenChange={(open) => {
          if (!open) {
            setQuickViewId(null)
            setSelectedAccountant(null)
            setDetailsLoading(false)
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>Quick Accountant View</SheetTitle>
            <SheetDescription>Lightweight preview without leaving the list page.</SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : selectedAccountant ? (
            <div className="space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {selectedAccountant.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase() || "AC"}
                  </div>
                  <div>
                    <p className="font-medium">{selectedAccountant.name}</p>
                    <Badge variant={selectedAccountant.status === "Active" ? "default" : "destructive"}>
                      {selectedAccountant.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openStatusDialogFor([selectedAccountant.id])}>
                  Change Status
                </Button>
              </div>

              <Card>
                <CardContent className="grid grid-cols-2 gap-3 p-3 text-sm">
                  <div><p className="text-muted-foreground">Accountant ID</p><p>{selectedAccountant.id}</p></div>
                  <div><p className="text-muted-foreground">Profile Completion</p><p>{selectedAccountant.profileCompletionPct}%</p></div>
                  <div><p className="text-muted-foreground">Email</p><p>{selectedAccountant.email}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p>{selectedAccountant.phone}</p></div>
                  <div><p className="text-muted-foreground">Department</p><p>{selectedAccountant.department}</p></div>
                  <div><p className="text-muted-foreground">Payroll Type</p><p>{selectedAccountant.payrollType}</p></div>
                  <div><p className="text-muted-foreground">Monthly Salary</p><p>{selectedAccountant.monthlySalary}</p></div>
                  <div><p className="text-muted-foreground">Joining Date</p><p>{selectedAccountant.joiningDate}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium">Personal Info</p>
                  <p><span className="text-muted-foreground">Gender:</span> {selectedAccountant.gender}</p>
                  <p><span className="text-muted-foreground">Date of Birth:</span> {selectedAccountant.dateOfBirth}</p>
                  <p><span className="text-muted-foreground">NID Number:</span> {selectedAccountant.nidNumber}</p>
                  <p><span className="text-muted-foreground">Qualification:</span> {selectedAccountant.qualification}</p>
                  <p><span className="text-muted-foreground">Bank Account:</span> {selectedAccountant.bankAccount}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium">Address and Timeline</p>
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="mt-0.5 size-4 text-slate-400" />
                    <span>{selectedAccountant.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="size-4 text-slate-400" />
                    <span>{selectedAccountant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="size-4 text-slate-400" />
                    <span>{selectedAccountant.phone}</span>
                  </div>
                  <p><span className="text-muted-foreground">Created:</span> {selectedAccountant.createdAt}</p>
                  <p><span className="text-muted-foreground">Updated:</span> {selectedAccountant.updatedAt}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTargetIds.length === 1 ? "Change Accountant Status" : `Change Status for ${statusTargetIds.length} Accountants`}
            </DialogTitle>
            <DialogDescription>
              {statusTargetIds.length === 1 ? "Update this accountant's current status." : "Update all selected accountants together."}
            </DialogDescription>
          </DialogHeader>

          {statusTargetIds.length > 1 ? (
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-sm">
              {selectedAccountants.map((item) => (
                <p key={item.id}>{item.name}</p>
              ))}
            </div>
          ) : null}

          <RadioGroup value={statusValue} onValueChange={(value) => setStatusValue(value as "Active" | "Inactive")}>
            <RadioGroupItem id="accountant-active" value="Active">Active - Accountant can access the system</RadioGroupItem>
            <RadioGroupItem id="accountant-inactive" value="Inactive">Inactive - Accountant access is disabled</RadioGroupItem>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={statusUpdating}>
              Cancel
            </Button>
            <Button onClick={applyStatusUpdate} disabled={statusUpdating}>
              {statusUpdating ? "Updating..." : "Update Status"}
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
