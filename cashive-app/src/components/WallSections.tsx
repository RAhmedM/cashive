"use client";

import React from "react";
import { offerWalls, surveyWalls, watchWalls } from "@/data/mockData";
import { ChevronDown, Hexagon } from "lucide-react";
import { ProviderAvatar } from "./SharedComponents";

interface WallTileProps {
  name: string;
  bonus: number;
  subtitle?: string;
}

function WallTile({ name, bonus, subtitle }: WallTileProps) {
  return (
    <div className="relative bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 group cursor-pointer overflow-hidden hover-shimmer">
      {/* Bonus badge */}
      {bonus > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <div className="relative flex items-center justify-center">
            <Hexagon className="w-10 h-10 text-accent-gold fill-accent-gold/20" />
            <span className="absolute text-[10px] font-bold text-white">
              +{bonus}%
            </span>
          </div>
        </div>
      )}

      <div className="relative p-5 flex flex-col items-center text-center">
        {/* Provider Avatar */}
        <ProviderAvatar name={name} size={64} className="rounded-2xl mb-3 group-hover:border-accent-gold/20 transition-colors group-hover:scale-105 transform duration-200" />

        {/* Name */}
        <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
          {name}
        </h3>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>
        )}
      </div>

      {/* Bottom hover glow */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  );
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
          <WallTile
            key={wall.id}
            name={wall.name}
            bonus={wall.bonus}
            subtitle={`${wall.offers} offers`}
          />
        ))}
      </WallSection>

      <WallSection
        title="Survey Walls"
        subtitle="Share your opinion and earn Honey"
      >
        {surveyWalls.map((wall) => (
          <WallTile
            key={wall.id}
            name={wall.name}
            bonus={wall.bonus}
            subtitle={`Avg. ${wall.avgPayout} Honey`}
          />
        ))}
      </WallSection>

      <WallSection
        title="Watch Walls"
        subtitle="Earn Honey by watching short videos"
      >
        {watchWalls.map((wall) => (
          <WallTile
            key={wall.id}
            name={wall.name}
            bonus={wall.bonus}
            subtitle={`~${wall.perVideo} Honey/video`}
          />
        ))}
      </WallSection>
    </>
  );
}
