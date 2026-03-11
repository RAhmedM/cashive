-- ═══════════════════════════════════════════════════════════════════
-- cashive.gg — Complete PostgreSQL Schema
-- Run this file against a fresh database:
--   psql -U cashive -d cashive -f schema.sql
-- ═══════════════════════════════════════════════════════════════════

-- Clean slate
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email


-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE vip_tier AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
CREATE TYPE balance_display AS ENUM ('HONEY', 'USD', 'BOTH');
CREATE TYPE email_token_type AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE transaction_type AS ENUM (
    'OFFER_EARNING', 'SURVEY_EARNING', 'REFERRAL_COMMISSION',
    'STREAK_BONUS', 'RACE_PRIZE', 'VIP_BONUS', 'PROMO_CODE',
    'SIGNUP_BONUS', 'WITHDRAWAL', 'ADMIN_ADJUSTMENT', 'CHARGEBACK'
);
CREATE TYPE transaction_source AS ENUM (
    'OFFER', 'WITHDRAWAL', 'REFERRAL', 'RACE', 'PROMO',
    'STREAK', 'VIP', 'SIGNUP', 'ADMIN'
);
CREATE TYPE provider_type AS ENUM ('OFFERWALL', 'SURVEY_WALL', 'WATCH_WALL');
CREATE TYPE signature_method AS ENUM ('HMAC_SHA256', 'HMAC_MD5', 'SECRET_PARAM', 'NONE');
CREATE TYPE offer_status AS ENUM ('CREDITED', 'HELD', 'REVERSED');
CREATE TYPE postback_result AS ENUM (
    'CREDITED', 'DUPLICATE', 'REJECTED_IP', 'REJECTED_SIG',
    'REJECTED_USER', 'ERROR'
);
CREATE TYPE withdrawal_method AS ENUM (
    'PAYPAL', 'BTC', 'ETH', 'LTC', 'SOL',
    'AMAZON', 'STEAM', 'ROBLOX', 'VISA'
);
CREATE TYPE withdrawal_status AS ENUM (
    'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'
);
CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE kyc_doc_type AS ENUM ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID');
CREATE TYPE race_type AS ENUM ('DAILY', 'MONTHLY');
CREATE TYPE race_status AS ENUM ('ACTIVE', 'FINALIZING', 'COMPLETED');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE ticket_category AS ENUM ('WITHDRAWAL', 'OFFER_NOT_CREDITED', 'ACCOUNT', 'KYC', 'OTHER');
CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');
CREATE TYPE report_reason AS ENUM ('SPAM', 'ABUSE', 'HARASSMENT', 'OTHER');
CREATE TYPE ip_type AS ENUM ('RESIDENTIAL', 'VPN', 'PROXY', 'DATACENTER', 'TOR');
CREATE TYPE fraud_event_type AS ENUM (
    'VPN_DETECTED', 'MULTI_ACCOUNT_IP', 'MULTI_ACCOUNT_DEVICE',
    'RAPID_COMPLETIONS', 'CHARGEBACK', 'KYC_REJECTED', 'GEO_MISMATCH',
    'SCORE_DECAY'
);
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT_AGENT');
CREATE TYPE setting_type AS ENUM ('STRING', 'INT', 'FLOAT', 'BOOLEAN', 'JSON');
CREATE TYPE setting_category AS ENUM ('GENERAL', 'WITHDRAWALS', 'RACES', 'STREAKS', 'VIP', 'REFERRALS');


-- ═══════════════════════════════════════════
-- ADMIN USERS (created first — referenced by many tables)
-- ═══════════════════════════════════════════

CREATE TABLE admin_user (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            admin_role NOT NULL DEFAULT 'MODERATOR',
    totp_secret     TEXT,
    totp_enabled    BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ
);


-- ═══════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════

CREATE TABLE "user" (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email                   CITEXT NOT NULL UNIQUE,
    email_verified          BOOLEAN NOT NULL DEFAULT false,
    password_hash           TEXT,
    username                TEXT NOT NULL UNIQUE,
    avatar_url              TEXT,
    country                 CHAR(2),
    language                TEXT NOT NULL DEFAULT 'en',

    -- Social login IDs
    google_id               TEXT UNIQUE,
    facebook_id             TEXT UNIQUE,
    steam_id                TEXT UNIQUE,
    discord_id              TEXT UNIQUE,

    -- 2FA
    totp_secret             TEXT,
    totp_enabled            BOOLEAN NOT NULL DEFAULT false,
    backup_codes            TEXT,

    -- Balance (integer honey — 1000 = $1.00)
    balance_honey           INT NOT NULL DEFAULT 0,
    lifetime_earned         INT NOT NULL DEFAULT 0,

    -- Leveling
    xp                      INT NOT NULL DEFAULT 0,
    level                   INT NOT NULL DEFAULT 1,
    vip_tier                vip_tier NOT NULL DEFAULT 'NONE',

    -- Streaks
    current_streak          INT NOT NULL DEFAULT 0,
    last_earn_date          DATE,
    longest_streak          INT NOT NULL DEFAULT 0,

    -- Referral
    referral_code           TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    referred_by_id          TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    referral_tier           INT NOT NULL DEFAULT 1 CHECK (referral_tier BETWEEN 1 AND 4),

    -- Fraud
    fraud_score             REAL NOT NULL DEFAULT 0.0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
    is_banned               BOOLEAN NOT NULL DEFAULT false,
    ban_reason              TEXT,
    chat_muted              BOOLEAN NOT NULL DEFAULT false,
    chat_muted_until        TIMESTAMPTZ,

    -- Privacy
    profile_public          BOOLEAN NOT NULL DEFAULT true,
    anonymous_in_chat       BOOLEAN NOT NULL DEFAULT false,
    anonymous_on_leaderboard BOOLEAN NOT NULL DEFAULT false,

    -- Preferences
    balance_display         balance_display NOT NULL DEFAULT 'BOTH',
    chat_open_default       BOOLEAN NOT NULL DEFAULT true,
    notification_prefs      JSONB NOT NULL DEFAULT '{"email":{"withdrawal":true,"offer_credited":false,"weekly_summary":true,"marketing":false},"push":{},"onsite":{"streak_reminder":true,"race_results":true}}',

    -- Tracking
    last_login_ip           TEXT,
    last_device_fingerprint TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at           TIMESTAMPTZ
);

CREATE INDEX idx_user_referred_by ON "user"(referred_by_id) WHERE referred_by_id IS NOT NULL;
CREATE INDEX idx_user_vip_tier ON "user"(vip_tier) WHERE vip_tier != 'NONE';
CREATE INDEX idx_user_created_at ON "user"(created_at);
CREATE INDEX idx_user_fraud_score ON "user"(fraud_score) WHERE fraud_score > 30;


-- ═══════════════════════════════════════════
-- SESSIONS
-- ═══════════════════════════════════════════

