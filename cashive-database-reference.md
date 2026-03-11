# cashive.gg — Database Schema Reference

This document describes the complete PostgreSQL database schema for cashive.gg, a Get-Paid-To (GPT) rewards platform. Use this as the authoritative reference for all database-related implementation work.

## System Overview

cashive.gg is a rewards platform where users earn virtual currency called **Honey** (1,000 Honey = $1.00 USD, stored as integers) by completing tasks from third-party advertising networks (offerwalls). Users can withdraw Honey as real money via PayPal, cryptocurrency, or gift cards. The platform earns revenue by keeping a margin (typically 20%) between what advertisers pay and what users receive.

## Core Financial Rules

- **Honey is always an integer.** Never use floats for currency. 1,000 Honey = $1.00 USD. All conversions to display dollars happen in the frontend only.
- **The `transaction` table is the single source of truth.** The user's `balance_honey` field is a denormalized cache. If there's ever a discrepancy, the sum of all transactions for a user is authoritative.
- **Every balance mutation is atomic.** Balance updates, transaction inserts, and related record creation always happen inside a single database transaction. If any step fails, everything rolls back.
- **Postbacks are idempotent.** The `offer_completion.external_tx_id` unique constraint prevents double-crediting. If a duplicate postback arrives, return HTTP 200 without crediting again.

## Database: 28 Tables

---

### 1. `user`

The central entity of the entire system. Every other table references this.

**Purpose:** Stores user identity, authentication, financial state, engagement metrics, referral relationships, fraud signals, and preferences. It is intentionally wide (not split into sub-tables) because almost every API request needs the user's balance, VIP tier, fraud score, and preferences in the same call — separate tables would require expensive JOINs on every request.

**Key fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | TEXT PK | cuid, primary key everywhere |
| `email` | CITEXT UNIQUE | Case-insensitive, immutable after verification |
| `email_verified` | BOOLEAN | Must be true before most actions |
| `password_hash` | TEXT nullable | bcrypt hash. Null if user only uses social login |
| `username` | TEXT UNIQUE | Display name, changeable once per 30 days |
| `avatar_url` | TEXT nullable | URL to uploaded avatar. Null means use default |
| `country` | CHAR(2) | ISO 3166-1 alpha-2, detected from IP at signup |
| `language` | TEXT default 'en' | UI language preference |
| `google_id`, `facebook_id`, `steam_id`, `discord_id` | TEXT UNIQUE nullable | Social login provider IDs |
| `totp_secret` | TEXT nullable | Encrypted TOTP secret for 2FA |
| `totp_enabled` | BOOLEAN | Whether 2FA is active |
| `backup_codes` | TEXT nullable | Encrypted JSON array of one-time recovery codes |
| `balance_honey` | INT default 0 | **Denormalized cache.** Current balance in Honey. Updated atomically alongside Transaction inserts |
| `lifetime_earned` | INT default 0 | Total Honey ever credited (only increases, never decremented by withdrawals) |
| `xp` | INT default 0 | Experience points, 1:1 with Honey earned from offers |
| `level` | INT default 1 | Derived from XP thresholds (Level 2 = 500 XP, increasing ~1.5x per level) |
| `vip_tier` | ENUM (NONE, BRONZE, SILVER, GOLD, PLATINUM) | Recalculated monthly based on 30-day earnings |
| `current_streak` | INT default 0 | Consecutive UTC calendar days with at least one earning |
| `last_earn_date` | DATE nullable | UTC date of most recent earning. Used by streak logic |
| `longest_streak` | INT default 0 | Historical best streak for profile display |
| `referral_code` | TEXT UNIQUE | Auto-generated shareable code (e.g., "MARCUS2024") |
| `referred_by_id` | TEXT FK → user.id nullable | Self-referential. Who referred this user |
| `referral_tier` | INT 1-4 | Determines commission percentage (5%, 10%, 15%, 20%) |
| `fraud_score` | REAL 0.0-100.0 | Higher = more suspicious. See fraud_event table for history |
| `is_banned` | BOOLEAN | Banned users cannot log in or earn |
| `ban_reason` | TEXT nullable | Human-readable reason for the ban |
| `chat_muted` | BOOLEAN | Muted users cannot send chat messages |
| `chat_muted_until` | TIMESTAMPTZ nullable | Temporary mute expiry |
| `profile_public` | BOOLEAN default true | Whether other users can view this profile |
| `anonymous_in_chat` | BOOLEAN | Show as "Anonymous" in chat |
| `anonymous_on_leaderboard` | BOOLEAN | Show as "Anonymous" on race leaderboards |
| `balance_display` | ENUM (HONEY, USD, BOTH) | Frontend display preference |
| `chat_open_default` | BOOLEAN | Whether chat panel opens automatically on page load |
| `notification_prefs` | JSONB | Nested object of email/push/onsite toggle preferences |
| `last_login_ip` | TEXT nullable | Most recent login IP |
| `last_device_fingerprint` | TEXT nullable | Most recent device fingerprint hash |
| `created_at` | TIMESTAMPTZ | Account creation time |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger on any row change |
| `last_login_at` | TIMESTAMPTZ nullable | Most recent login time |

