import AppLayout from "@/components/AppLayout";
import BalanceCard from "@/components/BalanceCard";
import WithdrawalGrid from "@/components/WithdrawalGrid";
import TransactionHistory from "@/components/TransactionHistory";

export default function CashoutPage() {
  const userBalance = 12450; // Mock balance
  const minWithdrawal = 2500;

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
