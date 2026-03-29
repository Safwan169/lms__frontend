"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Search, Inbox } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type AdmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"

type ClassOption = {
  id: string
  name: string
}

type AdmissionRow = {
  id: string
  student_name: string
  phone: string
  class_name: string
  class_id: string
  batch_name: string
  applied_at: string
  status: AdmissionStatus
}

type AdmissionsResponse = {
  data: AdmissionRow[]
  total: number
  page: number
  totalPages: number
}

const DUMMY_CLASSES: ClassOption[] = [
  { id: "6", name: "Class 6" },
  { id: "7", name: "Class 7" },
  { id: "8", name: "Class 8" },
  { id: "9", name: "Class 9" },
  { id: "10", name: "Class 10" },
  { id: "11", name: "Class 11" },
  { id: "12", name: "Class 12" },
]

const DUMMY_ADMISSIONS: AdmissionRow[] = [
  { id: "1", student_name: "Ayesha Rahman", phone: "01711111111", class_name: "Class 6", class_id: "6", batch_name: "Batch A", applied_at: "2026-03-20T09:00:00.000Z", status: "PENDING" },
  { id: "2", student_name: "Tanvir Hasan", phone: "01822222222", class_name: "Class 8", class_id: "8", batch_name: "Batch B", applied_at: "2026-03-19T10:15:00.000Z", status: "APPROVED" },
  { id: "3", student_name: "Nusrat Jahan", phone: "01933333333", class_name: "Class 10", class_id: "10", batch_name: "Science", applied_at: "2026-03-18T11:20:00.000Z", status: "REJECTED" },
  { id: "4", student_name: "Shafin Ahmed", phone: "01644444444", class_name: "Class 9", class_id: "9", batch_name: "Commerce", applied_at: "2026-03-18T13:40:00.000Z", status: "EXPIRED" },
  { id: "5", student_name: "Maliha Akter", phone: "01755555555", class_name: "Class 11", class_id: "11", batch_name: "Arts", applied_at: "2026-03-17T14:05:00.000Z", status: "PENDING" },
  { id: "6", student_name: "Rakib Chowdhury", phone: "01866666666", class_name: "Class 7", class_id: "7", batch_name: "Batch A", applied_at: "2026-03-16T09:30:00.000Z", status: "PENDING" },
  { id: "7", student_name: "Farhana Islam", phone: "01977777777", class_name: "Class 12", class_id: "12", batch_name: "Science", applied_at: "2026-03-15T12:30:00.000Z", status: "APPROVED" },
  { id: "8", student_name: "Samiul Karim", phone: "01788888888", class_name: "Class 9", class_id: "9", batch_name: "Arts", applied_at: "2026-03-15T16:55:00.000Z", status: "PENDING" },
  { id: "9", student_name: "Rafiul Alam", phone: "01899999999", class_name: "Class 6", class_id: "6", batch_name: "Batch B", applied_at: "2026-03-14T08:45:00.000Z", status: "REJECTED" },
  { id: "10", student_name: "Adiba Noor", phone: "01712345000", class_name: "Class 10", class_id: "10", batch_name: "Science", applied_at: "2026-03-14T10:00:00.000Z", status: "PENDING" },
  { id: "11", student_name: "Ibrahim Khan", phone: "01911223344", class_name: "Class 8", class_id: "8", batch_name: "Batch A", applied_at: "2026-03-13T15:10:00.000Z", status: "EXPIRED" },
  { id: "12", student_name: "Sadia Ahmed", phone: "01855667788", class_name: "Class 11", class_id: "11", batch_name: "Commerce", applied_at: "2026-03-13T18:00:00.000Z", status: "PENDING" },
]

const statusOptions = ["All", "PENDING", "APPROVED", "REJECTED", "EXPIRED"] as const
const PAGE_SIZE = 10
const DEMO_MODE = true