**Relationships:**
- Self-referential: `referred_by_id` → `user.id` (referral parent)
- Has many: `session`, `email_token`, `transaction`, `offer_completion`, `withdrawal`, `kyc_verification`, `race_entry`, `user_achievement`, `promo_redemption`, `referral_earning` (as both referrer and earner), `chat_message`, `support_ticket`, `notification`, `device_fingerprint`, `fraud_event`, `survey_profile` (one-to-one)

**Key indexes:**
- `idx_user_referred_by` — partial, only where referred_by_id IS NOT NULL
- `idx_user_fraud_score` — partial, only where fraud_score > 30 (for admin fraud queue)
- `idx_user_created_at` — for admin user list sorting

---

### 2. `session`

**Purpose:** Tracks active login sessions for the "Active Sessions" list in settings and enables session revocation (logout from specific devices).

| Field | Purpose |
|-------|---------|
| `user_id` FK | Which user this session belongs to |
| `token` UNIQUE | JWT or opaque session token, stored in HTTP-only cookie |
| `device` | Human-readable device description ("Chrome on Windows") |
| `ip` | IP address at session creation |
| `fingerprint` | Device fingerprint hash at session creation |
| `last_active` | Updated on each request to track idle sessions |
| `expires_at` | Hard expiry (e.g., 7 days from creation) |

**Used by:** Auth middleware validates sessions against this table (or Redis cache). Settings page shows active sessions. Session revocation deletes the row.

---

### 3. `email_token`

**Purpose:** Manages email verification and password reset flows. Each token is single-use with an expiry.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Which user this token is for |
| `token` UNIQUE | Random 64-char hex string |
| `type` ENUM | VERIFY_EMAIL or RESET_PASSWORD |
| `expires_at` | Token expiry (e.g., 24 hours for verification, 1 hour for password reset) |
| `used` | Set to true after first use — prevents replay |

**Used by:** Registration flow (send verification email), forgot-password flow (send reset link).

---

### 4. `transaction`

**Purpose:** The financial ledger — the single source of truth for all Honey movements. Every credit and debit to any user creates exactly one row here.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Whose balance this affects |
| `type` ENUM | OFFER_EARNING, SURVEY_EARNING, REFERRAL_COMMISSION, STREAK_BONUS, RACE_PRIZE, VIP_BONUS, PROMO_CODE, SIGNUP_BONUS, WITHDRAWAL, ADMIN_ADJUSTMENT, CHARGEBACK |
| `amount` INT | Positive = credit, negative = debit |
| `balance_after` INT | Snapshot of user's balance immediately after this transaction |
| `source_type` ENUM | What system generated this: OFFER, WITHDRAWAL, REFERRAL, RACE, PROMO, STREAK, VIP, SIGNUP, ADMIN |
| `source_id` TEXT nullable | Polymorphic FK — points to the record that caused this (offer_completion.id, withdrawal.id, race.id, etc.) |
| `description` TEXT | Human-readable: "Completed Rise of Kingdoms on Torox" |
| `metadata` JSONB nullable | Any extra audit data |

**Key principle:** This table is append-only. Rows are never updated or deleted. To "undo" a transaction (e.g., chargeback), you insert a new row with a negative amount.

**Key indexes:**
- `idx_tx_user_time` on `(user_id, created_at DESC)` — the user's transaction history page
- `idx_tx_source` on `(source_type, source_id)` — trace a transaction back to its origin

**Used by:** Profile page (transaction history), admin user detail, balance reconciliation, analytics.

---

### 5. `offerwall_provider`

**Purpose:** Stores the configuration for each offerwall partner. This is admin-managed setup data.

