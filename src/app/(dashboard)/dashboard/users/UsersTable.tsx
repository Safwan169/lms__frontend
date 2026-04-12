"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Download, Edit2, Eye, Plus, Search, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"

type EmployeeRow = {
  id: number | string
  firstName: string
  lastName: string
  email: string
  role: "Employee" | "Instructor" | "Admin"
  status: "Active" | "Inactive" | "Pending"
  joinDate: string
  session: string
}

type EmployeeApiItem = {
  id?: string | number
  user_id?: string | number
  name?: string
  email?: string
  phone?: string
  joining_date?: string
  created_at?: string
  is_active?: boolean
  user?: {
    id?: string | number
    name?: string
    email?: string
    is_active?: boolean
  }
}

const INITIAL_ROWS: EmployeeRow[] = [
  { id: 1, firstName: "Jon", lastName: "Snow", email: "jon.snow@example.com", role: "Employee", status: "Active", joinDate: "2024-01-15", session: "2024-2025" },
  { id: 2, firstName: "Cersei", lastName: "Lannister", email: "cersei@example.com", role: "Instructor", status: "Active", joinDate: "2023-11-20", session: "2023-2024" },
  { id: 3, firstName: "Jaime", lastName: "Lannister", email: "jaime@example.com", role: "Employee", status: "Active", joinDate: "2024-02-10", session: "2024-2025" },
  { id: 4, firstName: "Arya", lastName: "Stark", email: "arya.stark@example.com", role: "Employee", status: "Inactive", joinDate: "2023-08-05", session: "2023-2024" },
  { id: 5, firstName: "Daenerys", lastName: "Targaryen", email: "daenerys@example.com", role: "Admin", status: "Active", joinDate: "2023-06-12", session: "2023-2024" },
  { id: 6, firstName: "Melisandre", lastName: "Red", email: "melisandre@example.com", role: "Instructor", status: "Active", joinDate: "2024-01-08", session: "2024-2025" },
  { id: 7, firstName: "Ferrara", lastName: "Clifford", email: "ferrara@example.com", role: "Employee", status: "Active", joinDate: "2023-12-03", session: "2024-2025" },
  { id: 8, firstName: "Rossini", lastName: "Frances", email: "rossini@example.com", role: "Instructor", status: "Pending", joinDate: "2024-03-15", session: "2024-2025" },
  { id: 9, firstName: "Harvey", lastName: "Roxie", email: "harvey@example.com", role: "Admin", status: "Active", joinDate: "2023-05-22", session: "2023-2024" },
  { id: 10, firstName: "Michael", lastName: "Davis", email: "michael.davis@example.com", role: "Employee", status: "Active", joinDate: "2024-02-28", session: "2024-2025" },
  { id: 11, firstName: "Sarah", lastName: "Connor", email: "sarah.connor@example.com", role: "Instructor", status: "Active", joinDate: "2024-01-22", session: "2024-2025" },
  { id: 12, firstName: "John", lastName: "Smith", email: "john.smith@example.com", role: "Employee", status: "Active", joinDate: "2024-02-05", session: "2024-2025" },
  { id: 13, firstName: "Emma", lastName: "Watson", email: "emma.watson@example.com", role: "Employee", status: "Inactive", joinDate: "2023-09-10", session: "2023-2024" },
  { id: 14, firstName: "Robert", lastName: "Johnson", email: "robert.johnson@example.com", role: "Admin", status: "Active", joinDate: "2023-04-15", session: "2023-2024" },
  { id: 15, firstName: "Jessica", lastName: "Brown", email: "jessica.brown@example.com", role: "Instructor", status: "Active", joinDate: "2024-01-30", session: "2024-2025" },
  { id: 16, firstName: "David", lastName: "Wilson", email: "david.wilson@example.com", role: "Employee", status: "Pending", joinDate: "2024-03-20", session: "2024-2025" },
  { id: 17, firstName: "Lisa", lastName: "Anderson", email: "lisa.anderson@example.com", role: "Instructor", status: "Active", joinDate: "2023-12-12", session: "2024-2025" },
  { id: 18, firstName: "Chris", lastName: "Taylor", email: "chris.taylor@example.com", role: "Employee", status: "Active", joinDate: "2024-02-14", session: "2024-2025" },
  { id: 19, firstName: "Maria", lastName: "Garcia", email: "maria.garcia@example.com", role: "Employee", status: "Active", joinDate: "2024-03-01", session: "2024-2025" },
  { id: 20, firstName: "James", lastName: "Martinez", email: "james.martinez@example.com", role: "Admin", status: "Active", joinDate: "2023-07-18", session: "2023-2024" },
]

const PAGE_SIZES = [5, 10, 15, 20, 50]

function badgeVariantForRole(role: EmployeeRow["role"]) {
  if (role === "Employee") return "info"
  if (role === "Instructor") return "warning"
  return "muted"
}

