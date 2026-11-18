const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");

test("Puzzle keeps real DOM keyboard focus through selection, move, undo and reset", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bicipark-puzzle-focus-"));
  const html = fs.readFileSync("bike-parking-puzzle/index.html", "utf8");
  const dom = new JSDOM(html, { url: "https://example.test/bike-parking-puzzle/" });
  const previous = { document: global.document, HTMLElement: global.HTMLElement, localStorage: global.localStorage };
  try {
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.localStorage = dom.window.localStorage;
    fs.writeFileSync(path.join(tmp, "engine.mjs"), fs.readFileSync("bike-parking-puzzle/engine.js", "utf8"));
    fs.writeFileSync(path.join(tmp, "app.mjs"), fs.readFileSync("bike-parking-puzzle/app.js", "utf8").replace('"./engine.js"', '"./engine.mjs"'));
    const engine = await import(pathToFileURL(path.join(tmp, "engine.mjs")).href);
    await import(pathToFileURL(path.join(tmp, "app.mjs")).href);
    const board = dom.window.document.getElementById("board");
    const tile = pos => board.querySelector(`button[data-pos="${pos}"]`);
    const game = engine.newGame(0);
    const start = game.positions[0];
    const destination = engine.movesAvailable(game, 0)[0].to;
    tile(start).focus();
    tile(start).click();
    assert.equal(dom.window.document.activeElement.dataset.pos, String(start), "selection retains focus");
    tile(destination).click();
    assert.equal(dom.window.document.activeElement.dataset.pos, String(start), "move retains focus on the selected coordinate");
    dom.window.document.getElementById("undoButton").click();
    assert.equal(dom.window.document.activeElement.dataset.pos, String(start), "undo retains focus");
    dom.window.document.getElementById("resetButton").click();
    assert.equal(dom.window.document.activeElement.dataset.pos, String(start), "reset retains focus");
    const select = dom.window.document.getElementById("levelSelect");
    select.value = "1";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.ok(board.contains(dom.window.document.activeElement), "level change retains board focus");
    assert.equal(dom.window.document.activeElement.disabled, false);
  } finally {
    global.document = previous.document;
    global.HTMLElement = previous.HTMLElement;
    global.localStorage = previous.localStorage;
    dom.window.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
