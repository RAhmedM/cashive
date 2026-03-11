"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { TaskRow } from "./SharedComponents";
import BeeLoader from "./BeeLoader";

interface FeaturedOffer {
  id: string;
  title: string;
  requirement: string;
  providerName: string;
  providerLogoUrl: string | null;
  posterImageUrl: string | null;
  appIconUrl: string | null;
  rewardHoney: number;
  externalUrl: string;
  category: string;
  completions: number;
}

interface FeaturedResponse {
  offers: FeaturedOffer[];
  categories: string[];
}

// Fallback static data when API is unavailable
const fallbackTasks = [
  { id: "1", title: "State of Survival: Zombie War", requirement: "Reach Stronghold Level 10", provider: "TyrAds", image: "/apps/state-of-survival.svg", reward: 3060, difficulty: "Medium" as const, estimatedTime: "3-5 days" },
  { id: "2", title: "Raid: Shadow Legends", requirement: "Reach Player Level 30", provider: "AdGem", image: "/apps/raid-shadow-legends.svg", reward: 5200, difficulty: "Hard" as const, estimatedTime: "7-10 days" },
  { id: "3", title: "Coin Master", requirement: "Reach Village Level 8", provider: "Torox", image: "/apps/coin-master.svg", reward: 1850, difficulty: "Easy" as const, estimatedTime: "1-2 days" },
  { id: "4", title: "Rise of Kingdoms", requirement: "Reach City Hall Level 15", provider: "Lootably", image: "/apps/rise-of-kingdoms.svg", reward: 7500, difficulty: "Hard" as const, estimatedTime: "10-14 days" },
  { id: "5", title: "Merge Dragons", requirement: "Complete Challenge 6", provider: "RevU", image: "/apps/merge-dragons.svg", reward: 2100, difficulty: "Medium" as const, estimatedTime: "2-3 days" },
];

export default function FeaturedTasks() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { data, loading } = useApi<FeaturedResponse>("/api/offers/featured");

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const tasks =
    data && data.offers.length > 0
      ? data.offers.map((o) => ({
          id: o.id,
          title: o.title,
          requirement: o.requirement,
          provider: o.providerName,
          image: o.appIconUrl || "/apps/default.svg",
          reward: o.rewardHoney,
        }))
      : fallbackTasks;

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-gold" />
            Featured Tasks
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Hand-picked high-value offers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BeeLoader size="md" label="Loading offers..." />
        </div>
      ) : (
        /* Carousel — uses TaskRow featured variant */
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2"
        >
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              variant="featured"
              icon={task.image}
              title={task.title}
              description={task.requirement}
              provider={task.provider}
              reward={task.reward}
              ctaLabel="Earn Now"
            />
          ))}
        </div>
      )}
    </section>
  );
}
