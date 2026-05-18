"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type ListPayload<T> = T[] | { items?: T[]; data?: T[] }

type PayrollRow = {
  id: string
  payroll_month?: string
  gross_amount?: string | number
  bonus?: string | number
  allowance?: string | number
  deduction?: string | number
  net_amount?: string | number
  status?: string
  payroll_type?: string
  remarks?: string
}

type SalaryConfig = {
  id: string
  payroll_type?: string
  monthly_salary?: string | number
  per_class_rate?: string | number
  per_batch_rate?: string | number
  remarks?: string
}

function asList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function monthNow() {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function badgeVariant(status: string) {
  const key = (status ?? "").toLowerCase()
  if (key === "paid") return "default"
  if (key === "pending") return "warning"
  if (key === "on_hold") return "destructive"
  return "muted"
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

export default function MyPayrollPage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState("all")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const userId: string =
    user?.id ?? user?.user_id ?? user?.userId ?? ""

  const payrollsQuery = useQuery({
    queryKey: ["my-payroll", "list", month, status],
    queryFn: () => financeApi.listPayrolls({ month, status: status === "all" ? undefined : status }),
    enabled: true,
  })

  const salaryConfigQuery = useQuery({
    queryKey: ["my-payroll", "salary-config", userId],
    queryFn: () => financeApi.getSalaryConfigByUserId(userId),
    enabled: Boolean(userId),
  })

  const payrollRows = useMemo(() => asList<PayrollRow>(payrollsQuery.data as ListPayload<PayrollRow>), [payrollsQuery.data])

  const salaryConfig = salaryConfigQuery.data as SalaryConfig | null | undefined

  async function handleDownloadPayslip(record: PayrollRow) {
    setDownloadingId(record.id)
    try {
      const blob = await financeApi.downloadPayslip(record.id)
      downloadBlob(blob, `payslip-${record.payroll_month ?? record.id}.html`)
    } catch {
      toast.error("Payslip download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  // Summary totals
  const totalEarned = useMemo(
    () => payrollRows.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.net_amount ?? 0), 0),
    [payrollRows],
  )
  const totalPending = useMemo(
    () => payrollRows.filter((r) => r.status !== "paid").reduce((sum, r) => sum + Number(r.net_amount ?? 0), 0),
    [payrollRows],
  )

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div>
        <h1 className="text-2xl font-semibold">My Payroll</h1>
        <p className="text-sm text-muted-foreground">View your salary, payslips, and payment history.</p>
      </div>

      {/* ── Salary Config Summary ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>My Salary Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryConfigQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading salary configuration...</p>
          ) : salaryConfig ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Payroll Type</p>
                <p className="mt-1 font-semibold">{salaryConfig.payroll_type ?? "-"}</p>
              </div>
              {salaryConfig.monthly_salary ? (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Monthly Salary</p>
                  <p className="mt-1 font-semibold">BDT {formatMoney(salaryConfig.monthly_salary)}</p>
                </div>
              ) : null}
              {salaryConfig.per_class_rate ? (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Per Class Rate</p>
                  <p className="mt-1 font-semibold">BDT {formatMoney(salaryConfig.per_class_rate)}</p>
                </div>
              ) : null}
              {salaryConfig.per_batch_rate ? (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Per Batch Rate</p>
                  <p className="mt-1 font-semibold">BDT {formatMoney(salaryConfig.per_batch_rate)}</p>
                </div>
              ) : null}
              {salaryConfig.remarks ? (
                <div className="col-span-full rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="mt-1 text-sm">{salaryConfig.remarks}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No salary configuration assigned yet. Please contact admin.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Earnings Summary ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Earned (Paid)</p>
            <p className="mt-1 text-2xl font-bold">BDT {formatMoney(totalEarned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pending / Due</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">BDT {formatMoney(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Payroll History Table ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Filter by month</p>
              <Input className="w-44" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <Select className="w-40" value={status} onValueChange={setStatus}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="on_hold">On Hold</option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Allowance</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      Loading payroll records...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!payrollsQuery.isLoading && payrollRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No payroll records found. Records appear here once payroll is run for your account.
                    </TableCell>
                  </TableRow>
                ) : null}
                {payrollRows.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.payroll_month ?? "-"}</TableCell>
                    <TableCell>BDT {formatMoney(record.gross_amount)}</TableCell>
                    <TableCell>BDT {formatMoney(record.bonus)}</TableCell>
                    <TableCell>BDT {formatMoney(record.allowance)}</TableCell>
                    <TableCell>BDT {formatMoney(record.deduction)}</TableCell>
                    <TableCell className="font-semibold">BDT {formatMoney(record.net_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(String(record.status ?? "draft"))}>{String(record.status ?? "draft")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === record.id}
                        onClick={() => handleDownloadPayslip(record)}
                      >
                        {downloadingId === record.id ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 size-3" />
                        )}
                        Payslip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {payrollRows.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              * Payslip download is available for finalized payroll records. Contact admin if your payroll record is missing.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
