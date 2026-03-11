# cashive.gg — Project Context & Implementation Guide

**Version:** 1.0
**Date:** March 2026

This document is the single reference for building cashive.gg. It covers what the site does, what the backend must support, the implementation order, the admin dashboard specification, and every visual and behavioral rule established across the project.

---

## SECTION 1: What cashive.gg Is

cashive.gg is a Get-Paid-To (GPT) rewards platform. Users earn a virtual currency called Honey (1,000 Honey = $1.00 USD) by completing tasks sourced from third-party advertising networks (offerwalls): installing apps, reaching game milestones, completing surveys, watching videos. Users withdraw Honey as real money via PayPal, cryptocurrency, or gift cards. The platform keeps a ~20% margin between what advertisers pay and what users receive.

### Revenue Flow

```
Advertiser pays Offerwall → Offerwall pays Cashive (postback) → Cashive pays User (minus margin)
```

Example: An advertiser pays Torox $10 when a user reaches Level 10 in their game. Torox sends a postback to Cashive saying "pay this user $10." Cashive gives the user $8 (80% revenue share = 8,000 Honey) and keeps $2 as profit.

### The Pages

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Logged-in dashboard: featured offers grid, active tasks, quick links |
| Earn | `/earn` | Browse offerwalls (tiles for Torox, AdGem, etc.), survey walls, watch walls |
| Tasks | `/tasks` | Searchable, filterable feed of individual offers across all walls |
| Surveys | `/surveys` | Survey-specific page with provider tiles and survey profile |
| Races | `/races` | Daily and monthly leaderboard competitions |
| Rewards | `/rewards` | VIP tiers, daily streak, promo codes |
| Cashout | `/cashout` | Withdrawal options, balance, transaction history |
| Referrals | `/referrals` | Referral link, stats, commission tiers, referred users |
| Profile | `/profile` | User profile, earnings chart, achievements, activity history |
| Settings | `/settings` | Account, security, notifications, privacy, preferences |
| Admin | `/admin/*` | Separate admin dashboard (see Section 4) |

---

## SECTION 2: What the Backend Must Do

### 2.1 Authentication

- Email/password registration with email verification (magic link token)
- Password reset flow (token-based)
- Social login: Google OAuth, Discord OAuth (Facebook and Steam added later)
- Session management: JWT in HTTP-only Secure SameSite=Strict cookies, validated against Redis
- Two-factor authentication (TOTP — Google Authenticator compatible)
- Active session tracking: users can view and revoke sessions from settings

### 2.2 User Management

- Profile CRUD: username (changeable once per 30 days), avatar upload, language, country
- Survey profile: demographic questionnaire for better survey matching
- Privacy settings: profile visibility, chat anonymity, leaderboard anonymity
- Display preferences: balance display mode (Honey/USD/Both), chat default state
- Notification preferences: granular email/push/onsite toggles per notification type
- Account actions: disable account, delete account (with confirmation), data export

### 2.3 Offerwall Integration (The Revenue Engine)

- Offerwall provider configuration: admin manages providers (slug, name, logo, postback secret, allowed IPs, signature method, iframe URL, revenue share %, bonus badge %, active toggle)
- Offerwall embedding: each provider's iframe is embedded on the Earn/Tasks/Surveys pages with the user's ID passed as a URL parameter
- Postback processing: when a user completes an offer, the offerwall sends an HTTP request to `/api/postback/[provider]`. The system must: validate source IP against whitelist, validate signature/HMAC, deduplicate by external transaction ID, normalize provider-specific parameters via adapters, calculate user reward (payout × revenue share + VIP bonus), atomically credit user balance + insert Transaction + insert OfferCompletion, update race points, update streak, check achievements, calculate referral commission, emit real-time events, return HTTP 200
- Chargeback handling: reversals deduct from user balance, create CHARGEBACK transaction, update OfferCompletion to REVERSED, increase fraud score
- Offer hold system: new accounts or flagged users have earnings held (HELD status) for a review period before releasing

### 2.4 Withdrawals

- Withdrawal request: validate balance, minimum, KYC status, no pending withdrawal, earning threshold met
- Atomic deduction: deduct Honey and create WITHDRAWAL Transaction at submission time
- Review pipeline: auto-approve clean small withdrawals, flag first-time/large/high-fraud-score for admin review
- Payout execution: integrate PayPal Payouts API, crypto payout service (Coinbase Commerce or similar), gift card API (Tango Card)
- Status tracking: PENDING → APPROVED → PROCESSING → COMPLETED (or REJECTED/FAILED)
- KYC verification: document upload, admin review, approval/rejection with reason

