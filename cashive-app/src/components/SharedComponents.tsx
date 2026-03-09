"use client";

import React from "react";
import { Copy, Check, Lock, X, type LucideIcon } from "lucide-react";

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
// Upgraded: hover bg lightens to #241E2C (150ms), padding 20px, icon 24px amber,
// value 28px bold, label 13px muted #9B95A0, min-width for grid alignment.
// Renamed `subtext` → `subtitle`.

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
}

export function StatCard({ icon, label, value, subtitle, valueColor = "text-text-primary" }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-surface transition-colors duration-150 hover:bg-[#241E2C] min-w-[180px]" style={{ padding: 20 }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-elevated text-accent-gold">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })
          : icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="mb-0.5 leading-4 text-[#9B95A0]" style={{ fontSize: 13 }}>{label}</p>
        <p className={`font-mono font-bold leading-none ${valueColor}`} style={{ fontSize: 28 }}>{value}</p>
        {subtitle ? <p className="mt-1 text-[10px] leading-4 text-text-tertiary">{subtitle}</p> : null}
      </div>
    </div>
  );
}

// ─── HexBadge ────────────────────────────────────────────────────
// Major upgrade: CSS clip-path polygon instead of Lucide Hexagon icon.
// Sizes: "xs" (16px), "sm" (24px), "md" (40px), "lg" (64px).
// Props: `icon` (Lucide component), `locked` (muted with Lock overlay),
// `glowing` (pulsing box-shadow), `color` is hex color for fill.
// Also supports legacy `text` prop for backward compatibility.

const hexSizes = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 64,
} as const;

const hexIconSizes = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 32,
} as const;

const hexTextSizes = {
  xs: 7,
  sm: 8,
  md: 10,
  lg: 16,
} as const;

interface HexBadgeProps {
  /** Lucide icon component to render inside */
  icon?: LucideIcon;
  /** Legacy text label — used if no icon provided */
  text?: string;
  /** Hex color string for fill (e.g. "#F5A623") */
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Muted appearance with Lock overlay */
  locked?: boolean;
  /** Pulsing glow box-shadow animation */
  glowing?: boolean;
}

