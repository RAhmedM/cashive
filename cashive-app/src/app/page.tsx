"use client";

import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import FeaturedTasks from "@/components/FeaturedTasks";
import { HoneyIcon } from "@/components/Icons";
import { PaymentLogoBanner } from "@/components/Part3Components";
import {
  ProgressBar,
  StatCard,
  TaskRow,
} from "@/components/SharedComponents";
import {
  activeUserTasks,
  currentUser,
  paymentMethodLogos,
} from "@/data/mockData";
import {
  ArrowRight,
  CheckCircle,
  Coins,
  Flame,
  MessageSquareMore,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const visibleActiveTasks = activeUserTasks.slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[900px]">
        {/* ── Section 1: Welcome + Stats (merged) ── */}
        <section className="rounded-2xl border border-border bg-bg-surface p-5 md:p-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Welcome back, {currentUser.username}
            </h1>
            <Link
              href="/earn"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-gold hover:text-accent-gold-hover transition-colors"
            >
              Start Earning <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={<Coins className="w-5 h-5" />} label="Honey Balance" value={currentUser.honeyBalance.toLocaleString()} valueColor="text-accent-gold" />
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Tasks Completed" value={currentUser.tasksCompleted} />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Earned Today" value={currentUser.earnedToday.toLocaleString()} valueColor="text-accent-gold" />
            <StatCard icon={<Flame className="w-5 h-5" />} label="Daily Streak" value={`${currentUser.streakDays}d`} subtitle="Keep it alive" valueColor="text-accent-gold" />
          </div>
        </section>

        {/* ── Section 2: Featured Tasks ("Top Offers Right Now") ── */}
        <FeaturedTasks />

        {/* ── Section 3: Continue Where You Left Off (conditional) ── */}
        {visibleActiveTasks.length > 0 && (
          <section className="animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-text-primary">Continue Where You Left Off</h2>
              <Link href="/tasks" className="text-sm font-medium text-accent-gold hover:text-accent-gold-hover">
                View All <ArrowRight className="w-3.5 h-3.5 inline" />
              </Link>
            </div>
            <div className="space-y-3">
              {visibleActiveTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  variant="compact"
                  icon={task.image}
                  title={task.title}
                  description={task.requirement}
                  provider={task.provider}
                  reward={task.reward}
                  ctaLabel="Continue"
                  progress={{ value: task.progressValue, max: task.progressMax, label: task.progressLabel }}
                  timeRemaining={task.timeLeft}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4: Quick Links (simplified) ── */}
        <section className="animate-fade-up">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Complete an Offer", href: "/earn", icon: <Zap className="w-6 h-6 text-accent-gold" /> },
              { label: "Take a Survey", href: "/surveys", icon: <MessageSquareMore className="w-6 h-6 text-accent-gold" /> },
              { label: "Invite a Friend", href: "/referrals", icon: <UserPlus className="w-6 h-6 text-accent-gold" /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-bg-surface px-4 py-3 transition-all hover:border-accent-gold/30 hover:bg-bg-elevated"
              >
                {item.icon}
                <span className="text-sm font-medium text-text-primary flex-1">{item.label}</span>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent-gold transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Section 5: Payment Methods (compact marquee, no header) ── */}
        <section className="animate-fade-up" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <PaymentLogoBanner logos={paymentMethodLogos} />
        </section>
      </div>
    </AppLayout>
  );
}
