import api from "@/lib/api"

type QueryParams = Record<string, string | number | boolean | null | undefined>

function toQueryParams(params?: QueryParams) {
  if (!params) return undefined
  const cleaned = Object.entries(params).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") return acc
    acc[key] = value
    return acc
  }, {})
  return Object.keys(cleaned).length ? cleaned : undefined
}

function unwrapPayload<T = unknown>(response: { data?: { data?: T } | T }): T {
  const data = response.data
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: T }).data as T
  }
  return data as T
}

export const accountingApi = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  async getDashboard() {
    const response = await api.get("/v1/accounting/dashboard")
    return unwrapPayload(response)
  },
  async getDashboardMonthly() {
    const response = await api.get("/v1/accounting/dashboard/monthly")
    return unwrapPayload(response)
  },
  async getDashboardYearly() {
    const response = await api.get("/v1/accounting/dashboard/yearly")
    return unwrapPayload(response)
  },
  async getDashboardCashflow() {
    const response = await api.get("/v1/accounting/dashboard/cashflow")
    return unwrapPayload(response)
  },

  // ── Revenue ──────────────────────────────────────────────────────────────
  async listRevenue(params?: QueryParams) {
    const response = await api.get("/v1/accounting/revenue", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getRevenueById(revenueId: string) {
    const response = await api.get(`/v1/accounting/revenue/${revenueId}`)
    return unwrapPayload(response)
  },
  async getRevenueMonthlySummary(params?: QueryParams) {
    const response = await api.get("/v1/accounting/revenue/summary/monthly", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getRevenueYearlySummary(params?: QueryParams) {
    const response = await api.get("/v1/accounting/revenue/summary/yearly", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getRevenueByCategory(params?: QueryParams) {
    const response = await api.get("/v1/accounting/revenue/by-category", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async syncRevenuePayment(paymentId: string) {
    const response = await api.post(`/v1/accounting/revenue/sync/payment/${paymentId}`)
    return unwrapPayload(response)
  },
  async syncRevenuePayments(payload: {
    month?: string
    payment_status?: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED"
  } = {}) {
    const response = await api.post("/v1/accounting/revenue/sync/payments", payload)
    return unwrapPayload(response)
  },

  // ── Expenses ─────────────────────────────────────────────────────────────
  async syncExpensePayroll(payrollId: string) {
    const response = await api.post(`/v1/accounting/expenses/sync/payroll/${payrollId}`)
    return unwrapPayload(response)
  },
  async syncExpensePayrollPayments(payload: {
    month?: string
    status?: "PAID" | "PENDING" | "CANCELLED"
  } = {}) {
    const response = await api.post("/v1/accounting/expenses/sync/payroll-payments", payload)
    return unwrapPayload(response)
  },

  // ── Ledger ───────────────────────────────────────────────────────────────
  async listLedger(params?: QueryParams) {
    const response = await api.get("/v1/accounting/ledger", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getLedgerById(ledgerId: string) {
    const response = await api.get(`/v1/accounting/ledger/${ledgerId}`)
    return unwrapPayload(response)
  },
  async createManualLedger(payload: {
    description: string
    ledger_number?: string
    entry_date?: string
    value_date?: string | null
    reference_no?: string | null
    status?: "DRAFT" | "POSTED"
    source_type?: string
    source_id?: string | null
    category_id?: string | null
    currency?: string
    total_debit?: number
    total_credit?: number
    metadata?: Record<string, unknown> | null
  }) {
    const response = await api.post("/v1/accounting/ledger/manual", payload)
    return unwrapPayload(response)
  },
  async updateLedger(ledgerId: string, payload: Record<string, unknown>) {
    const response = await api.patch(`/v1/accounting/ledger/${ledgerId}`, payload)
    return unwrapPayload(response)
  },
  async deleteLedger(ledgerId: string) {
    const response = await api.delete(`/v1/accounting/ledger/${ledgerId}`)
    return unwrapPayload(response)
  },
  async reverseLedger(ledgerId: string, payload: { reason?: string; reversal_ledger_number?: string } = {}) {
    const response = await api.post(`/v1/accounting/ledger/${ledgerId}/reverse`, payload)
    return unwrapPayload(response)
  },
  async exportLedger(params?: QueryParams) {
    const response = await api.get("/v1/accounting/ledger/export", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  // ── Categories ───────────────────────────────────────────────────────────
  async listCategories(params?: QueryParams) {
    const response = await api.get("/v1/accounting/categories", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getCategoryById(categoryId: string) {
    const response = await api.get(`/v1/accounting/categories/${categoryId}`)
    return unwrapPayload(response)
  },
  async createCategory(payload: { name: string; type?: "REVENUE" | "EXPENSE" | "BOTH"; description?: string }) {
    const response = await api.post("/v1/accounting/categories", payload)
    return unwrapPayload(response)
  },
  async updateCategory(
    categoryId: string,
    payload: { name?: string; type?: "REVENUE" | "EXPENSE" | "BOTH"; description?: string | null; is_active?: boolean },
  ) {
    const response = await api.patch(`/v1/accounting/categories/${categoryId}`, payload)
    return unwrapPayload(response)
  },
  async deleteCategory(categoryId: string) {
    const response = await api.delete(`/v1/accounting/categories/${categoryId}`)
    return unwrapPayload(response)
  },

  // ── Balances ─────────────────────────────────────────────────────────────
  async getBalances() {
    const response = await api.get("/v1/accounting/balances")
    return unwrapPayload(response)
  },
  async getCashBalances() {
    const response = await api.get("/v1/accounting/balances/cash")
    return unwrapPayload(response)
  },
  async getBankBalances() {
    const response = await api.get("/v1/accounting/balances/bank")
    return unwrapPayload(response)
  },
  async getBalanceHistory(params?: QueryParams) {
    const response = await api.get("/v1/accounting/balances/history", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async adjustCashBalance(payload: {
    balance_id: string
    amount: number
    adjustment_type?: "CREDIT" | "DEBIT"
    note?: string
    reference_type?: string
    reference_id?: string
  }) {
    const response = await api.post("/v1/accounting/balances/cash/adjust", payload)
    return unwrapPayload(response)
  },
  async adjustBankBalance(payload: {
    balance_id: string
    amount: number
    adjustment_type?: "CREDIT" | "DEBIT"
    note?: string
    reference_type?: string
    reference_id?: string
  }) {
    const response = await api.post("/v1/accounting/balances/bank/adjust", payload)
    return unwrapPayload(response)
  },
  async transferBalance(payload: {
    from_balance_id: string
    to_balance_id: string
    amount: number
    note?: string
  }) {
    const response = await api.post("/v1/accounting/balances/transfer", payload)
    return unwrapPayload(response)
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  async getMonthlyIncome(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/monthly-income", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getMonthlyExpenses(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/monthly-expenses", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getMonthlyProfitLoss(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/monthly-profit-loss", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getYearlySummary(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/yearly-summary", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getYearlyProfitLoss(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/yearly-profit-loss", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getYearlyTrends(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/yearly-trends", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getCashflowReport(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/cashflow", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getRevenueVsExpense(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reports/revenue-vs-expense", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getFinancialOverview() {
    const response = await api.get("/v1/accounting/reports/financial-overview")
    return unwrapPayload(response)
  },
  async downloadReport(params: QueryParams) {
    const response = await api.get("/v1/accounting/reports/download", {
      params: toQueryParams(params),
      responseType: "blob",
    })
    return response.data as Blob
  },

  // ── Reconciliation ───────────────────────────────────────────────────────
  async listReconciliations(params?: QueryParams) {
    const response = await api.get("/v1/accounting/reconciliation", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getReconciliationById(id: string) {
    const response = await api.get(`/v1/accounting/reconciliation/${id}`)
    return unwrapPayload(response)
  },
  async runReconciliation(payload: { period_key?: string; notes?: string } = {}) {
    const response = await api.post("/v1/accounting/reconciliation/run", payload)
    return unwrapPayload(response)
  },
  async resolveReconciliation(id: string, payload: { notes?: string } = {}) {
    const response = await api.post(`/v1/accounting/reconciliation/${id}/resolve`, payload)
    return unwrapPayload(response)
  },

  // ── Financial Periods ────────────────────────────────────────────────────
  async listPeriods(params?: QueryParams) {
    const response = await api.get("/v1/accounting/periods", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async openPeriod(payload: { period_key: string; start_date?: string; end_date?: string; notes?: string }) {
    const response = await api.post("/v1/accounting/periods/open", payload)
    return unwrapPayload(response)
  },
  async closePeriod(payload: { period_id: string; notes?: string }) {
    const response = await api.post("/v1/accounting/periods/close", payload)
    return unwrapPayload(response)
  },
  async lockPeriod(payload: { period_id: string; notes?: string }) {
    const response = await api.post("/v1/accounting/periods/lock", payload)
    return unwrapPayload(response)
  },
  async reopenPeriod(payload: { period_id: string; notes?: string }) {
    const response = await api.post("/v1/accounting/periods/reopen", payload)
    return unwrapPayload(response)
  },

  // ── Audit / Activity ─────────────────────────────────────────────────────
  async getActivityLogs(params?: QueryParams) {
    const response = await api.get("/v1/accounting/activity-logs", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
  async getAuditTrail(transactionId: string) {
    const response = await api.get(`/v1/accounting/audit/${transactionId}`)
    return unwrapPayload(response)
  },
  async getSystemEvents(params?: QueryParams) {
    const response = await api.get("/v1/accounting/system-events", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },
}

export default accountingApi
