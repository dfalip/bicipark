const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/app.js"), "utf8");
const start = source.indexOf('window.addEventListener("bicipark:passage-open-route"');
const end = source.indexOf("\nfunction createCollectionCard(", start);
assert.ok(start !== -1 && end > start, "passage route navigation listener exists");
const listenerSource = source.slice(start, end);

function setup({ enabled = true, validBounds = true, geometryError = false } = {}) {
  const calls = [];
  let listener;
  const route = { id: "real-route", enabled };
  const bounds = { isValid: () => validBounds };
  const elements = {
    regionFilter: { value: "other" },
    modalityFilter: { value: "road" },
    difficultyFilter: { value: "hard" },
    routeDetails: { scrollIntoView: () => calls.push("scroll") }
  };
  const context = {
    window: { addEventListener: (type, fn) => {
      assert.equal(type, "bicipark:passage-open-route");
      listener = fn;
    } },
    state: { localRoutes: [route] },
    elements,
    loadRouteGeometry: async () => {
      calls.push("geometry");
      if (geometryError) throw new Error("unavailable geometry");
      return { coordinates: [] };
    },
    createGeometryLayer: () => ({ getBounds: () => bounds }),
    getRouteStyle: () => ({}),
    map: { fitBounds: (b, options) => {
      assert.equal(b, bounds);
      assert.equal(options.maxZoom, 14);
      calls.push("fit");
    } },
    selectRoute: async (id, options) => {
      assert.equal(id, route.id);
      assert.equal(options.fit, false);
      calls.push("select");
    },
    console: { warn: () => calls.push("warning") }
  };
  vm.runInNewContext(listenerSource, context);
  return { calls, elements, fire: id => listener({ detail: { routeId: id } }) };
}

test("passage result navigates using real geometry before selecting and opens details", async () => {
  const { calls, elements, fire } = setup();
  await fire("real-route");
  assert.deepEqual(calls, ["geometry", "fit", "select", "scroll"]);
  assert.equal(elements.regionFilter.value, "all");
  assert.equal(elements.modalityFilter.value, "all");
  assert.equal(elements.difficultyFilter.value, "all");
});

test("unknown and disabled passage routes do not navigate", async () => {
  const unknown = setup();
  await unknown.fire("missing");
  assert.deepEqual(unknown.calls, []);
  const disabled = setup({ enabled: false });
  await disabled.fire("real-route");
  assert.deepEqual(disabled.calls, []);
});

test("invalid geometry bounds do not alter filters or select route", async () => {
  const { calls, elements, fire } = setup({ validBounds: false });
  await fire("real-route");
  assert.deepEqual(calls, ["geometry"]);
  assert.equal(elements.regionFilter.value, "other");
});

test("geometry load errors leave selection untouched", async () => {
  const { calls, fire } = setup({ geometryError: true });
  await fire("real-route");
  assert.deepEqual(calls, ["geometry", "warning"]);
});
