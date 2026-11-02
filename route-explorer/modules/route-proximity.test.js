import assert from 'node:assert/strict';
import { findNearbyRoutes, haversineKm, routeReferencePoint } from './route-proximity.js';

const barcelona = { id: 'bcn', center: [41.3874, 2.1686] };
const badalona = { id: 'bad', center: [41.4500, 2.2474] };
const girona = { id: 'gir', center: [41.9794, 2.8214] };
const noGeometry = { id: 'unknown' };

assert.equal(Math.round(haversineKm(barcelona.center, badalona.center)), 10);
assert.equal(haversineKm([999, 2], badalona.center), null);

const boundsReference = routeReferencePoint({ bounds: [[41, 2], [42, 3]] });
assert.deepEqual(boundsReference, { point: [41.5, 2.5], provenance: 'bounds-centroid' });

const nearby = findNearbyRoutes(barcelona, [barcelona, girona, badalona, noGeometry], { maxDistanceKm: 120 });
assert.deepEqual(nearby.map(item => item.route.id), ['bad', 'gir']);
assert.equal(nearby[0].provenance.metric, 'haversine-reference-point');
assert.equal(nearby[0].provenance.from, 'center');

assert.deepEqual(findNearbyRoutes(noGeometry, [barcelona, badalona]), []);
assert.deepEqual(findNearbyRoutes(barcelona, [badalona], { maxDistanceKm: 5 }), []);
assert.equal(findNearbyRoutes(barcelona, [badalona, girona], { limit: 1 }).length, 1);

console.log('route-proximity tests: ok');
