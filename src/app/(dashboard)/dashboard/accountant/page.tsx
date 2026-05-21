"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, ListFilter, Smartphone, TrendingUp, X } from "lucide-react";

import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive";

// ── Admission payment types ──────────────────────────────────────────────────

type PaymentMethodSummary = {
  method: string;
  total_amount: string;
  total_discount: string;
  net_amount: string;
  count: number;
};

type SummaryResponse = {
  summary: PaymentMethodSummary[];
  meta: {
    grand_total: string;
    grand_discount: string;
    grand_net: string;
  };
};

type PaymentStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Payment = {
  id: string;
  amount: string;
  discount: string;
  net_amount: string;
  method: string;
  type: string;
  payment_status: string;
  transaction_id: string;
  paid_at: string | null;
  month: string | null;
  notes: string | null;
  created_at: string;
  current_balance: string | null;
  student: PaymentStudent;
  enrollment_id: string;
  batch_id: string;
  class_id: string;
};

type PaymentsResponse = {
  data: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// ── PayrollRecord types (from GET /v1/payroll) ───────────────────────────────

type PayrollTeacher = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type PayrollItem = {
  id: string;
  net_amount: string | number;
  payment_method: string;
  payroll_month: string;
  payroll_type: string;
  /** "draft" | "paid" | "on_hold" */
  api_status: string;
  paid_at: string | null;
  remarks: string | null;
  created_at: string;
  teacher: PayrollTeacher;
};

type PayrollListResponse = {
  items: PayrollItem[];
  meta: { total: number; month: string | null; status: string | null };
};

// ── Unified transaction (merged view) ────────────────────────────────────────

type UnifiedTransaction = {
  id: string;
  date: string;
  description: string | null;
  subtitle: string;
  method: string;
  typeLabel: string;
  amount: number;
  kind: "credit" | "debit";
  status: string;
  current_balance: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findMethod(summary: PaymentMethodSummary[], method: string) {
  return summary.find((s) => s.method === method);
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    CASH: "Cash",
    POS: "Card",
    BANK_TRANSFER: "Bank Transfer",
    BKASH: "bKash",
    NAGAD: "Nagad",
    ROCKET: "Rocket",
    WAIVER: "Waiver",
    CHEQUE: "Cheque",
    DIGITAL_WALLET: "Digital Wallet",
  };
  return map[method] ?? method;
}

function admissionTypeLabel(type: string) {
  const map: Record<string, string> = {
    ADMISSION_FEE: "Admission Fee",
    MONTHLY_FEE: "Monthly Fee",
    SESSION_FEE: "Session Fee",
    EXAM_FEE: "Exam Fee",
    MATERIAL_FEE: "Material Fee",
    SALARY: "Salary",
    BONUS: "Bonus",
    REVERSAL: "Reversal",
    OTHER: "Other",
  };
  return map[type] ?? type;
}

function payrollTypeLabel(type: string) {
  const map: Record<string, string> = {
    MONTHLY: "Monthly Salary",
    PER_CLASS: "Per-Class Salary",
    PER_BATCH: "Per-Batch Salary",
    HYBRID: "Hybrid Salary",
  };
  return map[type] ?? type;
}

function buildTransactions(
  payments: Payment[],
  payrollItems: PayrollItem[],
): UnifiedTransaction[] {
  const credits: Omit<UnifiedTransaction, "current_balance">[] = payments.map(
    (p) => ({
      id: `adm-${p.id}`,
      date: p.paid_at ?? p.created_at,
      description: p.notes,
      subtitle: p.student?.name ?? "",
      method: p.method,
      typeLabel: admissionTypeLabel(p.type),
      amount: Number(p.amount),
      kind: "credit",
      status: p.payment_status,
    }),
  );

  const debits: Omit<UnifiedTransaction, "current_balance">[] =
    payrollItems.map((p) => ({
      id: `pay-${p.id}`,
      date: p.paid_at ?? p.created_at,
      description: p.remarks,
      subtitle: `${p.teacher.name} · ${p.payroll_month}`,
      method: p.payment_method,
      typeLabel: payrollTypeLabel(p.payroll_type),
      amount: Number(p.net_amount),
      kind: "debit",
      // normalize: PayrollRecord uses "paid" where payments use "COMPLETED"
      status: p.api_status === "paid" ? "COMPLETED" : p.api_status,
    }));

  // Sort ascending (oldest first) to compute running balance
  const all = [...credits, ...debits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let balance = 0;
  const withBalance: UnifiedTransaction[] = all.map((t) => {
    if (t.status === "COMPLETED") {
      balance += t.kind === "credit" ? t.amount : -t.amount;
    }
    return { ...t, current_balance: balance };
  });

  // Return newest first for display
  return withBalance.reverse();
}

// ── Page component ────────────────────────────────────────────────────────────

type Filters = {
  kind: "all" | "credit" | "debit";
  method: string;
  status: "all" | "COMPLETED" | "pending";
  dateFrom: string;
  dateTo: string;
};

const INITIAL_FILTERS: Filters = {
  kind: "all",
  method: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const ALL_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "POS", label: "Card (POS)" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "WAIVER", label: "Waiver" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
];

export default function AccountingPage() {
  // draft = what the user is editing; appliedFilters = what the table uses
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(INITIAL_FILTERS);

  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ["admissions", "payments", "summary"],
    queryFn: async () => {
      const res = await api.get("/admissions/payments/summary");
      return res.data;
    },
  });

  const paymentsQuery = useQuery<PaymentsResponse>({
    queryKey: ["admissions", "payments"],
    queryFn: async () => {
      const res = await api.get("/admissions/payments", {
        params: { limit: 100 },
      });
      return res.data;
    },
  });

  const payrollQuery = useQuery<PayrollListResponse>({
    queryKey: ["payroll", "records"],
    queryFn: async () => {
      const res = await api.get("/v1/payroll");
      return res.data;
    },
  });

  const summary = summaryQuery.data?.summary ?? [];
  const meta = summaryQuery.data?.meta;
  const payments = paymentsQuery.data?.data ?? [];
  const payrollItems = payrollQuery.data?.items ?? [];

  const transactions = buildTransactions(payments, payrollItems);
  const isLoading = paymentsQuery.isLoading || payrollQuery.isLoading;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (appliedFilters.kind !== "all" && tx.kind !== appliedFilters.kind) return false;
      if (appliedFilters.method !== "all" && tx.method !== appliedFilters.method) return false;
      if (appliedFilters.status !== "all") {
        const completed = tx.status === "COMPLETED";
        if (appliedFilters.status === "COMPLETED" && !completed) return false;
        if (appliedFilters.status === "pending" && completed) return false;
      }
      if (appliedFilters.dateFrom) {
        const from = new Date(appliedFilters.dateFrom);
        if (new Date(tx.date) < from) return false;
      }
      if (appliedFilters.dateTo) {
        const to = new Date(appliedFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(tx.date) > to) return false;
      }
      return true;
    });
  }, [transactions, appliedFilters]);

  const isFiltered =
    appliedFilters.kind !== "all" ||
    appliedFilters.method !== "all" ||
    appliedFilters.status !== "all" ||
    !!appliedFilters.dateFrom ||
    !!appliedFilters.dateTo;

  const setDraftField = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const applyFilters = () => setAppliedFilters({ ...draft });

  const resetAll = () => {
    setDraft(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const cash = findMethod(summary, "CASH");
  const card = findMethod(summary, "POS");
  const bkash = findMethod(summary, "BKASH");

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div>
        <h1 className="text-2xl font-semibold">Accounting</h1>
        <p className="text-sm text-muted-foreground">
          Payment summary and transaction history
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Cash"
          icon={<Banknote className="size-5 text-emerald-500" />}
          amount={cash?.total_amount ?? "0.00"}
          count={cash?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="Card (POS)"
          icon={<CreditCard className="size-5 text-blue-500" />}
          amount={card?.total_amount ?? "0.00"}
          count={card?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="MFS"
          icon={<Smartphone className="size-5 text-pink-500" />}
          amount={bkash?.total_amount ?? "0.00"}
          count={bkash?.count ?? 0}
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          title="Total Amount"
          icon={<TrendingUp className="size-5 text-violet-500" />}
          amount={meta?.grand_total ?? "0.00"}
          count={payments.length}
          loading={summaryQuery.isLoading}
          highlight
        />
      </div>

      {/* ── Accounts History ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* ── Filters ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
              <Select
                value={draft.kind}
                onValueChange={(v) => setDraftField("kind", v as Filters["kind"])}
                className="h-8 w-28 text-xs"
              >
                <option value="all">All Types</option>
                <option value="credit">Income</option>
                <option value="debit">Expense</option>
              </Select>

              <Select
                value={draft.method}
                onValueChange={(v) => setDraftField("method", v)}
                className="h-8 w-32 text-xs"
              >
                <option value="all">All Methods</option>
                {ALL_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <Select
                value={draft.status}
                onValueChange={(v) => setDraftField("status", v as Filters["status"])}
                className="h-8 w-32 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="pending">Pending / Draft</option>
              </Select>

              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraftField("dateFrom", e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={draft.dateTo}
                onChange={(e) => setDraftField("dateTo", e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />

              <button
                onClick={applyFilters}
                className="flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <ListFilter className="size-3" />
                Filter
              </button>
              <button
                onClick={() => setDraft((prev) => ({ ...prev, dateFrom: "", dateTo: "" }))}
                disabled={!draft.dateFrom && !draft.dateTo}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="size-3" />
                Clear
              </button>
              <button
                onClick={resetAll}
                disabled={!isFiltered && draft.kind === "all" && draft.method === "all" && draft.status === "all" && !draft.dateFrom && !draft.dateTo}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-destructive/50 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                  Reset
              </button>
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Transaction Date
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Current Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      Loading transactions…
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      {isFiltered
                        ? "No transactions match the selected filters."
                        : "No transactions found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-55 truncate">
                          {tx.description ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.subtitle}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">
                          {methodLabel(tx.method)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{tx.typeLabel}</Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium whitespace-nowrap ${
                          tx.kind === "debit"
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {tx.kind === "debit" ? "−" : "+"}৳{" "}
                        {formatMoney(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ৳ {formatMoney(tx.current_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredTransactions.length}
              {isFiltered ? ` of ${transactions.length}` : ""} transactions (
              {payments.length} income · {payrollItems.length} payroll)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  amount,
  count,
  loading,
  highlight = false,
}: {
  title: string;
  icon: React.ReactNode;
  amount: string;
  count: number;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        highlight
          ? "border-violet-200 bg-violet-50/30 dark:bg-violet-950/10"
          : ""
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <p
              className={`text-2xl font-bold ${highlight ? "text-violet-700 dark:text-violet-400" : ""}`}
            >
              ৳ {formatMoney(amount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {count} transaction{count !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
