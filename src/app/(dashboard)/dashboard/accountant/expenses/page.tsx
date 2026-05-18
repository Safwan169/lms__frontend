"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDownCircle, Loader2, RefreshCcw } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, formatDate, formatMoney, monthNow } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type LedgerRow = {
  id: string
  ledger_number?: string
  entry_date?: string
  description?: string
  source_type?: string
  category?: { name?: string } | null
  total_debit?: string | number
  total_credit?: string | number
  status?: string
}

type ExpenseReport = {
  period?: { month_key?: string; month_label?: string }
  total_expense?: string | number
  expense_count?: number
  by_category?: Array<{ category_id?: string | null; category_name?: string; amount?: string | number }>
  by_source_type?: Array<{ source_type?: string; amount?: string | number }>
}

const SOURCE_OPTIONS = ["all", "PAYROLL", "MANUAL", "BALANCE_ADJUSTMENT", "RECONCILIATION", "SYSTEM"] as const

export default function AccountantExpensesPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [source, setSource] = useState<string>("PAYROLL")
  const [page, setPage] = useState(1)
  const limit = 20

  const [y, m] = month.split("-").map(Number)

  // Report data — total + breakdowns
  const reportQuery = useQuery({
    queryKey: ["accounting", "expense-report", month],
    queryFn: () => accountingApi.getMonthlyExpenses({ year: y, month: m }) as Promise<ExpenseReport>,
    enabled: Boolean(y && m),
  })

  // Ledger entries with debit > 0, filtered by source — represents posted expenses
  const ledgerQuery = useQuery({
    queryKey: ["accounting", "expense-ledger", { month, source, page }],
    queryFn: () =>
      accountingApi.listLedger({
        page,
        limit,
        status: "POSTED",
        source_type: source === "all" ? undefined : source,
        from: month ? `${month}-01T00:00:00.000Z` : undefined,
        to: month ? `${nextMonthIso(month)}T00:00:00.000Z` : undefined,
      }),
  })

  const syncMutation = useMutation({
    mutationFn: () => accountingApi.syncExpensePayrollPayments({ month, status: "PAID" }),
    onSuccess: (result: any) => {
      const synced = result?.synced_count ?? 0
      const skipped = result?.skipped_count ?? 0
      toast.success(`Expense sync — ${synced} synced, ${skipped} skipped`)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Sync failed"),
  })

  const ledgerItems = useMemo(() => asList<LedgerRow>(ledgerQuery.data as any), [ledgerQuery.data])
  const meta = (ledgerQuery.data as any)?.meta ?? {}
  const report = reportQuery.data

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Posted expenses for the selected month, with category/source breakdowns and full ledger detail.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !month}>
            {syncMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowDownCircle className="mr-2 size-4" />}
            Sync Payroll → Expense
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Month</p>
            <Input type="month" value={month} onChange={(e) => { setPage(1); setMonth(e.target.value) }} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Source</p>
            <Select value={source} onValueChange={(v) => { setPage(1); setSource(v) }}>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Report Summary ────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {report?.period?.month_label ?? "Selected Month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">BDT {formatMoney(report?.total_expense)}</p>
            <p className="text-xs text-muted-foreground">{report?.expense_count ?? 0} expense entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {(report?.by_category ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="space-y-1">
                {(report?.by_category ?? []).slice(0, 5).map((row, idx) => (
                  <div key={row.category_id ?? `cat-${idx}`} className="flex items-center justify-between text-sm">
                    <span>{row.category_name ?? "Uncategorised"}</span>
                    <span className="font-medium">BDT {formatMoney(row.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Source</CardTitle>
          </CardHeader>
          <CardContent>
            {(report?.by_source_type ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="space-y-1">
                {(report?.by_source_type ?? []).map((row, idx) => (
                  <div key={row.source_type ?? `src-${idx}`} className="flex items-center justify-between text-sm">
                    <span><Badge variant="muted">{row.source_type ?? "—"}</Badge></span>
                    <span className="font-medium">BDT {formatMoney(row.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Ledger Detail ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Ledger Entries ({source === "all" ? "All sources" : source})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Ledger #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerQuery.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : ledgerItems.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No expense ledger entries match the filters.</TableCell></TableRow>
                ) : (
                  ledgerItems
                    .filter((row) => Number(row.total_debit ?? 0) > 0)
                    .map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.entry_date)}</TableCell>
                        <TableCell className="text-xs">{row.ledger_number ?? "—"}</TableCell>
                        <TableCell className="max-w-72 truncate">{row.description ?? "—"}</TableCell>
                        <TableCell>{row.category?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="muted">{row.source_type ?? "—"}</Badge></TableCell>
                        <TableCell className="font-medium text-red-600">BDT {formatMoney(row.total_debit)}</TableCell>
                        <TableCell><Badge variant="default">{row.status ?? "—"}</Badge></TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta.total_pages && meta.total_pages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {meta.page ?? page} of {meta.total_pages} · {meta.total ?? ledgerItems.length} entries
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (meta.total_pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function nextMonthIso(month: string) {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return ""
  const next = new Date(Date.UTC(y, m, 1))
  return next.toISOString().slice(0, 10)
}
