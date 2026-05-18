"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpCircle, Loader2, RefreshCcw, Search } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList, formatDate, formatMoney, monthNow } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type RevenueRow = {
  id: string
  amount?: string | number
  status?: string
  source_type?: string
  source_id?: string | null
  received_at?: string
  payment_method?: string | null
  transaction_ref?: string | null
  note?: string | null
  category?: { id: string; name: string; type?: string } | null
  ledger?: { id: string; ledger_number: string; status: string } | null
}

const STATUS_OPTIONS = ["all", "POSTED", "REVERSED"] as const
const SOURCE_OPTIONS = [
  "all",
  "MANUAL",
  "PAYMENT_BILLING",
  "PAYROLL",
  "BALANCE_ADJUSTMENT",
  "RECONCILIATION",
  "REVERSAL",
  "SYSTEM",
] as const

export default function AccountantRevenuePage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState<string>("all")
  const [source, setSource] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  const revenueQuery = useQuery({
    queryKey: ["accounting", "revenue", { status, source, search, page, month }],
    queryFn: () =>
      accountingApi.listRevenue({
        page,
        limit,
        status: status === "all" ? undefined : status,
        source_type: source === "all" ? undefined : source,
        search: search || undefined,
        // Derive from/to from month filter
        from: month ? `${month}-01` : undefined,
        to: month ? nextMonthIso(month) : undefined,
      }),
  })

  const syncMutation = useMutation({
    mutationFn: () => accountingApi.syncRevenuePayments({ month, payment_status: "COMPLETED" }),
    onSuccess: (result: any) => {
      const synced = result?.synced_count ?? 0
      const skipped = result?.skipped_count ?? 0
      toast.success(`Revenue sync — ${synced} synced, ${skipped} skipped`)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Sync failed"),
  })

  const items = useMemo(() => asList<RevenueRow>(revenueQuery.data as any), [revenueQuery.data])
  const pagination = (revenueQuery.data as any)?.pagination ?? {}

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Revenue</h1>
          <p className="text-sm text-muted-foreground">All posted revenue entries from billing, payroll, manual, and other sources.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !month}>
            {syncMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowUpCircle className="mr-2 size-4" />}
            Sync Payments → Revenue
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting", "revenue"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Month</p>
            <Input type="month" value={month} onChange={(e) => { setPage(1); setMonth(e.target.value) }} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v) }}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Source</p>
            <Select value={source} onValueChange={(v) => { setPage(1); setSource(v) }}>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">Search (txn ref / note / source ID)</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                placeholder="Search…"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueQuery.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No revenue entries match the filters.</TableCell></TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.received_at)}</TableCell>
                      <TableCell><Badge variant="muted">{row.source_type ?? "—"}</Badge></TableCell>
                      <TableCell>{row.category?.name ?? "—"}</TableCell>
                      <TableCell className="font-medium text-emerald-600">BDT {formatMoney(row.amount)}</TableCell>
                      <TableCell>{row.payment_method ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.ledger?.ledger_number ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "POSTED" ? "default" : "destructive"}>{row.status ?? "—"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.pages && pagination.pages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {pagination.page ?? page} of {pagination.pages} · {pagination.total ?? items.length} entries
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (pagination.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function nextMonthIso(month: string) {
  // month is YYYY-MM
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return undefined
  const next = new Date(Date.UTC(y, m, 1))
  return next.toISOString().slice(0, 10)
}
