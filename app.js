const CITIES_URL = "./cities.json";

let cities = {};
let currentCityKey = null;
let currentCity = null;
let allParkings = [];
let roadRoutes = [];

let currentFilter = "tots";
let currentRadius = "all";
let currentMode = "parking";
let activeLocation = null;
let selectedNearestParkingId = null;

let citiesLoaded = false;

let searchMarker;
let userMarker;
let nearestMarker;
let bikeLaneLayer;
let roadRouteLayer;
let bikeLanesVisible = false;

let securityLegend;

let favorites = JSON.parse(localStorage.getItem("biciparkFavorites") || "[]");

const map = L.map("map").setView([41.3874, 2.1686], 13);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CartoDB"
}).addTo(map);

const markers = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    return L.divIcon({
      html: `
        <div class="bicipark-cluster-content">
          <div class="cluster-bike">🚲</div>
          <div class="cluster-number">${cluster.getChildCount()}</div>
        </div>
      `,
      className: "bicipark-cluster",
      iconSize: [50, 50]
    });
  }
});

const searchIcon = L.divIcon({
  html: '<div class="search-pin"></div>',
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const routeStartIcon = L.divIcon({
  html: '<div class="route-pin">🚴</div>',
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

const routeStopIcon = L.divIcon({
  html: '<div class="stop-pin">📍</div>',
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

function normalizeNumber(value) {
  if (value === undefined || value === null) return null;
  const n = Number(String(value).replace(",", "."));
  return isNaN(n) ? null : n;
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.features)) return data.features;
  if (Array.isArray(data.result?.records)) return data.result.records;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;

  const values = Object.values(data);
  return values.find(v => Array.isArray(v)) || [];
}

function isValidLatLngForCurrentCity(lat, lng) {
  if (!currentCity) return true;

  const cityLat = currentCity.center[0];
  const cityLng = currentCity.center[1];

  return Math.abs(lat - cityLat) < 1.2 && Math.abs(lng - cityLng) < 1.2;
}

function findCoordinatesDeep(obj) {
  const candidates = [];

  function scan(current) {
    if (!current || typeof current !== "object") return;

    if (Array.isArray(current.coordinates) && current.coordinates.length >= 2) {
      const a = normalizeNumber(current.coordinates[0]);
      const b = normalizeNumber(current.coordinates[1]);

      if (a !== null && b !== null) {
        candidates.push({ lat: b, lng: a });
        candidates.push({ lat: a, lng: b });
      }
    }

    const keys = Object.keys(current);

    for (const latKey of keys) {
      const lk = latKey.toLowerCase();

      if (lk.includes("lat") || lk === "y") {
        for (const lngKey of keys) {
          const lngk = lngKey.toLowerCase();

          if (
            lngk.includes("lon") ||
            lngk.includes("lng") ||
            lngk.includes("long") ||
            lngk === "x"
          ) {
            const lat = normalizeNumber(current[latKey]);
            const lng = normalizeNumber(current[lngKey]);

            if (lat !== null && lng !== null) {
              candidates.push({ lat, lng });
              candidates.push({ lat: lng, lng: lat });
            }
          }
        }
      }
    }

    Object.values(current).forEach(scan);
  }

  scan(obj);

  return candidates.find(c => isValidLatLngForCurrentCity(c.lat, c.lng)) || null;
}

function getName(rawItem) {
  const item = rawItem.properties || rawItem;

  return (
    item.name ||
    item.nom ||
    item.title ||
    item.equipment_name ||
    item.NOM ||
    item.Nom ||
    "Aparcament bicicleta"
  );
}

function getAddress(rawItem) {
  const item = rawItem.properties || rawItem;
  const address = item.addresses && item.addresses[0];

  if (address) {
    const street = address.address_name || "";
    const number = address.address_start || "";
    const district = address.district_name || "";
    return `${street} ${number} ${district ? "— " + district : ""}`.trim();
  }

  return item.address || item.adreca || item.ADRECA || item.Adreca || currentCity?.name || "Ubicació";
}

function getPlaces(rawItem) {
  const item = rawItem.properties || rawItem;

  const fields = [
    item.capacity,
    item.capacitat,
    item.places,
    item.num_places,
    item.numero_places,
    item.total_places,
    item.CAPACITAT,
    item.Places
  ];

  for (const value of fields) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "N/D";
}

function getType(rawItem) {
  const item = rawItem.properties || rawItem;
  return item.type || item.tipus || item.TIPUS || item.category || "Aparcament bici";
}

function getSource(rawItem) {
  const item = rawItem.properties || rawItem;
  return item.source || currentCity?.dataLabel || "Font no indicada";
}

function getVerified(rawItem) {
  const item = rawItem.properties || rawItem;
  if (typeof item.verified === "boolean") return item.verified;
  return currentCity?.dataStatus === "official";
}

function estimateSecurity(rawItem) {
  const item = rawItem.properties || rawItem;

  if (item.security) return item.security;
  if (item.seguretat) return item.seguretat;

  const text = JSON.stringify(rawItem).toLowerCase();

  if (
    text.includes("bicipark") ||
    text.includes("cobert") ||
    text.includes("vigilat") ||
    text.includes("parking")
  ) {
    return "alta";
  }

  return "mitjana";
}

function getParkingId(parking) {
  return `${currentCityKey}_${parking.nom}_${parking.lat}_${parking.lng}`;
}

function isFavorite(parking) {
  return favorites.includes(getParkingId(parking));
}

function toggleFavorite(parking) {
  const id = getParkingId(parking);

  if (favorites.includes(id)) {
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
  }

  localStorage.setItem("biciparkFavorites", JSON.stringify(favorites));

  renderParkings();

  if (activeLocation && currentMode === "parking") {
    highlightNearestParking(activeLocation.lat, activeLocation.lng);
  }
}

function getSecurityClass(seguretat) {
  if (seguretat === "alta") return "alta";
  if (seguretat === "baixa") return "baixa";
  return "mitjana";
}

function getSecurityBadge(seguretat) {
  if (seguretat === "alta") return `<span class="badge badge-green">🟢 Alta seguretat</span>`;
  if (seguretat === "baixa") return `<span class="badge badge-red">🔴 Baixa</span>`;
  return `<span class="badge badge-yellow">🟡 Mitjana</span>`;
}

function getDataStatusBadge(parking) {
  if (parking.verified === true) return `<span class="badge badge-green">✓ Verificat</span>`;
  if (parking.dataStatus === "official") return `<span class="badge badge-green">Dades oficials</span>`;
  if (parking.dataStatus === "provisional") return `<span class="badge badge-yellow">Dades provisionals</span>`;
  if (parking.dataStatus === "partial_official") return `<span class="badge badge-yellow">Dades oficials parcials</span>`;
  return `<span class="badge badge-dark">Font no indicada</span>`;
}

function createBikeIcon(seguretat, nearest = false) {
  const securityClass = getSecurityClass(seguretat);

  return L.divIcon({
    html: `<div class="pin pin-${securityClass} ${nearest ? "pin-nearest" : ""}">🚲</div>`,
    className: "",
    iconSize: nearest ? [40, 40] : [32, 32],
    iconAnchor: nearest ? [20, 20] : [16, 16]
  });
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = value => value * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getFilteredParkings() {
  return allParkings.filter(parking => {
    if (currentFilter === "favorites") {
      if (!isFavorite(parking)) return false;
    } else if (currentFilter !== "tots" && parking.seguretat !== currentFilter) {
      return false;
    }

    if (currentRadius !== "all" && activeLocation) {
      const distance = getDistanceMeters(activeLocation.lat, activeLocation.lng, parking.lat, parking.lng);
      return distance <= Number(currentRadius);
    }

    return true;
  });
}

function buildPopup(parking, nearest = false) {
  return `
    <strong>${parking.nom}</strong><br>
    ${nearest ? "⭐ Parking recomanat<br>" : ""}
    📍 ${parking.address}<br>
    🚲 Places: ${parking.places}<br>
    🏷️ Tipus: ${parking.type}<br>
    📄 ${parking.source}<br><br>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}" target="_blank">
      Com arribar
    </a>
  `;
}

function createParkingCard(parking, distance = null, recommended = false) {
  const card = document.createElement("div");
  card.className = `parkingCard ${recommended ? "recommended" : ""}`;

  card.innerHTML = `
    <div class="cardTop">
      <div>
        <div class="cardTitle">
          ${recommended ? "⭐ " : ""}${parking.nom}
          <span class="favoriteIcon">${isFavorite(parking) ? "❤️" : "🤍"}</span>
        </div>
        <div class="cardAddress">${parking.address}</div>
      </div>
      ${distance !== null ? `<div class="cardDistance">${formatDistance(distance)}</div>` : ""}
    </div>

    <div class="cardFooter">
      ${getSecurityBadge(parking.seguretat)}
      <span class="badge badge-dark">🚲 ${parking.places}</span>
      ${getDataStatusBadge(parking)}
    </div>
  `;

  const favoriteBtn = card.querySelector(".favoriteIcon");

  favoriteBtn.addEventListener("click", e => {
    e.stopPropagation();
    toggleFavorite(parking);
  });

  card.addEventListener("click", () => {
    map.setView([parking.lat, parking.lng], 17);

    L.popup()
      .setLatLng([parking.lat, parking.lng])
      .setContent(buildPopup(parking, recommended))
      .openOn(map);
  });

  return card;
}

function renderSidebar() {
  const container = document.getElementById("parkingList");
  const title = document.querySelector("#sidebarHeader h2");
  const filtered = getFilteredParkings();

  if (!activeLocation) {
    title.textContent = currentFilter === "favorites"
      ? "Favorits"
      : `Parkings a ${currentCity.name}`;

    const alphabetical = [...filtered].sort((a, b) =>
      a.nom.localeCompare(b.nom, "ca", { sensitivity: "base" })
    );

    container.innerHTML = "";

    if (alphabetical.length === 0) {
      container.innerHTML = `<div class="emptySidebar">No hi ha aparcaments per mostrar.</div>`;
      return;
    }

    alphabetical.forEach(parking => {
      container.appendChild(createParkingCard(parking, null, false));
    });

    return;
  }

  title.textContent = currentFilter === "favorites" ? "Favorits propers" : "Parkings propers";

  const withDistance = filtered.map(parking => ({
    ...parking,
    distance: getDistanceMeters(activeLocation.lat, activeLocation.lng, parking.lat, parking.lng)
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  const top = withDistance.slice(0, 10);

  if (top.length === 0) {
    container.innerHTML = `<div class="emptySidebar">No hi ha parkings dins del radi seleccionat.</div>`;
    return;
  }

  container.innerHTML = "";

  top.forEach((parking, index) => {
    container.appendChild(createParkingCard(parking, parking.distance, index === 0));
  });
}

function createRouteCard(route) {
  const card = document.createElement("div");
  card.className = "parkingCard";

  card.innerHTML = `
    <div class="cardTop">
      <div>
        <div class="cardTitle">🚴 ${route.name}</div>
        <div class="cardAddress">${route.description}</div>
      </div>
    </div>

    <div class="cardFooter">
      <span class="badge badge-dark">${route.distanceKm} km</span>
      <span class="badge badge-yellow">+${route.elevationM} m</span>
      <span class="badge badge-green">${route.difficulty}</span>
      ${route.gpx ? `<span class="badge badge-dark">GPX</span>` : ""}
    </div>
  `;

  card.addEventListener("click", () => {
    showRoadRoute(route);
    renderRouteDetail(route);
  });

  return card;
}

function renderRouteDetail(route) {
  const container = document.getElementById("parkingList");
  const existing = container.querySelector(".route-detail");

  if (existing) existing.remove();

  const villages = Array.isArray(route.villages)
    ? route.villages.map(v => `<li>${v}</li>`).join("")
    : "";

  const pois = Array.isArray(route.pointsOfInterest)
    ? route.pointsOfInterest.map(p => `<li>${p.name} · ${p.type || "Punt d’interès"}</li>`).join("")
    : "";

  const restaurants = Array.isArray(route.restaurants)
    ? route.restaurants.map(r => `<li>${r.name}${r.note ? " · " + r.note : ""}</li>`).join("")
    : "";

  const hotels = Array.isArray(route.hotels)
    ? route.hotels.map(h => `<li>${h.name}${h.note ? " · " + h.note : ""}</li>`).join("")
    : "";

  const notes = Array.isArray(route.notes)
    ? route.notes.map(n => `<li>${n}</li>`).join("")
    : "";

  const detail = document.createElement("div");
  detail.className = "route-detail";

  detail.innerHTML = `
    <h3>${route.name}</h3>

    <div class="route-meta">
      <span class="badge badge-dark">${route.distanceKm} km</span>
      <span class="badge badge-yellow">+${route.elevationM} m</span>
      <span class="badge badge-green">${route.difficulty}</span>
      <span class="badge badge-dark">${route.duration || ""}</span>
      ${route.gpx ? `<span class="badge badge-green">GPX disponible</span>` : `<span class="badge badge-yellow">Sense GPX</span>`}
    </div>

    <p>${route.description}</p>

    <div class="route-section">
      <strong>Pobles / zones de pas</strong>
      <ul>${villages || "<li>Pendent d’afegir</li>"}</ul>
    </div>

    <div class="route-section">
      <strong>Punts d’interès</strong>
      <ul>${pois || "<li>Pendent d’afegir</li>"}</ul>
    </div>

    <div class="route-section">
      <strong>Restaurants / parades</strong>
      <ul>${restaurants || "<li>Pendent d’afegir</li>"}</ul>
    </div>

    <div class="route-section">
      <strong>Allotjaments</strong>
      <ul>${hotels || "<li>Pendent d’afegir</li>"}</ul>
    </div>

    <div class="route-section">
      <strong>Notes</strong>
      <ul>${notes || "<li>Sense notes addicionals</li>"}</ul>
    </div>

    <div class="route-warning">
      Les dades de ruta són editorials i cal validar-les abans d’usar-les com a navegació.
    </div>
  `;

  container.prepend(detail);
}

async function drawGpxRoute(gpxUrl, targetLayer) {
  try {
    const response = await fetch(gpxUrl);

    if (!response.ok) {
      console.warn("No s'ha trobat el GPX:", gpxUrl);
      return false;
    }

    const gpxText = await response.text();
    const points = parseGpxPoints(gpxText);

    if (points.length < 2) {
      console.warn("El GPX no té prou punts:", gpxUrl);
      return false;
    }

    const gpxLine = L.polyline(points, {
      color: "#0057ff",
      weight: 5,
      opacity: 0.9
    });

    targetLayer.addLayer(gpxLine);
    map.fitBounds(gpxLine.getBounds(), { padding: [40, 40] });

    return true;
  } catch (error) {
    console.warn("Error carregant GPX:", error);
    return false;
  }
}

function parseGpxPoints(gpxText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");

  const trkpts = Array.from(xml.getElementsByTagName("trkpt"));
  const rtepts = Array.from(xml.getElementsByTagName("rtept"));

  const rawPoints = trkpts.length > 0 ? trkpts : rtepts;

  return rawPoints
    .map(point => {
      const lat = parseFloat(point.getAttribute("lat"));
      const lng = parseFloat(point.getAttribute("lon"));

      if (isNaN(lat) || isNaN(lng)) return null;

      return [lat, lng];
    })
    .filter(Boolean);
}

async function showRoadRoute(route) {
  if (roadRouteLayer) {
    map.removeLayer(roadRouteLayer);
  }

  roadRouteLayer = L.layerGroup();

  const startMarker = L.marker([route.lat, route.lng], { icon: routeStartIcon })
    .bindPopup(`
      <strong>${route.name}</strong><br>
      Sortida: ${route.start}<br>
      Distància: ${route.distanceKm} km<br>
      Desnivell: +${route.elevationM} m<br>
      Dificultat: ${route.difficulty}<br><br>
      <small>${route.source || "Dades editorials"}</small>
    `);

  roadRouteLayer.addLayer(startMarker);

  if (Array.isArray(route.pointsOfInterest)) {
    route.pointsOfInterest.forEach(point => {
      if (!point.lat || !point.lng) return;

      const pointMarker = L.marker([point.lat, point.lng], { icon: routeStopIcon })
        .bindPopup(`
          <strong>${point.name}</strong><br>
          ${point.type || "Punt d’interès"}
        `);

      roadRouteLayer.addLayer(pointMarker);
    });
  }

  let gpxDrawn = false;

  if (route.gpx) {
    gpxDrawn = await drawGpxRoute(route.gpx, roadRouteLayer);
  }

  roadRouteLayer.addTo(map);

  if (!gpxDrawn) {
    const routePoints = [[route.lat, route.lng]];

    if (Array.isArray(route.pointsOfInterest)) {
      route.pointsOfInterest.forEach(point => {
        if (point.lat && point.lng) {
          routePoints.push([point.lat, point.lng]);
        }
      });
    }

    if (routePoints.length > 1) {
      const fallbackLine = L.polyline(routePoints, {
        color: "#1D9E75",
        weight: 4,
        opacity: 0.75,
        dashArray: "6, 8"
      });

      roadRouteLayer.addLayer(fallbackLine);
      map.fitBounds(fallbackLine.getBounds(), { padding: [40, 40] });
    } else {
      map.setView([route.lat, route.lng], 11);
    }
  }
}

function renderRoadRoutes() {
  const container = document.getElementById("parkingList");
  const title = document.querySelector("#sidebarHeader h2");

  title.textContent = `Rutes de carretera a ${currentCity.name}`;

  markers.clearLayers();
  selectedNearestParkingId = null;

  if (nearestMarker) {
    map.removeLayer(nearestMarker);
    nearestMarker = null;
  }

  container.innerHTML = "";

  if (roadRoutes.length === 0) {
    container.innerHTML = `
      <div class="mode-placeholder">
        <h3>🚴 Rutes de carretera</h3>
        <p>Encara no hi ha rutes de carretera carregades per aquesta ciutat.</p>
      </div>
    `;

    document.getElementById("parkingCounter").textContent =
      `Mode carretera · ${currentCity.name}`;

    document.getElementById("nearestInfo").textContent =
      "No hi ha rutes disponibles encara.";

    return;
  }

  roadRoutes.forEach(route => {
    container.appendChild(createRouteCard(route));
  });

  document.getElementById("parkingCounter").textContent =
    `${roadRoutes.length} rutes de carretera · ${currentCity.name}`;

  document.getElementById("nearestInfo").textContent =
    "Selecciona una ruta per veure punts recomanats al mapa.";
}

function renderModePlaceholder() {
  const container = document.getElementById("parkingList");
  const title = document.querySelector("#sidebarHeader h2");

  markers.clearLayers();

  if (nearestMarker) {
    map.removeLayer(nearestMarker);
    nearestMarker = null;
  }

  selectedNearestParkingId = null;

  if (currentMode === "road") {
    renderRoadRoutes();
    return;
  }

  if (roadRouteLayer) {
    map.removeLayer(roadRouteLayer);
    roadRouteLayer = null;
  }

  if (currentMode === "mtb") {
    title.textContent = `Rutes BTT a ${currentCity.name}`;

    container.innerHTML = `
      <div class="mode-placeholder">
        <h3>⛰️ Rutes BTT / muntanya</h3>
        <p>
          Aquest apartat queda preparat per mostrar rutes BTT amb la mateixa estructura:
          fitxa, punts d’interès, allotjaments i GPX.
        </p>

        <div class="mode-card">
          <strong>Properament</strong><br>
          Sant Miquel, Gavarres, Vall de Sant Daniel i més.
        </div>
      </div>
    `;

    document.getElementById("parkingCounter").textContent =
      `Mode BTT · ${currentCity.name}`;

    document.getElementById("nearestInfo").textContent =
      "Les rutes BTT es mostraran aquí.";

    return;
  }
}

function renderParkings() {
  if (!currentCity) return;

  if (currentMode !== "parking") {
    renderModePlaceholder();
    return;
  }

  if (roadRouteLayer) {
    map.removeLayer(roadRouteLayer);
    roadRouteLayer = null;
  }

  markers.clearLayers();

  const filtered = getFilteredParkings();

  filtered.forEach(parking => {
    const isNearest = getParkingId(parking) === selectedNearestParkingId;

    const marker = L.marker([parking.lat, parking.lng], {
      icon: createBikeIcon(parking.seguretat, isNearest)
    }).bindPopup(buildPopup(parking, isNearest));

    markers.addLayer(marker);
  });

  if (!map.hasLayer(markers)) {
    map.addLayer(markers);
  }

  document.getElementById("parkingCounter").textContent =
    `${filtered.length} aparcaments visibles de ${allParkings.length} totals · ${currentCity.dataLabel || ""}`;

  renderSidebar();
}

function highlightNearestParking(lat, lng) {
  if (currentMode !== "parking") return;

  const filtered = getFilteredParkings();

  if (filtered.length === 0) {
    selectedNearestParkingId = null;

    document.getElementById("nearestInfo").textContent =
      "No hi ha aparcaments visibles amb el filtre actual.";

    renderParkings();
    return;
  }

  let nearest = null;

  filtered.forEach(parking => {
    const distance = getDistanceMeters(lat, lng, parking.lat, parking.lng);

    if (!nearest || distance < nearest.distance) {
      nearest = {
        ...parking,
        distance
      };
    }
  });

  selectedNearestParkingId = getParkingId(nearest);

  document.getElementById("nearestInfo").textContent =
    `Parking més proper: ${nearest.nom} · ${formatDistance(nearest.distance)}`;

  renderParkings();
}

function setRadius(radius, rerender = true) {
  currentRadius = radius;

  document.querySelectorAll(".radius-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.radius === radius);
  });

  if (rerender) {
    renderParkings();

    if (activeLocation && currentMode === "parking") {
      highlightNearestParking(activeLocation.lat, activeLocation.lng);
    }
  }
}

function resetMapState() {
  allParkings = [];
  roadRoutes = [];
  activeLocation = null;
  selectedNearestParkingId = null;

  markers.clearLayers();

  if (searchMarker) map.removeLayer(searchMarker);
  if (userMarker) map.removeLayer(userMarker);
  if (nearestMarker) map.removeLayer(nearestMarker);
  if (bikeLaneLayer) map.removeLayer(bikeLaneLayer);
  if (roadRouteLayer) map.removeLayer(roadRouteLayer);

  searchMarker = null;
  userMarker = null;
  nearestMarker = null;
  bikeLaneLayer = null;
  roadRouteLayer = null;
  bikeLanesVisible = false;

  document.getElementById("bikeLaneBtn").classList.remove("active");
  document.getElementById("nearestInfo").textContent = "Busca una ubicació o prem “A prop meu”.";
  document.getElementById("parkingList").innerHTML = `<div class="emptySidebar">Carregant dades...</div>`;

  setRadius("all", false);
}

function updateAppUiForMode() {
  const parkingControls = document.getElementById("parkingControls");
  const appModeTitle = document.getElementById("appModeTitle");

  const labels = {
    parking: "Aparcaments",
    road: "Rutes de carretera",
    mtb: "Rutes BTT"
  };

  appModeTitle.textContent = labels[currentMode] || "Aparcaments";
  parkingControls.style.display = currentMode === "parking" ? "block" : "none";

  document.querySelectorAll("#modeSwitch .mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === currentMode);
  });
}

function setAppMode(mode) {
  currentMode = mode;
  updateAppUiForMode();
  renderParkings();
}

async function ensureAppReady() {
  if (!citiesLoaded) {
    await loadCities();
  }
}

function setupLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");

    div.innerHTML = `
      <strong>Seguretat estimada</strong>
      <div><span class="legend-dot dot-alta"></span>Alta</div>
      <div><span class="legend-dot dot-mitjana"></span>Mitjana</div>
      <div><span class="legend-dot dot-baixa"></span>Baixa</div>
    `;

    return div;
  };

  legend.addTo(map);
}

async function loadBikeLanes() {
  if (!currentCity.bikeLanes) return;

  try {
    const response = await fetch(currentCity.bikeLanes);
    if (!response.ok) return;

    const data = await response.json();

    bikeLaneLayer = L.geoJSON(data, {
      style: {
        color: "#0066ff",
        weight: 5,
        opacity: 0.85
      }
    });

    if (bikeLanesVisible) {
      bikeLaneLayer.addTo(map);
    }
  } catch (error) {
    console.warn("No s'han pogut carregar els carrils bici:", error);
  }
}

async function loadRoadRoutes() {
  roadRoutes = [];

  if (!currentCity.roadRoutes) return;

  try {
    const response = await fetch(currentCity.roadRoutes);
    if (!response.ok) return;

    const data = await response.json();
    roadRoutes = Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("No s'han pogut carregar les rutes de carretera:", error);
  }
}

async function loadParkings() {
  const response = await fetch(currentCity.parkings);

  if (!response.ok) {
    throw new Error("No s'ha trobat el fitxer d'aparcaments");
  }

  const data = await response.json();
  const items = extractItems(data);

  allParkings = items
    .map(rawItem => {
      const coords = findCoordinatesDeep(rawItem);
      if (!coords) return null;

      return {
        raw: rawItem,
        lat: coords.lat,
        lng: coords.lng,
        nom: getName(rawItem),
        address: getAddress(rawItem),
        places: getPlaces(rawItem),
        seguretat: estimateSecurity(rawItem),
        verified: getVerified(rawItem),
        source: getSource(rawItem),
        type: getType(rawItem),
        dataStatus: currentCity.dataStatus
      };
    })
    .filter(Boolean);
}

async function loadCity(cityKey) {
  showLoading();

  currentCityKey = cityKey;
  currentCity = cities[cityKey];

  resetMapState();

  document.getElementById("citySubtitle").textContent =
    `Aparcaments de bicicleta a ${currentCity.name} · ${currentCity.dataLabel || ""}`;

  map.setView(currentCity.center, currentCity.zoom || 13);

  try {
    await loadParkings();
    await loadBikeLanes();
    await loadRoadRoutes();
    renderParkings();
  } catch (error) {
    console.error(error);
    alert("No s'han pogut carregar les dades d'aquesta ciutat.");
  } finally {
    hideLoading();
  }
}

async function loadCities() {
  try {
    const response = await fetch(CITIES_URL);

    if (!response.ok) {
      throw new Error("No s'ha trobat cities.json");
    }

    cities = await response.json();

    const enabledCities = Object.entries(cities).filter(([key, city]) => city.enabled === true);

    const select = document.getElementById("citySelect");
    select.innerHTML = "";

    enabledCities.forEach(([key, city]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${city.name}, ${city.country}`;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      loadCity(select.value);
    }, { once: true });

    const firstCity = enabledCities[0]?.[0];

    if (!firstCity) {
      alert("No hi ha cap ciutat activa a cities.json.");
      hideLoading();
      return;
    }

    select.value = firstCity;
    citiesLoaded = true;
    await loadCity(firstCity);

    // tornem a posar el listener normal després de la primera càrrega
    select.onchange = () => {
      loadCity(select.value);
    };
  } catch (error) {
    console.error(error);
    alert("No s'han pogut carregar les ciutats.");
    hideLoading();
  }
}

async function searchLocation() {
  const query = document.getElementById("searchInput").value.trim();

  if (!query || !currentCity) return;

  const suffix = currentCity.searchSuffix || `${currentCity.name}, ${currentCity.country}`;
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", " + suffix)}&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      alert("No s'ha trobat cap resultat.");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    activeLocation = { lat, lng: lon };

    map.setView([lat, lon], 15);

    if (searchMarker) map.removeLayer(searchMarker);

    searchMarker = L.marker([lat, lon], { icon: searchIcon })
      .addTo(map)
      .bindPopup(data[0].display_name)
      .openPopup();

    if (currentMode === "parking") {
      setRadius("1000");
      renderParkings();
      highlightNearestParking(lat, lon);
    }
  } catch (error) {
    alert("Error cercant ubicació");
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    alert("El teu navegador no permet geolocalització.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      activeLocation = { lat, lng };

      map.setView([lat, lng], 15);

      if (userMarker) map.removeLayer(userMarker);

      userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Estàs aquí")
        .openPopup();

      if (currentMode === "parking") {
        setRadius("1000");
        renderParkings();
        highlightNearestParking(lat, lng);
      }
    },
    () => {
      alert("No s'ha pogut obtenir la teva ubicació.");
    }
  );
}

function showHome() {
  document.getElementById("homeView").classList.remove("hidden-view");
  document.getElementById("appView").classList.add("hidden-view");

  document.querySelectorAll("#mainNav .navLink").forEach(btn => btn.classList.remove("active"));
  document.getElementById("navHomeBtn").classList.add("active");
}

async function showApp(mode = "parking", cityKey = null) {
  document.getElementById("homeView").classList.add("hidden-view");
  document.getElementById("appView").classList.remove("hidden-view");

  await ensureAppReady();

  if (cityKey && cities[cityKey]) {
    const select = document.getElementById("citySelect");
    select.value = cityKey;

    if (currentCityKey !== cityKey) {
      await loadCity(cityKey);
    }
  }

  setAppMode(mode);

  document.querySelectorAll("#mainNav .navLink").forEach(btn => btn.classList.remove("active"));

  if (mode === "parking") {
    document.querySelector('#mainNav [data-open-mode="parking"]').classList.add("active");
  } else if (mode === "road") {
    document.querySelector('#mainNav [data-open-mode="road"]').classList.add("active");
  } else if (mode === "mtb") {
    document.querySelector('#mainNav [data-open-mode="mtb"]').classList.add("active");
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 120);
}

function setupModeSwitch() {
  document.querySelectorAll("#modeSwitch .mode-btn").forEach(button => {
    button.addEventListener("click", () => {
      setAppMode(button.dataset.mode);
    });
  });
}

function setupEvents() {
  document.getElementById("searchBtn").addEventListener("click", searchLocation);
  document.getElementById("nearBtn").addEventListener("click", locateUser);

  document.getElementById("searchInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") searchLocation();
  });

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      currentFilter = button.dataset.filter;
      renderParkings();

      if (activeLocation && currentMode === "parking") {
        highlightNearestParking(activeLocation.lat, activeLocation.lng);
      }
    });
  });

  document.querySelectorAll(".radius-btn").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.radius !== "all" && !activeLocation) {
        alert("Primer busca una ubicació.");
        return;
      }

      setRadius(button.dataset.radius);
    });
  });

  document.getElementById("bikeLaneBtn").addEventListener("click", () => {
    if (!bikeLaneLayer) return;

    bikeLanesVisible = !bikeLanesVisible;

    if (bikeLanesVisible) {
      bikeLaneLayer.addTo(map);
      document.getElementById("bikeLaneBtn").classList.add("active");
    } else {
      map.removeLayer(bikeLaneLayer);
      document.getElementById("bikeLaneBtn").classList.remove("active");
    }
  });
}

function setupHomeNavigation() {
  document.getElementById("logoHomeBtn").addEventListener("click", showHome);
  document.getElementById("navHomeBtn").addEventListener("click", showHome);
  document.getElementById("backHomeBtn").addEventListener("click", showHome);

  document.querySelectorAll("[data-open-mode]").forEach(button => {
    button.addEventListener("click", async () => {
      const mode = button.dataset.openMode || "parking";
      const city = button.dataset.openCity || null;
      await showApp(mode, city);
    });
  });

  document.getElementById("openMapBtn").addEventListener("click", async () => {
    await showApp("parking");
  });
}

setupLegend();
setupEvents();
setupModeSwitch();
setupHomeNavigation();
showHome();
