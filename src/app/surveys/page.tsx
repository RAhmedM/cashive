"use client";

import React, { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import BeeLoader from "@/components/BeeLoader";
import SurveyProfileModal from "@/components/SurveyProfileModal";
import { surveyWalls as mockSurveyWalls, surveyStats } from "@/data/mockData";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { HoneyIcon } from "@/components/Icons";
import { ProviderTile, StatCard, ProgressBar, StepCards } from "@/components/SharedComponents";
import { BarChart3, CheckCircle2, TrendingUp, ClipboardCheck, UserCircle, MousePointerClick } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

interface Provider {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  type: string;
  bonusBadgePct: number;
  iframeBaseUrl: string | null;
}

export default function SurveysPage() {
  const { user, refreshUser } = useAuth();
  const { data: providersData, loading } = useApi<{ providers: Provider[] }>("/api/offers/providers");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Filter to SURVEY-type providers, fallback to mock data
  const surveyWalls = useMemo(() => {
    const apiProviders = providersData?.providers?.filter((p) => p.type === "SURVEY");
    if (apiProviders && apiProviders.length > 0) {
      return apiProviders.map((p) => ({
        id: p.id,
        name: p.name,
        bonus: p.bonusBadgePct,
        image: p.logoUrl || undefined,
        // These fields don't exist in the API — use reasonable defaults
        avgPayout: 650,
        available: 0,
        payoutRange: "Varies",
      }));
    }
    // Fallback to mock data for demo/dev
    return mockSurveyWalls;
  }, [providersData]);

  const profileCompletion = user?.stats.surveyProfileCompletion ?? surveyStats.profileCompletion;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">Surveys</h1>
        <p className="text-sm text-text-secondary">
          Share your opinions and earn Honey with every survey you complete
        </p>
      </div>

      {/* Survey stats bar — no API endpoint, keep mock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Surveys Available"
          value={surveyStats.surveysAvailable}
          subtitle="Across all providers"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg. Payout"
          value={surveyStats.avgPayout}
          subtitle="Honey per survey"
          valueColor="text-accent-gold"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="You've Completed"
          value={surveyStats.userCompleted}
          subtitle={`Earned ${surveyStats.userTotalEarned.toLocaleString()} Honey total`}
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
            <ProgressBar value={profileCompletion} max={100} showLabel />
            <div className="mt-3">
              <button
                onClick={() => setProfileModalOpen(true)}
                className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all"
              >
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

        {loading ? (
          <div className="flex justify-center py-12">
            <BeeLoader />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveyWalls.map((wall) => (
              <ProviderTile
                key={wall.id}
                logo={wall.image}
                name={wall.name}
                badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
                badgeColor="#F5A623"
                subtitle={wall.available > 0 ? `${wall.available} surveys available` : "Surveys available"}
              >
                <div className="flex items-center gap-1 text-xs text-text-secondary mt-2">
                  <span>Avg.</span>
                  <HoneyIcon className="w-3 h-3" />
                  <span className="font-mono font-semibold text-accent-gold">{wall.avgPayout}</span>
                  <span className="text-text-tertiary ml-1">{wall.payoutRange}</span>
                </div>
                <button className="w-full mt-3 py-2.5 rounded-lg bg-accent-gold text-bg-deepest font-semibold text-sm hover:bg-accent-gold-hover active:scale-[0.98] transition-all">
                  Take Surveys
                </button>
              </ProviderTile>
            ))}
          </div>
        )}
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
              description: "Complete surveys honestly -- most take 5-20 minutes",
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Earn Honey",
              description: "Get paid instantly once a survey is verified. Higher-quality answers = more surveys",
            },
          ]}
        />
      </section>

      {/* Survey profile modal */}
      <SurveyProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSaved={() => refreshUser()}
      />
    </AppLayout>
  );
}
