const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function validPoint(point) {
  return Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]));
}

export function haversineKm(first, second) {
  if (!validPoint(first) || !validPoint(second)) return Infinity;
  const [lat1, lng1] = first.map(Number);
  const [lat2, lng2] = second.map(Number);
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function normalizeTrackLines(geometry) {
  if (!geometry) return [];
  if (geometry.kind === "polylines" && Array.isArray(geometry.data)) {
    return geometry.data.map(line => Array.isArray(line)
      ? line.filter(validPoint).map(point => [Number(point[0]), Number(point[1])])
      : []).filter(line => line.length);
  }
  const source = geometry.type === "Feature" ? geometry.geometry : geometry;
  if (!source) return [];
  const lines = source.type === "LineString"
    ? [source.coordinates]
    : source.type === "MultiLineString" ? source.coordinates : [];
  return lines.map(line => Array.isArray(line)
    ? line.filter(validPoint).map(point => [Number(point[1]), Number(point[0])])
    : []).filter(line => line.length);
}

function projectAround(point, origin) {
  const lat = toRadians(point[0]);
  const lng = toRadians(point[1]);
  const originLat = toRadians(origin[0]);
  const originLng = toRadians(origin[1]);
  return [
    (lng - originLng) * Math.cos(originLat) * EARTH_RADIUS_KM,
    (lat - originLat) * EARTH_RADIUS_KM
  ];
}

export function nearestTrackSegment(geometry, target) {
  if (!validPoint(target)) return null;
  const lines = normalizeTrackLines(geometry);
  if (!lines.length) return null;
  let best = null;
  lines.forEach((line, lineIndex) => {
    if (line.length === 1) {
      const distanceKm = haversineKm(line[0], target);
      if (!best || distanceKm < best.distanceKm) best = { point: line[0], lineIndex, segmentIndex: null, fraction: 0, distanceKm };
      return;
    }
    for (let segmentIndex = 0; segmentIndex < line.length - 1; segmentIndex += 1) {
      const start = projectAround(line[segmentIndex], target);
      const end = projectAround(line[segmentIndex + 1], target);
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(start[0] * dx + start[1] * dy) / lengthSquared));
      const x = start[0] + fraction * dx;
      const y = start[1] + fraction * dy;
      const distanceKm = Math.hypot(x, y);
      if (!best || distanceKm < best.distanceKm) {
        best = {
          point: [
            line[segmentIndex][0] + fraction * (line[segmentIndex + 1][0] - line[segmentIndex][0]),
            line[segmentIndex][1] + fraction * (line[segmentIndex + 1][1] - line[segmentIndex][1])
          ],
          lineIndex, segmentIndex, fraction, distanceKm
        };
      }
    }
  });
  return best;
}

export function nearestTrackPoint(geometry, target) {
  const lines = normalizeTrackLines(geometry);
  if (!lines.length || !validPoint(target)) return null;
  let best = null;
  let pointIndex = 0;
  for (const line of lines) {
    for (const point of line) {
      const distanceKm = haversineKm(point, target);
      if (!best || distanceKm < best.distanceKm) best = { point, pointIndex, distanceKm };
      pointIndex += 1;
    }
  }
  return best;
}

export function routePassesNear(geometry, target, maximumDistanceKm = 2) {
  const threshold = Number(maximumDistanceKm);
  if (!Number.isFinite(threshold) || threshold < 0) return null;
  const nearest = nearestTrackSegment(geometry, target);
  if (!nearest) return null;
  return { ...nearest, passes: nearest.distanceKm <= threshold };
}

export function rankRoutesByPassage(entries, target, maximumDistanceKm = 2) {
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => {
    const match = routePassesNear(entry?.geometry, target, maximumDistanceKm);
    return match ? { route: entry.route, ...match } : null;
  }).filter(result => result?.passes).sort((a, b) => a.distanceKm - b.distanceKm);
}
