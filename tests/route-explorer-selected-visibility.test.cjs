const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/app.js"), "utf8");
const start = source.indexOf("function getVisibleLocalRoutes() {");
const end = source.indexOf("\nfunction getVisibleSegmentedRoutes()", start);
assert.ok(start >= 0 && end > start, "route selector must exist");
const selector = source.slice(start, end);

function visible({ zoom, selectedId, routes, region = "all" }) {
  const state = { localRoutes: routes, selectedRouteId: selectedId };
  const map = { getZoom: () => zoom, getBounds: () => ({}) };
  const elements = { regionFilter: { value: region }, modalityFilter: { value: "all" }, difficultyFilter: { value: "all" } };
  const context = { state, map, elements, SETTINGS: { overviewMaximumZoom: 7, regionalMaximumZoom: 9, localMaximumZoom: 11, regionalRouteLimit: 5, localRouteLimit: 15, detailRouteLimit: 30 },
    getVisibilityMode: z => z <= 7 ? "overview" : z <= 9 ? "regional" : z <= 11 ? "local" : "detail",
    getLocalRouteLimit: mode => mode === "regional" ? 5 : mode === "local" ? 15 : 30,
    routeMatchesFilters: r => region === "all" || r.region === region,
    routeIntersectsBounds: r => r.inViewport !== false };
  return Array.from(vm.runInNewContext(selector + "\ngetVisibleLocalRoutes()", context), r => r.id);
}

test("selected route survives regional featured filter and minimumZoom", () => {
  const routes = [{ id: "selected", enabled: true, featured: false, minimumZoom: 14, inViewport: false, region: "other" }];
  assert.deepEqual(visible({ zoom: 8, selectedId: "selected", routes, region: "catalonia" }), ["selected"]);
});

test("selected route survives catalog priority limit", () => {
  const routes = Array.from({ length: 40 }, (_, i) => ({ id: String(i), priority: i, featured: true }));
  routes.push({ id: "selected", priority: 999, featured: true });
  const result = visible({ zoom: 13, selectedId: "selected", routes });
  assert.equal(result[0], "selected");
  assert.equal(result.length, 30);
});

test("disabled routes never become visible through selection", () => {
  assert.deepEqual(visible({ zoom: 13, selectedId: "disabled", routes: [{ id: "disabled", enabled: false }] }), []);
});

test("overview remains empty without selection", () => {
  assert.deepEqual(visible({ zoom: 6, selectedId: null, routes: [{ id: "normal" }] }), []);
});
