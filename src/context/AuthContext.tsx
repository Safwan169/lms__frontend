// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser, clearUser } from "@/features/user/userSlice";
import { useLogoutMutation } from "@/features/user/userApi";

interface AuthContextType {
  user: any | null;
  isAuthReady: boolean;
  login: (payload: { token: string; user: any; tenant?: any }) => Promise<void>;
  updateUser: (updates: Record<string, any>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type HttpStatusError = Error & { status?: number }

function extractNestedProfile(user: any) {
  if (!user || typeof user !== "object") return {}

  return (
    user.profile ??
    user.adminProfile ??
    user.teacherProfile ??
    user.studentProfile ??
    user.accountantProfile ??
    user.superAdminProfile ??
    {}
  )
}

function normalizeRole(user: any) {
  return String(
    user?.role ??
      (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
      ""
  ).toLowerCase()
}

function getDefaultRouteForRole(role: string) {
  if (role === "superadmin") return "/dashboard/admins"
  if (role === "teacher") return "/dashboard"
  if (role === "student") return "/dashboard"
  if (role === "accountant") return "/dashboard"
  if (role === "admin") return "/dashboard"
  return "/dashboard"
}

function normalizeSessionUser(user: any, tenant?: any) {
  const nestedProfile = extractNestedProfile(user)
  const resolvedTenant = tenant ?? user?.tenant ?? null

  return {
    ...user,
    tenant_id: resolvedTenant?.id ?? user?.tenant_id ?? user?.tenantId ?? user?.tenant_id_fk ?? null,
    tenant: resolvedTenant,
    role: user?.role ?? (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ?? null,
    avatar_url: user?.avatar_url ?? user?.avatarUrl ?? nestedProfile?.avatar_url ?? "",
    profile: {
      ...nestedProfile,
      ...(user?.avatar_url || user?.avatarUrl || nestedProfile?.avatar_url
        ? {
            avatar_url: user?.avatar_url ?? user?.avatarUrl ?? nestedProfile?.avatar_url ?? "",
          }
        : {}),
    },
  };
}

async function fetchUnifiedProfile(token: string, tenantId: string | number | null, userId: string | number | null) {
  if (!token || !tenantId || !userId) return null

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089").replace(/\/+$/, "")
  const profilePath = /\/api$/i.test(baseUrl) ? "/user-profiles" : "/api/user-profiles"
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    userId: String(userId),
  })

  const response = await fetch(`${baseUrl}${profilePath}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = new Error(`Profile fetch failed with status ${response.status}`) as HttpStatusError
    error.status = response.status
    throw error
  }

  const data = await response.json().catch(() => null)
  const payload = data?.data?.data ?? data?.data ?? data
  const record = Array.isArray(payload) ? payload[0] : payload
  if (!record || typeof record !== "object") return null

  const nestedProfile =
    record.profile ??
    record.adminProfile ??
    record.teacherProfile ??
    record.studentProfile ??
    record.accountantProfile ??
    record.superAdminProfile ??
    {}

  return {
    ...nestedProfile,
    ...(record.avatar_url ? { avatar_url: record.avatar_url } : {}),
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setLocalUser] = useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutApi] = useLogoutMutation();

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        const parsed = normalizeSessionUser(JSON.parse(storedUser));

        let nextUser = parsed;
        try {
          const profile = await fetchUnifiedProfile(token, parsed?.tenant_id, parsed?.user_id ?? parsed?.userId ?? parsed?.id ?? parsed?.uuid ?? null)
          if (profile) {
            nextUser = {
              ...parsed,
              ...(profile?.avatar_url
                ? {
                    avatar_url: profile.avatar_url,
                    avatarUrl: profile.avatar_url,
                  }
                : {}),
              profile: {
                ...(parsed?.profile ?? {}),
                ...profile,
              },
            }
            localStorage.setItem("user", JSON.stringify(nextUser));
          }
        } catch (error) {
          const status = (error as HttpStatusError)?.status
          if (status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            setLocalUser(null);
            dispatch(clearUser());
            return;
          }

          // Keep local auth session usable even if profile hydration fails on boot.
        }

        setLocalUser(nextUser);
        dispatch(setUser({ ...nextUser, token }));
      }
    };

    bootstrapAuth().catch(() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }).finally(() => {
      setIsAuthReady(true);
    });
  }, [dispatch]);

  const login = async (payload: { token: string; user: any; tenant?: any }) => {
    let normalizedUser = normalizeSessionUser(payload.user, payload.tenant);

    try {
      const profile = await fetchUnifiedProfile(
        payload.token,
        normalizedUser?.tenant_id,
        normalizedUser?.user_id ?? normalizedUser?.userId ?? normalizedUser?.id ?? normalizedUser?.uuid ?? null
      );

      if (profile) {
        normalizedUser = {
          ...normalizedUser,
          ...(profile?.avatar_url
            ? {
                avatar_url: profile.avatar_url,
                avatarUrl: profile.avatar_url,
              }
            : {}),
          profile: {
            ...(normalizedUser?.profile ?? {}),
            ...profile,
          },
        };
      }
    } catch {
      // Login should still succeed even if profile hydration fails.
    }

    localStorage.setItem("access_token", payload.token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setLocalUser(normalizedUser);
    dispatch(setUser({ ...normalizedUser, token: payload.token }));
    router.push(getDefaultRouteForRole(normalizeRole(normalizedUser)));
  };

  const updateUser = (updates: Record<string, any>) => {
    setLocalUser((prevUser: any) => {
      const nextUser = {
        ...(prevUser ?? {}),
        ...updates,
        profile: {
          ...(prevUser?.profile ?? {}),
          ...(updates?.profile ?? {}),
        },
      };

      try {
        localStorage.setItem("user", JSON.stringify(nextUser));
        const token = localStorage.getItem("access_token");
        dispatch(setUser(token ? { ...nextUser, token } : nextUser));
      } catch {
        // Ignore local storage update issues and keep in-memory session updated.
        dispatch(setUser(nextUser));
      }

      return nextUser;
    });
  };

  const logout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // Always clear local session even if backend logout fails.
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setLocalUser(null);
      dispatch(clearUser());
      router.push("/login");
    }
  };

  return <AuthContext.Provider value={{ user, isAuthReady, login, updateUser, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
