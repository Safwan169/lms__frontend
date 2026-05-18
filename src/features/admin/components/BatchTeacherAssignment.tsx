"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  ChevronRight,
  UserCheck,
  Users,
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
  getBatchTeachers,
  removeTeacherFromBatch,
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

interface AssignedTeacher {
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string | null;
}

export default function BatchTeacherAssignment() {
  const { user, isAuthReady } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const batchesQuery = useQuery({
    queryKey: ["admin-batches", tenantId],
    enabled: isAuthReady && !!tenantId,
    queryFn: async () => {
      const batches = await getBatches(tenantId);
      return Array.isArray(batches) ? batches : [];
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ["admin-batch-subjects", tenantId, selectedBatch],
    enabled: isAuthReady && !!tenantId && !!selectedBatch,
    queryFn: async () => {
      const subjects = await getBatchSubjects(tenantId, selectedBatch);
      return Array.isArray(subjects) ? subjects : [];
    },
  });

  const teachersQuery = useQuery({
    queryKey: ["admin-teachers", tenantId, searchTeacher],
    enabled: isAuthReady && !!tenantId,
    queryFn: async () => {
      const teachers = await getTenantTeachers(tenantId, {
        search: searchTeacher || undefined,
        limit: 100,
      });
      return Array.isArray(teachers) ? teachers : [];
    },
  });

  // GET /batches/:id/teachers — all subject-teacher mappings for this batch
  const assignedTeachersQuery = useQuery({
    queryKey: ["admin-assigned-teachers", tenantId, selectedBatch],
    enabled: isAuthReady && !!tenantId && !!selectedBatch,
    queryFn: async () => {
      const mappings = await getBatchTeachers(tenantId, selectedBatch);
      return Array.isArray(mappings) ? mappings : [];
    },
  });

  const batches: Batch[] = batchesQuery.data || [];
  const subjects: Subject[] = subjectsQuery.data || [];
  const teachers: Teacher[] = teachersQuery.data || [];

  // Filter mappings by the selected subject
  const assignedTeachers: AssignedTeacher[] = useMemo(() => {
    const all: AssignedTeacher[] = assignedTeachersQuery.data || [];
    if (!selectedSubject) return [];
    return all.filter((m) => m.subject_id === selectedSubject);
  }, [assignedTeachersQuery.data, selectedSubject]);

  const selectedBatchName = useMemo(
    () => batches.find((b) => b.id === selectedBatch)?.name || "",
    [batches, selectedBatch]
  );

  const selectedSubjectName = useMemo(
    () => subjects.find((s) => s.id === selectedSubject)?.name || "",
    [subjects, selectedSubject]
  );

  const getTeacherName = (teacher: Teacher) => teacher.user?.name || "Unknown";

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
        setSelectedTeacher("");
        setDialogOpen(false);
        await assignedTeachersQuery.refetch();
      } else {
        toast.error(result.message || "Failed to assign teacher");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while assigning teacher");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenDialog = () => {
    setSelectedTeacher("");
    setSearchTeacher("");
    setDialogOpen(true);
  };

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = String((user as any)?.role ?? "").toUpperCase();
    return role === "ADMIN" || role === "REKTOR";
  }, [user]);

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

  return (
    <div className="adm-root space-y-6">
      {/* Header */}
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Assign Teacher</h1>
          <p>Select a batch and subject, then assign teachers</p>
        </div>
      </div>

      {/* Step 1 — Batch & Subject Selection */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">1. Select Batch & Subject</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Batch */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Batch</label>
              {batchesQuery.isLoading ? (
                <Skeleton className="h-9" />
              ) : (
                <Select
                  value={selectedBatch}
                  onValueChange={(value) => {
                    setSelectedBatch(value);
                    setSelectedSubject("");
                  }}
                  emptyMessage="No batches found. Create a batch first."
                >
                  <option value="">— Choose a batch —</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name || batch.code || batch.id}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
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
                      : "No subjects found for this batch"
                  }
                >
                  <option value="">— Choose a subject —</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name || subject.code || subject.id}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          {/* Context path */}
          {selectedBatch && selectedSubject && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{selectedBatchName}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium">{selectedSubjectName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — Assigned Teachers */}
      {selectedBatch && selectedSubject && (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">2. Assigned Teachers</span>
            <div className="ml-auto flex items-center gap-2">
              {assignedTeachers.length > 0 && (
                <Badge variant="secondary">{assignedTeachers.length}</Badge>
              )}
              <Button size="sm" onClick={handleOpenDialog}>
                <Plus className="mr-1.5 h-4 w-4" />
                Assign Teacher
              </Button>
            </div>
          </div>

          <div className="p-6">
            {assignedTeachersQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : assignedTeachers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  No teachers assigned yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Click &ldquo;Assign Teacher&rdquo; to get started
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {assignedTeachers.map((teacher) => (
                  <div
                    key={teacher.teacher_id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{teacher.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{teacher.teacher_email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={async () => {
                        const res = await removeTeacherFromBatch(tenantId, selectedBatch, teacher.subject_id);
                        if (res.success) {
                          toast.success("Teacher removed");
                          assignedTeachersQuery.refetch();
                        } else {
                          toast.error(res.message || "Failed to remove");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Teacher Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>
              {selectedSubjectName
                ? `Choose a teacher for ${selectedSubjectName}`
                : "Select a teacher to assign to this subject"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9"
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
              />
            </div>

            {/* Teacher list */}
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
              <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
                {teachers.map((teacher) => {
                  const tid = teacher.user_id;
                  const isSelected = selectedTeacher === tid;
                  return (
                    <div
                      key={tid}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-muted/50"
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {getTeacherName(teacher)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {teacher.user?.email}
                        </p>
                        {teacher.speciality_subject && teacher.speciality_subject.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {teacher.speciality_subject.slice(0, 3).map((s) => (
                              <Badge key={s} variant="outline" className="text-xs px-1.5 py-0">
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
              disabled={isAssigning || !selectedTeacher}
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
