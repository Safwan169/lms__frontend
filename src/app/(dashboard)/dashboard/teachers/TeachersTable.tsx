"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Download, Eye, Search, X } from "lucide-react"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
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

type TeacherStatus = "Active" | "On Leave" | "Inactive"

type TeacherRow = {
  id: string
  name: string
  email: string
  phone: string
  teacherId: string
  department: string
  subject: string
  qualification: string
  session: string
  status: TeacherStatus
  joinedOn: string
}

const INITIAL_ROWS: TeacherRow[] = [
  { id: "t-001", name: "Nabila Islam", email: "nabila.islam@example.com", phone: "01710101010", teacherId: "TR-1001", department: "Science", subject: "Physics", qualification: "MSc Physics", session: "2025-2026", status: "Active", joinedOn: "2023-01-12" },
  { id: "t-002", name: "Fahim Karim", email: "fahim.karim@example.com", phone: "01820202020", teacherId: "TR-1002", department: "Math", subject: "Algebra", qualification: "MSc Math", session: "2025-2026", status: "Active", joinedOn: "2022-09-05" },
  { id: "t-003", name: "Sadia Noor", email: "sadia.noor@example.com", phone: "01930303030", teacherId: "TR-1003", department: "English", subject: "Literature", qualification: "MA English", session: "2024-2025", status: "On Leave", joinedOn: "2021-04-17" },
  { id: "t-004", name: "Raihan Ahmed", email: "raihan.ahmed@example.com", phone: "01640404040", teacherId: "TR-1004", department: "Science", subject: "Chemistry", qualification: "MSc Chemistry", session: "2025-2026", status: "Active", joinedOn: "2023-06-19" },
  { id: "t-005", name: "Mitu Akter", email: "mitu.akter@example.com", phone: "01750505050", teacherId: "TR-1005", department: "ICT", subject: "Programming", qualification: "BSc CSE", session: "2024-2025", status: "Inactive", joinedOn: "2020-11-01" },
  { id: "t-006", name: "Hasan Mahmud", email: "hasan.mahmud@example.com", phone: "01860606060", teacherId: "TR-1006", department: "Social Science", subject: "History", qualification: "MA History", session: "2025-2026", status: "Active", joinedOn: "2022-03-09" },
  { id: "t-007", name: "Tanima Sultana", email: "tanima.sultana@example.com", phone: "01970707070", teacherId: "TR-1007", department: "Bangla", subject: "Grammar", qualification: "MA Bangla", session: "2025-2026", status: "Active", joinedOn: "2024-01-10" },
  { id: "t-008", name: "Shafiq Rahman", email: "shafiq.rahman@example.com", phone: "01680808080", teacherId: "TR-1008", department: "Math", subject: "Geometry", qualification: "MSc Math", session: "2024-2025", status: "On Leave", joinedOn: "2021-08-20" },
  { id: "t-009", name: "Jui Das", email: "jui.das@example.com", phone: "01790909090", teacherId: "TR-1009", department: "Science", subject: "Biology", qualification: "MSc Biology", session: "2025-2026", status: "Active", joinedOn: "2022-12-22" },
  { id: "t-010", name: "Asif Iqbal", email: "asif.iqbal@example.com", phone: "01811111111", teacherId: "TR-1010", department: "ICT", subject: "Networking", qualification: "BSc CSE", session: "2023-2024", status: "Inactive", joinedOn: "2019-02-13" },
]

const PAGE_SIZES = [10, 20, 50]

function statusVariant(status: TeacherStatus) {
  if (status === "Active") return "default"
  if (status === "On Leave") return "warning"
  return "destructive"
}

