"use client";

import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Lock } from "lucide-react";
import WithdrawalModal from "./WithdrawalModal";
import { FilterPill, ProviderAvatar } from "./SharedComponents";
import BeeLoader from "./BeeLoader";
import { paymentImage } from "@/lib/constants";

interface WithdrawalMethod {
  method: string;
  name: string;
  category: string;
  minHoney: number;
  minUsd: number;
  maxHoney: number;
  maxUsd: number;
  feeUsd: number;
  feePercent: number;
  enabled: boolean;
  estimatedTime: string;
  requiredFields: string[];
  canAfford: boolean;
}

interface MethodsResponse {
  methods: WithdrawalMethod[];
  userBalance: number;
  userBalanceUsd: number;
}

const filterTabs = ["All", "PayPal", "Crypto", "Gift Cards"];

interface WithdrawalGridProps {
  balance: number;
}

// Adapter: convert API method shape to the shape WithdrawalModal expects
function toModalOption(m: WithdrawalMethod) {
  return {
    id: m.method,
    name: m.name,
    category: m.category,
    image: paymentImage(m.name),
    minAmount: m.minUsd,
    fee: m.feeUsd,
    deliveryTime: m.estimatedTime,
    denominations: null as number[] | null,
  };
}

export default function WithdrawalGrid({ balance }: WithdrawalGridProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOption, setSelectedOption] = useState<ReturnType<typeof toModalOption> | null>(null);
  const { data, loading } = useApi<MethodsResponse>("/api/user/me/withdrawals/methods");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <BeeLoader size="md" label="Loading withdrawal options..." />
      </div>
    );
  }

  const methods = data?.methods?.filter((m) => m.enabled) || [];
  const filteredMethods = methods.filter(
    (m) => activeFilter === "All" || m.category === activeFilter
  );

  // Group by category when "All" is active
  const groupedMethods =
    activeFilter === "All"
      ? Object.entries(
          filteredMethods.reduce(
            (acc, m) => {
              if (!acc[m.category]) acc[m.category] = [];
              acc[m.category].push(m);
              return acc;
            },
            {} as Record<string, WithdrawalMethod[]>
          )
        )
      : [["", filteredMethods] as const];

  return (
    <>
      {/* Filter tabs — using FilterPill */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        {filterTabs.map((tab) => (
          <FilterPill key={tab} label={tab} active={activeFilter === tab} onClick={() => setActiveFilter(tab)} />
        ))}
      </div>

      {filteredMethods.length === 0 ? (
        <div className="text-center py-8 text-sm text-text-secondary">
          No withdrawal methods available in this category.
        </div>
      ) : (
        /* Withdrawal options grid */
        groupedMethods.map(([category, options]) => (
          <div key={category} className="mb-6">
            {category && activeFilter === "All" && (
              <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                {category}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {options.map((option) => {
                const canAfford = balance >= option.minHoney;

                return (
                  <div
                    key={option.method}
                    className="relative bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 group overflow-hidden hover-shimmer"
                  >
                    <div className="relative p-5">
                      {/* Icon and name */}
                      <div className="flex items-center gap-3 mb-3">
                        <ProviderAvatar name={option.name} image={paymentImage(option.name)} size={48} className="rounded-xl" />
                        <div>
                          <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
                            {option.name}
                          </h3>
                          <p className="text-xs text-text-tertiary">
                            Min: ${option.minUsd.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Delivery info */}
                      <p className="text-xs text-text-secondary mb-1">
                        {option.estimatedTime}
                      </p>
                      {option.feeUsd > 0 ? (
                        <p className="text-xs text-text-tertiary">
                          Network fee: ~${option.feeUsd.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-xs text-success">No fee</p>
                      )}

                      {/* CTA */}
                      <button
                        onClick={() => canAfford && setSelectedOption(toModalOption(option))}
                        disabled={!canAfford}
                        className={`w-full mt-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                          canAfford
                            ? "bg-accent-gold text-bg-deepest hover:bg-accent-gold-hover active:scale-[0.98]"
                            : "bg-bg-elevated text-text-tertiary cursor-not-allowed border border-border"
                        }`}
                      >
                        {canAfford ? (
                          "Withdraw"
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Earn more Honey
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Withdrawal modal */}
      {selectedOption && (
        <WithdrawalModal
          option={selectedOption}
          balance={balance}
          onClose={() => setSelectedOption(null)}
        />
      )}
    </>
  );
}
