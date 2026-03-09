// Mock data for the cashive.gg platform
// All provider/app references use image URLs (real logos) or initials-based placeholders — NO emojis.

// Helper to generate a placeholder image URL using the provider's initials
export function providerImage(name: string): string {
  // In production, these would be real logo URLs from an asset CDN or offerwall API.
  // For now, we return a placeholder path that the UI will handle with an initials fallback.
  return `/providers/${name.toLowerCase().replace(/\s+/g, "-")}.png`;
}

export function appImage(name: string): string {
  return `/apps/${name.toLowerCase().replace(/\s+/g, "-")}.png`;
}

export function paymentImage(name: string): string {
  return `/payments/${name.toLowerCase().replace(/\s+/g, "-")}.png`;
}

// ─── Featured Tasks ──────────────────────────────────────────────

export const featuredTasks = [
  {
    id: 1,
    title: "State of Survival: Zombie War",
    requirement: "Reach Stronghold Level 10",
    provider: "TyrAds",
    image: appImage("state-of-survival"),
    reward: 3060,
    difficulty: "Medium" as const,
    estimatedTime: "3-5 days",
    category: "Game",
  },
  {
    id: 2,
    title: "Raid: Shadow Legends",
    requirement: "Reach Player Level 30",
    provider: "AdGem",
    image: appImage("raid-shadow-legends"),
    reward: 5200,
    difficulty: "Hard" as const,
    estimatedTime: "7-10 days",
    category: "Game",
  },
  {
    id: 3,
    title: "Coin Master",
    requirement: "Reach Village Level 8",
    provider: "Torox",
    image: appImage("coin-master"),
    reward: 1850,
    difficulty: "Easy" as const,
    estimatedTime: "1-2 days",
    category: "Game",
  },
  {
    id: 4,
    title: "Rise of Kingdoms",
    requirement: "Reach City Hall Level 15",
    provider: "Lootably",
    image: appImage("rise-of-kingdoms"),
    reward: 7500,
    difficulty: "Hard" as const,
    estimatedTime: "10-14 days",
    category: "Game",
  },
  {
    id: 5,
    title: "Merge Dragons",
    requirement: "Complete Challenge 6",
    provider: "RevU",
    image: appImage("merge-dragons"),
    reward: 2100,
    difficulty: "Medium" as const,
    estimatedTime: "2-3 days",
    category: "Game",
  },
];

// ─── All Tasks (aggregated feed for /tasks page) ─────────────────

