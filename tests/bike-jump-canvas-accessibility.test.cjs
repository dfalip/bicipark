'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

test('BikeJump canvas has an accessible name and textual fallback without replacing gameplay controls', () => {
  const html = readFileSync(join(__dirname, '..', 'bike-jump', 'index.html'), 'utf8');
  const canvas = html.match(/<canvas\b([^>]*)>([\s\S]*?)<\/canvas>/i);
  assert.ok(canvas, 'Game canvas exists');
  assert.match(canvas[1], /role="img"/);
  assert.match(canvas[1], /aria-label="[^"]+"/);
  assert.match(canvas[2], /Utilitza els botons/);
  assert.match(html, /id="statusText"[^>]*aria-live="polite"/);
  assert.match(html, /id="launchButton"/);
  assert.match(html, /id="rotateLeftButton"/);
  assert.match(html, /id="rotateRightButton"/);
  assert.match(html, /id="resultPanel"/);
});
