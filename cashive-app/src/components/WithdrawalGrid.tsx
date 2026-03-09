"use client";

import React, { useState } from "react";
import { withdrawalOptions } from "@/data/mockData";
import { Lock } from "lucide-react";
import WithdrawalModal from "./WithdrawalModal";
import { FilterPill, ProviderAvatar } from "./SharedComponents";

const filterTabs = ["All", "PayPal", "Crypto", "Gift Cards"];

interface WithdrawalGridProps {
  balance: number;
}

export default function WithdrawalGrid({ balance }: WithdrawalGridProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedOption, setSelectedOption] = useState<
    (typeof withdrawalOptions)[0] | null
  >(null);

  const filteredOptions = withdrawalOptions.filter(
    (opt) => activeFilter === "All" || opt.category === activeFilter
  );

  // Group by category when "All" is active
  const groupedOptions =
    activeFilter === "All"
      ? Object.entries(
          filteredOptions.reduce(
            (acc, opt) => {
              if (!acc[opt.category]) acc[opt.category] = [];
              acc[opt.category].push(opt);
              return acc;
            },
            {} as Record<string, typeof withdrawalOptions>
          )
        )
      : [["", filteredOptions] as const];

  return (
    <>
      {/* Filter tabs — using FilterPill */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        {filterTabs.map((tab) => (
          <FilterPill key={tab} label={tab} active={activeFilter === tab} onClick={() => setActiveFilter(tab)} />
        ))}
      </div>

      {/* Withdrawal options grid */}
      {groupedOptions.map(([category, options]) => (
        <div key={category} className="mb-6">
          {category && activeFilter === "All" && (
            <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
              {category}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {options.map((option) => {
              const minHoney = option.minAmount * 1000;
              const canAfford = balance >= minHoney;

              return (
                <div
                  key={option.id}
                  className="relative bg-bg-surface rounded-xl border border-border hover:border-accent-gold/30 transition-all duration-300 group overflow-hidden hover-shimmer"
                >
                  <div className="relative p-5">
                    {/* Icon and name */}
                    <div className="flex items-center gap-3 mb-3">
                      <ProviderAvatar name={option.name} image={option.image} size={48} className="rounded-xl" />
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm group-hover:text-accent-gold transition-colors">
                          {option.name}
                        </h3>
                        <p className="text-xs text-text-tertiary">
                          Min: ${option.minAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Delivery info */}
                    <p className="text-xs text-text-secondary mb-1">
                      {option.deliveryTime}
                    </p>
                    {option.fee > 0 && (
                      <p className="text-xs text-text-tertiary">
                        Network fee: ~${option.fee.toFixed(2)}
                      </p>
                    )}
                    {option.fee === 0 && (
                      <p className="text-xs text-success">No fee</p>
                    )}

                    {/* Denominations */}
                    {option.denominations && (
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {option.denominations.map((d) => (
                          <span
                            key={d}
                            className="text-xs px-2 py-0.5 rounded-md bg-bg-elevated border border-border text-text-secondary"
                          >
                            ${d}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={() => canAfford && setSelectedOption(option)}
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
      ))}

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