export const allTasks = [
  {
    id: 101,
    title: "State of Survival: Zombie War",
    requirement: "Reach Stronghold Level 10",
    provider: "TyrAds",
    image: appImage("state-of-survival"),
    reward: 3060,
    difficulty: "Medium" as const,
    estimatedTime: "3-5 days",
    category: "Game",
    popularity: 95,
  },
  {
    id: 102,
    title: "Raid: Shadow Legends",
    requirement: "Reach Player Level 30",
    provider: "AdGem",
    image: appImage("raid-shadow-legends"),
    reward: 5200,
    difficulty: "Hard" as const,
    estimatedTime: "7-10 days",
    category: "Game",
    popularity: 90,
  },
  {
    id: 103,
    title: "Coin Master",
    requirement: "Reach Village Level 8",
    provider: "Torox",
    image: appImage("coin-master"),
    reward: 1850,
    difficulty: "Easy" as const,
    estimatedTime: "1-2 days",
    category: "Game",
    popularity: 88,
  },
  {
    id: 104,
    title: "Rise of Kingdoms",
    requirement: "Reach City Hall Level 15",
    provider: "Lootably",
    image: appImage("rise-of-kingdoms"),
    reward: 7500,
    difficulty: "Hard" as const,
    estimatedTime: "10-14 days",
    category: "Game",
    popularity: 85,
  },
  {
    id: 105,
    title: "Solitaire Cash",
    requirement: "Single Purchase of $20 or more",
    provider: "Torox",
    image: appImage("solitaire-cash"),
    reward: 4500,
    difficulty: "Easy" as const,
    estimatedTime: "10 min",
    category: "Deposits",
    popularity: 80,
  },
  {
    id: 106,
    title: "Mistplay",
    requirement: "Install & play for 30 minutes",
    provider: "AdGem",
    image: appImage("mistplay"),
    reward: 350,
    difficulty: "Easy" as const,
    estimatedTime: "30 min",
    category: "Apps",
    popularity: 75,
  },
  {
    id: 107,
    title: "NordVPN",
    requirement: "Sign up for free trial",
    provider: "RevU",
    image: appImage("nordvpn"),
    reward: 2800,
    difficulty: "Easy" as const,
    estimatedTime: "5 min",
    category: "Free Trials",
    popularity: 82,
  },
  {
    id: 108,
    title: "Age of Empires Mobile",
    requirement: "Reach Era 3",
    provider: "Lootably",
    image: appImage("age-of-empires"),
    reward: 6100,
    difficulty: "Hard" as const,
    estimatedTime: "7-14 days",
    category: "Game",
    popularity: 78,
  },
  {
    id: 109,
    title: "DraftKings",
    requirement: "Deposit $5 or more",
    provider: "OfferToro",
    image: appImage("draftkings"),
    reward: 8200,
    difficulty: "Easy" as const,
    estimatedTime: "10 min",
    category: "Casino",
    popularity: 92,
  },
  {
    id: 110,
    title: "HelloFresh",
    requirement: "Complete first box order",
    provider: "AdGate",
    image: appImage("hellofresh"),
    reward: 3500,
    difficulty: "Easy" as const,
    estimatedTime: "5 min",
    category: "Sign-ups",
    popularity: 70,
  },
  {
    id: 111,
    title: "Merge Dragons",
    requirement: "Complete Challenge 6",
    provider: "RevU",
    image: appImage("merge-dragons"),
    reward: 2100,
    difficulty: "Medium" as const,
    estimatedTime: "2-3 days",
    category: "Game",
    popularity: 72,
  },
  {
    id: 112,
    title: "Audible",
    requirement: "Start 30-day free trial",
    provider: "AdGem",
    image: appImage("audible"),
    reward: 1950,
    difficulty: "Easy" as const,
    estimatedTime: "5 min",
    category: "Free Trials",
    popularity: 68,
  },
  {
    id: 113,
    title: "Star Trek Fleet Command",
    requirement: "Reach Operations Level 20",
    provider: "TyrAds",
    image: appImage("star-trek"),
    reward: 4800,
    difficulty: "Hard" as const,
    estimatedTime: "5-7 days",
    category: "Game",
    popularity: 65,
  },
  {
    id: 114,
    title: "Swagbucks Quiz",
    requirement: "Complete 5 quizzes",
    provider: "Torox",
    image: appImage("swagbucks"),
    reward: 200,
    difficulty: "Easy" as const,
    estimatedTime: "15 min",
    category: "Quizzes",
    popularity: 60,
  },
  {
    id: 115,
    title: "Jackpocket Lottery",
    requirement: "Deposit $10 and purchase a ticket",
    provider: "OfferToro",
    image: appImage("jackpocket"),
    reward: 5500,
    difficulty: "Easy" as const,
    estimatedTime: "10 min",
    category: "Casino",
    popularity: 77,
  },
];

// ─── Offer Walls ─────────────────────────────────────────────────

export const offerWalls = [
  { id: 1, name: "Torox", bonus: 80, image: providerImage("torox"), offers: 342 },
  { id: 2, name: "AdGem", bonus: 0, image: providerImage("adgem"), offers: 215 },
  { id: 3, name: "Lootably", bonus: 50, image: providerImage("lootably"), offers: 189 },
  { id: 4, name: "RevU", bonus: 30, image: providerImage("revu"), offers: 276 },
  { id: 5, name: "AyeT Studios", bonus: 20, image: providerImage("ayet-studios"), offers: 154 },
  { id: 6, name: "OfferToro", bonus: 65, image: providerImage("offertoro"), offers: 198 },
  { id: 7, name: "AdGate", bonus: 40, image: providerImage("adgate"), offers: 167 },
  { id: 8, name: "TimeWall", bonus: 0, image: providerImage("timewall"), offers: 93 },
];

// ─── Survey Walls ────────────────────────────────────────────────

