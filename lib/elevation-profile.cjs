'use strict';
const { validateRouteGeometry } = require('./route-geometry-validation.cjs');
const R = 6371008.8;
function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}
/** Derives horizontal distance and optional elevation samples from validated GeoJSON.
 * MultiLineString gaps are never bridged. No smoothing, ascent, or source quality claims.
 */
function deriveElevationProfile(geojson, options) {
  const geometry = validateRouteGeometry(geojson, options);
  if (!geometry.valid) return { valid: false, errors: geometry.errors, samples: null, distanceMeters: null,
    hasCompleteElevation: false, elevationPointCount: null, pointCount: null, hasAnyElevation: false, segmentCount: null, hasDiscontinuities: null };
  const samples = [];
  let cumulative = 0;
  geometry.lines.forEach((line, segmentIndex) => {
    let segmentDistance = 0;
    line.forEach((point, pointIndex) => {
      if (pointIndex) {
        const step = distanceMeters(line[pointIndex - 1], point);
        cumulative += step;
        segmentDistance += step;
      }
      samples.push({ segmentIndex, pointIndex, longitude: point[0], latitude: point[1], distanceMeters: cumulative, segmentDistanceMeters: segmentDistance,
        elevationMeters: point.length === 3 ? point[2] : null });
    });
  });
  const elevationPointCount = samples.reduce((count, sample) => count + (sample.elevationMeters !== null ? 1 : 0), 0);
  return { valid: true, errors: [], samples, distanceMeters: cumulative,
    hasCompleteElevation: geometry.hasCompleteElevation,
    elevationPointCount, pointCount: samples.length, hasAnyElevation: elevationPointCount > 0,
    segmentCount: geometry.lines.length, hasDiscontinuities: geometry.lines.some((line, index) => { if (index === 0) return false; const previous = geometry.lines[index - 1]; const end = previous[previous.length - 1]; const start = line[0]; return end[0] !== start[0] || end[1] !== start[1]; }) };
}
module.exports = { deriveElevationProfile };
