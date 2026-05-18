"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, Loader2, RefreshCcw } from "lucide-react"
import toast from "react-hot-toast"

import accountingApi from "@/features/accounting/api"
import { downloadBlob, formatMoney, monthNow, yearNow } from "@/features/accounting/helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type PLReport = {
  total_revenue?: string | number
  total_expense?: string | number
  net_profit?: string | number
  is_profitable?: boolean
  revenue_count?: number
  expense_count?: number
  monthly_breakdown?: Array<{ month_key?: string; month_label?: string; total_revenue?: string | number; total_expense?: string | number; net_amount?: string | number }>
  revenue_by_category?: CategoryRow[]
  expense_by_category?: CategoryRow[]
}

type CategoryRow = { category_id?: string | null; category_name?: string; amount?: string | number }

type CashflowReport = {
  period?: { months?: number; from?: string; to?: string }
  totals?: { inflow?: string | number; outflow?: string | number; net_cashflow?: string | number }
  monthly_cashflow?: Array<{ month_key?: string; month_label?: string; inflow?: string | number; outflow?: string | number; net_cashflow?: string | number }>
}

type TrendsReport = {
  trends?: Array<{ year: number; total_revenue?: string | number; total_expense?: string | number; net_profit?: string | number; is_profitable?: boolean }>
}

const REPORT_OPTIONS = [
  { value: "monthly-profit-loss", label: "Monthly Profit & Loss" },
  { value: "monthly-income", label: "Monthly Income" },
  { value: "monthly-expenses", label: "Monthly Expenses" },
  { value: "yearly-summary", label: "Yearly Summary" },
  { value: "yearly-profit-loss", label: "Yearly Profit & Loss" },
  { value: "yearly-trends", label: "Yearly Trends" },
  { value: "cashflow", label: "Cashflow" },
  { value: "revenue-vs-expense", label: "Revenue vs Expense" },
  { value: "financial-overview", label: "Financial Overview" },
] as const

