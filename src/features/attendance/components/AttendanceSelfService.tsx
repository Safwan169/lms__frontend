"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { AlertCircle, Loader2, MessageSquare, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { getMyAttendanceDateStatusList, getMyAttendanceSummary, sendAttendanceSms } from "@/features/attendance/api"
import { formatDateLabel, formatTimeLabel, getErrorMessage, normalizeRole, sourceVariant, statusVariant, todayIsoDate } from "@/features/attendance/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

export default function AttendanceSelfService() {
  const { user } = useAuth()
  const role = normalizeRole(user)
  const isStudent = role === "student"
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7))

  const summaryQuery = useQuery({
    queryKey: ["attendance-my-summary"],
    enabled: isStudent,
    queryFn: getMyAttendanceSummary,
  })

  const recordsQuery = useQuery({
    queryKey: ["attendance-my-records", month],
    enabled: isStudent,
    queryFn: () => {
      const [year, monthValue] = month.split("-").map(Number)
      return getMyAttendanceDateStatusList({ month: monthValue, year })
    },
  })

  const smsMutation = useMutation({
    mutationFn: () => sendAttendanceSms({ date: todayIsoDate() }),
    onSuccess: (result) => {
      if (result.available) {
        toast.success("SMS trigger sent")
        return
      }
      toast(result.message)
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  if (!isStudent) {
    return (
      <div className="adm-root space-y-5">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Teacher management access</AlertTitle>
          <AlertDescription>
            Your role is routed to the attendance workspace for batch management. Open{" "}
            <Link href="/dashboard/attendance" className="font-medium underline underline-offset-4">
              Attendance Management
            </Link>{" "}
            to work with assigned batches.
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
          <p>Review your monthly summary and daily attendance records.</p>
        </div>
        <div className="adm-topbar-right">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[180px]" />
          <Button variant="outline" onClick={() => smsMutation.mutate()} disabled={smsMutation.isPending}>
            {smsMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquare className="mr-2 size-4" />}
            Send SMS
          </Button>
        </div>
      </div>

      {summaryQuery.isError || recordsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Attendance data is unavailable</AlertTitle>
          <AlertDescription>
            {getErrorMessage(summaryQuery.error) || getErrorMessage(recordsQuery.error) || "Your attendance endpoints did not return data."}
          </AlertDescription>
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

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Attendance Records</span>
        </div>
        {recordsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (recordsQuery.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium">No attendance records found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different month filter.</p>
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
              {(recordsQuery.data ?? []).map((record) => (
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
