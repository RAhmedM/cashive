/**
 * Static constants and image path helpers.
 *
 * These are pure config / utility functions that don't depend on any API.
 * Extracted from mockData.ts so that components can import them without
 * pulling in the entire mock dataset.
 */

// ─── Image path helpers ──────────────────────────────────────────

const providerLogoMap: Record<string, string> = {
  adgem: "/providers/adgem-light.png",
  lootably: "/providers/lootably.png",
  timewall: "/providers/timewall.png",
  "ayet-studios": "/providers/ayet-light.png",
  adgate: "/providers/adgatemedia-light.svg",
  adscend: "/providers/adscendmedia-light.svg",
  "cpx-research": "/providers/cpx-light.svg",
  primesurveys: "/providers/prime-light.svg",
  monlix: "/providers/monlix-light.svg",
  adtowall: "/providers/adtowall-light.svg",
  "mm-wall": "/providers/mm-wall.png",
};

export function providerImage(name: string): string {
  const normalized = name.toLowerCase().replace(/\s+/g, "-");
  return providerLogoMap[normalized] || `/providers/${normalized}.svg`;
}

export function appImage(name: string): string {
  return `/apps/${name.toLowerCase().replace(/\s+/g, "-")}.svg`;
}

export function paymentImage(name: string): string {
  return `/payments/${name.toLowerCase().replace(/\s+/g, "-")}.svg`;
}

export function offerPosterImage(name: string): string | undefined {
  const posterMap: Record<string, string> = {
    "rise-of-kingdoms": "/offers/Rise-Of-Kingdoms.jpg",
    "state-of-survival": "/offers/state_of_survival.jpg",
    "raid-shadow-legends": "/offers/raid_shadow.jpg",
    "coin-master": "/offers/coin_master.jpg",
    "merge-dragons": "/offers/MergeDragons.png",
  };

  return posterMap[name.toLowerCase().replace(/\s+/g, "-")];
}

// ─── Currency helpers ────────────────────────────────────────────

export function honeyToUsd(amount: number): number {
  return Number((amount / 1000).toFixed(2));
}

// ─── Payment method logos (static config for the banner) ─────────

export const paymentMethodLogos = [
  { name: "PayPal", image: paymentImage("paypal") },
  { name: "Visa", image: paymentImage("visa") },
  { name: "Amazon", image: paymentImage("amazon") },
  { name: "Bitcoin", image: paymentImage("bitcoin") },
  { name: "Litecoin", image: paymentImage("litecoin") },
  { name: "Apple", image: paymentImage("apple") },
  { name: "Google Play", image: paymentImage("google-play") },
  { name: "Steam", image: paymentImage("steam") },
  { name: "Roblox", image: paymentImage("roblox") },
  { name: "DoorDash", image: paymentImage("doordash") },
  { name: "Nike", image: paymentImage("nike") },
  { name: "Walmart", image: paymentImage("walmart") },
];
