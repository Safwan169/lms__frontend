"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { BadgeDollarSign, Loader2, Pencil, RefreshCcw, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

const feeTypeOptions = ["ADMISSION", "MONTHLY", "EXAM", "MATERIAL", "OTHER"] as const
const batchFeeTypeOptions = ["MONTHLY", "SESSION"] as const

type FeeType = (typeof feeTypeOptions)[number]
type BatchFeeType = (typeof batchFeeTypeOptions)[number]

type ClassOption = {
  id: string
  name: string
}

type BatchOption = {
  id: string
  name: string
}

type FeeStructureRow = {
  id: string
  name: string
  description?: string | null
  amount: string
  fee_type: FeeType
  batch_id?: string | null
  created_at?: string
}

type BatchFeeView = {
  id: string
  fee_type: BatchFeeType
  amount: number
  currency?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

const feeStructureSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Use valid amount (e.g. 2500 or 2500.00)"),
  fee_type: z.enum(feeTypeOptions, { message: "Fee type is required" }),
  description: z.string().optional(),
  batch_id: z.string().optional(),
})

const batchFeeSchema = z
  .object({
    fee_type: z.enum(batchFeeTypeOptions, { message: "Fee type is required" }),
    amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
    currency: z.string().trim().min(1, "Currency is required"),
    description: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fee_type !== "SESSION") return

    if (!value.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["start_date"],
        message: "Start date is required for SESSION fee",
      })
    }

    if (!value.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date is required for SESSION fee",
      })
    }

    if (value.start_date && value.end_date && value.end_date < value.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date cannot be before start date",
      })
    }
  })

type FeeStructureFormValues = z.infer<typeof feeStructureSchema>
type BatchFeeFormValues = z.infer<typeof batchFeeSchema>

function extractArrayPayload(payload: any): any[] {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

function formatMoney(value: string | number) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : ""
}

