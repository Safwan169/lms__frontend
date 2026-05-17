"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, Save, Send, X } from "lucide-react"
import toast from "react-hot-toast"

import noticesApi from "@/features/notices/api"
import { CATEGORIES, PRIORITIES } from "@/features/notices/constants"
import type {
  Audience,
  CreateNoticePayload,
  NoticeAudienceType,
  NoticeCategory,
  NoticePriority,
} from "@/features/notices/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import AudiencePicker from "./AudiencePicker"

type Props = {
  mode: "create" | "edit"
  tenantId: string
  noticeId?: string
  onClose: () => void
  onSaved: () => void
}

export default function NoticeFormDialog({ mode, tenantId, noticeId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<NoticeCategory>("GENERAL")
  const [priority, setPriority] = useState<NoticePriority>("NORMAL")
  const [isPinned, setIsPinned] = useState(false)
  const [expiresAt, setExpiresAt] = useState("")
  const [audienceType, setAudienceType] = useState<NoticeAudienceType>("ALL")
  const [roleTargets, setRoleTargets] = useState<string[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [batchIds, setBatchIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["notices", "detail", tenantId, noticeId],
    queryFn: () => noticesApi.getOne(tenantId, noticeId!),
    enabled: mode === "edit" && !!noticeId,
  })

  useEffect(() => {
    if (mode !== "edit" || !existing) return
    const n: any = (existing as any).notice ?? existing
    setTitle(n.title ?? "")
    setContent(n.content ?? "")
    setCategory((n.category as NoticeCategory) ?? "GENERAL")
    setPriority((n.priority as NoticePriority) ?? "NORMAL")
    setIsPinned(!!n.is_pinned)
    setExpiresAt(n.expires_at ? n.expires_at.slice(0, 16) : "")
    const aud: Audience = n.audience ?? { audience_type: "ALL" }
    setAudienceType(aud.audience_type ?? "ALL")
    setRoleTargets(aud.role_targets ?? [])
    setClassIds(aud.class_ids ?? [])
    setBatchIds(aud.batch_ids ?? [])
    setUserIds(aud.user_ids ?? [])
  }, [existing, mode])

  function buildPayload(): CreateNoticePayload | null {
    if (!title.trim()) {
      toast.error("Title is required")
      return null
    }
    if (!content.trim()) {
      toast.error("Content is required")
      return null
    }
    const audience: Audience = { audience_type: audienceType }
    if (audienceType === "ROLE") {
      if (roleTargets.length === 0) {
        toast.error("Select at least one role")
        return null
      }
      audience.role_targets = roleTargets
    } else if (audienceType === "CLASS") {
      if (!classIds.length) {
        toast.error("Select at least one class")
        return null
      }
      audience.class_ids = classIds
    } else if (audienceType === "BATCH") {
      if (!batchIds.length) {
        toast.error("Select at least one batch")
        return null
      }
      audience.batch_ids = batchIds
    } else if (audienceType === "USER") {
      if (!userIds.length) {
        toast.error("Select at least one user")
        return null
      }
      audience.user_ids = userIds
    }

    const payload: CreateNoticePayload = {
      title: title.trim(),
      content,
      category,
      priority,
      is_pinned: isPinned,
      audience,
    }
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString()
    return payload
  }

  const saveMut = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      const payload = buildPayload()
      if (!payload) throw new Error("invalid")
      if (mode === "create") {
        const created = await noticesApi.create(tenantId, payload)
        const id = (created as any)?.notice?.id ?? (created as any)?.id
        if (publish && id) {
          await noticesApi.publish(tenantId, id)
        }
        return { id, publish }
      }
      await noticesApi.update(tenantId, noticeId!, payload)
      if (publish) await noticesApi.publish(tenantId, noticeId!)
      return { id: noticeId!, publish }
    },
    onSuccess: (res: any) => {
      toast.success(
        res.publish ? "Notice published" : mode === "create" ? "Draft saved" : "Notice updated",
      )
      onSaved()
    },
    onError: (e: any) => {
      if (e?.message === "invalid") return
      toast.error(e?.response?.data?.message ?? "Save failed")
    },
  })

  const submitting = saveMut.isPending

  return (
    <Dialog open onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="text-lg">
            {mode === "create" ? "Create Notice" : "Edit Notice"}
          </DialogTitle>
          <DialogDescription>
            Save as draft, or publish immediately to fan-out to the target audience.
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && loadingExisting ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <Field label="Title" required>
              <Input
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A concise headline…"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">{title.length}/200</span>
            </Field>

            <Field label="Content" required>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write your notice. You can use plain text or HTML."
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as NoticePriority)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Expires at (optional)">
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </Field>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300"
              />
              Pin this notice to the top of the feed
            </label>

            <AudiencePicker
              tenantId={tenantId}
              audienceType={audienceType}
              setAudienceType={setAudienceType}
              roleTargets={roleTargets}
              setRoleTargets={setRoleTargets}
              classIds={classIds}
              setClassIds={setClassIds}
              batchIds={batchIds}
              setBatchIds={setBatchIds}
              userIds={userIds}
              setUserIds={setUserIds}
            />
          </div>
        )}

        <div className="px-6 py-4 border-t bg-slate-50/60 flex items-center justify-end gap-2 sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => saveMut.mutate({ publish: false })}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Draft
          </Button>
          <Button
            type="button"
            className="bg-[#171717] text-white"
            disabled={submitting}
            onClick={() => saveMut.mutate({ publish: true })}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1.5 inline-block">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}