### 2.5 Engagement Systems

- **Daily streak:** track consecutive earning days. Reset at midnight UTC if no earning yesterday. Bonus Honey per day in a 7-day cycle (50, 75, 100, 150, 200, 300, 500)
- **VIP tiers:** recalculate monthly based on 30-day offer earnings. NONE/BRONZE/SILVER/GOLD/PLATINUM. Higher tiers get bonus percentage on all offers (2%/5%/8%/12%) plus weekly/monthly bonuses
- **Races:** daily ($50 pool) and monthly ($2,500 pool) leaderboards. Points = Honey earned from offers. Live leaderboard via Redis Sorted Sets. Finalization cron distributes prizes
- **Referrals:** tiered commission (5%/10%/15%/20%) based on active referral count. Commission credited in real-time on each postback. Referral stats and earnings tracking
- **Achievements:** badge system with criteria-based unlocking (tasks completed, lifetime earned, streak days, referral count, first cashout, surveys completed)
- **Promo codes:** admin-created, with optional max uses, expiry, and minimum earning requirement

### 2.6 Real-Time Features

- **Community chat:** public chatroom ("Hive Chat") on the right side of every page. Messages stored in PostgreSQL, last 100 cached in Redis. Rate limited (1 msg / 3 seconds). Soft-delete moderation. Report system
- **Live activity ticker:** horizontal scrolling bar below the top nav on every page showing recent earnings and withdrawals
- **Real-time notifications:** balance updates, offer credits, withdrawal status changes, achievement unlocks — delivered via WebSocket
- **Live leaderboard:** race positions update in real-time during active races

### 2.7 Anti-Fraud

- Fraud scoring: 0-100 per user, built from signals (VPN detection, device fingerprint matching, IP correlation, rapid completions, chargebacks, KYC rejections)
- Device fingerprinting: record and compare browser fingerprints to detect multi-accounting
- IP intelligence: classify IPs as residential/VPN/proxy/datacenter/Tor
- Thresholds: 0-30 normal, 30-60 flag withdrawals, 60-80 hold earnings, 80+ auto-ban
- All fraud signals recorded in fraud_event table with full evidence

### 2.8 Support

- Support ticket system: user creates ticket with category and description, admin assigns and responds
- FAQ in the floating support widget
- Live chat support (separate from community chat — via the floating support button)

### 2.9 Admin Dashboard (Full Specification in Section 4)

- Separate auth system from users
- Role-based access control: SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT_AGENT
- Full CRUD for all platform entities
- Analytics and reporting
- Audit trail on every action

---

## SECTION 3: Implementation Steps

Start simple. Get things working end-to-end before adding complexity. Each phase builds on the previous one and produces something testable.

### Phase 1: Project Skeleton & Auth

**Goal:** A user can register, verify email, log in, see their profile, and log out.

**Steps:**
1. Initialize Next.js 14+ project with TypeScript, App Router, Tailwind CSS
2. Run `prisma db pull` to generate Prisma schema from the existing PostgreSQL database
3. Generate the Prisma client
4. Set up the `.env` file with DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
5. Set up Redis connection utility (ioredis)
6. Implement Auth.js (NextAuth v5) with:
   - Credentials provider (email + password)
   - Google OAuth provider
   - Session strategy using JWT in HTTP-only cookies
   - Session storage/validation against Redis
7. Build the registration API (`/api/auth/register`): validate input with Zod, hash password with bcrypt, insert user, generate email verification token, return success
8. Build email verification endpoint: validate token, set email_verified = true
9. Build a protected API route `/api/user/me` that returns the current user's profile
10. Connect the frontend: login page, register page, profile page calling the API
11. Set up Nginx reverse proxy: cashive.gg → localhost:3000
12. Run with PM2 in production mode
13. Test the full flow: register → verify email → log in → see profile → log out

**Integrate with frontend:** At this point, connect the existing frontend pages. The sidebar user card should show real data. The top nav balance and avatar should pull from the session. Settings page should load and save real user preferences.

### Phase 2: Static Content & Page Data

**Goal:** All frontend pages load with real (or realistic) data from the database. No offerwall postbacks yet — just the UI populated from the database.

