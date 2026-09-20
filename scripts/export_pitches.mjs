import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { globalLeadSwarm } from "../src/revenue/high-velocity-lead-swarm.mjs";

const dir = resolve(process.cwd(), "data", "client-pitches");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const bids = globalLeadSwarm.compileBatchBids();
bids.forEach((bid, idx) => {
  const safeName = bid.clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = resolve(dir, `Pitch-${idx + 1}-${safeName}.txt`);
  const content = `JOB: ${bid.title}
PLATFORM: ${bid.platform}
CLIENT: ${bid.clientName}
QUOTE: ₹${bid.quoteInr.toLocaleString("en-IN")} ($${bid.quoteUsd} USD)
WIN PROBABILITY: ${(bid.winProbability > 1 ? bid.winProbability : bid.winProbability * 100)}%
TURNAROUND: ${bid.timelineDays} Days
------------------------------------------------------------
PROPOSAL PITCH TO SUBMIT:

${bid.pitchText}

------------------------------------------------------------
ATTACHED WORKING PROOF-OF-CONCEPT CODE:

${bid.pocAttached?.preview || ""}
`;
  writeFileSync(filename, content, "utf8");
  console.log(`Saved: ${filename}`);
});

console.log(`Successfully exported ${bids.length} pitches to ${dir}`);
