/**
 * GET /api/admin/dashboard
 *
 * Returns key metrics for the admin dashboard overview page.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/middleware";

export const GET = withAdmin(async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    // Revenue metrics
    revenueTodayResult,
    revenueMonthResult,
    payoutsTodayResult,
    payoutsMonthResult,
    // User metrics
    activeUsersCount,
    newSignupsToday,
    // Queue metrics
    pendingWithdrawals,
    pendingKyc,
    openTickets,
    pendingReports,
    // Recent activity
    recentAuditLogs,
    recentWithdrawals,
  ] = await Promise.all([
    // Revenue today: sum of payout_to_us_cents from offer_completions today
    db.offerCompletion.aggregate({
      _sum: { payoutToUsCents: true },
      where: {
        createdAt: { gte: todayStart },
        status: "CREDITED",
      },
    }),
    // Revenue this month
    db.offerCompletion.aggregate({
      _sum: { payoutToUsCents: true },
      where: {
        createdAt: { gte: monthStart },
        status: "CREDITED",
      },
    }),
    // Payouts today: sum of completed withdrawals today
    db.withdrawal.aggregate({
      _sum: { amountUsdCents: true },
      where: {
        processedAt: { gte: todayStart },
        status: "COMPLETED",
      },
    }),
    // Payouts this month
    db.withdrawal.aggregate({
      _sum: { amountUsdCents: true },
      where: {
        processedAt: { gte: monthStart },
        status: "COMPLETED",
      },
    }),
    // Active users (logged in within 24h)
    db.user.count({
      where: {
        lastLoginAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    }),
    // New signups today
    db.user.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Pending withdrawals
    db.withdrawal.count({ where: { status: "PENDING" } }),
    // Pending KYC
    db.kycVerification.count({ where: { status: "PENDING" } }),
    // Open support tickets
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    // Pending chat reports
    db.chatReport.count({ where: { status: "PENDING" } }),
    // Recent audit logs
    db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true, role: true } },
      },
    }),
    // Recent withdrawals
    db.withdrawal.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, email: true } },
      },
    }),
  ]);

  return jsonOk({
    stats: {
      revenueToday: revenueTodayResult._sum?.payoutToUsCents ?? 0,
      revenueMonth: revenueMonthResult._sum?.payoutToUsCents ?? 0,
      payoutsToday: payoutsTodayResult._sum?.amountUsdCents ?? 0,
      payoutsMonth: payoutsMonthResult._sum?.amountUsdCents ?? 0,
      activeUsers: activeUsersCount,
      newSignupsToday,
      pendingWithdrawals,
      pendingKyc,
      openTickets,
      pendingReports,
    },
    recentAuditLogs,
    recentWithdrawals,
  });
});
