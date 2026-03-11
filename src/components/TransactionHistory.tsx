"use client";

import React from "react";
import { recentWithdrawals } from "@/data/mockData";
import { ExternalLink } from "lucide-react";
import { DataTable, ProviderAvatar } from "./SharedComponents";

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

type Withdrawal = (typeof recentWithdrawals)[number];

const columns = [
  {
    key: "date",
    header: "Date",
    mobileLabel: "Date",
    render: (tx: Withdrawal) => (
      <span className="text-sm text-text-secondary">
        {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    ),
  },
  {
    key: "method",
    header: "Method",
    mobileLabel: "Method",
    render: (tx: Withdrawal) => (
      <div className="flex items-center gap-2">
        <ProviderAvatar name={tx.method} image={tx.methodImage} size={28} className="rounded-md" />
        <span className="text-sm text-text-primary">{tx.method}</span>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    mobileLabel: "Amount",
    render: (tx: Withdrawal) => (
      <span className="text-sm font-mono font-semibold text-text-primary">
        ${tx.amount.toFixed(2)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    mobileLabel: "Status",
    render: (tx: Withdrawal) => (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[tx.status]}`}>
        {statusLabels[tx.status]}
      </span>
    ),
  },
];

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

      <DataTable
        columns={columns}
        rows={recentWithdrawals}
        rowKey={(tx) => tx.id}
      />
    </section>
  );
}
