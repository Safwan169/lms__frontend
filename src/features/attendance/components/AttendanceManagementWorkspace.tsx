"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2, MessageSquare, RefreshCcw, Save, Search, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import {
  getAttendanceDayView,
  getAttendanceMonthMatrix,
  getAttendanceRollCall,
  saveAttendanceBulk,
  sendAttendanceSms,
} from "@/features/attendance/api"
import { useGetBatchesQuery } from "@/features/user/userApi"
import type { AttendanceBulkSaveItem, AttendanceRecord, AttendanceStatus } from "@/features/attendance/types"
import {
  computeAttendancePercentage,
  formatDateLabel,
  formatMonthLabel,
  formatTimeLabel,
  getErrorMessage,
  isFutureDate,
  makeBulkDraftRecord,
  normalizeRole,
  normalizeBatchOptions,
  resolveAssignedBatchIds,
  resolveTenantId,
  resolveUserDisplayName,
  sourceVariant,
  statusVariant,
  todayIsoDate,
} from "@/features/attendance/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ViewTab = "roll-call" | "day-view" | "month-view"
type DraftMap = Record<string, AttendanceBulkSaveItem>

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

function buildDummyRollCallRows(batchId: string, date: string): AttendanceRecord[] {
  return [
    {
      id: `dummy-${batchId}-1`,
      studentId: "demo-student-1",
      batchId,
      studentName: "Amina Rahman",
      rollNumber: "01",
      status: "PRESENT",
      source: "MANUAL",
      firstEntry: `${date}T08:55:00`,
      lastExit: `${date}T12:30:00`,
      overridden: false,
      overriddenBy: null,
      note: "Demo fallback row",
      phone: "01710000001",
      parentPhone: "01790000001",
      date,
    },
    {
      id: `dummy-${batchId}-2`,
      studentId: "demo-student-2",
      batchId,
      studentName: "Nabil Hossain",
      rollNumber: "02",
      status: "ABSENT",
      source: "MANUAL",
      firstEntry: null,
      lastExit: null,
      overridden: false,
      overriddenBy: null,
      note: "Waiting for live API attendance",
      phone: "01710000002",
      parentPhone: "01790000002",
      date,
    },
    {
      id: `dummy-${batchId}-3`,
      studentId: "demo-student-3",
      batchId,
      studentName: "Sadia Islam",
      rollNumber: "03",
      status: "PRESENT",
      source: "MACHINE",
      firstEntry: `${date}T09:03:00`,
      lastExit: `${date}T12:25:00`,
      overridden: false,
      overriddenBy: null,
      note: "Machine punch demo",
      phone: "01710000003",
      parentPhone: "01790000003",
      date,
    },
  ]
}

