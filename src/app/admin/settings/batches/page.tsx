"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Archive, Loader2, Pencil, Plus } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
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
type BatchShift = "Morning" | "Day" | "Evening"

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
  shift: BatchShift
  capacity: number
  enrolled: number
  status: BatchStatus
  start_date?: string | null
  end_date?: string | null
}

const batchFormSchema = z.object({
  batch_name: z.string().trim().min(1, "Batch name is required"),
  class_id: z.string().trim().min(1, "Class is required"),
  shift: z.enum(["Morning", "Day", "Evening"], {
    message: "Shift is required",
  }),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.boolean().default(true),
})

type BatchFormValues = z.input<typeof batchFormSchema>
type BatchSubmitValues = z.output<typeof batchFormSchema>

const DUMMY_CLASSES: ClassOption[] = [
  { id: "c-6", name: "Class 6", status: "ACTIVE" },
  { id: "c-7", name: "Class 7", status: "ACTIVE" },
  { id: "c-8", name: "Class 8", status: "INACTIVE" },
  { id: "c-9", name: "Class 9", status: "ACTIVE" },
]

const DUMMY_BATCHES: BatchRow[] = [
  {
    id: "b-1",
    batch_name: "Batch 2025",
    class_id: "c-6",
    class_name: "Class 6",
    shift: "Morning",
    capacity: 30,
    enrolled: 18,
    status: "ACTIVE",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
  },
  {
    id: "b-2",
    batch_name: "Morning Group A",
    class_id: "c-7",
    class_name: "Class 7",
    shift: "Day",
    capacity: 30,
    enrolled: 30,
    status: "ACTIVE",
    start_date: "2026-01-01",
    end_date: null,
  },
  {
    id: "b-3",
    batch_name: "Evening Commerce",
    class_id: "c-9",
    class_name: "Class 9",
    shift: "Evening",
    capacity: 25,
    enrolled: 12,
    status: "ARCHIVED",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
  },
]

