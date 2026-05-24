"use client"

import { useQuery } from "@tanstack/react-query"
import { Banknote, CreditCard, Smartphone, TrendingUp } from "lucide-react"

import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type PaymentMethodSummary = {
  method: string
  total_amount: string
  total_discount: string
  net_amount: string
  count: number
}

type SummaryResponse = {
  summary: PaymentMethodSummary[]
  meta: {
    grand_total: string
    grand_discount: string
    grand_net: string
  }
}

type PaymentStudent = {
  id: string
  name: string
  email: string
  phone: string
}

type Payment = {
  id: string
  amount: string
  discount: string
  net_amount: string
  method: string
  payment_status: string
  transaction_id: string
  paid_at: string | null
  month: string | null
  notes: string | null
  created_at: string
  student: PaymentStudent
  enrollment_id: string
  batch_id: string
  class_id: string
}

type PaymentsResponse = {
  data: Payment[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: unknown) {
  if (!value) return "—"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function findMethod(summary: PaymentMethodSummary[], method: string) {
  return summary.find((s) => s.method === method)
}

function statusBadgeVariant(status: string): "default" | "warning" | "destructive" | "muted" {
  const key = String(status ?? "").toUpperCase()
  if (key === "COMPLETED") return "default"
  if (key === "PENDING") return "warning"
  if (key === "FAILED" || key === "CANCELLED") return "destructive"
  return "muted"
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    CASH: "Cash",
    POS: "Card",
    BANK_TRANSFER: "Bank Transfer",
    BKASH: "bKash",
    NAGAD: "Nagad",
    ROCKET: "Rocket",
    WAIVER: "Waiver",
  }
  return map[method] ?? method
}

export default function AccountingPage() {
  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ["admissions", "payments", "summary"],
    queryFn: async () => {
      const res = await api.get("/admissions/payments/summary")
      return res.data
    },
  })

  const paymentsQuery = useQuery<PaymentsResponse>({
    queryKey: ["admissions", "payments"],
    queryFn: async () => {
      const res = await api.get("/admissions/payments")
      return res.data
    },
  })

  const summary = summaryQuery.data?.summary ?? []
  const meta = summaryQuery.data?.meta
  const payments = paymentsQuery.data?.data ?? []

  const cash = findMethod(summary, "CASH")
  const card = findMethod(summary, "POS")
  const bkash = findMethod(summary, "BKASH")

  return (
    <div className="space-y-6 p-1 md:p-2 adm-root">
      <div className="adm-topbar-left">
        <h1 className="text-2xl font-semibold">Accounting</h1>
        <p className="text-sm text-muted-foreground">Payment summary and transaction history</p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Cash"
          icon={<Banknote className="size-5 text-emerald-500" />}
          amount={cash?.total_amount ?? "0.00"}
          count={cash?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="Card (POS)"
          icon={<CreditCard className="size-5 text-blue-500" />}
          amount={card?.total_amount ?? "0.00"}
          count={card?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="MFS"
          icon={<Smartphone className="size-5 text-pink-500" />}
          amount={bkash?.total_amount ?? "0.00"}
          count={bkash?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="Total Amount"
          icon={<TrendingUp className="size-5 text-violet-500" />}
          amount={meta?.grand_total ?? "0.00"}
          count={payments.length}
          loading={summaryQuery.isLoading}
          highlight
        />
      </div>

      {/* ── Payments List ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Loading transactions…
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{payment.student?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{payment.student?.phone ?? ""}</p>
                      </TableCell>
                      <TableCell className="font-medium">৳ {formatMoney(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{methodLabel(payment.method)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(payment.payment_status)}>
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {payment.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(payment.paid_at ?? payment.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {paymentsQuery.data?.meta && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {payments.length} of {paymentsQuery.data.meta.total} transactions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  icon,
  amount,
  count,
  loading,
  highlight = false,
}: {
  title: string
  icon: React.ReactNode
  amount: string
  count: number
  loading: boolean
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-violet-200 bg-violet-50/30 dark:bg-violet-950/10" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <p className={`text-2xl font-bold ${highlight ? "text-violet-700 dark:text-violet-400" : ""}`}>
              ৳ {formatMoney(amount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{count} transaction{count !== 1 ? "s" : ""}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
