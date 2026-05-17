import api from "@/lib/api"
import type {
  CreateNoticePayload,
  FeedNotice,
  NoticeDetail,
  NoticeSummary,
  Paginated,
  UpdateNoticePayload,
} from "./types"

type QueryParams = Record<string, string | number | boolean | null | undefined>

function toQueryParams(params?: QueryParams) {
  if (!params) return undefined
  const cleaned = Object.entries(params).reduce<Record<string, string | number | boolean>>(
    (acc, [key, value]) => {
      if (value === undefined || value === null || value === "") return acc
      acc[key] = value
      return acc
    },
    {},
  )
  return Object.keys(cleaned).length ? cleaned : undefined
}

function unwrap<T = any>(response: { data?: any }): T {
  const d = response?.data
  if (d && typeof d === "object" && "data" in d && !Array.isArray(d)) {
    return d as T
  }
  return d as T
}

export const noticesApi = {
  adminList(tenantId: string, params?: QueryParams) {
    return api
      .get(`/tenants/${tenantId}/notices`, { params: toQueryParams(params) })
      .then((r) => unwrap<Paginated<NoticeSummary>>(r))
  },

  feed(tenantId: string, params?: QueryParams) {
    return api
      .get(`/tenants/${tenantId}/notices/feed`, { params: toQueryParams(params) })
      .then((r) => unwrap<Paginated<FeedNotice>>(r))
  },

  getOne(tenantId: string, id: string) {
    return api
      .get(`/tenants/${tenantId}/notices/${id}`)
      .then((r) => unwrap<{ notice: NoticeDetail }>(r))
  },

  create(tenantId: string, payload: CreateNoticePayload) {
    return api.post(`/tenants/${tenantId}/notices`, payload).then((r) => unwrap(r))
  },

  update(tenantId: string, id: string, payload: UpdateNoticePayload, notifyAgain = false) {
    const params = notifyAgain ? { notify_again: true } : undefined
    return api
      .patch(`/tenants/${tenantId}/notices/${id}`, payload, { params })
      .then((r) => unwrap(r))
  },

  remove(tenantId: string, id: string) {
    return api.delete(`/tenants/${tenantId}/notices/${id}`).then((r) => unwrap(r))
  },

  publish(tenantId: string, id: string) {
    return api.post(`/tenants/${tenantId}/notices/${id}/publish`).then((r) => unwrap(r))
  },

  schedule(tenantId: string, id: string, publish_at: string) {
    return api
      .post(`/tenants/${tenantId}/notices/${id}/schedule`, { publish_at })
      .then((r) => unwrap(r))
  },

  archive(tenantId: string, id: string) {
    return api.post(`/tenants/${tenantId}/notices/${id}/archive`).then((r) => unwrap(r))
  },

  pin(tenantId: string, id: string, is_pinned: boolean) {
    return api
      .patch(`/tenants/${tenantId}/notices/${id}/pin`, { is_pinned })
      .then((r) => unwrap(r))
  },

  markRead(tenantId: string, id: string) {
    return api.post(`/tenants/${tenantId}/notices/${id}/read`).then((r) => unwrap(r))
  },

  reads(tenantId: string, id: string, params?: QueryParams) {
    return api
      .get(`/tenants/${tenantId}/notices/${id}/reads`, { params: toQueryParams(params) })
      .then((r) => unwrap(r))
  },

  recipientsPreview(tenantId: string, audience: any) {
    return api
      .post(`/tenants/${tenantId}/notices/recipients/preview`, { audience })
      .then((r) => unwrap(r))
  },
}

export default noticesApi
