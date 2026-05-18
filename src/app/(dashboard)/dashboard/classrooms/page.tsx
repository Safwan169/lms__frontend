"use client"

export default function ClassRoomsPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Class Rooms</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is visible only for teacher login.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Classroom content placeholder is ready for teacher-specific room data.
      </div>
    </div>
  )
}