export default function AccountantReportsPage() {
  const [month, setMonth] = useState(monthNow())
  const [year, setYear] = useState(yearNow())
  const [cashflowMonths, setCashflowMonths] = useState(12)
  const [trendYears, setTrendYears] = useState(3)
  const [reportType, setReportType] = useState<(typeof REPORT_OPTIONS)[number]["value"]>("monthly-profit-loss")
  const [downloadFormat, setDownloadFormat] = useState<"json" | "csv">("csv")
  const [downloading, setDownloading] = useState(false)

  const [y, m] = month.split("-").map(Number)

  const monthlyPL = useQuery({
    queryKey: ["accounting", "report", "monthly-pl", month],
    queryFn: () => accountingApi.getMonthlyProfitLoss({ year: y, month: m }) as Promise<PLReport>,
    enabled: Boolean(y && m),
  })

  const yearlyPL = useQuery({
    queryKey: ["accounting", "report", "yearly-pl", year],
    queryFn: () => accountingApi.getYearlyProfitLoss({ year }) as Promise<PLReport>,
  })

  const cashflowQuery = useQuery({
    queryKey: ["accounting", "report", "cashflow", cashflowMonths],
    queryFn: () => accountingApi.getCashflowReport({ months: cashflowMonths }) as Promise<CashflowReport>,
  })

  const trendsQuery = useQuery({
    queryKey: ["accounting", "report", "trends", trendYears],
    queryFn: () => accountingApi.getYearlyTrends({ years: trendYears }) as Promise<TrendsReport>,
  })

  async function handleDownload() {
    try {
      setDownloading(true)
      const params: Record<string, unknown> = { report: reportType, format: downloadFormat }
      if (reportType.startsWith("monthly-")) {
        params.year = y
        params.month = m
      } else if (reportType.startsWith("yearly-")) {
        params.year = year
      }
      if (reportType === "cashflow") params.months = cashflowMonths
      if (reportType === "yearly-trends") params.years = trendYears

      const blob = await accountingApi.downloadReport(params as any)
      const ext = downloadFormat === "csv" ? "csv" : "json"
      downloadBlob(blob, `${reportType}-${Date.now()}.${ext}`)
      toast.success("Report downloaded")
    } catch (error: any) {
      toast.error(error?.message || "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  const monthlyData = monthlyPL.data
  const yearlyData = yearlyPL.data
  const cashflowData = cashflowQuery.data
  const trends = trendsQuery.data?.trends ?? []

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Profit & loss, cashflow, multi-year trends, and downloadable exports.</p>
        </div>
      </div>

      {/* ── Download Builder ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Download a Report</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Report</p>
            <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
              {REPORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Format</p>
            <Select value={downloadFormat} onValueChange={(v) => setDownloadFormat(v as any)}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </div>
          {reportType.startsWith("monthly-") ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Month</p>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : reportType.startsWith("yearly-") ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Year</p>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          ) : reportType === "cashflow" ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Trailing months</p>
              <Input type="number" min={1} max={24} value={cashflowMonths} onChange={(e) => setCashflowMonths(Number(e.target.value))} />
            </div>
          ) : null}
          <div className="md:col-span-1 flex items-end">
            <Button onClick={handleDownload} disabled={downloading} className="w-full">
              {downloading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Monthly P&L ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Monthly Profit & Loss</CardTitle>
            <Input type="month" className="w-48" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {monthlyPL.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryStat label="Total Revenue" value={`BDT ${formatMoney(monthlyData?.total_revenue)}`} color="emerald" />
              <SummaryStat label="Total Expense" value={`BDT ${formatMoney(monthlyData?.total_expense)}`} color="red" />
              <SummaryStat
                label="Net"
                value={`BDT ${formatMoney(monthlyData?.net_profit)}`}
                color={monthlyData?.is_profitable ? "emerald" : "red"}
              />
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <CategoryBreakdown title="Revenue by Category" rows={monthlyData?.revenue_by_category ?? []} accent="emerald" />
            <CategoryBreakdown title="Expense by Category" rows={monthlyData?.expense_by_category ?? []} accent="red" />
          </div>
        </CardContent>
      </Card>

      {/* ── Yearly P&L ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Yearly Profit & Loss</CardTitle>
            <Input type="number" className="w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </CardHeader>
        <CardContent>
          {yearlyPL.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryStat label="Total Revenue" value={`BDT ${formatMoney(yearlyData?.total_revenue)}`} color="emerald" />
                <SummaryStat label="Total Expense" value={`BDT ${formatMoney(yearlyData?.total_expense)}`} color="red" />
                <SummaryStat
                  label="Net"
                  value={`BDT ${formatMoney(yearlyData?.net_profit)}`}
                  color={yearlyData?.is_profitable ? "emerald" : "red"}
                />
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Expense</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(yearlyData?.monthly_breakdown ?? []).map((row) => (
                      <TableRow key={row.month_key}>
                        <TableCell>{row.month_label}</TableCell>
                        <TableCell className="text-emerald-600">BDT {formatMoney(row.total_revenue)}</TableCell>
                        <TableCell className="text-red-600">BDT {formatMoney(row.total_expense)}</TableCell>
                        <TableCell className={Number(row.net_amount ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}>
                          BDT {formatMoney(row.net_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Cashflow ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Cashflow</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Months:</span>
              <Input type="number" className="w-20" min={1} max={24} value={cashflowMonths} onChange={(e) => setCashflowMonths(Number(e.target.value))} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cashflowQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <SummaryStat label="Inflow" value={`BDT ${formatMoney(cashflowData?.totals?.inflow)}`} color="emerald" />
                <SummaryStat label="Outflow" value={`BDT ${formatMoney(cashflowData?.totals?.outflow)}`} color="red" />
                <SummaryStat
                  label="Net"
                  value={`BDT ${formatMoney(cashflowData?.totals?.net_cashflow)}`}
                  color={Number(cashflowData?.totals?.net_cashflow ?? 0) >= 0 ? "emerald" : "red"}
                />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Inflow</TableHead>
                      <TableHead>Outflow</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cashflowData?.monthly_cashflow ?? []).map((row) => (
                      <TableRow key={row.month_key}>
                        <TableCell>{row.month_label}</TableCell>
                        <TableCell className="text-emerald-600">BDT {formatMoney(row.inflow)}</TableCell>
                        <TableCell className="text-red-600">BDT {formatMoney(row.outflow)}</TableCell>
                        <TableCell className={Number(row.net_cashflow ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}>
                          BDT {formatMoney(row.net_cashflow)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Trends ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Yearly Trends</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Years:</span>
              <Input type="number" className="w-20" min={1} max={5} value={trendYears} onChange={(e) => setTrendYears(Number(e.target.value))} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell>{row.year}</TableCell>
                      <TableCell className="text-emerald-600">BDT {formatMoney(row.total_revenue)}</TableCell>
                      <TableCell className="text-red-600">BDT {formatMoney(row.total_expense)}</TableCell>
                      <TableCell className={Number(row.net_profit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}>
                        BDT {formatMoney(row.net_profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.is_profitable ? "default" : "destructive"}>
                          {row.is_profitable ? "Profit" : "Loss"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: "emerald" | "red" }) {
  const colorClass = color === "emerald" ? "text-emerald-700" : "text-red-700"
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${colorClass}`}>{value}</p>
    </div>
  )
}

function CategoryBreakdown({ title, rows, accent }: { title: string; rows: CategoryRow[]; accent: "emerald" | "red" }) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, idx) => (
            <div key={row.category_id ?? `cat-${idx}`} className="flex items-center justify-between text-sm">
              <span>{row.category_name ?? "Uncategorised"}</span>
              <span className={accent === "emerald" ? "text-emerald-700" : "text-red-700"}>BDT {formatMoney(row.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
