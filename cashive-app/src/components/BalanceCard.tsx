"use client";

import React from "react";
import { HoneyIcon, HoneycombPattern } from "./Icons";
import { CheckCircle2 } from "lucide-react";

interface BalanceCardProps {
  balance: number;
  minWithdrawal: number;
}

export default function BalanceCard({
  balance,
  minWithdrawal,
}: BalanceCardProps) {
  const dollarValue = balance / 1000;
  const canWithdraw = balance >= minWithdrawal;
  const progress = Math.min((balance / minWithdrawal) * 100, 100);

  return (
    <div className="relative rounded-2xl border border-border overflow-hidden mb-8">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-surface via-bg-surface to-accent-gold/5" />
      <HoneycombPattern opacity={0.08} />

      {/* Honey drip gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-accent-gold to-transparent opacity-60" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Balance */}
          <div>
            <p className="text-sm text-text-secondary mb-2">
              Your Honey Balance
            </p>
            <div className="flex items-center gap-3">
              <HoneyIcon className="w-9 h-9" />
              <span className="font-mono font-bold text-4xl text-accent-gold tracking-tight">
                {balance.toLocaleString()}
              </span>
            </div>
            <p className="text-text-secondary text-sm mt-1.5 font-mono">
              ≈ ${dollarValue.toFixed(2)}
            </p>
          </div>

          {/* Right: Withdrawal status */}
          <div className="md:text-right">
            {canWithdraw ? (
              <div className="flex items-center gap-2 md:justify-end">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-success font-medium text-sm">
                  You can withdraw!
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-secondary mb-2">
                  <HoneyIcon className="w-3.5 h-3.5 inline mr-1" />
                  <span className="text-accent-gold font-mono font-semibold">
                    {(minWithdrawal - balance).toLocaleString()}
                  </span>{" "}
                  more to unlock withdrawals
                </p>
                <div className="w-full md:w-64 h-2.5 bg-bg-deepest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-gold to-accent-orange rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-text-tertiary mt-2">
              Minimum: {minWithdrawal.toLocaleString()} Honey to withdraw
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
