import fs from "node:fs";
import vm from "node:vm";

const filePath = "./src/dashboard.mjs";
let content = fs.readFileSync(filePath, "utf-8");

// Function to validate script
function validate(c) {
  const match = c.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) return { valid: false, error: "No script" };
  try {
    new vm.Script(match[1], { filename: "dashboard.js" });
    return { valid: true };
  } catch (err) {
    const m = err.stack.match(/dashboard\.js:(\d+)/);
    const line = m ? parseInt(m[1]) : 0;
    return { valid: false, error: err.message, line, stack: err.stack, script: match[1] };
  }
}

let v = validate(content);
console.log("Start status:", v.valid ? "VALID" : `INVALID at line ${v.line}: ${v.error}`);

let count = 0;
while (!v.valid && count < 200) {
  count++;
  const lines = v.script.split("\n");
  const lineIdx = v.line - 1;
  const badLine = lines[lineIdx];
  console.log(`[Fix ${count}] Line ${v.line}:`, JSON.stringify(badLine));

  // Find this snippet in content
  // If line ends with a string that was broken across lines:
  // e.g., 'text\n' became 'text\n' in content but was evaluated as a newline
  // We can search for the snippet around lineIdx in content
  const snippet = lines.slice(Math.max(0, lineIdx - 1), Math.min(lines.length, lineIdx + 2)).join("\n");
  
  // Let's see what is near badLine in content
  // In content, search for the bad line text (trimmed)
  const trimmed = badLine.trim();
  const idx = content.indexOf(trimmed);
  if (idx !== -1) {
    // Check next 200 chars in content
    const sub = content.slice(idx, idx + 200);
    // If sub has '\n' instead of '\\n'
    // Replace '\n' with '\\n' in this section
    const subFixed = sub.replace(/(['"])(.*?)\n/g, "$1$2\\n");
    if (subFixed !== sub) {
      content = content.slice(0, idx) + subFixed + content.slice(idx + 200);
      console.log("Applied regex fix at idx", idx);
    } else {
      console.log("Could not auto-replace, sub is:", JSON.stringify(sub.slice(0, 100)));
      break;
    }
  } else {
    console.log("Could not find trimmed in content:", JSON.stringify(trimmed));
    break;
  }

  v = validate(content);
  console.log(`After fix ${count}:`, v.valid ? "VALID" : `Line ${v.line}: ${v.error}`);
}

if (v.valid) {
  console.log("SUCCESS! Writing fixed content to dashboard.mjs");
  fs.writeFileSync(filePath, content, "utf-8");
}
