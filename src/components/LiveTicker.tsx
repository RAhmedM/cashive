"use client";

/**
 * LiveTicker — Scrolling marquee of recent platform activity.
 *
 * Loads initial events from /api/ticker/recent, then receives
 * new events in real-time via Socket.IO. New events are prepended
 * to the list, keeping the display fresh.
 */
import React, { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSocketEvent } from "@/contexts/SocketContext";
import { HoneyIcon } from "./Icons";
import { CheckCircle, Trophy } from "lucide-react";
import { SERVER_EVENTS } from "@/lib/socket-events";
import type { TickerEventPayload } from "@/lib/socket-events";

interface TickerDisplayItem {
  user: string;
  amount: number;
  action: "earned" | "withdrew" | "won race";
}

interface TickerResponse {
  events: TickerEventPayload[];
}

function eventToDisplay(event: TickerEventPayload): TickerDisplayItem {
  const action =
    event.type === "withdrawal"
      ? ("withdrew" as const)
      : event.type === "race_win"
        ? ("won race" as const)
        : ("earned" as const);

  return {
    user: event.username,
    amount: event.amount,
    action,
  };
}

// Fallback static data for when the API hasn't loaded yet
const fallbackItems: TickerDisplayItem[] = [
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

const MAX_TICKER_ITEMS = 30;

export default function LiveTicker() {
  const { data } = useApi<TickerResponse>("/api/ticker/recent");
  const [liveItems, setLiveItems] = useState<TickerDisplayItem[]>([]);

  // Receive real-time ticker events via Socket.IO
  useSocketEvent(
    SERVER_EVENTS.TICKER_EVENT,
    useCallback((payload: TickerEventPayload) => {
      const item = eventToDisplay(payload);
      setLiveItems((prev) => [item, ...prev].slice(0, MAX_TICKER_ITEMS));
    }, [])
  );

  // Merge: live items first, then API-loaded items, then fallback
  const apiItems =
    data && data.events.length > 0 ? data.events.map(eventToDisplay) : [];

  const baseItems =
    liveItems.length > 0 || apiItems.length > 0
      ? [...liveItems, ...apiItems].slice(0, MAX_TICKER_ITEMS)
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
