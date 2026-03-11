"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Gift,
  Home,
  LogOut,
  MessageSquareMore,
  Settings,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { BeeIcon } from "./Icons";
import { ProgressBar } from "./SharedComponents";
import { useAuth, getLevelProgress } from "@/contexts/AuthContext";

const iconMap: Record<string, React.ElementType> = {
  Home,
  Coins,
  ClipboardList,
  MessageSquareMore,
  Trophy,
  Gift,
  Wallet,
  Users,
  Settings,
};

const navSections = [
  {
    section: "EARN",
    items: [
      { label: "Home", icon: "Home", href: "/" },
      { label: "Earn", icon: "Coins", href: "/earn" },
      { label: "Tasks", icon: "ClipboardList", href: "/tasks" },
      { label: "Surveys", icon: "MessageSquareMore", href: "/surveys" },
    ],
  },
  {
    section: "COMPETE",
    items: [{ label: "Races", icon: "Trophy", href: "/races" }],
  },
  {
    section: "REWARDS",
    items: [
      { label: "Rewards", icon: "Gift", href: "/rewards" },
      { label: "Cashout", icon: "Wallet", href: "/cashout" },
      { label: "Referrals", icon: "Users", href: "/referrals" },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onMobileClose} />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-bg-surface transition-all duration-300 ease-in-out ${collapsed ? "w-[76px]" : "w-[240px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <BeeIcon className="w-8 h-8 shrink-0" />
            {!collapsed ? (
              <span className="font-heading text-lg font-bold tracking-wide text-text-primary">
                cashive<span className="text-accent-gold">.gg</span>
              </span>
            ) : null}
          </Link>

          <button onClick={onMobileClose} className="rounded-md p-1 text-text-secondary hover:text-text-primary lg:hidden">
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary lg:flex"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navSections.map((section, index) => (
            <div key={section.section} className="mb-5">
              {!collapsed ? (
                <span className="mb-1 block px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  {section.section}
                </span>
              ) : null}
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] || Home;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={`group relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive ? "bg-accent-gold/10 text-accent-gold" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"} ${collapsed ? "justify-center" : ""}`}
                  >
                    {isActive ? <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-gold" /> : null}
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-accent-gold" : "text-text-secondary group-hover:text-text-primary"}`} />
                    {!collapsed ? <span>{item.label}</span> : null}
                    {collapsed ? (
                      <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs text-text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        {item.label}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
              {index === navSections.length - 1 ? <div className="mx-3 mt-4 border-t border-border/70" /> : null}
            </div>
          ))}

          <Link
            href="/settings"
            onClick={onMobileClose}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${pathname.startsWith("/settings") ? "bg-accent-gold/10 text-accent-gold" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"} ${collapsed ? "justify-center" : ""}`}
          >
            {pathname.startsWith("/settings") ? <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-gold" /> : null}
            <Settings className={`w-5 h-5 shrink-0 ${pathname.startsWith("/settings") ? "text-accent-gold" : "text-text-secondary group-hover:text-text-primary"}`} />
            {!collapsed ? <span>Settings</span> : null}
          </Link>
        </nav>

        <div className="border-t border-border p-3">
          <UserFooter collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}

/** Sidebar footer showing current user info or nothing if not loaded. */
function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();
  const progress = getLevelProgress(user.xp, user.level);

  // VIP tier badge colors
  const tierColors: Record<string, string> = {
    BRONZE: "text-[#CD7F32]",
    SILVER: "text-[#A8B2BD]",
    GOLD: "text-accent-gold",
    PLATINUM: "text-[#B8C5D6]",
    DIAMOND: "text-[#B9F2FF]",
  };
  const tierColor = tierColors[user.vipTier] || "text-text-secondary";

  return (
    <div className={`rounded-xl border border-border bg-bg-elevated/50 p-3 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold/20 text-xs font-bold text-accent-gold shrink-0"
        >
          {initials}
        </Link>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{user.username}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px]">
              <span className={`font-semibold capitalize ${tierColor}`}>
                {user.vipTier.charAt(0) + user.vipTier.slice(1).toLowerCase()}
              </span>
              <span className="text-text-tertiary">&bull;</span>
              <span className="text-text-secondary">Lv{user.level}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={progress.percent} max={100} size="xs" className="flex-1" />
              <span className="text-[10px] font-medium text-text-tertiary">{progress.percent}%</span>
            </div>
          </div>
        ) : null}
      </div>
      {!collapsed ? (
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs text-text-tertiary transition-colors hover:border-danger/30 hover:text-danger"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      ) : (
        <button
          onClick={logout}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:text-danger"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
