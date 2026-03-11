"use client";

import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import BeeLoader from "@/components/BeeLoader";
import { useApi } from "@/hooks/useApi";
import { useMutate } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { HoneyIcon } from "@/components/Icons";
import { ProgressBar } from "@/components/SharedComponents";
import {
  Crown,
  Hexagon,
  Star,
  CheckCircle2,
  Lock,
  Gift,
  Ticket,
  ExternalLink,
  MessageCircle,
  Globe,
} from "lucide-react";

// ---- API response types ----

interface VipTierInfo {
  tier: string;
  name: string;
  bonusPercent: number;
  color: string;
  benefits: string[];
}

interface AllTierInfo {
  tier: string;
  name: string;
  bonusPercent: number;
  color: string;
  benefits: string[];
  monthlyThresholdHoney: number;
  monthlyThresholdUsd: number;
  isCurrent: boolean;
  isReached: boolean;
}

interface VipResponse {
  vip: {
    currentTier: VipTierInfo;
    monthlyEarningsHoney: number;
    monthlyEarningsUsd: number;
    nextTier: {
      tier: string;
      name: string;
      bonusPercent: number;
      color: string;
      thresholdHoney: number;
      thresholdUsd: number;
      remainingHoney: number;
      progressPercent: number;
    } | null;
    level: {
      level: number;
      currentXp: number;
      xpForCurrentLevel: number;
      xpForNextLevel: number;
      progressPercent: number;
    };
    lifetimeEarnedHoney: number;
    lifetimeEarnedUsd: number;
    allTiers: AllTierInfo[];
  } | null;
}

interface StreakDay {
  day: number;
  reward: number;
  completed: boolean;
  isCurrent: boolean;
}

interface StreakResponse {
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastEarnDate: string | null;
    earnedToday: boolean;
    days: StreakDay[];
    nextMilestones: {
      sevenDay: { target: number; daysRemaining: number; bonus: number };
      thirtyDay: { target: number; daysRemaining: number; bonus: number };
    };
  } | null;
}

// ---- Fallback data ----

const fallbackTiers: AllTierInfo[] = [
  { tier: "BRONZE", name: "Bronze", bonusPercent: 2, color: "#CD7F32", benefits: ["2% bonus on all offers", "Standard support"], monthlyThresholdHoney: 0, monthlyThresholdUsd: 0, isCurrent: true, isReached: true },
  { tier: "SILVER", name: "Silver", bonusPercent: 5, color: "#A8B2BD", benefits: ["5% bonus on all offers", "Priority support", "Early access to new offers"], monthlyThresholdHoney: 10000, monthlyThresholdUsd: 10, isCurrent: false, isReached: false },
  { tier: "GOLD", name: "Gold", bonusPercent: 8, color: "#F5A623", benefits: ["8% bonus on all offers", "VIP support", "Exclusive offers", "Lower withdrawal mins"], monthlyThresholdHoney: 50000, monthlyThresholdUsd: 50, isCurrent: false, isReached: false },
  { tier: "PLATINUM", name: "Platinum", bonusPercent: 12, color: "#E5E4E2", benefits: ["12% bonus on all offers", "Dedicated support", "All Gold benefits", "Custom withdrawal limits"], monthlyThresholdHoney: 150000, monthlyThresholdUsd: 150, isCurrent: false, isReached: false },
];

const fallbackStreak: NonNullable<StreakResponse["streak"]> = {
  currentStreak: 3,
  longestStreak: 7,
  lastEarnDate: null,
  earnedToday: false,
  days: [
    { day: 1, reward: 10, completed: true, isCurrent: false },
    { day: 2, reward: 15, completed: true, isCurrent: false },
    { day: 3, reward: 20, completed: true, isCurrent: false },
    { day: 4, reward: 25, completed: false, isCurrent: true },
    { day: 5, reward: 30, completed: false, isCurrent: false },
    { day: 6, reward: 40, completed: false, isCurrent: false },
    { day: 7, reward: 100, completed: false, isCurrent: false },
  ],
  nextMilestones: {
    sevenDay: { target: 7, daysRemaining: 4, bonus: 500 },
    thirtyDay: { target: 30, daysRemaining: 27, bonus: 5000 },
  },
};

