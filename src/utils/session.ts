/**
 * Session utilities — read user info from localStorage
 */

type SessionUser = {
  id?: string
  role?: string
  roles?: string | string[]
  tenant_id?: string
  tenant?: { id: string; name?: string }
  name?: string
  email?: string
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function getTenantIdFromSession(): string | null {
  const user = getSessionUser()
  if (!user) return null
  return user.tenant_id ?? user.tenant?.id ?? null
}

export function getRoleFromSession(): string {
  const user = getSessionUser()
  if (!user) return ""
  const raw = user.role ?? (Array.isArray(user.roles) ? user.roles[0] : user.roles) ?? ""
  return String(raw).toLowerCase()
}
