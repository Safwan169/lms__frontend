"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import ManualAdmissionForm from "@/components/admissions/manual-admission-form"

export default function NewManualAdmissionPage() {
  return (
    <div className="adm-root pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <Link href="/dashboard/admissions" className="mb-2 inline-flex items-center gap-2 text-sm text-[#6366f1] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Admissions
          </Link>
          <h1>New Admission</h1>
        </div>
      </div>

      <ManualAdmissionForm mode="page" />
    </div>
  )
}
