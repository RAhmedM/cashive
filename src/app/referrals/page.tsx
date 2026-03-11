"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import BeeLoader from "@/components/BeeLoader";
import { useApi } from "@/hooks/useApi";
import { StatCard, CopyButton, StepCards, ProgressBar, DataTable, HexBadge } from "@/components/SharedComponents";
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Share2,
  Link as LinkIcon,
  Crown,
  Lightbulb,
  MessageSquare,
  Globe,
  Megaphone,
} from "lucide-react";

// ---- API response types ----

interface ReferralTier {
  tier: number;
  name: string;
  commissionRate: number;
  commissionPercent: number;
  requiredActive: number;
  isCurrent: boolean;
}

interface ReferredUser {
  username: string;
  joinedAt: string;
  theirEarningsHoney: number;
  theirEarningsUsd: number;
  yourCommissionHoney: number;
  yourCommissionUsd: number;
  offersCompleted: number;
}

interface ReferralsResponse {
  referrals: {
    stats: {
      totalReferrals: number;
      activeThisMonth: number;
      totalEarnedHoney: number;
      totalEarnedUsd: number;
    };
    referralCode: string;
    currentTier: {
      tier: number;
      name: string;
      commissionRate: number;
      commissionPercent: number;
    };
    nextTier: {
      tier: number;
      name: string;
      commissionRate: number;
      commissionPercent: number;
      requiredActive: number;
      currentActive: number;
      remaining: number;
      progressPercent: number;
    } | null;
    allTiers: ReferralTier[];
    users: ReferredUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } | null;
}

// ---- Fallback data ----

const fallbackStats = {
  totalReferrals: 0,
  activeThisMonth: 0,
  totalEarnedHoney: 0,
  totalEarnedUsd: 0,
};

const fallbackCurrentTier = {
  tier: 1,
  name: "Starter",
  commissionRate: 0.05,
  commissionPercent: 5,
};

const fallbackTiers: ReferralTier[] = [
  { tier: 1, name: "Starter", commissionRate: 0.05, commissionPercent: 5, requiredActive: 0, isCurrent: true },
  { tier: 2, name: "Bronze", commissionRate: 0.10, commissionPercent: 10, requiredActive: 5, isCurrent: false },
  { tier: 3, name: "Silver", commissionRate: 0.15, commissionPercent: 15, requiredActive: 15, isCurrent: false },
  { tier: 4, name: "Gold", commissionRate: 0.20, commissionPercent: 20, requiredActive: 30, isCurrent: false },
];

const tierColors: Record<string, string> = {
  Starter: "#9CA3AF",
  Bronze: "#CD7F32",
  Silver: "#A8B2BD",
  Gold: "#F5A623",
};