| Field | Purpose |
|-------|---------|
| `slug` UNIQUE | URL-safe identifier: "torox", "adgem", "bitlabs". Used in postback URL path |
| `name` | Display name: "Torox", "BitLabs" |
| `logo_url` | Real provider logo image URL for frontend tiles |
| `type` ENUM | OFFERWALL, SURVEY_WALL, or WATCH_WALL — determines which section it appears in |
| `postback_secret` | Shared HMAC secret for validating postback signatures |
| `postback_ips` TEXT[] | Array of whitelisted IP addresses. Postbacks from other IPs are rejected |
| `signature_method` ENUM | How to validate: HMAC_SHA256, HMAC_MD5, SECRET_PARAM, or NONE |
| `iframe_base_url` | The URL template with `{user_id}` placeholder for embedding the offerwall |
| `revenue_share_pct` INT | What percentage of the offerwall's payout we give to the user (e.g., 80 = user gets 80%, we keep 20%) |
| `bonus_badge_pct` INT | The "+80%" badge shown on the frontend tile (promotional, can differ from actual revenue share) |
| `is_active` | Toggle provider on/off without deleting |
| `sort_order` | Controls display order on the Earn page |

**Used by:** Postback processing (lookup by slug, validate IP and signature), Earn page (list active providers), admin panel (provider management).

---

### 6. `offer_completion`

**Purpose:** Records each individual offer a user completed via a postback. This is the proof that "user X did offer Y and we credited Z honey." It also stores the full revenue split for audit.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Who completed the offer |
| `provider_id` FK | Which offerwall provider |
| `external_tx_id` UNIQUE | The unique transaction ID from the offerwall's postback — **the most critical field in the entire database.** Used for deduplication on every incoming postback |
| `external_offer_id` | The offer ID from the offerwall (for reference/debugging) |
| `offer_name` | "Rise of Kingdoms - Reach Stronghold Level 10" |
| `offer_category` | "game", "app", "survey", "deposit", "signup", "quiz" |
| `payout_to_us_cents` INT | What the offerwall pays us, in USD cents |
| `reward_to_user_honey` INT | What we credit the user, in Honey |
| `platform_margin_honey` INT | Our cut, in Honey |
| `vip_bonus_honey` INT | Extra Honey from VIP tier bonus, tracked separately for accounting |
| `status` ENUM | CREDITED (normal), HELD (security hold, pending review), REVERSED (chargeback) |
| `hold_reason` | Why it was held: "New account security review" |
| `held_until` | When the hold auto-releases |
| `reversal_reason` | Why the offerwall chargebacked: "User did not meet level requirement" |
| `reversed_at` | When the chargeback happened |
| `user_ip`, `user_country` | User's IP and geo at time of completion |
| `raw_postback` JSONB | The entire raw postback payload, stored for audit |

**Three statuses explained:**
- **CREDITED:** Normal. User was paid and the Honey is in their balance.
- **HELD:** The system credited the user but put the earning on hold (e.g., new account, high fraud score). The Honey is not yet available for withdrawal. After the `held_until` timestamp passes (or an admin releases it), it becomes CREDITED.
- **REVERSED:** The offerwall sent a chargeback postback. The Honey was deducted from the user's balance. The reversal_reason explains why.

**Used by:** Postback endpoint (dedup check, insert on credit), profile page (offer history), admin user detail, referral commission calculation, achievement checks.

---

### 7. `postback_log`

**Purpose:** Audit trail of every postback that hits the server, regardless of outcome. Most postbacks result in a credit, but some are rejected (bad IP, bad signature, nonexistent user) or deduplicated. Without this table, you have no record of why a postback wasn't processed.

| Field | Purpose |
|-------|---------|
| `provider_id` FK | Which provider sent it |
| `raw_url` | Full request URL with parameters |
| `source_ip` | Where the request came from |
| `result` ENUM | CREDITED, DUPLICATE, REJECTED_IP, REJECTED_SIG, REJECTED_USER, ERROR |
| `error_detail` | Explanation if rejected or errored |
| `user_id` | Extracted from the postback (nullable — might not be parseable if rejected early) |
| `external_tx_id` | Extracted transaction ID (nullable) |
| `processing_ms` | How long processing took (for performance monitoring) |

**Used by:** Admin postback debugging, offerwall dispute resolution ("we sent it but you didn't credit" — you can show them exactly why).

**Retention:** Can be pruned after 60 days. High write volume, rarely read.

---

### 8. `featured_offer`

**Purpose:** Admin-curated editorial content for the homepage offer grid. These are NOT directly linked to the offerwall system — they're marketing content with poster images, estimated rewards, and links. An admin manually creates and orders them.