export default function RewardsPage() {
  const { data: vipData, loading: vipLoading } = useApi<VipResponse>("/api/user/me/vip");
  const { data: streakData, loading: streakLoading } = useApi<StreakResponse>("/api/user/me/streak");
  const { refreshUser } = useAuth();

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { mutate: redeemMutate, loading: redeemLoading } = useMutate();

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoMessage(null);

    const result = await redeemMutate(() =>
      api.post<{ message: string; reward: { honey: number; usd: number } }>("/api/promo/redeem", { code: promoCode.trim() })
    );

    if (result) {
      setPromoMessage({ type: "success", text: `${result.reward.honey.toLocaleString()} Honey added to your balance!` });
      setPromoCode("");
      refreshUser();
    } else {
      setPromoMessage({ type: "error", text: "Invalid or expired promo code" });
    }
  };

  const loading = vipLoading || streakLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <BeeLoader size="lg" label="Loading rewards..." />
        </div>
      </AppLayout>
    );
  }

  // Map API data or use fallbacks
  const vip = vipData?.vip;
  const currentTierData = vip?.currentTier ?? fallbackTiers[0];
  const nextTier = vip?.nextTier ?? null;
  const allTiers = vip?.allTiers?.length ? vip.allTiers : fallbackTiers;
  const monthlyEarnings = vip?.monthlyEarningsHoney ?? 0;

  const streak = streakData?.streak ?? fallbackStreak!;

  return (
    <AppLayout>
      {/* VIP program hero */}
      <div className="relative bg-bg-surface rounded-2xl border border-border overflow-hidden mb-8 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-accent-orange/5 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {/* Current tier badge */}
              <div className="relative inline-flex items-center justify-center">
                <Hexagon
                  className="w-14 h-14"
                  style={{ color: currentTierData.color }}
                  fill={`${currentTierData.color}20`}
                />
                <Crown className="w-6 h-6 absolute" style={{ color: currentTierData.color }} />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Your VIP Tier</p>
                <h1 className="font-heading text-2xl font-bold" style={{ color: currentTierData.color }}>
                  {currentTierData.name}
                </h1>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              You&apos;re earning a <span className="text-accent-gold font-semibold">{currentTierData.bonusPercent}% bonus</span> on all offers.
              {nextTier && (
                <> Earn {nextTier.remainingHoney.toLocaleString()} more Honey this month to reach {nextTier.name}.</>
              )}
            </p>
            {nextTier && (
              <ProgressBar
                value={monthlyEarnings}
                max={nextTier.thresholdHoney}
                showLabel
              />
            )}
          </div>

          {/* Current tier benefits */}
          <div className="bg-bg-elevated rounded-xl border border-border p-4 md:w-64 shrink-0">
            <h3 className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-2">Your Benefits</h3>
            <ul className="space-y-2">
              {currentTierData.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* VIP Tiers breakdown */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">VIP Tiers</h2>
        <p className="text-sm text-text-secondary mb-4">Earn Honey from offers to climb the tiers each month</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {allTiers.map((tier) => {
            return (
              <div
                key={tier.name}
                className={`relative bg-bg-surface rounded-xl border p-5 transition-all ${
                  tier.isCurrent
                    ? "border-accent-gold/40 ring-1 ring-accent-gold/20"
                    : tier.isReached
                    ? "border-success/20"
                    : "border-border"
                }`}
              >
                {tier.isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-accent-gold text-bg-deepest text-[10px] font-bold rounded-full whitespace-nowrap">
                    CURRENT
                  </div>
                )}

                <div className="text-center">
                  {/* Tier hex icon */}
                  <div className="relative inline-flex items-center justify-center mb-3 mt-1">
                    <Hexagon
                      className="w-12 h-12"
                      style={{ color: tier.color }}
                      fill={`${tier.color}20`}
                    />
                    <Star className="w-5 h-5 absolute" style={{ color: tier.color }} />
                  </div>

                  <h3 className="font-heading font-bold text-sm mb-0.5" style={{ color: tier.color }}>
                    {tier.name}
                  </h3>
                  <p className="font-mono font-bold text-2xl text-text-primary mb-1">+{tier.bonusPercent}%</p>
                  <p className="text-[10px] text-text-tertiary mb-3">
                    {tier.monthlyThresholdHoney === 0 ? "Default" : `${tier.monthlyThresholdHoney.toLocaleString()} Honey/mo`}
                  </p>

                  <ul className="space-y-1.5 text-left">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <CheckCircle2 className={`w-3 h-3 shrink-0 mt-0.5 ${tier.isReached ? "text-success" : "text-text-tertiary"}`} />
                        <span className={tier.isReached ? "text-text-secondary" : "text-text-tertiary"}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daily streak */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Daily Login Streak</h2>
        <p className="text-sm text-text-secondary mb-4">
          Log in daily to earn bonus Honey. Current streak: <span className="text-accent-gold font-semibold">{streak.currentStreak} days</span>
        </p>

        <div className="bg-bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
            {streak.days.map((day) => {
              return (
                <div key={day.day} className="flex flex-col items-center gap-2 min-w-[60px]">
                  {/* Hex node */}
                  <div className="relative inline-flex items-center justify-center">
                    <Hexagon
                      className={`w-12 h-12 ${
                        day.completed
                          ? "text-accent-gold fill-accent-gold/20"
                          : day.isCurrent
                          ? "text-accent-gold/50 fill-accent-gold/5"
                          : "text-border fill-bg-elevated"
                      }`}
                    />
                    {day.completed ? (
                      <CheckCircle2 className="w-5 h-5 absolute text-accent-gold" />
                    ) : day.isCurrent ? (
                      <Gift className="w-5 h-5 absolute text-accent-gold/60" />
                    ) : (
                      <Lock className="w-4 h-4 absolute text-text-tertiary" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p className={`text-[10px] font-semibold ${day.completed ? "text-accent-gold" : day.isCurrent ? "text-text-primary" : "text-text-tertiary"}`}>
                      Day {day.day}
                    </p>
                    <div className="flex items-center gap-0.5 justify-center">
                      <HoneyIcon className="w-3 h-3" />
                      <span className={`text-[10px] font-mono font-semibold ${day.completed ? "text-accent-gold" : "text-text-tertiary"}`}>
                        {day.reward}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!streak.earnedToday && streak.currentStreak < 7 && (
            <div className="mt-4 text-center">
              <button className="px-5 py-2.5 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all">
                Claim Day {streak.currentStreak + 1} Bonus
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Promo code card */}
      <section className="mb-8">
        <div className="bg-bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20">
              <Ticket className="w-5 h-5 text-accent-gold" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-text-primary">Promo Code</h3>
              <p className="text-xs text-text-secondary">Have a code? Redeem it for bonus Honey</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemPromo()}
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-gold/30 transition-colors font-mono"
            />
            <button
              onClick={handleRedeemPromo}
              disabled={redeemLoading || !promoCode.trim()}
              className="px-5 py-2.5 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redeemLoading ? "Redeeming..." : "Redeem"}
            </button>
          </div>
          {promoMessage && (
            <p className={`mt-2 text-xs font-medium ${promoMessage.type === "success" ? "text-success" : "text-danger"}`}>
              {promoMessage.text}
            </p>
          )}
        </div>
      </section>

      {/* Community links */}
      <section>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Join the Community</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="#"
            className="bg-bg-surface rounded-xl border border-border p-4 flex items-center gap-3 hover:border-accent-gold/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center border border-[#5865F2]/20">
              <MessageCircle className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent-gold transition-colors">Discord</h4>
              <p className="text-xs text-text-secondary">Chat with the community & get support</p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-tertiary" />
          </a>
          <a
            href="#"
            className="bg-bg-surface rounded-xl border border-border p-4 flex items-center gap-3 hover:border-accent-gold/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1DA1F2]/10 flex items-center justify-center border border-[#1DA1F2]/20">
              <Globe className="w-5 h-5 text-[#1DA1F2]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent-gold transition-colors">Twitter / X</h4>
              <p className="text-xs text-text-secondary">Follow for updates & giveaways</p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-tertiary" />
          </a>
        </div>
      </section>
    </AppLayout>
  );
}
