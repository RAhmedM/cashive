/**
 * GET  /api/user/me — Current user profile + balance + stats
 * PATCH /api/user/me — Update profile settings
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updateProfileSchema } from "@/lib/validations/user";

/**
 * GET — Return the current authenticated user's full profile.
 */
export const GET = withAuth(async (_request, user) => {
  // Fetch fresh user data with related counts
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      surveyProfile: {
        select: { completionPct: true },
      },
      kycVerifications: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { status: true },
      },
      _count: {
        select: {
          referrals: true,
          offerCompletions: true,
          achievements: true,
        },
      },
    },
  });

  if (!fullUser) {
    return jsonError("User not found", 404);
  }

  // Derive KYC status from the latest KYC verification record
  const kycStatus = fullUser.kycVerifications[0]?.status ?? null;

  // Extract notification prefs from JSON field
  const notifPrefs = fullUser.notificationPrefs as {
    email?: Record<string, boolean>;
    push?: Record<string, boolean>;
    onsite?: Record<string, boolean>;
  } | null;

  return jsonOk({
    user: {
      id: fullUser.id,
      email: fullUser.email,
      emailVerified: fullUser.emailVerified,
      username: fullUser.username,
      avatar: fullUser.avatarUrl,
      country: fullUser.country,
      language: fullUser.language,
      // Balance
      balanceHoney: fullUser.balanceHoney,
      lifetimeEarned: fullUser.lifetimeEarned,
      // Level / VIP
      xp: fullUser.xp,
      level: fullUser.level,
      vipTier: fullUser.vipTier,
      // Streak
      currentStreak: fullUser.currentStreak,
      longestStreak: fullUser.longestStreak,
      lastEarnDate: fullUser.lastEarnDate,
      // Referral
      referralCode: fullUser.referralCode,
      referralTier: fullUser.referralTier,
      // KYC
      kycStatus,
      // 2FA
      twoFactorEnabled: fullUser.totpEnabled,
      // Privacy
      profilePublic: fullUser.profilePublic,
      anonymousInChat: fullUser.anonymousInChat,
      anonymousOnLeaderboard: fullUser.anonymousOnLeaderboard,
      // Display
      balanceDisplay: fullUser.balanceDisplay,
      chatOpenDefault: fullUser.chatOpenDefault,
      // Notifications
      notifEmail: notifPrefs?.email ?? {},
      notifPush: notifPrefs?.push ?? {},
      notifOnsite: notifPrefs?.onsite ?? {},
      // Stats
      stats: {
        referrals: fullUser._count.referrals,
        offersCompleted: fullUser._count.offerCompletions,
        achievements: fullUser._count.achievements,
        surveyProfileCompletion:
          fullUser.surveyProfile?.completionPct ?? 0,
      },
      // Meta
      createdAt: fullUser.createdAt,
      lastLoginAt: fullUser.lastLoginAt,
    },
  });
});

/**
 * PATCH — Update profile fields (username, privacy, display, notifications).
 */
export const PATCH = withAuth(async (request, user) => {
  const { data, error } = await parseBody(request, updateProfileSchema);
  if (error) return error;

  // Build update payload (only include fields that were provided)
  const updateData: Record<string, unknown> = {};

  // Username change (no cooldown field exists; allow freely for now)
  if (data.username !== undefined && data.username !== user.username) {
    // Check uniqueness
    const existing = await db.user.findUnique({
      where: { username: data.username },
    });
    if (existing && existing.id !== user.id) {
      return jsonError("This username is already taken", 409);
    }

    updateData.username = data.username;
  }

  // Simple field updates
  if (data.language !== undefined) updateData.language = data.language;
  if (data.profilePublic !== undefined) updateData.profilePublic = data.profilePublic;
  if (data.anonymousInChat !== undefined) updateData.anonymousInChat = data.anonymousInChat;
  if (data.anonymousOnLeaderboard !== undefined) updateData.anonymousOnLeaderboard = data.anonymousOnLeaderboard;
  if (data.balanceDisplay !== undefined) updateData.balanceDisplay = data.balanceDisplay;
  if (data.chatOpenDefault !== undefined) updateData.chatOpenDefault = data.chatOpenDefault;

  // Notification preferences (merge with existing JSON field)
  if (data.notificationPrefs !== undefined) {
    const existing = (user.notificationPrefs ?? {}) as Record<string, Record<string, boolean>>;
    const merged: Record<string, Record<string, boolean>> = { ...existing };

    if (data.notificationPrefs.email) {
      merged.email = { ...(existing.email ?? {}), ...data.notificationPrefs.email };
    }
    if (data.notificationPrefs.push) {
      merged.push = { ...(existing.push ?? {}), ...data.notificationPrefs.push };
    }
    if (data.notificationPrefs.onsite) {
      merged.onsite = { ...(existing.onsite ?? {}), ...data.notificationPrefs.onsite };
    }

    updateData.notificationPrefs = merged;
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  // Extract notification prefs for response
  const updatedNotifPrefs = updatedUser.notificationPrefs as {
    email?: Record<string, boolean>;
    push?: Record<string, boolean>;
    onsite?: Record<string, boolean>;
  } | null;

  return jsonOk({
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      language: updatedUser.language,
      profilePublic: updatedUser.profilePublic,
      anonymousInChat: updatedUser.anonymousInChat,
      anonymousOnLeaderboard: updatedUser.anonymousOnLeaderboard,
      balanceDisplay: updatedUser.balanceDisplay,
      chatOpenDefault: updatedUser.chatOpenDefault,
      notifEmail: updatedNotifPrefs?.email ?? {},
      notifPush: updatedNotifPrefs?.push ?? {},
      notifOnsite: updatedNotifPrefs?.onsite ?? {},
    },
    message: "Profile updated successfully",
  });
});
