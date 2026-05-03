"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import {
  deleteTeacherAttendance,
  getTeacherAttendance,
  markTeacherAttendance,
  updateTeacherAttendance,
} from "@/features/attendance/api"
import type { MarkTeacherAttendanceDto, TeacherAttendanceRecord, UpdateAttendanceDto } from "@/features/attendance/types"
import { formatDateLabel, formatTimeLabel, getErrorMessage, normalizeRole, statusVariant, todayIsoDate } from "@/features/attendance/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

type MarkForm = Omit<MarkTeacherAttendanceDto, "">
type EditForm = UpdateAttendanceDto

const emptyMark = (): MarkForm => ({
  teacher_id: "",
  date: todayIsoDate(),
  check_in: "",
  check_out: "",
  status: "PRESENT",
  note: "",
})

export default function TeacherAttendanceWorkspace() {
  const { user } = useAuth()
  const role = normalizeRole(user)
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"
  const queryClient = useQueryClient()

  const [filterDate, setFilterDate] = useState(todayIsoDate())
  const [appliedDate, setAppliedDate] = useState(todayIsoDate())

  const [markOpen, setMarkOpen] = useState(false)
  const [markForm, setMarkForm] = useState<MarkForm>(emptyMark())

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherAttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({})

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const recordsQuery = useQuery({
    queryKey: ["teacher-attendance", appliedDate],
    enabled: isAdmin,
    queryFn: () => getTeacherAttendance({ date: appliedDate }),
  })

  const records = recordsQuery.data ?? []
  const present = records.filter((r) => r.status === "PRESENT").length
  const absent = records.filter((r) => r.status === "ABSENT").length
  const late = records.filter((r) => r.status === "LATE").length

  const markMutation = useMutation({
    mutationFn: () => markTeacherAttendance(markForm),
    onSuccess: () => {
      toast.success("Teacher attendance marked")
      setMarkOpen(false)
      setMarkForm(emptyMark())
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  const editMutation = useMutation({
    mutationFn: () => updateTeacherAttendance(editTarget!.id, editForm),
    onSuccess: () => {
      toast.success("Teacher attendance updated")
      setEditOpen(false)
      setEditTarget(null)
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeacherAttendance(deleteTarget!),
    onSuccess: () => {
      toast.success("Record deleted")
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  if (!isAdmin) {
    return (
      <div className="adm-root">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>Teacher attendance management is restricted to admin roles.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="adm-root space-y-5 pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Teacher Attendance</h1>
          <p>Mark, review, and correct teacher attendance records by date.</p>
        </div>
        <div className="adm-topbar-right">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
          <Button onClick={() => { setMarkForm(emptyMark()); setMarkOpen(true) }}>
            <Plus className="mr-2 size-4" /> Mark Attendance
          </Button>
        </div>
      </div>

      {/* Date filter */}
      <div className="adm-card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Filter by Date</label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <Button onClick={() => setAppliedDate(filterDate)}>Apply</Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total" value={String(records.length)} hint={formatDateLabel(appliedDate)} />
        <StatCard label="Present" value={String(present)} hint={`${records.length ? ((present / records.length) * 100).toFixed(0) : 0}% rate`} />
        <StatCard label="Absent" value={String(absent)} hint="Not present" />
        <StatCard label="Late" value={String(late)} hint="Marked late" />
      </div>

      {/* Table */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Records for {formatDateLabel(appliedDate)}</span>
        </div>

        {recordsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : recordsQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>{getErrorMessage(recordsQuery.error)}</AlertDescription>
          </Alert>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium">No teacher attendance records</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the Mark Attendance button to add records for {formatDateLabel(appliedDate)}.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.teacherName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{record.teacherEmail || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                  </TableCell>
                  <TableCell>{formatTimeLabel(record.checkIn)}</TableCell>
                  <TableCell>{formatTimeLabel(record.checkOut)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{record.note || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTarget(record)
                          setEditForm({ status: record.status, note: record.note ?? "" })
                          setEditOpen(true)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => setDeleteTarget(record.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mark Dialog */}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Teacher Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Teacher ID</label>
              <Input
                placeholder="Paste teacher UUID"
                value={markForm.teacher_id}
                onChange={(e) => setMarkForm((prev) => ({ ...prev, teacher_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <Input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Check In (HH:mm:ss)</label>
                <Input
                  placeholder="09:00:00"
                  value={markForm.check_in ?? ""}
                  onChange={(e) => setMarkForm((prev) => ({ ...prev, check_in: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Check Out (HH:mm:ss)</label>
                <Input
                  placeholder="17:00:00"
                  value={markForm.check_out ?? ""}
                  onChange={(e) => setMarkForm((prev) => ({ ...prev, check_out: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select
                value={markForm.status}
                onValueChange={(v) => setMarkForm((prev) => ({ ...prev, status: v as MarkTeacherAttendanceDto["status"] }))}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Note (optional)</label>
              <Textarea
                placeholder="Optional note"
                value={markForm.note ?? ""}
                onChange={(e) => setMarkForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button>
            <Button
              onClick={() => markMutation.mutate()}
              disabled={!markForm.teacher_id || !markForm.date || markMutation.isPending}
            >
              {markMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Mark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance — {editTarget?.teacherName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select
                value={editForm.status ?? ""}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v as UpdateAttendanceDto["status"] }))}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Note</label>
              <Textarea
                placeholder="Update note"
                value={editForm.note ?? ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
              {editMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete attendance record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The teacher attendance record will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
