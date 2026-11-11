'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deriveElevationProfile } = require('../lib/elevation-profile.cjs');
test('distance and elevations derive from supplied GeoJSON only', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41, 0], [2.01, 41, 12]] });
  assert.equal(result.valid, true);
  assert.equal(result.hasCompleteElevation, true);
  assert.equal(result.samples[0].elevationMeters, 0);
  assert.ok(result.distanceMeters > 800 && result.distanceMeters < 900);
  assert.equal(result.samples[1].distanceMeters, result.distanceMeters);
});
test('missing elevations remain null and no gap distance is invented', () => {
  const result = deriveElevationProfile({ type: 'MultiLineString', coordinates: [
    [[2, 41], [2.01, 41]], [[10, 50, 7], [10.01, 50, 9]]
  ] });
  assert.equal(result.valid, true);
  assert.equal(result.hasCompleteElevation, false);
  assert.equal(result.samples[0].elevationMeters, null);
  assert.equal(result.samples[2].distanceMeters, result.samples[1].distanceMeters);
  assert.ok(result.distanceMeters < 2000);
});
test('invalid source never yields partial samples', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [181, 41]] });
  assert.equal(result.valid, false);
  assert.equal(result.samples, null);
  assert.equal(result.distanceMeters, null);
});
test('point count limits propagate from strict validator', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [3, 42], [4, 43]] }, { maxPoints: 2 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('point_limit_exceeded'));
});

test('all missing elevations remain unavailable, including at zero distance', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [2, 41]] });
  assert.equal(result.valid, true);
  assert.equal(result.distanceMeters, 0);
  assert.equal(result.hasCompleteElevation, false);
  assert.deepEqual(result.samples.map(sample => sample.elevationMeters), [null, null]);
});

test('Feature geometry preserves segment indices and resets no artificial gap', () => {
  const result = deriveElevationProfile({ type: 'Feature', properties: {}, geometry: {
    type: 'MultiLineString', coordinates: [
      [[2, 41, 0], [2.01, 41, 5]],
      [[-73, 40, 10], [-73.01, 40, 15]]
    ]
  } });
  assert.equal(result.valid, true);
  assert.deepEqual(result.samples.map(sample => sample.segmentIndex), [0, 0, 1, 1]);
  assert.deepEqual(result.samples.map(sample => sample.pointIndex), [0, 1, 0, 1]);
  assert.equal(result.samples[2].distanceMeters, result.samples[1].distanceMeters);
  assert.equal(result.hasCompleteElevation, true);
});

test('malformed validation options fail closed without profile samples', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [2.01, 41]] }, null);
  assert.equal(result.valid, false);
  assert.equal(result.samples, null);
  assert.ok(result.errors.includes('invalid_options'));
});

test('antimeridian crossing uses shortest spherical arc, not a world-spanning jump', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [
    [179.9, 0, 3], [-179.9, 0, 4]
  ] });
  assert.equal(result.valid, true);
  assert.ok(result.distanceMeters > 20000 && result.distanceMeters < 25000);
  assert.deepEqual(result.samples.map(sample => sample.elevationMeters), [3, 4]);
});

test('source coordinates are not mutated when deriving a profile', () => {
  const coordinates = [[2, 41, 0], [2.01, 41]];
  const original = JSON.stringify(coordinates);
  const result = deriveElevationProfile({ type: 'LineString', coordinates });
  assert.equal(result.valid, true);
  assert.equal(JSON.stringify(coordinates), original);
  assert.equal(result.samples[1].elevationMeters, null);
});

test('negative and zero elevations remain exact source values, not missing data', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [
    [2, 41, -12], [2.001, 41, 0], [2.002, 41, -4]
  ] });
  assert.equal(result.valid, true);
  assert.equal(result.hasCompleteElevation, true);
  assert.deepEqual(result.samples.map(sample => sample.elevationMeters), [-12, 0, -4]);
  assert.ok(result.samples[2].distanceMeters > result.samples[1].distanceMeters);
});

test('repeated positions within a segment add zero distance without dropping samples', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [
    [2, 41, 1], [2, 41, 2], [2.01, 41, 3]
  ] });
  assert.equal(result.valid, true);
  assert.equal(result.samples.length, 3);
  assert.equal(result.samples[0].distanceMeters, 0);
  assert.equal(result.samples[1].distanceMeters, 0);
  assert.ok(result.samples[2].distanceMeters > 0);
});


test('elevation coverage distinguishes absent, partial and complete source altitude', () => {
  const absent = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [2.01, 41]] });
  assert.deepEqual([absent.elevationPointCount, absent.pointCount, absent.hasAnyElevation, absent.hasCompleteElevation], [0, 2, false, false]);
  const partial = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41, 0], [2.01, 41]] });
  assert.deepEqual([partial.elevationPointCount, partial.pointCount, partial.hasAnyElevation, partial.hasCompleteElevation], [1, 2, true, false]);
  const complete = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41, -5], [2.01, 41, 0]] });
  assert.deepEqual([complete.elevationPointCount, complete.pointCount, complete.hasAnyElevation, complete.hasCompleteElevation], [2, 2, true, true]);
});


test('invalid geometry reports unavailable coverage rather than misleading zero counts', () => {
  const result = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [200, 41]] });
  assert.equal(result.valid, false);
  assert.equal(result.samples, null);
  assert.equal(result.distanceMeters, null);
  assert.equal(result.elevationPointCount, null);
  assert.equal(result.pointCount, null);
  assert.equal(result.hasAnyElevation, false);
  assert.equal(result.hasCompleteElevation, false);
});
