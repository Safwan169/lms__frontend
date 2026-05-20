"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Copy,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldAlert,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react"
import toast from "react-hot-toast"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type TenantStudent = {
  id: string
  tenant_id: string
  machine_id: string | null
  name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  joining_date: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  admission: {
    enrollment_id?: string
    status?: string
    admission_type?: string
    enrolled_at?: string
    class?: {
      id: string
      name: string
      code?: string | null
      group?: string | null
      level?: string | null
    } | null
    batch?: {
      id: string
      name: string
      section?: string | null
      shift?: string | null
      status?: string | null
      start_date?: string | null
      end_date?: string | null
    } | null
  } | null
  studentProfile: {
    student_id?: string | null
    guardian_name?: string | null
    guardian_phone?: string | null
    address?: string | null
    school_name?: string | null
    date_of_birth?: string | null
    blood_group?: string | null
    gender?: "MALE" | "FEMALE" | "OTHER" | null
    profile_completion_pct?: number | null
    created_at?: string
    updated_at?: string
  } | null
}

type ProfileTab = "overview" | "academic" | "guardian" | "account"

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "academic", label: "Academic" },
  { id: "guardian", label: "Guardian" },
  { id: "account", label: "Account" },
]

function getInitials(name?: string | null) {
  if (!name) return "S"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? "S"
  const second = parts[parts.length - 1]?.[0] ?? ""
  return `${first}${second}`.toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function genderLabel(gender?: TenantStudent["studentProfile"] extends infer P ? P extends { gender?: infer G } ? G : never : never) {
  if (gender === "MALE") return "Male"
  if (gender === "FEMALE") return "Female"
  if (gender === "OTHER") return "Other"
  return "—"
}

function batchStatusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase()
  if (s === "ONGOING" || s === "ACTIVE") return "bg-blue-50 text-blue-700 border-blue-200"
  if (s === "UPCOMING") return "bg-amber-50 text-amber-700 border-amber-200"
  if (s === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-200"
  if (s === "CANCELLED") return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 wrap-break-word">{value || "—"}</p>
      </div>
    </div>
  )
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthReady } = useAuth()

  const studentUserId = String(params?.id ?? "")
  const initialTab = (searchParams.get("tab") as ProfileTab) || "overview"
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab)

  const tenantId = useMemo(() => {
    const fromUser =
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id
    if (fromUser) return String(fromUser)

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user")
        if (stored) {
          const parsed = JSON.parse(stored)
          return String(
            parsed?.tenant_id ?? parsed?.tenantId ?? parsed?.tenant?.id ?? ""
          )
        }
      } catch {
        // ignore
      }
    }
    return ""
  }, [user])

  const studentQuery = useQuery({
    queryKey: ["tenant-student", tenantId, studentUserId],
    enabled: isAuthReady && !!tenantId && !!studentUserId,
    queryFn: async () => {
      try {
        const response = await api.get(
          `/api/tenants/${tenantId}/students/${studentUserId}`
        )
        return (response.data ?? null) as TenantStudent | null
      } catch (error: any) {
        if (error?.response?.status === 404) return null
        throw error
      }
    },
  })

  const student = studentQuery.data
  const profile = student?.studentProfile ?? null
  const admission = student?.admission ?? null
  const cls = admission?.class ?? null
  const batch = admission?.batch ?? null

  const copyStudentId = async () => {
    if (!profile?.student_id) return
    await navigator.clipboard.writeText(profile.student_id)
    toast.success("Student ID copied")
  }

  const switchTab = (next: ProfileTab) => {
    setActiveTab(next)
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("tab", next)
    router.replace(`/dashboard/students/${studentUserId}?${sp.toString()}`)
  }

  if (studentQuery.isLoading || !isAuthReady) {
    return (
      <div className="adm-root space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }

  if (studentQuery.isError) {
    return (
      <div className="adm-root">
        <Card className="mx-auto mt-10 max-w-xl">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-lg font-semibold">Failed to load student</p>
            <p className="text-sm text-muted-foreground">
              {(studentQuery.error as any)?.message ??
                "Please try again or go back to the list."}
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/students">
                <ArrowLeft className="mr-2 size-4" /> Back to Student List
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="adm-root">
        <Card className="mx-auto mt-10 max-w-xl">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-lg font-semibold">Student not found</p>
            <p className="text-sm text-muted-foreground">
              We could not find a student with this ID in your tenant.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/students">
                <ArrowLeft className="mr-2 size-4" /> Back to Student List
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="adm-root space-y-4">
      {/* Back link */}
      <div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/students">
            <ArrowLeft className="mr-1 size-4" /> Back to Students
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {student.avatar_url ? (
              <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full border">
                <Image
                  src={student.avatar_url}
                  alt={student.name}
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-2xl font-semibold text-white shadow-sm">
                {getInitials(student.name)}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold text-slate-900 truncate">
                {student.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {profile?.student_id || student.machine_id || student.id.slice(0, 8)}
                </span>
                {profile?.student_id && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={copyStudentId}
                    title="Copy student ID"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {student.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </span>
                )}
                {student.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {student.is_active ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200">
                    <ShieldCheck className="mr-1 size-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <ShieldAlert className="mr-1 size-3" /> Inactive
                  </Badge>
                )}
                {admission?.status && (
                  <Badge variant="outline" className="capitalize">
                    {admission.status.toLowerCase()}
                  </Badge>
                )}
                {admission?.admission_type && (
                  <Badge variant="outline" className="capitalize">
                    {admission.admission_type.toLowerCase()}
                  </Badge>
                )}
                {typeof profile?.profile_completion_pct === "number" && (
                  <Badge variant="outline">
                    Profile {profile.profile_completion_pct}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick chips for class/batch */}
          <div className="flex flex-wrap gap-2">
            {cls && (
              <div className="rounded-lg border bg-purple-50/40 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-purple-700">
                  <GraduationCap className="h-3 w-3" /> Class
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {cls.name}
                  {cls.code && (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      ({cls.code})
                    </span>
                  )}
                </p>
              </div>
            )}
            {batch && (
              <div className="rounded-lg border bg-amber-50/40 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                  <Layers className="h-3 w-3" /> Batch
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {batch.name}
                  {batch.section && (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      · {batch.section}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={User} label="Full Name" value={student.name} />
              <InfoRow
                icon={UserRound}
                label="Gender"
                value={genderLabel(profile?.gender)}
              />
              <InfoRow
                icon={Calendar}
                label="Date of Birth"
                value={formatDate(profile?.date_of_birth)}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Blood Group"
                value={profile?.blood_group || "—"}
              />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={profile?.address || "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4 text-emerald-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow
                icon={School}
                label="Previous School"
                value={profile?.school_name || "—"}
              />
              <InfoRow
                icon={Calendar}
                label="Joined On"
                value={formatDate(student.joining_date ?? student.created_at)}
              />
            </CardContent>
          </Card>

          {!profile && (
            <Alert className="md:col-span-2 border-amber-200 bg-amber-50">
              <AlertTitle className="text-amber-900">
                Profile incomplete
              </AlertTitle>
              <AlertDescription className="text-amber-800">
                This student has not filled in their detailed profile yet
                (guardian, address, date of birth, etc.).
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {activeTab === "academic" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-purple-600" />
                Class
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {cls ? (
                <>
                  <InfoRow icon={BookOpen} label="Class Name" value={cls.name} />
                  <InfoRow icon={BookOpen} label="Code" value={cls.code} />
                  <InfoRow icon={BookOpen} label="Group" value={cls.group} />
                  <InfoRow icon={BookOpen} label="Level" value={cls.level} />
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Not enrolled in any class.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-amber-600" />
                Batch
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {batch ? (
                <>
                  <InfoRow icon={Layers} label="Batch Name" value={batch.name} />
                  <InfoRow icon={Layers} label="Section" value={batch.section} />
                  <InfoRow
                    icon={Layers}
                    label="Shift"
                    value={
                      batch.shift ? (
                        <span className="capitalize">{batch.shift.toLowerCase()}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    icon={ShieldCheck}
                    label="Status"
                    value={
                      batch.status ? (
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[11px] font-medium ${batchStatusClass(batch.status)}`}
                        >
                          {batch.status}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Start Date"
                    value={formatDate(batch.start_date)}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="End Date"
                    value={formatDate(batch.end_date)}
                  />
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Not assigned to any batch.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Enrollment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Enrollment Status
                </p>
                <p className="mt-1 text-sm font-medium capitalize">
                  {admission?.status?.toLowerCase() || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Admission Type
                </p>
                <p className="mt-1 text-sm font-medium capitalize">
                  {admission?.admission_type?.toLowerCase() || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Enrolled On
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(admission?.enrolled_at)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Enrollment ID
                </p>
                <p className="mt-1 text-xs font-mono text-slate-600 break-all">
                  {admission?.enrollment_id || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "guardian" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-rose-600" />
              Guardian / Parent
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {profile?.guardian_name || profile?.guardian_phone || profile?.address ? (
              <>
                <InfoRow
                  icon={UserRound}
                  label="Guardian Name"
                  value={profile?.guardian_name}
                />
                <InfoRow
                  icon={Phone}
                  label="Guardian Phone"
                  value={profile?.guardian_phone}
                />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={profile?.address}
                />
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No guardian information available.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "account" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow
                icon={User}
                label="User ID"
                value={
                  <span className="font-mono text-xs break-all">{student.id}</span>
                }
              />
              <InfoRow
                icon={ShieldCheck}
                label="Role"
                value={<span className="capitalize">{student.role.toLowerCase()}</span>}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Account Status"
                value={student.is_active ? "Active" : "Inactive"}
              />
              <InfoRow
                icon={User}
                label="Machine ID"
                value={student.machine_id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-emerald-600" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow
                icon={Calendar}
                label="Joined"
                value={formatDate(student.joining_date ?? student.created_at)}
              />
              <InfoRow
                icon={Calendar}
                label="Account Created"
                value={formatDateTime(student.created_at)}
              />
              <InfoRow
                icon={Calendar}
                label="Last Login"
                value={formatDateTime(student.last_login_at)}
              />
              <InfoRow
                icon={Calendar}
                label="Last Updated"
                value={formatDateTime(student.updated_at)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
