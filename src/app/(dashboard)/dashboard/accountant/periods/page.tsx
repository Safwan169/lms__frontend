"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Lock, LockOpen, Plus, RefreshCcw, Unlock } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, formatDate, formatDateOnly, monthNow, periodStatusVariant } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type PeriodRow = {
  id: string
  period_key: string
  start_date?: string
  end_date?: string
  status?: "OPEN" | "CLOSED" | "LOCKED"
  notes?: string | null
  opened_at?: string
  closed_at?: string | null
  locked_at?: string | null
}

const STATUS_OPTIONS = ["all", "OPEN", "CLOSED", "LOCKED"]

export default function AccountantPeriodsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ period_key: monthNow(), start_date: "", end_date: "", notes: "" })

  const periodsQuery = useQuery({
    queryKey: ["accounting", "periods", statusFilter],
    queryFn: () => accountingApi.listPeriods({ status: statusFilter === "all" ? undefined : statusFilter }),
  })

  const openMutation = useMutation({
    mutationFn: () => {
      if (!form.period_key.trim()) throw new Error("Period key is required")
      return accountingApi.openPeriod({
        period_key: form.period_key.trim(),
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        notes: form.notes.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Period opened")
      setOpenDialog(false)
      setForm({ period_key: monthNow(), start_date: "", end_date: "", notes: "" })
      queryClient.invalidateQueries({ queryKey: ["accounting", "periods"] })
    },
    onError: (error: any) => toast.error(error?.message || "Open failed"),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => accountingApi.closePeriod({ period_id: id }),
    onSuccess: () => {
      toast.success("Period closed")
      queryClient.invalidateQueries({ queryKey: ["accounting", "periods"] })
    },
    onError: (error: any) => toast.error(error?.message || "Close failed"),
  })

  const lockMutation = useMutation({
    mutationFn: (id: string) => accountingApi.lockPeriod({ period_id: id }),
    onSuccess: () => {
      toast.success("Period locked")
      queryClient.invalidateQueries({ queryKey: ["accounting", "periods"] })
    },
    onError: (error: any) => toast.error(error?.message || "Lock failed"),
  })

  const reopenMutation = useMutation({
    mutationFn: (id: string) => accountingApi.reopenPeriod({ period_id: id }),
    onSuccess: () => {
      toast.success("Period reopened")
      queryClient.invalidateQueries({ queryKey: ["accounting", "periods"] })
    },
    onError: (error: any) => toast.error(error?.message || "Reopen failed"),
  })

  const items = useMemo(() => asList<PeriodRow>(periodsQuery.data as any), [periodsQuery.data])

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Periods</h1>
          <p className="text-sm text-muted-foreground">Open monthly periods, then close & lock once books are reconciled.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenDialog(true)}><Plus className="mr-2 size-4" /> Open Period</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting", "periods"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>All Periods</CardTitle>
            <Select className="w-44" value={statusFilter} onValueChange={setStatusFilter}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Locked</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No periods yet.</TableCell></TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.period_key}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateOnly(row.start_date)} → {formatDateOnly(row.end_date)}
                      </TableCell>
                      <TableCell><Badge variant={periodStatusVariant(row.status ?? "")}>{row.status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDate(row.opened_at)}</TableCell>
                      <TableCell className="text-xs">{formatDate(row.closed_at)}</TableCell>
                      <TableCell className="text-xs">{formatDate(row.locked_at)}</TableCell>
                      <TableCell className="max-w-60 truncate text-muted-foreground">{row.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {row.status === "OPEN" ? (
                            <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(row.id)}>
                              <Lock className="mr-1 size-3" /> Close
                            </Button>
                          ) : null}
                          {row.status === "CLOSED" ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => lockMutation.mutate(row.id)}>
                                <Lock className="mr-1 size-3" /> Lock
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => reopenMutation.mutate(row.id)}>
                                <LockOpen className="mr-1 size-3" /> Reopen
                              </Button>
                            </>
                          ) : null}
                          {row.status === "LOCKED" ? (
                            <Button size="sm" variant="outline" onClick={() => reopenMutation.mutate(row.id)}>
                              <Unlock className="mr-1 size-3" /> Reopen
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open Financial Period</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium">Period Key (YYYY-MM) *</p>
              <Input type="month" value={form.period_key} onChange={(e) => setForm((f) => ({ ...f, period_key: e.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium">Start Date</p>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} placeholder="auto from period" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">End Date</p>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} placeholder="auto from period" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Notes</p>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Dates are derived from the period key if left empty.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button disabled={openMutation.isPending} onClick={() => openMutation.mutate()}>
              {openMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
