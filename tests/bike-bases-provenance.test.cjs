'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../bike-bases/data/bike-bases.json'), 'utf8'));

test('Bike Bases catalog never silently promotes unverified places to verified services', () => {
  assert.ok(Array.isArray(catalog.bases) && catalog.bases.length > 0);
  const ids = new Set();
  for (const base of catalog.bases) {
    assert.ok(typeof base.id === 'string' && /^[a-z0-9-]+$/.test(base.id), 'stable id required');
    assert.ok(!ids.has(base.id), 'duplicate Bike Base id: ' + base.id);
    ids.add(base.id);
    assert.equal(typeof base.name, 'string', base.id + ': name required');
    assert.ok(base.name.trim(), base.id + ': empty name');
    assert.equal(typeof base.verified, 'boolean', base.id + ': explicit verification required');
    assert.equal(typeof base.affiliated, 'boolean', base.id + ': explicit affiliation required');
    assert.equal(typeof base.partner, 'boolean', base.id + ': explicit partnership required');
    if (base.status === 'public-unverified') {
      assert.equal(base.verified, false, base.id + ': public listing is not verification');
      assert.equal(base.partner, false, base.id + ': public listing is not partnership');
      assert.equal(base.affiliated, false, base.id + ': public listing is not affiliation');
    }
    const hasLat = Object.hasOwn(base, 'lat');
    const hasLng = Object.hasOwn(base, 'lng');
    assert.equal(hasLat, hasLng, base.id + ': partial coordinates must not be mapped');
    if (hasLat) {
      assert.ok(typeof base.lat === 'number' && Number.isFinite(base.lat) && base.lat >= -90 && base.lat <= 90, base.id + ': invalid latitude');
      assert.ok(typeof base.lng === 'number' && Number.isFinite(base.lng) && base.lng >= -180 && base.lng <= 180, base.id + ': invalid longitude');
    }
    assert.ok(typeof base.dataFile === 'string' && /^\.\/data\/bases\/[a-z0-9-]+\.json$/.test(base.dataFile), base.id + ': unsafe data path');
    const file = path.join(__dirname, '../bike-bases', base.dataFile);
    assert.ok(fs.existsSync(file), base.id + ': missing detail file');
  }
});
