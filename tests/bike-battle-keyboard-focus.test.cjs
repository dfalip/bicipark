'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('Bike Battle leaves focused native controls to the browser', () => {
  const code = fs.readFileSync(path.join(__dirname, '../bike-battle/game.js'), 'utf8');
  const handlers = {};
  const element = id => ({
    id, value: id === 'angle' ? '45' : '75', min: '10', max: '100',
    textContent: '', disabled: false,
    setAttribute() {}, getContext() { return { createLinearGradient() { return { addColorStop() {} }; } }; }
  });
  const nodes = new Map();
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); },
    documentElement: { lang: 'ca' }
  };
  const window = {
    BikeBattle: { create() { return { riders: [{ hp: 100 }, { hp: 100 }], turn: 0, move: 65, shot: null, winner: null }; }, move() { return true; } },
    addEventListener(name, fn) { handlers[name] = fn; }
  };
  class Element { closest() { return null; } }
  vm.runInNewContext(code, { window, document, Element, requestAnimationFrame() {} });
  assert.equal(typeof handlers.keydown, 'function');
  for (const tag of ['button', 'input', 'select', 'a', 'textarea']) {
    let prevented = false;
    handlers.keydown({
      key: 'ArrowRight', repeat: false,
      target: Object.assign(new Element(), { closest(selector) { assert.match(selector, /button/); return { tag }; } }),
      preventDefault() { prevented = true; }
    });
    assert.equal(prevented, false, tag + ' should keep native keyboard behavior');
  }
  let prevented = false;
  handlers.keydown({
    key: 'ArrowRight', repeat: false,
    target: new Element(),
    preventDefault() { prevented = true; }
  });
  assert.equal(prevented, true, 'gameplay shortcut should still work outside controls');
});
