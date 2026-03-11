// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser, clearUser } from "@/features/user/userSlice";

interface AuthContextType {
  user: any | null;
  login: (payload: { token: string; user: any }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setLocalUser] = useState<any | null>(null);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        const parsed = JSON.parse(storedUser);
        setLocalUser(parsed);
        dispatch(setUser({ ...parsed, token }));
      }
    } catch (e) {}
  }, [dispatch]);

  const login = (payload: { token: string; user: any }) => {
    localStorage.setItem("access_token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
    setLocalUser(payload.user);
    dispatch(setUser({ ...payload.user, token: payload.token }));
    router.push("/");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setLocalUser(null);
    dispatch(clearUser());
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
