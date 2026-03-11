/**
 * Payment processing service layer.
 *
 * Provides a unified interface for processing payouts across different methods.
 * Each provider implementation handles the specifics of that payment method.
 *
 * In production:
 * - PayPal uses the PayPal Payouts API
 * - Crypto uses Coinbase Commerce or direct blockchain APIs
 * - Gift cards use provider-specific APIs (e.g., Tango Card)
 *
 * For Phase 3, all providers are stub implementations that simulate processing
 * with deterministic behavior. They log what they would do and return mock
 * external transaction IDs. Replace with real API calls when integrating.
 */

// ---- Types ----

export interface PayoutRequest {
  /** Our internal withdrawal ID */
  withdrawalId: string;
  /** Idempotency key for safe retries */
  idempotencyKey: string;
  /** Payout amount in USD */
  amountUsd: number;
  /** Processing fee in USD */
  feeUsd: number;
  /** Net amount to send (amountUsd - feeUsd) */
  netAmountUsd: number;
}

export interface PayPalPayoutRequest extends PayoutRequest {
  recipientEmail: string;
}

export interface CryptoPayoutRequest extends PayoutRequest {
  recipientAddress: string;
  currency: "BTC" | "ETH" | "LTC" | "SOL";
}

export interface GiftCardPayoutRequest extends PayoutRequest {
  recipientEmail: string;
  cardType: "Amazon" | "Steam" | "Roblox";
}

export interface PayoutResult {
  success: boolean;
  /** External transaction ID from the payment provider */
  externalTxId?: string;
  /** Error message if !success */
  error?: string;
  /** Whether the payout is pending async confirmation (webhook) */
  pendingWebhook: boolean;
}

// ---- PayPal Provider ----

export async function processPayPalPayout(
  request: PayPalPayoutRequest
): Promise<PayoutResult> {
  const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE } = process.env;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    console.warn(
      `[PayPal] Credentials not configured — simulating payout of $${request.netAmountUsd} to ${request.recipientEmail}`
    );
    return simulatePayout("PAYPAL", request);
  }

  // Production implementation would:
  // 1. Get OAuth2 access token from PayPal
  // 2. Call POST /v1/payments/payouts with:
  //    - sender_batch_header.sender_batch_id = idempotencyKey
  //    - items[0].recipient_type = "EMAIL"
  //    - items[0].amount = { value: netAmountUsd, currency: "USD" }
  //    - items[0].receiver = recipientEmail
  // 3. Return the payout_batch_id as externalTxId
  // 4. PayPal will call our webhook when the payout completes

  const baseUrl =
    PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  try {
    // Get access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error(`[PayPal] Token request failed: ${tokenRes.status} ${body}`);
      return { success: false, error: "PayPal authentication failed", pendingWebhook: false };
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // Create payout
    const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: request.idempotencyKey,
          email_subject: "You have a payment from Cashive",
          email_message: "Your Cashive withdrawal has been processed.",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: request.netAmountUsd.toFixed(2),
              currency: "USD",
            },
            receiver: request.recipientEmail,
            note: `Cashive withdrawal ${request.withdrawalId}`,
            sender_item_id: request.withdrawalId,
          },
        ],
      }),
    });

    if (!payoutRes.ok) {
      const body = await payoutRes.text();
      console.error(`[PayPal] Payout request failed: ${payoutRes.status} ${body}`);
      return { success: false, error: `PayPal payout failed: ${payoutRes.status}`, pendingWebhook: false };
    }

    const payoutData = (await payoutRes.json()) as {
      batch_header: { payout_batch_id: string };
    };

    console.info(
      `[PayPal] Payout created: batch ${payoutData.batch_header.payout_batch_id} ` +
        `$${request.netAmountUsd} → ${request.recipientEmail}`
    );

    return {
      success: true,
      externalTxId: payoutData.batch_header.payout_batch_id,
      pendingWebhook: true, // Final confirmation comes via webhook
    };
  } catch (err) {
    console.error("[PayPal] Payout error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "PayPal payout failed",
      pendingWebhook: false,
    };
  }
}

// ---- Crypto Provider ----