function formatDate(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function statusVariant(status: AdmissionStatus) {
  if (status === "PENDING") return "warning"
  if (status === "APPROVED") return "info"
  if (status === "REJECTED") return "destructive"
  return "muted"
}

export default function AdminAdmissionsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<string>("All")
  const [classId, setClassId] = useState<string>("All")
  const [search, setSearch] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null)
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRow | null>(null)
  const [admissionsData, setAdmissionsData] = useState<AdmissionRow[]>(DUMMY_ADMISSIONS)

  // Guard implementation intentionally commented for frontend-only flow.
  // const isAdmin = useMemo(() => {
  //   if (!user) return false
  //   const role = String((user as any)?.role ?? "").toLowerCase()
  //   return role === "admin" || role === "rektor"
  // }, [user])
  //
  // const canAccessPage = DEMO_MODE || (!!user && isAdmin)
  //
  // useEffect(() => {
  //   if (DEMO_MODE) return
  //
  //   if (!user) {
  //     router.push("/login")
  //     return
  //   }
  //   if (!isAdmin) {
  //     router.push("/dashboard")
  //   }
  // }, [user, isAdmin, router])

  const canAccessPage = true

  const { data: classesData } = useQuery({
    queryKey: ["classes-options-dummy"],
    queryFn: async (): Promise<ClassOption[]> => {
      // API implementation kept intentionally for later integration.
      // const res = await fetch("/api/classes", { cache: "no-store" })
      // if (!res.ok) return DUMMY_CLASSES
      // const json = await res.json()
      // const raw = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
      // const mapped = raw.map((item: any) => ({
      //   id: String(item.id),
      //   name: String(item.name ?? item.title ?? `Class ${item.id}`),
      // }))
      // return mapped.length > 0 ? mapped : DUMMY_CLASSES
      return DUMMY_CLASSES
    },
  })

  const admissionsQueryKey = ["admin-admissions-dummy", { status, classId, search, page }, admissionsData]

  const { data, isLoading, isFetching } = useQuery({
    queryKey: admissionsQueryKey,
    queryFn: async (): Promise<AdmissionsResponse> => {
      // API implementation kept intentionally for later integration.
      // const params = new URLSearchParams()
      // if (status !== "All") params.set("status", status)
      // if (classId !== "All") params.set("classId", classId)
      // if (search.trim()) params.set("search", search.trim())
      // params.set("page", String(page))
      // const response = await fetch(`/admin/admissions?${params.toString()}`, {
      //   cache: "no-store",
      // })
      // if (!response.ok) throw new Error("Failed to fetch admissions")
      // const json = await response.json()
      // ...mapping logic

      const searchLower = search.trim().toLowerCase()
      const filtered = admissionsData.filter((item) => {
        const statusMatch = status === "All" ? true : item.status === status
        const classMatch = classId === "All" ? true : item.class_id === classId
        const searchMatch =
          searchLower.length === 0
            ? true
            : item.student_name.toLowerCase().includes(searchLower) ||
              item.phone.toLowerCase().includes(searchLower)
        return statusMatch && classMatch && searchMatch
      })

      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
      const safePage = Math.min(page, totalPages)
      const start = (safePage - 1) * PAGE_SIZE
      const paged = filtered.slice(start, start + PAGE_SIZE)

      return {
        data: paged,
        total,
        page: safePage,
        totalPages,
      }
    },
    placeholderData: (previous) => previous,
  })

  const updateStatusOptimistically = (admissionId: string, nextStatus: AdmissionStatus) => {
    setAdmissionsData((prev) =>
      prev.map((row) => (row.id === admissionId ? { ...row, status: nextStatus } : row))
    )
    queryClient.setQueryData(admissionsQueryKey, (previous: AdmissionsResponse | undefined) => {
      if (!previous) return previous
      return {
        ...previous,
        data: previous.data.map((row) =>
          row.id === admissionId ? { ...row, status: nextStatus } : row
        ),
      }
    })
  }

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      // API implementation kept intentionally for later integration.
      // const endpoint = action === "approve" ? "approve" : "reject"
      // const res = await fetch(`/admin/admissions/${id}/${endpoint}`, {
      //   method: "POST",
      // })
      // if (!res.ok) throw new Error(`Failed to ${action} admission`)
      await new Promise((resolve) => setTimeout(resolve, 250))
      return action
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: admissionsQueryKey })
      updateStatusOptimistically(id, action === "approve" ? "APPROVED" : "REJECTED")
    },
    onSuccess: (action) => {
      toast.success(action === "approve" ? "Application approved" : "Application rejected")
    },
    onError: () => {
      toast.error("Action failed. Please try again.")
    },
  })

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      // API implementation kept intentionally for later integration.
      // const res = await fetch(`/admin/admissions/${id}/resend-link`, {
      //   method: "POST",
      // })
      // if (!res.ok) throw new Error("Failed to resend link")
      await new Promise((resolve) => setTimeout(resolve, 250))
      return id
    },
    onSuccess: () => {
      toast.success("Admission link resent successfully")
    },
    onError: () => {
      toast.error("Failed to resend link")
    },
  })

  const rows = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const classes = classesData ?? DUMMY_CLASSES

  const resetFilters = () => {
    setStatus("All")
    setClassId("All")
    setSearch("")
    setPage(1)
  }

  const openConfirmDialog = (row: AdmissionRow, action: "approve" | "reject") => {
    setSelectedAdmission(row)
    setDialogAction(action)
    setDialogOpen(true)
  }

  const confirmAction = () => {
    if (!selectedAdmission || !dialogAction) return
    actionMutation.mutate({ id: selectedAdmission.id, action: dialogAction })
    setDialogOpen(false)
    setSelectedAdmission(null)
    setDialogAction(null)
  }

  if (!canAccessPage) return null

  return (
    <div className="adm-root">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Admission Applications</h1>
          <p>{totalCount} total applications</p>
        </div>
        <Button onClick={() => router.push("/admin/admissions/new")}>New Manual Admission</Button>
      </div>

      <div className="adm-card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            className="w-[170px]"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Select
            value={classId}
            onValueChange={(value) => {
              setClassId(value)
              setPage(1)
            }}
            className="w-[170px]"
          >
            <option value="All">All Classes</option>
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>

          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by student name or phone"
              className="pl-8"
            />
          </div>

          <Button variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Class / Batch</TableHead>
              <TableHead>Applied At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-36" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="rounded-full bg-muted p-3">
                      <Inbox className="size-6" />
                    </div>
                    <div className="text-sm font-medium">No applications found</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.student_name}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.class_name} / {row.batch_name}</TableCell>
                  <TableCell>{formatDate(row.applied_at)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {row.status === "PENDING" ? (
                        <>
                          <Button size="sm" onClick={() => openConfirmDialog(row, "approve")}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => openConfirmDialog(row, "reject")}>Reject</Button>
                        </>
                      ) : row.status === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resendMutation.isPending}
                          onClick={() => resendMutation.mutate(row.id)}
                        >
                          Resend Link
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isFetching && !isLoading ? "Refreshing..." : " "}
          </p>

          {totalPages > 1 && (
            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (page > 1) setPage(page - 1)
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
                  const pageNumber = index + 1
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === page}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage(pageNumber)
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (page < totalPages) setPage(page + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "approve" ? "Approve application" : "Reject application"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === "approve"
                ? "Are you sure you want to approve this application?"
                : "Are you sure you want to reject this application?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              variant={dialogAction === "reject" ? "destructive" : "default"}
            >
              {actionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : dialogAction === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
