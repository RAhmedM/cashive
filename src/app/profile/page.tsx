"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import BeeLoader from "@/components/BeeLoader";
import {
  AchievementBadge,
  ActivityFeed,
  EarningsChart,
  ProfileAvatarHero,
} from "@/components/Part3Components";
import { CopyButton, ProgressBar, StatCard } from "@/components/SharedComponents";
import { useAuth, getLevelProgress } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { profileEarnings } from "@/data/mockData";
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

// ---- API response types ----

interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteriaType: string;
  criteriaValue: number;
  earned: boolean;
  earnedAt: string | null;
  progress: { current: number; target: number; percent: number };
}

interface AchievementsResponse {
  achievements: Achievement[];
  stats: { earned: number; total: number };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  metadata: unknown;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ---- Icon mapping ----

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

// ---- Transaction type mapping ----

function txTypeToFilter(type: string): string {
  if (type === "WITHDRAWAL") return "withdrawal";
  if (type === "REFERRAL_COMMISSION") return "referral";
  if (type === "SURVEY_EARNING") return "survey";
  return "earning";
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAchievementDate(dateStr: string | null): string | undefined {
  if (!dateStr) return undefined;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { data: achievementsData, loading: achievementsLoading } = useApi<AchievementsResponse>("/api/user/me/achievements");
  const { data: txData, loading: txLoading } = useApi<TransactionsResponse>("/api/user/me/transactions");

  const [range, setRange] = React.useState<"7D" | "30D" | "90D" | "All">("7D");
  const [filter, setFilter] = React.useState("All");
  const [visibleCount, setVisibleCount] = React.useState(10);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const loading = authLoading || achievementsLoading || txLoading;

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <BeeLoader size="lg" label="Loading profile..." />
        </div>
      </AppLayout>
    );
  }

  // Build user display data from auth context
  const initials = user.username.slice(0, 2).toUpperCase();
  const totalEarnedUsd = user.lifetimeEarned / 1000;
  const levelProgress = getLevelProgress(user.xp, user.level);

  // Map VIP tier for display
  const vipTierDisplay: Record<string, string> = {
    NONE: "None",
    BRONZE: "Bronze",
    SILVER: "Silver",
    GOLD: "Gold",
    PLATINUM: "Platinum",
  };
  const vipTier = vipTierDisplay[user.vipTier] ?? user.vipTier;

  // Next level VIP tier name for display
  const vipOrder = ["NONE", "BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const nextVipIdx = vipOrder.indexOf(user.vipTier) + 1;
  const nextVipName = nextVipIdx < vipOrder.length ? vipTierDisplay[vipOrder[nextVipIdx]] : vipTier;

  // Build activity feed from transactions
  const transactions = txData?.transactions ?? [];
  const activityItems = transactions.map((tx, i) => ({
    id: i,
    type: txTypeToFilter(tx.type),
    description: tx.description || tx.type.replace(/_/g, " ").toLowerCase(),
    amount: tx.amount,
    time: formatTimeAgo(tx.createdAt),
  }));

  const filteredActivity = activityItems.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Earnings") return item.type === "earning" || item.type === "survey";
    if (filter === "Withdrawals") return item.type === "withdrawal";
    if (filter === "Referrals") return item.type === "referral";
    return true;
  });

  const visibleActivity = filteredActivity.slice(0, visibleCount);

  // Achievements from API
  const achievements = achievementsData?.achievements ?? [];

  return (
    <AppLayout>
      <div className="space-y-8">
          <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-5 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#A8B2BD]/12 via-transparent to-accent-gold/5 pointer-events-none" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProfileAvatarHero initials={initials} />
              <div>
                <h1 className="font-heading text-3xl font-bold text-text-primary">{user.username}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[#A8B2BD]">{vipTier}</span>
                  <span className="text-text-tertiary">-</span>
                  <span className="text-text-secondary">Level {user.level}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                  <span>User ID: {user.id.slice(0, 8)}</span>
                  <CopyButton text={user.id} className="px-2.5 py-1 text-xs" />
                </div>
                <div className="mt-4 max-w-xl rounded-xl border border-border bg-bg-elevated/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-text-secondary">
                    <span>
                      XP: {levelProgress.xpInLevel.toLocaleString()} / {levelProgress.xpNeeded.toLocaleString()}
                    </span>
                    <span>Next: {nextVipName}</span>
                  </div>
                  <ProgressBar value={levelProgress.xpInLevel} max={levelProgress.xpNeeded} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="rounded-lg border border-accent-gold/20 px-4 py-2.5 text-sm font-semibold text-accent-gold transition-colors hover:bg-accent-gold/10">
                Edit Profile
              </Link>
              <CopyButton text={`https://cashive.gg/u/${user.username}`} className="px-4 py-2.5" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
          <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`$${totalEarnedUsd.toFixed(2)}`} valueColor="text-accent-gold" />
          <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Tasks Completed" value={user.stats.offersCompleted} />
          <StatCard icon={<MessageSquareMore className="w-5 h-5" />} label="Surveys Completed" value={user.stats.surveyProfileCompletion} />
          <StatCard icon={<Users className="w-5 h-5" />} label="Referrals" value={user.stats.referrals} />
        </section>

        {/* Earnings chart — no API for this, keep mock data */}
        <EarningsChart data={profileEarnings[range]} range={range} onRangeChange={(value) => setRange(value as typeof range)} />

        {/* Activity feed from transactions API */}
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
            }, 300);
          }}
        />

        {/* Achievements from API */}
        <section className="rounded-2xl border border-border bg-bg-surface p-5 animate-fade-up">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-bold text-text-primary">Achievements</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {achievementsData?.stats
                  ? `${achievementsData.stats.earned} of ${achievementsData.stats.total} earned`
                  : "Milestones across tasks, surveys, streaks, referrals, and cashouts."}
              </p>
            </div>
            <button className="text-sm font-medium text-accent-gold hover:text-accent-gold-hover">View All</button>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-6 pb-2">
              {achievements.map((badge) => (
                <AchievementBadge
                  key={badge.id}
                  icon={iconMap[badge.icon] ?? <Trophy className="w-5 h-5" />}
                  label={badge.name}
                  earned={badge.earned}
                  date={formatAchievementDate(badge.earnedAt)}
                  description={badge.description}
                />
              ))}
              {achievements.length === 0 && (
                <p className="text-sm text-text-secondary py-4">Complete tasks to unlock achievements!</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
