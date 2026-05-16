"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  X,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import {
  getAttendanceDayView,
  getAttendanceLogs,
  getAttendanceMonthMatrix,
  getAttendanceRollCall,
  getTeacherAssignedBatches,
  saveAttendanceBulk,
  sendAttendanceSms,
} from "@/features/attendance/api"
import { useGetBatchesQuery } from "@/features/user/userApi"
import type {
  AttendanceBulkSaveItem,
  AttendanceDayView,
  AttendanceLogEntry,
  AttendanceMonthMatrix,
  AttendanceRecord,
  AttendanceStatus,
} from "@/features/attendance/types"
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
import { cn } from "@/lib/utils"

type RoleTab = "roll-call" | "summary" | "logs"
type SummaryRange = "single" | "month" | "range"
type LogsRange = "single" | "month" | "range"
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

export default function AttendanceManagementWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const role = normalizeRole(user)
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"
  const isTeacher = role === "teacher"
  const tenantId = resolveTenantId(user)
  const displayName = resolveUserDisplayName(user)

  // ─── Role-aware tabs ────────────────────────────────────────────
  const tabs: RoleTab[] = isAdmin
    ? ["summary", "logs", "roll-call"]
    : ["roll-call", "summary"]
  const [activeTab, setActiveTab] = useState<RoleTab>(tabs[0])

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0])
  }, [activeTab, tabs])

  // ─── Batch selection (shared across tabs) ───────────────────────
  const [batchId, setBatchId] = useState("")
  // Teacher's Roll Call = "No filter today" => always today, no date input
  // Admin Roll Call = Today View => always today
  const rollCallDate = todayIsoDate()

  // ─── Roll Call state ────────────────────────────────────────────
  const [mode, setMode] = useState<"view" | "edit">("view")
  // Tracks when the teacher has explicitly run a bulk action (Mark as Present /
  // Mark as Absent) so the Save button appears even if the chosen status
  // happens to match the row's current value — the click itself is the intent
  // to commit / re-confirm.
  const [bulkActionApplied, setBulkActionApplied] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<DraftMap>({})

  // ─── Summary state ──────────────────────────────────────────────
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("single")
  const [summarySingleDate, setSummarySingleDate] = useState(todayIsoDate())
  const [summaryMonth, setSummaryMonth] = useState(todayIsoDate().slice(0, 7))
  const [summaryStart, setSummaryStart] = useState(todayIsoDate())
  const [summaryEnd, setSummaryEnd] = useState(todayIsoDate())
  const [summaryStatus, setSummaryStatus] = useState("All")
  const [summarySource, setSummarySource] = useState("All")
  const [summarySearch, setSummarySearch] = useState("")
  const deferredSearch = useDeferredValue(summarySearch)

  // ─── Logs state (admin) ─────────────────────────────────────────
  const [logsRange, setLogsRange] = useState<LogsRange>("single")
  const [logsSingleDate, setLogsSingleDate] = useState(todayIsoDate())
  const [logsMonth, setLogsMonth] = useState(todayIsoDate().slice(0, 7))
  const [logsStart, setLogsStart] = useState(todayIsoDate())
  const [logsEnd, setLogsEnd] = useState(todayIsoDate())
  const [logsStatusFilter, setLogsStatusFilter] = useState("")

  // ─── Batches ────────────────────────────────────────────────────
  // Admin: /api/tenants/:tenantId/batches  (admin-only on backend)
  // Teacher: chain /teachers/me/classes → /teachers/me/classes/:id/batches
  const adminBatchesQuery = useGetBatchesQuery(
    { tenantId: String(tenantId), page: 1, limit: 100 },
    { skip: !tenantId || !isAdmin }
  )

  const teacherBatchesQuery = useQuery({
    queryKey: ["attendance-teacher-batches", String(tenantId ?? "")],
    enabled: isTeacher,
    queryFn: getTeacherAssignedBatches,
  })

  const isBatchesLoading = isAdmin ? adminBatchesQuery.isLoading : teacherBatchesQuery.isLoading

  const adminBatchRows = useMemo(() => {
    if (!isAdmin) return []
    const payload = adminBatchesQuery.data?.data ?? adminBatchesQuery.data ?? []
    return normalizeBatchOptions(
      Array.isArray(payload) ? payload : payload?.items ?? payload?.rows ?? payload
    )
  }, [adminBatchesQuery.data, isAdmin])

  const batches = useMemo(() => {
    if (isTeacher) return teacherBatchesQuery.data ?? []
    return adminBatchRows
  }, [adminBatchRows, isTeacher, teacherBatchesQuery.data])

  useEffect(() => {
    if (!batchId && batches.length > 0) setBatchId(batches[0].id)
  }, [batchId, batches])

  // ─── Roll Call query ────────────────────────────────────────────
  const rollCallQuery = useQuery({
    queryKey: ["attendance-roll-call", batchId, rollCallDate],
    enabled: !!batchId && activeTab === "roll-call",
    queryFn: () => getAttendanceRollCall({ batchId, date: rollCallDate }),
  })

  const rollCallRows = rollCallQuery.data ?? []

  const baseDrafts = useMemo<DraftMap>(() => {
    return rollCallRows.reduce<DraftMap>((acc, item) => {
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
  }, [rollCallRows])

  const rows = useMemo(() => {
    return rollCallRows.map((item) => {
      const draft = drafts[item.studentId] ?? baseDrafts[item.studentId]
      if (!draft) return item
      return {
        ...item,
        status: draft.status,
        source: draft.source,
        note: draft.note ?? null,
        overridden: Boolean(draft.overridden),
        overriddenBy: draft.overridden_by ?? null,
      } as AttendanceRecord
    })
  }, [baseDrafts, drafts, rollCallRows])

  const hasUnsavedChanges = useMemo(() => {
    if (bulkActionApplied) return true
    return Object.keys(drafts).some((id) => {
      const base = baseDrafts[id]
      const draft = drafts[id]
      if (!base || !draft) return true
      return base.status !== draft.status || base.note !== draft.note
    })
  }, [drafts, baseDrafts, bulkActionApplied])

  const stats = useMemo(() => {
    const total = rows.length
    const present = rows.filter((row) => row.status === "PRESENT").length
    const absent = rows.filter((row) => row.status === "ABSENT").length
    const late = rows.filter((row) => row.status === "LATE").length
    const excused = rows.filter((row) => row.status === "EXCUSED").length
    return { total, present, absent, late, excused, percentage: computeAttendancePercentage(present, total) }
  }, [rows])

  // ─── Summary queries ────────────────────────────────────────────
  const summarySingleQuery = useQuery({
    queryKey: ["attendance-summary-single", batchId, summarySingleDate, summaryStatus, summarySource, deferredSearch],
    enabled: !!batchId && activeTab === "summary" && summaryRange === "single",
    queryFn: () =>
      getAttendanceDayView({
        batchId,
        date: summarySingleDate,
        status: summaryStatus === "All" ? "" : summaryStatus,
        source: summarySource === "All" ? "" : summarySource,
        search: deferredSearch,
      }),
  })

  const summaryMonthQuery = useQuery({
    queryKey: ["attendance-summary-month", batchId, summaryMonth],
    enabled: !!batchId && activeTab === "summary" && summaryRange === "month",
    queryFn: () => {
      const [year, monthValue] = summaryMonth.split("-").map(Number)
      return getAttendanceMonthMatrix({ batchId, month: monthValue, year })
    },
  })

  const summaryRangeQuery = useQuery({
    queryKey: ["attendance-summary-range", batchId, summaryStart, summaryEnd],
    enabled: !!batchId && activeTab === "summary" && summaryRange === "range" && !!summaryStart && !!summaryEnd,
    queryFn: async () => {
      const start = new Date(summaryStart)
      const end = new Date(summaryEnd)
      if (start > end) throw new Error("Start date must be on or before end date")
      const days: string[] = []
      const cursor = new Date(start)
      while (cursor <= end) {
        days.push(cursor.toISOString().slice(0, 10))
        cursor.setDate(cursor.getDate() + 1)
      }
      const results = await Promise.all(
        days.map((day) => getAttendanceDayView({ batchId, date: day }))
      )
      const studentMap = new Map<string, { name: string; roll: string; present: number; absent: number; late: number; excused: number }>()
      for (const result of results) {
        for (const item of result.items) {
          const entry = studentMap.get(item.studentId) ?? {
            name: item.studentName,
            roll: item.rollNumber,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          }
          if (item.status === "PRESENT") entry.present += 1
          else if (item.status === "ABSENT") entry.absent += 1
          else if (item.status === "LATE") entry.late += 1
          else if (item.status === "EXCUSED") entry.excused += 1
          studentMap.set(item.studentId, entry)
        }
      }
      return {
        days,
        totals: {
          present: results.reduce((sum, r) => sum + r.totals.present, 0),
          absent: results.reduce((sum, r) => sum + r.totals.absent, 0),
          late: results.reduce((sum, r) => sum + r.totals.late, 0),
          excused: results.reduce((sum, r) => sum + r.totals.excused, 0),
        },
        students: Array.from(studentMap.entries()).map(([studentId, value]) => ({
          studentId,
          ...value,
          total: value.present + value.absent + value.late + value.excused,
          percentage: computeAttendancePercentage(value.present, value.present + value.absent + value.late + value.excused),
        })),
      }
    },
  })

  // ─── Logs queries (admin) ───────────────────────────────────────
  const logsQuery = useQuery({
    queryKey: ["attendance-logs", logsRange, logsSingleDate, logsMonth, logsStart, logsEnd, logsStatusFilter],
    enabled: isAdmin && activeTab === "logs",
    queryFn: () => getAttendanceLogs({ status: logsStatusFilter || undefined, take: 200 }),
  })

  const filteredLogs = useMemo(() => {
    const all = logsQuery.data ?? []
    return all.filter((log) => {
      const logDate = (log.date || "").slice(0, 10)
      if (!logDate) return false
      if (logsRange === "single") return logDate === logsSingleDate
      if (logsRange === "month") return logDate.startsWith(logsMonth)
      return logDate >= logsStart && logDate <= logsEnd
    })
  }, [logsQuery.data, logsRange, logsSingleDate, logsMonth, logsStart, logsEnd])

  // ─── Mutations ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("Select a batch first")
      if (isFutureDate(rollCallDate)) throw new Error("Cannot mark attendance for future dates")
      const records = rows
        .map((row) => drafts[row.studentId] ?? baseDrafts[row.studentId])
        .filter((item): item is AttendanceBulkSaveItem => Boolean(item))
      return saveAttendanceBulk({ batchId, date: rollCallDate, records })
    },
    onSuccess: () => {
      toast.success("Attendance saved")
      setDrafts({})
      setSelectedIds([])
      setMode("view")
      setBulkActionApplied(false)
      queryClient.invalidateQueries({ queryKey: ["attendance-roll-call", batchId, rollCallDate] })
      queryClient.invalidateQueries({ queryKey: ["attendance-summary-single"] })
      queryClient.invalidateQueries({ queryKey: ["attendance-summary-month"] })
      queryClient.invalidateQueries({ queryKey: ["attendance-summary-range"] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  const smsMutation = useMutation({
    mutationFn: (payload: { studentIds?: string[]; batchId?: string; date?: string }) => sendAttendanceSms(payload),
    onSuccess: (result) => {
      if (result.available) {
        toast.success("SMS request sent")
        setSelectedIds([])
        return
      }
      toast(result.message)
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  // ─── Guards ─────────────────────────────────────────────────────
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

  // ─── Handlers ───────────────────────────────────────────────────
  const startEdit = () => {
    setMode("edit")
    setSelectedIds([])
  }

  const cancelEdit = () => {
    setMode("view")
    setDrafts({})
    setSelectedIds([])
    setBulkActionApplied(false)
  }

  const fullRefresh = () => {
    setDrafts({})
    setSelectedIds([])
    setMode("view")
    setBulkActionApplied(false)
    queryClient.invalidateQueries({ queryKey: ["attendance-roll-call"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-summary-single"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-summary-month"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-summary-range"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-logs"] })
  }

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

  const markSelected = (nextStatus: AttendanceStatus) => {
    if (selectedIds.length === 0) return
    setBulkActionApplied(true)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const studentId of selectedIds) {
        const row = rows.find((item) => item.studentId === studentId)
        if (!row) continue
        next[studentId] = {
          ...(next[studentId] ?? makeBulkDraftRecord(row, row.status, displayName)),
          ...makeBulkDraftRecord(row, nextStatus, displayName),
          note: next[studentId]?.note ?? row.note ?? null,
        }
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.studentId)))
  }

  const sendSmsForSelected = () => {
    if (selectedIds.length === 0) return
    smsMutation.mutate({ batchId, date: rollCallDate, studentIds: selectedIds })
  }

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="adm-root space-y-5 pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Attendance Management</h1>
          <p>
            {isAdmin
              ? "Admin view — review summaries, audit machine logs, and take today's roll call."
              : "Teacher view — take today's roll call and review batch summaries."}
          </p>
        </div>
        <div className="adm-topbar-right">
          <Button variant="outline" onClick={fullRefresh}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="adm-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-1.5 md:max-w-md">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Batch
            </label>
            <Select
              value={batchId}
              onValueChange={(value) => {
                setBatchId(value)
                setSelectedIds([])
                setDrafts({})
                setMode("view")
              }}
              disabled={isBatchesLoading}
            >
              <option value="">
                {isBatchesLoading
                  ? "Loading batches…"
                  : batches.length === 0
                    ? isTeacher
                      ? "No batches assigned to you yet"
                      : "No batches available"
                    : "Select batch"}
              </option>
              {batches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.className ? `${item.name} • ${item.className}` : item.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 self-start rounded-lg border bg-slate-50 px-3 py-2 text-sm md:self-end">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="font-medium">{batchLabel}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Today: {formatDateLabel(rollCallDate)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "roll-call" ? "Roll Call" : tab === "summary" ? "Summary" : "Logs"}
          </Button>
        ))}
      </div>

      {activeTab === "roll-call" ? (
        <RollCallPanel
          rows={rows}
          stats={stats}
          mode={mode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          isLoading={rollCallQuery.isLoading}
          isError={rollCallQuery.isError}
          error={rollCallQuery.error}
          batchId={batchId}
          hasUnsavedChanges={hasUnsavedChanges}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          saveEdit={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
          markSelected={markSelected}
          sendSms={sendSmsForSelected}
          isSendingSms={smsMutation.isPending}
          updateStatus={updateStatus}
          toggleSelectAll={toggleSelectAll}
        />
      ) : null}

      {activeTab === "summary" ? (
        <SummaryPanel
          range={summaryRange}
          setRange={setSummaryRange}
          singleDate={summarySingleDate}
          setSingleDate={setSummarySingleDate}
          month={summaryMonth}
          setMonth={setSummaryMonth}
          start={summaryStart}
          setStart={setSummaryStart}
          end={summaryEnd}
          setEnd={setSummaryEnd}
          status={summaryStatus}
          setStatus={setSummaryStatus}
          source={summarySource}
          setSource={setSummarySource}
          search={summarySearch}
          setSearch={setSummarySearch}
          singleQuery={summarySingleQuery}
          monthQuery={summaryMonthQuery}
          rangeQuery={summaryRangeQuery}
        />
      ) : null}

      {activeTab === "logs" && isAdmin ? (
        <LogsPanel
          range={logsRange}
          setRange={setLogsRange}
          singleDate={logsSingleDate}
          setSingleDate={setLogsSingleDate}
          month={logsMonth}
          setMonth={setLogsMonth}
          start={logsStart}
          setStart={setLogsStart}
          end={logsEnd}
          setEnd={setLogsEnd}
          statusFilter={logsStatusFilter}
          setStatusFilter={setLogsStatusFilter}
          logs={filteredLogs}
          isLoading={logsQuery.isLoading}
          isError={logsQuery.isError}
          error={logsQuery.error}
        />
      ) : null}
    </div>
  )
}

// ─── Roll Call Panel ──────────────────────────────────────────────
type RollCallPanelProps = {
  rows: AttendanceRecord[]
  stats: { total: number; present: number; absent: number; late: number; excused: number; percentage: number }
  mode: "view" | "edit"
  selectedIds: string[]
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  isLoading: boolean
  isError: boolean
  error: unknown
  batchId: string
  hasUnsavedChanges: boolean
  startEdit: () => void
  cancelEdit: () => void
  saveEdit: () => void
  isSaving: boolean
  markSelected: (status: AttendanceStatus) => void
  sendSms: () => void
  isSendingSms: boolean
  updateStatus: (row: AttendanceRecord, status: AttendanceStatus) => void
  toggleSelectAll: () => void
}

function RollCallPanel(props: RollCallPanelProps) {
  const {
    rows,
    stats,
    mode,
    selectedIds,
    setSelectedIds,
    isLoading,
    isError,
    error,
    batchId,
    hasUnsavedChanges,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving,
    markSelected,
    sendSms,
    isSendingSms,
    updateStatus,
    toggleSelectAll,
  } = props

  const isEdit = mode === "edit"
  const hasSelection = selectedIds.length > 0

  if (!batchId) {
    return (
      <div className="adm-card">
        <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
          <p className="font-medium">Select a batch to begin roll call</p>
          <p className="mt-1 text-sm text-muted-foreground">Today&apos;s roll call will load automatically.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Students" value={String(stats.total)} hint={`Today • ${formatDateLabel(todayIsoDate())}`} />
        <StatCard label="Present" value={String(stats.present)} hint={`Rate ${stats.percentage}%`} />
        <StatCard label="Late + Excused" value={String(stats.late + stats.excused)} hint={`${stats.late} late, ${stats.excused} excused`} />
        <StatCard label="Absent" value={String(stats.absent)} hint={`${selectedIds.length} selected`} />
      </div>

      <div className="adm-card">
        <div className="adm-card-header flex flex-wrap items-center justify-between gap-3">
          <span className="adm-card-title">Roll Call — Today</span>
          <div className="flex flex-wrap items-center gap-2">
            {!isEdit ? (
              <>
                <Button size="sm" onClick={startEdit} disabled={rows.length === 0}>
                  <Pencil className="mr-2 size-4" /> Mark Attendance
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection || isSendingSms}
                  onClick={sendSms}
                >
                  {isSendingSms ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
                  Send SMS
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection}
                  onClick={() => markSelected("PRESENT")}
                >
                  <CheckCircle2 className="mr-2 size-4" /> Mark as Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection}
                  onClick={() => markSelected("ABSENT")}
                >
                  <XCircle className="mr-2 size-4" /> Mark as Absent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection || isSendingSms}
                  onClick={sendSms}
                >
                  {isSendingSms ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
                  Send SMS
                </Button>
                {hasUnsavedChanges ? (
                  <>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                      <X className="mr-2 size-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="mr-2 size-4" /> Exit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load roll call</AlertTitle>
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium">No attendance rows found</p>
            <p className="mt-1 text-sm text-muted-foreground">Today&apos;s roll for this batch is empty.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.studentId)}
                      onChange={(event) =>
                        setSelectedIds((prev) =>
                          event.target.checked
                            ? Array.from(new Set([...prev, row.studentId]))
                            : prev.filter((id) => id !== row.studentId)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.rollNumber || String(index + 1)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{row.studentName}</div>
                      <div className="text-xs text-muted-foreground">{row.phone || row.parentPhone || "No phone"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEdit ? (
                      <Select
                        value={row.status}
                        onValueChange={(value) => updateStatus(row, value as AttendanceStatus)}
                        className="min-w-[130px]"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="EXCUSED">Excused</option>
                      </Select>
                    ) : (
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={sourceVariant(row.source)}>{row.source}</Badge>
                      {row.overridden ? <Badge variant="warning">Override</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatTimeLabel(row.firstEntry)}</TableCell>
                  <TableCell>{formatTimeLabel(row.lastExit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ─── Summary Panel ────────────────────────────────────────────────
type SummaryPanelProps = {
  range: SummaryRange
  setRange: (value: SummaryRange) => void
  singleDate: string
  setSingleDate: (value: string) => void
  month: string
  setMonth: (value: string) => void
  start: string
  setStart: (value: string) => void
  end: string
  setEnd: (value: string) => void
  status: string
  setStatus: (value: string) => void
  source: string
  setSource: (value: string) => void
  search: string
  setSearch: (value: string) => void
  singleQuery: {
    data?: AttendanceDayView
    isLoading: boolean
    isError: boolean
    error: unknown
  }
  monthQuery: {
    data?: AttendanceMonthMatrix
    isLoading: boolean
    isError: boolean
    error: unknown
  }
  rangeQuery: {
    data?: {
      days: string[]
      totals: { present: number; absent: number; late: number; excused: number }
      students: Array<{
        studentId: string
        name: string
        roll: string
        present: number
        absent: number
        late: number
        excused: number
        total: number
        percentage: number
      }>
    }
    isLoading: boolean
    isError: boolean
    error: unknown
  }
}

function SummaryPanel(props: SummaryPanelProps) {
  const {
    range,
    setRange,
    singleDate,
    setSingleDate,
    month,
    setMonth,
    start,
    setStart,
    end,
    setEnd,
    status,
    setStatus,
    source,
    setSource,
    search,
    setSearch,
    singleQuery,
    monthQuery,
    rangeQuery,
  } = props

  const subTabs: { id: SummaryRange; label: string }[] = [
    { id: "single", label: "Single" },
    { id: "month", label: "Month" },
    { id: "range", label: "Range" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={range === tab.id ? "default" : "outline"}
            onClick={() => setRange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {range === "single" ? (
        <div className="adm-card space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_1fr_180px_180px]">
            <Input
              type="date"
              value={singleDate}
              onChange={(event) => setSingleDate(event.target.value)}
              max={todayIsoDate()}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search student or roll"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <option value="All">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <option value="All">All Sources</option>
              <option value="MACHINE">Machine</option>
              <option value="MANUAL">Manual</option>
            </Select>
          </div>

          {singleQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : singleQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load summary</AlertTitle>
              <AlertDescription>{getErrorMessage(singleQuery.error)}</AlertDescription>
            </Alert>
          ) : singleQuery.data ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="Present" value={String(singleQuery.data.totals.present)} hint="Students marked present" />
                <StatCard label="Absent" value={String(singleQuery.data.totals.absent)} hint="Students missing" />
                <StatCard label="Late" value={String(singleQuery.data.totals.late)} hint="Students late" />
                <StatCard
                  label="Machine / Manual"
                  value={`${singleQuery.data.totals.machine} / ${singleQuery.data.totals.manual}`}
                  hint="Source split"
                />
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
                  {singleQuery.data.items.map((item) => (
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
            <p className="text-sm text-muted-foreground">Pick a date to load the daily summary.</p>
          )}
        </div>
      ) : null}

      {range === "month" ? (
        <div className="adm-card space-y-4">
          <div className="grid gap-3 md:grid-cols-[200px_auto]">
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <span className="self-center text-sm text-muted-foreground">
              {month ? formatMonthLabel(Number(month.split("-")[0]), Number(month.split("-")[1])) : ""}
            </span>
          </div>

          {monthQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : monthQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load month matrix</AlertTitle>
              <AlertDescription>{getErrorMessage(monthQuery.error)}</AlertDescription>
            </Alert>
          ) : monthQuery.data ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-10 border-b bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                    <th className="border-b px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roll</th>
                    {monthQuery.data.days.map((day: string) => (
                      <th key={day} className="border-b px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                        {new Date(day).getDate()}
                      </th>
                    ))}
                    <th className="border-b px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {monthQuery.data.rows.map((row) => (
                    <tr key={row.studentId} className="border-b last:border-0">
                      <td className="sticky left-0 bg-white px-3 py-3 font-medium">{row.studentName}</td>
                      <td className="px-3 py-3">{row.rollNumber || "-"}</td>
                      {monthQuery.data!.days.map((day) => {
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
            <p className="text-sm text-muted-foreground">Pick a month to load the matrix.</p>
          )}
        </div>
      ) : null}

      {range === "range" ? (
        <div className="adm-card space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
            <Input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              max={end || todayIsoDate()}
            />
            <Input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              max={todayIsoDate()}
              min={start}
            />
            <span className="self-center text-sm text-muted-foreground">
              {start} → {end}
            </span>
          </div>

          {rangeQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : rangeQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load range summary</AlertTitle>
              <AlertDescription>{getErrorMessage(rangeQuery.error)}</AlertDescription>
            </Alert>
          ) : rangeQuery.data ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="Present" value={String(rangeQuery.data.totals.present)} hint={`${rangeQuery.data.days.length} days`} />
                <StatCard label="Absent" value={String(rangeQuery.data.totals.absent)} hint="Across range" />
                <StatCard label="Late" value={String(rangeQuery.data.totals.late)} hint="Across range" />
                <StatCard label="Excused" value={String(rangeQuery.data.totals.excused)} hint="Across range" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Excused</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rangeQuery.data.students.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>{row.roll || "-"}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.present}</TableCell>
                      <TableCell>{row.absent}</TableCell>
                      <TableCell>{row.late}</TableCell>
                      <TableCell>{row.excused}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell className="font-medium">{row.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick a date range to aggregate.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── Logs Panel (admin) ────────────────────────────────────────────
type LogsPanelProps = {
  range: LogsRange
  setRange: (value: LogsRange) => void
  singleDate: string
  setSingleDate: (value: string) => void
  month: string
  setMonth: (value: string) => void
  start: string
  setStart: (value: string) => void
  end: string
  setEnd: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  logs: AttendanceLogEntry[]
  isLoading: boolean
  isError: boolean
  error: unknown
}

function LogsPanel(props: LogsPanelProps) {
  const {
    range,
    setRange,
    singleDate,
    setSingleDate,
    month,
    setMonth,
    start,
    setStart,
    end,
    setEnd,
    statusFilter,
    setStatusFilter,
    logs,
    isLoading,
    isError,
    error,
  } = props

  const subTabs: { id: LogsRange; label: string }[] = [
    { id: "single", label: "Single" },
    { id: "month", label: "Month" },
    { id: "range", label: "Range" },
  ]

  const logsArray = logs ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={range === tab.id ? "default" : "outline"}
            onClick={() => setRange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="adm-card space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          {range === "single" ? (
            <Input type="date" value={singleDate} onChange={(event) => setSingleDate(event.target.value)} />
          ) : range === "month" ? (
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} max={end || todayIsoDate()} />
              <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} min={start} max={todayIsoDate()} />
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="">All Log Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSED">Processed</option>
            <option value="FAILED">Failed</option>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load logs</AlertTitle>
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        ) : logsArray.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium">No attendance logs found</p>
            <p className="mt-1 text-sm text-muted-foreground">No log entries match the chosen filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsArray.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateLabel(log.date)}</TableCell>
                  <TableCell className="font-medium">{log.studentName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.batchName || log.batchId || "-"}</TableCell>
                  <TableCell><Badge variant="secondary">{log.source}</Badge></TableCell>
                  <TableCell className="text-sm">{log.actionType}</TableCell>
                  <TableCell className="text-sm">{log.updatedBy || "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm">{log.note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