export default function AttendanceManagementWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const role = normalizeRole(user)
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"
  const isTeacher = role === "teacher"
  const tenantId = resolveTenantId(user)
  const displayName = resolveUserDisplayName(user)
  const assignedBatchIds = useMemo(() => resolveAssignedBatchIds(user), [user])

  const [activeTab, setActiveTab] = useState<ViewTab>("roll-call")
  const [batchInput, setBatchInput] = useState("")
  const [dateInput, setDateInput] = useState(todayIsoDate())
  const [monthInput, setMonthInput] = useState(todayIsoDate().slice(0, 7))
  const [batchId, setBatchId] = useState("")
  const [date, setDate] = useState(todayIsoDate())
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7))
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [dayStatus, setDayStatus] = useState("All")
  const [daySource, setDaySource] = useState("All")
  const [daySearch, setDaySearch] = useState("")
  const deferredDaySearch = useDeferredValue(daySearch)

  const batchesQuery = useGetBatchesQuery(
    {
      tenantId: String(tenantId),
      page: 1,
      limit: 100,
    },
    {
      skip: !tenantId,
    }
  )

  const normalizedBatchRows = useMemo(() => {
    const payload = batchesQuery.data?.data ?? batchesQuery.data ?? []
    return normalizeBatchOptions(Array.isArray(payload) ? payload : payload?.items ?? payload?.rows ?? payload)
  }, [batchesQuery.data])

  const batches = useMemo(() => {
    const items = normalizedBatchRows
    if (!isTeacher || assignedBatchIds.length === 0) return items
    return items.filter((item) => assignedBatchIds.includes(item.id))
  }, [assignedBatchIds, isTeacher, normalizedBatchRows])

  const rollCallQuery = useQuery({
    queryKey: ["attendance-roll-call", batchId, date],
    enabled: !!batchId && activeTab === "roll-call",
    queryFn: () => getAttendanceRollCall({ batchId, date }),
  })

  const dayViewQuery = useQuery({
    queryKey: ["attendance-day-view", batchId, date, dayStatus, daySource, deferredDaySearch],
    enabled: !!batchId && activeTab === "day-view",
    queryFn: () =>
      getAttendanceDayView({
        batchId,
        date,
        status: dayStatus === "All" ? "" : dayStatus,
        source: daySource === "All" ? "" : daySource,
        search: deferredDaySearch,
      }),
  })

  const monthViewQuery = useQuery({
    queryKey: ["attendance-month-view", batchId, month],
    enabled: !!batchId && activeTab === "month-view",
    queryFn: () => {
      const [year, monthValue] = month.split("-").map(Number)
      return getAttendanceMonthMatrix({ batchId, month: monthValue, year })
    },
  })

  const apiRows = rollCallQuery.data ?? []
  const hasFallbackRows = !rollCallQuery.isLoading && !rollCallQuery.isError && !!batchId && apiRows.length === 0
  const rollCallSourceRows = hasFallbackRows ? buildDummyRollCallRows(batchId, date) : apiRows

  const baseDrafts = useMemo(() => {
    return rollCallSourceRows.reduce<DraftMap>((acc, item) => {
      acc[item.studentId] = {
        student_id: item.studentId,
        batch_id: item.batchId,
        date: item.date,
        status: item.status,
        source: item.source,
        first_entry: item.firstEntry ?? null,
        last_exit: item.lastExit ?? null,
        overridden: item.overridden,
        overridden_by: item.overriddenBy ?? null,
        note: item.note ?? null,
      }
      return acc
    }, {})
  }, [rollCallSourceRows])

  const rows = useMemo(() => {
    return rollCallSourceRows.map((item) => {
      const draft = drafts[item.studentId] ?? baseDrafts[item.studentId]
      return draft
        ? ({ ...item, status: draft.status, source: draft.source, note: draft.note ?? null, overridden: Boolean(draft.overridden), overriddenBy: draft.overridden_by ?? null } as AttendanceRecord)
        : item
    })
  }, [baseDrafts, drafts, rollCallSourceRows])

  const stats = useMemo(() => {
    const total = rows.length
    const present = rows.filter((item) => item.status === "PRESENT").length
    const absent = rows.filter((item) => item.status === "ABSENT").length
    const late = rows.filter((item) => item.status === "LATE").length
    const excused = rows.filter((item) => item.status === "EXCUSED").length
    return { total, present, absent, late, excused, percentage: computeAttendancePercentage(present, total) }
  }, [rows])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("Select a batch first")
      if (isFutureDate(date)) throw new Error("Cannot mark attendance for future dates")
      return saveAttendanceBulk({
        batchId,
        date,
        records: rows.map((row) => drafts[row.studentId] ?? baseDrafts[row.studentId]).filter((item): item is AttendanceBulkSaveItem => Boolean(item)),
      })
    },
    onSuccess: () => {
      toast.success("Attendance saved")
      queryClient.invalidateQueries({ queryKey: ["attendance-roll-call", batchId, date] })
      queryClient.invalidateQueries({ queryKey: ["attendance-day-view", batchId, date] })
      queryClient.invalidateQueries({ queryKey: ["attendance-month-view", batchId] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  const smsMutation = useMutation({
    mutationFn: (payload: { studentIds?: string[]; batchId?: string; date?: string }) => sendAttendanceSms(payload),
    onSuccess: () => toast.success("SMS request sent"),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  if (!isAdmin && !isTeacher) {
    return (
      <div className="adm-root">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Restricted page</AlertTitle>
          <AlertDescription>Students should use the self-attendance page. This workspace is for admin and teacher roles.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const batchLabel = batches.find((item) => item.id === batchId)?.name ?? "Selected Batch"
  const tabs: ViewTab[] = ["roll-call", "day-view", "month-view"]

  const updateStatus = (row: AttendanceRecord, nextStatus: AttendanceStatus) => {
    setDrafts((prev) => ({
      ...prev,
      [row.studentId]: {
        ...(prev[row.studentId] ?? makeBulkDraftRecord(row, row.status, displayName)),
        ...makeBulkDraftRecord(row, nextStatus, displayName),
        note: prev[row.studentId]?.note ?? row.note ?? null,
      },
    }))
  }

  const updateNote = (row: AttendanceRecord, note: string) => {
    setDrafts((prev) => ({
      ...prev,
      [row.studentId]: {
        ...(prev[row.studentId] ?? makeBulkDraftRecord(row, row.status, displayName)),
        note,
      },
    }))
  }

  const markAll = (nextStatus: AttendanceStatus) => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const row of rows) {
        next[row.studentId] = {
          ...(next[row.studentId] ?? makeBulkDraftRecord(row, row.status, displayName)),
          ...makeBulkDraftRecord(row, nextStatus, displayName),
          note: next[row.studentId]?.note ?? row.note ?? null,
        }
      }
      return next
    })
  }

  const handleLoad = () => {
    const nextBatchId = batchInput || batches[0]?.id || ""
    if (!nextBatchId) return toast.error("Select a batch first")
    if (isFutureDate(dateInput)) return toast.error("Future dates are not allowed")
    setBatchId(nextBatchId)
    setDate(dateInput)
    setMonth(monthInput)
    setSelectedIds([])
    setDrafts({})
  }

  const toggleAllSelected = () => {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((item) => item.studentId)))
  }

  return (
    <div className="adm-root space-y-5 pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Attendance Management</h1>
          <p>Use the existing batch and auth data to run roll call, review day summaries, inspect month matrices, and audit changes.</p>
        </div>
        <div className="adm-topbar-right">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["attendance-roll-call"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || rows.length === 0}>
            {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Attendance
          </Button>
        </div>
      </div>

      {isTeacher ? (
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Teacher access stays batch scoped</AlertTitle>
          <AlertDescription>The UI filters to assigned batches when those IDs are available in the current session. The backend remains the final access control layer.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Students Loaded" value={String(stats.total)} hint={`${batchLabel} • ${formatDateLabel(date)}`} />
        <StatCard label="Present" value={String(stats.present)} hint={`Rate ${stats.percentage}%`} />
        <StatCard label="Late + Excused" value={String(stats.late + stats.excused)} hint={`${stats.late} late, ${stats.excused} excused`} />
        <StatCard label="Absent" value={String(stats.absent)} hint={`${selectedIds.length} selected`} />
      </div>

      <div className="adm-card">
        <div className="grid gap-4 md:grid-cols-[1.2fr_180px_180px_auto]">
          <Select
            value={batchInput}
            onValueChange={(value) => {
              setBatchInput(value)
              setBatchId(value)
              setSelectedIds([])
              setDrafts({})
            }}
            disabled={batchesQuery.isLoading}
          >
            <option value="">Select batch</option>
            {batches.map((item) => (
              <option key={item.id} value={item.id}>{item.className ? `${item.name} • ${item.className}` : item.name}</option>
            ))}
          </Select>
          <Input
            type="date"
            value={dateInput}
            onChange={(event) => {
              const value = event.target.value
              setDateInput(value)
              if (!isFutureDate(value)) {
                setDate(value)
                setSelectedIds([])
                setDrafts({})
              }
            }}
          />
          <Input
            type="month"
            value={monthInput}
            onChange={(event) => {
              const value = event.target.value
              setMonthInput(value)
              setMonth(value)
            }}
          />
          <Button onClick={handleLoad}>Load</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab} size="sm" variant={activeTab === tab ? "default" : "outline"} onClick={() => setActiveTab(tab)}>
            {tab === "roll-call" ? "Roll Call" : tab === "day-view" ? "Day View" : "Month Matrix"}
          </Button>
        ))}
      </div>

      {activeTab === "roll-call" ? (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Roll Call Screen</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => markAll("PRESENT")}>Mark All Present</Button>
              <Button size="sm" variant="outline" onClick={() => markAll("ABSENT")}>Mark All Absent</Button>
              <Button
                size="sm"
                disabled={selectedIds.length === 0 || smsMutation.isPending}
                onClick={() => smsMutation.mutate({ batchId, date, studentIds: selectedIds })}
              >
                {smsMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
                SMS Selected
              </Button>
            </div>
          </div>

          {rollCallQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : rollCallQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to load roll call</AlertTitle>
              <AlertDescription>{getErrorMessage(rollCallQuery.error)}</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
              <p className="font-medium">No attendance rows found</p>
              <p className="mt-1 text-sm text-muted-foreground">Load a batch and date to begin roll call.</p>
            </div>
          ) : (
            <>
              {hasFallbackRows ? (
                <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Showing demo attendance rows</AlertTitle>
                  <AlertDescription>
                    The attendance API returned no rows for this batch/date, so mock students are shown to keep the screen usable during setup.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAllSelected} /></TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>First Entry</TableHead>
                    <TableHead>Last Exit</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">SMS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.studentId)}
                          onChange={(event) =>
                            setSelectedIds((prev) =>
                              event.target.checked ? Array.from(new Set([...prev, row.studentId])) : prev.filter((item) => item !== row.studentId)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.rollNumber || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{row.studentName}</div>
                          <div className="text-xs text-muted-foreground">{row.phone || row.parentPhone || "No phone found"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={row.status} onValueChange={(value) => updateStatus(row, value as AttendanceStatus)} className="min-w-[130px]">
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="LATE">Late</option>
                          <option value="EXCUSED">Excused</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={sourceVariant(row.source)}>{row.source}</Badge>
                          {row.overridden ? <Badge variant="warning">Override</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatTimeLabel(row.firstEntry)}</TableCell>
                      <TableCell>{formatTimeLabel(row.lastExit)}</TableCell>
                      <TableCell className="min-w-[220px]">
                        <Textarea value={drafts[row.studentId]?.note ?? row.note ?? ""} onChange={(event) => updateNote(row, event.target.value)} className="min-h-20 bg-white" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => smsMutation.mutate({ batchId, date, studentIds: [row.studentId] })}>
                          <MessageSquare className="mr-1 size-4" /> Send
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      ) : null}

      {activeTab === "day-view" ? (
        <div className="adm-card">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search student or roll" value={daySearch} onChange={(event) => setDaySearch(event.target.value)} />
            </div>
            <Select value={dayStatus} onValueChange={setDayStatus}>
              <option value="All">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </Select>
            <Select value={daySource} onValueChange={setDaySource}>
              <option value="All">All Sources</option>
              <option value="MACHINE">Machine</option>
              <option value="MANUAL">Manual</option>
            </Select>
          </div>

          {dayViewQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : dayViewQuery.data ? (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <StatCard label="Present" value={String(dayViewQuery.data.totals.present)} hint="Students marked present" />
                <StatCard label="Absent" value={String(dayViewQuery.data.totals.absent)} hint="Students missing" />
                <StatCard label="Late" value={String(dayViewQuery.data.totals.late)} hint="Students entered late" />
                <StatCard label="Machine / Manual" value={`${dayViewQuery.data.totals.machine} / ${dayViewQuery.data.totals.manual}`} hint="Source split" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayViewQuery.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.rollNumber || "-"}</TableCell>
                      <TableCell className="font-medium">{item.studentName}</TableCell>
                      <TableCell><Badge variant={statusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell><Badge variant={sourceVariant(item.source)}>{item.source}</Badge></TableCell>
                      <TableCell>{formatTimeLabel(item.firstEntry)}</TableCell>
                      <TableCell>{formatTimeLabel(item.lastExit)}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{item.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Load a batch and date to inspect the day summary.</p>
          )}
        </div>
      ) : null}

      {activeTab === "month-view" ? (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Month Matrix</span>
            <span className="text-sm text-muted-foreground">
              {month ? formatMonthLabel(Number(month.split("-")[0]), Number(month.split("-")[1])) : ""}
            </span>
          </div>
          {monthViewQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : monthViewQuery.data ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-10 border-b bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                    <th className="border-b px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roll</th>
                    {monthViewQuery.data.days.map((day) => (
                      <th key={day} className="border-b px-2 py-3 text-center text-xs font-semibold text-muted-foreground">{new Date(day).getDate()}</th>
                    ))}
                    <th className="border-b px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {monthViewQuery.data.rows.map((row) => (
                    <tr key={row.studentId} className="border-b last:border-0">
                      <td className="sticky left-0 bg-white px-3 py-3 font-medium">{row.studentName}</td>
                      <td className="px-3 py-3">{row.rollNumber || "-"}</td>
                      {monthViewQuery.data.days.map((day) => {
                        const status = row.cells[day]
                        return (
                          <td key={`${row.studentId}-${day}`} className="px-2 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold",
                                status === "PRESENT" && "bg-emerald-100 text-emerald-700",
                                status === "ABSENT" && "bg-rose-100 text-rose-700",
                                status === "LATE" && "bg-amber-100 text-amber-700",
                                status === "EXCUSED" && "bg-blue-100 text-blue-700",
                                !status && "bg-slate-100 text-slate-400"
                              )}
                            >
                              {status ? status[0] : "-"}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 font-medium">{row.summary.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Load a batch and month to view the attendance matrix.</p>
          )}
        </div>
      ) : null}

    </div>
  )
}
