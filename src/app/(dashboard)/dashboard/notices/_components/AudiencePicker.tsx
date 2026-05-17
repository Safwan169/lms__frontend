"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, Search, Users, X } from "lucide-react"

import api from "@/lib/api"
import { ROLE_TARGETS } from "@/features/notices/constants"
import type { Audience, NoticeAudienceType } from "@/features/notices/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const AUDIENCE_TYPES: NoticeAudienceType[] = ["ALL", "ROLE", "CLASS", "BATCH", "USER"]

type Option = { id: string; label: string; sublabel?: string }

type Props = {
  tenantId: string
  audienceType: NoticeAudienceType
  setAudienceType: (t: NoticeAudienceType) => void
  roleTargets: string[]
  setRoleTargets: (v: string[]) => void
  classIds: string[]
  setClassIds: (v: string[]) => void
  batchIds: string[]
  setBatchIds: (v: string[]) => void
  userIds: string[]
  setUserIds: (v: string[]) => void
}

function unwrapList<T>(resp: any): T[] {
  const d = resp?.data
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.data)) return d.data
  if (Array.isArray(d?.data?.data)) return d.data.data
  if (Array.isArray(d?.items)) return d.items
  return []
}

function classesQuery(tenantId: string) {
  return async (): Promise<Option[]> => {
    const resp = await api.get(`/tenants/${tenantId}/classes`, { params: { limit: 100 } })
    return unwrapList<any>(resp).map((c) => ({
      id: c.id,
      label: c.name ?? c.title ?? c.id,
    }))
  }
}

function batchesQuery(tenantId: string) {
  return async (): Promise<Option[]> => {
    const resp = await api.get(`/tenants/${tenantId}/batches`, { params: { limit: 100 } })
    return unwrapList<any>(resp).map((b) => ({
      id: b.id,
      label: b.name ?? b.title ?? b.id,
      sublabel: b.class?.name ?? b.class_name,
    }))
  }
}

function usersQuery(tenantId: string) {
  return async (): Promise<Option[]> => {
    const endpoints = ["teachers", "students", "accountants", "employees"] as const
    const settled = await Promise.allSettled(
      endpoints.map((e) =>
        api.get(`/tenants/${tenantId}/${e}`, {
          params: { limit: 100 },
          _suppressToast: true,
        } as any),
      ),
    )

    const collected: Option[] = []
    settled.forEach((res, idx) => {
      if (res.status !== "fulfilled") return
      const role = endpoints[idx].slice(0, -1).toUpperCase() // teacher → TEACHER
      for (const u of unwrapList<any>(res.value)) {
        const id = u.user_id ?? u.userId ?? u.id ?? u.uuid
        if (!id) continue
        const name = u.name ?? u.full_name ?? u.fullName ?? u.username ?? u.email ?? id
        collected.push({
          id: String(id),
          label: name,
          sublabel: `${role} · ${u.email ?? u.phone ?? ""}`.replace(/\s·\s$/, ""),
        })
      }
    })

    const seen = new Set<string>()
    return collected.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
  }
}