| Field | Purpose |
|-------|---------|
| `title` | "Rise of Kingdoms" |
| `requirement` | "Reach Stronghold Level 10" |
| `provider_name` | "Torox" (text, not FK — editorial) |
| `poster_image_url` | Large game banner for the homepage card |
| `app_icon_url` | Square icon fallback if no poster |
| `reward_honey` INT | Estimated reward (for display, not guaranteed) |
| `category` | "Game", "App", "Signup", "Survey" |
| `completions` INT | Social proof counter, incremented by matching postbacks |
| `rating` REAL | Optional star rating (0.0-5.0) |
| `is_active` | Toggle on/off |
| `sort_order` | Controls display order on homepage |

**Used by:** Homepage featured offers grid, admin featured offer management.

---

### 9. `withdrawal`

**Purpose:** Tracks the full lifecycle of a cashout request from submission through review to payout.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Who requested the withdrawal |
| `method` ENUM | PAYPAL, BTC, ETH, LTC, SOL, AMAZON, STEAM, ROBLOX, VISA |
| `amount_honey` INT | Honey deducted from balance |
| `amount_usd_cents` INT | Dollar equivalent in cents |
| `fee_usd_cents` INT | Processing fee in cents |
| `paypal_email` | PayPal destination (for PAYPAL method) |
| `crypto_address` | Wallet address (for crypto methods) |
| `crypto_currency` | BTC, ETH, LTC, SOL |
| `gift_card_type` | Amazon, Steam, etc. (for gift card methods) |
| `gift_card_email` | Delivery email for gift cards |
| `status` ENUM | PENDING → APPROVED → PROCESSING → COMPLETED (or REJECTED, FAILED) |
| `reviewed_by` FK → admin_user | Which admin approved/rejected |
| `review_note` | Admin's internal note |
| `rejection_reason` | Shown to user if rejected |
| `external_payment_id` | PayPal payout batch ID, crypto tx hash — proof of payment |
| `fraud_score_at_request` REAL | Snapshot of fraud score at submission time (useful for later review) |
| `is_first_withdrawal` BOOLEAN | Flag for extra scrutiny on first-ever cashout |
| `processed_at` | When the external payment was confirmed |

**Status lifecycle:**
1. PENDING — user submitted, awaiting review
2. APPROVED — passed review (auto or admin), queued for payout
3. PROCESSING — payment API call in progress
4. COMPLETED — external payment confirmed
5. REJECTED — admin denied (reason provided to user)
6. FAILED — payment API call failed (retryable)

**Key principle:** At submission, Honey is immediately deducted from the user's balance and a WITHDRAWAL Transaction is created. The withdrawal table then tracks the payout lifecycle independently. This prevents double-spending.

**Used by:** Cashout page (history), admin withdrawal queue, withdrawal processing worker.

---

### 10. `kyc_verification`

**Purpose:** Tracks identity verification attempts. Separate from the user table because users may have multiple attempts (rejected, resubmitted).

| Field | Purpose |
|-------|---------|
| `user_id` FK | Who submitted |
| `document_type` ENUM | PASSPORT, DRIVERS_LICENSE, NATIONAL_ID |
| `document_front_url` | Encrypted file path to ID front image |
| `document_back_url` nullable | Back of ID (not all docs have one) |
| `selfie_url` | Encrypted file path to selfie |
| `status` ENUM | PENDING, APPROVED, REJECTED |
| `reviewed_by` FK → admin_user | Which admin reviewed |
| `rejection_reason` | Why it was rejected |
| `submitted_at` | When the user uploaded documents |

**Used by:** Withdrawal validation (check if latest KYC is APPROVED), admin KYC review queue, user settings page.

---

### 11. `race`

**Purpose:** Defines a time-bounded earning competition (daily or monthly).

| Field | Purpose |
|-------|---------|
| `type` ENUM | DAILY or MONTHLY |
| `title` | "$50 Daily Race — Mar 11" |
| `prize_pool_usd_cents` INT | Total prize money |
| `prize_distribution` JSONB | Array of {rank, usd_cents} or {min_rank, max_rank, usd_cents} objects defining how prizes are split |
| `starts_at`, `ends_at` | Race time window |
| `status` ENUM | ACTIVE (running), FINALIZING (calculating results), COMPLETED (prizes distributed) |
| `finalized_at` | When results were calculated and prizes credited |

**Used by:** Races page, race finalization cron job, postback handler (to know which races are active).

---

### 12. `race_entry`

**Purpose:** One user's participation in one race. Tracks their accumulated points and final results.

| Field | Purpose |
|-------|---------|
| `race_id` FK | Which race |
| `user_id` FK | Which user |
| `points` INT | Honey earned during the race period (incremented on each postback) |
| `final_rank` INT nullable | Set during race finalization |
| `prize_honey` INT nullable | Honey prize credited at finalization |