function badgeVariantForStatus(status: EmployeeRow["status"]) {
  if (status === "Active") return "default"
  if (status === "Inactive") return "destructive"
  return "warning"
}

function mapApiEmployee(item: EmployeeApiItem): EmployeeRow {
  const nestedUser = item?.user ?? {}
  const fullName = String(nestedUser?.name ?? item?.name ?? "").trim()
  const [firstName, ...rest] = fullName.split(" ").filter(Boolean)
  const isActive = nestedUser?.is_active ?? item?.is_active

  return {
    id: item?.user_id ?? nestedUser?.id ?? item?.id ?? `emp-${Date.now()}`,
    firstName: firstName || "Admin",
    lastName: rest.join(" "),
    email: String(nestedUser?.email ?? item?.email ?? ""),
    role: "Admin",
    status: isActive === false ? "Inactive" : "Active",
    joinDate: String(item?.joining_date ?? item?.created_at ?? ""),
    session: "-",
  }
}

export default function UsersTable() {
  const { user } = useAuth()
  const [rows, setRows] = useState<EmployeeRow[]>(INITIAL_ROWS)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [selectedUser, setSelectedUser] = useState<EmployeeRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([])
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<"Active" | "Inactive">("Active")
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [totalEmployees, setTotalEmployees] = useState(INITIAL_ROWS.length)
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", phone: "" })
  const [addLoading, setAddLoading] = useState(false)

  const tenantIdForApi =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    "demo-tenant"
  const userIdForApi =
    (user as any)?.user_id ??
    (user as any)?.id ??
    (user as any)?.uuid ??
    "admin-user-uuid"

  useEffect(() => {
    let active = true

    const timer = setTimeout(async () => {
      try {
        const response = await api.get(`/api/tenants/${tenantIdForApi}/admins`, {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery.trim() || undefined,
            
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

        const mappedRows = rawItems.map((item: EmployeeApiItem) => mapApiEmployee(item))

        const total = Number(payload?.meta?.total ?? payload?.total ?? mappedRows.length)
        const pages = Number(payload?.meta?.totalPages ?? payload?.totalPages ?? Math.max(1, Math.ceil(total / itemsPerPage)))

        if (!active) return
        setRows(mappedRows)
        setTotalEmployees(total)
        setTotalPagesFromApi(Math.max(1, pages))
      } catch {
        if (!active) return
        toast.error("Failed to load admins")
      } finally {
        if (active) setLoading(false)
      }
    }, 240)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [tenantIdForApi, userIdForApi, currentPage, itemsPerPage, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRole, filterStatus])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesRole = filterRole === "All" || row.role === filterRole
      const matchesStatus = filterStatus === "All" || row.status === filterStatus

      return matchesRole && matchesStatus
    })
  }, [rows, filterRole, filterStatus])

  const totalPages = totalPagesFromApi
  const safePage = Math.min(currentPage, totalPages)

  const paginatedRows = filteredRows

  const allCheckedOnPage = paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))

  const handleDelete = (user: EmployeeRow) => {
    if (window.confirm(`Are you sure you want to delete admin ${user.firstName} ${user.lastName}?`)) {
      setRows((prev) => prev.filter((row) => row.id !== user.id))
    }
  }

  const handleEdit = (user: EmployeeRow) => {
    window.alert(`Edit functionality for admin ${user.firstName} ${user.lastName} - coming soon!`)
  }

  const openEmployeeDetails = async (id: number | string) => {
    try {
      const response = await api.get(`/api/tenants/${tenantIdForApi}/admins/${id}`)
      const payload = response?.data
      const data = payload?.data ?? payload
      if (!data) {
        toast.error("Admin details not found")
        return
      }
      setSelectedUser(mapApiEmployee(data as EmployeeApiItem))
    } catch {
      toast.error("Failed to load admin details")
    }
  }

  const handleExport = () => {
    const csv = [
      ["ID", "First Name", "Last Name", "Email", "Role", "Status", "Session", "Join Date"],
      ...filteredRows.map((row) => [
        String(row.id),
        row.firstName,
        row.lastName,
        row.email,
        row.role,
        row.status,
        row.session,
        row.joinDate,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "admins.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setFilterRole("All")
    setFilterStatus("All")
    setCurrentPage(1)
  }

  const handleAddEmployee = async () => {
    if (!addForm.firstName.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
      toast.error("Name, email and phone are required")
      return
    }
    setAddLoading(true)
    try {
      const payload = {
        name: `${addForm.firstName.trim()} ${addForm.lastName.trim()}`.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
      }
      const response = await api.post(`/api/tenants/${tenantIdForApi}/employees`, payload)
      const created = response?.data?.data ?? response?.data
      const newRow: EmployeeRow = created
        ? mapApiEmployee(created as EmployeeApiItem)
        : { id: Date.now(), firstName: addForm.firstName, lastName: addForm.lastName, email: addForm.email, role: "Admin", status: "Active", joinDate: "", session: "-" }
      setRows((prev) => [newRow, ...prev])
      setTotalEmployees((prev) => prev + 1)
      toast.success("Admin added successfully")
      setAddDialogOpen(false)
      setAddForm({ firstName: "", lastName: "", email: "", phone: "" })
    } catch {
      toast.error("Failed to add admin")
    } finally {
      setAddLoading(false)
    }
  }

  const applyBulkStatusUpdate = () => {
    const updateStatuses = async () => {
      if (selectedIds.length === 0) return

      setBulkStatusLoading(true)
      try {
        await Promise.all(
          selectedIds.map((id) =>
            api.patch(`/api/tenants/${tenantIdForApi}/admins/${id}/account-status`, {
              is_active: bulkStatus === "Active",
            })
          )
        )

        setRows((prev) =>
          prev.map((row) => (selectedIds.includes(row.id) ? { ...row, status: bulkStatus } : row))
        )
        setSelectedUser((prev) =>
          prev && selectedIds.includes(prev.id) ? { ...prev, status: bulkStatus } : prev
        )
        toast.success(
          selectedIds.length === 1 ? "Admin status updated" : `${selectedIds.length} admins updated`
        )
        setBulkStatusDialogOpen(false)
        setSelectedIds([])
      } catch {
        toast.error("Failed to update admin status")
      } finally {
        setBulkStatusLoading(false)
      }
    }

    void updateStatuses()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>

        <Select value={filterRole} onValueChange={setFilterRole} className="w-[170px]">
          <option value="All">All Roles</option>
          <option value="Employee">Employee</option>
          <option value="Instructor">Instructor</option>
          <option value="Admin">Admin</option>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus} className="w-[170px]">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Pending">Pending</option>
        </Select>

        <Select
          value={String(itemsPerPage)}
          onValueChange={(value) => setItemsPerPage(Number(value))}
          className="w-[120px]"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={String(size)}>
              {size} rows
            </option>
          ))}
        </Select>

        <Button variant="ghost" onClick={handleResetFilters}>
          <X className="mr-1 size-4" /> Reset
        </Button>

        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1 size-4" /> Export
        </Button>

        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-1 size-4" /> Add Admin
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
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
                      paginatedRows.forEach((row) => next.add(row.id))
                      setSelectedIds(Array.from(next))
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => !paginatedRows.some((row) => row.id === id)))
                    }
                  }}
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead className="w-[130px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`sk-${index}`}>
                  {Array.from({ length: 8 }).map((__, i) => (
                    <TableCell key={i}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No admins found. Try adjusting filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
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
                  <TableCell>{row.firstName} {row.lastName}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForRole(row.role)}>{row.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForStatus(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{row.joinDate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEmployeeDetails(row.id)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(row)}>
                        <Edit2 className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row)}>
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur transition-transform duration-300 ${selectedIds.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{selectedIds.length} admins selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkStatus("Active")
                setBulkStatusDialogOpen(true)
              }}
            >
              <ArrowUpDown className="mr-1 size-4" /> Change Status
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setSelectedIds([])}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {(safePage - 1) * itemsPerPage + (paginatedRows.length > 0 ? 1 : 0)} to {Math.min(safePage * itemsPerPage, totalEmployees)} of {totalEmployees} admins
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

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>Admin details preview</DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Email:</span> {selectedUser.email}</p>
              <p><span className="text-muted-foreground">Role:</span> {selectedUser.role}</p>
              <p><span className="text-muted-foreground">Status:</span> {selectedUser.status}</p>
              <p><span className="text-muted-foreground">Session:</span> {selectedUser.session}</p>
              <p><span className="text-muted-foreground">Join Date:</span> {selectedUser.joinDate}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>Fill in the details to create a new admin account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name <span className="text-red-500">*</span></label>
                <Input
                  value={addForm.firstName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={addForm.lastName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phone <span className="text-red-500">*</span></label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="01712345678"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={addLoading}>
              {addLoading ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedIds.length} Admins</DialogTitle>
            <DialogDescription>Apply a new active or inactive status to all selected admins.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={bulkStatus} onValueChange={(value) => setBulkStatus(value as "Active" | "Inactive")}>
            <RadioGroupItem id="emp-active" value="Active">Active</RadioGroupItem>
            <RadioGroupItem id="emp-inactive" value="Inactive">Inactive</RadioGroupItem>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkStatusLoading}>
              Cancel
            </Button>
            <Button onClick={applyBulkStatusUpdate} disabled={bulkStatusLoading || selectedIds.length === 0}>
              {bulkStatusLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
