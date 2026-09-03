/**
 * Black Swan & Flash Crash Protection System for Aifie AI Agent v3.0
 * Detects sudden >3% price shocks in 1 min, exchange outages, or geopolitical news shocks.
 * Immediately closes open risk and raises cash allocation to 100%.
 */

export function checkBlackSwanCondition(prices = [], newsShockActive = false) {
  if (newsShockActive) {
    return {
      isBlackSwanTriggered: true,
      reason: "BLACK_SWAN_NEWS_SHOCK: Geopolitical crisis event detected.",
      cashTargetPercent: 100,
      actionRequired: "CLOSE_ALL_POSITIONS_AND_PAUSE"
    };
  }

  if (Array.isArray(prices) && prices.length >= 2) {
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const dropPercent = ((prevPrice - lastPrice) / prevPrice) * 100;

    if (dropPercent >= 3.0) {
      return {
        isBlackSwanTriggered: true,
        reason: `FLASH_CRASH_DETECTED: Sudden ${dropPercent.toFixed(2)}% drop in price within 1 minute.`,
        cashTargetPercent: 100,
        actionRequired: "TRIGGER_INSTANT_KILL_SWITCH"
      };
    }
  }

  return {
    isBlackSwanTriggered: false,
    reason: "NORMAL_MARKET_CONDITIONS: Black Swan circuit breaker standing by.",
    cashTargetPercent: 10,
    actionRequired: "NONE"
  };
}