export const surveyWalls = [
  { id: 1, name: "BitLabs", bonus: 0, image: providerImage("bitlabs"), avgPayout: 850, available: 120, payoutRange: "$0.60 - $3.00" },
  { id: 2, name: "CPX Research", bonus: 25, image: providerImage("cpx-research"), avgPayout: 650, available: 89, payoutRange: "$0.40 - $2.00" },
  { id: 3, name: "TheoremReach", bonus: 0, image: providerImage("theoremreach"), avgPayout: 500, available: 42, payoutRange: "$0.30 - $1.00" },
  { id: 4, name: "PrimeSurveys", bonus: 15, image: providerImage("primesurveys"), avgPayout: 720, available: 65, payoutRange: "$0.30 - $2.00" },
  { id: 5, name: "Pollfish", bonus: 10, image: providerImage("pollfish"), avgPayout: 400, available: 55, payoutRange: "$0.40 - $1.00" },
];

// ─── Watch Walls ─────────────────────────────────────────────────

export const watchWalls = [
  { id: 1, name: "MM Watch", bonus: 0, image: providerImage("mm-watch"), perVideo: 5 },
  { id: 2, name: "AdScend", bonus: 0, image: providerImage("adscend"), perVideo: 8 },
  { id: 3, name: "HideoutTV", bonus: 0, image: providerImage("hideout-tv"), perVideo: 3 },
];

// ─── Withdrawal Options ──────────────────────────────────────────

export const withdrawalOptions = [
  {
    id: 1,
    name: "PayPal",
    category: "PayPal",
    image: paymentImage("paypal"),
    minAmount: 5,
    fee: 0,
    deliveryTime: "Instant",
    denominations: null,
  },
  {
    id: 2,
    name: "Bitcoin",
    category: "Crypto",
    image: paymentImage("bitcoin"),
    minAmount: 2,
    fee: 0.5,
    deliveryTime: "10-30 minutes",
    denominations: null,
  },
  {
    id: 3,
    name: "Ethereum",
    category: "Crypto",
    image: paymentImage("ethereum"),
    minAmount: 2,
    fee: 1.0,
    deliveryTime: "5-15 minutes",
    denominations: null,
  },
  {
    id: 4,
    name: "Litecoin",
    category: "Crypto",
    image: paymentImage("litecoin"),
    minAmount: 2,
    fee: 0.1,
    deliveryTime: "5-15 minutes",
    denominations: null,
  },
  {
    id: 5,
    name: "USDT (TRC20)",
    category: "Crypto",
    image: paymentImage("usdt"),
    minAmount: 2,
    fee: 0.5,
    deliveryTime: "5-10 minutes",
    denominations: null,
  },
  {
    id: 6,
    name: "Amazon Gift Card",
    category: "Gift Cards",
    image: paymentImage("amazon"),
    minAmount: 5,
    fee: 0,
    deliveryTime: "Instant",
    denominations: [5, 10, 25, 50],
  },
  {
    id: 7,
    name: "Steam Gift Card",
    category: "Gift Cards",
    image: paymentImage("steam"),
    minAmount: 5,
    fee: 0,
    deliveryTime: "Within 24 hours",
    denominations: [5, 10, 20, 50],
  },
  {
    id: 8,
    name: "Visa Prepaid",
    category: "Gift Cards",
    image: paymentImage("visa"),
    minAmount: 10,
    fee: 0,
    deliveryTime: "Within 24 hours",
    denominations: [10, 25, 50, 100],
  },
  {
    id: 9,
    name: "Google Play",
    category: "Gift Cards",
    image: paymentImage("google-play"),
    minAmount: 5,
    fee: 0,
    deliveryTime: "Instant",
    denominations: [5, 10, 25],
  },
];

// ─── Recent Withdrawals ──────────────────────────────────────────

export const recentWithdrawals = [
  { id: 1, date: "2026-03-08", method: "PayPal", methodImage: paymentImage("paypal"), amount: 10.0, status: "completed" as const },
  { id: 2, date: "2026-03-05", method: "Bitcoin", methodImage: paymentImage("bitcoin"), amount: 5.0, status: "completed" as const },
  { id: 3, date: "2026-03-03", method: "Amazon Gift Card", methodImage: paymentImage("amazon"), amount: 10.0, status: "pending" as const },
  { id: 4, date: "2026-02-28", method: "Ethereum", methodImage: paymentImage("ethereum"), amount: 25.0, status: "completed" as const },
  { id: 5, date: "2026-02-25", method: "Steam Gift Card", methodImage: paymentImage("steam"), amount: 20.0, status: "failed" as const },
  { id: 6, date: "2026-02-22", method: "PayPal", methodImage: paymentImage("paypal"), amount: 15.0, status: "completed" as const },
];

