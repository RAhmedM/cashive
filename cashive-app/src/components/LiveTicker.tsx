"use client";

import React from "react";
import { liveActivity } from "@/data/mockData";
import { HoneyIcon, BeeIcon } from "./Icons";

export default function LiveTicker() {
  // Double the items for seamless infinite scroll
  const items = [...liveActivity, ...liveActivity];

  return (
    <div className="w-full overflow-hidden bg-bg-surface/80 border-y border-border py-2 backdrop-blur-sm">
      <div className="animate-ticker flex whitespace-nowrap">
        {items.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 mx-6 text-sm"
          >
            <BeeIcon className="w-4 h-4 text-accent-gold" />
            <span className="text-text-primary font-medium">{item.user}</span>
            <span className="text-text-secondary">
              just {item.action}
            </span>
            <span className="inline-flex items-center gap-1">
              <HoneyIcon className="w-3.5 h-3.5" />
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
