"use client";

import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import FeaturedTasks from "@/components/FeaturedTasks";
import { HoneyIcon } from "@/components/Icons";
import {
  PaymentLogoBanner,
  WelcomeBanner,
} from "@/components/Part3Components";
import {
  EmptyState,
  ProgressBar,
  ProviderAvatar,
  StatCard,
} from "@/components/SharedComponents";
import {
  activeUserTasks,
  currentUser,
  paymentMethodLogos,
  platformActivitySnapshot,
  topEarnersToday,
} from "@/data/mockData";
import {
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Coins,
  Flame,
  MessageSquareMore,
  TrendingUp,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";

const rankColors = {
  1: "text-accent-gold",
  2: "text-[#A8B2BD]",
  3: "text-[#CD7F32]",
};

export default function HomePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <WelcomeBanner
          username={currentUser.username}
          weeklyEarnings={currentUser.weeklyEarnings}
          isNewUser={currentUser.isNewUser}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Coins className="w-5 h-5" />} label="Honey Balance" value={currentUser.honeyBalance.toLocaleString()} valueColor="text-accent-gold" />
          <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Tasks Completed" value={currentUser.tasksCompleted} />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Earned Today" value={currentUser.earnedToday.toLocaleString()} valueColor="text-accent-gold" />
          <StatCard icon={<Flame className="w-5 h-5" />} label="Daily Streak" value={`${currentUser.streakDays}d`} subtext="Keep it alive" valueColor="text-accent-gold" />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-text-primary">Quick Actions</h2>
            <p className="mt-1 text-sm text-text-secondary">Jump straight into the highest-impact earning paths.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { title: "Complete an Offer", href: "/earn", icon: <Zap className="w-10 h-10 text-accent-gold" /> },
              { title: "Take a Survey", href: "/surveys", icon: <MessageSquareMore className="w-10 h-10 text-accent-gold" /> },
              { title: "Invite a Friend", href: "/referrals", icon: <UserPlus className="w-10 h-10 text-accent-gold" /> },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-border bg-bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent-gold/30 hover:shadow-[0_10px_24px_rgba(245,166,35,0.08)]">
                <div className="mb-4 flex justify-center">{item.icon}</div>
                <h3 className="text-center font-heading text-lg font-bold text-text-primary">{item.title}</h3>
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-accent-gold/20 px-3 py-1.5 text-sm font-medium text-accent-gold transition-colors group-hover:bg-accent-gold/10">
                    Go <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <FeaturedTasks />

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-text-primary">Your Active Tasks</h2>
              <p className="mt-1 text-sm text-text-secondary">Offers you&apos;ve started and can continue right now.</p>
            </div>
            <Link href="/tasks" className="text-sm font-medium text-accent-gold hover:text-accent-gold-hover">
              View All Active Tasks
            </Link>
          </div>
          {activeUserTasks.length ? (
            <div className="space-y-3">
              {activeUserTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border bg-bg-surface p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <ProviderAvatar name={task.title} size={56} className="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">{task.title}</h3>
                        <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[10px] text-text-tertiary">{task.provider}</span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">{task.requirement}</p>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
                          <span>{task.progressLabel}</span>
                          <span>{task.timeLeft}</span>
                        </div>
                        <ProgressBar value={task.progressValue} max={task.progressMax} />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between gap-4 md:flex-col md:items-end">
                      <div className="inline-flex items-center gap-1.5 font-mono text-lg font-bold text-accent-gold">
                        <HoneyIcon className="w-4 h-4" />
                        {task.reward.toLocaleString()}
                      </div>
                      <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover active:scale-95">
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-surface p-4">
              <EmptyState title="No active tasks" subtitle="Start an offer to track your progress here." action={{ label: "Browse Offers", onClick: () => window.location.assign("/earn") }} />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-border bg-bg-surface p-5">
            <div className="mb-4">
              <h2 className="font-heading text-xl font-bold text-text-primary">Recent Platform Activity</h2>
              <p className="mt-1 text-sm text-text-secondary">A live snapshot of payouts, offer completions, and momentum around the hive.</p>
            </div>
            <div className="space-y-3">
              {platformActivitySnapshot.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-bg-elevated/35 px-3 py-3">
                  <ProviderAvatar name={item.user} size={24} className="rounded-full text-[9px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      <span className="font-semibold">{item.user}</span> {item.text}
                    </p>
                    <p className="mt-1 text-[11px] text-text-tertiary">{item.time}</p>
                  </div>
                  <div className="shrink-0">
                    {item.type === "withdrawal" ? <CheckCircle2 className="w-4 h-4 text-success" /> : item.type === "earning" ? <HoneyIcon className="w-4 h-4" /> : item.type === "survey" ? <CheckCircle className="w-4 h-4 text-accent-gold" /> : <Trophy className="w-4 h-4 text-accent-gold" />}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Top Earners Today</h2>
                <p className="mt-1 text-sm text-text-secondary">Who&apos;s stacking the most Honey today.</p>
              </div>
              <Link href="/races" className="text-sm font-medium text-accent-gold hover:text-accent-gold-hover">
                View Full Leaderboard
              </Link>
            </div>
            <div className="space-y-2">
              {topEarnersToday.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg-elevated/35 px-3 py-3">
                  <div className="w-8 flex justify-center">
                    <span className={`font-mono text-sm font-bold ${rankColors[entry.rank as 1 | 2 | 3] || "text-text-secondary"}`}>#{entry.rank}</span>
                  </div>
                  <div className="flex-1 text-sm font-medium text-text-primary">{entry.username}</div>
                  <div className="inline-flex items-center gap-1 font-mono text-sm font-bold text-accent-gold">
                    <HoneyIcon className="w-3.5 h-3.5" />
                    {entry.honey.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-text-primary">Payment Methods</h2>
            <p className="mt-1 text-sm text-text-secondary">Trusted payout brands and gift card partners available across the platform.</p>
          </div>
          <PaymentLogoBanner logos={paymentMethodLogos} />
        </section>
      </div>
    </AppLayout>
  );
}