**Steps:**
1. Build `/api/offers/featured` — returns active featured offers sorted by sort_order. Connect to homepage featured offer grid
2. Build `/api/offers/providers` — returns active offerwall providers. Connect to Earn page tiles
3. Build `/api/offers/surveys` — returns active survey wall providers. Connect to Surveys page
4. Build `/api/rewards/streak` — returns current streak info from user record. Connect to Rewards page streak card and home page stat
5. Build `/api/rewards/vip` — returns VIP tier info and progress. Connect to Rewards page VIP section
6. Build `/api/user/me/achievements` — returns earned + locked achievements. Connect to Profile page badges
7. Build `/api/races/active` — returns current daily + monthly race with leaderboard. Connect to Races page
8. Build `/api/ticker/recent` — returns last 20 activity events from Redis (or seed data from the database for now). Connect to the global live ticker
9. Build admin CRUD for featured_offer (create, update, delete, reorder). You need this to manage homepage content
10. Build admin CRUD for offerwall_provider (create, update, toggle active). You need this before integrating real offerwalls

**Integrate with frontend:** After this phase, every page on the site shows real data. The homepage has real featured offers. The Earn page has real provider tiles (even if clicking them doesn't work yet). The profile shows real stats and achievements. The races page shows a real leaderboard.

### Phase 3: Offerwall Postback Integration

**Goal:** When a user completes an offer on a real offerwall, they get credited automatically.

**Steps:**
1. Apply for publisher accounts with offerwalls (if not done already — start with Torox, AdGem, BitLabs, CPX Research)
2. Build the postback endpoint `/api/postback/[provider]` with the full processing pipeline:
   - IP whitelist validation
   - Signature/HMAC validation
   - Parameter normalization (one adapter per provider)
   - Deduplication by external_tx_id
   - User lookup and validation
   - Reward calculation (payout × revenue_share_pct + VIP bonus)
   - Atomic balance credit (database transaction: update user.balance_honey, insert offer_completion, insert transaction)
   - PostbackLog insertion (for every postback, regardless of outcome)
3. Build offerwall iframe embedding on the Earn page: when a user clicks a provider tile, open the provider's iframe URL with the user's ID substituted in
4. Configure your postback URLs in each offerwall provider's dashboard (they'll be like `https://cashive.gg/api/postback/torox?user_id={user_id}&amount={payout}&tx_id={transaction_id}&offer_name={offer_name}&sig={signature}`)
5. Test with a real offer: complete a small offer on one of the integrated walls, verify the postback arrives, verify the user's balance updates, verify the transaction and offer_completion records exist
6. Integrate additional providers one at a time (each needs its own adapter for parameter normalization)

**Integrate with frontend:** After a postback credits a user, their balance in the top nav should update (on next page load for now — real-time via WebSocket comes later). Their transaction history on the profile page should show the new earning.

### Phase 4: Withdrawals

**Goal:** A user can request a withdrawal and receive real money.

**Steps:**
1. Build the KYC flow: document upload API (accept images, store to filesystem under `/var/data/cashive/uploads/kyc/`), serve KYC images via authenticated admin-only route
2. Build admin KYC review: list pending KYC submissions, view documents, approve/reject with reason
3. Build `/api/withdraw/request`: validate everything (balance, minimum, KYC status, no pending withdrawal, earning threshold), atomically deduct balance + create Transaction + create Withdrawal record
4. Build `/api/withdraw/history`: return user's withdrawal history
5. Build admin withdrawal review queue: list pending withdrawals with user context (fraud score, account age, earnings breakdown), approve/reject with note
6. Integrate PayPal Payouts API: start with sandbox, test a full payout cycle, then switch to live
7. Build the withdrawal processing worker (BullMQ job or manual admin trigger for now): take an approved withdrawal, call the payment API, update status to COMPLETED or FAILED, record external payment ID
8. Send withdrawal confirmation email (or just a notification for now)

**Integrate with frontend:** Cashout page shows real withdrawal options, real balance, real history. Users can submit real withdrawal requests. Status updates appear in their history.

### Phase 5: Engagement Systems

**Goal:** Streaks, VIP, races, referrals, achievements, and promo codes are all live.

**Steps:**
1. **Streak logic:** Modify the postback handler to update last_earn_date and current_streak on each credit. Build the DailyStreakChecker cron job (runs at 00:05 UTC via BullMQ repeatable job or a cron). Build streak bonus crediting (insert STREAK_BONUS transaction)
2. **VIP tier recalculation:** Build the VipTierRecalc cron job (runs daily at 01:00 UTC). Sum each user's offer earnings from the past 30 days, compare against thresholds from platform_setting, update vip_tier if changed. Modify the postback handler to apply VIP bonus percentage on credits
3. **Referral commission:** Modify the postback handler: after crediting a user, check if they have a referred_by_id. If so, calculate commission based on referrer's referral_tier, atomically credit the referrer, insert ReferralEarning record. Build `/api/user/me/referrals` to return referral stats
4. **Races:** Build race creation (admin or automated). Modify the postback handler to increment race_entry.points for active races (also update Redis sorted set for live leaderboard). Build the DailyRaceFinalize and MonthlyRaceFinalize cron jobs. Build `/api/races/[id]/leaderboard`
5. **Achievements:** Build the achievement checker: after each credit event, query the user's stats and compare against achievement criteria. Award any newly qualified badges (idempotent via unique constraint on user_achievement). Emit notification
6. **Promo codes:** Build `/api/promo/redeem`: validate code, validate user eligibility, credit balance, create PromoRedemption

