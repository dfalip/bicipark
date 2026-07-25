const EARTH_RADIUS_METERS = 6_371_000;

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineMeters(pointA, pointB) {
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);

  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function flattenGeoJsonCoordinates(geojson) {
  const coordinates = [];

  const appendGeometry = geometry => {
    if (!geometry) {
      return;
    }

    if (geometry.type === "LineString") {
      geometry.coordinates.forEach(coordinate => {
        coordinates.push({
          lng: Number(coordinate[0]),
          lat: Number(coordinate[1])
        });
      });
      return;
    }

    if (geometry.type === "MultiLineString") {
      geometry.coordinates.forEach(line => {
        line.forEach(coordinate => {
          coordinates.push({
            lng: Number(coordinate[0]),
            lat: Number(coordinate[1])
          });
        });
      });
    }
  };

  if (geojson.type === "FeatureCollection") {
    geojson.features.forEach(feature => appendGeometry(feature.geometry));
  } else if (geojson.type === "Feature") {
    appendGeometry(geojson.geometry);
  } else {
    appendGeometry(geojson);
  }

  return coordinates.filter(
    coordinate =>
      Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng)
  );
}

export function pointAtFraction(polyline, fraction) {
  if (!polyline.length) {
    throw new Error("La ruta no conté coordenades.");
  }

  if (polyline.length === 1) {
    return polyline[0];
  }

  const normalizedFraction = Math.min(1, Math.max(0, fraction));
  const segmentLengths = [];
  let totalLength = 0;

  for (let index = 1; index < polyline.length; index += 1) {
    const length = haversineMeters(polyline[index - 1], polyline[index]);
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) {
    return polyline[0];
  }

  const targetLength = totalLength * normalizedFraction;
  let accumulatedLength = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];

    if (accumulatedLength + segmentLength >= targetLength) {
      const remaining = targetLength - accumulatedLength;
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;
      const start = polyline[index];
      const end = polyline[index + 1];

      return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      };
    }

    accumulatedLength += segmentLength;
  }

  return polyline.at(-1);
}

function projectToLocalMeters(point, origin) {
  const originLatRadians = toRadians(origin.lat);

  return {
    x:
      toRadians(point.lng - origin.lng) *
      EARTH_RADIUS_METERS *
      Math.cos(originLatRadians),
    y: toRadians(point.lat - origin.lat) * EARTH_RADIUS_METERS
  };
}

function pointToSegmentMeters(point, segmentStart, segmentEnd) {
  const origin = point;
  const projectedPoint = { x: 0, y: 0 };
  const start = projectToLocalMeters(segmentStart, origin);
  const end = projectToLocalMeters(segmentEnd, origin);

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;

  if (lengthSquared === 0) {
    return Math.hypot(start.x, start.y);
  }

  const projection =
    ((projectedPoint.x - start.x) * deltaX +
      (projectedPoint.y - start.y) * deltaY) /
    lengthSquared;

  const boundedProjection = Math.max(0, Math.min(1, projection));
  const closestX = start.x + boundedProjection * deltaX;
  const closestY = start.y + boundedProjection * deltaY;

  return Math.hypot(closestX, closestY);
}

export function distanceToPolylineMeters(point, polyline) {
  if (!polyline.length) {
    return Number.POSITIVE_INFINITY;
  }

  if (polyline.length === 1) {
    return haversineMeters(point, polyline[0]);
  }

  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < polyline.length; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      pointToSegmentMeters(point, polyline[index - 1], polyline[index])
    );
  }

  return minimumDistance;
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "—";
  }

  if (meters < 1_000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1_000).toFixed(1)} km`;
}
