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
  if (!Array.isArray(geometry?.profileSegments)) return null;

  const points = [];
  let cumulativeKm = 0;
  let previous = null;

  geometry.profileSegments.flat().forEach(point => {
    if (!Number.isFinite(point?.elevation)) return;
    if (previous) cumulativeKm += distanceKm(previous, point);
    points.push({ ...point, distanceKm: cumulativeKm });
    previous = point;
  });

  if (points.length < 2) return null;

  return {
    points,
    distanceKm: cumulativeKm,
    minimum: Math.min(...points.map(point => point.elevation)),
    maximum: Math.max(...points.map(point => point.elevation))
  };
}

export function renderElevationProfile(container, profile, onHover) {
  container.replaceChildren();

  if (!profile) {
    const unavailable = document.createElement("p");
    unavailable.className = "route-elevation-unavailable";
    unavailable.textContent = "Perfil d'altitud no disponible en la geometria d'aquesta ruta.";
    container.append(unavailable);
    return;
  }

  const width = 720;
  const height = 150;
  const padding = 18;
  const elevationRange = Math.max(1, profile.maximum - profile.minimum);
  const distanceRange = Math.max(0.001, profile.distanceKm);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Perfil d'altitud: de ${Math.round(profile.minimum)} a ${Math.round(profile.maximum)} metres`);
  svg.classList.add("route-elevation-svg");

  const coordinates = profile.points.map(point => {
    const x = padding + (point.distanceKm / distanceRange) * (width - padding * 2);
    const y = height - padding - ((point.elevation - profile.minimum) / elevationRange) * (height - padding * 2);
    return { x, y, point };
  });

  const area = document.createElementNS(ns, "path");
  const line = coordinates.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  area.setAttribute("d", `${line} L${coordinates.at(-1).x.toFixed(1)},${height - padding} L${coordinates[0].x.toFixed(1)},${height - padding} Z`);
  area.setAttribute("class", "route-elevation-area");
  svg.append(area);

  const cursor = document.createElementNS(ns, "line");
  cursor.setAttribute("y1", String(padding));
  cursor.setAttribute("y2", String(height - padding));
  cursor.setAttribute("class", "route-elevation-cursor");
  cursor.hidden = true;
  svg.append(cursor);

  const readout = document.createElement("p");
  readout.className = "route-elevation-readout";
  readout.textContent = `${profile.distanceKm.toFixed(1)} km · ${Math.round(profile.minimum)}–${Math.round(profile.maximum)} m · dades d'altitud del GPX`;

  function activate(event) {
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const targetDistance = ratio * distanceRange;
    let nearest = profile.points[0];
    for (const point of profile.points) {
      if (Math.abs(point.distanceKm - targetDistance) < Math.abs(nearest.distanceKm - targetDistance)) nearest = point;
    }
    const x = padding + (nearest.distanceKm / distanceRange) * (width - padding * 2);
    cursor.hidden = false;
    cursor.setAttribute("x1", String(x));
    cursor.setAttribute("x2", String(x));
    readout.textContent = `${nearest.distanceKm.toFixed(1)} km · ${Math.round(nearest.elevation)} m · altitud del GPX`;
    onHover?.(nearest);
  }

  svg.addEventListener("pointermove", activate);
  svg.addEventListener("pointerleave", () => {
    cursor.hidden = true;
    readout.textContent = `${profile.distanceKm.toFixed(1)} km · ${Math.round(profile.minimum)}–${Math.round(profile.maximum)} m · dades d'altitud del GPX`;
    onHover?.(null);
  });

  container.append(svg, readout);
}
