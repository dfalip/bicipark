import { rankRoutesByPassage } from "./route-passage-search.js";

function geometrySourceKey(route) {
  return route?.geometry?.file || route?.geometry?.url || route?.gpx || route?.geojson || null;
}

export async function buildPassageEntries(routes, loadGeometry) {
  if (!Array.isArray(routes) || typeof loadGeometry !== "function") return [];

  const cache = new Map();
  const entries = [];

  for (const route of routes) {
    if (!route || route.enabled === false) continue;
    const key = geometrySourceKey(route) || route.id;
    if (!key) continue;

    try {
      let geometry;
      if (cache.has(key)) {
        geometry = cache.get(key);
      } else {
        geometry = await loadGeometry(route);
        cache.set(key, geometry);
      }
      if (geometry) entries.push({ route, geometry });
    } catch {
      // Geometry absence/failure is explicit: never fall back to route.center or metadata.
    }
  }

  return entries;
}

export async function findRoutesPassingNear({
  routes,
  target,
  maximumDistanceKm = 2,
  loadGeometry
}) {
  const entries = await buildPassageEntries(routes, loadGeometry);
  return rankRoutesByPassage(entries, target, maximumDistanceKm);
}
