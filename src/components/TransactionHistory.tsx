"use client";

import React from "react";
import { useApi } from "@/hooks/useApi";
import { ExternalLink } from "lucide-react";
import { DataTable, ProviderAvatar } from "./SharedComponents";
import BeeLoader from "./BeeLoader";
import { paymentImage } from "@/lib/constants";

interface Withdrawal {
  id: string;
  method: string;
  amountHoney: number;
  amountUsdCents: number;
  feeUsdCents: number;
  status: string;
  createdAt: string;
}

interface WithdrawalsResponse {
  withdrawals: Withdrawal[];
  total: number;
  limit: number;
  offset: number;
}

const statusStyles: Record<string, string> = {
  COMPLETED: "bg-success/10 text-success border-success/20",
  PENDING: "bg-accent-gold/10 text-accent-gold border-accent-gold/20",
  PROCESSING: "bg-accent-gold/10 text-accent-gold border-accent-gold/20",
  FAILED: "bg-danger/10 text-danger border-danger/20",
  REJECTED: "bg-danger/10 text-danger border-danger/20",
};

const statusLabels: Record<string, string> = {
  COMPLETED: "Paid",
  PENDING: "Pending",
  PROCESSING: "Processing",
  FAILED: "Failed",
  REJECTED: "Rejected",
};

const columns = [
  {
    key: "date",
    header: "Date",
    mobileLabel: "Date",
    render: (tx: Withdrawal) => (
      <span className="text-sm text-text-secondary">
        {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    ),
  },
  {
    key: "method",
    header: "Method",
    mobileLabel: "Method",
    render: (tx: Withdrawal) => (
      <div className="flex items-center gap-2">
        <ProviderAvatar
          name={tx.method}
          image={paymentImage(tx.method)}
          size={28}
          className="rounded-md"
        />
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
        ${(tx.amountUsdCents / 100).toFixed(2)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    mobileLabel: "Status",
    render: (tx: Withdrawal) => {
      const status = tx.status.toUpperCase();
      return (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[status] || "bg-bg-elevated text-text-secondary border-border"}`}>
          {statusLabels[status] || tx.status}
        </span>
      );
    },
  },
];

export default function TransactionHistory() {
  const { data, loading } = useApi<WithdrawalsResponse>("/api/user/me/withdrawals");

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BeeLoader size="md" label="Loading withdrawals..." />
        </div>
      ) : data && data.withdrawals.length > 0 ? (
        <DataTable
          columns={columns}
          rows={data.withdrawals}
          rowKey={(tx) => tx.id}
        />
      ) : (
        <div className="text-center py-8 text-sm text-text-secondary">
          No withdrawals yet. Start earning and cash out!
        </div>
      )}
    </section>
  );
}