export default function AudiencePicker({
  tenantId,
  audienceType,
  setAudienceType,
  roleTargets,
  setRoleTargets,
  classIds,
  setClassIds,
  batchIds,
  setBatchIds,
  userIds,
  setUserIds,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-800">Target audience</div>
        <span className="text-[11px] text-slate-500">Who should receive this notice?</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {AUDIENCE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAudienceType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              audienceType === t
                ? "bg-[#171717] text-white border-[#171717]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {t === "ALL"
              ? "Everyone"
              : t === "ROLE"
                ? "By role"
                : t === "CLASS"
                  ? "By class"
                  : t === "BATCH"
                    ? "By batch"
                    : "Specific users"}
          </button>
        ))}
      </div>

      {audienceType === "ALL" && (
        <p className="text-xs text-slate-500">
          This notice will be visible to all users in your tenant.
        </p>
      )}

      {audienceType === "ROLE" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {ROLE_TARGETS.map((r) => {
            const active = roleTargets.includes(r)
            return (
              <button
                key={r}
                type="button"
                onClick={() =>
                  setRoleTargets(
                    active ? roleTargets.filter((x) => x !== r) : [...roleTargets, r],
                  )
                }
                className={`px-3 py-1 rounded-md text-xs border transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>
      )}

      {audienceType === "CLASS" && (
        <AudienceTrigger
          label="Classes"
          dialogTitle="Select classes"
          placeholder="Search classes…"
          queryKey={["audience-classes", tenantId]}
          queryFn={classesQuery(tenantId)}
          selected={classIds}
          onChange={setClassIds}
        />
      )}

      {audienceType === "BATCH" && (
        <AudienceTrigger
          label="Batches"
          dialogTitle="Select batches"
          placeholder="Search batches…"
          queryKey={["audience-batches", tenantId]}
          queryFn={batchesQuery(tenantId)}
          selected={batchIds}
          onChange={setBatchIds}
        />
      )}

      {audienceType === "USER" && (
        <AudienceTrigger
          label="Users"
          dialogTitle="Select users"
          placeholder="Search users by name or email…"
          queryKey={["audience-users", tenantId]}
          queryFn={usersQuery(tenantId)}
          selected={userIds}
          onChange={setUserIds}
        />
      )}
    </div>
  )
}

function AudienceTrigger({
  label,
  dialogTitle,
  placeholder,
  queryKey,
  queryFn,
  selected,
  onChange,
}: {
  label: string
  dialogTitle: string
  placeholder?: string
  queryKey: any[]
  queryFn: () => Promise<Option[]>
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const { data } = useQuery({ queryKey, queryFn })
  const options = data ?? []
  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.id)),
    [options, selected],
  )

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        <div className="text-[11px] text-slate-500">
          {selected.length > 0 ? `${selected.length} selected` : "None selected"}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-2.5 flex flex-wrap gap-1.5 min-h-11 items-center">
        {selectedOptions.length === 0 ? (
          <span className="text-xs text-slate-400">No {label.toLowerCase()} selected yet</span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded-full"
            >
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="hover:text-rose-300"
                aria-label={`Remove ${o.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="ml-auto h-7 text-xs"
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          {selected.length > 0 ? "Edit selection" : "Choose…"}
        </Button>
      </div>

      <SelectionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={dialogTitle}
        placeholder={placeholder}
        options={options}
        selected={selected}
        onChange={onChange}
      />
    </div>
  )
}

function SelectionDialog({
  open,
  onClose,
  title,
  placeholder,
  options,
  selected,
  onChange,
}: {
  open: boolean
  onClose: () => void
  title: string
  placeholder?: string
  options: Option[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState<string[]>(selected)

  // Sync draft when dialog reopens
  useMemo(() => {
    if (open) setDraft(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(s) ||
        (o.sublabel?.toLowerCase().includes(s) ?? false),
    )
  }, [options, search])

  const toggle = (id: string) => {
    setDraft((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => draft.includes(o.id))
  const selectAllFiltered = () => {
    const ids = new Set(draft)
    filtered.forEach((o) => ids.add(o.id))
    setDraft(Array.from(ids))
  }
  const clearAllFiltered = () => {
    const remove = new Set(filtered.map((o) => o.id))
    setDraft(draft.filter((id) => !remove.has(id)))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {draft.length} selected · click rows to toggle
          </p>
        </DialogHeader>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 rounded-md border border-slate-200 outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-500">
              {filtered.length} of {options.length} shown
            </span>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={allFilteredSelected ? clearAllFiltered : selectAllFiltered}
                className="text-[11px] text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
              >
                {allFilteredSelected ? "Deselect filtered" : "Select all filtered"}
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-10">
              No matches
            </div>
          ) : (
            filtered.map((o) => {
              const active = draft.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 transition border-b border-slate-50 ${
                    active ? "bg-slate-50/70" : ""
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                      active
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className="truncate text-slate-800">{o.label}</div>
                    {o.sublabel && (
                      <div className="truncate text-[11px] text-slate-400">{o.sublabel}</div>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-3 border-t bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDraft([])}
            className="text-xs text-rose-600 hover:underline"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#171717] text-white"
              onClick={() => {
                onChange(draft)
                onClose()
              }}
            >
              Apply ({draft.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

