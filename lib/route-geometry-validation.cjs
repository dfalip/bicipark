'use strict';

/**
 * Conservative GeoJSON route geometry validation. No network access, elevation
 * inference, route snapping, or repair of invalid source coordinates.
 * Coordinates follow GeoJSON order [longitude, latitude, optional elevation].
 */
function validateRouteGeometry(input, options = {}) {
  if (options.maxPoints !== undefined &&
      (!Number.isSafeInteger(options.maxPoints) || options.maxPoints < 2)) {
    return { valid: false, errors: ['invalid_point_limit'], pointCount: 0, hasCompleteElevation: false, lines: null };
  }
  const maxPoints = options.maxPoints === undefined ? 100000 : options.maxPoints;
  const errors = [];
  const lines = [];
  const geometry = input && input.type === 'Feature' ? input.geometry : input;
  if (!geometry || !['LineString', 'MultiLineString'].includes(geometry.type)) {
    return { valid: false, errors: ['unsupported_geometry'], pointCount: 0, hasCompleteElevation: false };
  }
  const segments = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(segments) || segments.length === 0) {
    return { valid: false, errors: ['empty_geometry'], pointCount: 0, hasCompleteElevation: false };
  }
  let pointCount = 0;
  let hasCompleteElevation = true;
  for (const segment of segments) {
    if (!Array.isArray(segment) || segment.length < 2) {
      errors.push('segment_too_short');
      continue;
    }
    pointCount += segment.length;
    if (pointCount > maxPoints) {
      errors.push('point_limit_exceeded');
      break;
    }
    const clean = [];
    for (const point of segment) {
      if (!Array.isArray(point) || (point.length !== 2 && point.length !== 3) ||
          !point.every(value => typeof value === 'number' && Number.isFinite(value)) ||
          point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) {
        errors.push('invalid_coordinate');
        continue;
      }
      if (point.length !== 3) hasCompleteElevation = false;
      // Do not expose references to mutable coordinates owned by the caller.
      clean.push([...point]);
    }
    lines.push(clean);
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    pointCount,
    hasCompleteElevation: errors.length === 0 && hasCompleteElevation,
    // Geometry is returned only when all coordinates pass validation.
    lines: errors.length === 0 ? lines : null
  };
}

module.exports = { validateRouteGeometry };
