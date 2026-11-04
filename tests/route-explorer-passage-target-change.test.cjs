const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("picking a new map target clears stale results and ignores old searches", async () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  let onMapClick;
  let resolveFetch;
  const map = {
    getContainer: () => window.document.createElement("div"),
    on: (_name, fn) => { onMapClick = fn; }
  };
  window.__BICIPARK_ROUTE_EXPLORER_MAP__ = map;
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, {
    window, document: window.document, localStorage: window.localStorage,
    fetch: () => new Promise(resolve => { resolveFetch = resolve; }),
    console, Number, String, CustomEvent: window.CustomEvent
  });
  const q = selector => window.document.querySelector(selector);
  q("#passageLat").value = "41.387";
  q("#passageLng").value = "2.17";
  q("#passageSubmit").click();
  assert.equal(q("#passageStatus").textContent, "Comprovant geometries…");
  q("#passageResults").textContent = "old results";
  q("#passagePick").click();
  onMapClick({ latlng: { lat: 42, lng: 3 } });
  assert.equal(q("#passageResults").textContent, "");
  assert.equal(q("#passageLat").value, "42.000000");
  assert.equal(q("#passageLng").value, "3.000000");
  resolveFetch({ ok: false, status: 500 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(q("#passageStatus").textContent, "Punt seleccionat al mapa");
  dom.window.close();
});

test("invalid map coordinates do not replace a valid target", () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  let onMapClick;
  window.__BICIPARK_ROUTE_EXPLORER_MAP__ = {
    getContainer: () => window.document.createElement("div"),
    on: (_name, fn) => { onMapClick = fn; }
  };
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, {
    window, document: window.document, localStorage: window.localStorage,
    fetch: () => { throw Error("unexpected"); }, console, Number, String, CustomEvent: window.CustomEvent
  });
  const q = selector => window.document.querySelector(selector);
  q("#passageLat").value = "41";
  q("#passageLng").value = "2";
  q("#passagePick").click();
  onMapClick({ latlng: { lat: NaN, lng: 3 } });
  assert.equal(q("#passageLat").value, "41");
  assert.equal(q("#passageLng").value, "2");
  assert.equal(q("#passagePick").getAttribute("aria-pressed"), "true");
  dom.window.close();
});
