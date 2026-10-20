const test = require('node:test');
const assert = require('node:assert/strict');
const advisor = require('../modules/my-bike/pressure-advisor.js');

test('calcula el pes total del sistema', () => {
  assert.equal(advisor.systemWeightKg({ riderWeightKg: 70, bikeWeightKg: 9.5, cargoKg: 2 }), 81.5);
});

test('no considera complet un setup amb dades essencials absents', () => {
  const result = advisor.analyze({ riderWeightKg: 70, bikeWeightKg: 9 });
  assert.equal(result.complete, false);
  assert.ok(result.readiness < 100);
  assert.ok(result.missing.includes('tireWidth'));
  assert.ok(result.missing.includes('manufacturerMax'));
});

test('considera complet un setup amb tots els camps requerits', () => {
  const bike = {
    riderWeightKg: 70, bikeWeightKg: 9, cargoKg: 1,
    tireWidthMm: 30, wheelSize: '700C', tireType: 'Tubeless',
    pressureSurface: 'smooth', pressureSpeed: 'medium', frontWeightPct: 45,
    rimType: 'hooked', manufacturerMaxBar: 5.5
  };
  const result = advisor.analyze(bike);
  assert.equal(result.complete, true);
  assert.equal(result.readiness, 100);
  assert.equal(result.systemWeightKg, 80);
});

test('hookless sense límit del fabricant genera avís', () => {
  const result = advisor.analyze({
    riderWeightKg: 70, bikeWeightKg: 9, tireWidthMm: 30, wheelSize: '700C', tireType: 'Tubeless',
    pressureSurface: 'smooth', pressureSpeed: 'medium', frontWeightPct: 45, rimType: 'hookless'
  });
  assert.ok(result.warnings.includes('hooklessNeedsMax'));
  assert.equal(result.complete, false);
});
