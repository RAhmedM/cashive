"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 68 : 240;

  return (
    <div className="min-h-screen bg-bg-deepest honeycomb-bg relative">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <TopNav
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        sidebarWidth={sidebarWidth}
      />

      {/* Main content area */}
      <main
        className="pt-16 pb-20 lg:pb-8 min-h-screen transition-all duration-300"
        style={{ marginLeft: `var(--sidebar-offset, 0px)` }}
      >
        <style>{`
          @media (min-width: 1024px) {
            main { --sidebar-offset: ${sidebarWidth}px; }
          }
        `}</style>
        <div className="px-4 md:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
