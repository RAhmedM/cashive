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
        select: { completionPercent: true },
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

  return jsonOk({
    user: {
      id: fullUser.id,
      email: fullUser.email,
      emailVerified: fullUser.emailVerified,
      username: fullUser.username,
      usernameChangedAt: fullUser.usernameChangedAt,
      avatar: fullUser.avatar,
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
      kycStatus: fullUser.kycStatus,
      // 2FA
      twoFactorEnabled: fullUser.twoFactorEnabled,
      // Privacy
      profilePublic: fullUser.profilePublic,
      anonymousInChat: fullUser.anonymousInChat,
      anonymousOnBoard: fullUser.anonymousOnBoard,
      // Display
      balanceDisplay: fullUser.balanceDisplay,
      chatOpenDefault: fullUser.chatOpenDefault,
      // Notifications
      notifEmail: fullUser.notifEmail,
      notifPush: fullUser.notifPush,
      notifOnsite: fullUser.notifOnsite,
      // Stats
      stats: {
        referrals: fullUser._count.referrals,
        offersCompleted: fullUser._count.offerCompletions,
        achievements: fullUser._count.achievements,
        surveyProfileCompletion:
          fullUser.surveyProfile?.completionPercent ?? 0,
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

  // Username change (with cooldown: once per 30 days)
  if (data.username !== undefined && data.username !== user.username) {
    // Check cooldown
    if (user.usernameChangedAt) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (user.usernameChangedAt > thirtyDaysAgo) {
        return jsonError(
          "You can only change your username once every 30 days",
          400
        );
      }
    }

    // Check uniqueness
    const existing = await db.user.findUnique({
      where: { username: data.username },
    });
    if (existing && existing.id !== user.id) {
      return jsonError("This username is already taken", 409);
    }

    updateData.username = data.username;
    updateData.usernameChangedAt = new Date();
  }

  // Simple field updates
  if (data.language !== undefined) updateData.language = data.language;
  if (data.profilePublic !== undefined) updateData.profilePublic = data.profilePublic;
  if (data.anonymousInChat !== undefined) updateData.anonymousInChat = data.anonymousInChat;
  if (data.anonymousOnBoard !== undefined) updateData.anonymousOnBoard = data.anonymousOnBoard;
  if (data.balanceDisplay !== undefined) updateData.balanceDisplay = data.balanceDisplay;
  if (data.chatOpenDefault !== undefined) updateData.chatOpenDefault = data.chatOpenDefault;

  // Notification preferences (merge with existing)
  if (data.notifEmail !== undefined) {
    const existing = (user.notifEmail as Record<string, boolean>) ?? {};
    updateData.notifEmail = { ...existing, ...data.notifEmail };
  }
  if (data.notifPush !== undefined) {
    const existing = (user.notifPush as Record<string, boolean>) ?? {};
    updateData.notifPush = { ...existing, ...data.notifPush };
  }
  if (data.notifOnsite !== undefined) {
    const existing = (user.notifOnsite as Record<string, boolean>) ?? {};
    updateData.notifOnsite = { ...existing, ...data.notifOnsite };
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return jsonOk({
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      language: updatedUser.language,
      profilePublic: updatedUser.profilePublic,
      anonymousInChat: updatedUser.anonymousInChat,
      anonymousOnBoard: updatedUser.anonymousOnBoard,
      balanceDisplay: updatedUser.balanceDisplay,
      chatOpenDefault: updatedUser.chatOpenDefault,
      notifEmail: updatedUser.notifEmail,
      notifPush: updatedUser.notifPush,
      notifOnsite: updatedUser.notifOnsite,
    },
    message: "Profile updated successfully",
  });
});
