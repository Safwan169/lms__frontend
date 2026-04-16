"use client"

import ScheduleWorkspace from "@/features/schedule/ScheduleWorkspace"
import { useAuth } from "@/context/AuthContext"

export default function MyClassPage() {
  const { user } = useAuth()

  const normalizedRole = String(
    (user as any)?.role ??
      (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
      ""
  ).toLowerCase()

  const pageDescription =
    normalizedRole === "teacher"
      ? "Review today’s classes in a cleaner daily and list-based format for your assigned batches."
      : normalizedRole === "student"
        ? "Check your daily class schedule and class list here without opening the timetable builder."
        : "Review the class schedule in a daily and list-based format."

  return (
    <ScheduleWorkspace
      initialViewMode="weekly"
      hideBuilder
      minimalView
      pageTitle="My Class"
      pageDescription={pageDescription}
    />
  )
}