**Integrate with frontend:** Rewards page shows live streak with real day nodes. VIP tier card shows real tier and progress. Races page has a live leaderboard. Referrals page shows real stats and commission history. Profile shows earned achievement badges. Promo code input actually works.

### Phase 6: Real-Time (WebSocket)

**Goal:** Chat, live ticker, instant notifications, and live balance updates.

**Steps:**
1. Set up the Socket.IO server as a separate Node.js process (port 3001), managed by PM2
2. Configure Nginx to proxy WebSocket connections (`/socket.io/` → localhost:3001)
3. Set up Redis Pub/Sub: the Next.js API server publishes events, the Socket.IO server subscribes and broadcasts
4. Build the community chat: client connects with JWT, server validates and joins user to room. Send/receive messages. Store in PostgreSQL + Redis List (last 100). Rate limiting via Redis key TTL. Message deletion and moderation
5. Modify the postback handler to publish ticker events and user-specific events to Redis after each credit
6. Build real-time balance updates: when a postback credits a user, their browser instantly shows the new balance without refreshing
7. Build real-time notifications: deliver offer_credited, withdrawal_complete, achievement_earned events to the specific user's socket
8. Build live leaderboard updates: publish race position changes during active races

**Integrate with frontend:** Chat panel on the right side of every page is now live. The ticker bar scrolls real events. Balance updates instantly when an offer is credited. Notification bell shows real-time unread count.

### Phase 7: Anti-Fraud

**Goal:** Protect the platform from abuse.

**Steps:**
1. Integrate IP intelligence API (IPQualityScore or similar): check on signup and on each postback. Classify IP type. Store results in device_fingerprint
2. Integrate client-side device fingerprinting: generate fingerprint hash on signup/login. Store in device_fingerprint. On each new signup, query for existing accounts with the same hash
3. Build fraud score calculation: create FraudEvent records for each signal, update user.fraud_score
4. Wire fraud score into withdrawal review: auto-flag withdrawals from users with score > 30
5. Build multi-account detection: on signup, check fingerprint and IP against existing accounts. If match found, increase fraud score and create fraud event
6. Add Recaptcha/Turnstile to signup, login, and withdrawal forms
7. Build admin fraud view: show fraud timeline, device history, IP history for any user

### Phase 8: Admin Dashboard (Full Build)

**Goal:** Complete admin panel. See Section 4 for full specification.

### Phase 9: Polish & Launch

**Goal:** Production readiness.

- Error monitoring (Sentry)
- Structured logging
- Database backup cron job
- Email templates (branded)
- Legal pages (Terms of Service, Privacy Policy, Cookie Policy)
- Load testing on the postback endpoint
- Security audit (OWASP checklist)
- Mobile responsive testing

---

## SECTION 4: Admin Dashboard Specification

The admin dashboard is a completely separate section of the site, accessible at `/admin/*`. It has its own authentication (admin_user table), its own layout, and its own design language. It is not visible to regular users.

### 4.1 Admin Auth

- Admin login page at `/admin/login`
- Separate from user auth — uses admin_user table
- Supports optional 2FA (TOTP)
- Session stored separately in Redis with an `admin:` prefix
- No self-registration — admins are created by SUPER_ADMIN only

### 4.2 Admin Roles

| Role | What they can do |
|------|-----------------|
| SUPER_ADMIN | Everything. Create/manage other admins. System configuration (platform_setting). Delete accounts. View audit logs of other admins. |
| ADMIN | User management (view, ban, unban, mute, adjust balance). Withdrawal management (approve, reject). Offerwall provider management. Featured offer management. Race management. Promo code management. View analytics. |
| MODERATOR | Chat moderation (delete messages, mute users). View chat reports. View user profiles (read-only). |
| SUPPORT_AGENT | View and respond to support tickets. View user profiles (read-only). Cannot modify user data. |

### 4.3 Admin Pages

#### Dashboard (`/admin`)

The landing page after admin login. Shows key metrics at a glance.

