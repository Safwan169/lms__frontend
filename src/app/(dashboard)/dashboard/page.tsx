"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Sparkles,
  UserRound,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"

const adminStats = [
  { label: "Total Students", value: "4,821", helper: "+143 this month", tone: "bg-indigo-50 text-indigo-700" },
  { label: "Total Teachers", value: "312", helper: "+8 this month", tone: "bg-sky-50 text-sky-700" },
  { label: "Revenue", value: "24,390 BDT", helper: "+12% vs last month", tone: "bg-emerald-50 text-emerald-700" },
]

const adminActivity = [
  "3 new admissions added to Class 9 Science — Batch A",
  "Attendance was submitted for Class 10 Mathematics",
  "Section B timetable was updated for the new week",
  "Fee due reminders were sent to 12 students",
]

function normalizeRole(user: any) {
  return String(
    user?.role ??
      (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
      ""
  ).toLowerCase()
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

export default function DashboardPage() {
  const { user } = useAuth()
  const normalizedRole = useMemo(() => normalizeRole(user), [user])

  if (normalizedRole === "student") {
    return <StudentDashboard user={user} />
  }

  return <AdminDashboard />
}

function StudentDashboard({ user }: { user: any }) {
  const displayName = pickText(user?.name, user?.full_name, user?.username, "Student")
  const tenantName = pickText(
    user?.tenant?.school_name,
    user?.tenant?.schoolName,
    user?.tenant?.name,
    "Your school"
  )

  const profile = user?.profile ?? user?.studentProfile ?? user?.student ?? {}
  const className = pickText(profile?.class_name, profile?.className, "Assigned class")
  const batchName = pickText(profile?.batch_name, profile?.batchName, "Current batch")
  const section = pickText(profile?.section, "Section pending")
  const studentId = pickText(profile?.student_id, user?.student_id, user?.id, "Pending")

  const attendanceNumber = Number(profile?.attendance_percentage ?? profile?.attendanceRate ?? 92)
  const attendanceRate = Number.isFinite(attendanceNumber) ? attendanceNumber : 92

  const summaryCards = [
    {
      title: "Student ID",
      value: studentId,
      helper: `${className} • ${section}`,
      icon: BookOpen,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      title: "Current Batch",
      value: batchName,
      helper: "See your published routine and class plan",
      icon: CalendarDays,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      title: "Attendance",
      value: `${attendanceRate}%`,
      helper: attendanceRate >= 90 ? "Excellent consistency" : "Keep attending regularly",
      icon: ClipboardCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Profile Status",
      value: "Ready",
      helper: "Keep your contact and guardian details updated",
      icon: UserRound,
      tone: "bg-violet-50 text-violet-700",
    },
  ]

  const quickLinks = [
    {
      title: "My Class",
      description: "Open your weekly routine and class list.",
      href: "/dashboard/my-class",
      icon: CalendarDays,
    },
    {
      title: "My Attendance",
      description: "Review your present and absent records.",
      href: "/dashboard/self-attendance",
      icon: ClipboardCheck,
    },
    {
      title: "My Profile",
      description: "Update personal, guardian, and contact details.",
      href: "/dashboard/profile",
      icon: UserRound,
    },
  ]

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Student Space
              </div>
              <div>
                <h1 className="text-3xl font-semibold">Welcome back, {displayName}</h1>
                <p className="mt-2 max-w-2xl text-sm text-indigo-50">
                  Stay on top of your class routine, track attendance, and keep your profile updated from one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-indigo-50">
                <span className="rounded-full bg-white/10 px-3 py-1">{tenantName}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{className}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{batchName}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/my-class"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Open My Class
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/self-attendance"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Check Attendance
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</h2>
                    <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                  </div>
                  <div className={`rounded-xl p-2 ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
                <p className="text-sm text-slate-500">Everything a student usually needs most.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-900">Today’s focus</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3">Review your routine before class starts.</div>
                <div className="rounded-2xl bg-slate-50 p-3">Keep your attendance above 90% this month.</div>
                <div className="rounded-2xl bg-slate-50 p-3">Update your profile if any phone or guardian details changed.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Student note</h2>
              <p className="mt-2 text-sm text-slate-600">
                Your dashboard is now focused on student activities so you can quickly reach your class, attendance, and personal information.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor admissions, staff, and overall institute activity from one overview.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {adminStats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.tone}`}>
                {item.label}
              </span>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</div>
              <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {adminActivity.map((activity) => (
              <div key={activity} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {activity}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}