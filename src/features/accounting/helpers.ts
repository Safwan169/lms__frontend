export function monthNow() {
  return new Date().toISOString().slice(0, 7)
}

export function yearNow() {
  return new Date().getFullYear()
}

export function formatMoney(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return "0.00"
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(value: unknown) {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateOnly(value: unknown) {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" })
}

type ListPayload<T> = T[] | { items?: T[]; categories?: T[]; periods?: T[]; accounts?: T[]; data?: T[] } | null | undefined

export function asList<T>(payload: ListPayload<T>): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  const candidates = ["items", "categories", "periods", "accounts", "data"] as const
  for (const key of candidates) {
    const value = (payload as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

export function ledgerStatusVariant(status: string): "default" | "warning" | "destructive" | "muted" {
  const key = String(status ?? "").toUpperCase()
  if (key === "POSTED") return "default"
  if (key === "DRAFT") return "warning"
  if (key === "REVERSED") return "destructive"
  return "muted"
}

export function reconStatusVariant(status: string): "default" | "warning" | "destructive" | "muted" {
  const key = String(status ?? "").toUpperCase()
  if (key === "MATCHED" || key === "RESOLVED") return "default"
  if (key === "PENDING") return "warning"
  if (key === "MISMATCH") return "destructive"
  return "muted"
}

export function periodStatusVariant(status: string): "default" | "warning" | "destructive" | "muted" {
  const key = String(status ?? "").toUpperCase()
  if (key === "OPEN") return "default"
  if (key === "CLOSED") return "warning"
  if (key === "LOCKED") return "destructive"
  return "muted"
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
