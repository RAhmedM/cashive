"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Copy,
  Crown,
  DollarSign,
  Globe,
  Mail,
  MessageSquareOff,
  MessageSquare,
  Shield,
  ShieldOff,
  Flame,
  Trophy,
  Users,
  Wallet,
  Zap,
  Clock,
  Monitor,
  AlertTriangle,
} from "lucide-react";

// ---- Types ----

interface UserDetail {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  country: string | null;
  language: string;
  balanceHoney: number;
  lifetimeEarned: number;
  xp: number;
  level: number;
  vipTier: string;
  currentStreak: number;
  longestStreak: number;
  lastEarnDate: string | null;
  referralCode: string;
  referredById: string | null;
  referralTier: number;
  fraudScore: number;
  isBanned: boolean;
  banReason: string | null;
  chatMuted: boolean;
  chatMutedUntil: string | null;
  totpEnabled: boolean;
  profilePublic: boolean;
  lastLoginIp: string | null;
  lastDeviceFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  _count: {
    transactions: number;
    offerCompletions: number;
    withdrawals: number;
    referrals: number;
    achievements: number;
    sessions: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  sourceType: string;
  description: string;
  createdAt: string;
}

interface OfferCompletion {
  id: string;
  offerName: string;
  offerCategory: string | null;
  rewardToUserHoney: number;
  payoutToUsCents: number;
  platformMarginHoney: number;
  vipBonusHoney: number;
  status: string;
  createdAt: string;
  provider: { name: string; slug: string };
}

interface Withdrawal {
  id: string;
  method: string;
  amountHoney: number;
  amountUsdCents: number;
  feeUsdCents: number;
  status: string;
  fraudScoreAtRequest: number;
  isFirstWithdrawal: boolean;
  createdAt: string;
  processedAt: string | null;
}

interface ReferredUser {
  id: string;
  username: string;
  createdAt: string;
}

interface Achievement {
  id: string;
  earnedAt: string;
  achievement: {
    name: string;
    description: string;
    icon: string;
    color: string;
    slug: string;
  };
}

interface SessionInfo {
  id: string;
  ip: string | null;
  device: string | null;
  lastActive: string;
  createdAt: string;
}

interface UserData {
  user: UserDetail;
  recentTransactions: Transaction[];
  recentOffers: OfferCompletion[];
  withdrawals: Withdrawal[];
  referrer: { id: string; username: string; email: string } | null;
  referredUsers: ReferredUser[];
  achievements: Achievement[];
  sessions: SessionInfo[];
}

type Tab = "transactions" | "offers" | "withdrawals" | "referrals" | "achievements" | "sessions";

// ---- Helpers ----

function formatHoney(n: number): string {
  return n.toLocaleString("en-US");
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const vipColors: Record<string, string> = {
  NONE: "text-[#6B6D77]",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
};

const statusColors: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10",
  APPROVED: "text-blue-400 bg-blue-400/10",
  PROCESSING: "text-purple-400 bg-purple-400/10",
  COMPLETED: "text-green-400 bg-green-400/10",
  REJECTED: "text-red-400 bg-red-400/10",
  FAILED: "text-red-400 bg-red-400/10",
  CREDITED: "text-green-400 bg-green-400/10",
  HELD: "text-yellow-400 bg-yellow-400/10",
  REVERSED: "text-red-400 bg-red-400/10",
};

const VIP_TIERS = ["NONE", "BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;

// ---- Action Modal Components ----

function ActionModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#6B6D77] hover:text-white"
          >
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  // Modal form values
  const [banReason, setBanReason] = useState("");
  const [muteDuration, setMuteDuration] = useState(60);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [balanceReason, setBalanceReason] = useState("");
  const [selectedVipTier, setSelectedVipTier] = useState("");

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load user");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function performAction(body: Record<string, unknown>) {
    setActionLoading(true);
    setActionMsg("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error || "Action failed");
        return;
      }
      setActionMsg(json.message || "Done");
      // Re-fetch user data
      await fetchUser();
    } catch {
      setActionMsg("Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function closeAllModals() {
    setShowBanModal(false);
    setShowMuteModal(false);
    setShowBalanceModal(false);
    setShowVipModal(false);
    setBanReason("");
    setMuteDuration(60);
    setBalanceAmount(0);
    setBalanceReason("");
    setSelectedVipTier("");
  }

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
        {error || "User not found"}
      </div>
    );
  }

  const { user } = data;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "transactions", label: "Transactions", count: user._count.transactions },
    { key: "offers", label: "Offers", count: user._count.offerCompletions },
    { key: "withdrawals", label: "Withdrawals", count: user._count.withdrawals },
    { key: "referrals", label: "Referrals", count: user._count.referrals },
    { key: "achievements", label: "Achievements", count: user._count.achievements },
    { key: "sessions", label: "Sessions", count: user._count.sessions },
  ];

  return (
    <div>
      {/* Back + Action message */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/users")}
          className="flex items-center gap-1.5 text-sm text-[#8B8D97] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>
        {actionMsg && (
          <span
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              actionMsg.toLowerCase().includes("fail") || actionMsg.toLowerCase().includes("error")
                ? "bg-red-500/10 text-red-400"
                : "bg-green-500/10 text-green-400"
            }`}
          >
            {actionMsg}
          </span>
        )}
      </div>

      {/* User Header */}
      <div className="mb-4 rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0F1117] text-lg font-bold text-[#F5A623]">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">
                  {user.username}
                </h1>
                {user.isBanned && (
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-400">
                    Banned
                  </span>
                )}
                {user.chatMuted && (
                  <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[11px] font-medium text-yellow-400">
                    Muted
                  </span>
                )}
                <span
                  className={`text-xs font-medium ${vipColors[user.vipTier] ?? "text-[#6B6D77]"}`}
                >
                  {user.vipTier !== "NONE" && user.vipTier}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#8B8D97]">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                  {user.emailVerified && (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  )}
                </span>
                {user.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {user.country}
                  </span>
                )}
                {user.totpEnabled && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Shield className="h-3.5 w-3.5" />
                    2FA
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-[#4A4D57]">
                <span>ID: {user.id}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(user.id)}
                  className="text-[#6B6D77] hover:text-white"
                  title="Copy ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <span>Joined {formatDate(user.createdAt)}</span>
                <span>Last login {formatDateTime(user.lastLoginAt)}</span>
                {user.lastLoginIp && <span>IP: {user.lastLoginIp}</span>}
              </div>
              {user.isBanned && user.banReason && (
                <div className="mt-2 rounded-md bg-red-500/5 px-3 py-1.5 text-xs text-red-400">
                  Ban reason: {user.banReason}
                </div>
              )}
            </div>
          </div>

          {/* Fraud Score */}
          <div className="flex flex-col items-end gap-1">
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                user.fraudScore >= 70
                  ? "text-red-400"
                  : user.fraudScore >= 40
                    ? "text-yellow-400"
                    : "text-green-400"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Fraud: {user.fraudScore.toFixed(1)}
            </div>
            <div className="text-[11px] text-[#4A4D57]">
              Referral code: {user.referralCode}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MiniStat icon={DollarSign} label="Balance" value={formatHoney(user.balanceHoney)} />
        <MiniStat icon={TrophyIcon} label="Lifetime" value={formatHoney(user.lifetimeEarned)} />
        <MiniStat icon={Zap} label="XP" value={formatHoney(user.xp)} />
        <MiniStat icon={Trophy} label="Level" value={String(user.level)} />
        <MiniStat icon={Crown} label="VIP" value={user.vipTier} className={vipColors[user.vipTier]} />
        <MiniStat icon={Flame} label="Streak" value={`${user.currentStreak} / ${user.longestStreak}`} />
        <MiniStat icon={Users} label="Ref Tier" value={String(user.referralTier)} />
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {user.isBanned ? (
          <ActionButton
            icon={ShieldOff}
            label="Unban"
            color="green"
            loading={actionLoading}
            onClick={() => performAction({ action: "unban" })}
          />
        ) : (
          <ActionButton
            icon={Ban}
            label="Ban"
            color="red"
            onClick={() => setShowBanModal(true)}
          />
        )}
        {user.chatMuted ? (
          <ActionButton
            icon={MessageSquare}
            label="Unmute"
            color="green"
            loading={actionLoading}
            onClick={() => performAction({ action: "unmute" })}
          />
        ) : (
          <ActionButton
            icon={MessageSquareOff}
            label="Mute"
            color="yellow"
            onClick={() => setShowMuteModal(true)}
          />
        )}
        <ActionButton
          icon={Wallet}
          label="Adjust Balance"
          color="blue"
          onClick={() => setShowBalanceModal(true)}
        />
        {!user.emailVerified && (
          <ActionButton
            icon={Mail}
            label="Force Verify Email"
            color="green"
            loading={actionLoading}
            onClick={() => performAction({ action: "forceVerifyEmail" })}
          />
        )}
        <ActionButton
          icon={Crown}
          label="Change VIP"
          color="amber"
          onClick={() => {
            setSelectedVipTier(user.vipTier);
            setShowVipModal(true);
          }}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#2A2D37]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#F5A623] font-medium text-[#F5A623]"
                : "text-[#6B6D77] hover:text-white"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-[#4A4D57]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        {activeTab === "transactions" && (
          <TransactionsTab items={data.recentTransactions} />
        )}
        {activeTab === "offers" && <OffersTab items={data.recentOffers} />}
        {activeTab === "withdrawals" && (
          <WithdrawalsTab items={data.withdrawals} />
        )}
        {activeTab === "referrals" && (
          <ReferralsTab
            referrer={data.referrer}
            referred={data.referredUsers}
          />
        )}
        {activeTab === "achievements" && (
          <AchievementsTab items={data.achievements} />
        )}
        {activeTab === "sessions" && <SessionsTab items={data.sessions} />}
      </div>

      {/* ---- Modals ---- */}

      {/* Ban Modal */}
      <ActionModal
        title="Ban User"
        open={showBanModal}
        onClose={closeAllModals}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#6B6D77]">
              Reason (optional)
            </label>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Fraud, abuse, etc."
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeAllModals}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={actionLoading}
              onClick={async () => {
                await performAction({ action: "ban", reason: banReason || undefined });
                closeAllModals();
              }}
              className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {actionLoading ? "Banning..." : "Ban User"}
            </button>
          </div>
        </div>
      </ActionModal>

      {/* Mute Modal */}
      <ActionModal
        title="Mute User"
        open={showMuteModal}
        onClose={closeAllModals}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#6B6D77]">
              Duration (minutes)
            </label>
            <div className="flex gap-2">
              {[15, 30, 60, 1440, 10080].map((m) => (
                <button
                  key={m}
                  onClick={() => setMuteDuration(m)}
                  className={`rounded-md px-2.5 py-1.5 text-xs ${
                    muteDuration === m
                      ? "bg-[#F5A623]/10 text-[#F5A623]"
                      : "bg-[#0F1117] text-[#6B6D77] hover:text-white"
                  }`}
                >
                  {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeAllModals}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={actionLoading}
              onClick={async () => {
                await performAction({
                  action: "mute",
                  muteDurationMinutes: muteDuration,
                });
                closeAllModals();
              }}
              className="rounded-lg bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
            >
              {actionLoading ? "Muting..." : "Mute User"}
            </button>
          </div>
        </div>
      </ActionModal>

      {/* Balance Adjustment Modal */}
      <ActionModal
        title="Adjust Balance"
        open={showBalanceModal}
        onClose={closeAllModals}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#6B6D77]">
              Amount (positive to add, negative to deduct)
            </label>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#6B6D77]">
              Reason (required)
            </label>
            <input
              type="text"
              value={balanceReason}
              onChange={(e) => setBalanceReason(e.target.value)}
              placeholder="e.g. Compensation for bug, manual adjustment..."
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeAllModals}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={actionLoading || !balanceAmount || !balanceReason}
              onClick={async () => {
                await performAction({
                  action: "adjustBalance",
                  amount: balanceAmount,
                  reason: balanceReason,
                });
                closeAllModals();
              }}
              className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
            >
              {actionLoading ? "Adjusting..." : "Adjust Balance"}
            </button>
          </div>
        </div>
      </ActionModal>

      {/* VIP Tier Modal */}
      <ActionModal
        title="Change VIP Tier"
        open={showVipModal}
        onClose={closeAllModals}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {VIP_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedVipTier(tier)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedVipTier === tier
                    ? "bg-[#F5A623]/10 text-[#F5A623]"
                    : "bg-[#0F1117] text-[#6B6D77] hover:text-white"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeAllModals}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={actionLoading || selectedVipTier === user.vipTier}
              onClick={async () => {
                await performAction({
                  action: "changeVipTier",
                  vipTier: selectedVipTier,
                });
                closeAllModals();
              }}
              className="rounded-lg bg-[#F5A623]/10 px-3 py-1.5 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20 disabled:opacity-50"
            >
              {actionLoading ? "Updating..." : "Update VIP Tier"}
            </button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

// ---- Sub Components ----

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Trophy {...props} />;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-[#4A4D57]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold ${className ?? "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  color: "red" | "green" | "yellow" | "blue" | "amber";
  onClick: () => void;
  loading?: boolean;
}) {
  const colorMap = {
    red: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    green: "bg-green-500/10 text-green-400 hover:bg-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
    blue: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
    amber: "bg-[#F5A623]/10 text-[#F5A623] hover:bg-[#F5A623]/20",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${colorMap[color]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-[#4A4D57]">
        {message}
      </td>
    </tr>
  );
}

// ---- Tab Content Components ----

function TransactionsTab({ items }: { items: Transaction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5 text-right">Balance After</th>
            <th className="px-4 py-2.5">Source</th>
            <th className="px-4 py-2.5">Description</th>
            <th className="px-4 py-2.5">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2D37]">
          {items.length === 0 ? (
            <EmptyRow cols={6} message="No transactions" />
          ) : (
            items.map((tx) => (
              <tr key={tx.id}>
                <td className="whitespace-nowrap px-4 py-2">
                  <span className="rounded bg-[#0F1117] px-1.5 py-0.5 text-[11px] font-medium text-[#C8C9CE]">
                    {tx.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-2 text-right font-mono text-sm ${
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {formatHoney(tx.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-sm text-[#8B8D97]">
                  {formatHoney(tx.balanceAfter)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {tx.sourceType}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-[#8B8D97]">
                  {tx.description}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {formatDateTime(tx.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OffersTab({ items }: { items: OfferCompletion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
            <th className="px-4 py-2.5">Offer</th>
            <th className="px-4 py-2.5">Provider</th>
            <th className="px-4 py-2.5 text-right">Reward</th>
            <th className="px-4 py-2.5 text-right">Payout</th>
            <th className="px-4 py-2.5 text-right">Margin</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2D37]">
          {items.length === 0 ? (
            <EmptyRow cols={7} message="No offer completions" />
          ) : (
            items.map((o) => (
              <tr key={o.id}>
                <td className="max-w-[200px] truncate px-4 py-2 text-white">
                  {o.offerName}
                  {o.offerCategory && (
                    <span className="ml-1.5 text-[11px] text-[#4A4D57]">
                      {o.offerCategory}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-[#8B8D97]">
                  {o.provider.name}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-green-400">
                  +{formatHoney(o.rewardToUserHoney)}
                  {o.vipBonusHoney > 0 && (
                    <span className="ml-1 text-[10px] text-[#F5A623]">
                      +{o.vipBonusHoney}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-[#8B8D97]">
                  {formatCents(o.payoutToUsCents)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-[#6B6D77]">
                  {formatHoney(o.platformMarginHoney)}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[o.status] ?? "text-[#6B6D77] bg-[#2A2D37]"}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {formatDateTime(o.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function WithdrawalsTab({ items }: { items: Withdrawal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
            <th className="px-4 py-2.5">Method</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5 text-right">Fee</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Fraud Score</th>
            <th className="px-4 py-2.5">Requested</th>
            <th className="px-4 py-2.5">Processed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2D37]">
          {items.length === 0 ? (
            <EmptyRow cols={7} message="No withdrawals" />
          ) : (
            items.map((w) => (
              <tr key={w.id}>
                <td className="whitespace-nowrap px-4 py-2 text-white">
                  {w.method}
                  {w.isFirstWithdrawal && (
                    <span className="ml-1.5 rounded bg-blue-500/10 px-1 py-0.5 text-[10px] text-blue-400">
                      1st
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-white">
                  {formatCents(w.amountUsdCents)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-mono text-[#6B6D77]">
                  {w.feeUsdCents > 0 ? formatCents(w.feeUsdCents) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[w.status] ?? "text-[#6B6D77] bg-[#2A2D37]"}`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <span
                    className={`font-mono text-xs ${
                      w.fraudScoreAtRequest >= 70
                        ? "text-red-400"
                        : w.fraudScoreAtRequest >= 40
                          ? "text-yellow-400"
                          : "text-[#6B6D77]"
                    }`}
                  >
                    {w.fraudScoreAtRequest.toFixed(1)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {formatDateTime(w.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {formatDateTime(w.processedAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReferralsTab({
  referrer,
  referred,
}: {
  referrer: { id: string; username: string; email: string } | null;
  referred: ReferredUser[];
}) {
  return (
    <div className="p-4">
      {/* Referrer */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B6D77]">
          Referred By
        </h3>
        {referrer ? (
          <a
            href={`/admin/users/${referrer.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F1117] px-3 py-2 text-sm text-[#F5A623] hover:bg-[#0F1117]/70"
          >
            <Users className="h-3.5 w-3.5" />
            {referrer.username}
            <span className="text-[#4A4D57]">{referrer.email}</span>
          </a>
        ) : (
          <span className="text-sm text-[#4A4D57]">No referrer</span>
        )}
      </div>

      {/* Referred Users */}
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B6D77]">
        Referred Users ({referred.length})
      </h3>
      {referred.length === 0 ? (
        <div className="text-sm text-[#4A4D57]">No referrals</div>
      ) : (
        <div className="space-y-1">
          {referred.map((r) => (
            <a
              key={r.id}
              href={`/admin/users/${r.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white hover:bg-[#0F1117]/50"
            >
              <span>{r.username}</span>
              <span className="text-xs text-[#4A4D57]">
                {formatDate(r.createdAt)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementsTab({ items }: { items: Achievement[] }) {
  return (
    <div className="p-4">
      {items.length === 0 ? (
        <div className="py-4 text-center text-sm text-[#4A4D57]">
          No achievements earned
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2.5"
            >
              <span className="text-xl">{a.achievement.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {a.achievement.name}
                </div>
                <div className="truncate text-[11px] text-[#6B6D77]">
                  {a.achievement.description}
                </div>
                <div className="text-[10px] text-[#4A4D57]">
                  {formatDate(a.earnedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionsTab({ items }: { items: SessionInfo[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
            <th className="px-4 py-2.5">Device</th>
            <th className="px-4 py-2.5">IP</th>
            <th className="px-4 py-2.5">Last Active</th>
            <th className="px-4 py-2.5">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2D37]">
          {items.length === 0 ? (
            <EmptyRow cols={4} message="No active sessions" />
          ) : (
            items.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap px-4 py-2">
                  <span className="flex items-center gap-1.5 text-white">
                    <Monitor className="h-3.5 w-3.5 text-[#6B6D77]" />
                    {s.device ?? "Unknown"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[#8B8D97]">
                  {s.ip ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(s.lastActive)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[#6B6D77]">
                  {formatDateTime(s.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