**Unique constraint:** `(race_id, user_id)` — one entry per user per race.

**Key index:** `(race_id, points DESC)` — the leaderboard query.

**Note:** The live leaderboard during an active race is served from a Redis Sorted Set for performance. The race_entry table is the persistent backing store, synced periodically and used for finalization.

---

### 13. `achievement`

**Purpose:** Defines what badges exist and their unlock criteria. This is seed/config data managed by admins.

| Field | Purpose |
|-------|---------|
| `slug` UNIQUE | "first_task", "100_tasks", "earned_100", "streak_7" |
| `name` | "First Task", "Century", "$100 Earned", "Week Warrior" |
| `description` | Human-readable unlock condition |
| `icon` | Lucide icon name for frontend display |
| `color` | Hex color for the badge border |
| `criteria_type` | What to check: "tasks_completed", "lifetime_earned", "streak_days", "referral_count", "surveys_completed", "first_cashout" |
| `criteria_value` INT | Threshold number (1, 10, 100, 7, etc.) |

---

### 14. `user_achievement`

**Purpose:** Join table recording which user earned which achievement.

**Unique constraint:** `(user_id, achievement_id)` — each badge can only be earned once.

**Used by:** Profile page (badges display), achievement checker (idempotent — checks this constraint before inserting).

---

### 15. `promo_code`

**Purpose:** Defines redeemable promotional codes created by admins.

| Field | Purpose |
|-------|---------|
| `code` UNIQUE | The code users enter: "SPRING2026" |
| `reward_honey` INT | How much Honey to credit |
| `max_uses` INT nullable | null = unlimited redemptions |
| `used_count` INT | Incremented on each redemption |
| `requires_min_earnings` BOOLEAN | Anti-abuse: require user to have earned from offers first |
| `min_earnings_honey` INT | Minimum lifetime_earned required |
| `is_active` | Can be disabled without deleting |
| `expires_at` nullable | Optional expiry timestamp |
| `created_by` FK → admin_user | Audit trail |

---

### 16. `promo_redemption`

**Purpose:** Join table ensuring each user can only redeem each code once.

**Unique constraint:** `(user_id, promo_code_id)`

---

### 17. `referral_earning`

**Purpose:** Detailed record of every referral commission, linking the referrer, the earner, the triggering offer, and the resulting transaction.

| Field | Purpose |
|-------|---------|
| `referrer_id` FK → user | The person who receives the commission |
| `earner_id` FK → user | The referred user whose activity triggered this |
| `offer_completion_id` FK | The specific offer that triggered the commission |
| `earner_reward_honey` INT | What the earner got (for context) |
| `commission_pct` INT | Rate applied: 5, 10, 15, or 20 |
| `commission_honey` INT | Actual commission amount credited to the referrer |
| `transaction_id` TEXT | The Transaction record on the referrer's ledger |

**Why this exists separately from transactions:** The referrals page needs to show: who earned, which offer, what rate, what commission. A Transaction record alone doesn't carry this detail. This table bridges offer_completion (trigger) → transaction (payment) with full context.

---

### 18. `survey_profile`

**Purpose:** Demographic data for matching users with better-paying surveys. One-to-one with user.

| Field | Purpose |
|-------|---------|
| `age`, `gender`, `education`, etc. | Demographics passed to survey providers for matching |
| `interests` TEXT[] | Array of interest tags |
| `completion_pct` INT 0-100 | How complete the profile is (shown as progress bar on frontend) |

**Used by:** Surveys page (profile completion card), survey iframe URL parameters.

---

### 19. `chat_message`

**Purpose:** Stores community chat messages. Soft-deletable by moderators.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Who sent it |
| `room` TEXT | "general", "english", "spanish" — for future multi-room support |
| `content` VARCHAR(200) | Message text, capped at 200 characters |
| `is_system_message` BOOLEAN | Announcements like "WhaleGamer won the Daily Race!" |
| `is_deleted` BOOLEAN | Soft-delete by moderator (content preserved for audit) |
| `deleted_by` FK → admin_user | Which moderator deleted it |

**Key index:** `(room, created_at DESC)` — loading recent messages for a chat room.

**Note:** The last 100 messages per room are also cached in a Redis List for fast initial page loads. PostgreSQL is the persistent store; Redis is the hot cache.

---

### 20. `chat_report`

**Purpose:** Tracks user reports of chat messages for moderation review.

