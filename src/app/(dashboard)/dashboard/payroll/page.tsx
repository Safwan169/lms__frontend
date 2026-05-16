"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Edit2, Loader2, PlayCircle, Plus, RefreshCcw, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

import financeApi from "@/features/finance/api"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type ListPayload<T> = T[] | { items?: T[]; data?: T[] }

type DirectoryUserOption = {
  id: string
  user_id?: string
  role?: string
  user?: { id?: string; name?: string; email?: string; role?: string }
  name?: string
  full_name?: string
  email?: string
}

type SalaryConfigRow = {
  id: string
  user_id?: string
  teacher_id?: string
  teacher?: { name?: string; id?: string }
  user?: { name?: string; id?: string }
  payroll_type?: string
  monthly_salary?: string | number
  per_class_rate?: string | number
  per_batch_rate?: string | number
  remarks?: string
}

type PayrollRow = {
  id: string
  teacher_name?: string
  teacher_id?: string
  teacher?: { name?: string }
  payroll_month?: string
  gross_amount?: string | number
  bonus?: string | number
  allowance?: string | number
  deduction?: string | number
  net_amount?: string | number
  status?: string
}

type PayrollMonthRow = {
  id: string
  month: string
  status: string
}

type PayrollPaymentRow = {
  id: string
  payroll_id?: string
  payrollId?: string
  payment_status?: string
  amount?: string | number
  method?: string
}

