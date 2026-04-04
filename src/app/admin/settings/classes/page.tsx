"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
import { useCreateClassMutation, useUpdateClassMutation } from "@/features/user/userApi"
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

type ClassSection = "Science" | "Commerce" | "Arts" | "General"

type ClassRow = {
  id: string
  class_name: string
  sections: ClassSection[]
  capacity: number
  status: "ACTIVE" | "INACTIVE"
}

const classFormSchema = z.object({
  class_name: z.string().trim().min(1, "Class name is required"),
  sections: z.array(z.enum(["Science", "Commerce", "Arts", "General"])).min(1, "Select at least one section"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  status: z.boolean().default(true),
})

type ClassFormValues = z.input<typeof classFormSchema>
type ClassSubmitValues = z.output<typeof classFormSchema>

const SECTION_OPTIONS: ClassSection[] = ["Science", "Commerce", "Arts", "General"]

const DUMMY_CLASSES: ClassRow[] = [
  { id: "c-6", class_name: "Class 6", sections: ["General"], capacity: 120, status: "ACTIVE" },
  { id: "c-7", class_name: "Class 7", sections: ["Science", "General"], capacity: 100, status: "ACTIVE" },
  { id: "c-8", class_name: "Class 8", sections: ["Commerce", "Arts"], capacity: 80, status: "INACTIVE" },
]

export default function SettingsClassesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [createClassApiCall] = useCreateClassMutation()
  const [updateClassApiCall] = useUpdateClassMutation()

  const [classesState, setClassesState] = useState<ClassRow[]>(DUMMY_CLASSES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRow, setSelectedRow] = useState<ClassRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassRow | null>(null)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const form = useForm<ClassFormValues, any, ClassSubmitValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      class_name: "",
      sections: ["General"],
      capacity: 1,
      status: true,
    },
  })

  const classesQueryKey = useMemo(
    () => ["settings-classes", tenantId, classesState] as const,
    [tenantId, classesState]
  )

  const { data: rows = [], isLoading } = useQuery({
    queryKey: classesQueryKey,
    queryFn: async (): Promise<ClassRow[]> => {
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
      // return Array.isArray(data?.data) ? data.data : []

      await new Promise((resolve) => setTimeout(resolve, 250))
      return classesState
    },
    enabled: !!tenantId,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: ClassSubmitValues) => {
      if (!tenantId) throw new Error("Tenant information missing")

      const classPayload = {
        name: values.class_name,
        description: "",
        subject: values.sections[0] || "General",
        level: "Beginner",
      }

      if (isEditMode && selectedRow) {
        // Edit mode: call RTK Query mutation for PATCH
        try {
          const result = await updateClassApiCall({
            tenantId: tenantId || 1,
            classId: selectedRow.id,
            classData: classPayload,
          }).unwrap()
          return {
            id: result?.id || selectedRow.id,
            class_name: values.class_name,
            sections: values.sections,
            capacity: values.capacity,
            status: values.status ? "ACTIVE" : "INACTIVE",
          }
        } catch (error: unknown) {
          const maybeError = error as { data?: { message?: string }; message?: string }
          throw new Error(
            maybeError?.data?.message ||
              maybeError?.message ||
              "Failed to update class"
          )
        }
      }

      // Create mode: call RTK Query mutation for POST
      try {
        const result = await createClassApiCall({ tenantId: tenantId || 1, classData: classPayload }).unwrap()
        return {
          id: result?.id || `cls-${Date.now()}`,
          class_name: values.class_name,
          sections: values.sections,
          capacity: values.capacity,
          status: values.status ? "ACTIVE" : "INACTIVE",
        }
      } catch (error: unknown) {
        const maybeError = error as { data?: { message?: string }; message?: string }
        throw new Error(
          maybeError?.data?.message ||
            maybeError?.message ||
            "Failed to create class"
        )
      }
    },
    onSuccess: (savedRow) => {
      const mapped: ClassRow = {
        id: String(savedRow.id),
        class_name: savedRow.class_name,
        sections: savedRow.sections,
        capacity: savedRow.capacity,
        status: savedRow.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      }

      setClassesState((prev) => {
        if (isEditMode && selectedRow) {
          return prev.map((item) => (item.id === selectedRow.id ? mapped : item))
        }
        return [mapped, ...prev]
      })

      queryClient.invalidateQueries({ queryKey: ["settings-classes", tenantId] })
      toast.success(isEditMode ? "Class updated" : "Class created")

      setDialogOpen(false)
      setSelectedRow(null)
      setIsEditMode(false)
      form.reset({
        class_name: "",
        sections: ["General"],
        capacity: 1,
        status: true,
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save class")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (row: ClassRow) => {
      if (!tenantId) throw new Error("Tenant information missing")

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch(`/admin/settings/classes/${row.id}`, {
      //   method: "DELETE",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   body: JSON.stringify({ tenant_id: tenantId }),
      // })
      // if (!response.ok) throw new Error("Failed to delete class")

      await new Promise((resolve) => setTimeout(resolve, 250))
      return row.id
    },
    onSuccess: (deletedId) => {
      setClassesState((prev) => prev.filter((item) => item.id !== deletedId))
      queryClient.invalidateQueries({ queryKey: ["settings-classes", tenantId] })
      toast.success("Class deleted")
      setDeleteTarget(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete class")
    },
  })

  const openAddDialog = () => {
    setIsEditMode(false)
    setSelectedRow(null)
    form.reset({
      class_name: "",
      sections: ["General"],
      capacity: 1,
      status: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (row: ClassRow) => {
    setIsEditMode(true)
    setSelectedRow(row)
    form.reset({
      class_name: row.class_name,
      sections: row.sections,
      capacity: row.capacity,
      status: row.status === "ACTIVE",
    })
    setDialogOpen(true)
  }

  const onDialogSave = (values: ClassSubmitValues) => {
    saveMutation.mutate(values)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-muted-foreground">Manage academic classes for your school</p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class Name</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`class-skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No classes yet. Add your first class.</p>
                    <Button size="sm" onClick={openAddDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Class
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.class_name}</TableCell>
                  <TableCell>{row.sections.join(", ")}</TableCell>
                  <TableCell>{row.capacity}</TableCell>
                  <TableCell>
                    <Badge
                      className={row.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}
                    >
                      {row.status === "ACTIVE" ? "Active" : "Inactive"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Class" : "Add Class"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update class information." : "Create a new academic class."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onDialogSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Class 6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sections</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {SECTION_OPTIONS.map((section) => {
                          const checked = field.value?.includes(section)

                          return (
                            <label key={section} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={checked}
                                onChange={(event) => {
                                  const next = new Set(field.value ?? [])
                                  if (event.target.checked) next.add(section)
                                  else next.delete(section)
                                  field.onChange(Array.from(next))
                                }}
                              />
                              {section}
                            </label>
                          )
                        })}
                      </div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete class?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this class will also affect linked batches. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
