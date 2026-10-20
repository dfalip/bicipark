const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../modules/today/engine/recommendation-engine.js');
const weather = require('../modules/today/providers/open-meteo.js');

const profile = {
  level: 'Intermedi', daysPerWeek: 3, terrain: 'Carretera + Gravel',
  usualDistanceMin: 30, usualDistanceMax: 50,
  usualElevationMin: 400, usualElevationMax: 800
};

function route(id, km, extra = {}) {
  return {
    id, name: id, enabled: true, modality: 'road', distanceKm: km,
    elevationGain: 0, needsReview: true,
    center: { lat: 41.4 + km / 10000, lng: 2.17 },
    ...extra
  };
}

test('deduplica rutes equivalents importades dues vegades', () => {
  const a = route('a', 20, { name: 'Front Marítim', region: 'barcelona', center: { lat: 41.3782, lng: 2.1954 } });
  const b = route('b', 20, { name: 'Front Maritim', region: 'barcelona', center: { lat: 41.3783, lng: 2.1955 } });
  assert.equal(engine.dedupeRoutes([a, b]).length, 1);
});

test('una distància dins del rang puntua millor que una ruta molt llarga', () => {
  assert.ok(engine.distanceScore(route('fit', 40), profile, 'normal') > engine.distanceScore(route('long', 90), profile, 'normal'));
});

test('el mal temps redueix el rànquing quan la resta és comparable', () => {
  const good = route('good', 40, { weather: { score: 92, label: 'bo' } });
  const bad = route('bad', 40, { weather: { score: 35, label: 'dolent' }, center: { lat: 41.5, lng: 2.17 } });
  const ranked = engine.rankRoutes([bad, good], { profile, mood: 'normal', history: { available: true, recentDistanceKm: 80 } });
  assert.equal(ranked[0].id, 'good');
});

test('el desnivell no validat queda fora del càlcul', () => {
  const item = route('unknown-elevation', 40, { elevationGain: 0, needsReview: true, weather: { score: 80 } });
  const result = engine.buildRecommendation(item, { profile, mood: 'climb', history: { available: true, recentDistanceKm: 70 } });
  assert.equal(result.components.some(component => component.name === 'elevation'), false);
  assert.ok(result.warnings.some(text => /desnivell/i.test(text)));
});

test('sense historial el factor history queda fora del score', () => {
  const item = route('no-history', 40, { weather: { score: 85 } });
  const result = engine.buildRecommendation(item, {
    profile,
    mood: 'normal',
    history: { available: false, recentDistanceKm: null }
  });
  assert.equal(result.components.some(component => component.name === 'history'), false);
});

test('sense bici activa la raó de modalitat no diu que hi ha bici activa', () => {
  const item = route('profile-only', 40, { weather: { score: 85 } });
  const result = engine.buildRecommendation(item, {
    profile,
    bike: null,
    mood: 'normal',
    history: { available: false, recentDistanceKm: null }
  });
  assert.ok(result.reasons.some(text => /compatible amb el teu perfil\.$/i.test(text)));
  assert.equal(result.reasons.some(text => /bici activa/i.test(text)), false);
});

test('un codi de ruixat conserva la icona encara que la probabilitat sigui zero', () => {
  assert.equal(weather.iconForCode(80, 0), '🌧️');
});

test('una probabilitat alta de pluja manté una icona de pluja', () => {
  assert.equal(weather.iconForCode(80, 70), '🌧️');
});

test("missing WMO never means sunshine",()=>{for(const value of [null,undefined,"",999])assert.equal(weather.iconForCode(value),"❔")});
