// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function normalizeRole(user: any) {
  return String(
    user?.role ??
      (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
      "",
  ).toLowerCase();
}

function getDefaultRouteForRole(role: string) {
  if (role === "superadmin") return "/dashboard/admins";
  if (role === "teacher") return "/dashboard/dashboard-empty";
  if (role === "student") return "/dashboard";
  return "/dashboard";
}

export default function HomePage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    router.replace(getDefaultRouteForRole(normalizeRole(user)));
  }, [isAuthReady, user, router]);

  return null;
}
