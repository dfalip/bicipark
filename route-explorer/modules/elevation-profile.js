function radians(value) {
  return value * Math.PI / 180;
}

function distanceKm(a, b) {
  const earth = 6371;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export function buildElevationProfile(geometry) {
  if (!Array.isArray(geometry?.profileSegments)) {
    return null;
  }

  const points = [];
  let cumulativeKm = 0;
  let previous = null;

  geometry.profileSegments.flat().forEach(point => {
    if (!Number.isFinite(point?.elevation)) {
      return;
    }

    if (previous) {
      cumulativeKm += distanceKm(previous, point);
    }

    points.push({
      lat: point.lat,
      lng: point.lng,
      elevation: point.elevation,
      distanceKm: cumulativeKm
    });

    previous = point;
  });

  if (points.length < 2) {
    return null;
  }

  return {
    points,
    distanceKm: cumulativeKm,
    minimumElevation: Math.min(...points.map(point => point.elevation)),
    maximumElevation: Math.max(...points.map(point => point.elevation)),
    source: "gpx-ele",
    derived: true
  };
}
