"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Banknote,
  Calculator,
  ClipboardList,
  FileBarChart,
  Loader2,
  RefreshCcw,
  Wallet,
} from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { formatDate, formatMoney, monthNow } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Snapshot = {
  tenant?: { name?: string }
  as_of?: string
  overview?: SummaryNumbers
  current_month?: SummaryNumbers
  current_year?: SummaryNumbers
  balances?: { summary?: BalanceSummary; accounts?: BalanceAccount[] }
  ledgers?: LedgerCounts
  recent_activity?: ActivityItem[]
}

type SummaryNumbers = {
  total_revenue?: string | number
  total_expense?: string | number
  net_amount?: string | number
  revenue_count?: number
  expense_count?: number
}

type BalanceSummary = {
  cash_total?: string | number
  bank_total?: string | number
  overall_total?: string | number
  account_count?: number
}

type BalanceAccount = {
  id: string
  type?: string
  account_type?: string
  account_name?: string
  current_balance?: string | number
}

type LedgerCounts = {
  draft?: number
  posted?: number
  reversed?: number
  archived?: number
  total?: number
}

type ActivityItem = {
  id: string
  transaction_type?: string
  action?: string
  created_at?: string
}

const QUICK_LINKS = [
  { href: "/dashboard/accountant/revenue", title: "Revenue", icon: ArrowUpCircle, description: "Posted revenue entries from billing & manual sources" },
  { href: "/dashboard/accountant/expenses", title: "Expenses", icon: ArrowDownCircle, description: "Posted expense entries from payroll & manual sources" },
  { href: "/dashboard/accountant/ledger", title: "Ledger", icon: BookOpen, description: "All journal entries with debit/credit detail" },
  { href: "/dashboard/accountant/categories", title: "Categories", icon: ClipboardList, description: "Classify revenue & expense by category" },
  { href: "/dashboard/accountant/balances", title: "Balances", icon: Wallet, description: "Cash & bank account balances + transfers" },
  { href: "/dashboard/accountant/reports", title: "Reports", icon: FileBarChart, description: "P&L, cashflow, trends, downloads" },
  { href: "/dashboard/accountant/reconciliation", title: "Reconciliation", icon: Calculator, description: "Detect mismatches between ledger & sources" },
  { href: "/dashboard/accountant/periods", title: "Periods", icon: Activity, description: "Open / close monthly accounting periods" },
]

