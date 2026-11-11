'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRouteGeometry } = require('../lib/route-geometry-validation.cjs');

test('accepts real GeoJSON coordinate order and complete elevations', () => {
  const result = validateRouteGeometry({ type: 'Feature', geometry: {
    type: 'LineString', coordinates: [[2.1, 41.3, 12], [2.2, 41.4, 15]]
  } });
  assert.equal(result.valid, true);
  assert.equal(result.pointCount, 2);
  assert.equal(result.hasCompleteElevation, true);
  assert.deepEqual(result.lines[0][0], [2.1, 41.3, 12]);
});

test('missing elevation remains missing, never converted to zero', () => {
  const result = validateRouteGeometry({ type: 'LineString', coordinates: [[2, 41, 0], [2.1, 41.1]] });
  assert.equal(result.valid, true);
  assert.equal(result.hasCompleteElevation, false);
});

test('rejects invalid, null, string and out-of-range coordinates', () => {
  for (const bad of [[181, 41], [2, -91], [null, 41], ['2', 41], [2, 41, Infinity], [2, 41, null], [2, 41, 0, 1]]) {
    const result = validateRouteGeometry({ type: 'LineString', coordinates: [[2, 41], bad] });
    assert.equal(result.valid, false);
    assert.equal(result.lines, null);
    assert.ok(result.errors.includes('invalid_coordinate'));
  }
});

test('supports valid multiline and rejects empty or single-point segments', () => {
  const good = validateRouteGeometry({ type: 'MultiLineString', coordinates: [
    [[2, 41], [2.1, 41.1]], [[3, 42], [3.1, 42.1]]
  ] });
  assert.equal(good.valid, true);
  assert.equal(good.pointCount, 4);
  for (const coordinates of [[], [[[2, 41]]]]) {
    assert.equal(validateRouteGeometry({ type: 'MultiLineString', coordinates }).valid, false);
  }
});

test('rejects unsupported shapes and limits oversized input', () => {
  assert.equal(validateRouteGeometry({ type: 'Point', coordinates: [2, 41] }).valid, false);
  const route = { type: 'LineString', coordinates: [[2, 41], [2.1, 41.1], [2.2, 41.2]] };
  const result = validateRouteGeometry(route, { maxPoints: 2 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('point_limit_exceeded'));
});

test('point limit applies across all MultiLineString segments, not per segment', () => {
  const route = { type: 'MultiLineString', coordinates: [
    [[2, 41], [2.1, 41.1]], [[3, 42], [3.1, 42.1]]
  ] };
  const result = validateRouteGeometry(route, { maxPoints: 3 });
  assert.equal(result.valid, false);
  assert.equal(result.lines, null);
  assert.ok(result.errors.includes('point_limit_exceeded'));
});

test('mixed elevation availability is not treated as a complete elevation profile', () => {
  const route = { type: 'MultiLineString', coordinates: [
    [[2, 41, 0], [2.1, 41.1, 15]], [[3, 42], [3.1, 42.1, 8]]
  ] };
  const result = validateRouteGeometry(route);
  assert.equal(result.valid, true);
  assert.equal(result.hasCompleteElevation, false);
  assert.equal(result.lines[0][0][2], 0);
  assert.equal(result.lines[1][0].length, 2);
});

test('invalid geometry cannot expose partially cleaned lines', () => {
  const route = { type: 'MultiLineString', coordinates: [
    [[2, 41], [2.1, 41.1]], [[3, 42], [181, 42]]
  ] };
  const result = validateRouteGeometry(route);
  assert.equal(result.valid, false);
  assert.equal(result.lines, null);
  assert.ok(result.errors.includes('invalid_coordinate'));
});


test('validated coordinates are isolated from subsequent source mutations', () => {
  const coordinates = [[2, 41, 0], [2.1, 41.1, 12]];
  const result = validateRouteGeometry({ type: 'LineString', coordinates });
  assert.equal(result.valid, true);
  coordinates[0][0] = 181;
  coordinates[1][2] = 999;
  assert.deepEqual(result.lines, [[[2, 41, 0], [2.1, 41.1, 12]]]);
});


test('invalid explicit point limits fail closed rather than silently using defaults', () => {
  const route = { type: 'LineString', coordinates: [[2, 41], [2.1, 41.1]] };
  for (const maxPoints of [0, 1, -1, 1.5, NaN, Infinity, '2', null]) {
    const result = validateRouteGeometry(route, { maxPoints });
    assert.equal(result.valid, false);
    assert.equal(result.lines, null);
    assert.ok(result.errors.includes('invalid_point_limit'));
  }
  assert.equal(validateRouteGeometry(route, { maxPoints: 2 }).valid, true);
});


test('malformed options fail closed without throwing', () => {
  const route = { type: 'LineString', coordinates: [[2, 41], [2.1, 41.1]] };
  for (const options of [null, 2, 'bad', false, []]) {
    const result = validateRouteGeometry(route, options);
    assert.equal(result.valid, false);
    assert.equal(result.lines, null);
    assert.ok(result.errors.includes('invalid_options'));
  }
  assert.equal(validateRouteGeometry(route, {}).valid, true);
});


test('rejects sparse coordinate arrays instead of accepting missing longitude or elevation', () => {
  const sparseLongitude = [, 41];
  const sparseElevation = [2, 41, ,];
  const sparseLatitude = [2, , 12];
  for (const bad of [sparseLongitude, sparseLatitude, sparseElevation]) {
    const result = validateRouteGeometry({ type: 'LineString', coordinates: [[2, 41], bad] });
    assert.equal(result.valid, false);
    assert.equal(result.lines, null);
    assert.ok(result.errors.includes('invalid_coordinate'));
  }
});
