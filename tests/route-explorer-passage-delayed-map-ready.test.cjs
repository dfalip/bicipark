const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("passage picker binds after an early map-ready event without a map", () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, { window, document: window.document, localStorage: window.localStorage, console, Number, String });
  window.dispatchEvent(new window.CustomEvent("bicipark:route-map-ready", { detail: {} }));
  const handlers = {};
  const container = window.document.createElement("div");
  const map = {
    on(name, callback) { handlers[name] = callback; },
    getContainer() { return container; }
  };
  window.__BICIPARK_ROUTE_EXPLORER_MAP__ = map;
  window.dispatchEvent(new window.CustomEvent("bicipark:route-map-ready", { detail: { map } }));
  assert.equal(typeof handlers.click, "function");
  window.document.querySelector("#passagePick").click();
  handlers.click({ latlng: { lat: 41.387, lng: 2.17 } });
  assert.equal(window.document.querySelector("#passageLat").value, "41.387000");
  assert.equal(window.document.querySelector("#passageLng").value, "2.170000");
  assert.equal(window.document.querySelector("#passagePick").getAttribute("aria-pressed"), "false");
  dom.window.close();
});

test("passage picker binds on demand if no second map-ready event is emitted", () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, { window, document: window.document, localStorage: window.localStorage, console, Number, String });
  window.dispatchEvent(new window.CustomEvent("bicipark:route-map-ready", { detail: {} }));
  const handlers = {};
  const container = window.document.createElement("div");
  const map = {
    on(name, callback) { handlers[name] = callback; },
    getContainer() { return container; }
  };
  window.__BICIPARK_ROUTE_EXPLORER_MAP__ = map;
  window.document.querySelector("#passagePick").click();
  assert.equal(typeof handlers.click, "function");
  handlers.click({ latlng: { lat: 41.4, lng: 2.2 } });
  assert.equal(window.document.querySelector("#passageLat").value, "41.400000");
  assert.equal(window.document.querySelector("#passageLng").value, "2.200000");
  assert.equal(window.document.querySelector("#passagePick").getAttribute("aria-pressed"), "false");
  dom.window.close();
});
