/**
 * GET   /api/admin/withdrawals/[id]          — Get withdrawal details
 * PATCH /api/admin/withdrawals/[id]          — Approve or reject a withdrawal
 *
 * Admin-only endpoints for reviewing individual withdrawals.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { reviewWithdrawalSchema } from "@/lib/validations/withdrawals";
import { honeyToUsd } from "@/lib/withdrawals/config";

/**
 * GET — Full withdrawal details with user info and fraud signals.
 */
export const GET = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Withdrawal ID is required", 400);

  const withdrawal = await db.withdrawal.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          emailVerified: true,
          country: true,
          balanceHoney: true,
          lifetimeEarned: true,
          fraudScore: true,
          isBanned: true,
          vipTier: true,
          createdAt: true,
          _count: {
            select: {
              withdrawals: true,
              offerCompletions: true,
              fraudEvents: true,
            },
          },
        },
      },
    },
  });

  if (!withdrawal) {
    return jsonError("Withdrawal not found", 404);
  }

  // Get user's recent fraud events
  const fraudEvents = await db.fraudEvent.findMany({
    where: { userId: withdrawal.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Get user's withdrawal history summary
  const withdrawalHistory = await db.withdrawal.aggregate({
    where: {
      userId: withdrawal.userId,
      status: "COMPLETED",
    },
    _sum: { amountUsdCents: true },
    _count: true,
  });

  return jsonOk({
    withdrawal,
    fraudEvents,
    userWithdrawalHistory: {
      totalCompleted: withdrawalHistory._count,
      totalPaidUsdCents: withdrawalHistory._sum?.amountUsdCents ?? 0,
    },
  });
});

/**
 * PATCH — Approve or reject a withdrawal.
 *
 * Approve: sets status to APPROVED, ready for processing.
 * Reject: sets status to REJECTED, refunds the user's balance.
 */
export const PATCH = withAdmin(async (request, adminUser, params) => {
  const id = params?.id;
  if (!id) return jsonError("Withdrawal ID is required", 400);

  const { data, error } = await parseBody(request, reviewWithdrawalSchema);
  if (error) return error;

  const withdrawal = await db.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) {
    return jsonError("Withdrawal not found", 404);
  }

  // Can only review PENDING withdrawals
  if (withdrawal.status !== "PENDING") {
    return jsonError(
      `Cannot ${data.action} a withdrawal with status '${withdrawal.status}'. Only PENDING withdrawals can be reviewed.`,
      400
    );
  }

  if (data.action === "approve") {
    // Approve — move to APPROVED status
    const updated = await db.withdrawal.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: adminUser.id,
        reviewNote: data.reviewNote ?? null,
      },
    });

    // Audit log
    void db.auditLog
      .create({
        data: {
          adminId: adminUser.id,
          action: "approve_withdrawal",
          targetType: "withdrawal",
          targetId: id,
          afterState: {
            amountUsdCents: withdrawal.amountUsdCents,
            method: withdrawal.method,
            reviewNote: data.reviewNote,
          },
        },
      })
      .catch(() => {});

    // Notify user
    void db.notification
      .create({
        data: {
          userId: withdrawal.userId,
          type: "withdrawal_approved",
          title: "Withdrawal Approved",
          body: `Your $${(withdrawal.amountUsdCents / 100).toFixed(2)} withdrawal has been approved and will be processed shortly.`,
          link: "/cashout",
        },
      })
      .catch(() => {});

    return jsonOk({ withdrawal: updated });
  }

  // Reject — refund the balance
  const refundAmount = withdrawal.amountHoney;

  const updated = await db.$transaction(async (tx) => {
    // Update withdrawal status
    const w = await tx.withdrawal.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedBy: adminUser.id,
        reviewNote: data.reviewNote ?? null,
      },
    });

    // Refund the user's balance
    const user = await tx.user.update({
      where: { id: withdrawal.userId },
      data: { balanceHoney: { increment: refundAmount } },
      select: { balanceHoney: true },
    });

    // Create refund transaction
    await tx.transaction.create({
      data: {
        userId: withdrawal.userId,
        type: "ADMIN_ADJUSTMENT",
        amount: refundAmount,
        balanceAfter: user.balanceHoney,
        sourceType: "WITHDRAWAL",
        sourceId: id,
        description: `Withdrawal rejected — ${refundAmount} Honey refunded ($${honeyToUsd(refundAmount).toFixed(2)})`,
        metadata: {
          reason: data.reviewNote ?? "Rejected by admin",
          reviewedBy: adminUser.id,
        },
      },
    });

    return w;
  });

  // Audit log
  void db.auditLog
    .create({
      data: {
        adminId: adminUser.id,
        action: "reject_withdrawal",
        targetType: "withdrawal",
        targetId: id,
        afterState: {
          amountUsdCents: withdrawal.amountUsdCents,
          method: withdrawal.method,
          reviewNote: data.reviewNote,
          refundedHoney: refundAmount,
        },
      },
    })
    .catch(() => {});

  // Notify user
  void db.notification
    .create({
      data: {
        userId: withdrawal.userId,
        type: "withdrawal_rejected",
        title: "Withdrawal Rejected",
        body: `Your $${(withdrawal.amountUsdCents / 100).toFixed(2)} withdrawal was not approved.${data.reviewNote ? ` Reason: ${data.reviewNote}` : ""} Your balance has been refunded.`,
        link: "/cashout",
      },
    })
    .catch(() => {});

  return jsonOk({ withdrawal: updated });
});
