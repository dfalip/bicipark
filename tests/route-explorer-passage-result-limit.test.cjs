const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");

test("passage search discloses the visible result limit in all four languages", () => {
  for (const phrase of [
    "Mostrant les 10 primeres coincidències.",
    "Mostrando las 10 primeras coincidencias.",
    "Showing the first 10 matches.",
    "Affichage des 10 premières correspondances."
  ]) assert.ok(source.includes(phrase), phrase);
  assert.match(source, /matches\.slice\(0, 10\)/);
  assert.match(source, /if \(matches\.length > 10\)/);
  assert.match(source, /notice\.textContent = t\.truncated/);
});
