/**
 * Postback system types.
 *
 * Each offerwall sends postbacks with different parameter names and formats.
 * The adapter layer normalizes them into a standard PostbackData shape
 * for the core processor to handle uniformly.
 */

/** Normalized postback data — every adapter must produce this shape. */
export interface PostbackData {
  /** Our internal user ID (passed to the offerwall as sub_id / user_id) */
  userId: string;
  /** What the offerwall pays us, in USD cents (e.g. 150 = $1.50) */
  payoutCentsUsd: number;
  /** Unique transaction ID from the offerwall (dedup key) */
  transactionId: string;
  /** Human-readable offer name */
  offerName: string;
  /** External offer ID from the offerwall */
  offerId: string;
  /** User's IP as reported by the offerwall */
  userIp?: string;
  /** Signature or hash for verification (provider-specific) */
  signature?: string;
  /** Whether this is a reversal/chargeback */
  isReversal: boolean;
  /** The raw request parameters for audit logging */
  rawPayload: Record<string, string>;
}

/** Result of core postback processing (before side effects). */
export interface PostbackResult {
  success: boolean;
  /** Was this a duplicate (already processed)? Still returns success. */
  duplicate: boolean;
  /** Were earnings held for review (new account / high fraud score)? */
  held?: boolean;
  /** Honey credited to the user (0 if duplicate, reversal, or held) */
  rewardHoney: number;
  /** Our margin in Honey */
  marginHoney: number;
  /** The offer completion record ID */
  offerCompletionId?: string;
  /** The user ID (for side effects) */
  userId: string;
  /** Provider slug */
  providerSlug: string;
  /** Error message if !success */
  error?: string;
}

/** Side effects to run after core processing succeeds. */
export interface PostbackSideEffectPayload {
  userId: string;
  rewardHoney: number;
  offerName: string;
  providerName: string;
  providerSlug: string;
  offerCompletionId: string;
  isReversal: boolean;
}

/**
 * Base interface for provider-specific postback adapters.
 *
 * Each adapter knows how to:
 * 1. Parse the incoming request (GET or POST) into PostbackData
 * 2. Validate the signature/secret
 */
export interface PostbackAdapter {
  /** Provider slug (must match OfferwallProvider.slug) */
  slug: string;

  /**
   * Parse the incoming request into normalized PostbackData.
   * Throws if required parameters are missing.
   */
  parse(params: URLSearchParams, body?: Record<string, string>): PostbackData;

  /**
   * Validate the postback signature against the provider's shared secret.
   * Returns true if valid or if the provider doesn't use signatures.
   */
  validateSignature(data: PostbackData, secret: string): boolean;
}