export function HexBadge({
  icon: IconComponent,
  text,
  color = "#F5A623",
  size = "md",
  locked = false,
  glowing = false,
}: HexBadgeProps) {
  const px = hexSizes[size];
  const iconPx = hexIconSizes[size];
  const textPx = hexTextSizes[size];

  const fillColor = locked ? "#5E5866" : color;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: px,
        height: px,
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        background: `${fillColor}20`,
        boxShadow: glowing ? `0 0 12px ${fillColor}60, 0 0 24px ${fillColor}30` : undefined,
        animation: glowing ? "hex-glow 2s ease-in-out infinite" : undefined,
      }}
    >
      {/* Solid fill layer */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: `${fillColor}20`,
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center" style={{ color: locked ? "#5E5866" : color }}>
        {locked ? (
          <Lock style={{ width: iconPx, height: iconPx }} />
        ) : IconComponent ? (
          <IconComponent style={{ width: iconPx, height: iconPx }} />
        ) : text ? (
          <span className="font-bold text-white" style={{ fontSize: textPx }}>{text}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────
// Upgraded: rounded-full, removable prop (shows × icon), consistent
// padding px-4 py-1.5, font size 13px.

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Shows × icon for removing the filter */
  removable?: boolean;
  onRemove?: () => void;
}

export function FilterPill({ label, active, onClick, removable = false, onRemove }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? "bg-accent-gold text-bg-deepest"
          : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30"
      }`}
      style={{ paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
    >
      {label}
      {removable && active && (
        <X
          className="w-3 h-3 ml-0.5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        />
      )}
    </button>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────
// Upgraded: size prop ("xs" 4px, "sm" 6px, "md" 10px, "lg" 14px),
// animated prop (shimmer effect), track color #2A2433, rounded-full,
// 300ms transition.

const barSizes = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
} as const;

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  /** Height variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Shimmer animation on the fill */
  animated?: boolean;
}

export function ProgressBar({
  value,
  max,
  color = "from-accent-gold to-accent-orange",
  className = "",
  showLabel = false,
  size = "sm",
  animated = false,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const h = barSizes[size];

  return (
    <div className={className}>
      <div className="w-full rounded-full overflow-hidden" style={{ height: h, backgroundColor: "#2A2433" }}>
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-300 relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          {animated && (
            <div className="absolute inset-0 animate-shimmer" style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }} />
          )}
        </div>
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
// Verified to use upgraded <HexBadge> for step numbers.

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
          {/* Step number badge — uses upgraded HexBadge with clip-path */}
          <div className="inline-flex items-center justify-center mb-3">
            <HexBadge text={String(i + 1)} size="sm" color="#F5A623" />
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
// Upgraded: `illustration` prop ("bee-sitting", "bee-searching", or custom SVG).
// 48px padding top/bottom.

interface EmptyStateProps {
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Built-in illustration or custom SVG ReactNode */
  illustration?: "bee-sitting" | "bee-searching" | React.ReactNode;
}

function BeeSittingIllustration() {
  return (
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
  );
}

function BeeSearchingIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Empty honeycomb cells — scattered */}
      <path d="M30 45L15 36V18L30 9L45 18V36L30 45Z" fill="none" stroke="#2A2433" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M90 45L75 36V18L90 9L105 18V36L90 45Z" fill="none" stroke="#2A2433" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M60 80L45 71V53L60 44L75 53V71L60 80Z" fill="none" stroke="#2A2433" strokeWidth="1.5" />
      {/* Bee with magnifying glass */}
      <g transform="translate(48, 48)">
        <path d="M12 4L18 8V16L12 20L6 16V8L12 4Z" fill="#F5A623" stroke="#E8852D" strokeWidth="0.5" />
        <path d="M6 6L3 4L0 6V10L3 12L6 10Z" fill="rgba(245,166,35,0.2)" stroke="#F5A623" strokeWidth="0.3" />
        <path d="M18 6L21 4L24 6V10L21 12L18 10Z" fill="rgba(245,166,35,0.2)" stroke="#F5A623" strokeWidth="0.3" />
        <circle cx="10" cy="10" r="0.8" fill="#0D0B0E" />
        <circle cx="14" cy="10" r="0.8" fill="#0D0B0E" />
        {/* Magnifying glass */}
        <circle cx="22" cy="2" r="5" fill="none" stroke="#9B95A0" strokeWidth="1.2" />
        <line x1="26" y1="6" x2="30" y2="10" stroke="#9B95A0" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function EmptyState({ title, subtitle, action, illustration = "bee-sitting" }: EmptyStateProps) {
  let illustrationNode: React.ReactNode;
  if (illustration === "bee-sitting") {
    illustrationNode = <BeeSittingIllustration />;
  } else if (illustration === "bee-searching") {
    illustrationNode = <BeeSearchingIllustration />;
  } else {
    illustrationNode = illustration;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="relative mb-6">
        {illustrationNode}
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

// ─── ProviderTile ────────────────────────────────────────────────
// New shared component replacing inline WallTile (WallSections.tsx) and
// inline survey provider cards (surveys/page.tsx).
// Centered content, 56px logo, hex/pill badge top-right,
// hover with amber border glow + translateY -2px.

interface ProviderTileProps {
  logo?: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  subtitle?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  logoOnly?: boolean;
}

export function ProviderTile({
  logo,
  name,
  badge,
  badgeColor = "#F5A623",
  subtitle,
  onClick,
  children,
  logoOnly = false,
}: ProviderTileProps) {
  return (
    <div
      onClick={onClick}
      className="relative bg-bg-surface rounded-xl border border-border transition-all duration-300 group cursor-pointer overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(245,166,35,0.12)]"
      style={{ borderColor: undefined }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,166,35,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "";
      }}
    >
      {/* Pill badge top-right */}
      {badge && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              color: badgeColor,
              backgroundColor: `${badgeColor}15`,
              borderColor: `${badgeColor}30`,
            }}
          >
            {badge}
          </span>
        </div>
      )}

      <div className={`relative flex flex-col items-center text-center ${logoOnly ? "px-6 py-7" : "p-5"}`}>
        {logoOnly ? (
          logo ? (
            <img
              src={logo}
              alt={name}
              className="h-16 w-full object-contain transition-transform duration-200 group-hover:scale-[1.04] md:h-20"
              loading="lazy"
            />
          ) : (
            <div className="flex min-h-[80px] w-full items-center justify-center text-2xl font-bold text-accent-gold md:min-h-[96px]">
              {name}
            </div>
          )
        ) : (
          <>
            <ProviderAvatar name={name} image={logo} size={56} className="rounded-2xl mb-3 group-hover:scale-105 transform duration-200" />
            <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
              {name}
            </h3>
            {subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}
          </>
        )}
        {children}
      </div>

      {/* Bottom hover glow */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  );
}

// ─── TaskRow ─────────────────────────────────────────────────────
// New shared component with two variants: "compact" (list row) and
// "featured" (larger card for carousels).

interface TaskRowProps {
  icon?: string;
  title: string;
  description?: string;
  provider?: string;
  providerLogo?: string;
  category?: string;
  reward: number;
  onStart?: () => void;
  ctaLabel?: string;
  progress?: { value: number; max: number; label?: string };
  timeRemaining?: string;
  variant?: "compact" | "featured";
  difficulty?: string;
  estimatedTime?: string;
}

const difficultyColors: Record<string, string> = {
  Easy: "text-success bg-success/10 border-success/20",
  Medium: "text-accent-gold bg-accent-gold/10 border-accent-gold/20",
  Hard: "text-danger bg-danger/10 border-danger/20",
};

export function TaskRow({
  icon,
  title,
  description,
  provider,
  category,
  reward,
  onStart,
  ctaLabel = "Start",
  progress,
  timeRemaining,
  variant = "compact",
  difficulty,
  estimatedTime,
}: TaskRowProps) {
  if (variant === "featured") {
    return (
      <div className="relative flex-shrink-0 w-[320px] snap-start bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 group overflow-hidden hover-shimmer">
        {/* Gold top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-gold via-accent-orange to-accent-gold opacity-60 group-hover:opacity-100 transition-opacity" />

        <div className="relative p-5">
          {/* Provider + difficulty */}
          <div className="flex items-center justify-between mb-3">
            {provider && (
              <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                {provider}
              </span>
            )}
            {difficulty && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[difficulty] || ""}`}>
                {difficulty}
              </span>
            )}
          </div>

          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-3">
            <ProviderAvatar name={title} image={icon} size={56} className="rounded-xl" />
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-sm leading-tight group-hover:text-accent-gold transition-colors">
                {title}
              </h3>
              {description && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{description}</p>}
            </div>
          </div>

          {/* Time estimate */}
          {estimatedTime && (
            <div className="flex items-center gap-1.5 mb-4 text-xs text-text-tertiary">
              <span>{estimatedTime}</span>
            </div>
          )}

          {/* Progress bar if provided */}
          {progress && (
            <div className="mb-4">
              {progress.label && (
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
                  <span>{progress.label}</span>
                  {timeRemaining && <span>{timeRemaining}</span>}
                </div>
              )}
              <ProgressBar value={progress.value} max={progress.max} size="xs" />
            </div>
          )}

          {/* Reward + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xl text-accent-gold">{reward.toLocaleString()}</span>
            </div>
            <button
              onClick={onStart}
              className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-sm rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all duration-200"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compact variant (list row) ──
  return (
    <div className="bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 p-4 md:p-5 group relative overflow-hidden hover-shimmer">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <ProviderAvatar name={title} image={icon} size={52} className="hidden sm:flex" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
              {title}
            </h3>
            {difficulty && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[difficulty] || ""}`}>
                {difficulty}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-text-secondary mb-1.5">{description}</p>}

          {/* Progress bar */}
          {progress && (
            <div className="mb-1.5">
              {progress.label && (
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
                  <span>{progress.label}</span>
                  {timeRemaining && <span>{timeRemaining}</span>}
                </div>
              )}
              <ProgressBar value={progress.value} max={progress.max} size="xs" />
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            {estimatedTime && <span>{estimatedTime}</span>}
            {provider && (
              <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">
                {provider}
              </span>
            )}
            {category && (
              <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">
                {category}
              </span>
            )}
          </div>
        </div>

        {/* Reward + CTA */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xl text-accent-gold">{reward.toLocaleString()}</span>
          </div>
          <button
            onClick={onStart}
            className="px-4 py-2 bg-accent-gold text-bg-deepest font-semibold text-xs rounded-lg hover:bg-accent-gold-hover active:scale-95 transition-all"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DataTable ───────────────────────────────────────────────────
// New shared component. Dark card, muted uppercase header,
// alternating row backgrounds (#1A1520 / #1E1926), highlighted row
// with amber tint + left border. Mobile transforms to stacked cards.

interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Mobile-visible label when shown as stacked card */
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Function to test if a row should be highlighted */
  highlightRow?: (row: T) => boolean;
  highlightColor?: string;
  onLoadMore?: () => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  /** Unique key extractor for rows */
  rowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  rows,
  highlightRow,
  highlightColor = "rgba(245,166,35,0.06)",
  onLoadMore,
  emptyState,
  loading,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border p-8 flex items-center justify-center">
        <div className="text-sm text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isHighlighted = highlightRow?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-border/50 last:border-0 transition-colors ${
                    isHighlighted ? "sticky bottom-0" : "hover:bg-bg-elevated/50"
                  }`}
                  style={{
                    backgroundColor: isHighlighted
                      ? highlightColor
                      : i % 2 === 0
                        ? "#1A1520"
                        : "#1E1926",
                    borderLeft: isHighlighted ? "3px solid #F5A623" : undefined,
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const isHighlighted = highlightRow?.(row);
          return (
            <div
              key={rowKey(row)}
              className="bg-bg-surface rounded-xl border border-border p-4"
              style={{
                backgroundColor: isHighlighted ? highlightColor : undefined,
                borderLeft: isHighlighted ? "3px solid #F5A623" : undefined,
              }}
            >
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between py-1">
                  <span className="text-xs text-text-tertiary">{col.mobileLabel || col.header}</span>
                  <span className="text-sm">{col.render(row)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {onLoadMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all"
          >
            Load More
          </button>
        </div>
      )}
    </>
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
