"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Loader2, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, downloadBlob, formatDate, formatMoney, ledgerStatusVariant, monthNow } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type LedgerRow = {
  id: string
  ledger_number?: string
  entry_date?: string
  description?: string
  source_type?: string
  category_id?: string | null
  category?: { id: string; name: string } | null
  total_debit?: string | number
  total_credit?: string | number
  status?: string
  reference_no?: string | null
}

type CategoryRow = { id: string; name: string; type?: string; is_active?: boolean }

const STATUS_OPTIONS = ["all", "DRAFT", "POSTED", "REVERSED", "ARCHIVED"]
const SOURCE_OPTIONS = ["all", "MANUAL", "PAYMENT_BILLING", "PAYROLL", "BALANCE_ADJUSTMENT", "RECONCILIATION", "REVERSAL", "SYSTEM"]

const EMPTY_CREATE = {
  description: "",
  reference_no: "",
  category_id: "",
  total_debit: "",
  total_credit: "",
  status: "POSTED" as "DRAFT" | "POSTED",
  entry_date: "",
}

export default function AccountantLedgerPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState("all")
  const [source, setSource] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)

  const [reverseTarget, setReverseTarget] = useState<LedgerRow | null>(null)
  const [reverseReason, setReverseReason] = useState("")

  const ledgerQuery = useQuery({
    queryKey: ["accounting", "ledger", { month, status, source, search, page }],
    queryFn: () =>
      accountingApi.listLedger({
        page,
        limit,
        status: status === "all" ? undefined : status,
        source_type: source === "all" ? undefined : source,
        search: search || undefined,
        from: month ? `${month}-01T00:00:00.000Z` : undefined,
        to: month ? `${nextMonthIso(month)}T00:00:00.000Z` : undefined,
      }),
  })

  const categoriesQuery = useQuery({
    queryKey: ["accounting", "categories", { is_active: true }],
    queryFn: () => accountingApi.listCategories({ is_active: true }),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const debit = Number(createForm.total_debit || 0)
      const credit = Number(createForm.total_credit || 0)
      if (!createForm.description.trim()) throw new Error("Description is required")
      if (debit <= 0 && credit <= 0) throw new Error("Either debit or credit must be > 0")
      if (debit > 0 && credit > 0) throw new Error("Use only one of debit or credit, not both")
      return accountingApi.createManualLedger({
        description: createForm.description.trim(),
        reference_no: createForm.reference_no.trim() || undefined,
        category_id: createForm.category_id || undefined,
        status: createForm.status,
        total_debit: debit,
        total_credit: credit,
        entry_date: createForm.entry_date || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Manual ledger entry created")
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to create ledger entry"),
  })

  const reverseMutation = useMutation({
    mutationFn: (ledgerId: string) => accountingApi.reverseLedger(ledgerId, { reason: reverseReason || undefined }),
    onSuccess: () => {
      toast.success("Ledger entry reversed")
      setReverseTarget(null)
      setReverseReason("")
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Reversal failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (ledgerId: string) => accountingApi.deleteLedger(ledgerId),
    onSuccess: () => {
      toast.success("Draft ledger deleted")
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Delete failed"),
  })

  async function exportCsv() {
    try {
      const result: any = await accountingApi.exportLedger({
        status: status === "all" ? undefined : status,
        source_type: source === "all" ? undefined : source,
        search: search || undefined,
        from: month ? `${month}-01T00:00:00.000Z` : undefined,
        to: month ? `${nextMonthIso(month)}T00:00:00.000Z` : undefined,
      })
      const csv = result?.csv ?? ""
      const filename = result?.file_name ?? `ledger-${Date.now()}.csv`
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      downloadBlob(blob, filename)
      toast.success("Ledger CSV downloaded")
    } catch (error: any) {
      toast.error(error?.message || "Export failed")
    }
  }

  const items = useMemo(() => asList<LedgerRow>(ledgerQuery.data as any), [ledgerQuery.data])
  const categories = useMemo(() => asList<CategoryRow>(categoriesQuery.data as any), [categoriesQuery.data])
  const meta = (ledgerQuery.data as any)?.meta ?? {}

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ledger</h1>
          <p className="text-sm text-muted-foreground">All accounting journal entries — manual + system-generated, posted + draft.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 size-4" /> Manual Entry</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 size-4" /> Export CSV</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] })}><RefreshCcw className="mr-2 size-4" /> Refresh</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Month</p>
            <Input type="month" value={month} onChange={(e) => { setPage(1); setMonth(e.target.value) }} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v) }}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Source</p>
            <Select value={source} onValueChange={(v) => { setPage(1); setSource(v) }}>
              {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">Search description / reference</p>
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Search…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ledger #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerQuery.isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">No entries found.</TableCell></TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.entry_date)}</TableCell>
                      <TableCell className="text-xs">{row.ledger_number ?? "—"}</TableCell>
                      <TableCell className="max-w-72 truncate">{row.description ?? "—"}</TableCell>
                      <TableCell>{row.category?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="muted">{row.source_type ?? "—"}</Badge></TableCell>
                      <TableCell className="text-red-600">{Number(row.total_debit ?? 0) > 0 ? `BDT ${formatMoney(row.total_debit)}` : "—"}</TableCell>
                      <TableCell className="text-emerald-600">{Number(row.total_credit ?? 0) > 0 ? `BDT ${formatMoney(row.total_credit)}` : "—"}</TableCell>
                      <TableCell><Badge variant={ledgerStatusVariant(row.status ?? "")}>{row.status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {row.status === "POSTED" ? (
                            <Button size="sm" variant="outline" title="Reverse this entry" onClick={() => setReverseTarget(row)}>
                              <RotateCcw className="size-3" />
                            </Button>
                          ) : null}
                          {row.status === "DRAFT" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Delete draft"
                              onClick={() => {
                                if (confirm("Delete this draft ledger entry?")) deleteMutation.mutate(row.id)
                              }}
                            >
                              <Trash2 className="size-3" />
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

          {meta.total_pages && meta.total_pages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Page {meta.page ?? page} of {meta.total_pages} · {meta.total ?? items.length} entries</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (meta.total_pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Create Dialog ────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Manual Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium">Description *</p>
              <Textarea
                rows={2}
                placeholder="e.g. Rent payment for May 2026"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium">Reference No.</p>
                <Input
                  placeholder="Cheque # / voucher ID"
                  value={createForm.reference_no}
                  onChange={(e) => setCreateForm((f) => ({ ...f, reference_no: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Entry Date</p>
                <Input
                  type="datetime-local"
                  value={createForm.entry_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entry_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium">Category</p>
                <Select
                  value={createForm.category_id}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, category_id: v }))}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.type ? ` (${c.type})` : ""}</option>
                  ))}
                </Select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Status</p>
                <Select
                  value={createForm.status}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as "DRAFT" | "POSTED" }))}
                >
                  <option value="POSTED">POSTED (final)</option>
                  <option value="DRAFT">DRAFT (editable)</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium">Debit (outflow / expense)</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={createForm.total_debit}
                  onChange={(e) => setCreateForm((f) => ({ ...f, total_debit: e.target.value, total_credit: e.target.value ? "" : f.total_credit }))}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Credit (inflow / revenue)</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={createForm.total_credit}
                  onChange={(e) => setCreateForm((f) => ({ ...f, total_credit: e.target.value, total_debit: e.target.value ? "" : f.total_debit }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Use either debit OR credit, not both.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reverse Dialog ───────────────────────────────────────────────── */}
      <Dialog open={Boolean(reverseTarget)} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reverse Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Creates a new reversal entry that swaps debit/credit of <span className="font-medium">{reverseTarget?.ledger_number}</span> and marks the original as REVERSED.
            </p>
            <div>
              <p className="mb-1 text-xs font-medium">Reason</p>
              <Textarea
                rows={3}
                placeholder="Why is this being reversed?"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={reverseMutation.isPending}
              onClick={() => reverseTarget && reverseMutation.mutate(reverseTarget.id)}
            >
              {reverseMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function nextMonthIso(month: string) {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return ""
  const next = new Date(Date.UTC(y, m, 1))
  return next.toISOString().slice(0, 10)
}
