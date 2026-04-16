"use client"

import Link from "next/link"

const teacherModules = [
  { title: "Students Page", href: "/dashboard/teacher-students", desc: "Batch-wise student information for your assigned learners." },
  { title: "Class Rooms", href: "/dashboard/classrooms", desc: "Access your classroom spaces and teaching context." },
  { title: "My Class", href: "/dashboard/my-class", desc: "Open your assigned class view instead of the timetable module." },
  { title: "Self Attendance", href: "/dashboard/self-attendance", desc: "Track your personal attendance record." },
]

export default function TeacherEmptyDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Teacher Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is intentionally clean. Open one of your teacher modules below to continue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teacherModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="rounded-2xl border bg-card p-5 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            <h2 className="text-lg font-semibold">{module.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{module.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
