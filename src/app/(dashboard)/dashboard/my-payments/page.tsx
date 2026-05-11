"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Loader2, Wallet } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type BillingDashboard = {
  student?: {
    id?: string
    name?: string
  }
  summary?: {
    total_invoiced?: string | number
    total_paid?: string | number
    outstanding_balance?: string | number
  }
}

type InvoiceItem = {
  id: string
  invoice_number?: string
  invoice_month?: string
  issue_date?: string
  due_date?: string
  status?: string
  total_amount?: string | number
}

type PaymentItem = {
  id: string
  amount?: string | number
  method?: string
  payment_status?: string
  transaction_id?: string | null
  paid_at?: string
  created_at?: string
}

type WalletPayload = {
  wallet?: {
    balance?: string | number
    total_paid?: string | number
    can_apply_wallet?: boolean
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  const record = asRecord(payload)
  if (Array.isArray(record.items)) return record.items as T[]
  if (Array.isArray(record.data)) return record.data as T[]
  return []
}

function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function toMoney(value: unknown): string {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toDate(value: unknown): string {
  const raw = toText(value)
  if (!raw) return "-"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function pickStudentId(user: any): string {
  return toText(
    user?.id ??
      user?.user_id ??
      user?.userId ??
      user?.uuid ??
      user?.profile?.user_id ??
      user?.profile?.id ??
      user?.studentProfile?.user_id ??
      user?.studentProfile?.id,
  ).trim()
}

function pickTenantId(user: any): string {
  return toText(user?.tenant_id ?? user?.tenantId ?? user?.tenant?.id).trim()
}

function statusVariant(status: string) {
  const key = status.toLowerCase()
  if (key === "paid" || key === "completed") return "default"
  if (key === "partial" || key === "issued" || key === "pending") return "warning"
  if (key === "overdue" || key === "failed") return "destructive"
  return "secondary"
}

export default function StudentPaymentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [walletAmount, setWalletAmount] = useState("")
  const [walletNotes, setWalletNotes] = useState("")

  const tenantId = useMemo(() => pickTenantId(user), [user])
  const directStudentId = useMemo(() => pickStudentId(user), [user])

  const dashboardQuery = useQuery({
    queryKey: ["student-payments", "dashboard", directStudentId, tenantId],
    enabled: !!user,
    queryFn: async () => {
      return financeApi.getStudentBillingDashboard({
        studentId: directStudentId || undefined,
        tenant_id: tenantId || undefined,
      })
    },
  })

  const dashboardData = useMemo(() => {
    const payload = dashboardQuery.data
    return asRecord(payload) as BillingDashboard
  }, [dashboardQuery.data])

  const resolvedStudentId = useMemo(() => {
    const fromDashboard = toText(dashboardData.student?.id).trim()
    return fromDashboard || directStudentId
  }, [dashboardData.student?.id, directStudentId])

  const invoicesQuery = useQuery({
    queryKey: ["student-payments", "invoices", resolvedStudentId, tenantId],
    enabled: !!resolvedStudentId,
    queryFn: () => financeApi.getStudentInvoices(resolvedStudentId, { tenant_id: tenantId || undefined }),
  })

  const paymentsQuery = useQuery({
    queryKey: ["student-payments", "payments", resolvedStudentId, tenantId],
    enabled: !!resolvedStudentId,
    queryFn: () => financeApi.getStudentPayments(resolvedStudentId, { tenant_id: tenantId || undefined }),
  })

  const walletQuery = useQuery({
    queryKey: ["student-payments", "wallet", resolvedStudentId, tenantId],
    enabled: !!resolvedStudentId,
    queryFn: () => financeApi.getStudentWallet(resolvedStudentId, { tenant_id: tenantId || undefined }),
  })

  const applyWalletMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedStudentId) throw new Error("Student ID missing")
      if (!selectedInvoiceId) throw new Error("Select an invoice")
      const numericAmount = Number(walletAmount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Enter a valid wallet amount")
      }

      return financeApi.applyWallet({
        student_id: resolvedStudentId,
        invoice_id: selectedInvoiceId,
        amount: numericAmount.toFixed(2),
        notes: walletNotes.trim() || undefined,
        tenant_id: tenantId || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Wallet applied successfully")
      setWalletAmount("")
      setWalletNotes("")
      queryClient.invalidateQueries({ queryKey: ["student-payments"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to apply wallet")
    },
  })

  const downloadInvoiceMutation = useMutation({
    mutationFn: async (invoice: InvoiceItem) => {
      const blob = await financeApi.downloadInvoice(invoice.id)
      const fileName = `${toText(invoice.invoice_number, invoice.id)}.html`
      downloadBlob(blob, fileName)
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to download invoice")
    },
  })

  const invoices = useMemo(() => normalizeList<InvoiceItem>(invoicesQuery.data), [invoicesQuery.data])
  const payments = useMemo(() => normalizeList<PaymentItem>(paymentsQuery.data), [paymentsQuery.data])
  const wallet = useMemo(() => {
    const payload = asRecord(walletQuery.data) as WalletPayload
    return payload.wallet ?? {}
  }, [walletQuery.data])

  const walletEligibleInvoices = useMemo(() => {
    return invoices.filter((item) => {
      const status = toText(item.status).toLowerCase()
      return status !== "paid" && status !== "void"
    })
  }, [invoices])

  const summary = dashboardData.summary ?? {}
  const studentName = toText(dashboardData.student?.name, "Student")

  if (!user) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading session...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Payments</h1>
          <p className="text-sm text-muted-foreground">Track your invoices, payment history, and wallet balance.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["student-payments"] })}>
          Refresh
        </Button>
      </div>

      {!resolvedStudentId ? (
        <Card>
          <CardContent className="p-6 text-sm text-amber-700">
            Student ID was not resolved from your login profile. Please contact admin.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Student</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{studentName}</p>
            <p className="text-xs text-muted-foreground">ID: {resolvedStudentId || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{toMoney(summary.total_invoiced)} BDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{toMoney(summary.total_paid)} BDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{toMoney(summary.outstanding_balance)} BDT</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Wallet balance is derived from payment history and invoice totals.
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="text-xl font-semibold">{toMoney(wallet.balance)} BDT</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-xl font-semibold">{toMoney(wallet.total_paid)} BDT</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Can Apply</p>
              <p className="text-xl font-semibold">{wallet.can_apply_wallet ? "Yes" : "No"}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <option value="">Select invoice</option>
              {walletEligibleInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {toText(invoice.invoice_number, invoice.id)} ({toMoney(invoice.total_amount)} BDT)
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={walletAmount}
              onChange={(event) => setWalletAmount(event.target.value)}
            />
            <Input
              placeholder="Notes (optional)"
              value={walletNotes}
              onChange={(event) => setWalletNotes(event.target.value)}
            />
            <Button
              onClick={() => applyWalletMutation.mutate()}
              disabled={applyWalletMutation.isPending || !wallet.can_apply_wallet || !selectedInvoiceId}
            >
              {applyWalletMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{toText(invoice.invoice_number, invoice.id)}</TableCell>
                    <TableCell>{toText(invoice.invoice_month, "-")}</TableCell>
                    <TableCell>{toDate(invoice.issue_date)}</TableCell>
                    <TableCell>{toDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(toText(invoice.status, "unknown")) as any}>
                        {toText(invoice.status, "unknown").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{toMoney(invoice.total_amount)} BDT</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadInvoiceMutation.mutate(invoice)}
                        disabled={downloadInvoiceMutation.isPending}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{toDate(payment.paid_at || payment.created_at)}</TableCell>
                    <TableCell>{toText(payment.method, "-")}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(toText(payment.payment_status, "pending")) as any}>
                        {toText(payment.payment_status, "pending").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{toText(payment.transaction_id, "-")}</TableCell>
                    <TableCell className="text-right">{toMoney(payment.amount)} BDT</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No payment history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
