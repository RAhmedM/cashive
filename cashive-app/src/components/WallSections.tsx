"use client";

import React from "react";
import { offerWalls, surveyWalls, watchWalls } from "@/data/mockData";
import { ChevronDown } from "lucide-react";
import { ProviderTile } from "./SharedComponents";

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

export default function WallSections() {
  return (
    <>
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
    </>
  );
}