**Top stats row (real-time or near-real-time):**
- Revenue today (sum of payout_to_us_cents from today's offer_completions, in USD)
- Revenue this month
- Payouts today (sum of completed withdrawals today, in USD)
- Payouts this month
- Active users (users who logged in within last 24 hours)
- New signups today
- Pending withdrawals count (badge, red if > 0)
- Pending KYC count (badge)
- Open support tickets count (badge)
- Pending chat reports count (badge)

**Charts (below stats):**
- Revenue vs Payouts over last 30 days (dual line chart)
- New signups over last 30 days (bar chart)
- Offer completions by provider over last 7 days (stacked bar chart)

**Recent activity feed:**
- Last 10 admin actions from the audit log
- Last 10 withdrawals (with status color coding)

#### Users (`/admin/users`)

**List view:** Paginated, searchable table of all users.

- Columns: username, email, balance, lifetime earned, VIP tier, fraud score, status (active/banned), joined date
- Search by: username, email, user ID
- Filters: VIP tier, banned/not banned, fraud score range, country, joined date range
- Sort by: any column
- Click a row to open user detail

**User detail view (`/admin/users/[id]`):**

Everything about a single user, on one page with tabbed sections:

**Overview tab:**
- Profile card: avatar, username, email, user ID (copyable), country, language, joined date, last login, last IP
- Balance: current balance, lifetime earned, lifetime withdrawn
- Status: VIP tier, level, XP, fraud score (with color: green/amber/red), banned status, muted status, KYC status
- Quick actions: Ban/Unban, Mute/Unmute (with duration), Adjust Balance (with amount and required reason note), Force Verify Email, Reset Password, Change VIP Tier

**Transactions tab:**
- Full transaction history with type filter, date range, pagination
- Shows: date, type, amount, balance after, description, source

**Offers tab:**
- All offer completions with status (CREDITED/HELD/REVERSED), provider, amount, date
- Ability to manually release held offers

**Withdrawals tab:**
- All withdrawals with status, method, amount, dates, reviewer

**Referrals tab:**
- Who referred this user, who this user has referred
- Commission earnings breakdown

**Fraud tab:**
- Fraud score with full event timeline (every signal that changed the score)
- Device fingerprints: all devices seen, with IP type, IP country, timestamps
- Multi-account matches: other users sharing the same fingerprint or IP
- Flagged activity: rapid completions, chargebacks, geo mismatches

**Achievements tab:**
- Earned and locked badges

**Sessions tab:**
- Active login sessions with device, IP, last active
- Ability to revoke any session

**Support tab:**
- Tickets created by this user

**Every action an admin takes on this page creates an audit_log entry with before/after state.**

#### Withdrawals (`/admin/withdrawals`)

**Queue view:** The primary operational page. Shows withdrawals needing attention.

- Tabs: Pending (default), Approved, Processing, Completed, Rejected, Failed, All
- Each row shows: user (username + ID), amount, method, fraud score at request, account age, is first withdrawal (flag), country, requested date
- Clicking a row opens a detail panel showing: user profile summary, full fraud context, this user's withdrawal history, and the specific withdrawal details
- Actions: Approve (with optional note), Reject (with required reason — shown to user), Batch approve (select multiple clean withdrawals)
- Visual flags: red row highlight if fraud score > 30, amber if first withdrawal, orange if amount > $50

#### Offerwalls (`/admin/offerwalls`)

- List of all configured providers with: name, type (offerwall/survey/watch), revenue share %, active status, total completions, total revenue
- CRUD: add new provider, edit any field, toggle active, delete (soft)
- Postback log viewer per provider: last 100 postbacks with result, timestamp, user, amount, processing time. Filterable by result (CREDITED, REJECTED_IP, REJECTED_SIG, DUPLICATE, ERROR)
- Postback tester: form to simulate a postback for testing new integrations

#### Featured Offers (`/admin/featured-offers`)

- List with drag-and-drop reordering
- CRUD: create/edit with image upload (poster + icon), title, requirement, provider name, reward, category, external URL
- Toggle active/inactive
- Completions counter (manually adjustable or auto-incremented from postbacks)

#### Races (`/admin/races`)

- List of all races (active, completed) with type, prize pool, status, date range
- Create new race: type, title, prize pool, prize distribution (JSON editor), start/end dates
- View race detail: full leaderboard with final ranks and prizes (for completed races), live leaderboard (for active races)
- Manual finalization trigger (in case the cron fails)
- Edit prize pool and distribution for future races

#### Promo Codes (`/admin/promo-codes`)

- List: code, reward, used/max, active status, expiry
- Create: code (or auto-generate), reward amount, max uses (optional), expiry (optional), minimum earning requirement toggle
- Disable/enable
- View usage: list of users who redeemed with timestamps

#### Chat Moderation (`/admin/chat`)

- Flagged messages tab: messages reported by users, with report reason, reporter, message content, reported user. Actions: delete message, mute user (with duration), dismiss report
- All messages tab: searchable/filterable message history. Actions: delete any message, mute user
- Muted users tab: list of currently muted users with mute reason, expiry, unmute action

#### Support Tickets (`/admin/support`)

- Ticket queue: filterable by status (Open, In Progress, Waiting on User, Resolved, Closed), priority, category, assigned agent
- Ticket detail: full conversation thread between user and admin. User context panel on the side (profile summary, relevant offer/withdrawal if linked). Reply form. Status change. Priority change. Assign to self or another agent
- My tickets tab: tickets assigned to the current admin

#### Analytics (`/admin/analytics`)

- **Revenue analytics:** daily/weekly/monthly revenue (what offerwalls pay us), daily/weekly/monthly payouts (what we pay users), margin (revenue - payouts), trend charts
- **User analytics:** signups over time, active users over time (DAU/WAU/MAU), retention curve, geographic distribution
- **Offer analytics:** completions by provider over time, top offers by completions, average reward per offer, chargeback rate by provider
- **Withdrawal analytics:** volume by method over time, average withdrawal amount, approval rate, processing time distribution
- **Referral analytics:** top referrers, referral conversion rate, commission payouts over time
- Date range selector on all charts (last 7d, 30d, 90d, custom range)

#### System Settings (`/admin/settings`)

- Edits the platform_setting table
- Grouped by category: General, Withdrawals, Races, Streaks, VIP, Referrals
- Each setting shows: key, current value, description, type, last updated by/when
- Edit inline with type-appropriate input (number input for INT, toggle for BOOLEAN, textarea for JSON)
- Changes take effect immediately (or after cache refresh)

#### Audit Log (`/admin/audit-log`)

- Chronological list of every admin action
- Columns: timestamp, admin name, action, target type, target ID, detail summary
- Click to expand: full before_state and after_state JSON diffs
- Filter by: admin, action type, target type, date range
- Not editable or deletable by anyone (append-only)

#### Admin Management (`/admin/admins`) — SUPER_ADMIN only

- List of all admin users with role, active status, last login
- Create new admin: email, name, role, temporary password
- Edit role, toggle active
- Cannot delete — only deactivate

### 4.4 Admin Dashboard Design

The admin dashboard follows a different design language from the main site. It should be clean, functional, and information-dense — not flashy.

- **Layout:** Fixed left sidebar (dark, narrow, icon + label nav) + main content area. No community chat panel. No live ticker.
- **Colors:** Use a neutral dark theme. Background: `#0F1117`. Surface: `#1A1D27`. Accent: same amber `#F5A623` for primary actions, but used sparingly. Most text and controls in neutral grays and whites. Red for danger actions, green for success states, amber for warnings.
- **Typography:** Inter or system font stack. Body 14px. Dense spacing — admin UIs should fit a lot of information on screen.
- **Components:** Use a component library like shadcn/ui for consistency and speed. Tables, forms, modals, dropdowns, toggles should all feel uniform.
- **No honeycomb motifs or bee branding.** The admin panel is a tool, not a marketing surface. Clean and utilitarian.

---

## SECTION 5: Theme & Visual Regulations

These rules apply to the main user-facing site (not the admin dashboard). They were established across the frontend design prompts and are non-negotiable.

### 5.1 Brand Identity

- **Name:** cashive.gg (stylized lowercase)
- **Tagline:** "Where Your Time Turns to Honey"
- **Currency name:** Honey. 1,000 Honey = $1.00. Symbol: custom honeydrop SVG icon (never the Unicode 🍯 emoji)
- **Mascot:** Geometric bee — hexagonal body, translucent hexagonal wings, small dark head. Used in the logo and as a subtle motif
- **Theme name:** "Dark Hive" — dark, immersive, card-heavy UI merged with beehive/honeycomb geometry

### 5.2 Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background (deepest) | `#0D0B0E` | Page body, base layer |
| Surface / Cards | `#1A1520` | Card backgrounds, sidebar, panels |
| Surface elevated | `#241E2C` | Hovered cards, modals, dropdowns |
| Primary accent | `#F5A623` | CTAs, active states, Honey currency display, highlights |
| Primary accent hover | `#FFBE42` | Button hovers, link hovers |
| Secondary accent | `#E8852D` | Bonus badges, "hot" offer tags, notifications |
| Success | `#34C759` | Completed tasks, payout success states |
| Text primary | `#F0ECE4` | Headings, body copy |
| Text secondary | `#9B95A0` | Labels, descriptions, timestamps |
| Text tertiary | `#5E5866` | Disabled states, placeholder text |
| Border / divider | `#2A2433` | Card borders, section separators |
| Danger / error | `#FF4D6A` | Warnings, insufficient balance |

**VIP tier colors:**
| Tier | Color |
|------|-------|
| Bronze | `#CD7F32` |
| Silver | `#A8B2BD` |
| Gold | `#F5A623` |
| Platinum | `#B8D4E3` |

### 5.3 Typography

- **Headings:** Inter or Space Grotesk — bold/semibold, slightly tracked out
- **Body:** Inter — regular weight, 14-16px base
- **Currency/numbers:** Tabular numerals, slightly larger, in the honey-gold color (`#F5A623`)

### 5.4 Absolute Rules

**NO decorative emojis anywhere in the UI.** No 💰, 🎁, 🏆, ⚔️ in navigation, headers, buttons, or cards. Use Lucide React icons for all UI icons. The ONLY place emojis are acceptable is inside user-generated chat messages.

**Real brand images everywhere.** Every offerwall tile, survey provider, app icon, game poster, and payment method logo must use the actual brand's real logo/image — fetched from APIs or stored as assets. Never use placeholder emoji or generic icons. Fallback for missing images: a neutral hexagonal placeholder with the provider's initials in amber on dark.

**Flying bee loading animation on every loading state.** All spinners, skeleton loaders, and "Loading..." text must be replaced with the `<BeeLoader />` component (a geometric bee doing a figure-8 flight with wing flutter and amber trail). Three sizes: sm (24px, inline), md (48px, section), lg (80px, full page).

**Dark theme only.** No light mode. No white surfaces anywhere. Elevation is expressed through lightness (lighter = higher), not shadows.

**Honeycomb motifs are subtle, not dominant.** Hexagonal grid background pattern at ~3-5% opacity. Hexagonal badge shapes. Hex-shaped achievement tiles. Never overdone — a whisper of texture, not wallpaper.

**Honey currency always in gold.** Every instance of a Honey amount uses `#F5A623` with the custom honeydrop SVG icon. Never the 🍯 emoji.

### 5.5 Layout Structure (Every Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP NAV BAR (sticky)                                               │
│  [Logo]  [Search]                    [Honey Balance] [Bell] [Avatar]│
├─────────────────────────────────────────────────────────────────────┤
│  LIVE TICKER (global, below nav, scrolling marquee)                 │
├──────────┬──────────────────────────────────────────┬──────────────┤
│ SIDEBAR  │  MAIN CONTENT                            │  CHAT PANEL  │
│ (240px)  │  (flexible)                              │  (320px)     │
│          │                                          │  (collapsible)│
│          │                                          │              │
└──────────┴──────────────────────────────────────────┴──────────────┘
│ FLOATING SUPPORT BUTTON (bottom-right, always visible)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.6 Sidebar Structure

```
🐝 cashive.gg          ← Logo (bee icon + wordmark)

EARN                    ← Group label (uppercase, muted, tiny)
  Home                  ← Lucide: House
  Earn                  ← Lucide: Coins
  Tasks                 ← Lucide: ClipboardList
  Surveys               ← Lucide: MessageSquareMore

COMPETE
  Races                 ← Lucide: Trophy

REWARDS
  Rewards               ← Lucide: Gift
  Cashout               ← Lucide: Wallet
  Referrals             ← Lucide: Users

────────────────
  Settings              ← Lucide: Settings

┌───────────────┐
│ [Avatar] User │       ← User card: avatar + username
│ Silver • Lv12 │         VIP tier + level
│ ██████░░ 72%  │         XP progress bar
└───────────────┘
```

- No Boxes, no Battles, no Support in sidebar
- All icons: Lucide React (no emojis)
- Active item: amber left border + amber text
- Mobile: collapses to bottom tab bar (Home, Earn, Races, Cashout, Profile)

### 5.7 Global Elements

**Live Ticker:** 36px tall, between top nav and main content, all pages. Continuously scrolling marquee of recent platform events. Pauses on hover. Events: earnings, withdrawals, race wins.

**Community Chat Panel:** 320px, docked right, collapsible. "Hive Chat" header with online count. VIP-colored usernames with tier badges. 200-char message limit. 3-second rate limit. Main content compresses when open. Remembers open/closed state.

**Floating Support Button:** 56px amber circle, fixed bottom-right. Lucide Headset icon. Opens support widget with FAQ accordion + live chat. Red notification dot for unread replies.

### 5.8 Card Styling

- Background: `#1A1520`
- Border: `1px solid #2A2433`
- Border-radius: 12px
- Padding: 16-20px
- Hover: background `#241E2C`, border gains faint amber tint, translateY -2px. 150ms transition

### 5.9 Button Styling

- **Primary (CTA):** Amber background (`#F5A623`), dark text, rounded 8px, bold. Hover: `#FFBE42`
- **Secondary/Ghost:** Amber border, amber text, transparent background. Hover: faint amber fill
- **Disabled:** Gray background, muted text, no hover effect
- **Danger:** Red (`#FF4D6A`) — ghost for less critical, filled for critical

### 5.10 Responsive Breakpoints

- **Desktop (1200px+):** Full sidebar + grid + optional chat panel
- **Tablet (768-1199px):** Sidebar icon-only rail or hamburger. Chat overlays. Grids 2-3 columns
- **Mobile (<768px):** Bottom tab bar. Chat full-screen overlay. Grids 1-2 columns. Support widget as bottom sheet

### 5.11 Shared Components

These must exist as proper reusable components, never duplicated inline:

| Component | Purpose |
|-----------|---------|
| `<BeeLoader size label />` | All loading states (flying bee animation) |
| `<StatCard icon label value />` | Stat displays across multiple pages |
| `<ProviderTile logo name badge />` | Offerwall/survey tiles |
| `<TaskRow icon title desc reward />` | Task list items (compact + featured variants) |
| `<FeaturedOfferCard poster title reward />` | Homepage offer grid cards |
| `<HexBadge text color size />` | Hexagonal badges (ranks, tiers, bonuses, achievements) |
| `<FilterPill label active />` | Filter/tab toggles |
| `<DataTable columns rows />` | Tables (leaderboard, history, referrals) |
| `<ProgressBar value max color />` | Progress indicators (VIP, streak, XP) |
| `<EmptyState illustration title action />` | No-data states |
| `<Toast type message />` | Auto-dismissing notifications |
| `<CopyButton text />` | Copy-to-clipboard with "Copied!" feedback |
| `<CountdownTimer target />` | Race countdown |
| `<ChatPanel />` | Right-side community chat |
| `<ChatMessage />` | Individual chat message row |
| `<FloatingSupportButton />` | Bottom-right support trigger |
| `<LiveTicker />` | Global scrolling activity ticker |

---

## SECTION 6: Technical Constraints & Decisions

### 6.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 (on the droplet) |
| ORM | Prisma |
| Cache / Queue | Redis 7 (on the droplet) |
| Auth | Auth.js v5 (NextAuth) |
| Real-time | Socket.IO (separate process, port 3001) |
| Background jobs | BullMQ (separate process, no port) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| SSL | Let's Encrypt via Certbot |

### 6.2 Process Layout on the Droplet

| Process | Port | Purpose |
|---------|------|---------|
| Next.js | 3000 | Frontend + API routes |
| Socket.IO server | 3001 | WebSocket connections |
| BullMQ worker | — | Background job processing |
| PostgreSQL | 5432 | Database (localhost only) |
| Redis | 6379 | Cache/queue/sessions (localhost only) |
| Nginx | 80/443 | Reverse proxy + SSL termination |

### 6.3 Financial Rules (Repeated for Emphasis)

- Honey is always an integer (1,000 = $1.00). Never use floats for money.
- The transaction table is the source of truth. user.balance_honey is a cache.
- Every balance change is atomic: update balance + insert Transaction in one database transaction.
- Postbacks are idempotent: duplicate external_tx_id returns 200 without crediting.

### 6.4 API Conventions

- All routes under `/api/`
- JSON request/response
- Success: `{ data: ... }` with 200 or 201
- Error: `{ error: { code: "...", message: "..." } }` with 400/401/403/404/429/500
- List endpoints: cursor-based pagination `{ data: [...], cursor: "...", hasMore: boolean }`
- Input validation with Zod on every route before any business logic
- Rate limiting via Redis sliding window

### 6.5 Security

- Passwords: bcrypt, cost factor 12
- Sessions: JWT in HTTP-only Secure SameSite=Strict cookies
- CSRF: SameSite cookie attribute + double-submit token
- SQL injection: Prisma parameterized queries
- Rate limiting on all sensitive endpoints
- UFW: only ports 22, 80, 443
- PostgreSQL and Redis: localhost only
- SSH: key-only auth
