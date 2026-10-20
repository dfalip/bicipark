const test = require('node:test');
const assert = require('node:assert/strict');
const Store = require('../modules/marketplace/store.js');

test('sale listings require a non-negative price', () => {
  const bad = Store.validate({ title: 'Rodes', mode: 'sale', price: '' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.includes('price'));

  const good = Store.validate({ title: 'Rodes', mode: 'sale', price: 180 });
  assert.equal(good.valid, true);
  assert.equal(good.item.price, 180);
});

test('exchange listings require a requested exchange', () => {
  const bad = Store.validate({ title: 'Casc', mode: 'exchange' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.includes('exchangeFor'));

  const good = Store.validate({ title: 'Casc', mode: 'exchange', exchangeFor: 'Llum davantera' });
  assert.equal(good.valid, true);
  assert.equal(good.item.price, null);
});

test('filters support category, mode, favorites and free text', () => {
  const state = { items: Store.demo() };
  assert.equal(Store.filter(state.items, { category: 'bike' }).length, 1);
  assert.equal(Store.filter(state.items, { mode: 'exchange' }).length, 1);
  assert.equal(Store.filter(state.items, { query: 'Barcelona' }).length, 3);

  Store.toggleFavorite(state, state.items[0].id);
  assert.equal(Store.filter(state.items, { favorites: true }).length, 1);
});

test('verified Bike Passport metadata is normalized and preserved', () => {
  const item = Store.normalize({ title: 'Orbea', mode: 'sale', price: 1000, category: 'bike', bikeId: 'BP-1234', verificationLevel: 'verified', proofDigest: 'abc123', transferReady: true });
  assert.equal(item.bikeId, 'BP-1234');
  assert.equal(item.verificationLevel, 'verified');
  assert.equal(item.proofDigest, 'abc123');
  assert.equal(item.transferReady, true);
});

test('remove only deletes listings owned by the local user', () => {
  const state = { items: Store.demo() };
  const before = state.items.length;
  Store.remove(state, state.items[0].id);
  assert.equal(state.items.length, before);

  const added = Store.add(state, { title: 'Bici prova', mode: 'sale', price: 100, category: 'bike' });
  assert.equal(added.valid, true);
  const ownId = added.item.id;
  Store.remove(state, ownId);
  assert.equal(state.items.some(item => item.id === ownId), false);
});
