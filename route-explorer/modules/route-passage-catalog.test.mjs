import assert from "node:assert/strict";
import { buildPassageEntries, findRoutesPassingNear } from "./route-passage-catalog.js";

const geometry = {
  type: "LineString",
  coordinates: [[2.15, 41.39], [2.16, 41.39]]
};

let loads = 0;
const routes = [
  { id: "a", geometry: { file: "shared.geojson" } },
  { id: "b", geometry: { file: "shared.geojson" } },
  { id: "missing", center: { lat: 41.39, lng: 2.155 } },
  { id: "disabled", enabled: false, geometry: { file: "disabled.geojson" } }
];

const entries = await buildPassageEntries(routes, async route => {
  loads += 1;
  if (route.id === "missing") throw new Error("no geometry");
  return geometry;
});

assert.deepEqual(entries.map(entry => entry.route.id), ["a", "b"]);
assert.equal(loads, 2, "shared geometry loads once; missing route is attempted once");

const matches = await findRoutesPassingNear({
  routes,
  target: [41.39, 2.155],
  maximumDistanceKm: 0.05,
  loadGeometry: async route => {
    if (route.id === "missing") throw new Error("no geometry");
    return geometry;
  }
});

assert.deepEqual(matches.map(match => match.route.id), ["a", "b"]);
assert.ok(matches.every(match => match.distanceKm < 0.001));
assert.ok(!matches.some(match => match.route.id === "missing"), "center metadata must never substitute missing track geometry");

console.log("route-passage-catalog tests: ok");
