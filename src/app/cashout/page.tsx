"use client";

import AppLayout from "@/components/AppLayout";
import BalanceCard from "@/components/BalanceCard";
import WithdrawalGrid from "@/components/WithdrawalGrid";
import TransactionHistory from "@/components/TransactionHistory";
import { useAuth } from "@/contexts/AuthContext";
import BeeLoader from "@/components/BeeLoader";

export default function CashoutPage() {
  const { user, loading } = useAuth();

  const userBalance = user?.balanceHoney || 0;
  const minWithdrawal = 2500; // 2500 Honey = $2.50 USD minimum

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <BeeLoader size="lg" label="Loading..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Balance hero card */}
      <BalanceCard balance={userBalance} minWithdrawal={minWithdrawal} />

      {/* Withdrawal options with filter tabs */}
      <WithdrawalGrid balance={userBalance} />

      {/* Transaction history */}
      <TransactionHistory />
    </AppLayout>
  );
}
