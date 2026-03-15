/**
 * GET /api/admin/users/[id]
 * PATCH /api/admin/users/[id]
 *
 * Admin endpoint — view and manage a single user.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { getClientIp } from "@/lib/auth";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

// ---- GET: User detail ----

export const GET = withAdmin(async (_request, _admin, params) => {
  const userId = params?.id;
  if (!userId) return jsonError("User ID is required", 400);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          transactions: true,
          offerCompletions: true,
          withdrawals: true,
          referrals: true,
          achievements: true,
          sessions: true,
          fraudEvents: true,
          deviceFingerprints: true,
          supportTickets: true,
        },
      },
    },
  });

  if (!user) return jsonError("User not found", 404);

  // Get recent transactions
  const recentTransactions = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get recent offer completions
  const recentOffers = await db.offerCompletion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      provider: { select: { name: true, slug: true } },
    },
  });

  // Get withdrawals
  const withdrawals = await db.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get referral info
  const referrer = user.referredById
    ? await db.user.findUnique({
        where: { id: user.referredById },
        select: { id: true, username: true, email: true },
      })
    : null;

  const referredUsers = await db.user.findMany({
    where: { referredById: userId },
    select: { id: true, username: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get achievements
  const achievements = await db.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { earnedAt: "desc" },
  });

  // Get active sessions
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastActive: "desc" },
    select: {
      id: true,
      ip: true,
      device: true,
      lastActive: true,
      createdAt: true,
    },
  });

  // Get fraud events
  const fraudEvents = await db.fraudEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Get device fingerprints with multi-account detection
  const deviceFingerprints = await db.deviceFingerprint.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });

  // For each fingerprint, count how many OTHER users share the same hash
  const fingerprintHashes = [...new Set(deviceFingerprints.map((d) => d.fingerprintHash))];
  const sharedHashCounts =
    fingerprintHashes.length > 0
      ? await db.deviceFingerprint.groupBy({
          by: ["fingerprintHash"],
          where: {
            fingerprintHash: { in: fingerprintHashes },
            userId: { not: userId },
          },
          _count: { userId: true },
        })
      : [];
  const sharedCountMap = new Map(
    sharedHashCounts.map((h) => [h.fingerprintHash, h._count.userId])
  );

  const enrichedFingerprints = deviceFingerprints.map((d) => ({
    ...d,
    otherUsersCount: sharedCountMap.get(d.fingerprintHash) ?? 0,
  }));

  // Get support tickets with message count
  const supportTickets = await db.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { messages: true } },
    },
  });

  return jsonOk({
    user,
    recentTransactions,
    recentOffers,
    withdrawals,
    referrer,
    referredUsers,
    achievements,
    sessions,
    fraudEvents,
    deviceFingerprints: enrichedFingerprints,
    supportTickets,
  });
});

// ---- PATCH: Update user (admin actions) ----

const updateUserSchema = z.object({
  action: z.enum([
    "ban",
    "unban",
    "mute",
    "unmute",
    "adjustBalance",
    "forceVerifyEmail",
    "changeVipTier",
  ]),
  reason: z.string().optional(),
  amount: z.number().int().optional(),
  muteDurationMinutes: z.number().int().positive().optional(),
  vipTier: z.enum(["NONE", "BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
});

export const PATCH = withAdmin(async (request, admin, params) => {
  const userId = params?.id;
  if (!userId) return jsonError("User ID is required", 400);

  const { data, error } = await parseBody(request, updateUserSchema);
  if (error) return error;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError("User not found", 404);

  const ip = getClientIp(request);

  switch (data.action) {
    case "ban": {
      await db.user.update({
        where: { id: userId },
        data: { isBanned: true, banReason: data.reason ?? null },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "ban_user",
        targetType: "user",
        targetId: userId,
        beforeState: { isBanned: false } as Prisma.InputJsonValue,
        afterState: { isBanned: true, reason: data.reason ?? null } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "User banned" });
    }

    case "unban": {
      await db.user.update({
        where: { id: userId },
        data: { isBanned: false, banReason: null },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "unban_user",
        targetType: "user",
        targetId: userId,
        beforeState: { isBanned: true } as Prisma.InputJsonValue,
        afterState: { isBanned: false } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "User unbanned" });
    }

    case "mute": {
      const duration = data.muteDurationMinutes ?? 60;
      const mutedUntil = new Date(Date.now() + duration * 60 * 1000);
      await db.user.update({
        where: { id: userId },
        data: { chatMuted: true, chatMutedUntil: mutedUntil },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "mute_user",
        targetType: "user",
        targetId: userId,
        beforeState: { chatMuted: false } as Prisma.InputJsonValue,
        afterState: { chatMuted: true, chatMutedUntil: mutedUntil.toISOString(), duration } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "User muted", mutedUntil });
    }

    case "unmute": {
      await db.user.update({
        where: { id: userId },
        data: { chatMuted: false, chatMutedUntil: null },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "unmute_user",
        targetType: "user",
        targetId: userId,
        beforeState: { chatMuted: true } as Prisma.InputJsonValue,
        afterState: { chatMuted: false } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "User unmuted" });
    }

    case "adjustBalance": {
      if (!data.amount || data.amount === 0) {
        return jsonError("Amount is required and cannot be zero", 400);
      }
      if (!data.reason) {
        return jsonError("Reason is required for balance adjustments", 400);
      }

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balanceHoney: { increment: data.amount! } },
        });
        await tx.transaction.create({
            data: {
              userId,
              type: "ADMIN_ADJUSTMENT",
              amount: data.amount!,
              balanceAfter: user.balanceHoney + data.amount!,
              sourceType: "ADMIN",
              description: `Admin adjustment: ${data.reason}`,
              metadata: { adminId: admin.id, adminName: admin.name } as Prisma.InputJsonValue,
            },
          });
      });

      await createAuditLog({
        adminId: admin.id,
        action: "adjust_balance",
        targetType: "user",
        targetId: userId,
        beforeState: { balanceHoney: user.balanceHoney } as Prisma.InputJsonValue,
        afterState: { balanceHoney: user.balanceHoney + data.amount, adjustment: data.amount } as Prisma.InputJsonValue,
        ip,
      });

      return jsonOk({ message: "Balance adjusted", newBalance: user.balanceHoney + data.amount });
    }

    case "forceVerifyEmail": {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "force_verify_email",
        targetType: "user",
        targetId: userId,
        beforeState: { emailVerified: user.emailVerified } as Prisma.InputJsonValue,
        afterState: { emailVerified: true } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "Email verified" });
    }

    case "changeVipTier": {
      if (!data.vipTier) {
        return jsonError("VIP tier is required", 400);
      }
      await db.user.update({
        where: { id: userId },
        data: { vipTier: data.vipTier },
      });
      await createAuditLog({
        adminId: admin.id,
        action: "change_vip_tier",
        targetType: "user",
        targetId: userId,
        beforeState: { vipTier: user.vipTier } as Prisma.InputJsonValue,
        afterState: { vipTier: data.vipTier } as Prisma.InputJsonValue,
        ip,
      });
      return jsonOk({ message: "VIP tier updated" });
    }

    default:
      return jsonError("Unknown action", 400);
  }
}, "ADMIN");
