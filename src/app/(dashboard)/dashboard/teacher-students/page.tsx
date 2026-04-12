"use client"

export default function TeacherStudentsPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Students Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This teacher module is reserved for teacher login and will show batch-wise student data first.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <p className="font-medium">Batch-wise student view</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The page shell is ready. The next step would be connecting assigned batches and rendering each batch before the student list.
        </p>
      </div>
    </div>
  )
}
