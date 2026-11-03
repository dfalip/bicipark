import assert from "node:assert/strict";
import {
  haversineKm,
  nearestTrackPoint,
  nearestTrackSegment,
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
const farPolyline = { kind: "polylines", data: [[[41.50, 2.30], [41.51, 2.31]]] };

assert.ok(haversineKm(target, target) < 0.000001);
assert.equal(nearestTrackPoint(null, target), null);
assert.equal(nearestTrackSegment(null, target), null);

const nearest = nearestTrackPoint(nearGeoJson, target);
assert.ok(nearest.distanceKm < 0.1);
assert.deepEqual(nearest.point, [41.39, 2.1538]);

const crossing = {
  type: "LineString",
  coordinates: [[2.15, 41.39], [2.16, 41.39]]
};
const crossingTarget = [41.39, 2.155];
const vertexDistance = nearestTrackPoint(crossing, crossingTarget).distanceKm;
const segmentMatch = nearestTrackSegment(crossing, crossingTarget);
assert.ok(vertexDistance > 0.4);
assert.ok(segmentMatch.distanceKm < 0.001);
assert.equal(segmentMatch.segmentIndex, 0);
assert.ok(Math.abs(segmentMatch.fraction - 0.5) < 0.001);
assert.equal(routePassesNear(crossing, crossingTarget, 0.05)?.passes, true);

const separatedLines = {
  type: "MultiLineString",
  coordinates: [
    [[2.10, 41.39], [2.11, 41.39]],
    [[2.20, 41.39], [2.21, 41.39]]
  ]
};
assert.equal(routePassesNear(separatedLines, [41.39, 2.155], 1)?.passes, false);

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
