const DATA_URL = "./aparcaments.json";
const BIKE_LANES_URL = "./carrils_bici.geojson";

const map = L.map("map").setView([41.3874, 2.1686], 13);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CartoDB | Dades: Open Data BCN"
  }
).addTo(map);

let allParkings = [];
let currentFilter = "tots";
let currentRadius = "all";
let activeLocation = null;

let searchMarker;
let userMarker;
let nearestMarker;

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

function getSecurityClass(seguretat) {
  if (seguretat === "alta") return "alta";
  if (seguretat === "baixa") return "baixa";
  return "mitjana";
}

function getSecurityBadge(seguretat) {
  if (seguretat === "alta") {
    return `<span class="badge badge-green">🟢 Alta seguretat</span>`;
  }

  if (seguretat === "baixa") {
    return `<span class="badge badge-red">🔴 Baixa</span>`;
  }

  return `<span class="badge badge-yellow">🟡 Mitjana</span>`;
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

function normalizeNumber(value) {
  if (value === undefined || value === null) return null;

  const n = Number(String(value).replace(",", "."));

  return isNaN(n) ? null : n;
}

function isBarcelonaLatLng(lat, lng) {
  return lat >= 41.2 && lat <= 41.6 && lng >= 1.8 && lng <= 2.4;
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.features)) return data.features;
  if (Array.isArray(data.result?.records)) return data.result.records;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;

  const values = Object.values(data);
  const arrayValue = values.find(v => Array.isArray(v));

  return arrayValue || [];
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

  return candidates.find(c => isBarcelonaLatLng(c.lat, c.lng)) || null;
}

function getCoordinates(rawItem) {
  return findCoordinatesDeep(rawItem);
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

  return item.address || item.adreca || item.ADRECA || item.Adreca || "Barcelona";
}

function getPlaces(rawItem) {
  const item = rawItem.properties || rawItem;

  const possibleFields = [
    item.capacity,
    item.capacitat,
    item.places,
    item.num_places,
    item.numero_places,
    item.total_places,
    item.CAPACITAT,
    item.Places
  ];

  for (const value of possibleFields) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "N/D";
}

function estimateSecurity(rawItem) {
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

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = value => value * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getFilteredParkings() {
  return allParkings.filter(parking => {
    if (currentFilter !== "tots" && parking.seguretat !== currentFilter) {
      return false;
    }

    if (currentRadius !== "all" && activeLocation) {
      const distance = getDistanceMeters(
        activeLocation.lat,
        activeLocation.lng,
        parking.lat,
        parking.lng
      );

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
    🚲 Places: ${parking.places}<br><br>

    <a href="https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}" target="_blank">
      Com arribar
    </a>
  `;
}

function renderSidebar() {
  const container = document.getElementById("parkingList");
  const title = document.querySelector("#sidebarHeader h2");

  const filtered = getFilteredParkings();

  if (!activeLocation) {
    title.textContent = "Parkings";

    const alphabetical = [...filtered].sort((a, b) =>
      a.nom.localeCompare(b.nom, "ca", { sensitivity: "base" })
    );

    container.innerHTML = "";

    alphabetical.forEach(parking => {
      const card = document.createElement("div");
      card.className = "parkingCard";

      card.innerHTML = `
        <div class="cardTop">
          <div>
            <div class="cardTitle">${parking.nom}</div>
            <div class="cardAddress">${parking.address}</div>
          </div>
        </div>

        <div class="cardFooter">
          ${getSecurityBadge(parking.seguretat)}
          <span class="badge badge-dark">🚲 ${parking.places}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        map.setView([parking.lat, parking.lng], 17);

        L.popup()
          .setLatLng([parking.lat, parking.lng])
          .setContent(buildPopup(parking))
          .openOn(map);
      });

      container.appendChild(card);
    });

    return;
  }

  title.textContent = "Parkings propers";

  const withDistance = filtered.map(parking => ({
    ...parking,
    distance: getDistanceMeters(
      activeLocation.lat,
      activeLocation.lng,
      parking.lat,
      parking.lng
    )
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  const top = withDistance.slice(0, 10);

  if (top.length === 0) {
    container.innerHTML = `
      <div class="emptySidebar">
        No hi ha parkings dins del radi seleccionat.
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  top.forEach((parking, index) => {
    const card = document.createElement("div");

    card.className = `parkingCard ${index === 0 ? "recommended" : ""}`;

    card.innerHTML = `
      <div class="cardTop">
        <div>
          <div class="cardTitle">
            ${index === 0 ? "⭐ " : ""}
            ${parking.nom}
          </div>

          <div class="cardAddress">
            ${parking.address}
          </div>
        </div>

        <div class="cardDistance">
          ${formatDistance(parking.distance)}
        </div>
      </div>

      <div class="cardFooter">
        ${getSecurityBadge(parking.seguretat)}
        <span class="badge badge-dark">🚲 ${parking.places}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      map.setView([parking.lat, parking.lng], 17);

      L.popup()
        .setLatLng([parking.lat, parking.lng])
        .setContent(buildPopup(parking, index === 0))
        .openOn(map);
    });

    container.appendChild(card);
  });
}

