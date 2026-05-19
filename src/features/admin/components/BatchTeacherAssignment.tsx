"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  Mail,
  Phone,
  Calendar,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import {
  assignTeacherToBatch,
  getBatches,
  getBatchSubjects,
  getTenantTeachers,
  getAllTeacherAssignments,
  type TeacherAssignmentView,
} from "../services/batchTeacherApi";

interface Batch {
  id: string;
  name: string;
  code?: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface Teacher {
  user_id: string;
  speciality_subject?: string[];
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function batchStatusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "ONGOING") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "UPCOMING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-200";
  if (s === "CANCELLED") return "bg-red-50 text-red-700 border-red-200";
  return "";
}

export default function BatchTeacherAssignment() {
  const { user, isAuthReady } = useAuth();

  // List view state
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<"all" | "active" | "inactive">("active");
  const [listBatchId, setListBatchId] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listLimit] = useState(10);

  // Modal / assign state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const tenantId = useMemo(() => {
    const userTenantId =
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id;

    if (userTenantId) return userTenantId;

    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          return (
            parsedUser?.tenant_id ??
            parsedUser?.tenantId ??
            parsedUser?.tenant?.id
          );
        }
      } catch {
        // ignore
      }
    }

    return "";
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = String((user as any)?.role ?? "").toUpperCase();
    return role === "ADMIN" || role === "REKTOR";
  }, [user]);

  // Batches — shared between list filter and assign modal
  const batchesQuery = useQuery({
    queryKey: ["admin-batches", tenantId],
    enabled: isAuthReady && !!tenantId && isAdmin,
    queryFn: async () => {
      const batches = await getBatches(tenantId);
      return Array.isArray(batches) ? batches : [];
    },
  });

  // Subjects for the batch selected inside the modal
  const subjectsQuery = useQuery({
    queryKey: ["admin-batch-subjects", tenantId, selectedBatch],
    enabled: isAuthReady && !!tenantId && !!selectedBatch && dialogOpen,
    queryFn: async () => {
      const subjects = await getBatchSubjects(tenantId, selectedBatch);
      return Array.isArray(subjects) ? subjects : [];
    },
  });

  // Teachers list for the modal picker
  const teachersQuery = useQuery({
    queryKey: ["admin-teachers", tenantId, searchTeacher],
    enabled: isAuthReady && !!tenantId && dialogOpen,
    queryFn: async () => {
      const teachers = await getTenantTeachers(tenantId, {
        search: searchTeacher || undefined,
        limit: 100,
      });
      return Array.isArray(teachers) ? teachers : [];
    },
  });

  // Assignments list view
  const assignmentsQuery = useQuery({
    queryKey: [
      "admin-all-teacher-assignments",
      tenantId,
      listPage,
      listLimit,
      listSearch,
      listStatus,
      listBatchId,
    ],
    enabled: isAuthReady && !!tenantId && isAdmin,
    queryFn: () =>
      getAllTeacherAssignments(tenantId, {
        page: listPage,
        limit: listLimit,
        search: listSearch || undefined,
        status: listStatus === "all" ? undefined : listStatus,
        batchId: listBatchId || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const batches: Batch[] = batchesQuery.data || [];
  const subjects: Subject[] = subjectsQuery.data || [];
  const teachers: Teacher[] = teachersQuery.data || [];
  const assignments: TeacherAssignmentView[] = assignmentsQuery.data?.data || [];
  const assignmentsMeta = assignmentsQuery.data?.meta;

  // Reset subject when batch changes within modal
  useEffect(() => {
    setSelectedSubject("");
  }, [selectedBatch]);

  const handleOpenDialog = () => {
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedTeacher("");
    setSearchTeacher("");
    setDialogOpen(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedBatch || !selectedSubject || !selectedTeacher) {
      toast.error("Please select batch, subject, and teacher");
      return;
    }

    setIsAssigning(true);
    try {
      const result = await assignTeacherToBatch(tenantId, selectedBatch, {
        subject_id: selectedSubject,
        teacher_id: selectedTeacher,
      });

      if (result.success) {
        toast.success("Teacher assigned successfully");
        setDialogOpen(false);
        await assignmentsQuery.refetch();
      } else {
        toast.error(result.message || "Failed to assign teacher");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while assigning teacher");
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="adm-root space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="adm-root space-y-4">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Access Restricted</h3>
            <p className="text-sm text-orange-800">
              You must be an admin to access this module.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filtersActive = !!listSearch || !!listBatchId || listStatus !== "active";

  return (
    <div className="adm-root space-y-6">
      {/* Header */}
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Teacher Assignments</h1>
          <p>View all class–teacher assignments and assign new ones</p>
        </div>
        <div className="adm-topbar-right">
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-1.5 h-4 w-4" />
            Assign Teacher
          </Button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Assignments
            {assignmentsMeta && assignmentsMeta.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {assignmentsMeta.total}
              </Badge>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => assignmentsQuery.refetch()}
              disabled={assignmentsQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  assignmentsQuery.isFetching ? "animate-spin" : ""
                }`}
              />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by teacher, class, batch, or subject…"
                className="pl-9 pr-9"
                value={listSearch}
                onChange={(e) => {
                  setListSearch(e.target.value);
                  setListPage(1);
                }}
              />
              {listSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setListSearch("");
                    setListPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3">
              <Select
                value={listBatchId}
                onValueChange={(v) => {
                  setListBatchId(v);
                  setListPage(1);
                }}
              >
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.code || b.id}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select
                value={listStatus}
                onValueChange={(v) => {
                  setListStatus(v as "all" | "active" | "inactive");
                  setListPage(1);
                }}
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All statuses</option>
              </Select>
            </div>
          </div>

          {filtersActive && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters applied</span>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setListSearch("");
                  setListBatchId("");
                  setListStatus("active");
                  setListPage(1);
                }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Content */}
          {assignmentsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No assignments found
              </p>
              <p className="text-xs text-muted-foreground">
                {filtersActive
                  ? "Try adjusting your filters"
                  : "Click “Assign Teacher” to create the first one"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border bg-white">
                <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "8%" }} />
                  </colgroup>
                  <thead className="bg-slate-50/80">
                    <tr className="border-b">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Teacher
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Class
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Batch
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Subject
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Assigned
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr
                        key={a.assignment_id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Teacher */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold shadow-sm">
                              {getInitials(a.teacher.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {a.teacher.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {a.teacher.teacher_id}
                                </span>
                              </div>
                              {a.teacher.email && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{a.teacher.email}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                              <GraduationCap className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {a.class.name}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {a.class.level && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {a.class.level}
                                  </span>
                                )}
                                {a.class.group && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {a.class.group}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Batch */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {a.batch.name}
                                {a.batch.section && (
                                  <span className="text-slate-400 font-normal"> · {a.batch.section}</span>
                                )}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {a.batch.shift && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                                    {a.batch.shift.toLowerCase()}
                                  </span>
                                )}
                                {a.batch.status && (
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${batchStatusClass(a.batch.status)}`}
                                  >
                                    {a.batch.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {a.subject.name}
                              </p>
                              {a.subject.code && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {a.subject.code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Assigned date */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(a.assigned_at)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 align-middle">
                          {a.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Removed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {assignments.map((a) => (
                  <div
                    key={a.assignment_id}
                    className="rounded-lg border p-3 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {getInitials(a.teacher.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.teacher.name}</p>
                          <p className="text-[11px] text-muted-foreground">{a.teacher.teacher_id}</p>
                        </div>
                      </div>
                      {a.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 shrink-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">Removed</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-start gap-1.5">
                        <GraduationCap className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class</p>
                          <p className="font-medium">{a.class.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Layers className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Batch</p>
                          <p className="font-medium">{a.batch.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 col-span-2">
                        <BookOpen className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</p>
                          <p className="font-medium">{a.subject.name}</p>
                        </div>
                      </div>
                    </div>

                    {(a.teacher.email || a.teacher.phone) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t text-[11px] text-muted-foreground">
                        {a.teacher.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" />
                            {a.teacher.email}
                          </span>
                        )}
                        {a.teacher.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {a.teacher.phone}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(a.assigned_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {assignmentsMeta && assignmentsMeta.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium">
                      {(assignmentsMeta.page - 1) * assignmentsMeta.limit + 1}
                    </span>
                    {"–"}
                    <span className="font-medium">
                      {Math.min(
                        assignmentsMeta.page * assignmentsMeta.limit,
                        assignmentsMeta.total
                      )}
                    </span>{" "}
                    of <span className="font-medium">{assignmentsMeta.total}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!assignmentsMeta.hasPrev || assignmentsQuery.isFetching}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Previous
                    </Button>
                    <span className="px-2 text-xs text-muted-foreground">
                      Page {assignmentsMeta.page} of {assignmentsMeta.totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!assignmentsMeta.hasNext || assignmentsQuery.isFetching}
                      onClick={() => setListPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assign Teacher Dialog — full assign workflow */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>
              Choose a batch and subject, then pick a teacher to assign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Batch & Subject */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Batch
                </label>
                {batchesQuery.isLoading ? (
                  <Skeleton className="h-9" />
                ) : (
                  <Select
                    value={selectedBatch}
                    onValueChange={setSelectedBatch}
                    emptyMessage="No batches found"
                  >
                    <option value="">— Choose a batch —</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.code || b.id}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Subject
                </label>
                {selectedBatch && subjectsQuery.isLoading ? (
                  <Skeleton className="h-9" />
                ) : (
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    disabled={!selectedBatch}
                    emptyMessage={
                      !selectedBatch
                        ? "Select a batch first"
                        : "No subjects found"
                    }
                  >
                    <option value="">— Choose a subject —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.code || s.id}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </div>

            {/* Step 2: Teacher */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Teacher
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name or email…"
                  className="pl-9"
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                />
              </div>

              {teachersQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : teachers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No teachers found
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                  {teachers.map((teacher) => {
                    const tid = teacher.user_id;
                    const isSelected = selectedTeacher === tid;
                    return (
                      <div
                        key={tid}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedTeacher(tid)}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-blue-600 bg-blue-600"
                              : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                          {getInitials(teacher.user?.name || "")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {teacher.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {teacher.user?.email}
                          </p>
                          {teacher.speciality_subject && teacher.speciality_subject.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {teacher.speciality_subject.slice(0, 3).map((s) => (
                                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignTeacher}
              disabled={
                isAssigning ||
                !selectedBatch ||
                !selectedSubject ||
                !selectedTeacher
              }
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                "Assign Teacher"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
