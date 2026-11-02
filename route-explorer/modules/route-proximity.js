const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value) {
  return value * Math.PI / 180;
}

export function normalisePoint(value) {
  let lat;
  let lng;

  if (Array.isArray(value) && value.length >= 2) {
    lat = Number(value[0]);
    lng = Number(value[1]);
  } else if (value && typeof value === 'object') {
    lat = Number(value.lat ?? value.latitude);
    lng = Number(value.lng ?? value.lon ?? value.longitude);
  } else {
    return null;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

function normaliseBounds(bounds) {
  if (Array.isArray(bounds) && bounds.length >= 2) {
    const southWest = normalisePoint(bounds[0]);
    const northEast = normalisePoint(bounds[1]);
    return southWest && northEast ? { southWest, northEast } : null;
  }

  if (bounds && typeof bounds === 'object') {
    const southWest = normalisePoint([bounds.south, bounds.west]);
    const northEast = normalisePoint([bounds.north, bounds.east]);
    return southWest && northEast ? { southWest, northEast } : null;
  }

  return null;
}

export function routeReferencePoint(route) {
  const explicit = normalisePoint(route?.center);
  if (explicit) return { point: explicit, provenance: 'center' };

  const bounds = normaliseBounds(route?.bounds);
  if (bounds) {
    return {
      point: [
        (bounds.southWest[0] + bounds.northEast[0]) / 2,
        (bounds.southWest[1] + bounds.northEast[1]) / 2
      ],
      provenance: 'bounds-centroid'
    };
  }
  return null;
}

export function haversineKm(a, b) {
  const p1 = normalisePoint(a);
  const p2 = normalisePoint(b);
  if (!p1 || !p2) return null;
  const dLat = toRadians(p2[0] - p1[0]);
  const dLng = toRadians(p2[1] - p1[1]);
  const lat1 = toRadians(p1[0]);
  const lat2 = toRadians(p2[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function findNearbyRoutes(currentRoute, routes, { limit = 4, maxDistanceKm = 100 } = {}) {
  const origin = routeReferencePoint(currentRoute);
  if (!origin || !Array.isArray(routes)) return [];

  return routes
    .filter(route => route && route.id !== currentRoute?.id && route.enabled !== false)
    .map(route => {
      const reference = routeReferencePoint(route);
      if (!reference) return null;
      const distanceKm = haversineKm(origin.point, reference.point);
      if (!Number.isFinite(distanceKm) || distanceKm > maxDistanceKm) return null;
      return {
        route,
        distanceKm,
        provenance: {
          from: origin.provenance,
          to: reference.provenance,
          metric: 'haversine-reference-point'
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm || String(a.route.id).localeCompare(String(b.route.id)))
    .slice(0, Math.max(0, limit));
}
