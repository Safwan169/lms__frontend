// src/components/auth/Protected.tsx
"use client";

import React, { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";

function normalizeRole(user: any) {
  return String(
    user?.role ??
      (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
      ""
  ).toLowerCase();
}

function isAllowedDashboardPath(role: string, pathname: string) {
  if (!pathname.startsWith("/dashboard")) return true;

  // Notice Board is available to every authenticated role
  if (pathname === "/dashboard/notices" || pathname.startsWith("/dashboard/notices/")) {
    return true;
  }

  if (role === "superadmin") {
    return pathname === "/dashboard/admins";
  }

  if (role === "teacher") {
    return [
      "/dashboard/dashboard-empty",
      "/dashboard/classrooms",
      "/dashboard/my-class",
      "/dashboard/attendance",
      "/dashboard/self-attendance",
      "/dashboard/my-payroll",
      "/dashboard/content",
      "/dashboard/assessments",
      "/dashboard/profile",
    ].includes(pathname);
  }

  if (role === "student") {
    return [
      "/dashboard",
      "/dashboard/class-access",
      "/dashboard/my-class",
      "/dashboard/self-attendance",
      "/dashboard/my-payments",
      "/dashboard/content",
      "/dashboard/assessments",
      "/dashboard/profile",
    ].includes(pathname);
  }

  return true;
}

function getDefaultRouteForRole(role: string) {
  if (role === "superadmin") return "/dashboard/admins";
  if (role === "teacher") return "/dashboard/dashboard-empty";
  if (role === "student") return "/dashboard";
  return "/dashboard";
}

export default function Protected({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedRole = normalizeRole(user);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (!isAllowedDashboardPath(normalizedRole, pathname)) {
      router.replace(getDefaultRouteForRole(normalizedRole));
    }
  }, [isAuthReady, user, router, pathname, normalizedRole]);

  if (!isAuthReady || !user) return null;
  if (!isAllowedDashboardPath(normalizedRole, pathname)) return null;
  return <>{children}</>;
}