export default function TeachersTable() {
  const [rows, setRows] = useState<TeacherRow[]>(INITIAL_ROWS)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("All")
  const [filterSubject, setFilterSubject] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterSession, setFilterSession] = useState("All")
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<TeacherStatus>("Active")
  const [bulkReason, setBulkReason] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 280)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterDepartment, filterSubject, filterStatus, filterSession, itemsPerPage])

  const departments = useMemo(() => Array.from(new Set(rows.map((item) => item.department))), [rows])
  const subjects = useMemo(() => {
    const source = filterDepartment === "All" ? rows : rows.filter((item) => item.department === filterDepartment)
    return Array.from(new Set(source.map((item) => item.subject)))
  }, [rows, filterDepartment])
  const sessions = useMemo(() => Array.from(new Set(rows.map((item) => item.session))), [rows])

  const filteredRows = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase()

    return rows.filter((row) => {
      const searchMatch =
        searchLower.length === 0 ||
        row.name.toLowerCase().includes(searchLower) ||
        row.email.toLowerCase().includes(searchLower) ||
        row.teacherId.toLowerCase().includes(searchLower) ||
        row.phone.toLowerCase().includes(searchLower)

      const departmentMatch = filterDepartment === "All" || row.department === filterDepartment
      const subjectMatch = filterSubject === "All" || row.subject === filterSubject
      const statusMatch = filterStatus === "All" || row.status === filterStatus
      const sessionMatch = filterSession === "All" || row.session === filterSession

      return searchMatch && departmentMatch && subjectMatch && statusMatch && sessionMatch
    })
  }, [rows, searchQuery, filterDepartment, filterSubject, filterStatus, filterSession])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return filteredRows.slice(start, start + itemsPerPage)
  }, [filteredRows, safePage, itemsPerPage])

  const allCheckedOnPage = paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))

  const resetFilters = () => {
    setSearchQuery("")
    setFilterDepartment("All")
    setFilterSubject("All")
    setFilterStatus("All")
    setFilterSession("All")
    setCurrentPage(1)
  }

  const exportCsv = () => {
    const csv = [
      ["Teacher ID", "Name", "Email", "Phone", "Department", "Subject", "Qualification", "Session", "Status", "Joined On"],
      ...filteredRows.map((row) => [row.teacherId, row.name, row.email, row.phone, row.department, row.subject, row.qualification, row.session, row.status, row.joinedOn]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "teachers.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const applyBulkStatus = () => {
    setRows((prev) => prev.map((row) => (selectedIds.includes(row.id) ? { ...row, status: bulkStatus } : row)))
    setBulkDialogOpen(false)
    setBulkReason("")
    setSelectedIds([])
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, phone, teacher ID"
            className="pl-9"
          />
        </div>

        <Select value={filterDepartment} onValueChange={(value) => { setFilterDepartment(value); setFilterSubject("All") }} className="w-40">
          <option value="All">All Departments</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>

        <Select value={filterSubject} onValueChange={setFilterSubject} className="w-[150px]">
          <option value="All">All Subjects</option>
          {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus} className="w-[130px]">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </Select>

        <Select value={filterSession} onValueChange={setFilterSession} className="w-[130px]">
          <option value="All">All Sessions</option>
          {sessions.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>

        <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))} className="w-[110px]">
          {PAGE_SIZES.map((size) => <option key={size} value={String(size)}>{size} rows</option>)}
        </Select>

        <Button variant="ghost" onClick={resetFilters}>
          <X className="mr-1 size-4" /> Reset
        </Button>

        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-1 size-4" /> Export
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
              <TableHead>Teacher</TableHead>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Department / Subject</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Joined On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`sk-${index}`}>
                  {Array.from({ length: 10 }).map((__, cell) => (
                    <TableCell key={cell}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No teachers found. Try adjusting filters.
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
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.teacherId}</TableCell>
                  <TableCell>{row.department} / {row.subject}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.qualification}</TableCell>
                  <TableCell>{row.session}</TableCell>
                  <TableCell>{row.joinedOn}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSelectedTeacher(row)}>
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
          Showing {(safePage - 1) * itemsPerPage + (paginatedRows.length > 0 ? 1 : 0)} to {Math.min(safePage * itemsPerPage, filteredRows.length)} of {filteredRows.length} teachers
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

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur transition-transform duration-300 ${selectedIds.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{selectedIds.length} teachers selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkStatus("Active")
                setBulkReason("")
                setBulkDialogOpen(true)
              }}
            >
              <ArrowUpDown className="mr-1 size-4" /> Change Status
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setSelectedIds([])}>Deselect All</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTeacher} onOpenChange={(open) => !open && setSelectedTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeacher?.name}</DialogTitle>
            <DialogDescription>Teacher details preview</DialogDescription>
          </DialogHeader>

          {selectedTeacher ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Teacher ID:</span> {selectedTeacher.teacherId}</p>
              <p><span className="text-muted-foreground">Email:</span> {selectedTeacher.email}</p>
              <p><span className="text-muted-foreground">Phone:</span> {selectedTeacher.phone}</p>
              <p><span className="text-muted-foreground">Department:</span> {selectedTeacher.department}</p>
              <p><span className="text-muted-foreground">Subject:</span> {selectedTeacher.subject}</p>
              <p><span className="text-muted-foreground">Qualification:</span> {selectedTeacher.qualification}</p>
              <p><span className="text-muted-foreground">Session:</span> {selectedTeacher.session}</p>
              <p><span className="text-muted-foreground">Joined On:</span> {selectedTeacher.joinedOn}</p>
              <p><span className="text-muted-foreground">Status:</span> {selectedTeacher.status}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTeacher(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedIds.length} Teachers</DialogTitle>
            <DialogDescription>Apply a new status to all selected teachers.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={bulkStatus} onValueChange={(value) => setBulkStatus(value as TeacherStatus)}>
            <RadioGroupItem id="teacher-active" value="Active">Active</RadioGroupItem>
            <RadioGroupItem id="teacher-leave" value="On Leave">On Leave</RadioGroupItem>
            <RadioGroupItem id="teacher-inactive" value="Inactive">Inactive</RadioGroupItem>
          </RadioGroup>

          <Textarea
            value={bulkReason}
            onChange={(event) => setBulkReason(event.target.value)}
            placeholder="Reason for status change (optional)"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyBulkStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
