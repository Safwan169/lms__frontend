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
  login: (payload: { token: string; user: any; tenant?: any }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setLocalUser] = useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutApi] = useLogoutMutation();

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        const parsed = JSON.parse(storedUser);
        setLocalUser(parsed);
        dispatch(setUser({ ...parsed, token }));
      }
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    } finally {
      setIsAuthReady(true);
    }
  }, [dispatch]);

  const login = (payload: { token: string; user: any; tenant?: any }) => {
    const normalizedUser = {
      ...payload.user,
      // Flatten tenant info onto user so tenantId lookups work everywhere
      tenant_id: payload.tenant?.id ?? payload.user?.tenant_id ?? null,
      tenant: payload.tenant ?? payload.user?.tenant ?? null,
      // Normalize roles array to single role string for legacy checks
      role: payload.user?.role ?? (Array.isArray(payload.user?.roles) ? payload.user.roles[0] : payload.user?.roles) ?? null,
    };
    localStorage.setItem("access_token", payload.token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setLocalUser(normalizedUser);
    dispatch(setUser({ ...normalizedUser, token: payload.token }));
    router.push("/");
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

  return <AuthContext.Provider value={{ user, isAuthReady, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
