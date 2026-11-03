import assert from "node:assert/strict";
import {
  haversineKm,
  nearestTrackPoint,
  routePassesNear,
  rankRoutesByPassage
} from "./route-passage-search.js";

const target = [41.3902, 2.1540];
const nearGeoJson = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [[2.1538, 41.3900], [2.1600, 41.3950]]
  }
};
const farPolyline = {
  kind: "polylines",
  data: [[[41.50, 2.30], [41.51, 2.31]]]
};

assert.ok(haversineKm(target, target) < 0.000001);
assert.equal(nearestTrackPoint(null, target), null);

const nearest = nearestTrackPoint(nearGeoJson, target);
assert.ok(nearest);
assert.ok(nearest.distanceKm < 0.1);
assert.deepEqual(nearest.point, [41.39, 2.1538]);

assert.equal(routePassesNear(nearGeoJson, target, 0.1)?.passes, true);
assert.equal(routePassesNear(farPolyline, target, 0.1)?.passes, false);
assert.equal(routePassesNear(nearGeoJson, target, -1), null);

const ranked = rankRoutesByPassage([
  { route: { id: "far" }, geometry: farPolyline },
  { route: { id: "near" }, geometry: nearGeoJson },
  { route: { id: "missing" }, geometry: null }
], target, 1);

assert.deepEqual(ranked.map(item => item.route.id), ["near"]);
assert.ok(Number.isFinite(ranked[0].distanceKm));

console.log("route-passage-search tests: ok");
