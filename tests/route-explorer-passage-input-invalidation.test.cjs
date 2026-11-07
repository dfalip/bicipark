const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");
const start = source.indexOf("  // Coordinates or radius changed:");
const end = source.indexOf('  section.querySelector("#passageSubmit").addEventListener', start);
assert.ok(start !== -1 && end > start, "input invalidation handler exists");
const snippet = source.slice(start, end);

test("editing latitude, longitude or radius invalidates prior passage matches", () => {
  const controls = [0, 1, 2].map(() => ({ listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } }));
  const results = { cleared: 0, replaceChildren() { this.cleared++; } };
  const status = { textContent: "Previous matches" };
  const context = {
    latInput: controls[0], lngInput: controls[1],
    section: { querySelector: selector => {
      assert.equal(selector, "#passageRadius");
      return controls[2];
    } },
    searchRevision: 7, results, status
  };
  vm.runInNewContext(snippet, context);
  for (const control of controls) {
    assert.equal(typeof control.listeners.input, "function");
    status.textContent = "Old";
    control.listeners.input();
    assert.equal(status.textContent, "");
  }
  assert.equal(context.searchRevision, 10);
  assert.equal(results.cleared, 3);
});
