"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import api from "@/lib/api"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

const subjectFormSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required"),
  code: z.string().trim().min(1, "Subject code is required"),
  is_active: z.boolean().default(true),
})

type SubjectFormValues = z.input<typeof subjectFormSchema>
type SubjectSubmitValues = z.output<typeof subjectFormSchema>

type SubjectApiItem = {
  id?: string
  name?: string
  code?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

type SubjectRow = {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapApiSubject(item: SubjectApiItem): SubjectRow {
  return {
    id: String(item?.id ?? `subject-${Date.now()}`),
    name: String(item?.name ?? "Unnamed Subject"),
    code: String(item?.code ?? "-"),
    is_active: item?.is_active !== false,
    created_at: String(item?.created_at ?? ""),
    updated_at: String(item?.updated_at ?? ""),
  }
}

function formatDate(value?: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

export default function SettingsSubjectsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRow, setSelectedRow] = useState<SubjectRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubjectRow | null>(null)

  const form = useForm<SubjectFormValues, any, SubjectSubmitValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      code: "",
      is_active: true,
    },
  })

  const subjectsQueryKey = useMemo(
    () => ["settings-subjects", tenantId, page, limit, searchQuery, statusFilter] as const,
    [tenantId, page, limit, searchQuery, statusFilter]
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: subjectsQueryKey,
    queryFn: async () => {
      if (!tenantId) return { items: [] as SubjectRow[], total: 0, totalPages: 1 }

      const params = {
        page,
        limit,
        search: searchQuery.trim() || "",
        is_active:
          statusFilter === "all"
            ? undefined
            : statusFilter === "active",
      }

      const response = await api.get(`/api/tenants/${tenantId}/subjects`, { params })
      const payload = response?.data
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : []

      const items = rawItems.map((item: SubjectApiItem) => mapApiSubject(item))
      const total = Number(payload?.meta?.total ?? payload?.total ?? items.length)
      const totalPages = Number(
        payload?.meta?.totalPages ?? payload?.totalPages ?? Math.max(1, Math.ceil(total / limit))
      )

      return {
        items,
        total,
        totalPages: Math.max(1, totalPages),
      }
    },
    enabled: !!tenantId,
  })

  const rows: SubjectRow[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const saveMutation = useMutation({
    mutationFn: async (values: SubjectSubmitValues) => {
      if (!tenantId) throw new Error("Tenant information missing")

      const payload = {
        name: values.name,
        code: values.code,
        is_active: values.is_active,
      }

      if (isEditMode && selectedRow) {
        const response = await api.patch(
          `/api/tenants/${tenantId}/subjects/${selectedRow.id}`,
          payload
        )
        return mapApiSubject(response?.data?.data ?? response?.data ?? { ...selectedRow, ...payload })
      }

      const response = await api.post(`/api/tenants/${tenantId}/subjects`, {
        name: values.name,
        code: values.code,
      })
      return mapApiSubject(response?.data?.data ?? response?.data ?? payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-subjects", tenantId] })
      toast.success(isEditMode ? "Subject updated" : "Subject created")
      setDialogOpen(false)
      setSelectedRow(null)
      setIsEditMode(false)
      form.reset({
        name: "",
        code: "",
        is_active: true,
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save subject")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (row: SubjectRow) => {
      if (!tenantId) throw new Error("Tenant information missing")
      await api.delete(`/api/tenants/${tenantId}/subjects/${row.id}`)
      return row.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-subjects", tenantId] })
      toast.success("Subject deleted")
      setDeleteTarget(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete subject")
    },
  })

  const openAddDialog = () => {
    setIsEditMode(false)
    setSelectedRow(null)
    form.reset({
      name: "",
      code: "",
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (row: SubjectRow) => {
    setIsEditMode(true)
    setSelectedRow(row)
    form.reset({
      name: row.name,
      code: row.code,
      is_active: row.is_active,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Create, update and manage the subject catalog for this tenant</p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search by subject name or code"
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}
          className="w-[180px]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </Select>

        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value))
            setPage(1)
          }}
          className="w-[120px]"
        >
          <option value="10">10 rows</option>
          <option value="20">20 rows</option>
          <option value="50">50 rows</option>
        </Select>

        {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="rounded-xl border bg-card p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`subject-skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No subjects found for the current filter.</p>
                    <Button size="sm" onClick={openAddDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: SubjectRow) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_active ? "info" : "muted"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>{formatDate(row.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-red-600"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} subjects
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saveMutation.isPending) {
            setDialogOpen(open)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Subject" : "Add Subject"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the selected subject." : "Create a new subject for this tenant."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Physics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                      <Input placeholder="PHY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditMode ? (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <FormLabel className="mb-0">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove the selected subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
