"use client";

import React from "react";
import { Hexagon, Copy, Check } from "lucide-react";

// ─── ProviderAvatar ──────────────────────────────────────────────
// Shows a provider/app image or falls back to initials in a hexagonal container.

interface ProviderAvatarProps {
  name: string;
  image?: string;
  size?: number;
  className?: string;
}

export function ProviderAvatar({ name, image, size = 48, className = "" }: ProviderAvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [name, image]);

  // Generate initials from the name
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-bg-elevated flex items-center justify-center border border-border text-accent-gold font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {image && !imgError ? (
        <img
          src={image}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.12),transparent_60%)] text-accent-gold">
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  valueColor?: string;
}

export function StatCard({ icon, label, value, subtext, valueColor = "text-text-primary" }: StatCardProps) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center text-accent-gold shrink-0 border border-border">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary mb-0.5">{label}</p>
        <p className={`font-mono font-bold text-xl ${valueColor}`}>{value}</p>
        {subtext && <p className="text-[10px] text-text-tertiary mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

// ─── HexBadge ────────────────────────────────────────────────────

interface HexBadgeProps {
  text: string;
  color?: string;
  size?: "sm" | "md";
}

export function HexBadge({ text, color = "text-accent-gold", size = "md" }: HexBadgeProps) {
  const iconSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-[8px]" : "text-[10px]";

  return (
    <div className="relative flex items-center justify-center">
      <Hexagon className={`${iconSize} ${color} fill-current opacity-20`} />
      <span className={`absolute ${textSize} font-bold text-white`}>{text}</span>
    </div>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? "bg-accent-gold text-bg-deepest"
          : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30"
      }`}
    >
      {label}
    </button>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max,
  color = "from-accent-gold to-accent-orange",
  className = "",
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={className}>
      <div className="w-full h-2.5 bg-bg-deepest rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-secondary mt-1 font-mono">
          {value.toLocaleString()} / {max.toLocaleString()} ({Math.round(pct)}%)
        </p>
      )}
    </div>
  );
}

// ─── StepCards ───────────────────────────────────────────────────

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface StepCardsProps {
  steps: Step[];
}

export function StepCards({ steps }: StepCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {steps.map((step, i) => (
        <div
          key={i}
          className="relative bg-bg-surface rounded-xl border border-border p-5 text-center group hover:border-accent-gold/20 transition-all"
        >
          {/* Step number badge */}
          <div className="relative inline-flex items-center justify-center mb-3">
            <Hexagon className="w-8 h-8 text-accent-gold fill-accent-gold/10" />
            <span className="absolute text-[10px] font-bold text-accent-gold">{i + 1}</span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-2 text-accent-gold">{step.icon}</div>

          {/* Content */}
          <h4 className="font-semibold text-text-primary text-sm mb-1">{step.title}</h4>
          <p className="text-xs text-text-secondary">{step.description}</p>
        </div>
      ))}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Bee on empty honeycomb illustration */}
      <div className="relative mb-6">
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Empty honeycomb cells */}
          <path d="M40 50L20 38V14L40 2L60 14V38L40 50Z" fill="none" stroke="#2A2433" strokeWidth="1.5" />
          <path d="M80 50L60 38V14L80 2L100 14V38L80 50Z" fill="none" stroke="#2A2433" strokeWidth="1.5" />
          <path d="M60 86L40 74V50L60 38L80 50V74L60 86Z" fill="none" stroke="#2A2433" strokeWidth="1.5" />
          {/* Small bee sitting on center cell */}
          <g transform="translate(50, 30)">
            <path d="M10 4L16 8V16L10 20L4 16V8L10 4Z" fill="#F5A623" stroke="#E8852D" strokeWidth="0.5" />
            <path d="M4 6L1 4L-2 6V10L1 12L4 10Z" fill="rgba(245,166,35,0.2)" stroke="#F5A623" strokeWidth="0.3" />
            <path d="M16 6L19 4L22 6V10L19 12L16 10Z" fill="rgba(245,166,35,0.2)" stroke="#F5A623" strokeWidth="0.3" />
            <circle cx="8" cy="10" r="0.8" fill="#0D0B0E" />
            <circle cx="12" cy="10" r="0.8" fill="#0D0B0E" />
          </g>
        </svg>
      </div>

      <h3 className="font-heading font-bold text-lg text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-4">{subtitle}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── CountdownTimer ──────────────────────────────────────────────

interface CountdownTimerProps {
  targetDate: string;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState({ h: 0, m: 0, s: 0 });

  React.useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600_000),
        m: Math.floor((diff % 3600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5">
      {[
        { val: pad(timeLeft.h), label: "h" },
        { val: pad(timeLeft.m), label: "m" },
        { val: pad(timeLeft.s), label: "s" },
      ].map((unit, i) => (
        <React.Fragment key={unit.label}>
          {i > 0 && <span className="text-text-tertiary font-mono font-bold text-lg">:</span>}
          <div className="bg-bg-deepest rounded-lg px-2.5 py-1.5 border border-border min-w-[40px] text-center">
            <span className="font-mono font-bold text-xl text-accent-gold">{unit.val}</span>
            <span className="text-[9px] text-text-tertiary block -mt-0.5">{unit.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── CopyButton ──────────────────────────────────────────────────

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
        copied
          ? "bg-success/10 text-success border border-success/20"
          : "bg-accent-gold text-bg-deepest hover:bg-accent-gold-hover active:scale-95"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy
        </>
      )}
    </button>
  );
}
