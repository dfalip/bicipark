'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveElevationProfile } = require('../lib/elevation-profile.cjs');

test('marks only genuine segment gaps, not shared endpoints', () => {
  const route = { type: 'MultiLineString', coordinates: [
    [[2, 41, 10], [2.01, 41.01, 20]],
    [[2.01, 41.01, 20], [2.02, 41.02, 30]],
    [[2.1, 41.1, 40], [2.11, 41.11, 50]]
  ] };
  const profile = deriveElevationProfile(route);
  assert.equal(profile.valid, true);
  assert.equal(profile.hasDiscontinuities, true);
  assert.deepEqual(profile.samples.map(s => s.startsDiscontinuity),
    [false, false, false, false, true, false]);
  assert.equal(profile.samples[4].segmentDistanceMeters, 0);
  assert.equal(profile.samples[4].distanceMeters, profile.samples[3].distanceMeters);
});

test('single connected line has no gap markers', () => {
  const profile = deriveElevationProfile({ type: 'LineString', coordinates: [[2, 41], [2.01, 41.01]] });
  assert.equal(profile.valid, true);
  assert.equal(profile.hasDiscontinuities, false);
  assert.ok(profile.samples.every(s => s.startsDiscontinuity === false));
});
