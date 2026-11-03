const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function haversineKm(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second)) return Infinity;
  const [lat1, lng1] = first.map(Number);
  const [lat2, lng2] = second.map(Number);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function normalizeTrackPoints(geometry) {
  if (!geometry) return [];

  if (geometry.kind === "polylines" && Array.isArray(geometry.data)) {
    return geometry.data.flat().filter(point =>
      Array.isArray(point) && point.length >= 2 &&
      Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
    ).map(point => [Number(point[0]), Number(point[1])]);
  }

  const source = geometry.type === "Feature" ? geometry.geometry : geometry;
  if (!source) return [];

  const lines = source.type === "LineString"
    ? [source.coordinates]
    : source.type === "MultiLineString"
      ? source.coordinates
      : [];

  return lines.flat().filter(point =>
    Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
  ).map(point => [Number(point[1]), Number(point[0])]);
}

export function nearestTrackPoint(geometry, target) {
  const points = normalizeTrackPoints(geometry);
  if (!points.length) return null;

  let best = null;
  for (let index = 0; index < points.length; index += 1) {
    const distanceKm = haversineKm(points[index], target);
    if (!best || distanceKm < best.distanceKm) {
      best = { point: points[index], pointIndex: index, distanceKm };
    }
  }
  return best;
}

export function routePassesNear(geometry, target, maximumDistanceKm = 2) {
  const threshold = Number(maximumDistanceKm);
  if (!Number.isFinite(threshold) || threshold < 0) return null;
  const nearest = nearestTrackPoint(geometry, target);
  if (!nearest) return null;
  return { ...nearest, passes: nearest.distanceKm <= threshold };
}

export function rankRoutesByPassage(entries, target, maximumDistanceKm = 2) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(entry => {
      const match = routePassesNear(entry?.geometry, target, maximumDistanceKm);
      return match ? { route: entry.route, ...match } : null;
    })
    .filter(result => result?.passes)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
