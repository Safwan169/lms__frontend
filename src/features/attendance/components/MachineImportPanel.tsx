"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Loader2, Terminal, Upload } from "lucide-react"
import toast from "react-hot-toast"

import { importMachineAttendance } from "@/features/attendance/api"
import type { MachineImportResult } from "@/features/attendance/types"
import { getErrorMessage, normalizeRole } from "@/features/attendance/utils"
import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const EXAMPLE_PAYLOAD = `26,2026-03-29 08:19:39,0
27,2026-03-29 08:22:10,0
OPLOG 28,1,2026-03-29 17:05:00
26,2026-03-29 17:01:55,1`

function ResultCard({ result }: { result: MachineImportResult }) {
  const success = result.student_marked + result.teacher_marked
  const successRate = result.total_records > 0
    ? ((success / result.total_records) * 100).toFixed(0)
    : "0"

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="size-5 text-emerald-600" />
        <span className="font-semibold text-emerald-800">Import Completed</span>
        <Badge variant="default" className="ml-auto bg-emerald-600">{successRate}% success rate</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: "Total Records", value: result.total_records, color: "text-slate-700" },
          { label: "Students Marked", value: result.student_marked, color: "text-emerald-700" },
          { label: "Teachers Marked", value: result.teacher_marked, color: "text-blue-700" },
          { label: "Skipped", value: result.skipped, color: "text-amber-700" },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-white p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MachineImportPanel() {
  const { user } = useAuth()
  const role = normalizeRole(user)
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"

  const [payload, setPayload] = useState("")
  const [lastResult, setLastResult] = useState<MachineImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: () => importMachineAttendance(payload),
    onSuccess: (result) => {
      setLastResult(result)
      toast.success(`Import done: ${result.student_marked} students, ${result.teacher_marked} teachers marked`)
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  })

  if (!isAdmin) {
    return (
      <div className="adm-root">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>Machine import is restricted to admin roles.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="adm-root space-y-5 pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Machine Attendance Import</h1>
          <p>Paste raw biometric device log text to auto-mark student and teacher attendance.</p>
        </div>
      </div>

      {/* Format guide */}
      <div className="adm-card">
        <div className="adm-card-header">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="adm-card-title">Payload Format Guide</span>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Each line represents one machine punch record. Supported formats:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{"{user_id},{datetime},{status}"}</code> — status <code className="text-xs">0</code> = check-in, <code className="text-xs">1</code> = check-out</li>
            <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{"OPLOG {user_id},{status},{datetime}"}</code> — OPLOG lines are treated as check-out</li>
          </ul>
          <p className="text-xs">The system matches <strong>machine_id</strong> to users in your tenant. Students are enrolled automatically into their active batch. Teachers get check-in/check-out times.</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">How it works</p>
            <p className="text-sm font-medium">Paste → Submit → Done</p>
            <p className="text-xs text-muted-foreground">Backend parses each line, matches users by machine_id, marks PRESENT automatically.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Students</p>
            <p className="text-sm font-medium">Auto-enrolled batch</p>
            <p className="text-xs text-muted-foreground">Marked PRESENT in their active ENROLLED batch on the punch date.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Teachers</p>
            <p className="text-sm font-medium">First in / last out</p>
            <p className="text-xs text-muted-foreground">First check-in and latest check-out timestamps are captured as attendance.</p>
          </CardContent>
        </Card>
      </div>

      {/* Payload input */}
      <div className="adm-card space-y-4">
        <div className="adm-card-header">
          <span className="adm-card-title">Raw Machine Log</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPayload(EXAMPLE_PAYLOAD)}
          >
            Load Example
          </Button>
        </div>
        <Textarea
          className="min-h-48 font-mono text-xs"
          placeholder={"Paste raw machine log here…\n\nExample:\n26,2026-03-29 08:19:39,0\n27,2026-03-29 08:22:10,0"}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {payload.trim() ? `${payload.trim().split("\n").filter((l) => l.trim()).length} line(s) ready to import` : "No payload entered"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPayload(""); setLastResult(null) }}>
              Clear
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!payload.trim() || importMutation.isPending}
            >
              {importMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Import
            </Button>
          </div>
        </div>

        {importMutation.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import failed</AlertTitle>
            <AlertDescription>{getErrorMessage(importMutation.error)}</AlertDescription>
          </Alert>
        ) : null}

        {lastResult ? <ResultCard result={lastResult} /> : null}
      </div>
    </div>
  )
}
