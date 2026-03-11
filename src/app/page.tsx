"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { AppLayoutContext } from "@/components/AppLayout";
import { PaymentLogoBanner } from "@/components/Part3Components";
import {
  FeaturedOfferCard,
  ProviderTile,
  TaskRow,
} from "@/components/SharedComponents";
import {
  activeUserTasks,
  currentUser,
  homepageFeaturedOffers,
  offerWalls,
  paymentMethodLogos,
  surveyWalls,
} from "@/data/mockData";
import {
  ArrowRight,
  Flame,
  Trophy,
} from "lucide-react";

function SectionHeader({
  title,
  href,
  label = "See All",
}: {
  title: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-heading text-base font-bold text-text-primary md:text-lg">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-gold transition-colors hover:text-accent-gold-hover"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { chatOpen } = React.useContext(AppLayoutContext);
  const visibleActiveTasks = activeUserTasks.slice(0, 3);
  const featuredOffers = homepageFeaturedOffers.slice(0, 6);
  const visibleOfferWalls = offerWalls.slice(0, 6);
  const visibleSurveyWalls = surveyWalls.slice(0, 5);
  const dailyRaceRank = 14;
  const balanceUsd = (currentUser.honeyBalance / 1000).toFixed(2);
  const featuredGridClass = chatOpen
    ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
    : "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";
  const pageSpacingClass = chatOpen ? "space-y-7" : "space-y-8";
  const pageWidthClass = chatOpen ? "max-w-[1180px]" : "max-w-[1380px]";
  const tileMinWidthClass = chatOpen ? "min-w-[190px] sm:min-w-[210px]" : "min-w-[210px] sm:min-w-[230px]";

  return (
    <AppLayout>
      <div className={`${pageWidthClass} ${pageSpacingClass} mx-auto transition-all duration-300`}>
        <section className="border-b border-border/70 pb-3 animate-fade-up">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="text-sm text-text-primary">
                Welcome back, <span className="font-semibold">{currentUser.username}</span>
              </p>

              <div className="inline-flex items-center gap-2 text-sm">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C12 2 6 10 6 14.5C6 17.8137 8.68629 20.5 12 20.5C15.3137 20.5 18 17.8137 18 14.5C18 10 12 2 12 2Z" fill="url(#welcomeBarHoneyGradient)" stroke="#E8852D" strokeWidth="0.5" />
                  <path d="M10 12C10 12 9 14 9 15.5C9 16.8807 10.1193 18 11.5 18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="welcomeBarHoneyGradient" x1="12" y1="2" x2="12" y2="20.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFBE42" />
                      <stop offset="1" stopColor="#F5A623" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="font-mono font-bold text-accent-gold">{currentUser.honeyBalance.toLocaleString()}</span>
                <span className="text-text-secondary">(≈ ${balanceUsd})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/rewards"
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-gold/20 bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold transition-all hover:border-accent-gold/35 hover:bg-accent-gold/14"
              >
                <Flame className="h-3.5 w-3.5" />
                {currentUser.streakDays} day streak
              </Link>
              <Link
                href="/races"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent-gold/20 hover:text-text-primary"
              >
                <Trophy className="h-3.5 w-3.5 text-accent-gold" />
                #{dailyRaceRank} in Daily Race
              </Link>
            </div>
          </div>
        </section>

        <section className="animate-fade-up">
          <SectionHeader title="Top Offers" href="/earn" />
          <div className={featuredGridClass}>
            {featuredOffers.map((offer) => (
              <FeaturedOfferCard
                key={offer.id}
                poster={offer.poster}
                icon={offer.icon}
                title={offer.title}
                requirement={offer.requirement}
                provider={offer.provider}
                providerLogo={offer.providerLogo}
                completions={offer.completions}
                reward={offer.reward}
                rewardUSD={offer.rewardUSD}
              />
            ))}
          </div>
        </section>

        {visibleActiveTasks.length > 0 ? (
          <section className="animate-fade-up">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-bold text-text-primary md:text-lg">Continue Where You Left Off</h2>
              {activeUserTasks.length > 3 ? (
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent-gold transition-colors hover:text-accent-gold-hover"
                >
                  View All Active Tasks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
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
                  progress={{
                    value: task.progressValue,
                    max: task.progressMax,
                    label: task.progressLabel,
                  }}
                  timeRemaining={task.timeLeft}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="animate-fade-up">
          <SectionHeader title="Offer Walls" href="/earn" />
          <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {visibleOfferWalls.map((wall) => (
              <div key={wall.id} className={`${tileMinWidthClass} flex-1`}>
                <ProviderTile
                  name={wall.name}
                  logo={wall.image}
                  badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
                  badgeColor="#F5A623"
                  logoOnly
                />
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up">
          <SectionHeader title="Surveys" href="/surveys" />
          <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {visibleSurveyWalls.map((wall) => (
              <div key={wall.id} className={`${tileMinWidthClass} flex-1`}>
                <ProviderTile
                  name={wall.name}
                  logo={wall.image}
                  badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
                  badgeColor="#F5A623"
                  logoOnly
                />
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up py-4">
          <PaymentLogoBanner logos={paymentMethodLogos} />
        </section>
      </div>
    </AppLayout>
  );
}
