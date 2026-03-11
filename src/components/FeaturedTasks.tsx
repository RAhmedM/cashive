"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { featuredTasks } from "@/data/mockData";
import { HoneyIcon } from "./Icons";
import { TaskRow } from "./SharedComponents";

export default function FeaturedTasks() {
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

      {/* Carousel — uses TaskRow featured variant */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2"
      >
        {featuredTasks.map((task) => (
          <TaskRow
            key={task.id}
            variant="featured"
            icon={task.image}
            title={task.title}
            description={task.requirement}
            provider={task.provider}
            reward={task.reward}
            difficulty={task.difficulty}
            estimatedTime={task.estimatedTime}
            ctaLabel="Earn Now"
          />
        ))}
      </div>
    </section>
  );
}