| Field | Purpose |
|-------|---------|
| `message_id` FK | Which message was reported |
| `reported_by` FK → user | Who reported it |
| `reason` ENUM | SPAM, ABUSE, HARASSMENT, OTHER |
| `detail` TEXT nullable | Optional description |
| `status` ENUM | PENDING, REVIEWED, DISMISSED |
| `reviewed_by` FK → admin_user | Which moderator handled it |

**Note:** One message can have multiple reports (multiple users flagging the same spam). The moderator reviews them together.

---

### 21. `support_ticket`

**Purpose:** Tracks support requests from users. Each ticket is a conversation between a user and support staff.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Who opened the ticket |
| `subject` | Short description |
| `category` ENUM | WITHDRAWAL, OFFER_NOT_CREDITED, ACCOUNT, KYC, OTHER |
| `status` ENUM | OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED |
| `priority` ENUM | LOW, NORMAL, HIGH, URGENT |
| `assigned_to` FK → admin_user | Which support agent is handling it |
| `related_offer_id` nullable | Link to a disputed offer_completion |
| `related_withdrawal_id` nullable | Link to a disputed withdrawal |

---

### 22. `support_message`

**Purpose:** Individual messages within a support ticket conversation.

| Field | Purpose |
|-------|---------|
| `ticket_id` FK | Which ticket this message belongs to |
| `sender_id` TEXT | User ID or AdminUser ID |
| `is_admin` BOOLEAN | Distinguishes user messages from admin replies |
| `content` TEXT | Message body |
| `attachment_url` nullable | Optional file attachment (screenshot, document) |

---

### 23. `notification`

**Purpose:** In-app notifications for the notification bell in the top nav.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Recipient |
| `type` TEXT | "offer_credited", "withdrawal_complete", "race_ended", "streak_reminder", "achievement_earned", "referral_signup", "vip_change" |
| `title` | Short heading |
| `body` | Description text |
| `link` nullable | Where to navigate when clicked (e.g., "/profile", "/races") |
| `icon` nullable | Lucide icon name for display |
| `is_read` BOOLEAN | Tracks read/unread state |

**Key index:** `(user_id, is_read, created_at DESC)` — loading unread notifications for a user.

**Retention:** Prune notifications older than 90 days.

---

### 24. `device_fingerprint`

**Purpose:** Records every unique device/browser combination a user has been seen on. The primary anti-fraud tool for detecting multi-accounting.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Which user was seen on this device |
| `fingerprint_hash` TEXT | Hash generated by client-side fingerprinting library |
| `user_agent`, `screen_resolution`, `timezone` | Device characteristics |
| `ip` | IP when this fingerprint was recorded |
| `ip_type` ENUM | RESIDENTIAL, VPN, PROXY, DATACENTER, TOR — enriched from IP intelligence service |
| `ip_country` | Geo-location of the IP |
| `ip_fraud_score` REAL | Fraud score from IP intelligence API (0-100) |
| `is_signup_device` BOOLEAN | Whether this was the device used during account creation |
| `first_seen_at`, `last_seen_at` | When this device was first and last used |

**Critical query:** "Show all users with fingerprint_hash = X" — this detects multi-accounting. If two user accounts share the same fingerprint hash, they're likely the same person.

