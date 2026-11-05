const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("map picker selects valid coordinates, restores focus and ignores invalid map clicks", () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div><div id="map"></div></body></html>', { url: "https://example.test/" });
  try {
    const { window } = dom;
    const handlers = {};
    const container = window.document.querySelector("#map");
    const map = { on: (name, handler) => { handlers[name] = handler; }, getContainer: () => container };
    window.__BICIPARK_ROUTE_EXPLORER_MAP__ = map;
    const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8")
      .replace(/^import .*;\s*$/gm, "");
    vm.runInNewContext(source, {
      window, document: window.document, localStorage: window.localStorage,
      fetch: async () => { throw new Error("No fetch expected"); },
      findRoutesPassingNear: async () => [], loadRouteGeometry: async () => null,
      console, Number, String, CustomEvent: window.CustomEvent
    });
    const pick = window.document.querySelector("#passagePick");
    const submit = window.document.querySelector("#passageSubmit");
    const lat = window.document.querySelector("#passageLat");
    const lng = window.document.querySelector("#passageLng");
    assert.equal(typeof handlers.click, "function");
    pick.click();
    assert.equal(pick.getAttribute("aria-pressed"), "true");
    assert.equal(container.classList.contains("is-passage-picking"), true);
    handlers.click({ latlng: { lat: 91, lng: 2 } });
    assert.equal(pick.getAttribute("aria-pressed"), "true");
    assert.equal(lat.value, "");
    handlers.click({ latlng: { lat: 41.387, lng: 2.17 } });
    assert.equal(lat.value, "41.387000");
    assert.equal(lng.value, "2.170000");
    assert.equal(pick.getAttribute("aria-pressed"), "false");
    assert.equal(container.classList.contains("is-passage-picking"), false);
    assert.equal(window.document.activeElement, submit);
    pick.click();
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(pick.getAttribute("aria-pressed"), "false");
    assert.equal(window.document.activeElement, pick);
  } finally {
    dom.window.close();
  }
});
