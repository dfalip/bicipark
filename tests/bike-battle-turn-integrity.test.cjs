'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../bike-battle/engine.js');

test('movement is capped per turn and cannot cross the arena midpoint', () => {
  const s = E.create();
  E.move(s, 10000);
  assert.equal(s.riders[0].x, 165);
  assert.equal(s.move, 0);
  E.move(s, -10000);
  assert.equal(s.riders[0].x, 165);
});

test('a shot locks movement and cannot be replaced until resolved', () => {
  const s = E.create();
  assert.equal(E.fire(s, 45, 75), true);
  const shot = s.shot;
  E.move(s, 25);
  assert.equal(s.riders[0].x, 100);
  assert.equal(E.fire(s, 20, 100), false);
  assert.equal(s.shot, shot);
  for (let i = 0; i < 250 && s.shot; i++) E.tick(s, .05);
  assert.equal(s.shot, null);
  assert.equal(s.turn, 1);
  assert.equal(s.move, 65);
});

test('invalid controls cannot corrupt the duel state', () => {
  const s = E.create();
  E.move(s, NaN);
  assert.equal(s.riders[0].x, 100);
  assert.equal(E.fire(s, Infinity, 50), false);
  assert.equal(E.fire(s, 45, NaN), false);
  assert.equal(s.shot, null);
  E.tick(s, Infinity);
  assert.equal(s.turn, 0);
});