// ─── Live Activity ───────────────────────────────────────────────

export const liveActivity = [
  { user: "HoneyBee42", amount: 5000, action: "earned" },
  { user: "BuzzKing", amount: 3200, action: "earned" },
  { user: "NectarQueen", amount: 1500, action: "withdrew" },
  { user: "PollenDust", amount: 8750, action: "earned" },
  { user: "HiveWorker", amount: 2100, action: "earned" },
  { user: "WaxBuilder", amount: 4300, action: "withdrew" },
  { user: "FlowerScout", amount: 950, action: "earned" },
  { user: "DroneX", amount: 6200, action: "earned" },
  { user: "QueenCell", amount: 11000, action: "withdrew" },
  { user: "BeeKeep3r", amount: 1750, action: "earned" },
];

// ─── Referral Data ───────────────────────────────────────────────

export const referralStats = {
  totalReferrals: 47,
  activeThisMonth: 12,
  totalEarned: 234.50,
  commissionRate: 15,
  currentTier: "Silver" as const,
  referralLink: "https://cashive.gg/r/johndoe123",
  referralCode: "JOHNDOE123",
};

export const commissionTiers = [
  { name: "Starter", rate: 5, requiredActive: 0, color: "#5E5866" },
  { name: "Bronze", rate: 10, requiredActive: 5, color: "#CD7F32" },
  { name: "Silver", rate: 15, requiredActive: 15, color: "#A8B2BD" },
  { name: "Gold", rate: 20, requiredActive: 30, color: "#F5A623" },
];

export const referredUsers = [
  { id: 1, username: "Hiv***", joined: "2026-03-02", theirEarnings: 42.0, yourCommission: 6.30 },
  { id: 2, username: "Bee***", joined: "2026-02-18", theirEarnings: 18.5, yourCommission: 2.78 },
  { id: 3, username: "Pol***", joined: "2026-02-10", theirEarnings: 95.0, yourCommission: 14.25 },
  { id: 4, username: "Nec***", joined: "2026-01-25", theirEarnings: 33.2, yourCommission: 4.98 },
  { id: 5, username: "Dro***", joined: "2026-01-15", theirEarnings: 67.8, yourCommission: 10.17 },
  { id: 6, username: "Wax***", joined: "2026-01-08", theirEarnings: 12.0, yourCommission: 1.80 },
  { id: 7, username: "Flo***", joined: "2025-12-20", theirEarnings: 156.0, yourCommission: 23.40 },
  { id: 8, username: "Que***", joined: "2025-12-05", theirEarnings: 8.5, yourCommission: 1.28 },
];

// ─── Rewards / VIP Data ──────────────────────────────────────────

export const vipData = {
  currentTier: "Silver" as const,
  currentPoints: 8200,
  nextTierPoints: 15000,
  totalEarnedThisMonth: 8200,
};

export const vipTiers = [
  {
    name: "Bronze" as const,
    bonus: 2,
    threshold: 0,
    color: "#CD7F32",
    benefits: ["2% bonus on all offers", "Weekly bonus"],
  },
  {
    name: "Silver" as const,
    bonus: 5,
    threshold: 5000,
    color: "#A8B2BD",
    benefits: ["5% bonus on all offers", "Weekly bonus", "Monthly bonus"],
  },
  {
    name: "Gold" as const,
    bonus: 8,
    threshold: 15000,
    color: "#F5A623",
    benefits: ["8% bonus on all offers", "Weekly bonus", "Monthly bonus", "Priority support"],
  },
  {
    name: "Platinum" as const,
    bonus: 12,
    threshold: 50000,
    color: "#B8D4E3",
    benefits: ["12% bonus on all offers", "Weekly bonus", "Monthly bonus", "Priority support", "Dedicated account manager"],
  },
];

export const dailyStreak = {
  currentStreak: 2,
  days: [
    { day: 1, reward: 50, completed: true },
    { day: 2, reward: 75, completed: true },
    { day: 3, reward: 100, completed: false },
    { day: 4, reward: 150, completed: false },
    { day: 5, reward: 200, completed: false },
    { day: 6, reward: 300, completed: false },
    { day: 7, reward: 500, completed: false },
  ],
};

