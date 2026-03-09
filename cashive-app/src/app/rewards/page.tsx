"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import { vipData, vipTiers, dailyStreak } from "@/data/mockData";
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

export default function RewardsPage() {
  const currentTierData = vipTiers.find((t) => t.name === vipData.currentTier);
  const nextTier = vipTiers[vipTiers.findIndex((t) => t.name === vipData.currentTier) + 1];

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
                  style={{ color: currentTierData?.color }}
                  fill={`${currentTierData?.color}20`}
                />
                <Crown className="w-6 h-6 absolute" style={{ color: currentTierData?.color }} />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Your VIP Tier</p>
                <h1 className="font-heading text-2xl font-bold" style={{ color: currentTierData?.color }}>
                  {vipData.currentTier}
                </h1>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              You&apos;re earning a <span className="text-accent-gold font-semibold">{currentTierData?.bonus}% bonus</span> on all offers.
              {nextTier && (
                <> Earn {(nextTier.threshold - vipData.currentPoints).toLocaleString()} more Honey this month to reach {nextTier.name}.</>
              )}
            </p>
            {nextTier && (
              <ProgressBar
                value={vipData.currentPoints}
                max={nextTier.threshold}
                showLabel
              />
            )}
          </div>

          {/* Current tier benefits */}
          <div className="bg-bg-elevated rounded-xl border border-border p-4 md:w-64 shrink-0">
            <h3 className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-2">Your Benefits</h3>
            <ul className="space-y-2">
              {currentTierData?.benefits.map((b, i) => (
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
          {vipTiers.map((tier) => {
            const isCurrent = tier.name === vipData.currentTier;
            const isAchieved = vipData.currentPoints >= tier.threshold;

            return (
              <div
                key={tier.name}
                className={`relative bg-bg-surface rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? "border-accent-gold/40 ring-1 ring-accent-gold/20"
                    : isAchieved
                    ? "border-success/20"
                    : "border-border"
                }`}
              >
                {isCurrent && (
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
                  <p className="font-mono font-bold text-2xl text-text-primary mb-1">+{tier.bonus}%</p>
                  <p className="text-[10px] text-text-tertiary mb-3">
                    {tier.threshold === 0 ? "Default" : `${tier.threshold.toLocaleString()} Honey/mo`}
                  </p>

                  <ul className="space-y-1.5 text-left">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <CheckCircle2 className={`w-3 h-3 shrink-0 mt-0.5 ${isAchieved ? "text-success" : "text-text-tertiary"}`} />
                        <span className={isAchieved ? "text-text-secondary" : "text-text-tertiary"}>{b}</span>
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
          Log in daily to earn bonus Honey. Current streak: <span className="text-accent-gold font-semibold">{dailyStreak.currentStreak} days</span>
        </p>

        <div className="bg-bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
            {dailyStreak.days.map((day, i) => {
              const isToday = i === dailyStreak.currentStreak;
              return (
                <div key={day.day} className="flex flex-col items-center gap-2 min-w-[60px]">
                  {/* Hex node */}
                  <div className="relative inline-flex items-center justify-center">
                    <Hexagon
                      className={`w-12 h-12 ${
                        day.completed
                          ? "text-accent-gold fill-accent-gold/20"
                          : isToday
                          ? "text-accent-gold/50 fill-accent-gold/5"
                          : "text-border fill-bg-elevated"
                      }`}
                    />
                    {day.completed ? (
                      <CheckCircle2 className="w-5 h-5 absolute text-accent-gold" />
                    ) : isToday ? (
                      <Gift className="w-5 h-5 absolute text-accent-gold/60" />
                    ) : (
                      <Lock className="w-4 h-4 absolute text-text-tertiary" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p className={`text-[10px] font-semibold ${day.completed ? "text-accent-gold" : isToday ? "text-text-primary" : "text-text-tertiary"}`}>
                      Day {day.day}
                    </p>
                    <div className="flex items-center gap-0.5 justify-center">
                      <HoneyIcon className="w-3 h-3" />
                      <span className={`text-[10px] font-mono font-semibold ${day.completed ? "text-accent-gold" : "text-text-tertiary"}`}>
                        {day.reward}
                      </span>
                    </div>
                  </div>

                  {/* Connector line */}
                  {i < dailyStreak.days.length - 1 && (
                    <div className="hidden" /> // Connector handled by flex gap
                  )}
                </div>
              );
            })}
          </div>

          {dailyStreak.currentStreak < 7 && (
            <div className="mt-4 text-center">
              <button className="px-5 py-2.5 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all">
                Claim Day {dailyStreak.currentStreak + 1} Bonus
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
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-gold/30 transition-colors font-mono"
            />
            <button className="px-5 py-2.5 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all shrink-0">
              Redeem
            </button>
          </div>
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
