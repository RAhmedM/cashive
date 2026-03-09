"use client";

import React from "react";
import { liveActivity } from "@/data/mockData";
import { HoneyIcon } from "./Icons";
import { CheckCircle, Trophy } from "lucide-react";

export default function LiveTicker() {
  // Double items for seamless infinite scroll
  const items = [...liveActivity, ...liveActivity];

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
