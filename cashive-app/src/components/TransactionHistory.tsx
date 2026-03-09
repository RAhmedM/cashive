"use client";

import React from "react";
import { recentWithdrawals } from "@/data/mockData";
import { ExternalLink } from "lucide-react";
import { ProviderAvatar } from "./SharedComponents";

const statusStyles = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-accent-gold/10 text-accent-gold border-accent-gold/20",
  failed: "bg-danger/10 text-danger border-danger/20",
};

const statusLabels = {
  completed: "Paid",
  pending: "Pending",
  failed: "Failed",
};

export default function TransactionHistory() {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-bold text-text-primary">
          Recent Withdrawals
        </h2>
        <button className="text-sm text-accent-gold hover:text-accent-gold-hover transition-colors flex items-center gap-1">
          View All <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">
                Method
              </th>
              <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {recentWithdrawals.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-border/50 last:border-0 hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-5 py-3.5 text-sm text-text-secondary">
                  {new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <ProviderAvatar name={tx.method} size={28} className="rounded-md" />
                    <span className="text-sm text-text-primary">
                      {tx.method}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm font-mono font-semibold text-text-primary">
                  ${tx.amount.toFixed(2)}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[tx.status]}`}
                  >
                    {statusLabels[tx.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {recentWithdrawals.map((tx) => (
          <div
            key={tx.id}
            className="bg-bg-surface rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ProviderAvatar name={tx.method} size={28} className="rounded-md" />
                <span className="text-sm font-medium text-text-primary">
                  {tx.method}
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[tx.status]}`}
              >
                {statusLabels[tx.status]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                {new Date(tx.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="font-mono font-semibold text-text-primary text-sm">
                ${tx.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
