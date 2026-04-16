"use client"

import Link from "next/link"

export default function ClassAccessPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Class</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This student area has moved to the dedicated My Class module.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        <p>Your class view is now available in the new module.</p>
        <Link href="/dashboard/my-class" className="mt-3 inline-flex font-medium text-primary underline-offset-4 hover:underline">
          Open My Class
        </Link>
      </div>
    </div>
  )
}
