const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("bike-parking-puzzle/app.js", "utf8");

test("puzzle board retains keyboard focus across its DOM rebuild", () => {
  const capture = source.indexOf("const focusedTile = ui.board.contains(document.activeElement)");
  const rebuild = source.indexOf("ui.board.replaceChildren()", capture);
  const restore = source.indexOf("replacement.focus({preventScroll:true})", rebuild);
  assert.ok(capture >= 0 && rebuild > capture && restore > rebuild);
  assert.match(source.slice(rebuild, restore), /!replacement.disabled/);
});
