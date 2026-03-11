/**
 * GET /api/user/[username]
 *
 * Public user profile. Only returns data if profilePublic is true.
 * No authentication required.
 */
import { db } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/middleware";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      vipTier: true,
      profilePublic: true,
      lifetimeEarned: true,
      currentStreak: true,
      longestStreak: true,
      createdAt: true,
      _count: {
        select: {
          offerCompletions: true,
          achievements: true,
          referrals: true,
        },
      },
      achievements: {
        include: {
          achievement: {
            select: {
              slug: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { earnedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return jsonError("User not found", 404);
  }

  if (!user.profilePublic) {
    return jsonError("This profile is private", 403);
  }

  return jsonOk({
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level,
      vipTier: user.vipTier,
      lifetimeEarned: user.lifetimeEarned,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      createdAt: user.createdAt,
      stats: {
        offersCompleted: user._count.offerCompletions,
        achievements: user._count.achievements,
        referrals: user._count.referrals,
      },
      recentAchievements: user.achievements.map((ua) => ({
        ...ua.achievement,
        earnedAt: ua.earnedAt,
      })),
    },
  });
}
