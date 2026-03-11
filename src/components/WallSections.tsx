"use client";

import React from "react";
import { useApi } from "@/hooks/useApi";
import { ChevronDown } from "lucide-react";
import { ProviderTile } from "./SharedComponents";
import BeeLoader from "./BeeLoader";

interface Provider {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  type: string;
  bonusBadgePct: number;
  iframeBaseUrl: string;
}

interface ProvidersResponse {
  providers: Provider[];
}

interface WallSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showSort?: boolean;
}

function WallSection({
  title,
  subtitle,
  children,
  showSort = false,
}: WallSectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-text-primary">
            {title}
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        {showSort && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-bg-surface border border-border rounded-lg hover:border-accent-gold/30 transition-all">
            Sort
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {children}
      </div>
    </section>
  );
}

// Fallback static data
const fallbackOfferWalls = [
  { id: "1", name: "Torox", bonus: 80, image: "/providers/torox.svg" },
  { id: "2", name: "AdGem", bonus: 0, image: "/providers/adgem-light.png" },
  { id: "3", name: "Lootably", bonus: 50, image: "/providers/lootably.png" },
  { id: "4", name: "RevU", bonus: 30, image: "/providers/revu.svg" },
  { id: "5", name: "AyeT Studios", bonus: 20, image: "/providers/ayet-light.png" },
  { id: "6", name: "OfferToro", bonus: 65, image: "/providers/offertoro.svg" },
  { id: "7", name: "AdGate", bonus: 40, image: "/providers/adgatemedia-light.svg" },
  { id: "8", name: "TimeWall", bonus: 0, image: "/providers/timewall.png" },
];

const fallbackSurveyWalls = [
  { id: "1", name: "BitLabs", bonus: 0, image: "/providers/bitlabs.svg" },
  { id: "2", name: "CPX Research", bonus: 25, image: "/providers/cpx-light.svg" },
  { id: "3", name: "TheoremReach", bonus: 0, image: "/providers/theoremreach.svg" },
  { id: "4", name: "PrimeSurveys", bonus: 15, image: "/providers/prime-light.svg" },
  { id: "5", name: "Pollfish", bonus: 10, image: "/providers/pollfish.svg" },
];

const fallbackWatchWalls = [
  { id: "1", name: "MM Watch", bonus: 0, image: "/providers/mm-watch.svg" },
  { id: "2", name: "AdScend", bonus: 0, image: "/providers/adscendmedia-light.svg" },
  { id: "3", name: "HideoutTV", bonus: 0, image: "/providers/hideout-tv.svg" },
];

export default function WallSections() {
  const { data, loading } = useApi<ProvidersResponse>("/api/offers/providers");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <BeeLoader size="md" label="Loading providers..." />
      </div>
    );
  }

  // Split providers by type from API, fallback to static data
  let offerWalls: { id: string; name: string; bonus: number; image: string }[];
  let surveyWalls: { id: string; name: string; bonus: number; image: string }[];
  let watchWalls: { id: string; name: string; bonus: number; image: string }[];

  if (data && data.providers.length > 0) {
    offerWalls = data.providers
      .filter((p) => p.type === "OFFERWALL")
      .map((p) => ({
        id: p.id,
        name: p.name,
        bonus: p.bonusBadgePct,
        image: p.logoUrl || `/providers/${p.slug}.svg`,
      }));

    surveyWalls = data.providers
      .filter((p) => p.type === "SURVEY")
      .map((p) => ({
        id: p.id,
        name: p.name,
        bonus: p.bonusBadgePct,
        image: p.logoUrl || `/providers/${p.slug}.svg`,
      }));

    watchWalls = data.providers
      .filter((p) => p.type === "VIDEO")
      .map((p) => ({
        id: p.id,
        name: p.name,
        bonus: p.bonusBadgePct,
        image: p.logoUrl || `/providers/${p.slug}.svg`,
      }));
  } else {
    offerWalls = fallbackOfferWalls;
    surveyWalls = fallbackSurveyWalls;
    watchWalls = fallbackWatchWalls;
  }

  return (
    <>
      {offerWalls.length > 0 && (
        <WallSection
          title="Offer Walls"
          subtitle="Each offer wall contains hundreds of tasks"
          showSort
        >
          {offerWalls.map((wall) => (
            <ProviderTile
              key={wall.id}
              name={wall.name}
              logo={wall.image}
              badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
              badgeColor="#F5A623"
              logoOnly
            />
          ))}
        </WallSection>
      )}

      {surveyWalls.length > 0 && (
        <WallSection
          title="Survey Walls"
          subtitle="Share your opinion and earn Honey"
        >
          {surveyWalls.map((wall) => (
            <ProviderTile
              key={wall.id}
              name={wall.name}
              logo={wall.image}
              badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
              badgeColor="#F5A623"
              logoOnly
            />
          ))}
        </WallSection>
      )}

      {watchWalls.length > 0 && (
        <WallSection
          title="Watch Walls"
          subtitle="Earn Honey by watching short videos"
        >
          {watchWalls.map((wall) => (
            <ProviderTile
              key={wall.id}
              name={wall.name}
              logo={wall.image}
              badge={wall.bonus > 0 ? `+${wall.bonus}%` : undefined}
              badgeColor="#F5A623"
              logoOnly
            />
          ))}
        </WallSection>
      )}
    </>
  );
}
