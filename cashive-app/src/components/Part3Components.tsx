"use client";

import React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BeeIcon,
  HoneyIcon,
  HoneycombPattern,
} from "./Icons";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Headset,
  Info,
  MessageCircleQuestion,
  PanelRightClose,
  SendHorizontal,
  Smile,
  Flag,
  Zap,
  X,
  Camera,
  Lock,
} from "lucide-react";
import {
  CopyButton,
  HexBadge,
  ProviderAvatar,
} from "./SharedComponents";
import BeeLoader from "./BeeLoader";

const tierColors: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#A8B2BD",
  Gold: "#F5A623",
  Platinum: "#B8D4E3",
};

export function WelcomeBanner({
  username,
  weeklyEarnings,
  isNewUser = false,
}: {
  username: string;
  weeklyEarnings: number;
  isNewUser?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-5 md:p-8 min-h-[160px] animate-fade-up">
      <HoneycombPattern opacity={0.05} />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-accent-gold/10 via-accent-gold/5 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h1 className="mb-2 font-heading text-2xl font-bold text-text-primary md:text-3xl">
            {isNewUser ? (
              <>
                Welcome to the Hive, <span className="text-accent-gold">{username}</span>!
              </>
            ) : (
              <>
                Welcome back, <span className="text-accent-gold">{username}</span>!
              </>
            )}
          </h1>
          <p className="text-sm md:text-base text-text-secondary mb-4 flex items-center gap-2 flex-wrap">
            {isNewUser ? (
              <>
                <span>Complete your first task to start earning Honey.</span>
              </>
            ) : (
              <>
                <span>You&apos;ve earned</span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-accent-gold">
                  <HoneyIcon className="w-4 h-4" />
                  {weeklyEarnings.toLocaleString()} Honey
                </span>
                <span>this week.</span>
              </>
            )}
          </p>
          <Link
            href="/earn"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover active:scale-95"
          >
            {isNewUser ? "Start Your First Task" : "Continue Earning"}
          </Link>
        </div>

        <div className="relative hidden h-28 w-52 items-center justify-center rounded-2xl border border-accent-gold/10 bg-bg-elevated/70 md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,166,35,0.12),transparent_70%)]" />
          <BeeIcon className="w-18 h-18" />
          <div className="absolute right-8 top-6 opacity-50">
            <HexBadge text="HIVE" size="md" />
          </div>
          <div className="absolute left-8 bottom-5 opacity-35">
            <HexBadge text="XP" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentLogoBanner({
  logos,
}: {
  logos: Array<{ name: string; image?: string }>;
}) {
  const items = [...logos, ...logos];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-surface p-4 animate-fade-up">
      <div className="animate-ticker flex whitespace-nowrap gap-3">
        {items.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="inline-flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3 transition-all hover:border-accent-gold/30"
          >
            <ProviderAvatar name={logo.name} image={logo.image} size={36} className="rounded-lg" />
            <span className="text-sm font-medium text-text-secondary hover:text-text-primary">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessage({
  avatar,
  username,
  tier,
  level,
  text,
  time,
  isCurrentUser,
  system,
}: {
  avatar?: string;
  username: string;
  tier: string | null;
  level: number | null;
  text: string;
  time: string;
  isCurrentUser?: boolean;
  system?: boolean;
}) {
  if (system) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2 text-center text-[11px] italic text-text-tertiary">
        <Zap className="w-3.5 h-3.5 text-accent-gold/80" />
        <span>{text}</span>
      </div>
    );
  }

  const color = tier ? tierColors[tier] : "#F0ECE4";

  return (
    <div className={`group rounded-xl p-2.5 transition-colors ${isCurrentUser ? "bg-bg-elevated/70" : "hover:bg-bg-elevated/40"}`}>
      <div className="flex gap-2.5">
        <ProviderAvatar name={username} image={avatar} size={24} className="rounded-full text-[9px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold" style={{ color }}>
              {username}
            </span>
            {tier && <HexBadge text={tier[0]} size="sm" />}
            {level ? <span className="text-[10px] text-text-tertiary">Lv.{level}</span> : null}
            {isCurrentUser ? <span className="text-[10px] text-accent-gold">You</span> : null}
            <span className="text-[10px] text-text-tertiary">{time}</span>
            <button className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-text-tertiary hover:text-danger">
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-text-primary">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend?: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const lastSentRef = React.useRef(0);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    const now = Date.now();
    if (now - lastSentRef.current < 3000) {
      setWarning("Slow down! You can send a message every 3 seconds.");
      return;
    }
    lastSentRef.current = now;
    setWarning("");
    onSend?.(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-deepest p-2">
        <button className="p-2 text-text-tertiary hover:text-text-primary transition-colors" type="button">
          <Smile className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? "You are currently muted." : "Say something to the hive..."}
            className="max-h-28 w-full resize-none bg-transparent px-1 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
          />
          {value.length >= 150 ? (
            <div className="px-1 text-right text-[10px] text-text-tertiary">{value.length}/200</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="rounded-full bg-gradient-to-br from-accent-gold to-accent-orange p-2.5 text-bg-deepest shadow-[0_4px_16px_rgba(245,166,35,0.3)] transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
      {warning ? <p className="mt-2 text-[11px] text-accent-gold">{warning}</p> : null}
    </div>
  );
}

export function ChatPanel({
  open,
  onClose,
  messages,
}: {
  open: boolean;
  onClose: () => void;
  messages: Array<{
    id: number;
    username: string;
    avatar?: string;
    tier: string | null;
    level: number | null;
    text: string;
    time: string;
    isCurrentUser?: boolean;
    system?: boolean;
  }>;
}) {
  const [loading, setLoading] = React.useState(false);
  const [localMessages, setLocalMessages] = React.useState(messages);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  return (
    <>
      {open ? <div className="fixed inset-0 z-30 bg-black/40 xl:hidden" onClick={onClose} /> : null}
      <aside
        className={`fixed right-0 top-16 bottom-0 z-40 flex w-full max-w-[100vw] flex-col border-l border-border bg-bg-surface transition-transform duration-300 ease-out max-md:top-auto max-md:h-[82vh] max-md:rounded-t-3xl max-md:border-l-0 max-md:border-t md:w-[380px] xl:w-[320px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-bg-surface/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BeeIcon className="w-6 h-6" />
                <h3 className="font-heading text-base font-bold text-text-primary">Hive Chat</h3>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span>142 online</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-bg-elevated/50 px-4 py-2">
          <div className="animate-ticker flex whitespace-nowrap text-[11px] text-text-secondary">
            {[...Array(2)].flatMap((_, idx) =>
              localMessages.slice(0, 3).map((msg) => (
                <div key={`${idx}-${msg.id}`} className="mx-4 inline-flex items-center gap-1.5">
                  <BeeIcon className="w-3.5 h-3.5 text-accent-gold" />
                  <span className="text-text-primary">{msg.username}</span>
                  <span>{msg.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <BeeLoader size="sm" label="Loading chat..." />
            </div>
          ) : (
            <div className="space-y-1">
              {localMessages.map((message) => (
                <ChatMessage key={message.id} {...message} />
              ))}
            </div>
          )}
        </div>

        <div className="px-3 pb-2">
          <button className="mx-auto block rounded-full bg-accent-gold/10 px-3 py-1 text-[11px] font-medium text-accent-gold hover:bg-accent-gold/15">
            Jump to latest
          </button>
        </div>

        <ChatInput
          onSend={(text) => {
            setLocalMessages((prev) => [
              ...prev,
              {
                id: prev.length + 100,
                username: "JohnDoe",
                avatar: "/providers/john-doe.svg",
                tier: "Silver",
                level: 12,
                text,
                time: "just now",
                isCurrentUser: true,
              },
            ]);
          }}
        />
      </aside>
    </>
  );
}

export function FloatingSupportButton() {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<number | null>(0);

  const faqs = [
    {
      question: "How do I withdraw?",
      answer: "Go to Cashout, choose a payment method, enter your details, and confirm the withdrawal.",
    },
    {
      question: "Why is my offer not credited?",
      answer: "Some offers take time to validate. Make sure tracking was enabled and the requirement was completed exactly.",
    },
    {
      question: "How long do withdrawals take?",
      answer: "Most crypto and PayPal methods process quickly, while gift cards can take up to 24 hours.",
    },
    {
      question: "How do I verify my account?",
      answer: "Open Settings > Security and start the identity verification flow before your first withdrawal.",
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent-gold to-accent-orange text-bg-deepest shadow-[0_4px_16px_rgba(245,166,35,0.3)] transition-all duration-200 hover:scale-[1.08] hover:shadow-[0_6px_22px_rgba(245,166,35,0.4)] md:bottom-6 md:right-6 xl:right-[344px]"
      >
        <Headset className="w-6 h-6" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-24 z-[46] rounded-2xl border border-border bg-bg-surface shadow-2xl max-md:max-h-[78vh] max-md:overflow-hidden md:inset-x-auto md:bottom-24 md:right-6 md:w-[360px] xl:right-[344px] xl:bottom-24">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BeeIcon className="w-6 h-6" />
              <div>
                <h3 className="font-heading text-sm font-bold text-text-primary">Cashive Support</h3>
                <p className="text-[11px] text-text-tertiary">FAQ + live help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[48vh] overflow-y-auto p-4 md:max-h-[480px]">
            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = expanded === index;
                return (
                  <div key={faq.question} className="rounded-xl border border-border bg-bg-elevated/60">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-text-primary">{faq.question}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
                    </button>
                    {isOpen ? <p className="px-4 pb-3 text-xs leading-5 text-text-secondary">{faq.answer}</p> : null}
                  </div>
                );
              })}
            </div>

            <button className="mt-4 w-full rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover">
              Start Live Chat
            </button>
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-deepest px-3 py-2">
              <MessageCircleQuestion className="w-4 h-4 text-text-tertiary" />
              <input
                placeholder="Describe your issue..."
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button className="rounded-full bg-accent-gold p-2 text-bg-deepest">
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function EarningsChart({
  data,
  range,
  onRangeChange,
}: {
  data: Array<{ label: string; amount: number }>;
  range: string;
  onRangeChange: (range: string) => void;
}) {
  const ranges = ["7D", "30D", "90D", "All"];
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!data.length) {
    return (
      <div className="rounded-xl border border-border bg-bg-elevated/50 p-8 text-center text-sm text-text-secondary">
        Keep earning to see your chart grow!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-5 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-text-primary">Earnings Chart</h3>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onRangeChange(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                range === item
                  ? "bg-accent-gold text-bg-deepest"
                  : "border border-border bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full min-w-0 min-h-[280px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="cashiveChart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2A2433" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#9B95A0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9B95A0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#1A1520",
                  border: "1px solid #2A2433",
                  borderRadius: 12,
                  color: "#F0ECE4",
                }}
              />
              <Area type="monotone" dataKey="amount" stroke="#F5A623" strokeWidth={3} fill="url(#cashiveChart)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-border bg-bg-elevated/40">
            <BeeLoader size="sm" label="Loading chart..." />
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed({
  items,
  filter,
  onFilterChange,
  onLoadMore,
  loading,
}: {
  items: Array<{ id: number; type: string; description: string; amount: number; time: string }>;
  filter: string;
  onFilterChange: (filter: string) => void;
  onLoadMore: () => void;
  loading?: boolean;
}) {
  const filters = ["All", "Earnings", "Withdrawals", "Referrals"];

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-5 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-text-primary">Recent Activity</h3>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === item
                  ? "bg-accent-gold text-bg-deepest"
                  : "border border-border bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const positive = item.amount > 0;
          const amountText = `${positive ? "+" : ""}${item.amount.toLocaleString()}`;

          return (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg-elevated/35 px-3 py-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${positive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                {positive ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{item.description}</p>
                <p className="text-[11px] text-text-tertiary">{item.time}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 font-mono text-sm font-bold ${positive ? "text-accent-gold" : "text-danger"}`}>
                  <HoneyIcon className="w-3.5 h-3.5" />
                  {amountText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-lg border border-border bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:border-accent-gold/30 hover:text-text-primary"
        >
          {loading ? <BeeLoader size="sm" label="Loading..." /> : "Load More"}
        </button>
      </div>
    </div>
  );
}

export function AchievementBadge({
  icon,
  label,
  earned,
  date,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  earned: boolean;
  date?: string;
  description: string;
}) {
  return (
    <div className="group flex min-w-[92px] flex-col items-center gap-2 text-center">
      <div className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border ${earned ? "border-accent-gold/30 bg-accent-gold/10 text-accent-gold" : "border-border bg-bg-elevated text-text-tertiary"}`}>
        <div className="absolute inset-0 [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] bg-current opacity-10" />
        <div className="relative">{earned ? icon : <Lock className="w-5 h-5" />}</div>
      </div>
      <div>
        <p className={`text-xs font-semibold ${earned ? "text-text-primary" : "text-text-tertiary"}`}>{label}</p>
        <p className="text-[10px] text-text-tertiary">{earned ? date : description}</p>
      </div>
      <div className="pointer-events-none absolute z-20 hidden max-w-[180px] rounded-xl border border-border bg-bg-surface px-3 py-2 text-left text-[11px] text-text-secondary shadow-xl group-hover:block">
        <p className="font-semibold text-text-primary">{label}</p>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-bg-surface p-5 md:p-6 animate-fade-up ${danger ? "border-danger/20" : "border-border"}`}>
      <div className="mb-5">
        <h3 className="font-heading text-lg font-bold text-text-primary">{title}</h3>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ToggleSwitch({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-bg-elevated/35 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description ? <p className="text-xs text-text-tertiary">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-accent-gold" : "bg-border"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg-surface transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

export function TextInput({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-primary">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-bg-deepest px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent-gold focus:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]"
      />
    </label>
  );
}

export function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "info";
  message: string;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles = {
    success: {
      border: "border-success/30",
      icon: <Check className="w-4 h-4 text-success" />,
    },
    error: {
      border: "border-danger/30",
      icon: <X className="w-4 h-4 text-danger" />,
    },
    info: {
      border: "border-accent-gold/30",
      icon: <Info className="w-4 h-4 text-accent-gold" />,
    },
  }[type];

  return (
    <div className={`fixed right-4 top-20 z-[60] flex items-center gap-3 rounded-xl border bg-bg-surface px-4 py-3 shadow-xl ${styles.border}`}>
      {styles.icon}
      <span className="text-sm text-text-primary">{message}</span>
      <button onClick={onDismiss} className="text-text-tertiary hover:text-text-primary">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ProfileAvatarHero({ initials }: { initials: string }) {
  return (
    <div className="group relative">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent-gold/20 bg-accent-gold/10 text-2xl font-bold text-accent-gold">
        {initials}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <Camera className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}
