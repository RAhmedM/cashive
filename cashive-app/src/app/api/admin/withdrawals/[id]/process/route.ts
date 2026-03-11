/**
 * POST /api/admin/withdrawals/[id]/process
 *
 * Admin endpoint — trigger payout processing for an approved withdrawal.
 *
 * Flow:
 * 1. Verify withdrawal exists and is APPROVED
 * 2. Set status to PROCESSING
 * 3. Call the payment processor
 * 4. If successful: mark COMPLETED (or stay PROCESSING if pending webhook)
 * 5. If failed: mark FAILED and refund the user
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError } from "@/lib/middleware";
import { processPayout } from "@/lib/payments/processor";
import { honeyToUsd } from "@/lib/withdrawals/config";

export const POST = withAdmin(async (_request, adminUser, params) => {
  const id = params?.id;
  if (!id) return jsonError("Withdrawal ID is required", 400);

  const withdrawal = await db.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) {
    return jsonError("Withdrawal not found", 404);
  }

  // Only APPROVED withdrawals can be processed
  if (withdrawal.status !== "APPROVED") {
    return jsonError(
      `Cannot process a withdrawal with status '${withdrawal.status}'. Only APPROVED withdrawals can be processed.`,
      400
    );
  }

  // 1. Set to PROCESSING (prevents double-processing)
  await db.withdrawal.update({
    where: { id },
    data: { status: "PROCESSING" },
  });

  // 2. Call the payment processor
  const result = await processPayout(withdrawal.method, withdrawal);

  if (!result.success) {
    // 3a. Payout failed — mark as FAILED and refund
    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: {
          status: "FAILED",
          reviewNote: `Processing failed: ${result.error}`,
        },
      });

      // Refund the user
      const user = await tx.user.update({
        where: { id: withdrawal.userId },
        data: { balanceHoney: { increment: withdrawal.amountHoney } },
        select: { balanceHoney: true },
      });

      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: "ADMIN_ADJUSTMENT",
          amount: withdrawal.amountHoney,
          balanceAfter: user.balanceHoney,
          sourceType: "withdrawal",
          sourceId: id,
          description: `Withdrawal processing failed — ${withdrawal.amountHoney} Honey refunded ($${honeyToUsd(withdrawal.amountHoney).toFixed(2)})`,
          metadata: {
            error: result.error,
            processedBy: adminUser.id,
          },
        },
      });
    });

    // Audit log
    void db.adminAuditLog
      .create({
        data: {
          adminId: adminUser.id,
          action: "process_withdrawal_failed",
          targetType: "withdrawal",
          targetId: id,
          details: {
            error: result.error,
            method: withdrawal.method,
            amountUsd: withdrawal.amountUsd,
            refundedHoney: withdrawal.amountHoney,
          },
        },
      })
      .catch(() => {});

    // Notify user
    void db.notification
      .create({
        data: {
          userId: withdrawal.userId,
          type: "withdrawal_failed",
          title: "Withdrawal Failed",
          body: `Your $${withdrawal.amountUsd.toFixed(2)} withdrawal could not be processed. Your balance has been refunded.`,
          link: "/cashout",
        },
      })
      .catch(() => {});

    return jsonError(`Payout failed: ${result.error}`, 502);
  }

  // 3b. Payout succeeded
  if (result.pendingWebhook) {
    // Payment is processing — stays in PROCESSING status.
    // The webhook endpoint will update it to COMPLETED when confirmed.
    await db.withdrawal.update({
      where: { id },
      data: {
        externalTxId: result.externalTxId ?? null,
      },
    });

    // Audit log
    void db.adminAuditLog
      .create({
        data: {
          adminId: adminUser.id,
          action: "process_withdrawal_pending",
          targetType: "withdrawal",
          targetId: id,
          details: {
            method: withdrawal.method,
            amountUsd: withdrawal.amountUsd,
            externalTxId: result.externalTxId,
          },
        },
      })
      .catch(() => {});

    return jsonOk({
      status: "processing",
      message: "Payout initiated — waiting for payment provider confirmation",
      externalTxId: result.externalTxId,
    });
  }

  // Immediate completion (simulated payouts, some gift cards)
  const updated = await db.withdrawal.update({
    where: { id },
    data: {
      status: "COMPLETED",
      processedAt: new Date(),
      externalTxId: result.externalTxId ?? null,
    },
  });

  // Audit log
  void db.adminAuditLog
    .create({
      data: {
        adminId: adminUser.id,
        action: "process_withdrawal_completed",
        targetType: "withdrawal",
        targetId: id,
        details: {
          method: withdrawal.method,
          amountUsd: withdrawal.amountUsd,
          externalTxId: result.externalTxId,
        },
      },
    })
    .catch(() => {});

  // Notify user
  void db.notification
    .create({
      data: {
        userId: withdrawal.userId,
        type: "withdrawal_complete",
        title: "Withdrawal Completed!",
        body: `Your $${withdrawal.amountUsd.toFixed(2)} withdrawal has been sent.`,
        link: "/cashout",
      },
    })
    .catch(() => {});

  return jsonOk({
    status: "completed",
    withdrawal: updated,
    externalTxId: result.externalTxId,
  });
});
