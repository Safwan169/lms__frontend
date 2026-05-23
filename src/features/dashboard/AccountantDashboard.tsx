"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  CheckCheck,
  FileText,
  Inbox,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react"

import { greetingFor } from "./api"

type AnyUser = any

function pickName(user: AnyUser) {
  for (const v of [user?.name, user?.full_name, user?.username]) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return "Smartz Accountant"
}

const kpis = [
  { label: "This Month Collection", value: "৳ 12.84L", hint: "514 invoices · +18% vs Apr", icon: Wallet, tone: "text-emerald-600 bg-emerald-100", cornerTone: "bg-emerald-500", badge: "+18%" },
  { label: "Outstanding Dues", value: "৳ 1.84L", hint: "37 overdue 30d+", icon: AlertTriangle, tone: "text-rose-600 bg-rose-100", cornerTone: "bg-rose-500" },
  { label: "Pending Verify", value: "6", hint: "Manual MFS submissions", icon: Inbox, tone: "text-amber-600 bg-amber-100", cornerTone: "bg-amber-500" },
  { label: "Payroll Pending", value: "4", hint: "Teachers · May cycle", icon: Receipt, tone: "text-indigo-600 bg-indigo-100", cornerTone: "bg-indigo-500" },
  { label: "Expenses This Month", value: "৳ 4.62L", hint: "32 entries · electricity ↑", icon: FileText, tone: "text-violet-600 bg-violet-100", cornerTone: "bg-violet-500" },
  { label: "Current Balance", value: "৳ 18.21L", hint: "Across 3 accounts", icon: Wallet, tone: "text-sky-600 bg-sky-100", cornerTone: "bg-sky-500" },
]

const invoices = [
  { initials: "TH", name: "Tonima Hossain", info: "Class 9 · batch 2026", inv: "INV-202605-J9381P", amount: "৳ 3,500.00", paid: null, due: "20 May", status: "DUE", tone: "bg-amber-100 text-amber-700", action: "Collect" },
  { initials: "SH", name: "Safwan Hossain", info: "Class 9 · batch 2026", inv: "INV-202605-NVE77L", amount: "৳ 3,500.00", paid: null, due: "20 May", status: "DUE", tone: "bg-amber-100 text-amber-700", action: "Collect" },
  { initials: "JC", name: "Joy Chandara Roy", info: "Class 9 · batch 2026", inv: "INV-202605-KBKBH6", amount: "৳ 3,500.00", paid: "৳ 2,000.00", due: "15 May", status: "PARTIAL", tone: "bg-sky-100 text-sky-700", action: "Collect" },
  { initials: "RA", name: "Rafiq Ahmed", info: "Class 10 · batch 2026", inv: "INV-202604-X7PQ02", amount: "৳ 4,200.00", paid: null, due: "10 Apr", status: "OVERDUE", tone: "bg-rose-100 text-rose-700", action: "Collect" },
  { initials: "NJ", name: "Nusrat Jahan", info: "Class 10 · batch 2026", inv: "INV-202604-LWJ339", amount: "৳ 4,200.00", paid: null, due: "10 Apr", status: "OVERDUE", tone: "bg-rose-100 text-rose-700", action: "Collect" },
  { initials: "SA", name: "Sumaiya Akter", info: "Class 9 · batch 2026", inv: "INV-202605-MZK822", subInv: "bKash · TRX 9KLM2X", amount: "৳ 3,500.00", paid: null, due: "20 May", status: "VERIFY", tone: "bg-violet-100 text-violet-700", action: "Verify" },
]

const payroll = [
  { initials: "TK", name: "Tasmia Khan", type: "PER_BATCH", subject: "Math", net: "৳ 18,000.00", status: "DRAFT", tone: "bg-slate-100 text-slate-700" },
  { initials: "SJ", name: "Sara Johnson", type: "MONTHLY", subject: "Physics", net: "৳ 22,905.00", status: "FINALIZED", tone: "bg-sky-100 text-sky-700" },
  { initials: "MR", name: "Mahmud Rahman", type: "MONTHLY", subject: "Chemistry", net: "৳ 21,400.00", status: "PAID", tone: "bg-emerald-100 text-emerald-700" },
  { initials: "AK", name: "Ayesha Karim", type: "PER_BATCH", subject: "English", net: "৳ 14,500.00", status: "EXCEPTION", tone: "bg-rose-100 text-rose-700" },
]

