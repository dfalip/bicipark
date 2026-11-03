const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');

test('curated segmented-source policy overrides stale generated metadata', () => {
  const configurations = JSON.parse(read('route-explorer/data/sources.json'));
  const tourConfig = configurations.find(source => source.id === 'tour-de-france-2026');
  assert.ok(tourConfig, 'Tour source must remain available in the curated catalog');
  assert.equal(tourConfig.enabled, true);
  assert.equal(tourConfig.visibleByDefault, false, 'Tour must start disabled');

  const generated = JSON.parse(read('route-explorer/data/generated/tour-2026.json'));
  assert.equal(generated.source.visibleByDefault, true, 'fixture documents the stale generated value that caused the regression');

  const merged = {
    ...(generated.source || {}),
    ...tourConfig
  };
  assert.equal(merged.visibleByDefault, false, 'curated runtime policy must win over generated metadata');

  const moduleSource = read('route-explorer/modules/segmented-route-source.js');
  const catalogSpread = moduleSource.indexOf('...(catalog.source || {})');
  const configSpread = moduleSource.indexOf('...configuration', catalogSpread);
  assert.ok(catalogSpread >= 0 && configSpread > catalogSpread, 'loader must apply curated configuration after generated source metadata');
});
