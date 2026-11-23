'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '../route-explorer/data/verified-routes.json'), 'utf8'));

test('external verified routes have unique stable identifiers and traceable sources', () => {
  assert.ok(Array.isArray(routes) && routes.length > 0);
  const ids = new Set();
  const sources = new Set();
  for (const route of routes) {
    assert.match(route.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!ids.has(route.id), 'duplicate route id: ' + route.id);
    ids.add(route.id);
    assert.equal(route.kind, 'external', route.id + ': external routes must remain link-only');
    assert.equal(route.verified, true, route.id);
    assert.match(route.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(route.verifiedAt)), route.id);
    assert.ok(route.name && route.region && route.start && route.source, route.id);
    assert.ok(Number.isFinite(route.distanceKm) && route.distanceKm > 0, route.id);
    assert.ok(route.elevationGain == null || (Number.isFinite(route.elevationGain) && route.elevationGain >= 0), route.id);
    for (const field of ['url', 'sourceUrl']) {
      const url = new URL(route[field]);
      assert.equal(url.protocol, 'https:', route.id + ': ' + field);
    }
    assert.equal(route.url, route.sourceUrl, route.id + ': source and link diverged');
    const canonical = new URL(route.sourceUrl);
    canonical.hash = '';
    canonical.search = '';
    const key = canonical.toString().replace(/\/$/, '');
    assert.ok(!sources.has(key), 'duplicate source URL: ' + key);
    sources.add(key);
    for (const forbidden of ['geometry', 'coordinates', 'track', 'gpx', 'geojson', 'lat', 'lng']) {
      assert.equal(route[forbidden], undefined, route.id + ': unlicensed or unverified geometry must not be embedded');
    }
  }
});
