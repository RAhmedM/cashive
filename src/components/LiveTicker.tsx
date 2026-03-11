"use client";

import React from "react";
import { useApi } from "@/hooks/useApi";
import { HoneyIcon } from "./Icons";
import { CheckCircle, Trophy } from "lucide-react";

interface TickerEvent {
  type: string;
  username: string;
  amount: number;
  offerName?: string;
  provider?: string;
  timestamp: string;
}

interface TickerResponse {
  events: TickerEvent[];
}

function eventToDisplay(event: TickerEvent) {
  const action =
    event.type === "withdrawal"
      ? "withdrew"
      : event.type === "race_win"
        ? "won race"
        : "earned";

  return {
    user: event.username,
    amount: event.amount,
    action,
  };
}

// Fallback static data for when the API hasn't loaded yet
const fallbackItems = [
  { user: "HoneyBee42", amount: 5000, action: "earned" },
  { user: "BuzzKing", amount: 3200, action: "earned" },
  { user: "NectarQueen", amount: 1500, action: "withdrew" },
  { user: "PollenDust", amount: 8750, action: "earned" },
  { user: "HiveWorker", amount: 2100, action: "earned" },
  { user: "WaxBuilder", amount: 4300, action: "withdrew" },
  { user: "FlowerScout", amount: 950, action: "earned" },
  { user: "DroneX", amount: 6200, action: "earned" },
  { user: "QueenCell", amount: 11000, action: "withdrew" },
  { user: "BeeKeep3r", amount: 1750, action: "earned" },
];

export default function LiveTicker() {
  const { data } = useApi<TickerResponse>("/api/ticker/recent");

  const baseItems =
    data && data.events.length > 0
      ? data.events.map(eventToDisplay)
      : fallbackItems;

  // Double items for seamless infinite scroll
  const items = [...baseItems, ...baseItems];

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        height: 36,
        backgroundColor: "#1A1520",
        borderTop: "1px solid rgba(245,166,35,0.14)",
      }}
    >
      <div className="animate-ticker flex items-center whitespace-nowrap h-full hover:[animation-play-state:paused]">
        {items.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1.5 mx-6"
            style={{ fontSize: 12 }}
          >
            {/* Avatar placeholder — 16px circle with initials */}
            <div className="w-4 h-4 rounded-full bg-bg-elevated flex items-center justify-center text-[7px] font-bold text-accent-gold shrink-0">
              {item.user[0]}
            </div>

            {/* Username */}
            <span className="font-bold text-text-primary">{item.user}</span>

            {/* Action text — muted */}
            <span className="text-text-secondary">
              {item.action === "earned"
                ? "earned"
                : item.action === "withdrew"
                  ? "withdrew"
                  : "won race"}
            </span>

            {/* Amount + icon */}
            <span className="inline-flex items-center gap-0.5">
              {item.action === "withdrew" ? (
                <CheckCircle className="w-3 h-3 text-success" />
              ) : item.action === "won race" ? (
                <Trophy className="w-3 h-3 text-accent-gold" />
              ) : (
                <HoneyIcon className="w-3 h-3" />
              )}
              <span className="font-mono font-semibold text-accent-gold">
                {item.amount.toLocaleString()}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
