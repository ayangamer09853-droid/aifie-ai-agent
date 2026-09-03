/**
 * Treasury Management System for Aifie AI Agent v5.0
 * Partitions total portfolio equity into 4 capital buckets:
 * 1. Trading Capital (50%)
 * 2. Reserve Capital (30%)
 * 3. Emergency Capital (10%)
 * 4. Profit Vault (10%)
 */

export function getTreasuryBuckets(totalEquity = 100000) {
  const safeEquity = Math.max(1000, Number(totalEquity) || 100000);
  const tradingCapital = Number((safeEquity * 0.50).toFixed(2));
  const reserveCapital = Number((safeEquity * 0.30).toFixed(2));
  const emergencyCapital = Number((safeEquity * 0.10).toFixed(2));
  const profitVault = Number((safeEquity * 0.10).toFixed(2));

  return {
    totalEquity: Number(safeEquity.toFixed(2)),
    maxDeployableCapital: tradingCapital,
    buckets: {
      tradingCapital: { amount: tradingCapital, percent: "50%", status: "DEPLOYED_ACTIVE" },
      reserveCapital: { amount: reserveCapital, percent: "30%", status: "YIELD_STAKED_SAFE" },
      emergencyCapital: { amount: emergencyCapital, percent: "10%", status: "LIQUID_VAULT" },
      profitVault: { amount: profitVault, percent: "10%", status: "LOCKED_GAINS" }
    },
    safetyDirective: "Trading Capital is strictly capped at 50% of total portfolio equity to guarantee capital preservation."
  };
}
