const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("passage search discloses incomplete geometry coverage in all supported languages", () => {
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");
  for (const text of [
    "els resultats poden ser incomplets",
    "los resultados pueden ser incompletos",
    "results may be incomplete",
    "les résultats peuvent être incomplets"
  ]) assert.ok(source.includes(text), text);
  assert.match(source, /if \(geometry\) checked \+= 1; else unavailable \+= 1;/);
  assert.match(source, /catch \(error\) \{ unavailable \+= 1; throw error; \}/);
  assert.match(source, /unavailable \? `\. \$\{t\.partial\}` : ""/);
});
