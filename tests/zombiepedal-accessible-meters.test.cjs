const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../zombiepedal/index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../zombiepedal/app.js'), 'utf8');

test('ZombiePedal meters have bounded, named accessible progress values', () => {
  for (const [id, label, initial] of [['hordeMeter', 'Proximitat de la horda', 15], ['journeyMeter', 'Progrés de la fugida', 0]]) {
    const tag = html.match(new RegExp('<div[^>]*id="' + id + '"[^>]*>'))?.[0];
    assert.ok(tag, id + ' missing');
    for (const attribute of ['role="progressbar"', 'aria-label="' + label + '"', 'aria-valuemin="0"', 'aria-valuemax="100"', 'aria-valuenow="' + initial + '"']) assert.ok(tag.includes(attribute), id + ' missing ' + attribute);
    assert.match(app, new RegExp('getElementById\\("' + id + '"\\)\\?\\.setAttribute\\("aria-valuenow"'));
  }
  assert.match(html, /id="hordeValue" aria-hidden="true"/);
  assert.match(html, /id="journeyValue" aria-hidden="true"/);
});