CREATE TABLE session (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    device          TEXT,
    ip              TEXT,
    fingerprint     TEXT,
    last_active     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_user ON session(user_id);
CREATE INDEX idx_session_expires ON session(expires_at);


-- ═══════════════════════════════════════════
-- EMAIL TOKENS
-- ═══════════════════════════════════════════

CREATE TABLE email_token (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    type            email_token_type NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_token_user ON email_token(user_id);


-- ═══════════════════════════════════════════
-- TRANSACTIONS (Financial Ledger)
-- ═══════════════════════════════════════════

CREATE TABLE transaction (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    type            transaction_type NOT NULL,
    amount          INT NOT NULL,
    balance_after   INT NOT NULL,
    source_type     transaction_source NOT NULL,
    source_id       TEXT,
    description     TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_user_time ON transaction(user_id, created_at DESC);
CREATE INDEX idx_tx_type ON transaction(type);
CREATE INDEX idx_tx_created ON transaction(created_at DESC);
CREATE INDEX idx_tx_source ON transaction(source_type, source_id) WHERE source_id IS NOT NULL;


-- ═══════════════════════════════════════════
-- OFFERWALL PROVIDERS
-- ═══════════════════════════════════════════

CREATE TABLE offerwall_provider (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    logo_url            TEXT,
    type                provider_type NOT NULL DEFAULT 'OFFERWALL',
    postback_secret     TEXT NOT NULL,
    postback_ips        TEXT[] NOT NULL DEFAULT '{}',
    signature_method    signature_method NOT NULL DEFAULT 'HMAC_SHA256',
    iframe_base_url     TEXT,
    revenue_share_pct   INT NOT NULL DEFAULT 80 CHECK (revenue_share_pct BETWEEN 1 AND 100),
    bonus_badge_pct     INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    sort_order          INT NOT NULL DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════
-- OFFER COMPLETIONS
-- ═══════════════════════════════════════════

CREATE TABLE offer_completion (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    provider_id             TEXT NOT NULL REFERENCES offerwall_provider(id) ON DELETE RESTRICT,
    external_tx_id          TEXT NOT NULL UNIQUE,
    external_offer_id       TEXT,
    offer_name              TEXT NOT NULL,
    offer_category          TEXT,
    payout_to_us_cents      INT NOT NULL,
    reward_to_user_honey    INT NOT NULL,
    platform_margin_honey   INT NOT NULL,
    vip_bonus_honey         INT NOT NULL DEFAULT 0,
    status                  offer_status NOT NULL DEFAULT 'CREDITED',
    hold_reason             TEXT,
    held_until              TIMESTAMPTZ,
    reversal_reason         TEXT,
    reversed_at             TIMESTAMPTZ,
    user_ip                 TEXT,
    user_country            CHAR(2),
    raw_postback            JSONB NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oc_user ON offer_completion(user_id);
CREATE INDEX idx_oc_provider ON offer_completion(provider_id);
CREATE INDEX idx_oc_created ON offer_completion(created_at DESC);
CREATE INDEX idx_oc_status ON offer_completion(status) WHERE status != 'CREDITED';


-- ═══════════════════════════════════════════
-- POSTBACK LOGS
-- ═══════════════════════════════════════════

CREATE TABLE postback_log (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider_id     TEXT NOT NULL REFERENCES offerwall_provider(id) ON DELETE CASCADE,
    raw_url         TEXT NOT NULL,
    source_ip       TEXT NOT NULL,
    result          postback_result NOT NULL,
    error_detail    TEXT,
    user_id         TEXT,
    external_tx_id  TEXT,
    processing_ms   INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pbl_provider_time ON postback_log(provider_id, created_at DESC);
CREATE INDEX idx_pbl_result ON postback_log(result) WHERE result != 'CREDITED';
CREATE INDEX idx_pbl_created ON postback_log(created_at DESC);


-- ═══════════════════════════════════════════
-- FEATURED OFFERS
-- ═══════════════════════════════════════════

CREATE TABLE featured_offer (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title               TEXT NOT NULL,
    requirement         TEXT NOT NULL,
    provider_name       TEXT NOT NULL,
    provider_logo_url   TEXT,
    poster_image_url    TEXT,
    app_icon_url        TEXT,
    reward_honey        INT NOT NULL,
    category            TEXT NOT NULL,
    external_url        TEXT,
    completions         INT NOT NULL DEFAULT 0,
    rating              REAL CHECK (rating >= 0 AND rating <= 5),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fo_active ON featured_offer(is_active, sort_order) WHERE is_active = true;


-- ═══════════════════════════════════════════
-- WITHDRAWALS
-- ═══════════════════════════════════════════

CREATE TABLE withdrawal (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    method                  withdrawal_method NOT NULL,
    amount_honey            INT NOT NULL CHECK (amount_honey > 0),
    amount_usd_cents        INT NOT NULL CHECK (amount_usd_cents > 0),
    fee_usd_cents           INT NOT NULL DEFAULT 0,
    paypal_email            TEXT,
    crypto_address          TEXT,
    crypto_currency         TEXT,
    gift_card_type          TEXT,
    gift_card_email         TEXT,
    status                  withdrawal_status NOT NULL DEFAULT 'PENDING',
    reviewed_by             TEXT REFERENCES admin_user(id),
    review_note             TEXT,
    rejection_reason        TEXT,
    reviewed_at             TIMESTAMPTZ,
    external_payment_id     TEXT,
    fraud_score_at_request  REAL NOT NULL DEFAULT 0,
    is_first_withdrawal     BOOLEAN NOT NULL DEFAULT false,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wd_user ON withdrawal(user_id);
CREATE INDEX idx_wd_status ON withdrawal(status, created_at) WHERE status IN ('PENDING', 'APPROVED', 'PROCESSING');
CREATE INDEX idx_wd_created ON withdrawal(created_at DESC);


-- ═══════════════════════════════════════════
-- KYC VERIFICATION
-- ═══════════════════════════════════════════

CREATE TABLE kyc_verification (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    document_type       kyc_doc_type NOT NULL,
    document_front_url  TEXT NOT NULL,
    document_back_url   TEXT,
    selfie_url          TEXT NOT NULL,
    status              kyc_status NOT NULL DEFAULT 'PENDING',
    reviewed_by         TEXT REFERENCES admin_user(id),
    rejection_reason    TEXT,
    reviewed_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_user ON kyc_verification(user_id);
CREATE INDEX idx_kyc_status ON kyc_verification(status) WHERE status = 'PENDING';


-- ═══════════════════════════════════════════
-- RACES & LEADERBOARDS
-- ═══════════════════════════════════════════

CREATE TABLE race (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type                race_type NOT NULL,
    title               TEXT NOT NULL,
    prize_pool_usd_cents INT NOT NULL,
    prize_distribution  JSONB NOT NULL,
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ NOT NULL,
    status              race_status NOT NULL DEFAULT 'ACTIVE',
    finalized_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_race_active ON race(status, type) WHERE status = 'ACTIVE';

CREATE TABLE race_entry (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id         TEXT NOT NULL REFERENCES race(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    points          INT NOT NULL DEFAULT 0,
    final_rank      INT,
    prize_honey     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(race_id, user_id)
);

CREATE INDEX idx_re_leaderboard ON race_entry(race_id, points DESC);


-- ═══════════════════════════════════════════
-- ACHIEVEMENTS
-- ═══════════════════════════════════════════

CREATE TABLE achievement (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon            TEXT NOT NULL,
    color           TEXT NOT NULL,
    criteria_type   TEXT NOT NULL,
    criteria_value  INT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE user_achievement (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    achievement_id  TEXT NOT NULL REFERENCES achievement(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_ua_user ON user_achievement(user_id);


-- ═══════════════════════════════════════════
-- PROMO CODES
-- ═══════════════════════════════════════════

CREATE TABLE promo_code (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code                    TEXT NOT NULL UNIQUE,
    reward_honey            INT NOT NULL CHECK (reward_honey > 0),
    max_uses                INT,
    used_count              INT NOT NULL DEFAULT 0,
    requires_min_earnings   BOOLEAN NOT NULL DEFAULT false,
    min_earnings_honey      INT NOT NULL DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    expires_at              TIMESTAMPTZ,
    created_by              TEXT REFERENCES admin_user(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promo_redemption (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    promo_code_id   TEXT NOT NULL REFERENCES promo_code(id) ON DELETE RESTRICT,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, promo_code_id)
);


-- ═══════════════════════════════════════════
-- REFERRAL EARNINGS
-- ═══════════════════════════════════════════

CREATE TABLE referral_earning (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    referrer_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    earner_id               TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    offer_completion_id     TEXT NOT NULL REFERENCES offer_completion(id) ON DELETE RESTRICT,
    earner_reward_honey     INT NOT NULL,
    commission_pct          INT NOT NULL CHECK (commission_pct IN (5, 10, 15, 20)),
    commission_honey        INT NOT NULL,
    transaction_id          TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_re_referrer ON referral_earning(referrer_id, created_at DESC);
CREATE INDEX idx_re_earner ON referral_earning(earner_id);


-- ═══════════════════════════════════════════
-- SURVEY PROFILE
-- ═══════════════════════════════════════════

CREATE TABLE survey_profile (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    age                 INT CHECK (age >= 13 AND age <= 120),
    gender              TEXT,
    education           TEXT,
    employment_status   TEXT,
    income_range        TEXT,
    interests           TEXT[],
    household_size      INT,
    has_children        BOOLEAN,
    marital_status      TEXT,
    industry            TEXT,
    completion_pct      INT NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════
-- COMMUNITY CHAT
-- ═══════════════════════════════════════════

CREATE TABLE chat_message (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    room                TEXT NOT NULL DEFAULT 'general',
    content             VARCHAR(200) NOT NULL,
    is_system_message   BOOLEAN NOT NULL DEFAULT false,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    deleted_by          TEXT REFERENCES admin_user(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_room_time ON chat_message(room, created_at DESC);
CREATE INDEX idx_chat_user ON chat_message(user_id);

CREATE TABLE chat_report (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    message_id      TEXT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    reported_by     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    reason          report_reason NOT NULL,
    detail          TEXT,
    status          report_status NOT NULL DEFAULT 'PENDING',
    reviewed_by     TEXT REFERENCES admin_user(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);

CREATE INDEX idx_cr_pending ON chat_report(status) WHERE status = 'PENDING';


-- ═══════════════════════════════════════════
-- SUPPORT TICKETS
-- ═══════════════════════════════════════════

CREATE TABLE support_ticket (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subject                 TEXT NOT NULL,
    category                ticket_category NOT NULL DEFAULT 'OTHER',
    status                  ticket_status NOT NULL DEFAULT 'OPEN',
    priority                ticket_priority NOT NULL DEFAULT 'NORMAL',
    assigned_to             TEXT REFERENCES admin_user(id),
    related_offer_id        TEXT,
    related_withdrawal_id   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMPTZ
);

CREATE INDEX idx_st_user ON support_ticket(user_id);
CREATE INDEX idx_st_status ON support_ticket(status, priority, created_at) WHERE status IN ('OPEN', 'IN_PROGRESS');

CREATE TABLE support_message (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ticket_id       TEXT NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT false,
    content         TEXT NOT NULL,
    attachment_url  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sm_ticket ON support_message(ticket_id, created_at);


-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════

CREATE TABLE notification (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    link            TEXT,
    icon            TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user_unread ON notification(user_id, is_read, created_at DESC);


-- ═══════════════════════════════════════════
-- FRAUD DETECTION
-- ═══════════════════════════════════════════

CREATE TABLE device_fingerprint (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    fingerprint_hash    TEXT NOT NULL,
    user_agent          TEXT,
    screen_resolution   TEXT,
    timezone            TEXT,
    ip                  TEXT NOT NULL,
    ip_type             ip_type,
    ip_country          CHAR(2),
    ip_fraud_score      REAL,
    is_signup_device    BOOLEAN NOT NULL DEFAULT false,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_df_user ON device_fingerprint(user_id);
CREATE INDEX idx_df_hash ON device_fingerprint(fingerprint_hash);
CREATE INDEX idx_df_ip ON device_fingerprint(ip);

CREATE TABLE fraud_event (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    event_type      fraud_event_type NOT NULL,
    score_impact    REAL NOT NULL,
    score_after     REAL NOT NULL,
    detail          TEXT NOT NULL,
    evidence        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fe_user ON fraud_event(user_id, created_at DESC);


-- ═══════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════

CREATE TABLE audit_log (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_id        TEXT NOT NULL REFERENCES admin_user(id) ON DELETE RESTRICT,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    before_state    JSONB,
    after_state     JSONB,
    ip              TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_al_admin ON audit_log(admin_id, created_at DESC);
CREATE INDEX idx_al_target ON audit_log(target_type, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_al_created ON audit_log(created_at DESC);


-- ═══════════════════════════════════════════
-- PLATFORM SETTINGS
-- ═══════════════════════════════════════════

CREATE TABLE platform_setting (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    type            setting_type NOT NULL DEFAULT 'STRING',
    category        setting_category NOT NULL DEFAULT 'GENERAL',
    description     TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      TEXT REFERENCES admin_user(id)
);


-- ═══════════════════════════════════════════
-- TRIGGER: auto-update updated_at
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_updated BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_offerwall_updated BEFORE UPDATE ON offerwall_provider
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_featured_updated BEFORE UPDATE ON featured_offer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_withdrawal_updated BEFORE UPDATE ON withdrawal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_race_entry_updated BEFORE UPDATE ON race_entry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_support_ticket_updated BEFORE UPDATE ON support_ticket
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ═══════════════════════════════════════════════════════════════════
--
--  SEED DATA
--
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════
-- ADMIN USERS
-- password for all test admins: "admin123" (bcrypt hash below)
-- ═══════════════════════════════════════════

INSERT INTO admin_user (id, email, password_hash, name, role) VALUES
('adm_01', 'malik@cashive.gg',   '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm', 'Malik Hassan',   'SUPER_ADMIN'),
('adm_02', 'sarah@cashive.gg',   '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm', 'Sarah Chen',     'ADMIN'),
('adm_03', 'james@cashive.gg',   '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm', 'James Okafor',   'MODERATOR'),
('adm_04', 'priya@cashive.gg',   '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm', 'Priya Sharma',   'SUPPORT_AGENT');


-- ═══════════════════════════════════════════
-- USERS
-- password for all test users: "testpass123"
-- ═══════════════════════════════════════════

INSERT INTO "user" (id, email, email_verified, password_hash, username, country, language,
    balance_honey, lifetime_earned, xp, level, vip_tier,
    current_streak, last_earn_date, longest_streak,
    referral_code, referred_by_id, referral_tier, fraud_score,
    created_at, last_login_at, last_login_ip)
VALUES
-- Power user, Gold VIP, referred others
('usr_01', 'marcus.thompson@gmail.com', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'MarcusT', 'US', 'en',
 47320, 289400, 289400, 34, 'GOLD',
 12, '2026-03-10', 23,
 'MARCUS2024', NULL, 3, 2.0,
 '2024-11-15 08:30:00+00', '2026-03-10 19:45:00+00', '74.125.224.72'),

-- Active user, Silver VIP, referred by Marcus
('usr_02', 'aisha.patel@outlook.com', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'AishaP', 'GB', 'en',
 18650, 124800, 124800, 22, 'SILVER',
 5, '2026-03-10', 14,
 'AISHA-REF', 'usr_01', 2, 0.0,
 '2025-01-22 14:20:00+00', '2026-03-10 16:12:00+00', '82.132.248.56'),

-- Moderate user, Bronze VIP, referred by Marcus
('usr_03', 'diego.silva@proton.me', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'DiegoSilva', 'BR', 'en',
 6200, 31500, 31500, 11, 'BRONZE',
 0, '2026-03-06', 7,
 'DIEGO-GG', 'usr_01', 1, 5.0,
 '2025-06-10 22:00:00+00', '2026-03-08 10:30:00+00', '177.38.44.12'),

-- New user, no VIP, referred by Aisha
('usr_04', 'emma.johansson@icloud.com', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'EmmaJ_', 'SE', 'en',
 2480, 4800, 4800, 4, 'NONE',
 2, '2026-03-10', 3,
 'EMMAJ-2026', 'usr_02', 1, 0.0,
 '2026-02-28 09:15:00+00', '2026-03-10 21:00:00+00', '83.233.152.8'),

-- Suspicious user, high fraud score, VPN flagged
('usr_05', 'alex.unknown@tempmail.org', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'xAlex99x', 'DE', 'en',
 890, 12600, 12600, 8, 'NONE',
 0, '2026-02-20', 4,
 'ALEX-CODE', NULL, 1, 55.0,
 '2025-09-03 03:45:00+00', '2026-02-22 08:10:00+00', '185.220.101.34'),

-- Banned user
('usr_06', 'banned.cheater@gmail.com', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'CheatMaster', 'IN', 'en',
 0, 67800, 67800, 16, 'NONE',
 0, NULL, 0,
 'CHEAT-REF', NULL, 1, 92.0,
 '2025-04-02 12:00:00+00', '2025-12-15 06:00:00+00', '49.37.152.88'),

-- Brand new user, just signed up today
('usr_07', 'newbie.player@yahoo.com', false,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'NewbiePlayer', 'PK', 'en',
 250, 250, 250, 1, 'NONE',
 1, '2026-03-11', 1,
 'NEWBIE-2026', NULL, 1, 0.0,
 '2026-03-11 06:00:00+00', '2026-03-11 06:05:00+00', '39.62.18.104'),

-- Platinum whale
('usr_08', 'whale.gamer@gmail.com', true,
 '$2a$12$LJ3m5Fz8RkYhJzGQYzHYOeWQPT8GjXkRk7.XjKqXjq.fJ9bH3Xbm',
 'WhaleGamer', 'US', 'en',
 182400, 1456000, 1456000, 58, 'PLATINUM',
 31, '2026-03-10', 45,
 'WHALE-VIP', NULL, 4, 0.0,
 '2024-06-01 10:00:00+00', '2026-03-10 23:55:00+00', '172.58.192.44');

-- Mark banned user
UPDATE "user" SET is_banned = true, ban_reason = 'Multiple account fraud detected via device fingerprint matching' WHERE id = 'usr_06';


-- ═══════════════════════════════════════════
-- OFFERWALL PROVIDERS
-- ═══════════════════════════════════════════

INSERT INTO offerwall_provider (id, slug, name, logo_url, type, postback_secret, postback_ips, signature_method, iframe_base_url, revenue_share_pct, bonus_badge_pct, is_active, sort_order)
VALUES
('prv_01', 'torox',     'Torox',          'https://cdn.cashive.gg/providers/torox.png',     'OFFERWALL',   'trx_secret_k9f2m4b7',   ARRAY['52.24.142.233','34.212.90.88'],   'HMAC_SHA256', 'https://torox.io/ifr?pub=cashive&uid={user_id}',    80, 80, true, 1),
('prv_02', 'adgem',     'AdGem',          'https://cdn.cashive.gg/providers/adgem.png',     'OFFERWALL',   'agm_secret_p3x8n1d5',   ARRAY['44.228.180.0/24'],                'HMAC_SHA256', 'https://api.adgem.com/v2/wall?appid=cashive&playerid={user_id}', 75, 0, true, 2),
('prv_03', 'lootably',  'Lootably',       'https://cdn.cashive.gg/providers/lootably.png',  'OFFERWALL',   'loot_secret_w5r9q2j8',  ARRAY['35.88.124.67'],                   'SECRET_PARAM','https://wall.lootably.com/?placementID=cashive&sid={user_id}',  80, 0, true, 3),
('prv_04', 'revu',      'RevU',           'https://cdn.cashive.gg/providers/revu.png',      'OFFERWALL',   'revu_secret_m7c3f1y6',  ARRAY['52.32.88.194','54.71.22.108'],    'HMAC_SHA256', 'https://publishers.revu.com/wall/cashive?uid={user_id}',         78, 30, true, 4),
('prv_05', 'adtowall',  'AdToWall',       'https://cdn.cashive.gg/providers/adtowall.png',  'OFFERWALL',   'atw_secret_h2k6b9p4',   ARRAY['51.89.42.11'],                    'HMAC_MD5',    'https://adtowall.com/offerwall?pub=cashive&subid={user_id}',     80, 0, true, 5),
('prv_06', 'adscend',   'Adscend Media',  'https://cdn.cashive.gg/providers/adscend.png',   'OFFERWALL',   'asc_secret_t4n8g3v1',   ARRAY['162.220.58.0/24'],                'HMAC_SHA256', 'https://asmwall.com/wall?pub=cashive&sub={user_id}',             75, 50, true, 6),
('prv_07', 'bitlabs',   'BitLabs',        'https://cdn.cashive.gg/providers/bitlabs.png',   'SURVEY_WALL', 'bit_secret_z6x1q5w9',   ARRAY['34.89.244.0/24'],                 'HMAC_SHA256', 'https://web.bitlabs.ai/networks/?uid={user_id}&token=cashive',   80, 0, true, 1),
('prv_08', 'cpx',       'CPX Research',   'https://cdn.cashive.gg/providers/cpx.png',       'SURVEY_WALL', 'cpx_secret_j8m2r5k7',   ARRAY['3.64.78.22','18.196.44.100'],     'HMAC_SHA256', 'https://offers.cpx-research.com/index.php?app_id=cashive&ext_user_id={user_id}', 80, 0, true, 2),
('prv_09', 'prime',     'PrimeSurveys',   'https://cdn.cashive.gg/providers/prime.png',     'SURVEY_WALL', 'prm_secret_d9f4c8n2',   ARRAY['104.21.55.88'],                   'SECRET_PARAM','https://primesurveys.com/wall?pid=cashive&uid={user_id}',        80, 0, true, 3),
('prv_10', 'theorem',   'TheoremReach',   'https://cdn.cashive.gg/providers/theorem.png',   'SURVEY_WALL', 'thm_secret_a1b5e7h3',   ARRAY['52.1.44.200'],                    'HMAC_SHA256', 'https://theoremreach.com/routers/cashive?uid={user_id}',         78, 0, true, 4),
('prv_11', 'mmwatch',   'MM Watch',       'https://cdn.cashive.gg/providers/mmwatch.png',   'WATCH_WALL',  'mmw_secret_u3y7i2o6',   ARRAY['45.33.96.0/24'],                  'SECRET_PARAM','https://mmwall.com/watch?pub=cashive&sid={user_id}',             85, 0, true, 1);


-- ═══════════════════════════════════════════
-- OFFER COMPLETIONS (realistic history)
-- ═══════════════════════════════════════════

INSERT INTO offer_completion (id, user_id, provider_id, external_tx_id, external_offer_id, offer_name, offer_category,
    payout_to_us_cents, reward_to_user_honey, platform_margin_honey, vip_bonus_honey, status, user_ip, user_country, raw_postback, created_at)
VALUES
-- Marcus (usr_01) — heavy earner
('oc_01', 'usr_01', 'prv_01', 'TRX-8847291-A', 'rok_lvl10', 'Rise of Kingdoms - Reach Stronghold Level 10', 'game',
 1870, 14960, 3740, 1197, 'CREDITED', '74.125.224.72', 'US',
 '{"tid":"TRX-8847291-A","uid":"usr_01","amount":18.70,"offer":"rok_lvl10","status":"completed"}',
 '2025-12-02 14:22:00+00'),

('oc_02', 'usr_01', 'prv_01', 'TRX-8901445-B', 'sol_cash_dep', 'Solitaire Cash - Deposit $45 in 14 days', 'game',
 3600, 28800, 7200, 2304, 'CREDITED', '74.125.224.72', 'US',
 '{"tid":"TRX-8901445-B","uid":"usr_01","amount":36.00,"offer":"sol_cash_dep"}',
 '2026-01-18 09:45:00+00'),

('oc_03', 'usr_01', 'prv_07', 'BIT-220198-C', 'survey_88421', 'BitLabs - Consumer Preferences Survey', 'survey',
 148, 1184, 296, 95, 'CREDITED', '74.125.224.72', 'US',
 '{"tid":"BIT-220198-C","uid":"usr_01","amount":1.48}',
 '2026-03-10 11:30:00+00'),

-- Aisha (usr_02)
('oc_04', 'usr_02', 'prv_02', 'AGM-443871-D', 'tiktok_signup', 'TikTok Lite - Android - US - CPI', 'app',
 218, 1635, 545, 82, 'CREDITED', '82.132.248.56', 'GB',
 '{"tid":"AGM-443871-D","uid":"usr_02","amount":2.18,"offer":"tiktok_lite_cpi"}',
 '2026-02-14 16:08:00+00'),

('oc_05', 'usr_02', 'prv_08', 'CPX-998712-E', 'survey_44102', 'CPX Research - Market Trends Q1 2026', 'survey',
 64, 512, 128, 26, 'CREDITED', '82.132.248.56', 'GB',
 '{"tid":"CPX-998712-E","uid":"usr_02","amount":0.64}',
 '2026-03-09 20:15:00+00'),

-- Diego (usr_03) — one offer got reversed
('oc_06', 'usr_03', 'prv_04', 'REV-556201-F', 'chime_signup', 'Chime - Open Free Checking Account', 'signup',
 2500, 19500, 6500, 390, 'CREDITED', '177.38.44.12', 'BR',
 '{"tid":"REV-556201-F","uid":"usr_03","amount":25.00,"offer":"chime_free"}',
 '2026-01-05 13:40:00+00'),

('oc_07', 'usr_03', 'prv_01', 'TRX-7712038-G', 'dice_dreams_lvl20', 'Dice Dreams - Reach level 20', 'game',
 300, 2400, 600, 48, 'REVERSED', '177.38.44.12', 'BR',
 '{"tid":"TRX-7712038-G","uid":"usr_03","amount":3.00,"offer":"dice_dreams_20"}',
 '2026-02-10 08:20:00+00'),

-- Emma (usr_04) — new user, few completions
('oc_08', 'usr_04', 'prv_09', 'PRM-110348-H', 'survey_71002', 'PrimeSurveys - Household Spending Habits', 'survey',
 51, 408, 102, 0, 'CREDITED', '83.233.152.8', 'SE',
 '{"tid":"PRM-110348-H","uid":"usr_04","amount":0.51}',
 '2026-03-09 18:00:00+00'),

('oc_09', 'usr_04', 'prv_01', 'TRX-9920154-I', 'top_war_lvl30', 'Top War: Battle Game - Reach Level 30 in 7 days', 'game',
 187, 1496, 374, 0, 'HELD', '83.233.152.8', 'SE',
 '{"tid":"TRX-9920154-I","uid":"usr_04","amount":1.87,"offer":"top_war_30"}',
 '2026-03-10 22:40:00+00'),

-- Suspicious user (usr_05)
('oc_10', 'usr_05', 'prv_03', 'LOOT-887461-J', 'app_install_quick', 'Mini Games: Brainrot Challenge - Android CPI', 'app',
 73, 584, 146, 0, 'CREDITED', '185.220.101.34', 'DE',
 '{"tid":"LOOT-887461-J","uid":"usr_05","amount":0.73}',
 '2026-02-15 04:12:00+00'),

-- WhaleGamer (usr_08) — massive earner
('oc_11', 'usr_08', 'prv_01', 'TRX-1100982-K', 'sol_cash_120', 'Solitaire Cash - $120 total entry fees', 'game',
 4800, 38400, 9600, 4608, 'CREDITED', '172.58.192.44', 'US',
 '{"tid":"TRX-1100982-K","uid":"usr_08","amount":48.00}',
 '2026-03-05 15:30:00+00'),

('oc_12', 'usr_08', 'prv_06', 'ASC-339201-L', 'altroconsumo_it', 'Altroconsumo CPA IT', 'signup',
 1913, 14347, 4788, 1722, 'CREDITED', '172.58.192.44', 'US',
 '{"tid":"ASC-339201-L","uid":"usr_08","amount":19.13}',
 '2026-03-08 12:10:00+00');

-- Set the reversal details on oc_07
UPDATE offer_completion SET reversal_reason = 'Advertiser disputed conversion — user did not meet level requirement within timeframe', reversed_at = '2026-02-12 10:00:00+00' WHERE id = 'oc_07';
-- Set the hold details on oc_09
UPDATE offer_completion SET hold_reason = 'New account security review — first game offer', held_until = '2026-03-12 22:40:00+00' WHERE id = 'oc_09';


-- ═══════════════════════════════════════════
-- TRANSACTIONS (financial ledger entries)
-- ═══════════════════════════════════════════

INSERT INTO transaction (id, user_id, type, amount, balance_after, source_type, source_id, description, created_at) VALUES
-- Signup bonuses
('tx_001', 'usr_01', 'SIGNUP_BONUS', 250, 250, 'SIGNUP', NULL, 'Welcome bonus for joining Cashive', '2024-11-15 08:31:00+00'),
('tx_002', 'usr_02', 'SIGNUP_BONUS', 250, 250, 'SIGNUP', NULL, 'Welcome bonus for joining Cashive', '2025-01-22 14:21:00+00'),
('tx_003', 'usr_07', 'SIGNUP_BONUS', 250, 250, 'SIGNUP', NULL, 'Welcome bonus for joining Cashive', '2026-03-11 06:01:00+00'),
('tx_004', 'usr_08', 'SIGNUP_BONUS', 250, 250, 'SIGNUP', NULL, 'Welcome bonus for joining Cashive', '2024-06-01 10:01:00+00'),

-- Marcus earnings
('tx_010', 'usr_01', 'OFFER_EARNING', 16157, 64800, 'OFFER', 'oc_01', 'Completed Rise of Kingdoms - Reach Stronghold Level 10 on Torox', '2025-12-02 14:22:00+00'),
('tx_011', 'usr_01', 'OFFER_EARNING', 31104, 142300, 'OFFER', 'oc_02', 'Completed Solitaire Cash - Deposit $45 on Torox', '2026-01-18 09:45:00+00'),
('tx_012', 'usr_01', 'OFFER_EARNING', 1279, 202100, 'OFFER', 'oc_03', 'Completed BitLabs survey - Consumer Preferences', '2026-03-10 11:30:00+00'),
('tx_013', 'usr_01', 'STREAK_BONUS', 200, 202300, 'STREAK', NULL, 'Day 5 streak bonus', '2026-03-10 11:31:00+00'),

-- Marcus referral commissions (earned because Aisha completed offers)
('tx_014', 'usr_01', 'REFERRAL_COMMISSION', 245, 202545, 'REFERRAL', 'oc_04', '15% referral commission from AishaP completing TikTok Lite offer', '2026-02-14 16:08:01+00'),

-- Marcus withdrawals
('tx_015', 'usr_01', 'WITHDRAWAL', -50000, 152545, 'WITHDRAWAL', 'wd_01', 'Withdrew $50.00 via PayPal', '2026-02-01 10:00:00+00'),
('tx_016', 'usr_01', 'WITHDRAWAL', -100000, 47320, 'WITHDRAWAL', 'wd_02', 'Withdrew $100.00 via Bitcoin', '2026-03-01 14:30:00+00'),

-- Aisha earnings
('tx_020', 'usr_02', 'OFFER_EARNING', 1717, 12500, 'OFFER', 'oc_04', 'Completed TikTok Lite - Android CPI on AdGem', '2026-02-14 16:08:00+00'),
('tx_021', 'usr_02', 'OFFER_EARNING', 538, 18650, 'OFFER', 'oc_05', 'Completed CPX Research survey - Market Trends', '2026-03-09 20:15:00+00'),

-- Diego earnings + chargeback
('tx_030', 'usr_03', 'OFFER_EARNING', 19890, 24200, 'OFFER', 'oc_06', 'Completed Chime - Open Free Checking Account on RevU', '2026-01-05 13:40:00+00'),
('tx_031', 'usr_03', 'OFFER_EARNING', 2448, 26648, 'OFFER', 'oc_07', 'Completed Dice Dreams - Reach level 20 on Torox', '2026-02-10 08:20:00+00'),
('tx_032', 'usr_03', 'CHARGEBACK', -2448, 24200, 'OFFER', 'oc_07', 'Chargeback: Dice Dreams completion reversed by advertiser', '2026-02-12 10:00:00+00'),
('tx_033', 'usr_03', 'WITHDRAWAL', -18000, 6200, 'WITHDRAWAL', 'wd_03', 'Withdrew $18.00 via Litecoin', '2026-02-20 08:00:00+00'),

-- Emma earnings
('tx_040', 'usr_04', 'SIGNUP_BONUS', 250, 250, 'SIGNUP', NULL, 'Welcome bonus for joining Cashive', '2026-02-28 09:16:00+00'),
('tx_041', 'usr_04', 'OFFER_EARNING', 408, 658, 'OFFER', 'oc_08', 'Completed PrimeSurveys - Household Spending Habits', '2026-03-09 18:00:00+00'),
('tx_042', 'usr_04', 'STREAK_BONUS', 50, 2480, 'STREAK', NULL, 'Day 1 streak bonus', '2026-03-10 22:41:00+00'),

-- WhaleGamer massive history
('tx_050', 'usr_08', 'OFFER_EARNING', 43008, 880000, 'OFFER', 'oc_11', 'Completed Solitaire Cash - $120 entry fees on Torox', '2026-03-05 15:30:00+00'),
('tx_051', 'usr_08', 'OFFER_EARNING', 16069, 896069, 'OFFER', 'oc_12', 'Completed Altroconsumo CPA IT on Adscend Media', '2026-03-08 12:10:00+00'),
('tx_052', 'usr_08', 'RACE_PRIZE', 10000, 906069, 'RACE', 'race_01', 'Won 1st place in Daily Race — $10.00 prize', '2026-03-09 00:01:00+00'),
('tx_053', 'usr_08', 'VIP_BONUS', 5000, 911069, 'VIP', NULL, 'Platinum weekly bonus', '2026-03-10 01:00:00+00'),
('tx_054', 'usr_08', 'WITHDRAWAL', -200000, 711069, 'WITHDRAWAL', 'wd_04', 'Withdrew $200.00 via PayPal', '2026-03-06 09:00:00+00'),

-- Promo code redemption by Marcus
('tx_060', 'usr_01', 'PROMO_CODE', 500, 203045, 'PROMO', 'promo_01', 'Redeemed promo code SPRING2026', '2026-03-01 12:00:00+00'),

-- Admin adjustment on suspicious user
('tx_070', 'usr_05', 'ADMIN_ADJUSTMENT', -500, 390, 'ADMIN', NULL, 'Manual deduction — suspicious rapid completions under review', '2026-02-18 09:00:00+00');


-- ═══════════════════════════════════════════
-- POSTBACK LOGS
-- ═══════════════════════════════════════════

INSERT INTO postback_log (id, provider_id, raw_url, source_ip, result, user_id, external_tx_id, processing_ms, created_at) VALUES
('pbl_01', 'prv_01', '/api/postback/torox?uid=usr_01&amount=18.70&tid=TRX-8847291-A&offer=rok_lvl10&sig=a8f2b1c3', '52.24.142.233', 'CREDITED', 'usr_01', 'TRX-8847291-A', 42, '2025-12-02 14:22:00+00'),
('pbl_02', 'prv_01', '/api/postback/torox?uid=usr_01&amount=18.70&tid=TRX-8847291-A&sig=a8f2b1c3', '52.24.142.233', 'DUPLICATE', 'usr_01', 'TRX-8847291-A', 3, '2025-12-02 14:23:00+00'),
('pbl_03', 'prv_02', '/api/postback/adgem?uid=usr_02&amount=2.18&tid=AGM-443871-D&sig=d4e5f6', '44.228.180.55', 'CREDITED', 'usr_02', 'AGM-443871-D', 38, '2026-02-14 16:08:00+00'),
('pbl_04', 'prv_01', '/api/postback/torox?uid=NONEXISTENT&amount=5.00&tid=TRX-FAKE-001&sig=bad', '203.0.113.50', 'REJECTED_IP', NULL, 'TRX-FAKE-001', 1, '2026-03-01 02:14:00+00'),
('pbl_05', 'prv_04', '/api/postback/revu?uid=usr_03&amount=25.00&tid=REV-556201-F&sig=x9y8z7', '52.32.88.194', 'CREDITED', 'usr_03', 'REV-556201-F', 55, '2026-01-05 13:40:00+00'),
('pbl_06', 'prv_01', '/api/postback/torox?uid=usr_03&amount=-3.00&tid=r-TRX-7712038-G&is_chargeback=1&reason=level+not+met', '52.24.142.233', 'CREDITED', 'usr_03', 'r-TRX-7712038-G', 31, '2026-02-12 10:00:00+00');


-- ═══════════════════════════════════════════
-- FEATURED OFFERS
-- ═══════════════════════════════════════════

INSERT INTO featured_offer (id, title, requirement, provider_name, poster_image_url, app_icon_url, reward_honey, category, completions, rating, is_active, sort_order) VALUES
('fo_01', 'Rise of Kingdoms',           'Reach Stronghold Level 10',             'Torox',    'https://cdn.cashive.gg/posters/rok.jpg',           'https://cdn.cashive.gg/icons/rok.png',       18700, 'Game',    342, 4.2, true, 1),
('fo_02', 'Solitaire Cash',             'Deposit total of $45 in 14 days',       'Torox',    'https://cdn.cashive.gg/posters/solitaire.jpg',     'https://cdn.cashive.gg/icons/solitaire.png', 36000, 'Game',    891, 4.5, true, 2),
('fo_03', 'State of Survival: Zombie War','Purchase Any $4.99 Package in 7 days','TyrAds',   'https://cdn.cashive.gg/posters/sos.jpg',           'https://cdn.cashive.gg/icons/sos.png',        3060, 'Game',    127, 3.8, true, 3),
('fo_04', 'Dice Dreams',                'Reach level 20',                        'Torox',    'https://cdn.cashive.gg/posters/dice_dreams.jpg',   'https://cdn.cashive.gg/icons/dice_dreams.png',3000, 'Game',    456, 4.0, true, 4),
('fo_05', 'TikTok Lite',                'Download and scroll 10 min first day',  'Aye-T',    'https://cdn.cashive.gg/posters/tiktok_lite.jpg',   'https://cdn.cashive.gg/icons/tiktok.png',     2180, 'App',     1204,4.7, true, 5),
('fo_06', 'Chime Checking Account',     'Open a free checking account',          'RevU',     'https://cdn.cashive.gg/posters/chime.jpg',         'https://cdn.cashive.gg/icons/chime.png',     30000, 'Signup',   89, 4.4, true, 6);


-- ═══════════════════════════════════════════
-- WITHDRAWALS
-- ═══════════════════════════════════════════

INSERT INTO withdrawal (id, user_id, method, amount_honey, amount_usd_cents, fee_usd_cents, paypal_email, crypto_address,
    status, reviewed_by, review_note, reviewed_at, external_payment_id, fraud_score_at_request, is_first_withdrawal, processed_at, created_at) VALUES
-- Marcus: completed PayPal
('wd_01', 'usr_01', 'PAYPAL', 50000, 5000, 0, 'marcus.thompson@gmail.com', NULL,
 'COMPLETED', 'adm_02', 'Clean account, auto-approved', '2026-02-01 10:05:00+00', 'PAYPAL-BATCH-4821-A', 2.0, true, '2026-02-01 10:08:00+00', '2026-02-01 10:00:00+00'),

-- Marcus: completed BTC
('wd_02', 'usr_01', 'BTC', 100000, 10000, 50, NULL, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
 'COMPLETED', NULL, NULL, NULL, '0xa4f2b891c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', 2.0, false, '2026-03-01 15:00:00+00', '2026-03-01 14:30:00+00'),

-- Diego: completed LTC
('wd_03', 'usr_03', 'LTC', 18000, 1800, 5, NULL, 'ltc1qr6ywk5g4m8j2n3p4q5r6s7t8u9v0w1x2y3z4',
 'COMPLETED', 'adm_02', 'First withdrawal — KYC approved, looks clean', '2026-02-20 08:15:00+00', 'LTC-TX-8829af41', 5.0, true, '2026-02-20 08:20:00+00', '2026-02-20 08:00:00+00'),

-- WhaleGamer: completed PayPal (large)
('wd_04', 'usr_08', 'PAYPAL', 200000, 20000, 0, 'whale.gamer@gmail.com', NULL,
 'COMPLETED', 'adm_01', 'Platinum VIP, trusted account, large payout approved', '2026-03-06 09:10:00+00', 'PAYPAL-BATCH-5102-C', 0.0, false, '2026-03-06 09:15:00+00', '2026-03-06 09:00:00+00'),

-- Aisha: pending withdrawal
('wd_05', 'usr_02', 'AMAZON', 10000, 1000, 0, NULL, NULL,
 'PENDING', NULL, NULL, NULL, NULL, 0.0, true, NULL, '2026-03-11 08:00:00+00');

UPDATE withdrawal SET gift_card_type = 'Amazon', gift_card_email = 'aisha.patel@outlook.com' WHERE id = 'wd_05';


-- ═══════════════════════════════════════════
-- KYC VERIFICATIONS
-- ═══════════════════════════════════════════

INSERT INTO kyc_verification (id, user_id, document_type, document_front_url, selfie_url, status, reviewed_by, rejection_reason, reviewed_at, submitted_at) VALUES
('kyc_01', 'usr_01', 'DRIVERS_LICENSE', '/uploads/kyc/usr_01/dl_front.jpg', '/uploads/kyc/usr_01/selfie.jpg', 'APPROVED', 'adm_02', NULL, '2026-01-31 15:00:00+00', '2026-01-31 10:00:00+00'),
('kyc_02', 'usr_03', 'NATIONAL_ID',     '/uploads/kyc/usr_03/id_front.jpg',  '/uploads/kyc/usr_03/selfie.jpg',  'APPROVED', 'adm_02', NULL, '2026-02-19 12:00:00+00', '2026-02-18 20:00:00+00'),
('kyc_03', 'usr_05', 'PASSPORT',        '/uploads/kyc/usr_05/passport.jpg',  '/uploads/kyc/usr_05/selfie.jpg',  'REJECTED', 'adm_02', 'Selfie does not match passport photo. Photo appears edited.', '2026-02-17 14:00:00+00', '2026-02-16 22:00:00+00'),
('kyc_04', 'usr_08', 'DRIVERS_LICENSE',  '/uploads/kyc/usr_08/dl_front.jpg',  '/uploads/kyc/usr_08/selfie.jpg',  'APPROVED', 'adm_01', NULL, '2024-06-05 09:00:00+00', '2024-06-04 18:00:00+00'),
('kyc_05', 'usr_02', 'PASSPORT',        '/uploads/kyc/usr_02/passport.jpg',  '/uploads/kyc/usr_02/selfie.jpg',  'PENDING',  NULL,     NULL, NULL, '2026-03-11 07:30:00+00');


-- ═══════════════════════════════════════════
-- RACES
-- ═══════════════════════════════════════════

INSERT INTO race (id, type, title, prize_pool_usd_cents, prize_distribution, starts_at, ends_at, status, finalized_at, created_at) VALUES
('race_01', 'DAILY', '$50 Daily Race — Mar 9', 5000,
 '[{"rank":1,"usd_cents":1000},{"rank":2,"usd_cents":700},{"rank":3,"usd_cents":500},{"min_rank":4,"max_rank":10,"usd_cents":200},{"min_rank":11,"max_rank":25,"usd_cents":100}]',
 '2026-03-09 00:00:00+00', '2026-03-10 00:00:00+00', 'COMPLETED', '2026-03-10 00:01:00+00', '2026-03-09 00:00:00+00'),

('race_02', 'DAILY', '$50 Daily Race — Mar 10', 5000,
 '[{"rank":1,"usd_cents":1000},{"rank":2,"usd_cents":700},{"rank":3,"usd_cents":500},{"min_rank":4,"max_rank":10,"usd_cents":200},{"min_rank":11,"max_rank":25,"usd_cents":100}]',
 '2026-03-10 00:00:00+00', '2026-03-11 00:00:00+00', 'COMPLETED', '2026-03-11 00:01:00+00', '2026-03-10 00:00:00+00'),

('race_03', 'DAILY', '$50 Daily Race — Mar 11', 5000,
 '[{"rank":1,"usd_cents":1000},{"rank":2,"usd_cents":700},{"rank":3,"usd_cents":500},{"min_rank":4,"max_rank":10,"usd_cents":200},{"min_rank":11,"max_rank":25,"usd_cents":100}]',
 '2026-03-11 00:00:00+00', '2026-03-12 00:00:00+00', 'ACTIVE', NULL, '2026-03-11 00:00:00+00'),

('race_04', 'MONTHLY', '$2,500 Monthly Race — March 2026', 250000,
 '[{"rank":1,"usd_cents":50000},{"rank":2,"usd_cents":25000},{"rank":3,"usd_cents":15000},{"min_rank":4,"max_rank":10,"usd_cents":5000},{"min_rank":11,"max_rank":25,"usd_cents":2000},{"min_rank":26,"max_rank":50,"usd_cents":1000}]',
 '2026-03-01 00:00:00+00', '2026-04-01 00:00:00+00', 'ACTIVE', NULL, '2026-03-01 00:00:00+00');

INSERT INTO race_entry (id, race_id, user_id, points, final_rank, prize_honey, created_at) VALUES
-- Yesterday's completed daily race (race_02)
('re_01', 'race_02', 'usr_08', 59077, 1, 10000, '2026-03-10 01:00:00+00'),
('re_02', 'race_02', 'usr_01', 17436, 2,  7000, '2026-03-10 02:00:00+00'),
('re_03', 'race_02', 'usr_02', 5380,  3,  5000, '2026-03-10 03:00:00+00'),
('re_04', 'race_02', 'usr_04',  458,  8,  2000, '2026-03-10 04:00:00+00'),

-- Today's active daily race (race_03)
('re_05', 'race_03', 'usr_08', 12400, NULL, NULL, '2026-03-11 01:00:00+00'),
('re_06', 'race_03', 'usr_01',  1279, NULL, NULL, '2026-03-11 06:00:00+00'),
('re_07', 'race_03', 'usr_07',   250, NULL, NULL, '2026-03-11 06:01:00+00'),

-- March monthly race (race_04)
('re_08', 'race_04', 'usr_08', 182400, NULL, NULL, '2026-03-01 01:00:00+00'),
('re_09', 'race_04', 'usr_01',  47320, NULL, NULL, '2026-03-01 02:00:00+00'),
('re_10', 'race_04', 'usr_02',  18650, NULL, NULL, '2026-03-01 03:00:00+00'),
('re_11', 'race_04', 'usr_03',   6200, NULL, NULL, '2026-03-01 04:00:00+00'),
('re_12', 'race_04', 'usr_04',   2480, NULL, NULL, '2026-03-01 05:00:00+00');


-- ═══════════════════════════════════════════
-- ACHIEVEMENTS
-- ═══════════════════════════════════════════

INSERT INTO achievement (id, slug, name, description, icon, color, criteria_type, criteria_value, sort_order) VALUES
('ach_01', 'first_task',      'First Task',        'Complete your first task on Cashive',             'CheckCircle',     '#F5A623', 'tasks_completed',   1,     1),
('ach_02', '10_tasks',        '10 Tasks',          'Complete 10 tasks',                               'CheckCircle',     '#F5A623', 'tasks_completed',   10,    2),
('ach_03', '50_tasks',        '50 Tasks',          'Complete 50 tasks',                               'CheckCircle',     '#F5A623', 'tasks_completed',   50,    3),
('ach_04', '100_tasks',       'Century',           'Complete 100 tasks',                              'Award',           '#F5A623', 'tasks_completed',   100,   4),
('ach_05', 'first_cashout',   'First Cashout',     'Make your first successful withdrawal',           'Wallet',          '#34C759', 'first_cashout',     1,     5),
('ach_06', 'earned_10',       '$10 Earned',        'Earn a lifetime total of $10',                    'DollarSign',      '#F5A623', 'lifetime_earned',   10000, 6),
('ach_07', 'earned_100',      '$100 Earned',       'Earn a lifetime total of $100',                   'DollarSign',      '#F5A623', 'lifetime_earned',   100000,7),
('ach_08', 'earned_500',      '$500 Earned',       'Earn a lifetime total of $500',                   'TrendingUp',      '#E8852D', 'lifetime_earned',   500000,8),
('ach_09', 'streak_7',        'Week Warrior',      'Maintain a 7-day earning streak',                 'Flame',           '#E8852D', 'streak_days',       7,     9),
('ach_10', 'streak_30',       'Monthly Machine',   'Maintain a 30-day earning streak',                'Flame',           '#FF4D6A', 'streak_days',       30,    10),
('ach_11', 'referral_1',      'Recruiter',         'Refer your first friend to Cashive',              'UserPlus',        '#F5A623', 'referral_count',    1,     11),
('ach_12', 'referral_10',     'Hive Builder',      'Refer 10 friends to Cashive',                     'Users',           '#E8852D', 'referral_count',    10,    12),
('ach_13', 'survey_50',       'Survey Star',       'Complete 50 surveys',                             'MessageSquare',   '#F5A623', 'surveys_completed', 50,    13),
('ach_14', 'earned_1000',     'Honey Tycoon',      'Earn a lifetime total of $1,000',                 'Crown',           '#B8D4E3', 'lifetime_earned',   1000000,14);

INSERT INTO user_achievement (id, user_id, achievement_id, earned_at) VALUES
-- Marcus: power user
('ua_01', 'usr_01', 'ach_01', '2024-11-16 09:00:00+00'),
('ua_02', 'usr_01', 'ach_02', '2024-12-01 14:00:00+00'),
('ua_03', 'usr_01', 'ach_03', '2025-03-10 18:00:00+00'),
('ua_04', 'usr_01', 'ach_04', '2025-08-22 11:00:00+00'),
('ua_05', 'usr_01', 'ach_05', '2026-02-01 10:08:00+00'),
('ua_06', 'usr_01', 'ach_06', '2024-12-20 09:00:00+00'),
('ua_07', 'usr_01', 'ach_07', '2025-06-15 16:00:00+00'),
('ua_08', 'usr_01', 'ach_09', '2025-04-12 08:00:00+00'),
('ua_09', 'usr_01', 'ach_11', '2025-01-22 14:21:00+00'),

-- Aisha: moderate
('ua_10', 'usr_02', 'ach_01', '2025-01-23 10:00:00+00'),
('ua_11', 'usr_02', 'ach_02', '2025-02-15 14:00:00+00'),
('ua_12', 'usr_02', 'ach_06', '2025-04-08 09:00:00+00'),
('ua_13', 'usr_02', 'ach_07', '2025-12-01 11:00:00+00'),
('ua_14', 'usr_02', 'ach_11', '2026-02-28 09:16:00+00'),

-- WhaleGamer: everything
('ua_20', 'usr_08', 'ach_01', '2024-06-02 08:00:00+00'),
('ua_21', 'usr_08', 'ach_02', '2024-06-10 14:00:00+00'),
('ua_22', 'usr_08', 'ach_03', '2024-07-15 09:00:00+00'),
('ua_23', 'usr_08', 'ach_04', '2024-09-01 16:00:00+00'),
('ua_24', 'usr_08', 'ach_05', '2024-06-06 10:00:00+00'),
('ua_25', 'usr_08', 'ach_06', '2024-06-05 09:00:00+00'),
('ua_26', 'usr_08', 'ach_07', '2024-07-02 14:00:00+00'),
('ua_27', 'usr_08', 'ach_08', '2024-10-18 11:00:00+00'),
('ua_28', 'usr_08', 'ach_09', '2024-07-08 08:00:00+00'),
('ua_29', 'usr_08', 'ach_10', '2024-08-01 08:00:00+00'),
('ua_30', 'usr_08', 'ach_14', '2025-04-20 15:00:00+00'),

-- Emma: just started
('ua_31', 'usr_04', 'ach_01', '2026-03-09 18:00:00+00');


-- ═══════════════════════════════════════════
-- PROMO CODES
-- ═══════════════════════════════════════════

INSERT INTO promo_code (id, code, reward_honey, max_uses, used_count, requires_min_earnings, min_earnings_honey, is_active, expires_at, created_by) VALUES
('promo_01', 'SPRING2026',   500,  1000, 247, false, 0,    true,  '2026-04-01 00:00:00+00', 'adm_01'),
('promo_02', 'WELCOME500',   500,  NULL, 1843, false, 0,   true,  NULL, 'adm_01'),
('promo_03', 'VIP2X',        2000, 100,  34,  true,  25000, true,  '2026-03-31 00:00:00+00', 'adm_01'),
('promo_04', 'EXPIRED2025',  1000, 500,  412, false, 0,    false, '2025-12-31 00:00:00+00', 'adm_01');

INSERT INTO promo_redemption (id, user_id, promo_code_id, redeemed_at) VALUES
('pr_01', 'usr_01', 'promo_01', '2026-03-01 12:00:00+00'),
('pr_02', 'usr_02', 'promo_02', '2025-01-22 14:25:00+00'),
('pr_03', 'usr_08', 'promo_01', '2026-03-02 09:00:00+00'),
('pr_04', 'usr_08', 'promo_03', '2026-03-05 11:00:00+00');


-- ═══════════════════════════════════════════
-- REFERRAL EARNINGS
-- ═══════════════════════════════════════════

INSERT INTO referral_earning (id, referrer_id, earner_id, offer_completion_id, earner_reward_honey, commission_pct, commission_honey, transaction_id, created_at) VALUES
('rfe_01', 'usr_01', 'usr_02', 'oc_04', 1635, 15, 245, 'tx_014', '2026-02-14 16:08:01+00'),
('rfe_02', 'usr_01', 'usr_02', 'oc_05', 512,  15, 77,  'tx_014', '2026-03-09 20:15:01+00'),
('rfe_03', 'usr_01', 'usr_03', 'oc_06', 19500, 15, 2925, 'tx_014', '2026-01-05 13:40:01+00'),
('rfe_04', 'usr_02', 'usr_04', 'oc_08', 408,  10, 41,  'tx_021', '2026-03-09 18:00:01+00');


-- ═══════════════════════════════════════════
-- SURVEY PROFILES
-- ═══════════════════════════════════════════

INSERT INTO survey_profile (id, user_id, age, gender, education, employment_status, income_range, interests, household_size, has_children, marital_status, industry, completion_pct) VALUES
('sp_01', 'usr_01', 28, 'Male',   'Bachelors Degree', 'Employed Full-Time', '$50,000-$74,999', ARRAY['gaming','technology','sports','finance'], 2, false, 'Single', 'Technology', 100),
('sp_02', 'usr_02', 34, 'Female', 'Masters Degree',   'Employed Full-Time', '$75,000-$99,999', ARRAY['travel','cooking','fashion','health'],     3, true,  'Married', 'Healthcare', 90),
('sp_03', 'usr_04', 22, 'Female', 'Some College',     'Student',            'Under $15,000',   ARRAY['music','gaming','social media'],            1, false, 'Single', NULL, 60),
('sp_04', 'usr_08', 41, 'Male',   'Masters Degree',   'Self-Employed',      '$150,000+',       ARRAY['gaming','investing','crypto','travel','tech'], 4, true, 'Married', 'Finance', 100);


-- ═══════════════════════════════════════════
-- CHAT MESSAGES
-- ═══════════════════════════════════════════

INSERT INTO chat_message (id, user_id, room, content, is_system_message, created_at) VALUES
('msg_01', 'usr_08', 'general', 'just hit platinum tier lets gooooo',                               false, '2026-03-10 18:00:00+00'),
('msg_02', 'usr_01', 'general', 'congrats! how much did you earn this month?',                      false, '2026-03-10 18:00:45+00'),
('msg_03', 'usr_08', 'general', 'about $400 so far, solitaire cash offers are insane rn',           false, '2026-03-10 18:01:20+00'),
('msg_04', 'usr_02', 'general', 'anyone else having trouble with the BitLabs surveys today?',       false, '2026-03-10 18:02:00+00'),
('msg_05', 'usr_04', 'general', 'yeah i got disqualified from like 5 in a row lol',                 false, '2026-03-10 18:02:30+00'),
('msg_06', 'usr_01', 'general', 'try CPX instead, theyve been way more consistent for me',          false, '2026-03-10 18:03:10+00'),
('msg_07', 'usr_02', 'general', 'good call ill try that, thanks marcus',                            false, '2026-03-10 18:03:45+00'),
('msg_08', 'usr_05', 'general', 'FREE MONEY AT bit.ly/scamlink CHECK IT OUT!!!',                    false, '2026-03-10 18:04:00+00'),
('msg_09', 'usr_03', 'general', 'anyone know how long kyc takes? submitted mine 2 days ago',        false, '2026-03-10 18:05:30+00'),
('msg_10', 'usr_01', 'general', 'mine took about a day, shouldnt be long',                          false, '2026-03-10 18:06:00+00');

-- Delete the spam message
UPDATE chat_message SET is_deleted = true, deleted_by = 'adm_03' WHERE id = 'msg_08';

-- System message
INSERT INTO chat_message (id, user_id, room, content, is_system_message, created_at) VALUES
('msg_11', 'usr_08', 'general', 'WhaleGamer won 1st place in the Daily Race!', true, '2026-03-10 00:01:00+00');

-- Report on the spam message
INSERT INTO chat_report (id, message_id, reported_by, reason, detail, status, reviewed_by, created_at, reviewed_at) VALUES
('cr_01', 'msg_08', 'usr_01', 'SPAM', 'Posting scam links in chat', 'REVIEWED', 'adm_03', '2026-03-10 18:04:15+00', '2026-03-10 18:06:00+00'),
('cr_02', 'msg_08', 'usr_02', 'SPAM', NULL, 'REVIEWED', 'adm_03', '2026-03-10 18:04:30+00', '2026-03-10 18:06:00+00');


-- ═══════════════════════════════════════════
-- SUPPORT TICKETS
-- ═══════════════════════════════════════════

INSERT INTO support_ticket (id, user_id, subject, category, status, priority, assigned_to, related_offer_id, created_at, updated_at) VALUES
('tkt_01', 'usr_03', 'Dice Dreams offer reversed unfairly', 'OFFER_NOT_CREDITED', 'RESOLVED', 'NORMAL', 'adm_04', 'oc_07', '2026-02-12 12:00:00+00', '2026-02-13 16:00:00+00'),
('tkt_02', 'usr_05', 'KYC rejected but my documents are real', 'KYC', 'IN_PROGRESS', 'HIGH', 'adm_04', NULL, '2026-02-17 15:00:00+00', '2026-02-18 10:00:00+00'),
('tkt_03', 'usr_02', 'Amazon gift card withdrawal pending for 3 days', 'WITHDRAWAL', 'OPEN', 'NORMAL', NULL, NULL, '2026-03-11 09:00:00+00', '2026-03-11 09:00:00+00');

INSERT INTO support_message (id, ticket_id, sender_id, is_admin, content, created_at) VALUES
-- Ticket 1: Diego's reversed offer
('sm_01', 'tkt_01', 'usr_03', false, 'Hi, my Dice Dreams offer was reversed but I definitely reached level 20. I have screenshots to prove it. Can you please look into this?', '2026-02-12 12:00:00+00'),
('sm_02', 'tkt_01', 'adm_04', true,  'Hi Diego, thanks for reaching out. I can see the reversal came from the advertiser side (Torox). Could you please share your screenshots showing the level 20 completion and the date you reached it?', '2026-02-12 14:30:00+00'),
('sm_03', 'tkt_01', 'usr_03', false, 'Here are my screenshots. You can see I hit level 20 on Feb 9th, which was within the time limit.', '2026-02-12 16:00:00+00'),
('sm_04', 'tkt_01', 'adm_04', true,  'Thank you for the proof. Unfortunately the advertiser has confirmed the reversal on their end and we cannot override their decision. The reversal stands. However, I have noted this on your account so it will not affect your fraud score. I apologize for the inconvenience.', '2026-02-13 16:00:00+00'),

-- Ticket 2: Alex's KYC issue
('sm_05', 'tkt_02', 'usr_05', false, 'My KYC was rejected but I submitted my real passport. What is the problem?', '2026-02-17 15:00:00+00'),
('sm_06', 'tkt_02', 'adm_04', true,  'Hello, your KYC was rejected because the selfie did not appear to match the passport photo, and the image quality suggested possible editing. Could you please resubmit with a clear, unedited selfie taken in good lighting? Make sure your full face is visible and matches your document photo.', '2026-02-18 10:00:00+00'),

-- Ticket 3: Aisha's pending withdrawal
('sm_07', 'tkt_03', 'usr_02', false, 'Hi, I submitted an Amazon gift card withdrawal 3 hours ago and it is still pending. My KYC is currently being reviewed — is that holding it up?', '2026-03-11 09:00:00+00');


-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════

INSERT INTO notification (id, user_id, type, title, body, link, icon, is_read, created_at) VALUES
('ntf_01', 'usr_01', 'offer_credited',       'Offer Completed!',       'You earned 1,279 Honey from BitLabs survey',       '/profile',   'CheckCircle',    true,  '2026-03-10 11:30:00+00'),
('ntf_02', 'usr_01', 'referral_commission',   'Referral Commission',    'You earned 77 Honey from AishaP completing a survey', '/referrals', 'Users',         false, '2026-03-09 20:15:01+00'),
('ntf_03', 'usr_08', 'race_ended',            'Daily Race Results',     'You won 1st place in the Daily Race! $10.00 prize credited.', '/races', 'Trophy',   true,  '2026-03-10 00:01:00+00'),
('ntf_04', 'usr_08', 'vip_change',            'VIP Tier Upgraded!',     'Congratulations! You have been promoted to Platinum tier.', '/rewards', 'Crown',    true,  '2026-03-01 01:00:00+00'),
('ntf_05', 'usr_04', 'streak_reminder',       'Keep Your Streak!',      'Earn any Honey today to maintain your 2-day streak!', '/earn',     'Flame',         false, '2026-03-11 09:00:00+00'),
('ntf_06', 'usr_04', 'achievement_earned',    'Achievement Unlocked!',  'You earned the "First Task" badge!',               '/profile',   'Award',          true,  '2026-03-09 18:00:00+00'),
('ntf_07', 'usr_03', 'withdrawal_complete',   'Withdrawal Complete',    'Your $18.00 LTC withdrawal has been processed.',   '/cashout',   'Wallet',         true,  '2026-02-20 08:20:00+00'),
('ntf_08', 'usr_05', 'offer_credited',        'Offer Completed!',       'You earned 584 Honey from Lootably offer',         '/profile',   'CheckCircle',    true,  '2026-02-15 04:12:00+00'),
('ntf_09', 'usr_02', 'withdrawal_complete',   'Withdrawal Submitted',   'Your $10.00 Amazon gift card withdrawal is being reviewed.', '/cashout', 'Clock', false, '2026-03-11 08:00:00+00');


-- ═══════════════════════════════════════════
-- DEVICE FINGERPRINTS
-- ═══════════════════════════════════════════

INSERT INTO device_fingerprint (id, user_id, fingerprint_hash, user_agent, screen_resolution, timezone, ip, ip_type, ip_country, ip_fraud_score, is_signup_device, first_seen_at, last_seen_at) VALUES
('df_01', 'usr_01', 'fp_a1b2c3d4e5f6a7b8', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0', '1920x1080', 'America/New_York',     '74.125.224.72',    'RESIDENTIAL', 'US', 0.5,  true, '2024-11-15 08:30:00+00', '2026-03-10 19:45:00+00'),
('df_02', 'usr_02', 'fp_c3d4e5f6a7b8c9d0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.3', '2560x1440', 'Europe/London',  '82.132.248.56',    'RESIDENTIAL', 'GB', 0.2,  true, '2025-01-22 14:20:00+00', '2026-03-10 16:12:00+00'),
('df_03', 'usr_03', 'fp_e5f6a7b8c9d0e1f2', 'Mozilla/5.0 (Linux; Android 14) Chrome/122.0 Mobile', '1080x2400', 'America/Sao_Paulo',       '177.38.44.12',     'RESIDENTIAL', 'BR', 1.8,  true, '2025-06-10 22:00:00+00', '2026-03-08 10:30:00+00'),
('df_04', 'usr_05', 'fp_bad1bad2bad3bad4',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/122.0', '1920x1080', 'Europe/Berlin',        '185.220.101.34',   'TOR',         'DE', 85.0, true, '2025-09-03 03:45:00+00', '2026-02-22 08:10:00+00'),
('df_05', 'usr_06', 'fp_bad1bad2bad3bad4',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', '1920x1080', 'Asia/Kolkata',          '49.37.152.88',     'VPN',         'IN', 72.0, true, '2025-04-02 12:00:00+00', '2025-12-15 06:00:00+00'),
('df_06', 'usr_08', 'fp_g7h8i9j0k1l2m3n4', 'Mozilla/5.0 (Macintosh; Apple M2) Chrome/123.0', '3456x2234', 'America/Los_Angeles',            '172.58.192.44',    'RESIDENTIAL', 'US', 0.1,  true, '2024-06-01 10:00:00+00', '2026-03-10 23:55:00+00'),
('df_07', 'usr_07', 'fp_o5p6q7r8s9t0u1v2', 'Mozilla/5.0 (Linux; Android 13; Samsung SM-A546B) Chrome/121.0 Mobile', '1080x2340', 'Asia/Karachi', '39.62.18.104', 'RESIDENTIAL', 'PK', 3.2, true, '2026-03-11 06:00:00+00', '2026-03-11 06:05:00+00');

-- NOTE: usr_05 and usr_06 share the same fingerprint hash (fp_bad1bad2bad3bad4) — this is the multi-account signal


-- ═══════════════════════════════════════════
-- FRAUD EVENTS
-- ═══════════════════════════════════════════

INSERT INTO fraud_event (id, user_id, event_type, score_impact, score_after, detail, evidence, created_at) VALUES
('fe_01', 'usr_05', 'VPN_DETECTED',        25.0, 25.0, 'Tor exit node detected at signup',
 '{"ip":"185.220.101.34","ip_type":"TOR","ip_fraud_score":85.0}', '2025-09-03 03:45:00+00'),
('fe_02', 'usr_05', 'MULTI_ACCOUNT_DEVICE', 40.0, 65.0, 'Device fingerprint fp_bad1bad2bad3bad4 matches banned user CheatMaster (usr_06)',
 '{"fingerprint":"fp_bad1bad2bad3bad4","matching_user":"usr_06","matching_user_banned":true}', '2025-09-03 03:46:00+00'),
('fe_03', 'usr_05', 'KYC_REJECTED',         10.0, 55.0, 'KYC selfie did not match passport — possible photo editing detected',
 '{"kyc_id":"kyc_03","rejection_reason":"Selfie does not match passport photo"}', '2026-02-17 14:00:00+00'),
-- Score decayed from 65 → 60 → 55 over two months of partial clean behavior

('fe_04', 'usr_06', 'VPN_DETECTED',         25.0, 25.0, 'VPN detected at signup from Indian IP range',
 '{"ip":"49.37.152.88","ip_type":"VPN","ip_fraud_score":72.0}', '2025-04-02 12:00:00+00'),
('fe_05', 'usr_06', 'MULTI_ACCOUNT_IP',     30.0, 55.0, 'IP 49.37.152.88 also used by 2 other accounts',
 '{"ip":"49.37.152.88","other_accounts":["usr_banned_old1","usr_banned_old2"]}', '2025-04-02 12:01:00+00'),
('fe_06', 'usr_06', 'RAPID_COMPLETIONS',    20.0, 75.0, '14 offers completed in 3 minutes — automated behavior suspected',
 '{"offers_count":14,"timespan_seconds":180,"provider":"lootably"}', '2025-05-18 02:30:00+00'),
('fe_07', 'usr_06', 'CHARGEBACK',           15.0, 90.0, 'Chargeback received from Torox for 3 offers',
 '{"chargebacks":3,"provider":"torox","total_reversed_honey":18400}', '2025-06-01 10:00:00+00'),

('fe_08', 'usr_03', 'CHARGEBACK',            5.0, 5.0, 'Single chargeback from Torox — Dice Dreams offer reversed by advertiser (not user fault)',
 '{"offer_completion_id":"oc_07","provider":"torox","amount_reversed":2448}', '2026-02-12 10:00:00+00');


-- ═══════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════

INSERT INTO audit_log (id, admin_id, action, target_type, target_id, before_state, after_state, ip, created_at) VALUES
('al_01', 'adm_02', 'approve_withdrawal', 'withdrawal', 'wd_01',
 '{"status":"PENDING"}', '{"status":"APPROVED","review_note":"Clean account, auto-approved"}',
 '10.0.0.5', '2026-02-01 10:05:00+00'),

('al_02', 'adm_02', 'approve_kyc', 'kyc_verification', 'kyc_01',
 '{"status":"PENDING"}', '{"status":"APPROVED"}',
 '10.0.0.5', '2026-01-31 15:00:00+00'),

('al_03', 'adm_02', 'reject_kyc', 'kyc_verification', 'kyc_03',
 '{"status":"PENDING"}', '{"status":"REJECTED","rejection_reason":"Selfie does not match passport photo. Photo appears edited."}',
 '10.0.0.5', '2026-02-17 14:00:00+00'),

('al_04', 'adm_01', 'ban_user', 'user', 'usr_06',
 '{"is_banned":false,"fraud_score":90.0}', '{"is_banned":true,"ban_reason":"Multiple account fraud detected via device fingerprint matching"}',
 '10.0.0.2', '2025-12-15 07:00:00+00'),

('al_05', 'adm_03', 'delete_chat_message', 'chat_message', 'msg_08',
 '{"content":"FREE MONEY AT bit.ly/scamlink CHECK IT OUT!!!","is_deleted":false}', '{"is_deleted":true}',
 '10.0.0.8', '2026-03-10 18:06:00+00'),

('al_06', 'adm_01', 'create_promo_code', 'promo_code', 'promo_01',
 NULL, '{"code":"SPRING2026","reward_honey":500,"max_uses":1000}',
 '10.0.0.2', '2026-02-28 16:00:00+00'),

('al_07', 'adm_01', 'adjust_balance', 'user', 'usr_05',
 '{"balance_honey":890}', '{"balance_honey":390,"reason":"Manual deduction — suspicious rapid completions under review"}',
 '10.0.0.2', '2026-02-18 09:00:00+00');


-- ═══════════════════════════════════════════
-- PLATFORM SETTINGS
-- ═══════════════════════════════════════════

INSERT INTO platform_setting (key, value, type, category, description, updated_by) VALUES
('min_withdrawal_paypal_cents',    '500',   'INT',     'WITHDRAWALS', 'Minimum PayPal withdrawal in USD cents',                    'adm_01'),
('min_withdrawal_crypto_cents',    '200',   'INT',     'WITHDRAWALS', 'Minimum crypto withdrawal in USD cents',                     'adm_01'),
('min_withdrawal_ltc_cents',       '50',    'INT',     'WITHDRAWALS', 'Minimum LTC withdrawal in USD cents',                        'adm_01'),
('min_withdrawal_giftcard_cents',  '500',   'INT',     'WITHDRAWALS', 'Minimum gift card withdrawal in USD cents',                  'adm_01'),
('min_earning_before_first_wd',    '2500',  'INT',     'WITHDRAWALS', 'Minimum lifetime earned honey before first withdrawal allowed', 'adm_01'),
('max_daily_withdrawal_cents',     '20000', 'INT',     'WITHDRAWALS', 'Maximum daily withdrawal in USD cents',                      'adm_01'),
('paypal_fee_pct',                 '0',     'INT',     'WITHDRAWALS', 'PayPal withdrawal fee percentage (0-100)',                   'adm_01'),
('daily_race_prize_pool_cents',    '5000',  'INT',     'RACES',       'Daily race total prize pool in USD cents',                   'adm_01'),
('monthly_race_prize_pool_cents',  '250000','INT',     'RACES',       'Monthly race total prize pool in USD cents',                 'adm_01'),
('streak_rewards_json',            '[50,75,100,150,200,300,500]', 'JSON', 'STREAKS', 'Honey reward per streak day (7-day cycle)', 'adm_01'),
('vip_bronze_threshold',           '5000',  'INT',     'VIP',         'Monthly earning in honey to reach Bronze',                   'adm_01'),
('vip_silver_threshold',           '25000', 'INT',     'VIP',         'Monthly earning in honey to reach Silver',                   'adm_01'),
('vip_gold_threshold',             '75000', 'INT',     'VIP',         'Monthly earning in honey to reach Gold',                     'adm_01'),
('vip_platinum_threshold',         '200000','INT',     'VIP',         'Monthly earning in honey to reach Platinum',                 'adm_01'),
('vip_bronze_bonus_pct',           '2',     'INT',     'VIP',         'Bronze tier offer bonus percentage',                         'adm_01'),
('vip_silver_bonus_pct',           '5',     'INT',     'VIP',         'Silver tier offer bonus percentage',                         'adm_01'),
('vip_gold_bonus_pct',             '8',     'INT',     'VIP',         'Gold tier offer bonus percentage',                           'adm_01'),
('vip_platinum_bonus_pct',         '12',    'INT',     'VIP',         'Platinum tier offer bonus percentage',                       'adm_01'),
('referral_tier1_pct',             '5',     'INT',     'REFERRALS',   'Commission percentage for referral tier 1 (0-4 active refs)', 'adm_01'),
('referral_tier2_pct',             '10',    'INT',     'REFERRALS',   'Commission percentage for referral tier 2 (5-14 active refs)','adm_01'),
('referral_tier3_pct',             '15',    'INT',     'REFERRALS',   'Commission percentage for referral tier 3 (15-29 active refs)','adm_01'),
('referral_tier4_pct',             '20',    'INT',     'REFERRALS',   'Commission percentage for referral tier 4 (30+ active refs)', 'adm_01'),
('referral_active_threshold',      '1000',  'INT',     'REFERRALS',   'Honey earned in 30 days to count as active referral',        'adm_01'),
('signup_bonus_honey',             '250',   'INT',     'GENERAL',     'Honey credited to new users at signup',                      'adm_01'),
('chat_min_level',                 '2',     'INT',     'GENERAL',     'Minimum user level required to send chat messages',          'adm_01'),
('chat_rate_limit_seconds',        '3',     'INT',     'GENERAL',     'Seconds between allowed chat messages per user',             'adm_01'),
('fraud_auto_ban_threshold',       '80',    'INT',     'GENERAL',     'Fraud score at which user is auto-banned',                   'adm_01'),
('fraud_review_threshold',         '30',    'INT',     'GENERAL',     'Fraud score above which withdrawals require manual review',  'adm_01');


-- ═══════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════
-- Verify table count:
-- SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 22 tables