"use client";

import Link from "next/link";
import { Users, BookOpen, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

export default function AdminDashboard() {
  const { user, isAuthReady } = useAuth();

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = String((user as any)?.role ?? "").toUpperCase();
    return role === "ADMIN" || role === "REKTOR";
  }, [user]);

  if (!isAuthReady) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="adm-root space-y-4">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Access Restricted</h3>
            <p className="text-sm text-orange-800">
              You must be an admin to access this section.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root space-y-6">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Admin Dashboard</h1>
          <p>Manage system-wide settings and configurations</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Assign Teacher */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assign Teacher
                </CardTitle>
                <CardDescription className="mt-2">
                  Assign teachers to batch subjects for classes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage which teachers teach which subjects in each batch. Select a
              batch, choose a subject, and assign qualified teachers.
            </p>
            <Link href="/dashboard/admin/batch-teacher-assignment">
              <Button className="w-full">Assign Teacher</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Placeholder for future admin features */}
        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Curriculum Management
                </CardTitle>
                <CardDescription className="mt-2">
                  Manage courses and curriculum (Coming Soon)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage course curriculum and learning objectives.
            </p>
            <Button disabled className="w-full">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
