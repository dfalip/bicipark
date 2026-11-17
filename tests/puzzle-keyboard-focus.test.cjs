const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("bike-parking-puzzle/app.js", "utf8");

test("puzzle board restores keyboard focus after its DOM rebuild", () => {
  const capture = source.indexOf("const focusedTile = ui.board.contains(document.activeElement)");
  const rebuild = source.indexOf("ui.board.replaceChildren()", capture);
  const restore = source.indexOf("replacement?.focus({preventScroll:true})", rebuild);
  assert.ok(capture >= 0 && rebuild > capture && restore > rebuild);
});

test("puzzle focus falls back to an enabled tile when old tile becomes a wall", () => {
  assert.match(source, /querySelectorAll\\("button\\[data-pos\\]:not\\(:disabled\\)"\\)/);
  assert.match(source, /tiles\\.find\\(tile => Number\\(tile\\.dataset\\.pos\\) === focusedPos\\)/);
  assert.match(source, /tiles\\.reduce\\(\\(nearest, tile\\) =>/);
});