**Key indexes:** `fingerprint_hash` (for multi-account detection), `ip` (for IP correlation), `user_id` (for user's device history).

---

### 25. `fraud_event`

**Purpose:** History of every signal that changed a user's fraud score. Without this, the fraud score is an opaque number. With it, you have a full timeline explaining why a user was flagged or banned.

| Field | Purpose |
|-------|---------|
| `user_id` FK | Which user |
| `event_type` ENUM | VPN_DETECTED, MULTI_ACCOUNT_IP, MULTI_ACCOUNT_DEVICE, RAPID_COMPLETIONS, CHARGEBACK, KYC_REJECTED, GEO_MISMATCH, SCORE_DECAY |
| `score_impact` REAL | How much this event changed the score (positive = increase, negative = decay) |
| `score_after` REAL | The fraud score after this event was applied |
| `detail` TEXT | Human-readable explanation |
| `evidence` JSONB | Supporting data (matching fingerprints, IP details, etc.) |

**Used by:** Admin user detail page (fraud timeline), ban appeal review, fraud score calculation.

---

### 26. `admin_user`

**Purpose:** Separate authentication entity from regular users. Admins don't have player accounts — they can't earn Honey or withdraw.

| Field | Purpose |
|-------|---------|
| `email` UNIQUE | Admin login email |
| `password_hash` | bcrypt hash |
| `name` | Display name |
| `role` ENUM | SUPER_ADMIN (everything), ADMIN (user/withdrawal/offer management), MODERATOR (chat moderation), SUPPORT_AGENT (ticket management) |
| `totp_secret`, `totp_enabled` | Optional 2FA for admin accounts |
| `is_active` | Can disable admin accounts without deleting |

---

### 27. `audit_log`

**Purpose:** Permanent, immutable record of every admin action that modifies data. Non-negotiable for financial accountability.

| Field | Purpose |
|-------|---------|
| `admin_id` FK → admin_user | Who performed the action |
| `action` TEXT | "ban_user", "approve_withdrawal", "delete_message", "adjust_balance", "create_promo", etc. |
| `target_type` TEXT nullable | What kind of entity was affected: "user", "withdrawal", "chat_message", etc. |
| `target_id` TEXT nullable | The ID of the affected entity |
| `before_state` JSONB nullable | Snapshot of the entity before the change |
| `after_state` JSONB nullable | Snapshot after the change |
| `ip` TEXT | Admin's IP address |

**Used by:** Admin audit log viewer, dispute resolution, internal accountability.

---

### 28. `platform_setting`

**Purpose:** Runtime-configurable key-value store for all system thresholds and parameters. Changing these does not require a code deployment.

| Field | Purpose |
|-------|---------|
| `key` TEXT PK | Setting identifier: "min_withdrawal_paypal_cents", "vip_gold_threshold", "streak_rewards_json" |
| `value` TEXT | Always stored as text, parsed by the application based on `type` |
| `type` ENUM | STRING, INT, FLOAT, BOOLEAN, JSON — tells the app how to parse |
| `category` ENUM | GENERAL, WITHDRAWALS, RACES, STREAKS, VIP, REFERRALS — for grouping in admin UI |
| `description` TEXT | Human-readable explanation of what the setting controls |
| `updated_by` FK → admin_user | Who last changed it |

**Current settings include:** withdrawal minimums and fees per method, minimum earning before first withdrawal, daily/monthly withdrawal limits, race prize pools, streak reward amounts (as JSON array), VIP tier earning thresholds, VIP bonus percentages, referral tier commission rates, referral active threshold, signup bonus amount, chat minimum level, chat rate limit, fraud auto-ban threshold, fraud review threshold.

**Used by:** Every system that references a configurable value. The application should read these on startup and cache them, refreshing periodically or on admin change.

---

## Enum Reference

| Enum Name | Values | Used By |
|-----------|--------|---------|
| `vip_tier` | NONE, BRONZE, SILVER, GOLD, PLATINUM | user.vip_tier |
| `balance_display` | HONEY, USD, BOTH | user.balance_display |
| `email_token_type` | VERIFY_EMAIL, RESET_PASSWORD | email_token.type |
| `transaction_type` | OFFER_EARNING, SURVEY_EARNING, REFERRAL_COMMISSION, STREAK_BONUS, RACE_PRIZE, VIP_BONUS, PROMO_CODE, SIGNUP_BONUS, WITHDRAWAL, ADMIN_ADJUSTMENT, CHARGEBACK | transaction.type |
| `transaction_source` | OFFER, WITHDRAWAL, REFERRAL, RACE, PROMO, STREAK, VIP, SIGNUP, ADMIN | transaction.source_type |
| `provider_type` | OFFERWALL, SURVEY_WALL, WATCH_WALL | offerwall_provider.type |
| `signature_method` | HMAC_SHA256, HMAC_MD5, SECRET_PARAM, NONE | offerwall_provider.signature_method |
| `offer_status` | CREDITED, HELD, REVERSED | offer_completion.status |
| `postback_result` | CREDITED, DUPLICATE, REJECTED_IP, REJECTED_SIG, REJECTED_USER, ERROR | postback_log.result |
| `withdrawal_method` | PAYPAL, BTC, ETH, LTC, SOL, AMAZON, STEAM, ROBLOX, VISA | withdrawal.method |
| `withdrawal_status` | PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED | withdrawal.status |
| `kyc_status` | PENDING, APPROVED, REJECTED | kyc_verification.status |
| `kyc_doc_type` | PASSPORT, DRIVERS_LICENSE, NATIONAL_ID | kyc_verification.document_type |
| `race_type` | DAILY, MONTHLY | race.type |
| `race_status` | ACTIVE, FINALIZING, COMPLETED | race.status |
| `ticket_status` | OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED | support_ticket.status |
| `ticket_priority` | LOW, NORMAL, HIGH, URGENT | support_ticket.priority |
| `ticket_category` | WITHDRAWAL, OFFER_NOT_CREDITED, ACCOUNT, KYC, OTHER | support_ticket.category |
| `report_status` | PENDING, REVIEWED, DISMISSED | chat_report.status |
| `report_reason` | SPAM, ABUSE, HARASSMENT, OTHER | chat_report.reason |
| `ip_type` | RESIDENTIAL, VPN, PROXY, DATACENTER, TOR | device_fingerprint.ip_type |
| `fraud_event_type` | VPN_DETECTED, MULTI_ACCOUNT_IP, MULTI_ACCOUNT_DEVICE, RAPID_COMPLETIONS, CHARGEBACK, KYC_REJECTED, GEO_MISMATCH, SCORE_DECAY | fraud_event.event_type |
| `admin_role` | SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT_AGENT | admin_user.role |
| `setting_type` | STRING, INT, FLOAT, BOOLEAN, JSON | platform_setting.type |
| `setting_category` | GENERAL, WITHDRAWALS, RACES, STREAKS, VIP, REFERRALS | platform_setting.category |

---

## Key Relationship Patterns

**Polymorphic source reference (Transaction table):** The `source_type` + `source_id` fields on Transaction create a polymorphic FK. The source_type tells you which table to look in, and source_id is the row ID. For example: source_type=OFFER + source_id=oc_01 means this transaction was caused by offer_completion with id oc_01.

**Self-referential (User table):** `referred_by_id` points back to user.id. This creates a tree structure: User A refers User B, User B refers User C. Querying "all users referred by Marcus" is: `SELECT * FROM user WHERE referred_by_id = 'usr_01'`.

**One-to-one (User ↔ SurveyProfile):** user_id on survey_profile has a UNIQUE constraint, enforcing one profile per user. Not all users have a profile (it's created when they first visit the survey profile page).

**Join tables with uniqueness (UserAchievement, PromoRedemption, RaceEntry):** These all have composite UNIQUE constraints to prevent duplicates: a user can earn each achievement once, redeem each promo once, and have one entry per race.

---

## Index Summary

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_user_referred_by` | user | referred_by_id (partial) | Referral tree queries |
| `idx_user_fraud_score` | user | fraud_score (partial > 30) | Admin fraud queue |
| `idx_user_created_at` | user | created_at | Admin user list |
| `idx_session_user` | session | user_id | List user's sessions |
| `idx_session_expires` | session | expires_at | Cleanup expired sessions |
| `idx_tx_user_time` | transaction | user_id, created_at DESC | User's transaction history |
| `idx_tx_type` | transaction | type | Filter by transaction type |
| `idx_tx_created` | transaction | created_at DESC | Global activity feed |
| `idx_tx_source` | transaction | source_type, source_id (partial) | Trace transaction origin |
| `idx_oc_user` | offer_completion | user_id | User's offer history |
| `idx_oc_provider` | offer_completion | provider_id | Provider analytics |
| `idx_oc_created` | offer_completion | created_at DESC | Time-range queries |
| `idx_oc_status` | offer_completion | status (partial != CREDITED) | Find held/reversed offers |
| `idx_pbl_provider_time` | postback_log | provider_id, created_at DESC | Provider postback history |
| `idx_pbl_result` | postback_log | result (partial != CREDITED) | Find failed postbacks |
| `idx_fo_active` | featured_offer | is_active, sort_order (partial) | Homepage query |
| `idx_wd_user` | withdrawal | user_id | User's withdrawal history |
| `idx_wd_status` | withdrawal | status, created_at (partial) | Admin pending queue |
| `idx_kyc_user` | kyc_verification | user_id | User's KYC history |
| `idx_kyc_status` | kyc_verification | status (partial PENDING) | Admin KYC queue |
| `idx_re_leaderboard` | race_entry | race_id, points DESC | Leaderboard ranking |
| `idx_chat_room_time` | chat_message | room, created_at DESC | Load recent messages |
| `idx_cr_pending` | chat_report | status (partial PENDING) | Moderator report queue |
| `idx_st_status` | support_ticket | status, priority, created_at (partial) | Support ticket queue |
| `idx_notif_user_unread` | notification | user_id, is_read, created_at DESC | Unread notifications |
| `idx_df_hash` | device_fingerprint | fingerprint_hash | Multi-account detection |
| `idx_df_ip` | device_fingerprint | ip | IP correlation |
| `idx_fe_user` | fraud_event | user_id, created_at DESC | Fraud timeline |
| `idx_al_admin` | audit_log | admin_id, created_at DESC | Admin's action history |
| `idx_al_target` | audit_log | target_type, target_id (partial) | Find actions on an entity |

Many indexes are **partial indexes** (with WHERE clauses) to keep them small and fast by only indexing the rows that matter for the query pattern they serve.