function renderParkings() {
  markers.clearLayers();

  const filtered = getFilteredParkings();

  filtered.forEach(parking => {
    const marker = L.marker([parking.lat, parking.lng], {
      icon: createBikeIcon(parking.seguretat)
    }).bindPopup(buildPopup(parking));

    markers.addLayer(marker);
  });

  if (!map.hasLayer(markers)) {
    map.addLayer(markers);
  }

  document.getElementById("parkingCounter").textContent =
    `${filtered.length} aparcaments visibles de ${allParkings.length} totals`;

  renderSidebar();
}

function highlightNearestParking(lat, lng) {
  const filtered = getFilteredParkings();

  if (filtered.length === 0) {
    document.getElementById("nearestInfo").textContent =
      "No hi ha aparcaments visibles amb el filtre actual.";
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

  if (!nearest) return;

  if (nearestMarker) {
    map.removeLayer(nearestMarker);
  }

  nearestMarker = L.marker([nearest.lat, nearest.lng], {
    icon: createBikeIcon(nearest.seguretat, true)
  })
    .addTo(map)
    .bindPopup(buildPopup(nearest, true));

  document.getElementById("nearestInfo").textContent =
    `Parking més proper: ${nearest.nom} · ${formatDistance(nearest.distance)} ●`;
}

function setRadius(radius) {
  currentRadius = radius;

  document.querySelectorAll(".radius-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.radius === radius);
  });

  renderParkings();

  if (activeLocation) {
    highlightNearestParking(activeLocation.lat, activeLocation.lng);
  }
}

function autoActivateNearbyMode() {
  setRadius("1000");
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

async function loadRealBikeParkings() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error("No s'ha trobat aparcaments.json");
    }

    const data = await response.json();
    const items = extractItems(data);

    allParkings = items
      .map(rawItem => {
        const coords = getCoordinates(rawItem);

        if (!coords) return null;

        return {
          raw: rawItem,
          lat: coords.lat,
          lng: coords.lng,
          nom: getName(rawItem),
          address: getAddress(rawItem),
          places: getPlaces(rawItem),
          seguretat: estimateSecurity(rawItem)
        };
      })
      .filter(Boolean);

    renderParkings();

  } catch (error) {
    console.error(error);
    alert("Error carregant aparcaments");
  } finally {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
}

async function searchLocation() {
  const query = document.getElementById("searchInput").value.trim();

  if (!query) return;

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Barcelona")}&limit=1&countrycodes=es`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      alert("No s'ha trobat cap resultat.");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    activeLocation = {
      lat,
      lng: lon
    };

    map.setView([lat, lon], 15);

    if (searchMarker) {
      map.removeLayer(searchMarker);
    }

    searchMarker = L.marker([lat, lon], {
      icon: searchIcon
    })
      .addTo(map)
      .bindPopup(data[0].display_name)
      .openPopup();

    autoActivateNearbyMode();
    renderParkings();
    highlightNearestParking(lat, lon);

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

      activeLocation = {
        lat,
        lng
      };

      map.setView([lat, lng], 15);

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Estàs aquí")
        .openPopup();

      autoActivateNearbyMode();
      renderParkings();
      highlightNearestParking(lat, lng);
    },
    () => {
      alert("No s'ha pogut obtenir la teva ubicació.");
    }
  );
}

document.getElementById("searchBtn").addEventListener("click", searchLocation);
document.getElementById("nearBtn").addEventListener("click", locateUser);

document.getElementById("searchInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    searchLocation();
  }
});

document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
    currentFilter = button.dataset.filter;

    renderParkings();

    if (activeLocation) {
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

setupLegend();
loadRealBikeParkings();
