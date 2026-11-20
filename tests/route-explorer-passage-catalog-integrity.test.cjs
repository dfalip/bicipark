const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function catalog() {
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/modules/route-passage-catalog.js"), "utf8");
  const ranking = 'export function rankRoutesByPassage(entries) { return entries; }';
  const encoded = Buffer.from(source.replace('import { rankRoutesByPassage } from "./route-passage-search.js";', ranking)).toString("base64");
  return import("data:text/javascript;base64," + encoded);
}

test("passage catalog excludes unavailable geometry instead of inventing a center track", async () => {
  const { buildPassageEntries } = await catalog();
  const routes = [
    { id: "missing", center: [41.4, 2.1], geometry: { file: "missing.gpx" } },
    { id: "valid", geometry: { file: "valid.gpx" } },
    { id: "disabled", enabled: false, geometry: { file: "disabled.gpx" } }
  ];
  const calls = [];
  const entries = await buildPassageEntries(routes, async route => {
    calls.push(route.id);
    if (route.id === "missing") throw new Error("not found");
    return { coordinates: [[41.4, 2.1], [41.5, 2.2]] };
  });
  assert.deepEqual(calls, ["missing", "valid"]);
  assert.deepEqual(entries.map(entry => entry.route.id), ["valid"]);
});

test("shared geometry source is loaded only once without substituting missing metadata", async () => {
  const { buildPassageEntries } = await catalog();
  let loads = 0;
  const routes = [
    { id: "a", geometry: { file: "shared.geojson" } },
    { id: "b", geometry: { file: "shared.geojson" } },
    { id: "no-source" }
  ];
  const entries = await buildPassageEntries(routes, async route => {
    loads++;
    return route.id === "no-source" ? null : { coordinates: [[41, 2]] };
  });
  assert.equal(loads, 2);
  assert.deepEqual(entries.map(entry => entry.route.id), ["a", "b"]);
});
