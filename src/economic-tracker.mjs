/**
 * Economic Event Tracker & Volatility Shield for Aifie AI Agent
 * Tracks macro news, FOMC rate decisions, CPI inflation data, Non-Farm Payrolls, and Earnings.
 */

const UPCOMING_EVENTS = [
  { id: "evt-1", event: "US CPI Inflation Data Release", category: "Inflation", impact: "HIGH", time: "18:30 IST", status: "UPCOMING", forecast: "2.9%", previous: "3.1%" },
  { id: "evt-2", event: "FOMC Federal Reserve Interest Rate Decision", category: "Central Bank", impact: "CRITICAL", time: "23:30 IST", status: "UPCOMING", forecast: "5.25%", previous: "5.50%" },
  { id: "evt-3", event: "US Non-Farm Payrolls (NFP)", category: "Employment", impact: "HIGH", time: "Tomorrow 18:30 IST", status: "SCHEDULED", forecast: "175K", previous: "187K" },
  { id: "evt-4", event: "Tech Sector Q3 Corporate Earnings", category: "Earnings", impact: "MEDIUM", time: "Post-Market", status: "ACTIVE", forecast: "N/A", previous: "N/A" }
];

export function getUpcomingEconomicEvents() {
  return {
    lastUpdated: new Date().toISOString(),
    macroRiskLevel: "MODERATE",
    events: UPCOMING_EVENTS
  };
}

export function checkNewsVolatilityShield() {
  // Checks if we are currently inside a high-impact news window
  const criticalEvent = UPCOMING_EVENTS.find(e => e.impact === "CRITICAL" && e.status === "ACTIVE");
  
  if (criticalEvent) {
    return {
      isShieldActive: true,
      reason: `Volatility Shield ACTIVE due to critical event: ${criticalEvent.event}`,
      activeEvent: criticalEvent
    };
  }

  return {
    isShieldActive: false,
    reason: "Macro volatility parameters within normal risk tolerance thresholds.",
    activeEvent: null
  };
}
