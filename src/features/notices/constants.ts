import type { NoticeCategory, NoticePriority, NoticeState } from "./types"

export const CATEGORIES: NoticeCategory[] = [
  "GENERAL",
  "ACADEMIC",
  "EXAM",
  "EVENT",
  "HOLIDAY",
  "EMERGENCY",
  "FEE",
  "ADMISSION",
  "OTHER",
]

export const PRIORITIES: NoticePriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"]

export const STATES: NoticeState[] = ["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]

export const CATEGORY_STYLES: Record<NoticeCategory, { bg: string; text: string; ring: string }> = {
  GENERAL:   { bg: "#eef2ff", text: "#4f46e5", ring: "#c7d2fe" },
  ACADEMIC:  { bg: "#ecfeff", text: "#0e7490", ring: "#a5f3fc" },
  EXAM:      { bg: "#fef3c7", text: "#a16207", ring: "#fde68a" },
  EVENT:     { bg: "#fae8ff", text: "#a21caf", ring: "#f5d0fe" },
  HOLIDAY:   { bg: "#dcfce7", text: "#15803d", ring: "#bbf7d0" },
  EMERGENCY: { bg: "#fee2e2", text: "#b91c1c", ring: "#fecaca" },
  FEE:       { bg: "#fef9c3", text: "#854d0e", ring: "#fef08a" },
  ADMISSION: { bg: "#e0e7ff", text: "#3730a3", ring: "#c7d2fe" },
  OTHER:     { bg: "#f3f4f6", text: "#4b5563", ring: "#e5e7eb" },
}

export const PRIORITY_STYLES: Record<NoticePriority, { bg: string; text: string }> = {
  LOW:    { bg: "#f3f4f6", text: "#6b7280" },
  NORMAL: { bg: "#dbeafe", text: "#1d4ed8" },
  HIGH:   { bg: "#ffedd5", text: "#c2410c" },
  URGENT: { bg: "#fee2e2", text: "#b91c1c" },
}

export const STATE_STYLES: Record<NoticeState, { bg: string; text: string; dot: string }> = {
  DRAFT:     { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
  SCHEDULED: { bg: "#e0f2fe", text: "#0369a1", dot: "#0ea5e9" },
  PUBLISHED: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  EXPIRED:   { bg: "#fef3c7", text: "#a16207", dot: "#eab308" },
  ARCHIVED:  { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
}

export const ROLE_TARGETS = ["ADMIN", "TEACHER", "STUDENT", "ACCOUNTANT", "EMPLOYEE"]

export function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}
