"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Globe,
  Star,
  Trophy,
  Ticket,
  MessageSquare,
  Headset,
  BarChart3,
  Settings,
  ScrollText,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[]; // If specified, only these roles can see it
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
      { label: "Offerwalls", href: "/admin/offerwalls", icon: Globe },
      { label: "Featured Offers", href: "/admin/featured-offers", icon: Star },
      { label: "Races", href: "/admin/races", icon: Trophy },
      { label: "Promo Codes", href: "/admin/promo-codes", icon: Ticket },
    ],
  },
  {
    label: "Moderation",
    items: [
      { label: "Chat", href: "/admin/chat", icon: MessageSquare, roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
      { label: "Support", href: "/admin/support", icon: Headset },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN"] },
      { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, roles: ["SUPER_ADMIN"] },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
      { label: "Admins", href: "/admin/admins", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
    ],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const visibleNav = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (admin && item.roles.includes(admin.role))
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#2A2D37] bg-[#12141B] transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#2A2D37] px-3">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              cashive<span className="text-[#F5A623]">.gg</span>
            </span>
            <span className="rounded bg-[#F5A623]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F5A623]">
              Admin
            </span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#1A1D27] hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleNav.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#4A4D57]">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[#F5A623]/10 text-[#F5A623]"
                        : "text-[#8B8D97] hover:bg-[#1A1D27] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — Admin info & logout */}
      <div className="border-t border-[#2A2D37] p-2">
        {admin && !collapsed && (
          <div className="mb-2 rounded-lg bg-[#1A1D27] px-3 py-2">
            <div className="text-sm font-medium text-white truncate">
              {admin.name}
            </div>
            <div className="text-[11px] text-[#6B6D77] truncate">
              {admin.role.replace("_", " ")}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? "Sign Out" : undefined}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#8B8D97] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
