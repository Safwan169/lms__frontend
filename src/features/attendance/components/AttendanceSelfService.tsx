"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, RefreshCcw, ShieldCheck } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import {
  getMyAttendanceDateStatusList,
  getMyAttendanceSummary,
} from "@/features/attendance/api"
import type { AttendanceRecord } from "@/features/attendance/types"
import {
  formatDateLabel,
  formatMonthLabel,
  formatTimeLabel,
  getErrorMessage,
  normalizeRole,
  sourceVariant,
  statusVariant,
  todayIsoDate,
} from "@/features/attendance/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { useQueryClient } from "@tanstack/react-query"

type StudentRange = "month" | "range"

export default function AttendanceSelfService() {
  const { user } = useAuth()
  const role = normalizeRole(user)
  const isStudent = role === "student"
  const queryClient = useQueryClient()

  const [range, setRange] = useState<StudentRange>("month")
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7))
  const [start, setStart] = useState(todayIsoDate())
  const [end, setEnd] = useState(todayIsoDate())

  const summaryQuery = useQuery({
    queryKey: ["attendance-my-summary"],
    enabled: isStudent,
    queryFn: getMyAttendanceSummary,
  })

  const monthRecordsQuery = useQuery({
    queryKey: ["attendance-my-records-month", month],
    enabled: isStudent && range === "month",
    queryFn: () => {
      const [year, monthValue] = month.split("-").map(Number)
      return getMyAttendanceDateStatusList({ month: monthValue, year })
    },
  })

  const rangeRecordsQuery = useQuery({
    queryKey: ["attendance-my-records-range", start, end],
    enabled: isStudent && range === "range" && !!start && !!end,
    queryFn: async () => {
      const startDate = new Date(start)
      const endDate = new Date(end)
      if (startDate > endDate) throw new Error("Start date must be on or before end date")
      const months = new Set<string>()
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      while (cursor <= endDate) {
        months.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`)
        cursor.setMonth(cursor.getMonth() + 1)
      }
      const monthList = Array.from(months)
      const all = await Promise.all(
        monthList.map((m) => {
          const [year, monthValue] = m.split("-").map(Number)
          return getMyAttendanceDateStatusList({ month: monthValue, year })
        })
      )
      const merged = all.flat()
      return merged.filter((record) => {
        const d = (record.date || "").slice(0, 10)
        return d >= start && d <= end
      })
    },
  })

  const monthRecordsDesc = useMemo<AttendanceRecord[]>(() => {
    const data = (monthRecordsQuery.data ?? []) as AttendanceRecord[]
    return [...data].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [monthRecordsQuery.data])

  const rangeRecordsDesc = useMemo<AttendanceRecord[]>(() => {
    const data = (rangeRecordsQuery.data ?? []) as AttendanceRecord[]
    return [...data].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [rangeRecordsQuery.data])

  const activeRecords = range === "month" ? monthRecordsDesc : rangeRecordsDesc
  const activeLoading = range === "month" ? monthRecordsQuery.isLoading : rangeRecordsQuery.isLoading
  const activeError = range === "month" ? monthRecordsQuery.isError : rangeRecordsQuery.isError
  const activeErrorObj = range === "month" ? monthRecordsQuery.error : rangeRecordsQuery.error

  const fullRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-my-summary"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-my-records-month"] })
    queryClient.invalidateQueries({ queryKey: ["attendance-my-records-range"] })
  }

  if (!isStudent) {
    return (
      <div className="adm-root space-y-5">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Teacher / Admin access</AlertTitle>
          <AlertDescription>
            Open{" "}
            <Link href="/dashboard/attendance" className="font-medium underline underline-offset-4">
              Attendance Management
            </Link>{" "}
            to manage batch attendance.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="adm-root space-y-5">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>My Attendance</h1>
          <p>Review your batch summary and daily attendance history.</p>
        </div>
        <div className="adm-topbar-right">
          <Button variant="outline" onClick={fullRefresh}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {summaryQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Summary unavailable</AlertTitle>
          <AlertDescription>{getErrorMessage(summaryQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {summaryQuery.isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          (summaryQuery.data ?? []).slice(0, 3).map((item) => (
            <Card key={item.batchId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.batchName || item.batchId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Class:</span> {item.className || "-"}</p>
                <p><span className="text-muted-foreground">Attended:</span> {item.attended}</p>
                <p><span className="text-muted-foreground">Absent:</span> {item.absent}</p>
                <p><span className="text-muted-foreground">Total Classes:</span> {item.totalClasses}</p>
                <p><span className="text-muted-foreground">Attendance %:</span> {item.attendancePercentage}%</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={range === "month" ? "default" : "outline"} onClick={() => setRange("month")}>Month</Button>
        <Button size="sm" variant={range === "range" ? "default" : "outline"} onClick={() => setRange("range")}>Range</Button>
      </div>

      <div className="adm-card space-y-4">
        <div className="adm-card-header flex flex-wrap items-center justify-between gap-3">
          <span className="adm-card-title">Attendance Records (latest first)</span>
          {range === "month" ? (
            <div className="flex items-center gap-3">
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[200px]" />
              <span className="text-sm text-muted-foreground">
                {month ? formatMonthLabel(Number(month.split("-")[0]), Number(month.split("-")[1])) : ""}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                max={end || todayIsoDate()}
                className="w-[180px]"
              />
              <span className="text-sm text-muted-foreground">→</span>
              <Input
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                min={start}
                max={todayIsoDate()}
                className="w-[180px]"
              />
            </div>
          )}
        </div>

        {activeLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : activeError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Records unavailable</AlertTitle>
            <AlertDescription>{getErrorMessage(activeErrorObj)}</AlertDescription>
          </Alert>
        ) : activeRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium">No attendance records found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different month or range.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>First Entry</TableHead>
                <TableHead>Last Exit</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{formatDateLabel(record.date)}</TableCell>
                  <TableCell><Badge variant={statusVariant(record.status)}>{record.status}</Badge></TableCell>
                  <TableCell><Badge variant={sourceVariant(record.source)}>{record.source}</Badge></TableCell>
                  <TableCell>{formatTimeLabel(record.firstEntry)}</TableCell>
                  <TableCell>{formatTimeLabel(record.lastExit)}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{record.note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
