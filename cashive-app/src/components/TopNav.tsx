"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Menu, Home, Coins, Gamepad2, Wallet, User, Flame } from "lucide-react";
import { HoneyIcon, BeeIcon } from "./Icons";

interface TopNavProps {
  onMenuToggle: () => void;
  sidebarWidth: number;
}

export default function TopNav({ onMenuToggle, sidebarWidth }: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / Tablet top nav */}
      <header
        className="fixed top-0 right-0 h-16 bg-bg-surface border-b border-border z-30 flex items-center px-4 gap-4 transition-all duration-300 left-0"
        style={{ left: `var(--topnav-left, 0px)` }}
      >
        <style>{`
          @media (min-width: 1024px) {
            header { --topnav-left: ${sidebarWidth}px; }
          }
        `}</style>
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-bg-elevated transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-1.5">
          <BeeIcon className="w-7 h-7" />
          <span className="font-heading font-bold text-base text-text-primary">
            cashive<span className="text-accent-gold">.gg</span>
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div
            className={`relative flex items-center rounded-lg transition-all duration-200 ${
              searchFocused
                ? "bg-bg-elevated border border-accent-gold/30"
                : "bg-bg-elevated border border-border"
            }`}
          >
            <Search className="w-4 h-4 text-text-tertiary ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search offers, surveys..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary py-2.5 px-3 outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 sm:hidden" />

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Daily streak badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-accent-gold/10 rounded-lg border border-accent-gold/20">
            <Flame className="w-4 h-4 text-accent-gold" />
            <span className="text-xs font-semibold text-accent-gold">
              5-Day Streak
            </span>
          </div>

          {/* Honey balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-elevated rounded-lg border border-border hover:border-accent-gold/30 transition-colors cursor-pointer">
            <HoneyIcon className="w-5 h-5" />
            <span className="font-mono font-semibold text-accent-gold text-sm">
              12,450
            </span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

          {/* User avatar */}
          <button className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold font-bold text-xs hover:bg-accent-gold/30 transition-colors">
            JD
          </button>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-surface border-t border-border z-30 lg:hidden flex items-center justify-around px-2">
        {[
          { icon: Home, label: "Home", href: "/" },
          { icon: Coins, label: "Earn", href: "/earn" },
          { icon: Gamepad2, label: "Games", href: "/boxes" },
          { icon: Wallet, label: "Cashout", href: "/cashout" },
          { icon: User, label: "Profile", href: "/settings" },
        ].map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-accent-gold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
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
