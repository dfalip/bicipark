const geometryCache = new Map();

export function normalizeRouteBounds(routeBounds) {
  if (!routeBounds) return null;
  return L.latLngBounds(
    [routeBounds.south, routeBounds.west],
    [routeBounds.north, routeBounds.east]
  );
}

export function routeIntersectsBounds(route, viewportBounds) {
  const routeBounds = normalizeRouteBounds(route.bounds);
  if (routeBounds) return viewportBounds.intersects(routeBounds);
  if (route.center) {
    return viewportBounds.contains([route.center.lat, route.center.lng]);
  }
  return false;
}

export function clearGeometryCache() {
  geometryCache.clear();
}

function parsePoint(node) {
  const latitude = Number(node.getAttribute("lat"));
  const longitude = Number(node.getAttribute("lon"));
  const elevationNode = node.querySelector("ele");
  const elevation = elevationNode ? Number(elevationNode.textContent) : null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    lat: latitude,
    lng: longitude,
    elevation: Number.isFinite(elevation) ? elevation : null
  };
}

function parseGpx(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("El GPX no és XML vàlid.");
  }

  const profileSegments = [...xml.querySelectorAll("trkseg")]
    .map(segmentNode => [...segmentNode.querySelectorAll("trkpt")]
      .map(parsePoint)
      .filter(Boolean))
    .filter(segment => segment.length >= 2);

  if (profileSegments.length === 0) {
    const routePoints = [...xml.querySelectorAll("rtept")]
      .map(parsePoint)
      .filter(Boolean);
    if (routePoints.length >= 2) profileSegments.push(routePoints);
  }

  if (profileSegments.length === 0) {
    throw new Error("El GPX no conté prou punts.");
  }

  return {
    kind: "polylines",
    data: profileSegments.map(segment =>
      segment.map(point => [point.lat, point.lng])
    ),
    profileSegments
  };
}

export async function loadRouteGeometry(route) {
  const cacheKey = route.geometryCacheKey || route.geometryFile || route.id;
  if (geometryCache.has(cacheKey)) return geometryCache.get(cacheKey);
  if (!route.geometryFile) throw new Error("La ruta no té geometria vectorial.");

  const response = await fetch(route.geometryFile, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No s'ha pogut carregar la geometria (${response.status}).`);
  }

  const lowerPath = route.geometryFile.split("?")[0].toLowerCase();
  const geometry = lowerPath.endsWith(".gpx")
    ? parseGpx(await response.text())
    : { kind: "geojson", data: await response.json() };

  geometryCache.set(cacheKey, geometry);
  return geometry;
}

export function createGeometryLayer(route, geometry, style) {
  if (geometry.kind === "polylines") {
    return L.featureGroup(
      geometry.data.map(segment => L.polyline(segment, style))
    );
  }

  return L.geoJSON(geometry.data, {
    style: () => style,
    pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
      radius: 5,
      color: style.color,
      fillColor: style.color,
      fillOpacity: 0.78
    })
  });
}
