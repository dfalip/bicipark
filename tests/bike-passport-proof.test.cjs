const test = require('node:test');
const assert = require('node:assert/strict');
const Proof = require('../modules/bike-passport/proof-model.js');

const bike = { id: 'BP-TEST-1', nickname: 'Orca', brand: 'Orbea', model: 'Orca M30', year: '2025', modality: 'Road', serialHint: 'A7K2', odometerKm: 1200 };

test('creates and verifies a deterministic cryptographic Bike Passport proof', async () => {
  const proof = await Proof.createProof({ bike, type: 'registration', actorRole: 'owner', payload: { source: 'test' } });
  assert.equal(proof.bike.id, 'BP-TEST-1');
  assert.equal(proof.digest.length, 64);
  assert.equal(await Proof.verifyProof(proof), true);

  const tampered = { ...proof, bike: { ...proof.bike, odometerKm: 9999 } };
  assert.equal(await Proof.verifyProof(tampered), false);
});

test('local workshop claims never become external verification', async () => {
  const state = { version: 1, proofs: [] };
  const registration = await Proof.createProof({ bike, type: 'registration', actorRole: 'owner' });
  state.proofs.push(registration);
  assert.equal(Proof.verificationLevel(state, bike.id), 'passport');

  const workshop = await Proof.createProof({ bike, type: 'maintenance', actorRole: 'workshop', previousDigest: registration.digest });
  state.proofs.push(workshop);
  assert.equal(Proof.verificationLevel(state, bike.id), 'passport');
  assert.equal(await Proof.verifyChain(state,bike.id),true);
  state.proofs.shift();
  assert.equal(await Proof.verifyChain(state,bike.id),false);
});

test('transfer package never contains a full serial number', async () => {
  const proof = await Proof.createProof({ bike: { ...bike, serialNumber: 'FULL-SERIAL-SECRET' } });
  const pack = Proof.transferPackage({ ...bike, serialNumber: 'FULL-SERIAL-SECRET' }, proof);
  assert.equal(pack.bike.serialNumber, undefined);
  assert.equal(pack.bike.serialHint, 'A7K2');
});
