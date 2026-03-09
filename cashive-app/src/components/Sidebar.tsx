"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Coins,
  ClipboardList,
  BarChart3,
  Gift,
  Trophy,
  Users,
  Package,
  Swords,
  Wallet,
  Settings,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { BeeIcon } from "./Icons";

const iconMap: Record<string, React.ElementType> = {
  Home,
  Coins,
  ClipboardList,
  BarChart3,
  Gift,
  Trophy,
  Users,
  Package,
  Swords,
  Wallet,
  Settings,
  MessageCircle,
};

const navSections = [
  {
    section: "EARN",
    items: [
      { label: "Home", icon: "Home", href: "/" },
      { label: "Earn", icon: "Coins", href: "/earn" },
      { label: "Tasks", icon: "ClipboardList", href: "/tasks" },
      { label: "Surveys", icon: "BarChart3", href: "/surveys" },
      { label: "Rewards", icon: "Gift", href: "/rewards" },
      { label: "Races", icon: "Trophy", href: "/races" },
      { label: "Referrals", icon: "Users", href: "/referrals" },
    ],
  },
  {
    section: "GAMES",
    items: [
      { label: "Boxes", icon: "Package", href: "/boxes" },
      { label: "Battles", icon: "Swords", href: "/battles" },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { label: "Cashout", icon: "Wallet", href: "/cashout" },
      { label: "Settings", icon: "Settings", href: "/settings" },
      { label: "Support", icon: "MessageCircle", href: "/support" },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-bg-surface border-r border-border
          transition-all duration-300 ease-in-out
          flex flex-col
          ${collapsed ? "w-[68px]" : "w-[240px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <BeeIcon className="w-8 h-8 shrink-0" />
            {!collapsed && (
              <span className="font-heading font-bold text-lg text-text-primary tracking-wide">
                cashive
                <span className="text-accent-gold">.gg</span>
              </span>
            )}
          </Link>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-text-secondary hover:text-text-primary p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-elevated transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navSections.map((section) => (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <span className="px-3 text-[10px] font-semibold tracking-[0.15em] text-text-tertiary uppercase mb-1 block">
                  {section.section}
                </span>
              )}
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] || Home;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5
                      transition-all duration-200 group relative
                      ${
                        isActive
                          ? "bg-accent-gold/10 text-accent-gold"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                      }
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-gold rounded-r-full" />
                    )}

                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive
                          ? "text-accent-gold"
                          : "text-text-secondary group-hover:text-text-primary"
                      }`}
                    />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-bg-elevated rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-border shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
              {/* Section divider */}
              <div className="mx-3 my-2 border-t border-border/50" />
            </div>
          ))}
        </nav>

        {/* User card at bottom */}
        <div className="border-t border-border p-3">
          <div
            className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-9 h-9 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold font-bold text-sm shrink-0">
              JD
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  JohnDoe
                </p>
                {/* XP / Level bar */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-accent-gold font-medium">
                    Lv. 12
                  </span>
                  <div className="flex-1 h-1.5 bg-bg-deepest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-gold to-accent-orange rounded-full"
                      style={{ width: "65%" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
