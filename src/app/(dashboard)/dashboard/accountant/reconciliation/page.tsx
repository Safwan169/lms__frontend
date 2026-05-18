"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, PlayCircle, RefreshCcw } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, formatDate, formatMoney, monthNow, reconStatusVariant } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type ReconRow = {
  id: string
  period_key?: string | null
  status?: string
  mismatch_count?: number
  summary?: {
    ledger_debit?: string | number
    ledger_credit?: string | number
    revenue_total?: string | number
    expense_total?: string | number
    mismatches?: Array<{ type?: string; difference?: string | number }>
  }
  notes?: string | null
  run_at?: string
  resolved_at?: string | null
}

export default function AccountantReconciliationPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [runNotes, setRunNotes] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [resolveTarget, setResolveTarget] = useState<ReconRow | null>(null)
  const [resolveNotes, setResolveNotes] = useState("")

  const listQuery = useQuery({
    queryKey: ["accounting", "recon", { statusFilter, page }],
    queryFn: () =>
      accountingApi.listReconciliations({
        page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  })

  const runMutation = useMutation({
    mutationFn: () => accountingApi.runReconciliation({ period_key: month, notes: runNotes || undefined }),
    onSuccess: (result: any) => {
      const status = String(result?.status ?? "").toUpperCase()
      const mismatches = result?.mismatch_count ?? 0
      toast.success(`Reconciliation ${status}${mismatches ? ` — ${mismatches} mismatches` : ""}`)
      setRunNotes("")
      queryClient.invalidateQueries({ queryKey: ["accounting", "recon"] })
    },
    onError: (error: any) => toast.error(error?.message || "Reconciliation failed"),
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => accountingApi.resolveReconciliation(id, { notes: resolveNotes || undefined }),
    onSuccess: () => {
      toast.success("Reconciliation resolved")
      setResolveTarget(null)
      setResolveNotes("")
      queryClient.invalidateQueries({ queryKey: ["accounting", "recon"] })
    },
    onError: (error: any) => toast.error(error?.message || "Resolve failed"),
  })

  const items = useMemo(() => asList<ReconRow>(listQuery.data as any), [listQuery.data])
  const pagination = (listQuery.data as any)?.pagination ?? {}

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Detect ledger ↔ revenue/expense mismatches and unsynced payments/payrolls.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting", "recon"] })}>
          <RefreshCcw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Run a Check</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Period</p>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">Notes (optional)</p>
            <Input value={runNotes} onChange={(e) => setRunNotes(e.target.value)} placeholder="e.g. End-of-month close check" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlayCircle className="mr-2 size-4" />}
              Run Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Reconciliation Runs</CardTitle>
            <Select className="w-44" value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v) }}>
              <option value="all">All status</option>
              <option value="PENDING">PENDING</option>
              <option value="MATCHED">MATCHED</option>
              <option value="MISMATCH">MISMATCH</option>
              <option value="RESOLVED">RESOLVED</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run At</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mismatches</TableHead>
                  <TableHead>Totals</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No reconciliation runs yet.</TableCell></TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.run_at)}</TableCell>
                      <TableCell>{row.period_key ?? "All-time"}</TableCell>
                      <TableCell><Badge variant={reconStatusVariant(row.status ?? "")}>{row.status ?? "—"}</Badge></TableCell>
                      <TableCell>{row.mismatch_count ?? 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Credit: BDT {formatMoney(row.summary?.ledger_credit)} · Rev: BDT {formatMoney(row.summary?.revenue_total)}
                        <br />
                        Debit: BDT {formatMoney(row.summary?.ledger_debit)} · Exp: BDT {formatMoney(row.summary?.expense_total)}
                      </TableCell>
                      <TableCell className="max-w-60 truncate text-muted-foreground">{row.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.status === "MISMATCH" ? (
                          <Button size="sm" variant="outline" onClick={() => setResolveTarget(row)}>
                            <CheckCircle2 className="mr-1 size-3" /> Resolve
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.pages && pagination.pages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Page {pagination.page ?? page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (pagination.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(resolveTarget)} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Reconciliation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Marking <span className="font-medium">{resolveTarget?.period_key ?? "all-time"}</span> reconciliation as resolved.
              Mismatches: {resolveTarget?.mismatch_count ?? 0}.
            </p>
            {resolveTarget?.summary?.mismatches?.length ? (
              <div className="rounded-md border p-2 text-xs">
                {resolveTarget.summary.mismatches.map((mis, idx) => (
                  <p key={idx} className="text-muted-foreground">
                    {mis.type} — diff BDT {formatMoney(mis.difference)}
                  </p>
                ))}
              </div>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-medium">Resolution note</p>
              <Textarea rows={3} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="How was this fixed?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button disabled={resolveMutation.isPending} onClick={() => resolveTarget && resolveMutation.mutate(resolveTarget.id)}>
              {resolveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