export async function processCryptoPayout(
  request: CryptoPayoutRequest
): Promise<PayoutResult> {
  const { COINBASE_COMMERCE_API_KEY } = process.env;

  if (!COINBASE_COMMERCE_API_KEY) {
    console.warn(
      `[Crypto] Coinbase not configured — simulating payout of $${request.netAmountUsd} in ${request.currency} to ${request.recipientAddress}`
    );
    return simulatePayout("CRYPTO", request);
  }

  // Production implementation would use Coinbase Commerce API or
  // direct blockchain APIs. For now, we use Coinbase Commerce charges
  // which handle the crypto conversion and transfer.
  //
  // Alternative approach: Use a custodial wallet service that provides
  // payout APIs (e.g., BitPay, Coinbase Send).

  try {
    // Coinbase Commerce: Create a charge / send funds
    // This is a simplified stub — real implementation depends on
    // whether you use Coinbase Commerce, Coinbase Pro, or direct wallets.
    const res = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "X-CC-Api-Key": COINBASE_COMMERCE_API_KEY,
        "X-CC-Version": "2018-03-22",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Cashive Withdrawal ${request.withdrawalId}`,
        description: `Payout of $${request.netAmountUsd} in ${request.currency}`,
        pricing_type: "fixed_price",
        local_price: {
          amount: request.netAmountUsd.toFixed(2),
          currency: "USD",
        },
        metadata: {
          withdrawal_id: request.withdrawalId,
          idempotency_key: request.idempotencyKey,
          recipient_address: request.recipientAddress,
          currency: request.currency,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Crypto] Coinbase charge failed: ${res.status} ${body}`);
      return {
        success: false,
        error: `Coinbase charge failed: ${res.status}`,
        pendingWebhook: false,
      };
    }

    const data = (await res.json()) as {
      data: { id: string; code: string };
    };

    console.info(
      `[Crypto] Coinbase charge created: ${data.data.code} ` +
        `$${request.netAmountUsd} ${request.currency} → ${request.recipientAddress}`
    );

    return {
      success: true,
      externalTxId: data.data.code,
      pendingWebhook: true,
    };
  } catch (err) {
    console.error("[Crypto] Payout error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Crypto payout failed",
      pendingWebhook: false,
    };
  }
}

// ---- Gift Card Provider ----

export async function processGiftCardPayout(
  request: GiftCardPayoutRequest
): Promise<PayoutResult> {
  // Gift card fulfillment typically uses a service like Tango Card (RaaS API),
  // Tremendous, or a custom integration with each provider.
  //
  // For Phase 3, this is a stub. In production:
  // 1. Call the gift card API to purchase/generate a card
  // 2. Send the card code to the user's email
  // 3. Return the order ID as externalTxId

  console.warn(
    `[GiftCard] Provider not configured — simulating ${request.cardType} gift card ` +
      `$${request.netAmountUsd} → ${request.recipientEmail}`
  );

  return simulatePayout("GIFT_CARD", request);
}

// ---- Router ----

/**
 * Route a payout request to the appropriate provider based on withdrawal method.
 */
export async function processPayout(
  method: string,
  withdrawal: {
    id: string;
    idempotencyKey: string;
    amountUsd: number;
    fee: number;
    paypalEmail?: string | null;
    cryptoAddress?: string | null;
    cryptoCurrency?: string | null;
    giftCardType?: string | null;
    giftCardEmail?: string | null;
  }
): Promise<PayoutResult> {
  const netAmountUsd =
    Math.round((withdrawal.amountUsd - withdrawal.fee) * 100) / 100;

  const base: PayoutRequest = {
    withdrawalId: withdrawal.id,
    idempotencyKey: withdrawal.idempotencyKey,
    amountUsd: withdrawal.amountUsd,
    feeUsd: withdrawal.fee,
    netAmountUsd,
  };

  switch (method) {
    case "PAYPAL":
    case "VISA":
      if (!withdrawal.paypalEmail) {
        return { success: false, error: "Missing PayPal email", pendingWebhook: false };
      }
      return processPayPalPayout({
        ...base,
        recipientEmail: withdrawal.paypalEmail,
      });

    case "BITCOIN":
    case "ETHEREUM":
    case "LITECOIN":
    case "SOLANA":
      if (!withdrawal.cryptoAddress || !withdrawal.cryptoCurrency) {
        return {
          success: false,
          error: "Missing crypto address or currency",
          pendingWebhook: false,
        };
      }
      return processCryptoPayout({
        ...base,
        recipientAddress: withdrawal.cryptoAddress,
        currency: withdrawal.cryptoCurrency as "BTC" | "ETH" | "LTC" | "SOL",
      });

    case "AMAZON_GIFT":
    case "STEAM_GIFT":
    case "ROBLOX":
      if (!withdrawal.giftCardEmail || !withdrawal.giftCardType) {
        return {
          success: false,
          error: "Missing gift card email or type",
          pendingWebhook: false,
        };
      }
      return processGiftCardPayout({
        ...base,
        recipientEmail: withdrawal.giftCardEmail,
        cardType: withdrawal.giftCardType as "Amazon" | "Steam" | "Roblox",
      });

    default:
      return {
        success: false,
        error: `Unsupported withdrawal method: ${method}`,
        pendingWebhook: false,
      };
  }
}

// ---- Simulation (for dev/staging) ----

function simulatePayout(
  _type: string,
  request: PayoutRequest
): PayoutResult {
  // Generate a mock external transaction ID
  const mockTxId = `sim_${Date.now()}_${request.withdrawalId.slice(-8)}`;

  return {
    success: true,
    externalTxId: mockTxId,
    pendingWebhook: false, // Simulated payouts complete immediately
  };
}
