"use client";

import React from "react";

export function HoneyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Honeydrop shape */}
      <path
        d="M12 2C12 2 6 10 6 14.5C6 17.8137 8.68629 20.5 12 20.5C15.3137 20.5 18 17.8137 18 14.5C18 10 12 2 12 2Z"
        fill="url(#honeyGradient)"
        stroke="#E8852D"
        strokeWidth="0.5"
      />
      {/* Inner highlight */}
      <path
        d="M10 12C10 12 9 14 9 15.5C9 16.8807 10.1193 18 11.5 18"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="honeyGradient"
          x1="12"
          y1="2"
          x2="12"
          y2="20.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFBE42" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BeeIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body - hexagon */}
      <path
        d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
        fill="#F5A623"
        stroke="#E8852D"
        strokeWidth="1"
      />
      {/* Stripes */}
      <line
        x1="13"
        y1="18"
        x2="27"
        y2="18"
        stroke="#0D0B0E"
        strokeWidth="2"
        opacity="0.4"
      />
      <line
        x1="12"
        y1="22"
        x2="28"
        y2="22"
        stroke="#0D0B0E"
        strokeWidth="2"
        opacity="0.4"
      />
      {/* Left wing - hexagon */}
      <path
        d="M10 10L6 7L2 10L2 16L6 19L10 16Z"
        fill="rgba(245,166,35,0.3)"
        stroke="#F5A623"
        strokeWidth="0.75"
      />
      {/* Right wing - hexagon */}
      <path
        d="M30 10L34 7L38 10L38 16L34 19L30 16Z"
        fill="rgba(245,166,35,0.3)"
        stroke="#F5A623"
        strokeWidth="0.75"
      />
      {/* Eyes */}
      <circle cx="16" cy="15" r="1.5" fill="#0D0B0E" />
      <circle cx="24" cy="15" r="1.5" fill="#0D0B0E" />
      {/* Eye highlights */}
      <circle cx="16.5" cy="14.5" r="0.5" fill="white" />
      <circle cx="24.5" cy="14.5" r="0.5" fill="white" />
    </svg>
  );
}

export function HoneycombPattern({
  opacity = 0.04,
}: {
  opacity?: number;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66Z' fill='none' stroke='%23F5A623' stroke-width='0.5' opacity='${opacity}'/%3E%3Cpath d='M28 100L0 84L0 50L28 34L56 50L56 84L28 100Z' fill='none' stroke='%23F5A623' stroke-width='0.5' opacity='${opacity}'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
