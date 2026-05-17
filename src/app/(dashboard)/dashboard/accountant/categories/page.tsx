"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Edit2, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { asList } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type CategoryRow = {
  id: string
  name: string
  type?: "REVENUE" | "EXPENSE" | "BOTH"
  description?: string | null
  is_active?: boolean
  _count?: { ledgers?: number; revenues?: number; expenses?: number }
}

type CategoryForm = {
  name: string
  type: "REVENUE" | "EXPENSE" | "BOTH"
  description: string
  is_active: boolean
}

const EMPTY_FORM: CategoryForm = {
  name: "",
  type: "BOTH",
  description: "",
  is_active: true,
}

const TYPE_OPTIONS = ["all", "REVENUE", "EXPENSE", "BOTH"]

export default function AccountantCategoriesPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)

  const query = useQuery({
    queryKey: ["accounting", "categories", { typeFilter, search }],
    queryFn: () =>
      accountingApi.listCategories({
        type: typeFilter === "all" ? undefined : typeFilter,
        search: search || undefined,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) throw new Error("Name is required")
      if (editing) {
        return accountingApi.updateCategory(editing.id, {
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || null,
          is_active: form.is_active,
        })
      }
      return accountingApi.createCategory({
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created")
      setDialogOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      queryClient.invalidateQueries({ queryKey: ["accounting", "categories"] })
    },
    onError: (error: any) => toast.error(error?.message || "Save failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted")
      queryClient.invalidateQueries({ queryKey: ["accounting", "categories"] })
    },
    onError: (error: any) => toast.error(error?.message || "Cannot delete — deactivate instead"),
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(row: CategoryRow) {
    setEditing(row)
    setForm({
      name: row.name,
      type: (row.type as any) ?? "BOTH",
      description: row.description ?? "",
      is_active: row.is_active ?? true,
    })
    setDialogOpen(true)
  }

  const items = useMemo(() => asList<CategoryRow>(query.data as any), [query.data])

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">Classify revenue and expense entries with reusable categories.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAdd}><Plus className="mr-2 size-4" /> Add Category</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["accounting", "categories"] })}>
            <RefreshCcw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Type</p>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">Search by name</p>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. tuition" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No categories yet.</TableCell></TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell><Badge variant="muted">{row.type ?? "BOTH"}</Badge></TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">{row.description ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={row.is_active ? "default" : "destructive"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        L: {row._count?.ledgers ?? 0} · R: {row._count?.revenues ?? 0} · E: {row._count?.expenses ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit2 className="size-3" /></Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Delete category "${row.name}"? (deactivate instead if it has linked records)`)) deleteMutation.mutate(row.id)
                            }}
                          >
                            <Trash2 className="size-3" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium">Name *</p>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuition Fees" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Type *</p>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <option value="REVENUE">REVENUE</option>
                <option value="EXPENSE">EXPENSE</option>
                <option value="BOTH">BOTH</option>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Description</p>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            {editing ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Active</span>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null) }}>Cancel</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
