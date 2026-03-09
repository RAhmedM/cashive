"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import { surveyWalls, surveyStats } from "@/data/mockData";
import { HoneyIcon } from "@/components/Icons";
import { ProviderAvatar, StatCard, ProgressBar, StepCards } from "@/components/SharedComponents";
import { BarChart3, CheckCircle2, TrendingUp, ClipboardCheck, UserCircle, MousePointerClick } from "lucide-react";

export default function SurveysPage() {
  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">Surveys</h1>
        <p className="text-sm text-text-secondary">
          Share your opinions and earn Honey with every survey you complete
        </p>
      </div>

      {/* Survey stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Surveys Available"
          value={surveyStats.surveysAvailable}
          subtext="Across all providers"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg. Payout"
          value={surveyStats.avgPayout}
          subtext="Honey per survey"
          valueColor="text-accent-gold"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="You've Completed"
          value={surveyStats.userCompleted}
          subtext={`Earned ${surveyStats.userTotalEarned.toLocaleString()} Honey total`}
        />
      </div>

      {/* Profile completion card */}
      <div className="bg-bg-surface rounded-xl border border-border p-5 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20 shrink-0">
            <UserCircle className="w-6 h-6 text-accent-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-text-primary mb-0.5">Survey Profile</h3>
            <p className="text-xs text-text-secondary mb-3">
              Complete your profile to qualify for more surveys and earn higher payouts
            </p>
            <ProgressBar value={surveyStats.profileCompletion} max={100} showLabel />
            <div className="mt-3">
              <button className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all">
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Survey providers grid */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Survey Providers</h2>
        <p className="text-sm text-text-secondary mb-4">Choose a provider to start earning</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveyWalls.map((wall) => (
            <div
              key={wall.id}
              className="bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 p-5 group cursor-pointer relative overflow-hidden hover-shimmer"
            >
              <div className="flex items-center gap-4 mb-4">
                <ProviderAvatar name={wall.name} image={wall.image} size={56} className="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
                      {wall.name}
                    </h3>
                    {wall.bonus > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                        +{wall.bonus}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {wall.available} surveys available
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-text-secondary">
                  <span>Avg.</span>
                  <HoneyIcon className="w-3 h-3" />
                  <span className="font-mono font-semibold text-accent-gold">{wall.avgPayout}</span>
                </div>
                <span className="text-text-tertiary">{wall.payoutRange}</span>
              </div>

              <button className="w-full mt-4 py-2.5 rounded-lg bg-accent-gold text-bg-deepest font-semibold text-sm hover:bg-accent-gold-hover active:scale-[0.98] transition-all">
                Take Surveys
              </button>

              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">How Surveys Work</h2>
        <StepCards
          steps={[
            {
              icon: <ClipboardCheck className="w-6 h-6" />,
              title: "Pick a Provider",
              description: "Choose from our trusted survey partners to find surveys that match your profile",
            },
            {
              icon: <MousePointerClick className="w-6 h-6" />,
              title: "Answer Questions",
              description: "Complete surveys honestly — most take 5-20 minutes",
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Earn Honey",
              description: "Get paid instantly once a survey is verified. Higher-quality answers = more surveys",
            },
          ]}
        />
      </section>
    </AppLayout>
  );
}
