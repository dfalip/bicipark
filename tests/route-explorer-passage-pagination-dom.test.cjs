const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("passage result pagination exposes every match and preserves keyboard focus", async () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  try {
    const { window } = dom;
    const matches = Array.from({ length: 12 }, (_, i) => ({
      route: { id: `route-${i + 1}`, name: `Route ${i + 1}` },
      distanceKm: 0.25
    }));
    const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8")
      .replace(/^import .*;\s*$/gm, "");
    vm.runInNewContext(source, {
      window, document: window.document, localStorage: window.localStorage,
      fetch: async () => ({ ok: true, json: async () => matches.map(m => m.route) }),
      findRoutesPassingNear: async () => matches,
      loadRouteGeometry: async () => ({}),
      console, Number, String, CustomEvent: window.CustomEvent
    });
    window.document.querySelector("#passageLat").value = "41.387";
    window.document.querySelector("#passageLng").value = "2.17";
    window.document.querySelector("#passageSubmit").click();
    // Wait for the async catalog and passage-search promises to settle.
    for (let i = 0; i < 10 && !window.document.querySelector("#passageResults ul"); i++)
      await new Promise(resolve => setTimeout(resolve, 0));
    const results = window.document.querySelector("#passageResults");
    assert.equal(results.querySelectorAll("li").length, 10);
    const more = results.querySelector("button:not(li button)");
    assert.ok(more, "pagination control exists when additional matches remain");
    more.focus();
    more.click();
    assert.equal(results.querySelectorAll("li").length, 12);
    assert.equal(more.hidden, true);
    assert.equal(window.document.activeElement, results.querySelector("li:last-child button"),
      "focus moves to a visible result when pagination control disappears");
  } finally {
    dom.window.close();
  }
});
