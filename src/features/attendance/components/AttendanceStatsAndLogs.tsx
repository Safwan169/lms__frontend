"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, Eye, Loader2, RefreshCcw } from "lucide-react"
import toast from "react-hot-toast"

import { getAttendanceLogs, getAttendanceLogDetail, getAttendanceStats } from "@/features/attendance/api"
import type { AttendanceLogEntry, AttendanceStats } from "@/features/attendance/types"
import { formatDateLabel, getErrorMessage, normalizeRole } from "@/features/attendance/utils"
import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { cn } from "@/lib/utils"

function statSum(stats: AttendanceStats | undefined, type: "student" | "teacher", status: string) {
  if (!stats) return 0
  const entry = stats[type].breakdown.find((b) => b.status === status)
  return entry?._count ?? 0
}

function logStatusVariant(status: string) {
  if (status === "PROCESSED") return "default"
  if (status === "FAILED") return "destructive"
  return "muted"
}

export default function AttendanceStatsAndLogs() {
  const { user } = useAuth()
  const role = normalizeRole(user)
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"

  // Stats filters
  const [statsBatchId, setStatsBatchId] = useState("")
  const [statsStartDate, setStatsStartDate] = useState("")
  const [statsEndDate, setStatsEndDate] = useState("")
  const [appliedStatsParams, setAppliedStatsParams] = useState<{
    batch_id?: string; start_date?: string; end_date?: string
  }>({})

  // Logs filters
  const [logsStatus, setLogsStatus] = useState("")
  const [logsDeviceSerial, setLogsDeviceSerial] = useState("")
  const [appliedLogsParams, setAppliedLogsParams] = useState<{
    status?: string; deviceSerial?: string
  }>({})

  // Log detail dialog
  const [detailLogId, setDetailLogId] = useState<string | null>(null)

  const statsQuery = useQuery({
    queryKey: ["attendance-stats", appliedStatsParams],
    enabled: isAdmin,
    queryFn: () => getAttendanceStats(appliedStatsParams),
  })

  const logsQuery = useQuery({
    queryKey: ["attendance-logs", appliedLogsParams],
    enabled: isAdmin,
    queryFn: () => getAttendanceLogs(appliedLogsParams),
  })

  const detailQuery = useQuery({
    queryKey: ["attendance-log-detail", detailLogId],
    enabled: !!detailLogId,
    queryFn: () => getAttendanceLogDetail(detailLogId!),
  })

  if (!isAdmin) {
    return (
      <div className="adm-root">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>Attendance stats and logs are restricted to admin roles.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const stats = statsQuery.data

  return (
    <div className="adm-root space-y-8 pb-24">
      {/* ─── STATS SECTION ─────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <h1>Attendance Stats</h1>
            <p>Breakdown of student and teacher attendance counts by status.</p>
          </div>
          <div className="adm-topbar-right">
            <Button variant="outline" onClick={() => statsQuery.refetch()}>
              <RefreshCcw className="mr-2 size-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats filters */}
        <div className="adm-card">
          <div className="grid gap-4 md:grid-cols-[1fr_160px_160px_auto]">
            <Input
              placeholder="Batch ID (optional)"
              value={statsBatchId}
              onChange={(e) => setStatsBatchId(e.target.value)}
            />
            <Input
              type="date"
              value={statsStartDate}
              onChange={(e) => setStatsStartDate(e.target.value)}
            />
            <Input
              type="date"
              value={statsEndDate}
              onChange={(e) => setStatsEndDate(e.target.value)}
            />
            <Button
              onClick={() => setAppliedStatsParams({
                batch_id: statsBatchId || undefined,
                start_date: statsStartDate || undefined,
                end_date: statsEndDate || undefined,
              })}
            >
              Apply
            </Button>
          </div>
        </div>

        {statsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : statsQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load stats</AlertTitle>
            <AlertDescription>{getErrorMessage(statsQuery.error)}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student Attendance</p>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "Total", value: stats?.student.total ?? 0, color: "text-slate-700" },
                  { label: "Present", value: statSum(stats, "student", "PRESENT"), color: "text-emerald-700" },
                  { label: "Absent", value: statSum(stats, "student", "ABSENT"), color: "text-rose-700" },
                  { label: "Late", value: statSum(stats, "student", "LATE"), color: "text-amber-700" },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <CardContent className="space-y-1 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className={cn("text-2xl font-semibold", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher Attendance</p>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "Total", value: stats?.teacher.total ?? 0, color: "text-slate-700" },
                  { label: "Present", value: statSum(stats, "teacher", "PRESENT"), color: "text-emerald-700" },
                  { label: "Absent", value: statSum(stats, "teacher", "ABSENT"), color: "text-rose-700" },
                  { label: "Late", value: statSum(stats, "teacher", "LATE"), color: "text-amber-700" },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <CardContent className="space-y-1 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className={cn("text-2xl font-semibold", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ─── LOGS SECTION ──────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <h2 className="text-xl font-semibold">Machine Attendance Logs</h2>
            <p className="text-sm text-muted-foreground">Audit trail of all biometric device imports.</p>
          </div>
          <div className="adm-topbar-right">
            <Button variant="outline" onClick={() => logsQuery.refetch()}>
              <RefreshCcw className="mr-2 size-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Logs filters */}
        <div className="adm-card">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <Input
              placeholder="Device serial (optional)"
              value={logsDeviceSerial}
              onChange={(e) => setLogsDeviceSerial(e.target.value)}
            />
            <Select
              value={logsStatus}
              onValueChange={setLogsStatus}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
            </Select>
            <Button
              onClick={() => setAppliedLogsParams({
                status: logsStatus || undefined,
                deviceSerial: logsDeviceSerial || undefined,
              })}
            >
              Apply
            </Button>
          </div>
        </div>

        <div className="adm-card">
          {logsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : logsQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load logs</AlertTitle>
              <AlertDescription>{getErrorMessage(logsQuery.error)}</AlertDescription>
            </Alert>
          ) : (logsQuery.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
              <p className="font-medium">No machine attendance logs found</p>
              <p className="mt-1 text-sm text-muted-foreground">Logs appear here after machine imports are processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logsQuery.data ?? []).map((log: AttendanceLogEntry) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateLabel(log.date)}</TableCell>
                    <TableCell className="font-medium">{log.studentName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.batchName || log.batchId || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={logStatusVariant(log.source)}>{log.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.source}</TableCell>
                    <TableCell className="text-sm">{log.actionType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{log.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailLogId(log.id)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* Log Detail Dialog */}
      <Dialog open={!!detailLogId} onOpenChange={(open) => { if (!open) setDetailLogId(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Detail</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detailQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load detail</AlertTitle>
              <AlertDescription>{getErrorMessage(detailQuery.error)}</AlertDescription>
            </Alert>
          ) : detailQuery.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Log ID", value: detailQuery.data.id },
                  { label: "Status", value: detailQuery.data.status },
                  { label: "Device Serial", value: detailQuery.data.deviceSerial ?? "-" },
                  { label: "Parsed", value: String(detailQuery.data.parsedCount) },
                  { label: "Processed", value: String(detailQuery.data.processedCount) },
                  { label: "Failed", value: String(detailQuery.data.failedCount) },
                  { label: "Created", value: formatDateLabel(detailQuery.data.createdAt) },
                  { label: "Processed At", value: detailQuery.data.processedAt ? formatDateLabel(detailQuery.data.processedAt) : "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
              {detailQuery.data.errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{detailQuery.data.errorMessage}</AlertDescription>
                </Alert>
              ) : null}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raw Data</p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                  {detailQuery.data.rawData}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
