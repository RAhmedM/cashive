/**
 * Postback adapter registry.
 *
 * Maps provider slugs to their adapter implementations.
 * To add a new offerwall: create an adapter file and register it here.
 */
import type { PostbackAdapter } from "../types";
import { toroxAdapter } from "./torox";
import { adgemAdapter } from "./adgem";
import { lootablyAdapter } from "./lootably";
import { bitlabsAdapter } from "./bitlabs";
import { cpxResearchAdapter } from "./cpx-research";

const adapters: PostbackAdapter[] = [
  toroxAdapter,
  adgemAdapter,
  lootablyAdapter,
  bitlabsAdapter,
  cpxResearchAdapter,
];

/** Map of slug → adapter for O(1) lookup. */
const adapterMap = new Map<string, PostbackAdapter>(
  adapters.map((a) => [a.slug, a])
);

/**
 * Get the postback adapter for a given provider slug.
 * Returns undefined if no adapter exists for that slug.
 */
export function getAdapter(slug: string): PostbackAdapter | undefined {
  return adapterMap.get(slug);
}

/**
 * List all registered adapter slugs.
 */
export function getRegisteredSlugs(): string[] {
  return Array.from(adapterMap.keys());
}
