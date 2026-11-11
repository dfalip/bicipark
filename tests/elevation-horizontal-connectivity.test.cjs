'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveElevationProfile } = require('../lib/elevation-profile.cjs');

test('shared horizontal endpoint remains connected despite different elevation metadata', () => {
  const profile = deriveElevationProfile({ type: 'MultiLineString', coordinates: [
    [[2, 41, 0], [2.01, 41.01, 100]],
    [[2.01, 41.01], [2.02, 41.02, 110]]
  ] });
  assert.equal(profile.valid, true);
  assert.equal(profile.hasDiscontinuities, false);
  assert.equal(profile.samples[2].startsDiscontinuity, false);
  assert.equal(profile.samples[2].elevationMeters, null);
  assert.equal(profile.samples[2].distanceMeters, profile.samples[1].distanceMeters);
  assert.equal(profile.samples[2].segmentDistanceMeters, 0);
  assert.equal(profile.hasCompleteElevation, false);
});

test('separate segments with same latitude but different longitude have a gap', () => {
  const profile = deriveElevationProfile({ type: 'MultiLineString', coordinates: [
    [[2, 41], [2.01, 41]],
    [[2.02, 41], [2.03, 41]]
  ] });
  assert.equal(profile.valid, true);
  assert.equal(profile.hasDiscontinuities, true);
  assert.equal(profile.samples[2].startsDiscontinuity, true);
  assert.equal(profile.samples[2].distanceMeters, profile.samples[1].distanceMeters);
});
