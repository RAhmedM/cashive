"use client";

import React, { useState } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
        <div className="text-center">
          <p className="text-sm text-[#8B8D97]">Session expired.</p>
          <a
            href="/admin/login"
            className="mt-2 inline-block text-sm text-[#F5A623] hover:underline"
          >
            Sign in again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main
        className={`transition-all duration-200 ${
          sidebarCollapsed ? "ml-16" : "ml-56"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}
