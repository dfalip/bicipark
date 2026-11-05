const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");

test("passage search progressively reveals all matches with translated controls", () => {
  for (const phrase of [
    "Mostrar 10 rutes més",
    "Mostrar 10 rutas más",
    "Show 10 more routes",
    "Afficher 10 itinéraires supplémentaires"
  ]) assert.ok(source.includes(phrase), phrase);
  assert.match(source, /Math\.min\(shown \+ 10, matches\.length\)/);
  assert.match(source, /matches\.slice\(shown, end\)/);
  assert.match(source, /more\.hidden = shown >= matches\.length/);
  assert.match(source, /more\.addEventListener\("click", showNext\)/);
});
