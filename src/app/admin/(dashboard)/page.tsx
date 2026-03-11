"use client";

import React, { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  UserPlus,
  Wallet,
  ShieldAlert,
  Headset,
  MessageSquareWarning,
  Clock,
  ArrowUpRight,
} from "lucide-react";

// ---- Types ----

interface DashboardStats {
  revenueToday: number;
  revenueMonth: number;
  payoutsToday: number;
  payoutsMonth: number;
  activeUsers: number;
  newSignupsToday: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  openTickets: number;
  pendingReports: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  admin: { name: string; role: string };
}

interface WithdrawalEntry {
  id: string;
  method: string;
  amountUsdCents: number;
  status: string;
  createdAt: string;
  user: { username: string; email: string };
}

interface DashboardData {
  stats: DashboardStats;
  recentAuditLogs: AuditLogEntry[];
  recentWithdrawals: WithdrawalEntry[];
}

// ---- Helpers ----

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10",
  APPROVED: "text-blue-400 bg-blue-400/10",
  PROCESSING: "text-purple-400 bg-purple-400/10",
  COMPLETED: "text-green-400 bg-green-400/10",
  REJECTED: "text-red-400 bg-red-400/10",
  FAILED: "text-red-400 bg-red-400/10",
};

// ---- Components ----

function StatCard({
  icon: Icon,
  label,
  value,
  badge,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  badge?: boolean;
  href?: string;
}) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={`rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4 ${href ? "hover:border-[#3A3D47] transition-colors cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-[#0F1117] p-2">
          <Icon className="h-4 w-4 text-[#6B6D77]" />
        </div>
        {badge && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
            !
          </span>
        )}
        {href && <ArrowUpRight className="h-3.5 w-3.5 text-[#4A4D57]" />}
      </div>
      <div className="mt-3">
        <div className="text-lg font-semibold text-white">{value}</div>
        <div className="text-xs text-[#6B6D77]">{label}</div>
      </div>
    </Wrapper>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/admin/dashboard", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
        {error || "No data available"}
      </div>
    );
  }

  const { stats, recentAuditLogs, recentWithdrawals } = data;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-[#6B6D77]">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={DollarSign}
          label="Revenue Today"
          value={formatCents(stats.revenueToday)}
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue This Month"
          value={formatCents(stats.revenueMonth)}
        />
        <StatCard
          icon={Wallet}
          label="Payouts Today"
          value={formatCents(stats.payoutsToday)}
        />
        <StatCard
          icon={Users}
          label="Active Users (24h)"
          value={stats.activeUsers.toLocaleString()}
        />
        <StatCard
          icon={UserPlus}
          label="New Signups Today"
          value={stats.newSignupsToday.toLocaleString()}
        />
      </div>

      {/* Queue Badges */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Pending Withdrawals"
          value={stats.pendingWithdrawals}
          badge={stats.pendingWithdrawals > 0}
          href="/admin/withdrawals"
        />
        <StatCard
          icon={ShieldAlert}
          label="Pending KYC"
          value={stats.pendingKyc}
          badge={stats.pendingKyc > 0}
        />
        <StatCard
          icon={Headset}
          label="Open Tickets"
          value={stats.openTickets}
          badge={stats.openTickets > 0}
          href="/admin/support"
        />
        <StatCard
          icon={MessageSquareWarning}
          label="Chat Reports"
          value={stats.pendingReports}
          badge={stats.pendingReports > 0}
          href="/admin/chat"
        />
      </div>

      {/* Two-Column: Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Audit Logs */}
        <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="flex items-center justify-between border-b border-[#2A2D37] px-4 py-3">
            <h2 className="text-sm font-medium text-white">Recent Admin Actions</h2>
            <a
              href="/admin/audit-log"
              className="text-xs text-[#F5A623] hover:underline"
            >
              View all
            </a>
          </div>
          <div className="divide-y divide-[#2A2D37]">
            {recentAuditLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#4A4D57]">
                No recent actions
              </div>
            ) : (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="rounded-lg bg-[#0F1117] p-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#6B6D77]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-[#C8C9CE]">
                      <span className="font-medium text-white">
                        {log.admin.name}
                      </span>{" "}
                      {log.action.replace(/_/g, " ")}
                      {log.targetType && (
                        <span className="text-[#6B6D77]">
                          {" "}
                          on {log.targetType}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#4A4D57]">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Withdrawals */}
        <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="flex items-center justify-between border-b border-[#2A2D37] px-4 py-3">
            <h2 className="text-sm font-medium text-white">Recent Withdrawals</h2>
            <a
              href="/admin/withdrawals"
              className="text-xs text-[#F5A623] hover:underline"
            >
              View all
            </a>
          </div>
          <div className="divide-y divide-[#2A2D37]">
            {recentWithdrawals.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#4A4D57]">
                No recent withdrawals
              </div>
            ) : (
              recentWithdrawals.map((wd) => (
                <div key={wd.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {wd.user.username}
                    </div>
                    <div className="text-[11px] text-[#4A4D57]">
                      {wd.method} &middot; {formatDate(wd.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatCents(wd.amountUsdCents)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[wd.status] ?? "text-[#6B6D77] bg-[#2A2D37]"}`}
                    >
                      {wd.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