export default function SettingsBatchesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [classFilter, setClassFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  const [batchesState, setBatchesState] = useState<BatchRow[]>(DUMMY_BATCHES)
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
      shift: "Morning",
      capacity: 1,
      start_date: "",
      end_date: "",
      status: true,
    },
  })

  const { data: classOptions = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["settings-classes-options", tenantId],
    queryFn: async (): Promise<ClassOption[]> => {
      if (!tenantId) return []

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/classes", {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   cache: "no-store",
      // })
      // if (!response.ok) throw new Error("Failed to load classes")
      // const data = await response.json()
      // const raw = Array.isArray(data?.data) ? data.data : []
      // return raw.map((item: any) => ({
      //   id: String(item.id),
      //   name: String(item.class_name ?? item.name ?? `Class ${item.id}`),
      //   status: String(item.status ?? "ACTIVE").toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      // }))

      await new Promise((resolve) => setTimeout(resolve, 180))
      return DUMMY_CLASSES
    },
    enabled: !!tenantId,
  })

  const batchesQueryKey = useMemo(
    () => ["settings-batches", tenantId, classFilter, statusFilter, batchesState] as const,
    [tenantId, classFilter, statusFilter, batchesState]
  )

  const { data: rows = [], isLoading: isBatchesLoading } = useQuery({
    queryKey: batchesQueryKey,
    queryFn: async (): Promise<BatchRow[]> => {
      if (!tenantId) return []

      // API implementation intentionally commented for frontend-only flow.
      // const params = new URLSearchParams()
      // if (classFilter !== "All") params.set("class_id", classFilter)
      // if (statusFilter !== "All") params.set("status", statusFilter.toUpperCase())
      // const response = await fetch(`/admin/settings/batches?${params.toString()}`, {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   cache: "no-store",
      // })
      // if (!response.ok) throw new Error("Failed to load batches")
      // const data = await response.json()
      // return Array.isArray(data?.data) ? data.data : []

      await new Promise((resolve) => setTimeout(resolve, 260))

      return batchesState.filter((item) => {
        const classMatch = classFilter === "All" ? true : item.class_id === classFilter
        const statusMatch = statusFilter === "All" ? true : item.status === statusFilter.toUpperCase()
        return classMatch && statusMatch
      })
    },
    enabled: !!tenantId,
  })

  const activeClasses = classOptions.filter((item) => item.status === "ACTIVE")

  const saveMutation = useMutation({
    mutationFn: async (values: BatchSubmitValues) => {
      if (!tenantId) throw new Error("Tenant information missing")

      const selectedClass = classOptions.find((item) => item.id === values.class_id)
      if (!selectedClass) throw new Error("Selected class not found")

      const payload = {
        tenant_id: tenantId,
        batch_name: values.batch_name,
        class_id: values.class_id,
        shift: values.shift,
        capacity: values.capacity,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        status: values.status ? "ACTIVE" : "ARCHIVED",
      }

      if (isEditMode && selectedRow) {
        // API implementation intentionally commented for frontend-only flow.
        // const response = await fetch(`/admin/settings/batches/${selectedRow.id}`, {
        //   method: "PUT",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "x-tenant-id": String(tenantId),
        //   },
        //   body: JSON.stringify(payload),
        // })
        // if (!response.ok) throw new Error("Failed to update batch")

        await new Promise((resolve) => setTimeout(resolve, 250))
        return {
          id: selectedRow.id,
          ...payload,
          class_name: selectedClass.name,
          enrolled: selectedRow.enrolled,
        }
      }

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/batches", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   body: JSON.stringify(payload),
      // })
      // if (!response.ok) throw new Error("Failed to create batch")
      // const created = await response.json()

      await new Promise((resolve) => setTimeout(resolve, 250))
      return {
        id: `batch-${Date.now()}`,
        ...payload,
        class_name: selectedClass.name,
        enrolled: 0,
      }
    },
    onSuccess: (saved) => {
      const mapped: BatchRow = {
        id: String(saved.id),
        batch_name: saved.batch_name,
        class_id: saved.class_id,
        class_name: saved.class_name,
        shift: saved.shift,
        capacity: saved.capacity,
        enrolled: saved.enrolled,
        status: saved.status === "ACTIVE" ? "ACTIVE" : "ARCHIVED",
        start_date: saved.start_date,
        end_date: saved.end_date,
      }

      setBatchesState((prev) => {
        if (isEditMode && selectedRow) {
          return prev.map((item) => (item.id === selectedRow.id ? mapped : item))
        }
        return [mapped, ...prev]
      })

      queryClient.invalidateQueries({ queryKey: ["settings-batches", tenantId] })
      toast.success(isEditMode ? "Batch updated" : "Batch created")
      setDialogOpen(false)
      setIsEditMode(false)
      setSelectedRow(null)
      form.reset({
        batch_name: "",
        class_id: "",
        shift: "Morning",
        capacity: 1,
        start_date: "",
        end_date: "",
        status: true,
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save batch")
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (row: BatchRow) => {
      if (!tenantId) throw new Error("Tenant information missing")
      const nextStatus: BatchStatus = row.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch(`/admin/settings/batches/${row.id}/archive`, {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   body: JSON.stringify({ tenant_id: tenantId, archived: nextStatus === "ARCHIVED" }),
      // })
      // if (!response.ok) throw new Error("Failed to update archive status")

      await new Promise((resolve) => setTimeout(resolve, 200))
      return { id: row.id, status: nextStatus }
    },
    onSuccess: ({ id, status }) => {
      setBatchesState((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      queryClient.invalidateQueries({ queryKey: ["settings-batches", tenantId] })
      toast.success(status === "ARCHIVED" ? "Batch archived" : "Batch restored")
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
      shift: "Morning",
      capacity: 1,
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
      shift: row.shift,
      capacity: row.capacity,
      start_date: row.start_date || "",
      end_date: row.end_date || "",
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
              <TableHead>Shift</TableHead>
              <TableHead>Capacity</TableHead>
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
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
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
                    <TableCell>{row.shift}</TableCell>
                    <TableCell className={isFull ? "text-red-600 font-medium" : ""}>{row.capacity}</TableCell>
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
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="h-4 w-4" />
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
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="Morning">Morning</option>
                        <option value="Day">Day</option>
                        <option value="Evening">Evening</option>
                      </Select>
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
