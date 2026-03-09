"use client";

import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { races } from "@/data/mockData";
import { HoneyIcon } from "@/components/Icons";
import { CountdownTimer, FilterPill, StepCards, StatCard } from "@/components/SharedComponents";
import {
  Trophy,
  Medal,
  Timer,
  TrendingUp,
  Zap,
  Target,
  DollarSign,
  Crown,
  Hexagon,
} from "lucide-react";

export default function RacesPage() {
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  const race = races[tab];

  const podiumStyles: Record<number, string> = {
    1: "text-accent-gold bg-accent-gold/10 border-accent-gold/30",
    2: "text-[#A8B2BD] bg-[#A8B2BD]/10 border-[#A8B2BD]/30",
    3: "text-[#CD7F32] bg-[#CD7F32]/10 border-[#CD7F32]/30",
  };

  const podiumIcons: Record<number, React.ReactNode> = {
    1: <Crown className="w-4 h-4 text-accent-gold" />,
    2: <Medal className="w-4 h-4 text-[#A8B2BD]" />,
    3: <Medal className="w-4 h-4 text-[#CD7F32]" />,
  };

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">Races</h1>
        <p className="text-sm text-text-secondary">
          Compete with other users to win real cash prizes
        </p>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 mb-6">
        <FilterPill label="Daily Race" active={tab === "daily"} onClick={() => setTab("daily")} />
        <FilterPill label="Monthly Race" active={tab === "monthly"} onClick={() => setTab("monthly")} />
      </div>

      {/* Active race hero */}
      <div className="relative bg-bg-surface rounded-2xl border border-border overflow-hidden mb-6 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-accent-orange/5 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20">
                  <Trophy className="w-6 h-6 text-accent-gold" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary">{race.title}</h2>
                  <p className="text-xs text-text-secondary">
                    Your position: <span className="text-accent-gold font-semibold">#{race.userPosition}</span>
                    {" | "}
                    Points: <span className="font-mono font-semibold text-text-primary">{race.userPoints.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                Ends in
              </span>
              <CountdownTimer targetDate={race.endsAt} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Prize Pool"
          value={`$${race.totalPrize}`}
          valueColor="text-accent-gold"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Your Position"
          value={`#${race.userPosition}`}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Your Points"
          value={race.userPoints.toLocaleString()}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Players"
          value={race.leaderboard.length}
          subtext="and counting"
        />
      </div>

      {/* Prize breakdown */}
      <section className="mb-6">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-3">Prize Breakdown</h2>
        <div className="flex flex-wrap gap-3">
          {race.prizes.map((prize, i) => (
            <div
              key={i}
              className={`bg-bg-surface rounded-xl border px-4 py-3 text-center min-w-[100px] ${
                i < 3 ? podiumStyles[i + 1] || "border-border" : "border-border"
              }`}
            >
              <p className="text-[10px] text-text-secondary font-semibold uppercase mb-0.5">{prize.rank}</p>
              <p className="font-mono font-bold text-lg text-text-primary">${prize.amount}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-3">Leaderboard</h2>

        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {race.leaderboard
            .filter((entry) => entry.rank <= 3)
            .map((entry) => (
              <div
                key={entry.rank}
                className={`bg-bg-surface rounded-xl border p-4 text-center ${podiumStyles[entry.rank]}`}
              >
                <div className="relative inline-flex items-center justify-center mb-2">
                  <Hexagon
                    className="w-10 h-10"
                    fill="currentColor"
                    style={{ opacity: 0.15 }}
                  />
                  <span className="absolute text-xs font-bold">#{entry.rank}</span>
                </div>
                <p className="font-semibold text-sm text-text-primary mb-0.5">{entry.username}</p>
                <p className="font-mono text-xs text-text-secondary mb-1">{entry.points.toLocaleString()} pts</p>
                <p className="font-mono font-bold text-accent-gold">${entry.prize}</p>
              </div>
            ))}
        </div>

        {/* Full table */}
        <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3 w-16">Rank</th>
                <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Player</th>
                <th className="text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Points</th>
                <th className="text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Prize</th>
              </tr>
            </thead>
            <tbody>
              {race.leaderboard.map((entry) => {
                const isUser = "isUser" in entry && entry.isUser;
                const isTop3 = entry.rank <= 3;

                return (
                  <tr
                    key={entry.rank}
                    className={`border-b border-border/50 last:border-0 transition-colors ${
                      isUser
                        ? "bg-accent-gold/5 sticky bottom-0"
                        : "hover:bg-bg-elevated/50"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {isTop3 && podiumIcons[entry.rank]}
                        <span className={`text-sm font-mono font-semibold ${isTop3 ? "" : "text-text-secondary"}`}>
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-sm ${isUser ? "font-bold text-accent-gold" : "text-text-primary"}`}>
                        {entry.username}
                        {isUser && <span className="text-[10px] ml-1.5 text-text-secondary">(You)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-mono text-text-secondary">
                        {entry.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-mono font-semibold text-accent-gold">
                        ${entry.prize}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* How races work */}
      <section>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">How Races Work</h2>
        <StepCards
          steps={[
            {
              icon: <Zap className="w-6 h-6" />,
              title: "Complete Offers",
              description: "Every Honey you earn from offers and surveys counts as race points",
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Climb the Leaderboard",
              description: "Compete against other users to reach the top positions",
            },
            {
              icon: <Trophy className="w-6 h-6" />,
              title: "Win Cash Prizes",
              description: "Top finishers receive real cash prizes paid directly to their account",
            },
          ]}
        />
      </section>
    </AppLayout>
  );
}
