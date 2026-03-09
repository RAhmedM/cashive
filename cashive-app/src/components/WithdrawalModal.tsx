"use client";

import React, { useState } from "react";
import { X, Shield, Clock, ArrowRight } from "lucide-react";
import { HoneyIcon } from "./Icons";
import { ProviderAvatar } from "./SharedComponents";

interface WithdrawalOption {
  id: number;
  name: string;
  category: string;
  image: string;
  minAmount: number;
  fee: number;
  deliveryTime: string;
  denominations: number[] | null;
}

interface WithdrawalModalProps {
  option: WithdrawalOption;
  balance: number;
  onClose: () => void;
}

export default function WithdrawalModal({
  option,
  balance,
  onClose,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState(option.minAmount.toString());
  const [address, setAddress] = useState("");
  const [selectedDenomination, setSelectedDenomination] = useState<
    number | null
  >(option.denominations ? option.denominations[0] : null);

  const numAmount = selectedDenomination || parseFloat(amount) || 0;
  const honeyRequired = numAmount * 1000;
  const canConfirm =
    numAmount >= option.minAmount &&
    honeyRequired <= balance &&
    (option.category !== "Crypto" || address.length > 0) &&
    (option.category !== "PayPal" || address.length > 0);

  const handleMax = () => {
    const maxDollars = Math.floor(balance / 1000);
    setAmount(maxDollars.toString());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <ProviderAvatar name={option.name} size={40} className="rounded-xl" />
            <div>
              <h3 className="font-heading font-bold text-text-primary">
                Withdraw via {option.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Clock className="w-3 h-3" />
                {option.deliveryTime}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Denomination selector for gift cards */}
          {option.denominations ? (
            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                Select amount
              </label>
              <div className="flex gap-2 flex-wrap">
                {option.denominations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDenomination(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedDenomination === d
                        ? "bg-accent-gold text-bg-deepest"
                        : "bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-accent-gold/30"
                    }`}
                  >
                    ${d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Amount input for non-gift-card */
            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={option.minAmount}
                  step="0.01"
                  className="w-full bg-bg-elevated border border-border rounded-lg py-3 pl-8 pr-16 text-text-primary font-mono text-lg outline-none focus:border-accent-gold/50 transition-colors"
                />
                <button
                  onClick={handleMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-accent-gold bg-accent-gold/10 rounded-md hover:bg-accent-gold/20 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>
          )}

          {/* Conversion display */}
          <div className="flex items-center justify-center gap-3 py-3 bg-bg-elevated rounded-lg border border-border">
            <div className="flex items-center gap-1.5">
              <HoneyIcon className="w-4 h-4" />
              <span className="font-mono font-semibold text-accent-gold">
                {honeyRequired.toLocaleString()}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-text-tertiary" />
            <span className="font-mono font-semibold text-text-primary">
              ${numAmount.toFixed(2)}
            </span>
          </div>

          {/* Address input */}
          {option.category === "Crypto" && (
            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                Wallet address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={`Enter your ${option.name} address`}
                className="w-full bg-bg-elevated border border-border rounded-lg py-3 px-4 text-text-primary text-sm font-mono outline-none focus:border-accent-gold/50 transition-colors placeholder:text-text-tertiary"
              />
            </div>
          )}

          {option.category === "PayPal" && (
            <div>
              <label className="text-sm text-text-secondary mb-2 block">
                PayPal email
              </label>
              <input
                type="email"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your PayPal email"
                className="w-full bg-bg-elevated border border-border rounded-lg py-3 px-4 text-text-primary text-sm outline-none focus:border-accent-gold/50 transition-colors placeholder:text-text-tertiary"
              />
            </div>
          )}

          {/* Fee notice */}
          <div className="text-xs text-text-secondary">
            {option.fee > 0 ? (
              <span>Network fee: ~${option.fee.toFixed(2)}</span>
            ) : (
              <span className="text-success">No fee</span>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 p-3 bg-bg-elevated rounded-lg border border-border">
            <Shield className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
            <p className="text-xs text-text-tertiary">
              First withdrawal requires identity verification. Processing times
              may vary.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-sm font-semibold text-text-secondary border border-border hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            disabled={!canConfirm}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              canConfirm
                ? "bg-accent-gold text-bg-deepest hover:bg-accent-gold-hover active:scale-[0.98]"
                : "bg-bg-elevated text-text-tertiary cursor-not-allowed border border-border"
            }`}
          >
            Confirm Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}