type AdjustForm = {
  bonus: string
  allowance: string
  deduction: string
  remarks: string
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
  const key = status.toLowerCase()
  if (key === "paid" || key === "open") return "default"
  if (key === "pending") return "warning"
  if (key === "on_hold" || key === "closed") return "destructive"
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

const EMPTY_SALARY_FORM = {
  user_id: "",
  payroll_type: "MONTHLY" as "MONTHLY" | "PER_CLASS" | "PER_BATCH" | "HYBRID",
  monthly_salary: "",
  per_class_rate: "",
  per_batch_rate: "",
  remarks: "",
}

const EMPTY_ADJUST: AdjustForm = { bonus: "", allowance: "", deduction: "", remarks: "" }

export default function PayrollDashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState("all")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")

  // Salary config state
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SalaryConfigRow | null>(null)
  const [salaryForm, setSalaryForm] = useState(EMPTY_SALARY_FORM)

  // Inline payroll adjustment state
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>(EMPTY_ADJUST)

  // ── Queries ────────────────────────────────────────────────────────────
  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const teachersQuery = useQuery({
    queryKey: ["finance", "tenant-teachers", tenantId],
    queryFn: () => financeApi.listTenantTeachers(tenantId, { limit: 100 }),
    enabled: Boolean(tenantId),
  })

  const accountantsQuery = useQuery({
    queryKey: ["finance", "tenant-accountants", tenantId],
    queryFn: () => financeApi.listTenantAccountants(tenantId, { limit: 100 }),
    enabled: Boolean(tenantId),
  })

  const employeesQuery = useQuery({
    queryKey: ["finance", "tenant-employees", tenantId],
    queryFn: () => financeApi.listTenantEmployees(tenantId, { limit: 100 }),
    enabled: Boolean(tenantId),
  })

  const salaryConfigsQuery = useQuery({

    queryKey: ["finance", "salary-configs"],
    queryFn: () => financeApi.listSalaryConfigs(),
  })

  const payrollsQuery = useQuery({
    queryKey: ["finance", "payrolls", month, status],
    queryFn: () => financeApi.listPayrolls({ month, status: status === "all" ? undefined : status }),
  })

  const monthsQuery = useQuery({
    queryKey: ["finance", "payroll-months"],
    queryFn: () => financeApi.listPayrollMonths(),
  })

  const paymentsQuery = useQuery({
    queryKey: ["finance", "payroll-payments", month],
    queryFn: () => financeApi.listPayrollPayments({ month }),
  })

  // ── Salary Config Mutations ───────────────────────────────────────────
  const saveSalaryConfigMutation = useMutation({
    mutationFn: async () => {
      if (editingConfig) {
        return financeApi.updateSalaryConfig(editingConfig.id, {
          payroll_type: salaryForm.payroll_type,
          monthly_salary: salaryForm.monthly_salary || undefined,
          per_class_rate: salaryForm.per_class_rate || undefined,
          per_batch_rate: salaryForm.per_batch_rate || undefined,
          remarks: salaryForm.remarks || undefined,
        })
      }
      return financeApi.createSalaryConfig({
        user_id: salaryForm.user_id,
        payroll_type: salaryForm.payroll_type,
        monthly_salary: salaryForm.monthly_salary || undefined,
        per_class_rate: salaryForm.per_class_rate || undefined,
        per_batch_rate: salaryForm.per_batch_rate || undefined,
        remarks: salaryForm.remarks || undefined,
      })
    },
    onSuccess: () => {
      toast.success(editingConfig ? "Salary config updated" : "Salary config created")
      setSalaryDialogOpen(false)
      setEditingConfig(null)
      setSalaryForm(EMPTY_SALARY_FORM)
      queryClient.invalidateQueries({ queryKey: ["finance", "salary-configs"] })
    },
  })

  const deleteSalaryConfigMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteSalaryConfig(id),
    onSuccess: () => {
      toast.success("Salary config deleted")
      queryClient.invalidateQueries({ queryKey: ["finance", "salary-configs"] })
    },
  })

  // ── Payroll Month Mutations ───────────────────────────────────────────
  const runPayrollMutation = useMutation({
    mutationFn: () => financeApi.runPayroll({ month, remarks: `Run payroll for ${month}` }),
    onSuccess: () => {
      toast.success("Payroll run completed")
      queryClient.invalidateQueries({ queryKey: ["finance", "payrolls"] })
    },
  })

  const openMonthMutation = useMutation({
    mutationFn: () => financeApi.openPayrollMonth({ month, remarks: `Open ${month}` }),
    onSuccess: () => {
      toast.success("Payroll month opened")
      queryClient.invalidateQueries({ queryKey: ["finance", "payroll-months"] })
    },
  })

  const closeMonthMutation = useMutation({
    mutationFn: () => financeApi.closePayrollMonth({ month, remarks: `Close ${month}` }),
    onSuccess: () => {
      toast.success("Payroll month closed")
      queryClient.invalidateQueries({ queryKey: ["finance", "payroll-months"] })
    },
  })

  const finalizeBatchMutation = useMutation({
    mutationFn: () =>
      financeApi.finalizeBatchPayroll({ month, payment_method: paymentMethod, remarks: "Batch finalize from payroll workspace" }),
    onSuccess: () => {
      toast.success("All payrolls for month finalized")
      queryClient.invalidateQueries({ queryKey: ["finance", "payrolls"] })
    },
  })

  const updatePayrollMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: AdjustForm }) =>
      financeApi.updatePayroll(id, {
        bonus: form.bonus || undefined,
        allowance: form.allowance || undefined,
        deduction: form.deduction || undefined,
        remarks: form.remarks || undefined,
      }),
    onSuccess: () => {
      toast.success("Payroll adjustments saved")
      setAdjustingId(null)
      setAdjustForm(EMPTY_ADJUST)
      queryClient.invalidateQueries({ queryKey: ["finance", "payrolls"] })
    },
  })

  // ── Sync This Month ─────────────────────────────────────────────────────────
  // Re-runs the canonical payroll pipeline for the selected month:
  //   1) Ensure the payroll month is open (POST /v1/payroll/months/open)
  //      — silently ignore "already open" type errors.
  //   2) Run payroll calculations (POST /v1/payroll/run) — recalculates
  //      payroll records from current salary configs, attendance, etc.
  // Finalize is intentionally NOT auto-triggered here because finalizing
  // locks the month; that should stay an explicit operator action.
  const syncMutation = useMutation({
    mutationFn: async () => {
      const results: { step: string; ok: boolean; message?: string }[] = []
      try {
        await financeApi.openPayrollMonth({ month, remarks: `Sync — open ${month}` })
        results.push({ step: "Month opened", ok: true })
      } catch (err: any) {
        // Already open is fine — note but don't treat as fatal.
        results.push({
          step: "Month opened",
          ok: false,
          message: err?.message || "month may already be open",
        })
      }
      try {
        await financeApi.runPayroll({ month, remarks: `Sync — run payroll for ${month}` })
        results.push({ step: "Payroll run", ok: true })
      } catch (err: any) {
        results.push({ step: "Payroll run", ok: false, message: err?.message })
      }
      return results
    },
    onSuccess: (results) => {
      results.forEach((r) =>
        r.ok ? toast.success(`${r.step} ✓`) : toast(`${r.step}: ${r.message || "skipped"}`),
      )
      queryClient.invalidateQueries({ queryKey: ["finance", "payrolls"] })
      queryClient.invalidateQueries({ queryKey: ["finance", "payroll-months"] })
    },
  })

  // ── Derived data ──────────────────────────────────────────────────────
  const salaryConfigs = useMemo(
    () => asList<SalaryConfigRow>(salaryConfigsQuery.data as ListPayload<SalaryConfigRow>),
    [salaryConfigsQuery.data],
  )

  const selectableUsers = useMemo(() => {
    const normalize = (item: DirectoryUserOption, fallbackRole: string) => {
      const id = item.user_id ?? item.user?.id ?? item.id
      if (!id) return null
      return {
        id,
        name: item.user?.name ?? item.name ?? item.full_name ?? id,
        email: item.user?.email ?? item.email ?? "",
        role: String(item.user?.role ?? item.role ?? fallbackRole).toUpperCase(),
      }
    }

    const teachers = asList<DirectoryUserOption>(teachersQuery.data as ListPayload<DirectoryUserOption>)
      .map((item) => normalize(item, "TEACHER"))
      .filter(Boolean) as Array<{ id: string; name: string; email: string; role: string }>

    const accountants = asList<DirectoryUserOption>(accountantsQuery.data as ListPayload<DirectoryUserOption>)
      .map((item) => normalize(item, "ACCOUNTANT"))
      .filter(Boolean) as Array<{ id: string; name: string; email: string; role: string }>

    const employees = asList<DirectoryUserOption>(employeesQuery.data as ListPayload<DirectoryUserOption>)
      .map((item) => normalize(item, "EMPLOYEE"))
      .filter(Boolean) as Array<{ id: string; name: string; email: string; role: string }>

    const byId = new Map<string, { id: string; name: string; email: string; role: string }>()
    for (const user of [...teachers, ...accountants, ...employees]) {
      if (!byId.has(user.id)) byId.set(user.id, user)
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [teachersQuery.data, accountantsQuery.data, employeesQuery.data])

  const isUsersLoading = teachersQuery.isLoading || accountantsQuery.isLoading || employeesQuery.isLoading

  const payrollRows = useMemo(() => asList<PayrollRow>(payrollsQuery.data as ListPayload<PayrollRow>), [payrollsQuery.data])

  const monthRows = useMemo(() => asList<PayrollMonthRow>(monthsQuery.data as ListPayload<PayrollMonthRow>), [monthsQuery.data])

  const payrollPayments = useMemo(
    () => asList<PayrollPaymentRow>(paymentsQuery.data as ListPayload<PayrollPaymentRow>),
    [paymentsQuery.data],
  )

  function openAddDialog() {
    setEditingConfig(null)
    setSalaryForm(EMPTY_SALARY_FORM)
    setSalaryDialogOpen(true)
  }

  function openEditDialog(config: SalaryConfigRow) {
    setEditingConfig(config)
    setSalaryForm({
      user_id: config.user_id ?? config.teacher_id ?? "",
      payroll_type: (config.payroll_type as any) ?? "MONTHLY",
      monthly_salary: String(config.monthly_salary ?? ""),
      per_class_rate: String(config.per_class_rate ?? ""),
      per_batch_rate: String(config.per_batch_rate ?? ""),
      remarks: config.remarks ?? "",
    })
    setSalaryDialogOpen(true)
  }

  function getTeacherName(config: SalaryConfigRow) {
    return config.teacher?.name ?? config.user?.name ?? config.user_id ?? config.teacher_id ?? "-"
  }

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Workspace</h1>
          <p className="text-sm text-muted-foreground">Manage salary configs, run payroll, finalize salary, and issue payslips.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !month}
            title={`Open the month and run payroll calculation for ${month}`}
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 size-4" />
            )}
            Sync This Month
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["finance"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Salary Config ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Salary Configurations</CardTitle>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-1 size-4" /> Add Config
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {salaryConfigsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading salary configs...</p> : null}
          {!salaryConfigsQuery.isLoading && salaryConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No salary configurations found. Add one to enable payroll runs.</p>
          ) : null}
          {salaryConfigs.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Per Class</TableHead>
                    <TableHead>Per Batch</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>{getTeacherName(config)}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{config.payroll_type ?? "-"}</Badge>
                      </TableCell>
                      <TableCell>{config.monthly_salary ? `BDT ${formatMoney(config.monthly_salary)}` : "-"}</TableCell>
                      <TableCell>{config.per_class_rate ? `BDT ${formatMoney(config.per_class_rate)}` : "-"}</TableCell>
                      <TableCell>{config.per_batch_rate ? `BDT ${formatMoney(config.per_batch_rate)}` : "-"}</TableCell>
                      <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{config.remarks ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(config)}>
                            <Edit2 className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Delete this salary config?")) deleteSalaryConfigMutation.mutate(config.id)
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Month Control ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Month Control</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Payroll month</p>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <Button onClick={() => runPayrollMutation.mutate()} disabled={runPayrollMutation.isPending || !month}>
            {runPayrollMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlayCircle className="mr-2 size-4" />} Run
            Payroll
          </Button>
          <Button variant="outline" onClick={() => openMonthMutation.mutate()} disabled={openMonthMutation.isPending || !month}>
            Open Month
          </Button>
          <Button variant="outline" onClick={() => closeMonthMutation.mutate()} disabled={closeMonthMutation.isPending || !month}>
            Close Month
          </Button>
          <Button
            variant="outline"
            onClick={() => finalizeBatchMutation.mutate()}
            disabled={finalizeBatchMutation.isPending || !month}
          >
            {finalizeBatchMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Finalize All
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Month Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading month controls...</p> : null}
            {!monthsQuery.isLoading && monthRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payroll month history found.</p>
            ) : null}
            {monthRows.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{item.month}</span>
                <Badge variant={badgeVariant(String(item.status))}>{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading payroll payment history...</p> : null}
            {!paymentsQuery.isLoading && payrollPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payroll payments found for this month.</p>
            ) : null}
            {payrollPayments.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{item.payroll_id ?? item.payrollId ?? "Payroll"}</span>
                  <Badge variant={badgeVariant(String(item.payment_status ?? "pending"))}>{item.payment_status ?? "pending"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  BDT {formatMoney(item.amount)} via {item.method ?? "-"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Payroll Records ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-44" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Select className="w-44" value={status} onValueChange={setStatus}>
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="on_hold">On Hold</option>
            </Select>
            <Select className="w-52" value={paymentMethod} onValueChange={setPaymentMethod}>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Allowance</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Loading payroll records...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!payrollsQuery.isLoading && payrollRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      No payroll records found for this filter.
                    </TableCell>
                  </TableRow>
                ) : null}

                {payrollRows.map((record) => (
                  <>
                    <TableRow key={record.id}>
                      <TableCell>{record.teacher_name ?? record.teacher?.name ?? record.teacher_id ?? "-"}</TableCell>
                      <TableCell>{record.payroll_month ?? "-"}</TableCell>
                      <TableCell>BDT {formatMoney(record.gross_amount)}</TableCell>
                      <TableCell>BDT {formatMoney(record.bonus)}</TableCell>
                      <TableCell>BDT {formatMoney(record.allowance)}</TableCell>
                      <TableCell>BDT {formatMoney(record.deduction)}</TableCell>
                      <TableCell className="font-medium">BDT {formatMoney(record.net_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(String(record.status ?? "draft"))}>{String(record.status ?? "draft")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (adjustingId === record.id) {
                                setAdjustingId(null)
                              } else {
                                setAdjustingId(record.id)
                                setAdjustForm({
                                  bonus: String(record.bonus ?? ""),
                                  allowance: String(record.allowance ?? ""),
                                  deduction: String(record.deduction ?? ""),
                                  remarks: "",
                                })
                              }
                            }}
                          >
                            <Edit2 className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              financeApi
                                .finalizePayroll(String(record.id), {
                                  payment_method: paymentMethod,
                                  remarks: "Finalized from payroll workspace",
                                })
                                .then(() => {
                                  toast.success("Payroll finalized")
                                  queryClient.invalidateQueries({ queryKey: ["finance", "payrolls"] })
                                })
                                .catch(() => toast.error("Finalize failed"))
                            }
                          >
                            Finalize
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              financeApi
                                .payPayroll(String(record.id), {
                                  method: paymentMethod,
                                  amount: String(record.net_amount ?? ""),
                                  payment_status: "COMPLETED",
                                  notes: "Paid from payroll workspace",
                                })
                                .then(() => {
                                  toast.success("Payroll payment recorded")
                                  queryClient.invalidateQueries({ queryKey: ["finance"] })
                                })
                                .catch(() => toast.error("Payment record failed"))
                            }
                          >
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const blob = await financeApi.downloadPayslip(String(record.id))
                                downloadBlob(blob, `payslip-${record.id}.html`)
                              } catch {
                                toast.error("Payslip download failed")
                              }
                            }}
                          >
                            <Download className="mr-1 size-3" /> Payslip
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {adjustingId === record.id ? (
                      <TableRow key={`${record.id}-adjust`} className="bg-muted/40">
                        <TableCell colSpan={9}>
                          <div className="flex flex-wrap items-end gap-2 py-1">
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Bonus</p>
                              <Input
                                className="w-28"
                                type="number"
                                placeholder="0"
                                value={adjustForm.bonus}
                                onChange={(e) => setAdjustForm((f) => ({ ...f, bonus: e.target.value }))}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Allowance</p>
                              <Input
                                className="w-28"
                                type="number"
                                placeholder="0"
                                value={adjustForm.allowance}
                                onChange={(e) => setAdjustForm((f) => ({ ...f, allowance: e.target.value }))}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Deduction</p>
                              <Input
                                className="w-28"
                                type="number"
                                placeholder="0"
                                value={adjustForm.deduction}
                                onChange={(e) => setAdjustForm((f) => ({ ...f, deduction: e.target.value }))}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Remarks</p>
                              <Input
                                className="w-48"
                                placeholder="Optional note"
                                value={adjustForm.remarks}
                                onChange={(e) => setAdjustForm((f) => ({ ...f, remarks: e.target.value }))}
                              />
                            </div>
                            <Button
                              size="sm"
                              disabled={updatePayrollMutation.isPending}
                              onClick={() => updatePayrollMutation.mutate({ id: record.id, form: adjustForm })}
                            >
                              {updatePayrollMutation.isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setAdjustingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Salary Config Dialog ──────────────────────────────────────── */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Edit Salary Config" : "Add Salary Config"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingConfig ? (
              <div>
                <p className="mb-1 text-xs font-medium">Select User *</p>
                {isUsersLoading ? (
                  <p className="text-xs text-muted-foreground">Loading users...</p>
                ) : selectableUsers.length === 0 ? (
                  <>
                    <p className="mb-1 text-xs text-amber-600">No users found{!tenantId ? " (tenant not detected)" : ""}. Enter user ID manually:</p>
                    <Input
                      placeholder="Enter user's id"
                      value={salaryForm.user_id}
                      onChange={(e) => setSalaryForm((f) => ({ ...f, user_id: e.target.value }))}
                    />
                  </>
                ) : (
                  <Select
                    value={salaryForm.user_id}
                    onValueChange={(v) => setSalaryForm((f) => ({ ...f, user_id: v }))}
                  >
                    <option value="">-- Select a user --</option>
                    {selectableUsers.map((item) => {
                      const uid = item.id
                      const label = item.name
                      const email = item.email ? ` (${item.email})` : ""
                      return (
                        <option key={uid} value={uid}>
                          [{item.role}] {label}{email}
                        </option>
                      )
                    })}
                  </Select>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Editing config for: {getTeacherName(editingConfig)}</p>
            )}
            <div>
              <p className="mb-1 text-xs font-medium">Payroll Type *</p>
              <Select
                value={salaryForm.payroll_type}
                onValueChange={(v) => setSalaryForm((f) => ({ ...f, payroll_type: v as any }))}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="PER_CLASS">Per Class</option>
                <option value="PER_BATCH">Per Batch</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </div>
            {(salaryForm.payroll_type === "MONTHLY" || salaryForm.payroll_type === "HYBRID") ? (
              <div>
                <p className="mb-1 text-xs font-medium">Monthly Salary (BDT)</p>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={salaryForm.monthly_salary}
                  onChange={(e) => setSalaryForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                />
              </div>
            ) : null}
            {(salaryForm.payroll_type === "PER_CLASS" || salaryForm.payroll_type === "HYBRID") ? (
              <div>
                <p className="mb-1 text-xs font-medium">Per Class Rate (BDT)</p>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={salaryForm.per_class_rate}
                  onChange={(e) => setSalaryForm((f) => ({ ...f, per_class_rate: e.target.value }))}
                />
              </div>
            ) : null}
            {(salaryForm.payroll_type === "PER_BATCH" || salaryForm.payroll_type === "HYBRID") ? (
              <div>
                <p className="mb-1 text-xs font-medium">Per Batch Rate (BDT)</p>
                <Input
                  type="number"
                  placeholder="e.g. 8000"
                  value={salaryForm.per_batch_rate}
                  onChange={(e) => setSalaryForm((f) => ({ ...f, per_batch_rate: e.target.value }))}
                />
              </div>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-medium">Remarks</p>
              <Textarea
                placeholder="Optional notes"
                value={salaryForm.remarks}
                onChange={(e) => setSalaryForm((f) => ({ ...f, remarks: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSalaryDialogOpen(false)
                setEditingConfig(null)
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={saveSalaryConfigMutation.isPending || (!editingConfig && !salaryForm.user_id)}
              onClick={() => saveSalaryConfigMutation.mutate()}
            >
              {saveSalaryConfigMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingConfig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}