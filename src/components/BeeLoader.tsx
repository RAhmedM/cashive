"use client";

import React from "react";

// ─── BeeLoader ───────────────────────────────────────────────────
// A custom animated flying bee loading indicator.
// The bee follows a figure-8 / infinity-loop flight path with fluttering wings
// and a faint amber dotted trail.

interface BeeLoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizes = {
  sm: { bee: 24, container: 48, labelClass: "text-[10px]" },
  md: { bee: 40, container: 80, labelClass: "text-xs" },
  lg: { bee: 64, container: 140, labelClass: "text-sm" },
};

export default function BeeLoader({ size = "md", label = "Buzzing..." }: BeeLoaderProps) {
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Flight area */}
      <div
        className="relative"
        style={{ width: s.container * 2, height: s.container }}
      >
        {/* Trail dots */}
        {size !== "sm" && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bee-trail-dot absolute rounded-full bg-accent-gold"
                style={{
                  width: size === "lg" ? 4 : 3,
                  height: size === "lg" ? 4 : 3,
                  animationDelay: `${i * -0.5}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Bee */}
        <div
          className="bee-flight absolute"
          style={{
            width: s.bee,
            height: s.bee,
            top: "50%",
            left: "50%",
            marginTop: -(s.bee / 2),
            marginLeft: -(s.bee / 2),
          }}
        >
          <svg
            viewBox="0 0 40 40"
            fill="none"
            width={s.bee}
            height={s.bee}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Body - hexagon */}
            <path
              d="M20 10L28 15V25L20 30L12 25V15L20 10Z"
              fill="#F5A623"
              stroke="#E8852D"
              strokeWidth="0.8"
            />
            {/* Stripes */}
            <line x1="14" y1="19" x2="26" y2="19" stroke="#0D0B0E" strokeWidth="1.5" opacity="0.4" />
            <line x1="13.5" y1="23" x2="26.5" y2="23" stroke="#0D0B0E" strokeWidth="1.5" opacity="0.4" />
            {/* Left wing */}
            <path
              className="bee-wing-left"
              d="M12 12L8 9L4 12L4 17L8 20L12 17Z"
              fill="rgba(245,166,35,0.25)"
              stroke="#F5A623"
              strokeWidth="0.6"
            />
            {/* Right wing */}
            <path
              className="bee-wing-right"
              d="M28 12L32 9L36 12L36 17L32 20L28 17Z"
              fill="rgba(245,166,35,0.25)"
              stroke="#F5A623"
              strokeWidth="0.6"
            />
            {/* Eyes */}
            <circle cx="17" cy="16" r="1.2" fill="#0D0B0E" />
            <circle cx="23" cy="16" r="1.2" fill="#0D0B0E" />
            <circle cx="17.4" cy="15.6" r="0.4" fill="white" />
            <circle cx="23.4" cy="15.6" r="0.4" fill="white" />
          </svg>
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className={`text-text-secondary ${s.labelClass} bee-loader-label`}>
          {label}
        </span>
      )}
    </div>
  );
}
