"use client";

import React, { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { allTasks, featuredTasks } from "@/data/mockData";
import { HoneyIcon, HoneycombPattern } from "@/components/Icons";
import { ProviderAvatar, FilterPill, EmptyState } from "@/components/SharedComponents";
import { Search, Clock, ChevronLeft, ChevronRight, SlidersHorizontal, Zap, ArrowUpDown } from "lucide-react";

const categories = ["All", "Game", "Apps", "Deposits", "Casino", "Free Trials", "Sign-ups", "Quizzes"];
const sortOptions = ["Popular", "Highest Payout", "Lowest Payout", "Newest"];
const difficultyOptions = ["All", "Easy", "Medium", "Hard"];
const providers = ["All", "TyrAds", "AdGem", "Torox", "Lootably", "RevU", "OfferToro", "AdGate"];

const difficultyColors: Record<string, string> = {
  Easy: "text-success bg-success/10 border-success/20",
  Medium: "text-accent-gold bg-accent-gold/10 border-accent-gold/20",
  Hard: "text-danger bg-danger/10 border-danger/20",
};

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Popular");
  const [difficulty, setDifficulty] = useState("All");
  const [provider, setProvider] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const featuredScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollFeatured = (dir: "left" | "right") => {
    featuredScrollRef.current?.scrollBy({
      left: dir === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  const filtered = useMemo(() => {
    let tasks = [...allTasks];

    // Search
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.requirement.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q)
      );
    }

    // Category
    if (category !== "All") tasks = tasks.filter((t) => t.category === category);

    // Difficulty
    if (difficulty !== "All") tasks = tasks.filter((t) => t.difficulty === difficulty);

    // Provider
    if (provider !== "All") tasks = tasks.filter((t) => t.provider === provider);

    // Sort
    switch (sort) {
      case "Highest Payout":
        tasks.sort((a, b) => b.reward - a.reward);
        break;
      case "Lowest Payout":
        tasks.sort((a, b) => a.reward - b.reward);
        break;
      case "Newest":
        tasks.sort((a, b) => b.id - a.id);
        break;
      default:
        tasks.sort((a, b) => b.popularity - a.popularity);
    }

    return tasks;
  }, [search, category, sort, difficulty, provider]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">Tasks</h1>
        <p className="text-sm text-text-secondary">
          Browse {allTasks.length} offers from all providers in one place
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search tasks, games, apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-surface border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-gold/30 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${
            showFilters
              ? "bg-accent-gold/10 border-accent-gold/30 text-accent-gold"
              : "bg-bg-surface border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
        {categories.map((cat) => (
          <FilterPill key={cat} label={cat} active={category === cat} onClick={() => setCategory(cat)} />
        ))}
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 bg-bg-surface rounded-xl border border-border">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Sort By</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg py-2 px-3 text-sm text-text-primary outline-none focus:border-accent-gold/30"
            >
              {sortOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg py-2 px-3 text-sm text-text-primary outline-none focus:border-accent-gold/30"
            >
              {difficultyOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-lg py-2 px-3 text-sm text-text-primary outline-none focus:border-accent-gold/30"
            >
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Featured tasks strip */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-bold text-text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-gold" />
            Featured
          </h2>
          <div className="flex gap-2">
            <button onClick={() => scrollFeatured("left")} className="p-1.5 rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollFeatured("right")} className="p-1.5 rounded-lg bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={featuredScrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2">
          {featuredTasks.map((task) => (
            <div
              key={task.id}
              className="flex-shrink-0 w-[260px] snap-start bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all p-4 group relative overflow-hidden hover-shimmer"
            >
              <HoneycombPattern opacity={0.04} />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-gold via-accent-orange to-accent-gold opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 mb-2">
                <ProviderAvatar name={task.title} size={40} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-gold transition-colors">{task.title}</h3>
                  <span className="text-[10px] text-text-tertiary">{task.provider}</span>
                </div>
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <HoneyIcon className="w-4 h-4" />
                  <span className="font-mono font-bold text-accent-gold">{task.reward.toLocaleString()}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[task.difficulty]}`}>
                  {task.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""} found
        </p>
        <button
          onClick={() => {
            const next = sortOptions[(sortOptions.indexOf(sort) + 1) % sortOptions.length];
            setSort(next);
          }}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sort}
        </button>
      </div>

      {/* Task feed */}
      {visible.length === 0 ? (
        <EmptyState
          title="No tasks found"
          subtitle="Try adjusting your filters or search query"
          action={{ label: "Clear Filters", onClick: () => { setSearch(""); setCategory("All"); setDifficulty("All"); setProvider("All"); } }}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((task) => (
            <div
              key={task.id}
              className="bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 p-4 md:p-5 group relative overflow-hidden hover-shimmer"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <ProviderAvatar name={task.title} size={52} className="hidden sm:flex" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
                      {task.title}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[task.difficulty]}`}>
                      {task.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-1.5">{task.requirement}</p>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimatedTime}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">
                      {task.provider}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">
                      {task.category}
                    </span>
                  </div>
                </div>

                {/* Reward + CTA */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <HoneyIcon className="w-5 h-5" />
                    <span className="font-mono font-bold text-xl text-accent-gold">{task.reward.toLocaleString()}</span>
                  </div>
                  <button className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-xs rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all">
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setVisibleCount((prev) => prev + 10)}
            className="px-6 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all"
          >
            Load More ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </AppLayout>
  );
}
