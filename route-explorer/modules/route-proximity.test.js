import assert from 'node:assert/strict';
import { findNearbyRoutes, haversineKm, routeReferencePoint } from './route-proximity.js';

// Keep the primary fixtures in the same object shape used by data/routes.json.
const barcelona = { id: 'bcn', center: { lat: 41.3874, lng: 2.1686 } };
const badalona = { id: 'bad', center: { lat: 41.4500, lng: 2.2474 } };
const girona = { id: 'gir', center: { lat: 41.9794, lng: 2.8214 } };
const disabled = { id: 'off', center: { lat: 41.40, lng: 2.18 }, enabled: false };
const noGeometry = { id: 'unknown' };

assert.equal(Math.round(haversineKm(barcelona.center, badalona.center)), 10);
assert.equal(haversineKm({ lat: 999, lng: 2 }, badalona.center), null);
assert.deepEqual(routeReferencePoint(barcelona), { point: [41.3874, 2.1686], provenance: 'center' });

const boundsReference = routeReferencePoint({ bounds: { south: 41, west: 2, north: 42, east: 3 } });
assert.deepEqual(boundsReference, { point: [41.5, 2.5], provenance: 'bounds-centroid' });
// Preserve compatibility with array-based metadata too.
assert.deepEqual(routeReferencePoint({ bounds: [[41, 2], [42, 3]] }), boundsReference);

const nearby = findNearbyRoutes(barcelona, [barcelona, girona, badalona, disabled, noGeometry], { maxDistanceKm: 120 });
assert.deepEqual(nearby.map(item => item.route.id), ['bad', 'gir']);
assert.equal(nearby[0].provenance.metric, 'haversine-reference-point');
assert.equal(nearby[0].provenance.from, 'center');

assert.deepEqual(findNearbyRoutes(noGeometry, [barcelona, badalona]), []);
assert.deepEqual(findNearbyRoutes(barcelona, [badalona], { maxDistanceKm: 5 }), []);
assert.equal(findNearbyRoutes(barcelona, [badalona, girona], { limit: 1 }).length, 1);

console.log('route-proximity tests: ok');
