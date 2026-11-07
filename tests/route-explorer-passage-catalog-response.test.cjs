const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");
const start = source.indexOf("async function loadRoutes()");
const end = source.indexOf("\nfunction formatDistance(", start);
assert.ok(start >= 0 && end > start, "loadRoutes implementation exists");
const loadRoutesSource = source.slice(start, end);

async function withCatalog(payload, ok = true) {
  const context = { fetch: async () => ({ ok, status: 503, json: async () => payload }) };
  const loadRoutes = vm.runInNewContext(loadRoutesSource + "\nloadRoutes;", context);
  return loadRoutes();
}

test("malformed route catalog is an error, not an empty search", async () => {
  for (const payload of [null, {}, { routes: [] }, "not an array"]) {
    await assert.rejects(withCatalog(payload), /Invalid route catalog/);
  }
});

test("valid empty catalog remains empty and disabled routes are excluded", async () => {
  assert.equal((await withCatalog([])).length, 0);
  const routes = await withCatalog([{ id: "enabled" }, { id: "disabled", enabled: false }]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].id, "enabled");
});

test("HTTP failure remains an error", async () => {
  await assert.rejects(withCatalog([], false), /routes 503/);
});
