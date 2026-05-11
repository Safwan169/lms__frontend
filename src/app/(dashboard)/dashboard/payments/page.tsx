"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FilePlus, Loader2, ReceiptText, RefreshCcw, Send } from "lucide-react"
import toast from "react-hot-toast"

import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type ListPayload<T> = T[] | { items?: T[]; data?: T[] }

type BillingCycleRow = {
  id: string
  run_month?: string
  month?: string
  status?: string
  invoice_count?: number
  created_count?: number
}

type InvoiceRow = {
  id: string
  invoice_number?: string
  student_name?: string
  student_id?: string
  student?: { name?: string }
  total_amount?: string | number
  status?: string
  due_date?: string
}

function asList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function getReceiptId(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""
  const record = payload as { id?: string; receipt?: { id?: string } }
  return String(record.id ?? record.receipt?.id ?? "")
}

function monthNow() {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function badgeVariant(status: string) {
  const key = status.toLowerCase()
  if (key === "paid") return "default"
  if (key === "partial" || key === "issued") return "warning"
  if (key === "overdue") return "destructive"
  return "muted"
}

export default function PaymentsDashboardPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState("all")
  const [dueDate, setDueDate] = useState("")
  const [fineAmount, setFineAmount] = useState("50")

  // Create invoice form state
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [newStudentId, setNewStudentId] = useState("")
  const [newInvoiceMonth, setNewInvoiceMonth] = useState(monthNow())
  const [newDueDate, setNewDueDate] = useState("")
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("")

  // Discount form state per invoice
  const [discountInvoiceId, setDiscountInvoiceId] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [discountReason, setDiscountReason] = useState("")

  const invoicesQuery = useQuery({
    queryKey: ["finance", "invoices", month, status],
    queryFn: () => financeApi.listInvoices({ month, status: status === "all" ? undefined : status }),
  })

  const cyclesQuery = useQuery({
    queryKey: ["finance", "billing-cycles"],
    queryFn: () => financeApi.listBillingCycles(),
  })

  const runBillingMutation = useMutation({
    mutationFn: () => financeApi.runBilling({ month, due_date: dueDate || undefined, remarks: `Billing run for ${month}` }),
    onSuccess: () => {
      toast.success("Billing run completed")
      queryClient.invalidateQueries({ queryKey: ["finance"] })
    },
  })

  const reminderMutation = useMutation({
    mutationFn: () => financeApi.sendInvoiceReminder({ month, status: "overdue" }),
    onSuccess: () => toast.success("Reminder queued"),
  })

  const fineMutation = useMutation({
    mutationFn: () =>
      financeApi.applyInvoiceFine({
        month,
        status: "overdue",
        fine_amount: Number(fineAmount || 0).toFixed(2),
        title: "Late payment fine",
      }),
    onSuccess: () => {
      toast.success("Fine applied")
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] })
    },
  })

  const receiptMutation = useMutation({
    mutationFn: (invoiceId: string) => financeApi.createReceipt({ invoice_id: invoiceId, notes: "Auto-issued from finance desk" }),
    onSuccess: () => toast.success("Receipt issued"),
  })

  const createInvoiceMutation = useMutation({
    mutationFn: () => {
      if (!newStudentId.trim()) throw new Error("Student ID is required")
      return financeApi.createInvoice({
        student_id: newStudentId.trim(),
        invoice_month: newInvoiceMonth,
        due_date: newDueDate || undefined,
        notes: newInvoiceNotes.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Invoice created successfully")
      setNewStudentId("")
      setNewInvoiceNotes("")
      setShowCreateInvoice(false)
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create invoice")
    },
  })

  const discountMutation = useMutation({
    mutationFn: (invoiceId: string) => {
      const amount = Number(discountAmount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid discount amount")
      return financeApi.applyInvoiceDiscount(invoiceId, {
        discount_amount: amount.toFixed(2),
        reason: discountReason.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success("Discount applied")
      setDiscountInvoiceId("")
      setDiscountAmount("")
      setDiscountReason("")
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to apply discount")
    },
  })

  const recalculateMutation = useMutation({
    mutationFn: (invoiceId: string) => financeApi.recalculateInvoice(invoiceId),
    onSuccess: () => {
      toast.success("Invoice recalculated")
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to recalculate invoice")
    },
  })

  const invoiceItems = useMemo(() => asList<InvoiceRow>(invoicesQuery.data as ListPayload<InvoiceRow>), [invoicesQuery.data])

  const cycleItems = useMemo(() => asList<BillingCycleRow>(cyclesQuery.data as ListPayload<BillingCycleRow>), [cyclesQuery.data])

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments & Billing</h1>
          <p className="text-sm text-muted-foreground">Run monthly billing, manage invoices, and issue receipts from one place.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["finance"] })}>
          <RefreshCcw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Control</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Billing month</p>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Invoice due date</p>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-end gap-2">
            <Button onClick={() => runBillingMutation.mutate()} disabled={runBillingMutation.isPending || !month}>
              {runBillingMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Run Billing
            </Button>
            <Button variant="outline" onClick={() => reminderMutation.mutate()} disabled={reminderMutation.isPending || !month}>
              {reminderMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send Overdue Reminder
            </Button>
            <Input className="w-28" value={fineAmount} onChange={(event) => setFineAmount(event.target.value)} placeholder="Fine" />
            <Button variant="outline" onClick={() => fineMutation.mutate()} disabled={fineMutation.isPending || Number(fineAmount) <= 0}>
              Apply Fine
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Billing Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading billing cycles...</p> : null}
            {!cyclesQuery.isLoading && cycleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing cycle history yet.</p>
            ) : null}
            <div className="space-y-2">
              {cycleItems.map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{item.run_month ?? item.month ?? "-"}</span>
                    <Badge variant={badgeVariant(String(item.status ?? "draft"))}>{String(item.status ?? "draft")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Invoices: {item.invoice_count ?? item.created_count ?? 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Invoice manually */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Invoice Manually</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreateInvoice((v) => !v)}>
              <FilePlus className="mr-1 size-4" /> {showCreateInvoice ? "Cancel" : "New Invoice"}
            </Button>
          </div>
        </CardHeader>
        {showCreateInvoice ? (
          <CardContent>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 mb-3">
              Use this to manually create an invoice for a student outside of the automatic billing run.
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Student ID (UUID) *</p>
                <Input
                  placeholder="Student user ID"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Invoice month *</p>
                <Input type="month" value={newInvoiceMonth} onChange={(e) => setNewInvoiceMonth(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Due date</p>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                <Input placeholder="Optional notes" value={newInvoiceNotes} onChange={(e) => setNewInvoiceNotes(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending || !newStudentId.trim() || !newInvoiceMonth}
              >
                {createInvoiceMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create Invoice
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* Apply Discount to invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Apply Invoice Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Invoice ID (UUID)</p>
              <Input
                placeholder="Invoice ID"
                value={discountInvoiceId}
                onChange={(e) => setDiscountInvoiceId(e.target.value)}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Discount amount</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Reason</p>
              <Input placeholder="Reason (optional)" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => discountMutation.mutate(discountInvoiceId)}
                disabled={discountMutation.isPending || !discountInvoiceId.trim() || !discountAmount}
              >
                {discountMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Apply Discount
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" className="w-44" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Select className="w-44" value={status} onValueChange={setStatus}>
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading invoices...</TableCell>
                  </TableRow>
                ) : null}
                {!invoicesQuery.isLoading && invoiceItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No invoices found for this filter.</TableCell>
                  </TableRow>
                ) : null}

                {invoiceItems.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoice_number ?? "-"}</TableCell>
                    <TableCell>{invoice.student_name ?? invoice.student?.name ?? invoice.student_id ?? "-"}</TableCell>
                    <TableCell>BDT {formatMoney(invoice.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(String(invoice.status ?? "draft"))}>{String(invoice.status ?? "draft")}</Badge>
                    </TableCell>
                    <TableCell>{invoice.due_date ? String(invoice.due_date).slice(0, 10) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await financeApi.downloadInvoice(String(invoice.id))
                              downloadBlob(blob, `${invoice.invoice_number ?? invoice.id}.html`)
                            } catch {
                              toast.error("Invoice download failed")
                            }
                          }}
                        >
                          <Download className="mr-1 size-3" /> Invoice
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => receiptMutation.mutate(String(invoice.id), {
                            onSuccess: async (result) => {
                              const receiptId = getReceiptId(result)
                              if (!receiptId) return
                              try {
                                const blob = await financeApi.downloadReceipt(receiptId)
                                downloadBlob(blob, `receipt-${receiptId}.html`)
                                toast.success("Receipt issued & downloaded")
                              } catch {
                                toast.success("Receipt issued")
                              }
                            },
                          })}
                          disabled={receiptMutation.isPending}
                        >
                          <ReceiptText className="mr-1 size-3" /> Receipt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => recalculateMutation.mutate(String(invoice.id))}
                          disabled={recalculateMutation.isPending}
                          title="Recalculate invoice totals"
                        >
                          {recalculateMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Recalc"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type ListPayload<T> = T[] | { items?: T[]; data?: T[] }

type BillingCycleRow = {
  id: string
  run_month?: string
  month?: string
  status?: string
  invoice_count?: number
  created_count?: number
}

type InvoiceRow = {
  id: string
  invoice_number?: string
  student_name?: string
  student_id?: string
  student?: { name?: string }
  total_amount?: string | number
  status?: string
  due_date?: string
}

function asList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function getReceiptId(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""
  const record = payload as { id?: string; receipt?: { id?: string } }
  return String(record.id ?? record.receipt?.id ?? "")
}

function monthNow() {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function badgeVariant(status: string) {
  const key = status.toLowerCase()
  if (key === "paid") return "default"
  if (key === "partial" || key === "issued") return "warning"
  if (key === "overdue") return "destructive"
  return "muted"
}

export default function PaymentsDashboardPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(monthNow())
  const [status, setStatus] = useState("all")
  const [dueDate, setDueDate] = useState("")
  const [fineAmount, setFineAmount] = useState("50")

  const invoicesQuery = useQuery({
    queryKey: ["finance", "invoices", month, status],
    queryFn: () => financeApi.listInvoices({ month, status: status === "all" ? undefined : status }),
  })

  const cyclesQuery = useQuery({
    queryKey: ["finance", "billing-cycles"],
    queryFn: () => financeApi.listBillingCycles(),
  })

  const runBillingMutation = useMutation({
    mutationFn: () => financeApi.runBilling({ month, due_date: dueDate || undefined, remarks: `Billing run for ${month}` }),
    onSuccess: () => {
      toast.success("Billing run completed")
      queryClient.invalidateQueries({ queryKey: ["finance"] })
    },
  })

  const reminderMutation = useMutation({
    mutationFn: () => financeApi.sendInvoiceReminder({ month, status: "overdue" }),
    onSuccess: () => toast.success("Reminder queued"),
  })

  const fineMutation = useMutation({
    mutationFn: () =>
      financeApi.applyInvoiceFine({
        month,
        status: "overdue",
        fine_amount: Number(fineAmount || 0).toFixed(2),
        title: "Late payment fine",
      }),
    onSuccess: () => {
      toast.success("Fine applied")
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] })
    },
  })

  const receiptMutation = useMutation({
    mutationFn: (invoiceId: string) => financeApi.createReceipt({ invoice_id: invoiceId, notes: "Auto-issued from finance desk" }),
    onSuccess: () => toast.success("Receipt issued"),
  })

  const invoiceItems = useMemo(() => asList<InvoiceRow>(invoicesQuery.data as ListPayload<InvoiceRow>), [invoicesQuery.data])

  const cycleItems = useMemo(() => asList<BillingCycleRow>(cyclesQuery.data as ListPayload<BillingCycleRow>), [cyclesQuery.data])

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments & Billing</h1>
          <p className="text-sm text-muted-foreground">Run monthly billing, manage invoices, and issue receipts from one place.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["finance"] })}>
          <RefreshCcw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Control</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Billing month</p>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Invoice due date</p>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-end gap-2">
            <Button onClick={() => runBillingMutation.mutate()} disabled={runBillingMutation.isPending || !month}>
              {runBillingMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Run Billing
            </Button>
            <Button variant="outline" onClick={() => reminderMutation.mutate()} disabled={reminderMutation.isPending || !month}>
              {reminderMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send Overdue Reminder
            </Button>
            <Input className="w-28" value={fineAmount} onChange={(event) => setFineAmount(event.target.value)} placeholder="Fine" />
            <Button variant="outline" onClick={() => fineMutation.mutate()} disabled={fineMutation.isPending || Number(fineAmount) <= 0}>
              Apply Fine
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Billing Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading billing cycles...</p> : null}
            {!cyclesQuery.isLoading && cycleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing cycle history yet.</p>
            ) : null}
            <div className="space-y-2">
              {cycleItems.map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{item.run_month ?? item.month ?? "-"}</span>
                    <Badge variant={badgeVariant(String(item.status ?? "draft"))}>{String(item.status ?? "draft")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Invoices: {item.invoice_count ?? item.created_count ?? 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" className="w-44" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Select className="w-44" value={status} onValueChange={setStatus}>
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading invoices...</TableCell>
                  </TableRow>
                ) : null}
                {!invoicesQuery.isLoading && invoiceItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No invoices found for this filter.</TableCell>
                  </TableRow>
                ) : null}

                {invoiceItems.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoice_number ?? "-"}</TableCell>
                    <TableCell>{invoice.student_name ?? invoice.student?.name ?? invoice.student_id ?? "-"}</TableCell>
                    <TableCell>BDT {formatMoney(invoice.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(String(invoice.status ?? "draft"))}>{String(invoice.status ?? "draft")}</Badge>
                    </TableCell>
                    <TableCell>{invoice.due_date ? String(invoice.due_date).slice(0, 10) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await financeApi.downloadInvoice(String(invoice.id))
                              downloadBlob(blob, `${invoice.invoice_number ?? invoice.id}.html`)
                            } catch {
                              toast.error("Invoice download failed")
                            }
                          }}
                        >
                          <Download className="mr-1 size-3" /> Invoice
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => receiptMutation.mutate(String(invoice.id), {
                            onSuccess: async (result) => {
                              const receiptId = getReceiptId(result)
                              if (!receiptId) return
                              try {
                                const blob = await financeApi.downloadReceipt(receiptId)
                                downloadBlob(blob, `receipt-${receiptId}.html`)
                                toast.success("Receipt issued & downloaded")
                              } catch {
                                toast.success("Receipt issued")
                              }
                            },
                          })}
                          disabled={receiptMutation.isPending}
                        >
                          <ReceiptText className="mr-1 size-3" /> Receipt
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}