const financeAlerts = [
  { icon: AlertTriangle, title: "Overdue invoices spike", detail: "11 invoices crossed 30+ days since 10 May", ago: "38m ago", tone: "text-rose-600 bg-rose-50" },
  { icon: Wallet, title: "Duplicate payment detected", detail: "INV-202605-J9381P paid twice via bKash (3,500 ৳)", ago: "2h ago", tone: "text-amber-600 bg-amber-50" },
  { icon: Inbox, title: "Verification pending > 24h", detail: "2 manual MFS submissions awaiting review", ago: "6h ago", tone: "text-violet-600 bg-violet-50" },
  { icon: Receipt, title: "Payroll not yet run", detail: "May cycle is open — 4 teachers in draft", ago: "Today", tone: "text-indigo-600 bg-indigo-50" },
]

const incomeBars = [22, 30, 28, 36, 42, 50]
const expenseBars = [12, 18, 14, 20, 22, 26]

export default function AccountantDashboard({ user }: { user: AnyUser }) {
  const name = pickName(user)
  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Greeting */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {greetingFor()}, <span>{name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Finance overview
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {/* <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              <Wallet className="h-3.5 w-3.5" />
              Collect payment
            </button> */}
          </div>
        </div>

        {/* Duplicate payment banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-900">
              Duplicate payment detected — INV-202605-J9381P paid twice via bKash (৳ 3,500).
            </div>
            <div className="mt-0.5 text-xs text-amber-800/80">
              Refund or void the second receipt to avoid ledger drift.
            </div>
          </div>
          <a href="#" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline">
            Review payment <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={`pointer-events-none absolute -bottom-2.5 -right-2.5 h-[70px] w-[70px] rounded-full opacity-10 ${k.cornerTone}`} />
                <div className="relative flex items-start justify-between gap-2">
                  <span className={`rounded-xl p-2 ${k.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {k.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <TrendingUp className="h-3 w-3" />
                      {k.badge}
                    </span>
                  )}
                </div>
                <div className="relative mt-3">
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums">{k.value}</div>
                  <div className="mt-1 text-sm font-medium text-slate-700">{k.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{k.hint}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Collect payment", Icon: Wallet, href: "/dashboard/payments" },
            { label: "Verify payments", Icon: CheckCheck, href: "/dashboard/payments" },
            { label: "Run payroll", Icon: Receipt, href: "/dashboard/payroll" },
            { label: "Mark salary paid", Icon: Check, href: "/dashboard/payroll" },
            { label: "Add expense", Icon: Plus, href: "/dashboard/accountant" },
            { label: "Financial summary", Icon: FileText, href: "/dashboard/accounting" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <a.Icon className="h-3.5 w-3.5" />
              <span>{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Payment queue */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">Payment queue</h3>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">37 OVERDUE</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Open invoices for the active cycle · prioritise overdue first</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button className="rounded-md bg-white px-2.5 py-1 font-medium text-slate-900 shadow-sm">Overdue</button>
                <button className="rounded-md px-2.5 py-1 text-slate-500 hover:text-slate-700">Due</button>
                <button className="rounded-md px-2.5 py-1 text-slate-500 hover:text-slate-700">Verify</button>
              </div>
              <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                All invoices <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.inv}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{inv.initials}</span>
                        <div>
                          <div className="font-medium text-slate-900">{inv.name}</div>
                          <div className="text-xs text-slate-500">{inv.info}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs text-slate-700">{inv.inv}</div>
                      {inv.subInv && <div className="mt-0.5 text-[11px] text-slate-500">{inv.subInv}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 tabular-nums">{inv.amount}</div>
                      {inv.paid && <div className="text-[11px] text-emerald-600 tabular-nums">Paid {inv.paid}</div>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700 tabular-nums">{inv.due}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inv.tone}`}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {inv.action !== "Verify" && (
                          <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Send className="h-3 w-3" /> Remind
                          </button>
                        )}
                        <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                          {inv.action === "Verify" ? <CheckCheck className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                          {inv.action}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Payroll queue */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <Receipt className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Payroll queue</h3>
                  <p className="text-xs text-slate-500">May 2026 cycle</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">OPEN</span>
            </header>

            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "4", l: "Drafts" },
                { v: "1", l: "Finalised" },
                { v: "1", l: "Paid" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums">{s.v}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {payroll.map((p) => (
                <div key={p.name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{p.initials}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{p.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{p.type}</span>
                    </div>
                    <div className="text-xs text-slate-500">{p.subject}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900 tabular-nums">{p.net}</div>
                    <div className="text-[11px] text-slate-500">Net</div>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.tone}`}>{p.status}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-rose-600">1 exception in May cycle</span>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                <Receipt className="h-3.5 w-3.5" /> Run May payroll
              </button>
            </div>
          </section>

          {/* Finance summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Finance summary</h3>
                  <p className="text-xs text-slate-500">May 2026 · vs April</p>
                </div>
              </div>
              <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                Full report <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Income", value: "৳ 12.84L", trend: "+18% MoM", tone: "text-emerald-600" },
                { label: "Expense", value: "৳ 4.62L", trend: "+6% MoM", tone: "text-amber-600" },
                { label: "Net", value: "৳ 8.22L", trend: "Healthy margin", tone: "text-indigo-600" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">{f.label}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{f.value}</div>
                  <div className={`mt-0.5 text-[11px] font-medium ${f.tone}`}>{f.trend}</div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Income vs expense — last 6 months</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Income</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Expense</span>
                </div>
              </div>
              <div className="flex h-20 items-end gap-2">
                {incomeBars.map((h, i) => (
                  <div key={i} className="flex flex-1 items-end gap-0.5">
                    <div className="flex-1 rounded-t-sm bg-emerald-500" style={{ height: `${(h / 50) * 100}%` }} />
                    <div className="flex-1 rounded-t-sm bg-rose-300" style={{ height: `${(expenseBars[i] / 50) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent large expenses</div>
              <div className="mt-2 space-y-1.5">
                {[
                  { label: "Electricity bill — May", date: "12 May", amount: "৳ 38,400" },
                  { label: "Stationary purchase", date: "10 May", amount: "৳ 22,100" },
                  { label: "Internet & networking", date: "08 May", amount: "৳ 14,800" },
                ].map((e) => (
                  <div key={e.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <Wrench className="h-3.5 w-3.5 text-slate-400" /> {e.label}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      <span className="mr-3">{e.date}</span>
                      <span className="font-medium text-slate-900">{e.amount}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Finance alerts */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-start gap-3">
              <span className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <BellRing className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Finance alerts</h3>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">4</span>
              </div>
            </header>
            <div className="space-y-2">
              {financeAlerts.map((a) => {
                const Icon = a.icon
                return (
                  <div key={a.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <span className={`rounded-lg p-1.5 ${a.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.detail}</div>
                    </div>
                    <span className="whitespace-nowrap text-[11px] text-slate-400 tabular-nums">{a.ago}</span>
                  </div>
                )
              })}
            </div>
            <button className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              All alerts <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>

          {/* Widget states */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Widget states · loading & empty examples
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Today's collection</div>
                    <div className="text-xs text-slate-500">Loading…</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCheck className="h-5 w-5" />
                </span>
                <div className="text-sm font-medium text-slate-900">All caught up</div>
                <div className="mt-1 text-xs text-slate-500">
                  No manual payments are awaiting verification. Submissions appear here as students upload proof.
                </div>
                <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
                  View past verifications <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
