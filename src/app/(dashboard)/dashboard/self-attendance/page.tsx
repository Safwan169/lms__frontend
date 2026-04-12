"use client"

export default function SelfAttendancePage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Self Attendance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is available for teacher and student logins.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Self attendance page shell is ready for logged-in user attendance data.
      </div>
    </div>
  )
}
