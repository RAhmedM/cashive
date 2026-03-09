"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Clock, Zap } from "lucide-react";
import { featuredTasks } from "@/data/mockData";
import { HoneyIcon, HoneycombPattern } from "./Icons";
import { ProviderAvatar } from "./SharedComponents";

const difficultyColors: Record<string, string> = {
  Easy: "text-success bg-success/10 border-success/20",
  Medium: "text-accent-gold bg-accent-gold/10 border-accent-gold/20",
  Hard: "text-danger bg-danger/10 border-danger/20",
};

export default function FeaturedTasks() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2"
      >
        {featuredTasks.map((task) => (
          <div
            key={task.id}
            className="relative flex-shrink-0 w-[320px] snap-start bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 group overflow-hidden hover-shimmer"
          >
            {/* Honeycomb pattern overlay */}
            <HoneycombPattern opacity={0.06} />

            {/* Honey drip gradient at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-gold via-accent-orange to-accent-gold opacity-60 group-hover:opacity-100 transition-opacity" />

            <div className="relative p-5">
              {/* Provider tag */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {task.provider}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[task.difficulty]}`}
                >
                  {task.difficulty}
                </span>
              </div>

              {/* Icon and title */}
              <div className="flex items-start gap-3 mb-3">
                <ProviderAvatar name={task.title} size={56} className="rounded-xl" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary text-sm leading-tight group-hover:text-accent-gold transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {task.requirement}
                  </p>
                </div>
              </div>

              {/* Time estimate */}
              <div className="flex items-center gap-1.5 mb-4 text-xs text-text-tertiary">
                <Clock className="w-3.5 h-3.5" />
                <span>{task.estimatedTime}</span>
              </div>

              {/* Bottom: Reward + CTA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <HoneyIcon className="w-5 h-5" />
                  <span className="font-mono font-bold text-xl text-accent-gold">
                    {task.reward.toLocaleString()}
                  </span>
                </div>
                <button className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all duration-200">
                  Earn Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
