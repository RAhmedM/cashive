"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Coins,
  Home,
  Menu,
  Search,
  Trophy,
  User,
  Wallet,
  Flame,
} from "lucide-react";
import { BeeIcon, HoneyIcon } from "./Icons";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketEvent } from "@/contexts/SocketContext";
import { useApi } from "@/hooks/useApi";
import { SERVER_EVENTS } from "@/lib/socket-events";
import type { BalanceUpdatePayload, NotificationPayload } from "@/lib/socket-events";

interface TopNavProps {
  onMenuToggle: () => void;
  sidebarWidth: number;
}

export default function TopNav({ onMenuToggle, sidebarWidth }: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [balanceFlash, setBalanceFlash] = useState(false);
  const pathname = usePathname();
  const { user, updateBalance } = useAuth();

  // Fetch unread notification count
  const { data: notifData, refetch: refetchNotifs } = useApi<{ unreadCount: number }>(
    user ? "/api/user/me/notifications/count" : null
  );
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (notifData) setUnreadCount(notifData.unreadCount);
  }, [notifData]);

  // Real-time balance updates via Socket.IO
  useSocketEvent(
    SERVER_EVENTS.BALANCE_UPDATE,
    useCallback(
      (payload: BalanceUpdatePayload) => {
        updateBalance(payload.balanceHoney);
        // Flash the balance display
        setBalanceFlash(true);
        setTimeout(() => setBalanceFlash(false), 1500);
      },
      [updateBalance]
    )
  );

  // Real-time notification count updates via Socket.IO
  useSocketEvent(
    SERVER_EVENTS.NOTIFICATION,
    useCallback(
      (_payload: NotificationPayload) => {
        setUnreadCount((prev) => prev + 1);
      },
      []
    )
  );

  const initials = user ? user.username.slice(0, 2).toUpperCase() : "?";
  const balanceFormatted = user
    ? user.balanceHoney.toLocaleString()
    : "---";
  const streakText = user && user.currentStreak > 0
    ? `${user.currentStreak}-Day Streak`
    : null;

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-bg-surface px-4 transition-all duration-300"
        style={{ left: `var(--topnav-left, 0px)`, right: `var(--topnav-right, 0px)` }}
      >
        <style>{`
          @media (min-width: 1024px) {
            header { --topnav-left: ${sidebarWidth}px; }
          }
        `}</style>

        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-1.5 lg:hidden">
          <BeeIcon className="w-7 h-7" />
          <span className="font-heading text-base font-bold text-text-primary">
            cashive<span className="text-accent-gold">.gg</span>
          </span>
        </Link>

        <div className="hidden max-w-md flex-1 sm:block">
          <div className={`relative flex items-center rounded-lg border transition-all duration-200 ${searchFocused ? "border-accent-gold/30 bg-bg-elevated" : "border-border bg-bg-elevated"}`}>
            <Search className="ml-3 w-4 h-4 shrink-0 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search offers, surveys, rewards..."
              className="w-full bg-transparent px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-3">
          {streakText && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-accent-gold/20 bg-accent-gold/10 px-3 py-1.5 md:flex">
              <Flame className="w-4 h-4 text-accent-gold" />
              <span className="text-xs font-semibold text-accent-gold">{streakText}</span>
            </div>
          )}

          {/* Balance display with flash animation on update */}
          <div
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${
              balanceFlash
                ? "border-accent-gold/60 bg-accent-gold/15 scale-105"
                : "border-border bg-bg-elevated hover:border-accent-gold/30"
            }`}
          >
            <HoneyIcon className="w-5 h-5" />
            <span className="font-mono text-sm font-semibold text-accent-gold">
              {balanceFormatted}
            </span>
          </div>

          {/* Notification bell with real unread count */}
          <Link
            href="/profile"
            className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          <Link href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold/20 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/30">
            {initials}
          </Link>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-bg-surface px-2 lg:hidden">
        {[
          { icon: Home, label: "Home", href: "/" },
          { icon: Coins, label: "Earn", href: "/earn" },
          { icon: Trophy, label: "Races", href: "/races" },
          { icon: Wallet, label: "Cashout", href: "/cashout" },
          { icon: User, label: "Profile", href: "/profile" },
        ].map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-colors ${isActive ? "text-accent-gold" : "text-text-secondary hover:text-text-primary"}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
