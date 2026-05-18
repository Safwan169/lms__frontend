"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import { BATCHES, CLASSES, DUMMY_STUDENTS, Student, filterStudents } from "../_data"

type Step = 1 | 2 | 3

export default function BulkPromotionPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [fromClassId, setFromClassId] = useState("")
  const [fromBatchId, setFromBatchId] = useState("")
  const [toClassId, setToClassId] = useState("")
  const [toBatchId, setToBatchId] = useState("")
  const [academicYear, setAcademicYear] = useState("2026-2027")
  const [note, setNote] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const sourceBatches = BATCHES.filter((item) => item.classId === fromClassId)
  const destinationBatches = BATCHES.filter((item) => item.classId === toClassId)

  const previewStudents = useMemo(() => {
    if (!fromClassId || !fromBatchId) return []
    const result = filterStudents(
      {
        classId: fromClassId,
        batchId: fromBatchId,
        status: "all",
        page: 1,
        limit: 999,
      },
      DUMMY_STUDENTS
    )
    return result.items
  }, [fromClassId, fromBatchId])

  const selectedStudents = useMemo(() => {
    const map = new Map(previewStudents.map((item) => [item.id, item]))
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as Student[]
  }, [previewStudents, selectedIds])

  const onPickSourceBatch = (value: string) => {
    setFromBatchId(value)
    const sourceRows = DUMMY_STUDENTS.filter((item) => item.classId === fromClassId && item.batchId === value)
    const preChecked = sourceRows.filter((item) => item.status === "Active").map((item) => item.id)
    setSelectedIds(preChecked)
  }

  const next = () => {
    if (step === 1) {
      if (!fromClassId || !fromBatchId) {
        toast.error("Select source class and batch")
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!toClassId || !toBatchId) {
        toast.error("Select destination class and batch")
        return
      }
      setStep(3)
    }
  }

  const back = () => setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)))

  const submit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one student")
      return
    }

    setSubmitting(true)
    try {
      // API implementation intentionally commented for frontend-only flow.
      // await fetch("/admin/students/bulk-promote", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     studentIds: selectedIds,
      //     to_class_id: toClassId,
      //     to_batch_id: toBatchId,
      //     academic_year: academicYear,
      //     note,
      //   }),
      // })

      await new Promise((resolve) => setTimeout(resolve, 700))
      toast.success(`Promoted ${selectedIds.length} students successfully`)
      router.push("/dashboard/students")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="adm-root space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Batch Promotion</h1>
        <p className="text-sm text-muted-foreground">Move an entire batch of students to a new class/batch</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>1 Select Source</span>
          <span className="text-muted-foreground">→</span>
          <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>2 Select Destination</span>
          <span className="text-muted-foreground">→</span>
          <span className={`rounded-full px-3 py-1 ${step === 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>3 Review & Confirm</span>
        </CardContent>
      </Card>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Source Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={fromClassId} onValueChange={(value) => { setFromClassId(value); setFromBatchId(""); setSelectedIds([]) }}>
                <option value="">Select Class</option>
                {CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>

              <Select value={fromBatchId} disabled={!fromClassId} onValueChange={onPickSourceBatch}>
                <option value="">Select Batch</option>
                {sourceBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{selectedIds.length} students selected</p>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">□</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewStudents.map((student) => {
                    const checked = selectedIds.includes(student.id)
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedIds((prev) => Array.from(new Set([...prev, student.id])))
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== student.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{student.status}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={toClassId} onValueChange={(value) => { setToClassId(value); setToBatchId("") }}>
                <option value="">Promote to Class</option>
                {CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>

              <Select value={toBatchId} disabled={!toClassId} onValueChange={setToBatchId}>
                <option value="">Select Batch</option>
                {destinationBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </div>

            <Input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="Academic year (e.g. 2025-2026)" />
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Promotion note (optional)" />
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Card>
              <CardContent className="space-y-1 p-4 text-sm">
                <p><span className="text-muted-foreground">From:</span> {CLASSES.find((item) => item.id === fromClassId)?.name} / {BATCHES.find((item) => item.id === fromBatchId)?.name}</p>
                <p><span className="text-muted-foreground">To:</span> {CLASSES.find((item) => item.id === toClassId)?.name} / {BATCHES.find((item) => item.id === toBatchId)?.name}</p>
                <p><span className="text-muted-foreground">Students to promote:</span> {selectedStudents.length}</p>
                <p><span className="text-muted-foreground">Excluded:</span> {Math.max(0, previewStudents.length - selectedStudents.length)}</p>
              </CardContent>
            </Card>

            <div className="max-h-56 overflow-y-auto rounded-lg border p-3 text-sm">
              {selectedStudents.map((student) => <p key={student.id}>{student.name} ({student.studentId})</p>)}
            </div>

            <Alert variant="destructive">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action will update class and batch for selected students. This cannot be undone automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>
        {step < 3 ? (
          <Button onClick={next}>Next</Button>
        ) : (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Promote {selectedIds.length} Students
          </Button>
        )}
      </div>
    </div>
  )
}
