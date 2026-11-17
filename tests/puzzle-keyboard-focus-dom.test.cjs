const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");

test("Puzzle keeps actual keyboard focus across selection, move, undo and restart", async () => {
  const html = fs.readFileSync("bike-parking-puzzle/index.html", "utf8");
  const dom = new JSDOM(html, { url: "https://bicipark.test/bike-parking-puzzle/" });
  const previous = { document: global.document, HTMLElement: global.HTMLElement, localStorage: global.localStorage };
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;
  try {
    const engine = fs.readFileSync("bike-parking-puzzle/engine.js", "utf8");
    const engineUrl = "data:text/javascript;charset=utf-8," + encodeURIComponent(engine);
    const app = fs.readFileSync("bike-parking-puzzle/app.js", "utf8")
      .replace('from "./engine.js"', 'from "' + engineUrl + '"');
    await import("data:text/javascript;charset=utf-8," + encodeURIComponent(app));
    const board = document.getElementById("board");
    const tiles = () => [...board.querySelectorAll("button[data-pos]:not(:disabled)")];
    const bike = tiles().find(t => t.getAttribute("aria-label").startsWith("Bicicleta "));
    assert.ok(bike, "level must contain a playable bike");
    const pos = bike.dataset.pos;
    bike.focus();
    bike.click();
    assert.equal(document.activeElement.dataset.pos, pos, "selection preserves tile focus");
    const possible = board.querySelector(".tile-possible");
    assert.ok(possible, "selected bike has a legal destination");
    possible.focus();
    const target = possible.dataset.pos;
    possible.click();
    assert.equal(document.activeElement.dataset.pos, target, "move restores focus to rebuilt destination");
    document.getElementById("undoButton").click();
    assert.equal(document.activeElement.dataset.pos, target, "undo keeps focus on an enabled board tile");
    document.getElementById("resetButton").click();
    assert.equal(document.activeElement.dataset.pos, target, "restart keeps focus on an enabled board tile");
  } finally {
    global.document = previous.document;
    global.HTMLElement = previous.HTMLElement;
    global.localStorage = previous.localStorage;
    dom.window.close();
  }
});