// ─── Races Data ──────────────────────────────────────────────────

export const races = {
  daily: {
    title: "$50 Daily Race",
    totalPrize: 50,
    endsAt: new Date(Date.now() + 4 * 3600_000 + 32 * 60_000 + 18_000).toISOString(),
    userPosition: 14,
    userPoints: 12450,
    prizes: [
      { rank: "1st", amount: 10 },
      { rank: "2nd", amount: 7 },
      { rank: "3rd", amount: 5 },
      { rank: "4th-10th", amount: 2 },
      { rank: "11th-25th", amount: 1 },
    ],
    leaderboard: [
      { rank: 1, username: "Majo***", points: 178561, prize: 10 },
      { rank: 2, username: "Anon***", points: 146407, prize: 7 },
      { rank: 3, username: "Buzz***", points: 134200, prize: 5 },
      { rank: 4, username: "xUse***", points: 98450, prize: 2 },
      { rank: 5, username: "AraB***", points: 87220, prize: 2 },
      { rank: 6, username: "Hive***", points: 76100, prize: 2 },
      { rank: 7, username: "Poll***", points: 65430, prize: 2 },
      { rank: 8, username: "Nect***", points: 54200, prize: 2 },
      { rank: 9, username: "Wing***", points: 43100, prize: 2 },
      { rank: 10, username: "Cell***", points: 38900, prize: 2 },
      { rank: 11, username: "Dron***", points: 32100, prize: 1 },
      { rank: 12, username: "Waxe***", points: 28400, prize: 1 },
      { rank: 13, username: "Flor***", points: 19800, prize: 1 },
      { rank: 14, username: "You", points: 12450, prize: 1, isUser: true },
      { rank: 15, username: "Kee3***", points: 11200, prize: 1 },
      { rank: 16, username: "Ques***", points: 9800, prize: 1 },
      { rank: 17, username: "Stng***", points: 8400, prize: 1 },
      { rank: 18, username: "Roya***", points: 7100, prize: 1 },
      { rank: 19, username: "Ambe***", points: 5600, prize: 1 },
      { rank: 20, username: "Gard***", points: 4200, prize: 1 },
    ],
  },
  monthly: {
    title: "$2,500 Monthly Race",
    totalPrize: 2500,
    endsAt: new Date(Date.now() + 22 * 86400_000).toISOString(),
    userPosition: 32,
    userPoints: 145200,
    prizes: [
      { rank: "1st", amount: 500 },
      { rank: "2nd", amount: 300 },
      { rank: "3rd", amount: 200 },
      { rank: "4th-10th", amount: 75 },
      { rank: "11th-25th", amount: 30 },
      { rank: "26th-50th", amount: 10 },
    ],
    leaderboard: [
      { rank: 1, username: "Majo***", points: 2450000, prize: 500 },
      { rank: 2, username: "Buzz***", points: 2180000, prize: 300 },
      { rank: 3, username: "Anon***", points: 1940000, prize: 200 },
      { rank: 4, username: "xUse***", points: 1520000, prize: 75 },
      { rank: 5, username: "AraB***", points: 1340000, prize: 75 },
      { rank: 6, username: "Hive***", points: 1100000, prize: 75 },
      { rank: 7, username: "Poll***", points: 980000, prize: 75 },
      { rank: 8, username: "Nect***", points: 870000, prize: 75 },
      { rank: 9, username: "Wing***", points: 760000, prize: 75 },
      { rank: 10, username: "Cell***", points: 650000, prize: 75 },
      { rank: 11, username: "Dron***", points: 540000, prize: 30 },
      { rank: 12, username: "Waxe***", points: 430000, prize: 30 },
      { rank: 13, username: "Flor***", points: 380000, prize: 30 },
      { rank: 14, username: "Kee3***", points: 320000, prize: 30 },
      { rank: 15, username: "Ques***", points: 280000, prize: 30 },
      { rank: 32, username: "You", points: 145200, prize: 10, isUser: true },
    ],
  },
};

// ─── Survey Page Stats ───────────────────────────────────────────

export const surveyStats = {
  surveysAvailable: 347,
  avgPayout: 850,
  userCompleted: 24,
  userTotalEarned: 18500,
  profileCompletion: 72,
};
