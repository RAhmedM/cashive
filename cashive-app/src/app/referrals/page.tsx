"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import { referralStats, commissionTiers, referredUsers } from "@/data/mockData";
import { HoneyIcon } from "@/components/Icons";
import { StatCard, CopyButton, StepCards, ProgressBar } from "@/components/SharedComponents";
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
  CheckCircle2,
  Hexagon,
} from "lucide-react";

export default function ReferralsPage() {
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
            <span className="truncate block">{referralStats.referralLink}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyButton text={referralStats.referralLink} />
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Referral Code:</span>
          <code className="text-xs font-mono text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded">{referralStats.referralCode}</code>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Referrals"
          value={referralStats.totalReferrals}
        />
        <StatCard
          icon={<UserPlus className="w-5 h-5" />}
          label="Active This Month"
          value={referralStats.activeThisMonth}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Earned"
          value={`$${referralStats.totalEarned.toFixed(2)}`}
          valueColor="text-accent-gold"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Commission Rate"
          value={`${referralStats.commissionRate}%`}
          subtext={`${referralStats.currentTier} Tier`}
          valueColor="text-success"
        />
      </div>

      {/* Commission tiers */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Commission Tiers</h2>
        <p className="text-sm text-text-secondary mb-4">Earn more as you refer more active users</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {commissionTiers.map((tier) => {
            const isCurrent = tier.name === referralStats.currentTier;
            return (
              <div
                key={tier.name}
                className={`relative bg-bg-surface rounded-xl border p-5 text-center transition-all ${
                  isCurrent
                    ? "border-accent-gold/40 ring-1 ring-accent-gold/20"
                    : "border-border hover:border-accent-gold/20"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-accent-gold text-bg-deepest text-[10px] font-bold rounded-full">
                    CURRENT
                  </div>
                )}

                {/* Hex badge with tier icon */}
                <div className="relative inline-flex items-center justify-center mb-3 mt-1">
                  <Hexagon
                    className="w-12 h-12"
                    style={{ color: tier.color }}
                    fill={`${tier.color}20`}
                  />
                  <Crown
                    className="w-5 h-5 absolute"
                    style={{ color: tier.color }}
                  />
                </div>

                <h3 className="font-heading font-bold text-text-primary text-sm mb-0.5" style={{ color: isCurrent ? tier.color : undefined }}>
                  {tier.name}
                </h3>
                <p className="font-mono font-bold text-2xl text-text-primary mb-1">{tier.rate}%</p>
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
        {(() => {
          const currentIdx = commissionTiers.findIndex((t) => t.name === referralStats.currentTier);
          const nextTier = commissionTiers[currentIdx + 1];
          if (!nextTier) return null;
          return (
            <div className="mt-4 bg-bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-secondary">
                  Progress to <span className="text-text-primary font-medium">{nextTier.name}</span> ({nextTier.rate}%)
                </span>
                <span className="text-xs font-mono text-text-tertiary">
                  {referralStats.activeThisMonth} / {nextTier.requiredActive} active
                </span>
              </div>
              <ProgressBar value={referralStats.activeThisMonth} max={nextTier.requiredActive} />
            </div>
          );
        })()}
      </section>

      {/* Referred users table */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Your Referrals</h2>

        {/* Desktop table */}
        <div className="hidden md:block bg-bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">User</th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Joined</th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Their Earnings</th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Your Commission</th>
              </tr>
            </thead>
            <tbody>
              {referredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-text-primary">{user.username}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">
                    {new Date(user.joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-text-secondary">${user.theirEarnings.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-accent-gold">${user.yourCommission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {referredUsers.map((user) => (
            <div key={user.id} className="bg-bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">{user.username}</span>
                <span className="text-xs text-text-tertiary">
                  {new Date(user.joined).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Earned: ${user.theirEarnings.toFixed(2)}</span>
                <span className="text-sm font-mono font-semibold text-accent-gold">+${user.yourCommission.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
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
              description: "Earn a percentage of their earnings for life — automatically",
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
