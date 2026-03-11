"use client";

import React from "react";
import Link from "next/link";
import { BeeIcon } from "@/components/Icons";

/**
 * Auth layout — minimal centered layout for login/register pages.
 * No sidebar, no top nav. Just the cashive brand and a centered card.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deepest honeycomb-bg px-4 py-8">
      {/* Brand header */}
      <Link
        href="/login"
        className="mb-8 flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <BeeIcon className="h-10 w-10" />
        <span className="font-heading text-2xl font-bold tracking-wide text-text-primary">
          cashive<span className="text-accent-gold">.gg</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 shadow-xl">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-text-tertiary">
        &copy; {new Date().getFullYear()} cashive.gg &mdash; Where Your Time
        Turns to Honey
      </p>
    </div>
  );
}
