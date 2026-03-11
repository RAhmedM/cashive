"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  ArrowDownCircle,
  UserPlus,
  Share2,
} from "lucide-react";

// ---- Types ----

interface OverviewStats {
  totalUsers: number;
  newUsers: number;
  totalOfferCompletions: number;
  totalRevenueCents: number;
  totalWithdrawalCents: number;
  pendingWithdrawals: number;
  activeRaces: number;
}

interface UserStats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  bannedUsers: number;
  verifiedUsers: number;
  usersWithReferrals: number;
}

interface OfferStats {
  totalCompletions: number;
  totalRevenueCents: number;
  totalRewardHoney: number;
  totalMarginHoney: number;
}

interface WithdrawalStats {
  totalWithdrawals: number;
  totalAmountCents: number;
  totalFeeCents: number;
  avgAmountCents: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  totalEarningsHoney: number;
}

interface ProviderRow {
  providerId: string;
  providerName: string;
  completions: number;
  revenueCents: number;
  rewardHoney: number;
}

interface MethodRow {
  method: string;
  count: number;
  amountCents: number;
}

interface ReferrerRow {
  userId: string;
  username: string;
  earnings: number;
  totalHoney: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

type Section = "overview" | "users" | "offers" | "withdrawals" | "referrals";

// ---- Helpers ----

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHoney(amount: number): string {
  return amount.toLocaleString();
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDefaultDates() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ---- Stat Card ----

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-[#F5A623]",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-[#6B6D77]">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

// ---- Mini Bar Chart (CSS-only) ----

function MiniBarChart({ data }: { data: ChartPoint[] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4">
      <h3 className="mb-3 text-xs font-medium text-[#8B8D97]">Daily New Users</h3>
      <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t bg-[#F5A623]/60 transition-all hover:bg-[#F5A623]"
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
            title={`${formatDate(d.date)}: ${d.value}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#4A4D57]">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ---- Section: Overview ----

function OverviewSection({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics?section=overview&from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json.stats);
      setChart(json.charts?.dailyNewUsers ?? []);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="New Users" value={stats.newUsers.toLocaleString()} icon={UserPlus} color="text-green-400" />
        <StatCard label="Offer Completions" value={stats.totalOfferCompletions.toLocaleString()} icon={Award} color="text-blue-400" />
        <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} icon={ArrowDownCircle} color="text-amber-400" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Revenue (Payouts to Us)" value={formatUsd(stats.totalRevenueCents)} icon={DollarSign} color="text-green-400" />
        <StatCard label="Withdrawal Volume" value={formatUsd(stats.totalWithdrawalCents)} icon={TrendingUp} color="text-red-400" />
        <StatCard label="Active Races" value={stats.activeRaces} icon={Award} color="text-purple-400" />
      </div>
      <MiniBarChart data={chart} />
    </div>
  );
}

// ---- Section: Users ----

function UsersSection({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [vip, setVip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics?section=users&from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json.stats);
      setVip(json.vipBreakdown ?? {});
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="New Users (Period)" value={stats.newUsers.toLocaleString()} icon={UserPlus} color="text-green-400" />
        <StatCard label="Active Users (Period)" value={stats.activeUsers.toLocaleString()} icon={TrendingUp} color="text-blue-400" />
        <StatCard label="Verified Users" value={stats.verifiedUsers.toLocaleString()} icon={Users} color="text-green-400" />
        <StatCard label="Banned Users" value={stats.bannedUsers} icon={Users} color="text-red-400" />
        <StatCard label="Referred Users (Period)" value={stats.usersWithReferrals} icon={Share2} color="text-purple-400" />
      </div>

      {/* VIP Breakdown */}
      <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4">
        <h3 className="mb-3 text-xs font-medium text-[#8B8D97]">VIP Tier Distribution</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {Object.entries(vip).map(([tier, count]) => (
            <div key={tier} className="rounded-lg bg-[#0F1117] px-3 py-2 text-center">
              <div className="text-xs text-[#6B6D77]">{tier}</div>
              <div className="text-sm font-semibold text-white">{count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Section: Offers ----

function OffersSection({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, number>>({});
  const [topProviders, setTopProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics?section=offers&from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json.stats);
      setStatusMap(json.statusBreakdown ?? {});
      setTopProviders(json.topProviders ?? []);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Completions" value={stats.totalCompletions.toLocaleString()} icon={Award} />
        <StatCard label="Revenue (to Us)" value={formatUsd(stats.totalRevenueCents)} icon={DollarSign} color="text-green-400" />
        <StatCard label="User Rewards" value={`${formatHoney(stats.totalRewardHoney)} honey`} icon={TrendingUp} color="text-amber-400" />
        <StatCard label="Platform Margin" value={`${formatHoney(stats.totalMarginHoney)} honey`} icon={BarChart3} color="text-blue-400" />
      </div>

      {/* Status Breakdown */}
      <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4">
        <h3 className="mb-3 text-xs font-medium text-[#8B8D97]">Status Breakdown</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusMap).map(([status, count]) => (
            <div key={status} className="rounded-lg bg-[#0F1117] px-3 py-2">
              <div className="text-xs text-[#6B6D77]">{status}</div>
              <div className="text-sm font-semibold text-white">{count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Providers */}
      {topProviders.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="border-b border-[#2A2D37] px-4 py-2.5">
            <h3 className="text-xs font-medium text-[#8B8D97]">Top Providers</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium text-right">Completions</th>
                <th className="px-4 py-2 font-medium text-right">Revenue</th>
                <th className="px-4 py-2 font-medium text-right">Rewards</th>
              </tr>
            </thead>
            <tbody>
              {topProviders.map((p) => (
                <tr key={p.providerId} className="border-b border-[#2A2D37] last:border-b-0">
                  <td className="px-4 py-2 text-sm text-white">{p.providerName}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#C8C9CE]">{p.completions.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-sm text-green-400">{formatUsd(p.revenueCents)}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#F5A623]">{formatHoney(p.rewardHoney)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Section: Withdrawals ----

function WithdrawalsSection({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, { count: number; amountCents: number }>>({});
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics?section=withdrawals&from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json.stats);
      setStatusMap(json.statusBreakdown ?? {});
      setMethods(json.methodBreakdown ?? []);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Withdrawals" value={stats.totalWithdrawals.toLocaleString()} icon={ArrowDownCircle} />
        <StatCard label="Total Paid Out" value={formatUsd(stats.totalAmountCents)} icon={DollarSign} color="text-red-400" />
        <StatCard label="Fees Collected" value={formatUsd(stats.totalFeeCents)} icon={TrendingUp} color="text-green-400" />
        <StatCard label="Avg Amount" value={formatUsd(stats.avgAmountCents)} icon={BarChart3} color="text-blue-400" />
      </div>

      {/* Status + Method tables side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Status Breakdown */}
        <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="border-b border-[#2A2D37] px-4 py-2.5">
            <h3 className="text-xs font-medium text-[#8B8D97]">By Status</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Count</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statusMap).map(([status, data]) => (
                <tr key={status} className="border-b border-[#2A2D37] last:border-b-0">
                  <td className="px-4 py-2 text-sm text-white">{status}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#C8C9CE]">{data.count}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#F5A623]">{formatUsd(data.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Method Breakdown */}
        <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="border-b border-[#2A2D37] px-4 py-2.5">
            <h3 className="text-xs font-medium text-[#8B8D97]">By Method</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium text-right">Count</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.method} className="border-b border-[#2A2D37] last:border-b-0">
                  <td className="px-4 py-2 text-sm text-white">{m.method}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#C8C9CE]">{m.count}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#F5A623]">{formatUsd(m.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Section: Referrals ----

function ReferralsSection({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [topReferrers, setTopReferrers] = useState<ReferrerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics?section=referrals&from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json.stats);
      setTopReferrers(json.topReferrers ?? []);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="New Referrals (Period)" value={stats.totalReferrals.toLocaleString()} icon={Share2} />
        <StatCard label="Commission Payouts" value={stats.totalEarnings.toLocaleString()} icon={DollarSign} color="text-green-400" />
        <StatCard label="Total Commission Honey" value={formatHoney(stats.totalEarningsHoney)} icon={TrendingUp} color="text-amber-400" />
      </div>

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
          <div className="border-b border-[#2A2D37] px-4 py-2.5">
            <h3 className="text-xs font-medium text-[#8B8D97]">Top Referrers</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium text-right">Earnings</th>
                <th className="px-4 py-2 font-medium text-right">Honey Earned</th>
              </tr>
            </thead>
            <tbody>
              {topReferrers.map((r, i) => (
                <tr key={r.userId} className="border-b border-[#2A2D37] last:border-b-0">
                  <td className="px-4 py-2 text-sm text-[#6B6D77]">{i + 1}</td>
                  <td className="px-4 py-2 text-sm text-white">{r.username}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#C8C9CE]">{r.earnings}</td>
                  <td className="px-4 py-2 text-right text-sm text-[#F5A623]">{formatHoney(r.totalHoney)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Shared Components ----

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
    </div>
  );
}

function ErrorMsg() {
  return (
    <div className="py-12 text-center text-sm text-[#4A4D57]">
      Failed to load analytics data
    </div>
  );
}

// ---- Tab Config ----

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
  { key: "offers", label: "Offers", icon: Award },
  { key: "withdrawals", label: "Withdrawals", icon: ArrowDownCircle },
  { key: "referrals", label: "Referrals", icon: Share2 },
];

// ---- Main Page ----

export default function AnalyticsPage() {
  const [section, setSection] = useState<Section>("overview");
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  function renderSection() {
    const props = { from: dateFrom, to: dateTo };
    switch (section) {
      case "overview": return <OverviewSection {...props} />;
      case "users": return <UsersSection {...props} />;
      case "offers": return <OffersSection {...props} />;
      case "withdrawals": return <WithdrawalsSection {...props} />;
      case "referrals": return <ReferralsSection {...props} />;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-[#F5A623]" />
          <h1 className="text-lg font-semibold text-white">Analytics</h1>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
          />
          <span className="text-xs text-[#4A4D57]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-1">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              section === key
                ? "bg-[#F5A623]/10 text-[#F5A623]"
                : "text-[#6B6D77] hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {renderSection()}
    </div>
  );
}
