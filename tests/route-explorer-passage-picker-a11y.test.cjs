const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("passage map picker exposes pressed state and Escape cancels picking", () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  const listeners = {};
  const mapContainer = window.document.createElement("div");
  window.document.body.appendChild(mapContainer);
  const map = {
    getContainer: () => mapContainer,
    on: (event, callback) => { listeners[event] = callback; }
  };
  window.__BICIPARK_ROUTE_EXPLORER_MAP__ = map;
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8")
    .replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, {
    window,
    document: window.document,
    localStorage: window.localStorage,
    fetch: () => { throw new Error("unexpected fetch"); },
    console,
    Number,
    String,
    CustomEvent: window.CustomEvent
  });
  const button = window.document.querySelector("#passagePick");
  const section = window.document.querySelector("#passageSearch");
  assert.ok(button);
  assert.equal(button.getAttribute("aria-pressed"), "false");
  button.click();
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(section.classList.contains("is-picking"), true);
  assert.equal(mapContainer.classList.contains("is-passage-picking"), true);
  mapContainer.focus();
  mapContainer.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(window.document.activeElement, button, "Escape returns focus to the picker control");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(section.classList.contains("is-picking"), false);
  assert.equal(mapContainer.classList.contains("is-passage-picking"), false);
  button.click();
  listeners.click({ latlng: { lat: 41.387, lng: 2.17 } });
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(window.document.querySelector("#passageLat").value, "41.387000");
  assert.equal(window.document.querySelector("#passageLng").value, "2.170000");
  dom.window.close();
});