export default function FeesSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>("ALL")
  const [editingFee, setEditingFee] = useState<FeeStructureRow | null>(null)

  const [scopeClassId, setScopeClassId] = useState("")
  const [selectedBatchForFeeScope, setSelectedBatchForFeeScope] = useState("")

  const [batchFeeClassId, setBatchFeeClassId] = useState("")
  const [batchFeeBatchId, setBatchFeeBatchId] = useState("")
  const [activeBatchFee, setActiveBatchFee] = useState<BatchFeeView | null>(null)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const feeForm = useForm<FeeStructureFormValues>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      name: "",
      amount: "",
      fee_type: "MONTHLY",
      description: "",
      batch_id: "",
    },
  })

  const batchFeeForm = useForm<BatchFeeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(batchFeeSchema) as any,
    defaultValues: {
      fee_type: "MONTHLY",
      amount: 0,
      currency: "BDT",
      description: "",
      start_date: "",
      end_date: "",
    },
  })

  const batchFeeType = batchFeeForm.watch("fee_type")

  const { data: classOptions = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["settings-fees-classes", tenantId],
    queryFn: async (): Promise<ClassOption[]> => {
      if (!tenantId) return []
      const payload = await financeApi.listTenantClasses(tenantId, { page: 1, limit: 100 })
      const items = extractArrayPayload(payload)
      return items
        .map((item: any) => ({
          id: String(item?.id ?? item?.class_id ?? "").trim(),
          name: String(item?.class_name ?? item?.name ?? "Unnamed Class").trim(),
        }))
        .filter((item: ClassOption) => item.id.length > 0)
    },
    enabled: !!tenantId,
  })

  const { data: scopeBatchOptions = [], isLoading: isScopeBatchesLoading } = useQuery({
    queryKey: ["settings-fees-scope-batches", tenantId, scopeClassId],
    queryFn: async (): Promise<BatchOption[]> => {
      if (!tenantId || !scopeClassId) return []
      const payload = await financeApi.listTenantBatches(tenantId, { page: 1, limit: 100, class_id: scopeClassId })
      const items = extractArrayPayload(payload)
      return items
        .map((item: any) => ({
          id: String(item?.id ?? item?.batch_id ?? "").trim(),
          name: String(item?.batch_name ?? item?.name ?? item?.section ?? "Unnamed Batch").trim(),
        }))
        .filter((item: BatchOption) => item.id.length > 0)
    },
    enabled: !!tenantId && !!scopeClassId,
  })

  const { data: batchFeeBatchOptions = [], isLoading: isBatchFeeBatchesLoading } = useQuery({
    queryKey: ["settings-fees-batch-fee-batches", tenantId, batchFeeClassId],
    queryFn: async (): Promise<BatchOption[]> => {
      if (!tenantId || !batchFeeClassId) return []
      const payload = await financeApi.listTenantBatches(tenantId, { page: 1, limit: 100, class_id: batchFeeClassId })
      const items = extractArrayPayload(payload)
      return items
        .map((item: any) => ({
          id: String(item?.id ?? item?.batch_id ?? "").trim(),
          name: String(item?.batch_name ?? item?.name ?? item?.section ?? "Unnamed Batch").trim(),
        }))
        .filter((item: BatchOption) => item.id.length > 0)
    },
    enabled: !!tenantId && !!batchFeeClassId,
  })

  const feeStructuresQueryKey = useMemo(
    () => ["settings-fee-structures", tenantId, search, feeTypeFilter] as const,
    [tenantId, search, feeTypeFilter],
  )

  const { data: feeRows = [], isLoading: isFeeRowsLoading } = useQuery({
    queryKey: feeStructuresQueryKey,
    queryFn: async (): Promise<FeeStructureRow[]> => {
      const payload = await financeApi.listFeeStructures({
        search: search.trim() || undefined,
        fee_type: feeTypeFilter !== "ALL" ? feeTypeFilter : undefined,
      })

      const items = extractArrayPayload(payload)
      return items
        .map((item: any) => ({
          id: String(item?.id ?? "").trim(),
          name: String(item?.name ?? "Unnamed Fee").trim(),
          description: item?.description ? String(item.description) : null,
          amount: String(item?.amount ?? "0"),
          fee_type: String(item?.fee_type ?? "OTHER").toUpperCase() as FeeType,
          batch_id: item?.batch_id ? String(item.batch_id) : null,
          created_at: item?.created_at ? String(item.created_at) : undefined,
        }))
        .filter((item: FeeStructureRow) => item.id.length > 0)
    },
    enabled: !!tenantId,
  })

  const saveFeeMutation = useMutation({
    mutationFn: async (values: FeeStructureFormValues) => {
      const payload = {
        name: values.name.trim(),
        amount: values.amount.trim(),
        fee_type: values.fee_type,
        description: values.description?.trim() || undefined,
        batch_id: values.batch_id?.trim() || undefined,
      }

      if (editingFee?.id) {
        return financeApi.updateFeeStructure(editingFee.id, payload)
      }

      return financeApi.createFeeStructure(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-fee-structures", tenantId] })
      toast.success(editingFee ? "Fee structure updated" : "Fee structure created")
      setEditingFee(null)
      setSelectedBatchForFeeScope("")
      feeForm.reset({
        name: "",
        amount: "",
        fee_type: "MONTHLY",
        description: "",
        batch_id: "",
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save fee structure")
    },
  })

  const deleteFeeMutation = useMutation({
    mutationFn: async (id: string) => financeApi.deleteFeeStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-fee-structures", tenantId] })
      toast.success("Fee structure deleted")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete fee structure")
    },
  })

  const [batchFeeLoadStatus, setBatchFeeLoadStatus] = useState<"idle" | "not_found" | "loaded">("idle")

  const loadBatchFeeMutation = useMutation({
    mutationFn: async ({ tenant, batchId }: { tenant: string | number; batchId: string }) =>
      financeApi.getBatchFee(tenant, batchId),
    onSuccess: (payload: any) => {
      // Backend may return the fee at different nesting levels — try all common shapes
      const raw = payload as any
      const fee = raw?.id
        ? raw
        : raw?.data?.id
          ? raw.data
          : raw?.fee?.id
            ? raw.fee
            : raw

      const feeId = String(fee?.id ?? "").trim()

      if (!feeId) {
        setActiveBatchFee(null)
        setBatchFeeLoadStatus("not_found")
        return
      }

      const normalized: BatchFeeView = {
        id: feeId,
        fee_type: String(fee?.fee_type ?? "MONTHLY").toUpperCase() as BatchFeeType,
        amount: Number(fee?.amount ?? 0),
        currency: fee?.currency ? String(fee.currency) : "BDT",
        description: fee?.description ? String(fee.description) : "",
        start_date: fee?.start_date ? String(fee.start_date) : "",
        end_date: fee?.end_date ? String(fee.end_date) : "",
        is_active: fee?.is_active !== false,
      }

      setActiveBatchFee(normalized)
      setBatchFeeLoadStatus("loaded")
      batchFeeForm.reset({
        fee_type: normalized.fee_type,
        amount: normalized.amount,
        currency: normalized.currency || "BDT",
        description: normalized.description || "",
        start_date: toDateInputValue(normalized.start_date),
        end_date: toDateInputValue(normalized.end_date),
      })
      toast.success("Active batch fee loaded")
    },
    onError: (error: any) => {
      setActiveBatchFee(null)
      const status = (error as any)?.response?.status
      if (status === 404) {
        setBatchFeeLoadStatus("not_found")
      } else {
        setBatchFeeLoadStatus("idle")
        toast.error(error?.message || "Failed to load batch fee")
      }
    },
  })

  const saveBatchFeeMutation = useMutation({
    mutationFn: async (values: BatchFeeFormValues) => {
      if (!tenantId || !batchFeeBatchId) throw new Error("Select class and batch first")

      const payload = {
        fee_type: values.fee_type,
        amount: Number(values.amount),
        currency: values.currency.trim(),
        description: values.description?.trim() || undefined,
        start_date: values.fee_type === "SESSION" ? values.start_date || undefined : undefined,
        end_date: values.fee_type === "SESSION" ? values.end_date || undefined : undefined,
      }

      if (activeBatchFee?.id) {
        return financeApi.updateBatchFee(tenantId, batchFeeBatchId, activeBatchFee.id, payload)
      }

      return financeApi.createBatchFee(tenantId, batchFeeBatchId, payload)
    },
    onSuccess: () => {
      toast.success(activeBatchFee?.id ? "Batch fee updated" : "Batch fee created")
      queryClient.invalidateQueries({ queryKey: ["settings-fee-structures"] })
      if (!tenantId || !batchFeeBatchId) return
      loadBatchFeeMutation.mutate({ tenant: tenantId, batchId: batchFeeBatchId })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save batch fee")
    },
  })

  const deactivateBatchFeeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !batchFeeBatchId || !activeBatchFee?.id) {
        throw new Error("No active fee selected")
      }
      return financeApi.deactivateBatchFee(tenantId, batchFeeBatchId, activeBatchFee.id)
    },
    onSuccess: () => {
      toast.success("Batch fee deactivated")
      queryClient.invalidateQueries({ queryKey: ["settings-fee-structures"] })
      setActiveBatchFee(null)
      batchFeeForm.reset({
        fee_type: "MONTHLY",
        amount: 0,
        currency: "BDT",
        description: "",
        start_date: "",
        end_date: "",
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to deactivate batch fee")
    },
  })

  const monthlyCount = feeRows.filter((item) => item.fee_type === "MONTHLY").length
  const admissionCount = feeRows.filter((item) => item.fee_type === "ADMISSION").length

  const startFeeEdit = (row: FeeStructureRow) => {
    setEditingFee(row)
    setSelectedBatchForFeeScope(row.batch_id ?? "")
    feeForm.reset({
      name: row.name,
      amount: String(row.amount),
      fee_type: row.fee_type,
      description: row.description ?? "",
      batch_id: row.batch_id ?? "",
    })
  }

  const cancelFeeEdit = () => {
    setEditingFee(null)
    setSelectedBatchForFeeScope("")
    feeForm.reset({
      name: "",
      amount: "",
      fee_type: "MONTHLY",
      description: "",
      batch_id: "",
    })
  }

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Fees Configuration</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Tenant information is missing. Please sign in again.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="rounded-2xl border bg-linear-to-r from-sky-50 via-cyan-50 to-emerald-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Fees Configuration</h1>
            <p className="text-sm text-slate-600">
              Configure fee structures and batch-specific active fees from backend payment APIs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Total Structures: {feeRows.length}</Badge>
            <Badge variant="muted">Monthly: {monthlyCount}</Badge>
            <Badge variant="success">Admission: {admissionCount}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{editingFee ? "Edit Fee Structure" : "Create Fee Structure"}</CardTitle>
            <CardDescription>
              Amount must be decimal string. Batch scope is optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...feeForm}>
              <form onSubmit={feeForm.handleSubmit((values) => saveFeeMutation.mutate(values))} className="space-y-4">
                <FormField
                  control={feeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Monthly Tuition Fee" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={feeForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="2500.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={feeForm.control}
                    name="fee_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            {feeTypeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel>Batch Scope Class (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        value={scopeClassId}
                        onValueChange={(value) => {
                          setScopeClassId(value)
                          setSelectedBatchForFeeScope("")
                          feeForm.setValue("batch_id", "")
                        }}
                        disabled={isClassesLoading}
                      >
                        <option value="">All Classes</option>
                        {classOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </FormItem>

                  <FormField
                    control={feeForm.control}
                    name="batch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Scope (Optional)</FormLabel>
                        <FormControl>
                          <Select
                            value={selectedBatchForFeeScope}
                            onValueChange={(value) => {
                              setSelectedBatchForFeeScope(value)
                              field.onChange(value)
                            }}
                            disabled={!scopeClassId || isScopeBatchesLoading}
                          >
                            <option value="">All Batches</option>
                            {scopeBatchOptions.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={feeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Optional details" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={saveFeeMutation.isPending}>
                    {saveFeeMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : editingFee ? "Update Structure" : "Create Structure"}
                  </Button>
                  {editingFee ? (
                    <Button type="button" variant="ghost" onClick={cancelFeeEdit}>Cancel Edit</Button>
                  ) : null}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Fee Structures</CardTitle>
            <CardDescription>Search and manage all configured fee structures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
                <option value="ALL">All Fee Types</option>
                {feeTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFeeRowsLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={`fee-skeleton-${index}`}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : feeRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No fee structure found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    feeRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          {row.description ? <p className="text-xs text-muted-foreground">{row.description}</p> : null}
                        </TableCell>
                        <TableCell><Badge variant="info">{row.fee_type}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(row.amount)}</TableCell>
                        <TableCell>{row.batch_id ? "Batch scoped" : "Global"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startFeeEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFeeMutation.mutate(row.id)}
                              disabled={deleteFeeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeDollarSign className="h-4 w-4" />
            Batch Fee Configuration
          </CardTitle>
          <CardDescription>
            Create or update the active fee for a specific batch using the tenant batch fee API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormItem>
              <FormLabel>Class</FormLabel>
              <FormControl>
                <Select
                  value={batchFeeClassId}
                  onValueChange={(value) => {
                    setBatchFeeClassId(value)
                    setBatchFeeBatchId("")
                    setActiveBatchFee(null)
                    setBatchFeeLoadStatus("idle")
                  }}
                  disabled={isClassesLoading}
                >
                  <option value="">Select class</option>
                  {classOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>Batch</FormLabel>
              <FormControl>
                <Select
                  value={batchFeeBatchId}
                  onValueChange={(value) => {
                    setBatchFeeBatchId(value)
                    setActiveBatchFee(null)
                    setBatchFeeLoadStatus("idle")
                  }}
                  disabled={!batchFeeClassId || isBatchFeeBatchesLoading}
                >
                  <option value="">Select batch</option>
                  {batchFeeBatchOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </FormControl>
            </FormItem>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!tenantId || !batchFeeBatchId || loadBatchFeeMutation.isPending}
                onClick={() => loadBatchFeeMutation.mutate({ tenant: tenantId, batchId: batchFeeBatchId })}
              >
                {loadBatchFeeMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                ) : (
                  <><RefreshCcw className="mr-2 h-4 w-4" />Load Active Fee</>
                )}
              </Button>
            </div>
          </div>

          {activeBatchFee ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ✓ Active fee loaded — {activeBatchFee.fee_type} | {formatMoney(activeBatchFee.amount)} {activeBatchFee.currency || "BDT"}
              {activeBatchFee.start_date ? ` | ${activeBatchFee.start_date} → ${activeBatchFee.end_date}` : ""}
            </div>
          ) : batchFeeLoadStatus === "not_found" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠ এই batch-এ কোনো active fee নেই। নিচের form পূরণ করে নতুন fee তৈরি করুন।
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Class ও Batch select করে &quot;Load Active Fee&quot; চাপুন।
            </div>
          )}

          <Form {...batchFeeForm}>
            <form onSubmit={batchFeeForm.handleSubmit((values) => saveBatchFeeMutation.mutate(values))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={batchFeeForm.control}
                  name="fee_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          {batchFeeTypeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={batchFeeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={batchFeeForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="BDT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {batchFeeType === "SESSION" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={batchFeeForm.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={batchFeeForm.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <FormField
                control={batchFeeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Optional description" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!batchFeeBatchId || saveBatchFeeMutation.isPending}>
                  {saveBatchFeeMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : activeBatchFee ? "Update Active Fee" : "Create Active Fee"}
                </Button>

                {activeBatchFee ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deactivateBatchFeeMutation.isPending}
                    onClick={() => deactivateBatchFeeMutation.mutate()}
                  >
                    {deactivateBatchFeeMutation.isPending ? "Deactivating..." : "Deactivate"}
                  </Button>
                ) : null}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