export default function ReferralsPage() {
  const { data, loading } = useApi<ReferralsResponse>("/api/user/me/referrals");

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <BeeLoader size="lg" label="Loading referral data..." />
        </div>
      </AppLayout>
    );
  }

  const ref = data?.referrals;
  const stats = ref?.stats ?? fallbackStats;
  const currentTier = ref?.currentTier ?? fallbackCurrentTier;
  const nextTier = ref?.nextTier ?? null;
  const allTiers = ref?.allTiers?.length ? ref.allTiers : fallbackTiers;
  const users = ref?.users ?? [];
  const referralCode = ref?.referralCode ?? "CASHIVE";
  const referralLink = `https://cashive.gg/?ref=${referralCode}`;

  const referralColumns = [
    {
      key: "user",
      header: "User",
      mobileLabel: "User",
      render: (user: ReferredUser) => (
        <span className="text-sm font-medium text-text-primary">{user.username}</span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      mobileLabel: "Joined",
      render: (user: ReferredUser) => (
        <span className="text-sm text-text-secondary">
          {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "theirEarnings",
      header: "Their Earnings",
      mobileLabel: "Earned",
      render: (user: ReferredUser) => (
        <span className="text-sm font-mono text-text-secondary">${user.theirEarningsUsd.toFixed(2)}</span>
      ),
    },
    {
      key: "yourCommission",
      header: "Your Commission",
      mobileLabel: "Commission",
      render: (user: ReferredUser) => (
        <span className="text-sm font-mono font-semibold text-accent-gold">${user.yourCommissionUsd.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* Hero banner */}
      <div className="relative bg-bg-surface rounded-2xl border border-border overflow-hidden mb-8 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-accent-orange/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20">
              <Users className="w-6 h-6 text-accent-gold" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-primary">Invite & Earn</h1>
              <p className="text-sm text-text-secondary">
                Earn up to <span className="text-accent-gold font-semibold">20% commission</span> on every referral
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral link card */}
      <div className="bg-bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-4 h-4 text-accent-gold" />
          <h3 className="font-semibold text-text-primary text-sm">Your Referral Link</h3>
        </div>
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1 bg-bg-elevated border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary overflow-hidden">
            <span className="truncate block">{referralLink}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyButton text={referralLink} />
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Referral Code:</span>
          <code className="text-xs font-mono text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded">{referralCode}</code>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Referrals"
          value={stats.totalReferrals}
        />
        <StatCard
          icon={<UserPlus className="w-5 h-5" />}
          label="Active This Month"
          value={stats.activeThisMonth}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Earned"
          value={`$${stats.totalEarnedUsd.toFixed(2)}`}
          valueColor="text-accent-gold"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Commission Rate"
          value={`${currentTier.commissionPercent}%`}
          subtitle={`${currentTier.name} Tier`}
          valueColor="text-success"
        />
      </div>

      {/* Commission tiers */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Commission Tiers</h2>
        <p className="text-sm text-text-secondary mb-4">Earn more as you refer more active users</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {allTiers.map((tier) => {
            const color = tierColors[tier.name] ?? "#9CA3AF";
            return (
              <div
                key={tier.name}
                className={`relative bg-bg-surface rounded-xl border p-5 text-center transition-all ${
                  tier.isCurrent
                    ? "border-accent-gold/40 ring-1 ring-accent-gold/20"
                    : "border-border hover:border-accent-gold/20"
                }`}
              >
                {tier.isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-accent-gold text-bg-deepest text-[10px] font-bold rounded-full">
                    CURRENT
                  </div>
                )}

                {/* Hex badge with tier icon */}
                <div className="inline-flex items-center justify-center mb-3 mt-1">
                  <HexBadge icon={Crown} color={color} size="lg" glowing={tier.isCurrent} />
                </div>

                <h3 className="font-heading font-bold text-text-primary text-sm mb-0.5" style={{ color: tier.isCurrent ? color : undefined }}>
                  {tier.name}
                </h3>
                <p className="font-mono font-bold text-2xl text-text-primary mb-1">{tier.commissionPercent}%</p>
                <p className="text-[10px] text-text-tertiary">
                  {tier.requiredActive === 0
                    ? "Default tier"
                    : `${tier.requiredActive}+ active referrals`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="mt-4 bg-bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">
                Progress to <span className="text-text-primary font-medium">{nextTier.name}</span> ({nextTier.commissionPercent}%)
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                {nextTier.currentActive} / {nextTier.requiredActive} active
              </span>
            </div>
            <ProgressBar value={nextTier.currentActive} max={nextTier.requiredActive} />
          </div>
        )}
      </section>

      {/* Referred users table — using DataTable */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Your Referrals</h2>
        {users.length === 0 ? (
          <div className="bg-bg-surface rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-text-secondary">No referrals yet. Share your link to start earning!</p>
          </div>
        ) : (
          <DataTable
            columns={referralColumns}
            rows={users}
            rowKey={(user) => user.username}
          />
        )}
      </section>

      {/* How it works */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">How It Works</h2>
        <StepCards
          steps={[
            {
              icon: <Share2 className="w-6 h-6" />,
              title: "Share Your Link",
              description: "Send your unique referral link to friends via any channel",
            },
            {
              icon: <UserPlus className="w-6 h-6" />,
              title: "They Sign Up & Earn",
              description: "Your friend creates an account and starts completing offers",
            },
            {
              icon: <DollarSign className="w-6 h-6" />,
              title: "You Get Paid",
              description: "Earn a percentage of their earnings for life -- automatically",
            },
          ]}
        />
      </section>

      {/* Promotion tips */}
      <section>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent-gold" />
          Promotion Tips
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <MessageSquare className="w-5 h-5" />, title: "Social Media", tip: "Share on Twitter, Reddit, or Discord communities interested in earning online" },
            { icon: <Globe className="w-5 h-5" />, title: "Blog / YouTube", tip: "Create a review or tutorial showing how you earn on cashive.gg" },
            { icon: <Megaphone className="w-5 h-5" />, title: "Direct Message", tip: "Share with friends who are interested in side income opportunities" },
          ].map((item, i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border p-4 hover:border-accent-gold/20 transition-all">
              <div className="flex items-center gap-2 mb-2 text-accent-gold">
                {item.icon}
                <h4 className="font-semibold text-text-primary text-sm">{item.title}</h4>
              </div>
              <p className="text-xs text-text-secondary">{item.tip}</p>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
