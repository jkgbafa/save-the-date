// Self-check: every element ID main.js touches must exist in index.html.
// Run with: node check.js
"use strict";
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("js/main.js", "utf8");

const ids = new Set();
for (const m of js.matchAll(/\$\("([^"]+)"\)|getElementById\("([^"]+)"\)/g)) {
  ids.add(m[1] || m[2]);
}
const missing = [...ids].filter((id) => !html.includes('id="' + id + '"'));
console.assert(ids.size > 10, "expected to find IDs in main.js, found " + ids.size);
console.assert(missing.length === 0, "IDs used in main.js but missing from index.html: " + missing.join(", "));
if (missing.length === 0) console.log("OK — all " + ids.size + " IDs used by main.js exist in index.html");
else process.exit(1);
