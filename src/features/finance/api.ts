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

export const financeApi = {
  async listTenantClasses(tenantId: string | number, params?: QueryParams) {
    const response = await api.get(`/tenants/${tenantId}/classes`, { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async listTenantBatches(tenantId: string | number, params?: QueryParams) {
    const response = await api.get(`/tenants/${tenantId}/batches`, { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

    async listTenantTeachers(tenantId: string | number, params?: QueryParams) {
      const response = await api.get(`/tenants/${tenantId}/teachers`, { params: toQueryParams(params) })
      return unwrapPayload(response)
    },

    async listTenantAccountants(tenantId: string | number, params?: QueryParams) {
      const response = await api.get(`/tenants/${tenantId}/accountants`, { params: toQueryParams(params) })
      return unwrapPayload(response)
    },

    async listTenantEmployees(tenantId: string | number, params?: QueryParams) {
      const response = await api.get(`/tenants/${tenantId}/employees`, { params: toQueryParams(params) })
      return unwrapPayload(response)
    },

  async listFeeStructures(params?: QueryParams) {
    const response = await api.get("/v1/fees", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async createFeeStructure(payload: {
    name: string
    description?: string
    amount: string
    fee_type: "ADMISSION" | "MONTHLY" | "EXAM" | "MATERIAL" | "OTHER"
    batch_id?: string
  }) {
    const response = await api.post("/v1/fees", payload)
    return unwrapPayload(response)
  },

  async updateFeeStructure(
    id: string,
    payload: {
      name?: string
      description?: string
      amount?: string
      fee_type?: "ADMISSION" | "MONTHLY" | "EXAM" | "MATERIAL" | "OTHER"
      batch_id?: string
    },
  ) {
    const response = await api.patch(`/v1/fees/${id}`, payload)
    return unwrapPayload(response)
  },

  async deleteFeeStructure(id: string) {
    const response = await api.delete(`/v1/fees/${id}`)
    return unwrapPayload(response)
  },

  async createBatchFee(
    tenantId: string | number,
    batchId: string,
    payload: {
      fee_type: "MONTHLY" | "SESSION"
      amount: number
      currency?: string
      description?: string
      start_date?: string
      end_date?: string
    },
  ) {
    const response = await api.post(`/tenants/${tenantId}/batches/${batchId}/fee`, payload)
    return unwrapPayload(response)
  },

  async getBatchFee(tenantId: string | number, batchId: string) {
    // Use _suppressToast so 404 (no active fee) does not fire a global error toast.
    const response = await api.get(`/tenants/${tenantId}/batches/${batchId}/fee`, { _suppressToast: true } as any)
    return unwrapPayload(response)
  },

  async updateBatchFee(
    tenantId: string | number,
    batchId: string,
    feeId: string,
    payload: {
      fee_type?: "MONTHLY" | "SESSION"
      amount?: number
      currency?: string
      description?: string
      start_date?: string
      end_date?: string
      is_active?: boolean
    },
  ) {
    const response = await api.patch(`/tenants/${tenantId}/batches/${batchId}/fee/${feeId}`, payload)
    return unwrapPayload(response)
  },

  async deactivateBatchFee(tenantId: string | number, batchId: string, feeId: string) {
    const response = await api.delete(`/tenants/${tenantId}/batches/${batchId}/fee/${feeId}`)
    return unwrapPayload(response)
  },

  async runBilling(payload: { month: string; due_date?: string; remarks?: string; student_ids?: string[] }) {
    const response = await api.post("/v1/billing/run", payload)
    return unwrapPayload(response)
  },

  async listBillingCycles(params?: QueryParams) {
    const response = await api.get("/v1/billing/cycles", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async listInvoices(params?: QueryParams) {
    const response = await api.get("/v1/invoices", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async getStudentBillingDashboard(params?: QueryParams) {
    const response = await api.get("/v1/billing/dashboard", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async getStudentInvoices(studentId: string, params?: QueryParams) {
    const response = await api.get(`/v1/invoices/student/${studentId}`, { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async getStudentPayments(studentId: string, params?: QueryParams) {
    const response = await api.get(`/v1/payments/student/${studentId}`, { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async getStudentWallet(studentId: string, params?: QueryParams) {
    const response = await api.get(`/v1/wallet/${studentId}`, { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async sendInvoiceReminder(payload: { month?: string; status?: "due" | "overdue"; message?: string }) {
    const response = await api.post("/v1/reminders/send", payload)
    return unwrapPayload(response)
  },

  async applyInvoiceFine(payload: {
    month?: string
    status?: "due" | "overdue"
    fine_amount: string
    title?: string
    description?: string
  }) {
    const response = await api.post("/v1/invoices/apply-fine", payload)
    return unwrapPayload(response)
  },

  async createReceipt(payload: { invoice_id?: string; payment_record_id?: string; notes?: string }) {
    const response = await api.post("/v1/receipts", payload)
    return unwrapPayload(response)
  },

  async applyWallet(payload: {
    student_id: string
    invoice_id: string
    amount: string
    notes?: string
    tenant_id?: string
    tenant_slug?: string
  }) {
    const response = await api.post("/v1/wallet/apply", payload)
    return unwrapPayload(response)
  },

  async downloadInvoice(invoiceId: string) {
    const response = await api.get(`/v1/invoices/${invoiceId}/download`, { responseType: "blob" })
    return response.data as Blob
  },

  async downloadReceipt(receiptId: string) {
    const response = await api.get(`/v1/receipts/${receiptId}/download`, { responseType: "blob" })
    return response.data as Blob
  },

  async listPayrollMonths() {
    const response = await api.get("/v1/payroll/months")
    return unwrapPayload(response)
  },

  async openPayrollMonth(payload: { month: string; remarks?: string }) {
    const response = await api.post("/v1/payroll/months/open", payload)
    return unwrapPayload(response)
  },

  async closePayrollMonth(payload: { month: string; remarks?: string }) {
    const response = await api.post("/v1/payroll/months/close", payload)
    return unwrapPayload(response)
  },

  async runPayroll(payload: { month: string; remarks?: string }) {
    const response = await api.post("/v1/payroll/run", payload)
    return unwrapPayload(response)
  },

  async listPayrolls(params?: QueryParams) {
    const response = await api.get("/v1/payroll", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async finalizePayroll(payrollId: string, payload?: { payment_method?: string; remarks?: string; paid_at?: string }) {
    const response = await api.post(`/v1/payroll/${payrollId}/finalize`, payload ?? {})
    return unwrapPayload(response)
  },

  async payPayroll(
    payrollId: string,
    payload: { amount?: string; method: string; payment_status?: string; transaction_id?: string; notes?: string; paid_at?: string },
  ) {
    const response = await api.post(`/v1/payroll/${payrollId}/pay`, payload)
    return unwrapPayload(response)
  },

  async listPayrollPayments(params?: QueryParams) {
    const response = await api.get("/v1/payroll/payments", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async downloadPayslip(payrollId: string) {
    const response = await api.get(`/v1/payroll/${payrollId}/payslip/download`, { responseType: "blob" })
    return response.data as Blob
  },

  // Salary Config
  async listSalaryConfigs(params?: QueryParams) {
    const response = await api.get("/v1/payroll/salary-config", { params: toQueryParams(params) })
    return unwrapPayload(response)
  },

  async createSalaryConfig(payload: {
    user_id: string
    payroll_type: "MONTHLY" | "PER_CLASS" | "PER_BATCH" | "HYBRID"
    monthly_salary?: string | number
    per_class_rate?: string | number
    per_batch_rate?: string | number
    remarks?: string
  }) {
    const response = await api.post("/v1/payroll/salary-config", payload)
    return unwrapPayload(response)
  },

  async updateSalaryConfig(
    id: string,
    payload: {
      payroll_type?: "MONTHLY" | "PER_CLASS" | "PER_BATCH" | "HYBRID"
      monthly_salary?: string | number
      per_class_rate?: string | number
      per_batch_rate?: string | number
      remarks?: string
    },
  ) {
    const response = await api.patch(`/v1/payroll/salary-config/${id}`, payload)
    return unwrapPayload(response)
  },

  async deleteSalaryConfig(id: string) {
    const response = await api.delete(`/v1/payroll/salary-config/${id}`)
    return unwrapPayload(response)
  },

  async getSalaryConfigByUserId(userId: string) {
    const response = await api.get(`/v1/payroll/salary-config/${userId}`, { _suppressToast: true } as any)
    return unwrapPayload(response)
  },

  // Payroll extras
  async getPayrollById(payrollId: string) {
    const response = await api.get(`/v1/payroll/${payrollId}`)
    return unwrapPayload(response)
  },

  async updatePayroll(
    payrollId: string,
    payload: {
      bonus?: string | number
      allowance?: string | number
      deduction?: string | number
      remarks?: string
      status?: string
    },
  ) {
    const response = await api.patch(`/v1/payroll/${payrollId}`, payload)
    return unwrapPayload(response)
  },

  async finalizeBatchPayroll(payload: {
    month?: string
    payroll_ids?: string[]
    payment_method?: string
    paid_at?: string
    remarks?: string
  }) {
    const response = await api.post("/v1/payroll/finalize", payload)
    return unwrapPayload(response)
  },

  async syncRevenuePayments(payload: {
    month?: string
    payment_status?: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED"
  } = {}) {
    const response = await api.post("/v1/accounting/revenue/sync/payments", payload)
    return unwrapPayload(response)
  },

  async syncExpensePayrollPayments(payload: {
    month?: string
    status?: "PAID" | "PENDING" | "CANCELLED"
  } = {}) {
    const response = await api.post("/v1/accounting/expenses/sync/payroll-payments", payload)
    return unwrapPayload(response)
  },
}

export default financeApi