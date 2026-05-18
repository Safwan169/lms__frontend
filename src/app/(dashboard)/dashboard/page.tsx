"use client"

import { useMemo } from "react"

import { useAuth } from "@/context/AuthContext"
import StudentDashboard from "@/features/dashboard/StudentDashboard"
import AdminDashboard from "@/features/dashboard/AdminDashboard"
import TeacherDashboard from "@/features/dashboard/TeacherDashboard"
import AccountantDashboard from "@/features/dashboard/AccountantDashboard"

function normalizeRole(user: any) {
  return String(
    user?.role ??
      (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
      ""
  ).toLowerCase()
}

export default function DashboardPage() {
  const { user } = useAuth()
  const role = useMemo(() => normalizeRole(user), [user])

  if (role === "student") return <StudentDashboard user={user} />
  if (role === "teacher") return <TeacherDashboard user={user} />
  if (role === "accountant") return <AccountantDashboard user={user} />
  return <AdminDashboard user={user} />
}
