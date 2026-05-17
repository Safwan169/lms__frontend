import api from "@/lib/api"

export type NotificationItem = {
  id: string
  event_type: string
  channel: string
  subject?: string | null
  body?: string | null
  priority?: string | null
  status?: string | null
  is_read: boolean
  source: { module?: string | null; entity_id?: string | null }
  payload?: any
  sent_at?: string | null
  created_at: string
}

export type NotificationListResponse = {
  data: NotificationItem[]
  meta: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean }
  unread_count: number
}

export type UnreadCountResponse = {
  unread_count: number
  by_module: Record<string, number>
}

type QueryParams = Record<string, string | number | boolean | null | undefined>

function clean(params?: QueryParams) {
  if (!params) return undefined
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

function unwrap<T>(resp: any): T {
  const d = resp?.data
  if (d && typeof d === "object" && !Array.isArray(d) && "data" in d && "meta" in d) return d as T
  if (d && typeof d === "object" && !Array.isArray(d) && "data" in d && !("meta" in d)) {
    // some endpoints nest as { data: {...} } — only unwrap when payload doesn't carry meta
    return (d.data ?? d) as T
  }
  return d as T
}

export const notificationsApi = {
  list(tenantId: string, params?: QueryParams) {
    return api
      .get(`/tenants/${tenantId}/notifications`, {
        params: clean(params),
        _suppressToast: true,
      } as any)
      .then((r) => unwrap<NotificationListResponse>(r))
  },

  unreadCount(tenantId: string) {
    return api
      .get(`/tenants/${tenantId}/notifications/unread-count`, { _suppressToast: true } as any)
      .then((r) => unwrap<UnreadCountResponse>(r))
  },

  markRead(tenantId: string, payload: { notification_ids?: string[]; all?: boolean }) {
    return api
      .post(`/tenants/${tenantId}/notifications/mark-read`, payload, { _suppressToast: true } as any)
      .then((r) => unwrap<{ message: string; updated_count: number }>(r))
  },

  remove(tenantId: string, id: string) {
    return api
      .delete(`/tenants/${tenantId}/notifications/${id}`, { _suppressToast: true } as any)
      .then((r) => unwrap<{ message: string }>(r))
  },
}

export default notificationsApi
