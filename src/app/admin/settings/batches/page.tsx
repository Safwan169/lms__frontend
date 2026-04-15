"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Archive, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { useCreateBatchMutation, useUpdateBatchMutation, useDeleteBatchMutation } from "@/features/user/userApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"

type BatchStatus = "ACTIVE" | "ARCHIVED"
type ClassOption = {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE"
}

type BatchRow = {
  id: string
  batch_name: string
  class_id: string
  class_name: string
  section: string
  capacity: number
  enrolled: number
  fee?: string | null
  status: BatchStatus
  start_date?: string | null
  end_date?: string | null
}

const batchFormSchema = z.object({
  batch_name: z.string().trim().min(1, "Batch name is required"),
  class_id: z.string().trim().min(1, "Class is required"),
  section: z.string().trim().min(1, "Section is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  fee: z.string().trim().min(1, "Fee is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.boolean().default(true),
})

type BatchFormValues = z.input<typeof batchFormSchema>
type BatchSubmitValues = z.output<typeof batchFormSchema>

function toDateInputValue(value?: string | null) {
  if (!value) return ""

  const isoDateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
  if (isoDateMatch) return isoDateMatch[0]

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""

  return parsed.toISOString().split("T")[0] ?? ""
}

export default function SettingsBatchesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [createBatchApiCall] = useCreateBatchMutation()
  const [updateBatchApiCall] = useUpdateBatchMutation()
  const [deleteBatchApiCall] = useDeleteBatchMutation()

  const [classFilter, setClassFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRow, setSelectedRow] = useState<BatchRow | null>(null)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const form = useForm<BatchFormValues, any, BatchSubmitValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      batch_name: "",
      class_id: "",
      section: "A",
      capacity: 1,
      fee: "",
      start_date: "",
      end_date: "",
      status: true,
    },
  })

  const { data: classOptions = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["settings-classes-options", tenantId],
    queryFn: async (): Promise<ClassOption[]> => {
      if (!tenantId) return []

      const response = await api.get(`/api/tenants/${tenantId}/classes`, {
        params: {
          page: 1,
          limit: 100,
        },
      })

      const payload = response?.data
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

      return rawItems
        .map((item: any) => ({
          id: String(item?.id ?? item?.class_id ?? "").trim(),
          name: String(item?.class_name ?? item?.name ?? `Class ${item?.id ?? ""}`).trim(),
          status: String(item?.status ?? "ACTIVE").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        }))
        .filter((item: ClassOption) => item.id.length > 0)
    },
    enabled: !!tenantId,
  })

  const batchesQueryKey = useMemo(
    () => ["settings-batches", tenantId, classFilter, statusFilter] as const,
    [tenantId, classFilter, statusFilter]
  )

  const { data: rows = [], isLoading: isBatchesLoading } = useQuery({
    queryKey: batchesQueryKey,
    queryFn: async (): Promise<BatchRow[]> => {
      if (!tenantId) return []

      const params: Record<string, string | number> = {
        page: 1,
        limit: 100,
      }
      if (classFilter !== "All") params.class_id = classFilter

      const response = await api.get(`/api/tenants/${tenantId}/batches`, { params })
      const payload = response?.data
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

      return rawItems
        .map((item: any) => ({
          id: String(item?.id ?? item?.batch_id ?? "").trim(),
          batch_name: String(item?.batch_name ?? item?.name ?? "Unnamed Batch").trim(),
          class_id: String(item?.class_id ?? item?.class?.id ?? "").trim(),
          class_name: String(item?.class_name ?? item?.class?.name ?? "Unknown Class").trim(),
          section: String(item?.section ?? "-").trim(),
          capacity: Number(item?.capacity ?? 0),
          enrolled: Number(item?.enrolled ?? item?.enrolled_count ?? item?.student_count ?? 0),
          fee: item?.fee != null ? String(item.fee) : null,
          status: String(item?.status ?? "ACTIVE").toUpperCase() === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
          start_date: item?.start_date ? String(item.start_date) : null,
          end_date: item?.end_date ? String(item.end_date) : null,
        }))
        .filter((item: BatchRow) => item.id.length > 0)
        .filter((item: BatchRow) => (statusFilter === "All" ? true : item.status === statusFilter.toUpperCase()))
    },
    enabled: !!tenantId,
  })

  const activeClasses = classOptions.filter((item) => item.status === "ACTIVE")

  const saveMutation = useMutation({
    mutationFn: async (values: BatchSubmitValues) => {
      if (!tenantId) throw new Error("Tenant information missing")

      const selectedClass = classOptions.find((item) => item.id === values.class_id)
      if (!selectedClass) throw new Error("Selected class not found")

      const batchPayload = {
        class_id: values.class_id,
        name: values.batch_name,
        section: values.section,
        capacity: values.capacity,
        fee: values.fee,
        start_date: values.start_date ? new Date(values.start_date).toISOString() : undefined,
        end_date: values.end_date ? new Date(values.end_date).toISOString() : undefined,
        status: (values.status ? "ACTIVE" : "ARCHIVED") as "ACTIVE" | "ARCHIVED",
      }

      if (isEditMode && selectedRow) {
        try {
          await updateBatchApiCall({
            tenantId: tenantId || 1,
            batchId: selectedRow.id,
            batch: batchPayload,
          }).unwrap()
        } catch (error: unknown) {
          const maybeError = error as { data?: { message?: string }; message?: string }
          throw new Error(maybeError?.data?.message || maybeError?.message || "Failed to update batch")
        }
        return
      }

      try {
        await createBatchApiCall({ tenantId: tenantId || 1, batch: batchPayload }).unwrap()
        return
      } catch (error: unknown) {
        const maybeError = error as { data?: { message?: string }; message?: string }
        throw new Error(
          maybeError?.data?.message ||
            maybeError?.message ||
            "Failed to create batch"
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-batches", tenantId] })
      toast.success(isEditMode ? "Batch updated" : "Batch created")
      setDialogOpen(false)
      setIsEditMode(false)
      setSelectedRow(null)
      form.reset({
        batch_name: "",
        class_id: "",
        section: "A",
        capacity: 1,
        fee: "",
        start_date: "",
        end_date: "",
        status: true,
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save batch")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (row: BatchRow) => {
      if (!tenantId) throw new Error("Tenant information missing")
      try {
        await deleteBatchApiCall({ tenantId: tenantId || 1, batchId: row.id }).unwrap()
      } catch (error: unknown) {
        const maybeError = error as { data?: { message?: string }; message?: string }
        throw new Error(maybeError?.data?.message || maybeError?.message || "Failed to delete batch")
      }
      return row.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-batches", tenantId] })
      toast.success("Batch deleted")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete batch")
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (_row: BatchRow) => {
      if (!tenantId) throw new Error("Tenant information missing")
      throw new Error("Archive action is not connected to a backend endpoint yet")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update batch")
    },
  })

  const openAddDialog = () => {
    setIsEditMode(false)
    setSelectedRow(null)
    form.reset({
      batch_name: "",
      class_id: "",
      section: "A",
      capacity: 1,
      fee: "",
      start_date: "",
      end_date: "",
      status: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (row: BatchRow) => {
    setIsEditMode(true)
    setSelectedRow(row)
    form.reset({
      batch_name: row.batch_name,
      class_id: row.class_id,
      section: row.section,
      capacity: row.capacity,
      fee: row.fee ?? "",
      start_date: toDateInputValue(row.start_date),
      end_date: toDateInputValue(row.end_date),
      status: row.status === "ACTIVE",
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Batches</h1>
          <p className="text-sm text-muted-foreground">Manage batches linked to each class</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Batch
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Select
          value={classFilter}
          onValueChange={setClassFilter}
          className="w-[220px]"
          disabled={isClassesLoading}
        >
          <option value="All">All Classes</option>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter} className="w-[180px]">
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Archived">Archived</option>
        </Select>
      </div>

      <div className="rounded-xl border bg-card p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isBatchesLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`batch-skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No batches found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isFull = row.enrolled >= row.capacity
                return (
                  <TableRow key={row.id} className={row.status === "ARCHIVED" ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{row.batch_name}</TableCell>
                    <TableCell>{row.class_name}</TableCell>
                    <TableCell>{row.section}</TableCell>
                    <TableCell className={isFull ? "text-red-600 font-medium" : ""}>{row.capacity}</TableCell>
                    <TableCell>{row.fee ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={isFull ? "text-red-600 font-medium" : ""}>{`${row.enrolled} / ${row.capacity}`}</span>
                        {isFull ? <Badge variant="destructive">Full</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "ACTIVE" ? "info" : "muted"}>
                        {row.status === "ACTIVE" ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => archiveMutation.mutate(row)}
                          disabled
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(row)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Batch" : "Add Batch"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update batch details." : "Create a new batch for a class."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="batch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Batch 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="">Select class</option>
                        {activeClasses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <FormControl>
                      <Input placeholder="2500.00" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
