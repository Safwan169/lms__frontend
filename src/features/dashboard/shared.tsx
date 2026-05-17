"use client"

import type { ReactNode } from "react"

export function SectionCard({
  icon,
  iconTone,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode
  iconTone: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`rounded-xl p-2 ${iconTone}`}>{icon}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: ReactNode
  title: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center">
      <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
        {icon}
      </span>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  )
}