export default function AccountantDashboardPage() {
  const queryClient = useQueryClient()
  const [syncMonth, setSyncMonth] = useState(monthNow())

  const dashboardQuery = useQuery({
    queryKey: ["accounting", "dashboard"],
    queryFn: () => accountingApi.getDashboard() as Promise<Snapshot>,
  })

  const data = dashboardQuery.data

  const syncRevenueMutation = useMutation({
    mutationFn: () => accountingApi.syncRevenuePayments({ month: syncMonth, payment_status: "COMPLETED" }),
    onSuccess: (result: any) => {
      const synced = result?.synced_count ?? 0
      const skipped = result?.skipped_count ?? 0
      toast.success(`Revenue sync — ${synced} synced, ${skipped} skipped`)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Revenue sync failed"),
  })

  const syncExpenseMutation = useMutation({
    mutationFn: () => accountingApi.syncExpensePayrollPayments({ month: syncMonth, status: "PAID" }),
    onSuccess: (result: any) => {
      const synced = result?.synced_count ?? 0
      const skipped = result?.skipped_count ?? 0
      toast.success(`Expense sync — ${synced} synced, ${skipped} skipped`)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Expense sync failed"),
  })

  const reconcileMutation = useMutation({
    mutationFn: () => accountingApi.runReconciliation({ period_key: syncMonth, notes: "Dashboard quick reconcile" }),
    onSuccess: (result: any) => {
      const mismatchCount = result?.mismatch_count ?? 0
      const status = String(result?.status ?? "").toUpperCase()
      toast.success(`Reconciliation: ${status}${mismatchCount ? ` — ${mismatchCount} mismatches` : ""}`)
      queryClient.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (error: any) => toast.error(error?.message || "Reconciliation failed"),
  })

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accountant Workspace</h1>
          <p className="text-sm text-muted-foreground">
            {data?.tenant?.name ? `${data.tenant.name} — ` : ""}
            As of {data?.as_of ? formatDate(data.as_of) : "—"}
          </p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting"] })}>
          <RefreshCcw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      {/* ── Sync Control Strip ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sync</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Month</p>
            <Input type="month" value={syncMonth} onChange={(e) => setSyncMonth(e.target.value)} />
          </div>
          <Button
            className="self-end"
            onClick={() => syncRevenueMutation.mutate()}
            disabled={syncRevenueMutation.isPending || !syncMonth}
            title="Push COMPLETED payments → revenue ledger"
          >
            {syncRevenueMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="mr-2 size-4" />
            )}
            Sync Payments → Revenue
          </Button>
          <Button
            className="self-end"
            onClick={() => syncExpenseMutation.mutate()}
            disabled={syncExpenseMutation.isPending || !syncMonth}
            title="Push PAID payrolls → expense ledger"
          >
            {syncExpenseMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ArrowDownCircle className="mr-2 size-4" />
            )}
            Sync Payroll → Expense
          </Button>
          <Button
            className="self-end"
            variant="outline"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending || !syncMonth}
            title="Run a reconciliation check for this month"
          >
            {reconcileMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 size-4" />
            )}
            Reconcile
          </Button>
        </CardContent>
      </Card>

      {/* ── Top KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          title="This Month"
          loading={dashboardQuery.isLoading}
          revenue={data?.current_month?.total_revenue}
          expense={data?.current_month?.total_expense}
          net={data?.current_month?.net_amount}
        />
        <KpiCard
          title="This Year"
          loading={dashboardQuery.isLoading}
          revenue={data?.current_year?.total_revenue}
          expense={data?.current_year?.total_expense}
          net={data?.current_year?.net_amount}
        />
        <KpiCard
          title="All Time"
          loading={dashboardQuery.isLoading}
          revenue={data?.overview?.total_revenue}
          expense={data?.overview?.total_expense}
          net={data?.overview?.net_amount}
        />
      </div>

      {/* ── Balances + Ledger Status ─────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-4" /> Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
              <Stat label="Cash" value={`BDT ${formatMoney(data?.balances?.summary?.cash_total)}`} />
              <Stat label="Bank" value={`BDT ${formatMoney(data?.balances?.summary?.bank_total)}`} />
              <Stat label="Overall" value={`BDT ${formatMoney(data?.balances?.summary?.overall_total)}`} />
            </div>
            <div className="space-y-1">
              {(data?.balances?.accounts ?? []).slice(0, 5).map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{account.account_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{account.type ?? account.account_type ?? "—"}</p>
                  </div>
                  <span>BDT {formatMoney(account.current_balance)}</span>
                </div>
              ))}
              {(data?.balances?.accounts ?? []).length === 0 && !dashboardQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">No balance accounts found.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledger Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Draft" value={data?.ledgers?.draft ?? 0} />
            <Row label="Posted" value={data?.ledgers?.posted ?? 0} />
            <Row label="Reversed" value={data?.ledgers?.reversed ?? 0} />
            <Row label="Archived" value={data?.ledgers?.archived ?? 0} />
            <div className="mt-2 flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm font-medium">
              <span>Total</span>
              <span>{data?.ledgers?.total ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/40"
            >
              <link.icon className="mt-0.5 size-5 text-muted-foreground group-hover:text-foreground" />
              <div>
                <p className="text-sm font-medium">{link.title}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : (data?.recent_activity ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-1">
              {(data?.recent_activity ?? []).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{entry.action ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.transaction_type ?? "SYSTEM"} · {formatDate(entry.created_at)}
                    </p>
                  </div>
                  <Badge variant="muted">{entry.transaction_type ?? "—"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title,
  loading,
  revenue,
  expense,
  net,
}: {
  title: string
  loading: boolean
  revenue?: string | number
  expense?: string | number
  net?: string | number
}) {
  const netNumber = Number(net ?? 0)
  const isProfit = Number.isFinite(netNumber) && netNumber >= 0
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium text-emerald-600">BDT {formatMoney(revenue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expense</span>
              <span className="font-medium text-red-600">BDT {formatMoney(expense)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>Net</span>
              <span className={isProfit ? "text-emerald-700" : "text-red-700"}>BDT {formatMoney(net)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
