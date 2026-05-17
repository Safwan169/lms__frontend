export type NoticeState = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED" | "ARCHIVED"

export type NoticeCategory =
  | "GENERAL"
  | "ACADEMIC"
  | "EXAM"
  | "EVENT"
  | "HOLIDAY"
  | "EMERGENCY"
  | "FEE"
  | "ADMISSION"
  | "OTHER"

export type NoticePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

export type NoticeAudienceType = "ROLE" | "CLASS" | "BATCH" | "USER" | "ALL"

export interface Audience {
  audience_type: NoticeAudienceType
  role_targets?: string[]
  class_ids?: string[]
  batch_ids?: string[]
  user_ids?: string[]
}

export interface NoticeSummary {
  id: string
  title: string
  category: NoticeCategory
  priority: NoticePriority
  state: NoticeState
  is_pinned: boolean
  author?: { id: string; name?: string; role?: string }
  published_at?: string | null
  created_at?: string
  expires_at?: string | null
  attachment_count?: number
  read_count?: number
}

export interface FeedNotice {
  id: string
  title: string
  category: NoticeCategory
  priority: NoticePriority
  is_pinned: boolean
  is_urgent: boolean
  highlight_color: string | null
  author?: { id: string; name?: string }
  preview?: string
  attachment_count?: number
  published_at?: string | null
  expires_at?: string | null
  read_by_me: boolean
}

export interface NoticeDetail extends NoticeSummary {
  content: string
  audience: Audience
  attachments?: Array<{ id: string; media_id: string; media?: any }>
  recipient_count?: number
  read_by_me?: boolean
}

export interface Paginated<T> {
  data: T[]
  meta?: {
    page: number
    limit: number
    total: number
    totalPages?: number
  }
}

export interface CreateNoticePayload {
  title: string
  content: string
  category: NoticeCategory
  priority?: NoticePriority
  is_pinned?: boolean
  audience: Audience
  expires_at?: string
  attachment_media_ids?: string[]
}

export type UpdateNoticePayload = Partial<CreateNoticePayload>
