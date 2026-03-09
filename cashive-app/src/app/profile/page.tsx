"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
  AchievementBadge,
  ActivityFeed,
  EarningsChart,
  ProfileAvatarHero,
} from "@/components/Part3Components";
import { CopyButton, ProgressBar, StatCard } from "@/components/SharedComponents";
import {
  currentUser,
  profileAchievements,
  profileActivity,
  profileEarnings,
} from "@/data/mockData";
import {
  CheckCircle,
  DollarSign,
  MessageSquareMore,
  Shield,
  Trophy,
  Users,
  Wallet,
  Zap,
  Flame,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  zap: <Zap className="w-5 h-5" />,
  check: <CheckCircle className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  wallet: <Wallet className="w-5 h-5" />,
  dollar: <DollarSign className="w-5 h-5" />,
  flame: <Flame className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  message: <MessageSquareMore className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
};

export default function ProfilePage() {
  const [range, setRange] = React.useState<"7D" | "30D" | "90D" | "All">("7D");
  const [filter, setFilter] = React.useState("All");
  const [visibleCount, setVisibleCount] = React.useState(10);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const filteredActivity = profileActivity.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Earnings") return item.type === "earning" || item.type === "survey";
    if (filter === "Withdrawals") return item.type === "withdrawal";
    if (filter === "Referrals") return item.type === "referral";
    return true;
  });

  const visibleActivity = filteredActivity.slice(0, visibleCount);

  return (
    <AppLayout>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#A8B2BD]/12 via-transparent to-accent-gold/5 pointer-events-none" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProfileAvatarHero initials={currentUser.initials} />
              <div>
                <h1 className="font-heading text-3xl font-bold text-text-primary">{currentUser.username}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Joined {new Date(currentUser.joined).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[#A8B2BD]">{currentUser.vipTier}</span>
                  <span className="text-text-tertiary">•</span>
                  <span className="text-text-secondary">Level {currentUser.level}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                  <span>User ID: {currentUser.userId}</span>
                  <CopyButton text={currentUser.userId} className="px-2.5 py-1 text-xs" />
                </div>
                <div className="mt-4 max-w-xl rounded-xl border border-border bg-bg-elevated/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-text-secondary">
                    <span>
                      XP: {currentUser.xp.toLocaleString()} / {currentUser.nextLevelXp.toLocaleString()}
                    </span>
                    <span>Next: Gold</span>
                  </div>
                  <ProgressBar value={currentUser.xp} max={currentUser.nextLevelXp} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="rounded-lg border border-accent-gold/20 px-4 py-2.5 text-sm font-semibold text-accent-gold transition-colors hover:bg-accent-gold/10">
                Edit Profile
              </Link>
              <CopyButton text={currentUser.shareProfileUrl} className="px-4 py-2.5" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`$${currentUser.totalEarnedUsd.toFixed(2)}`} valueColor="text-accent-gold" />
          <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Tasks Completed" value={currentUser.totalTasksCompleted} />
          <StatCard icon={<MessageSquareMore className="w-5 h-5" />} label="Surveys Completed" value={currentUser.totalSurveysCompleted} />
          <StatCard icon={<Users className="w-5 h-5" />} label="Referrals" value={currentUser.totalReferrals} />
        </section>

        <EarningsChart data={profileEarnings[range]} range={range} onRangeChange={(value) => setRange(value as typeof range)} />

        <ActivityFeed
          items={visibleActivity}
          filter={filter}
          onFilterChange={setFilter}
          loading={loadingMore}
          onLoadMore={() => {
            setLoadingMore(true);
            setTimeout(() => {
              setVisibleCount((prev) => prev + 5);
              setLoadingMore(false);
            }, 800);
          }}
        />

        <section className="rounded-2xl border border-border bg-bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-text-primary">Achievements</h2>
              <p className="mt-1 text-sm text-text-secondary">Milestones across tasks, surveys, streaks, referrals, and cashouts.</p>
            </div>
            <button className="text-sm font-medium text-accent-gold hover:text-accent-gold-hover">View All</button>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-6 pb-2">
              {profileAchievements.map((badge) => (
                <AchievementBadge
                  key={badge.id}
                  icon={iconMap[badge.icon]}
                  label={badge.label}
                  earned={badge.earned}
                  date={badge.earnedAt}
                  description={badge.description}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
