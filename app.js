const DATA_URL = "./aparcaments.json";

const map = L.map("map").setView([41.3874, 2.1686], 13);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CartoDB | Dades: Open Data BCN"
}).addTo(map);

let searchMarker;
let userMarker;
let nearestMarker;
let allParkings = [];
let currentFilter = "tots";

const markers = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    return L.divIcon({
      html: `<div>${cluster.getChildCount()}</div>`,
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

function getSecurityText(seguretat) {
  if (seguretat === "alta") return "Alta";
  if (seguretat === "baixa") return "Baixa";
  return "Mitjana";
}

function createBikeIcon(seguretat, isNearest = false) {
  const securityClass = getSecurityClass(seguretat);
  const nearestClass = isNearest ? "pin-nearest" : "";

  return L.divIcon({
    html: `<div class="pin pin-${securityClass} ${nearestClass}">🚲</div>`,
    className: "",
    iconSize: isNearest ? [40, 40] : [32, 32],
    iconAnchor: isNearest ? [20, 20] : [16, 16]
  });
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

function normalizeNumber(value) {
  if (value === undefined || value === null) return null;

  const n = Number(String(value).replace(",", "."));
  return isNaN(n) ? null : n;
}

function isBarcelonaLatLng(lat, lng) {
  return lat >= 41.2 && lat <= 41.6 && lng >= 1.8 && lng <= 2.4;
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
    "Aparcament de bicicleta"
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

  return item.address || item.adreca || item.ADRECA || item.Adreca || "Adreça no disponible";
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

  return "No indicades";
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

function buildPopup(parking, isNearest = false) {
  const securityClass = getSecurityClass(parking.seguretat);
  const nearestText = isNearest ? `<div class="popup-row">⭐ Parking més proper</div>` : "";

  return `
    <div class="popup-title">${parking.nom}</div>
    ${nearestText}
    <div class="popup-row">📍 ${parking.address}</div>
    <div class="popup-row">🚲 Places: ${parking.places}</div>
    <div class="popup-row">
      Seguretat estimada:
      <span class="security-label label-${securityClass}">
        ${getSecurityText(parking.seguretat)}
      </span>
    </div>
    <br>
    <small>Dades: Open Data BCN</small>
    <br>
    <a class="popup-link" href="https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}" target="_blank">
      Com arribar
    </a>
  `;
}

function getFilteredParkings() {
  return allParkings.filter(parking => {
    if (currentFilter === "tots") return true;
    return parking.seguretat === currentFilter;
  });
}

function updateCounter() {
  const visible = getFilteredParkings().length;
  const total = allParkings.length;

  document.getElementById("parkingCounter").textContent =
    `${visible} aparcaments visibles de ${total} totals`;
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

  updateCounter();
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
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function findNearestParking(lat, lng) {
  const candidates = getFilteredParkings();

  if (candidates.length === 0) return null;

  let nearest = null;

  candidates.forEach(parking => {
    const distance = getDistanceMeters(lat, lng, parking.lat, parking.lng);

    if (!nearest || distance < nearest.distance) {
      nearest = {
        ...parking,
        distance
      };
    }
  });

  return nearest;
}

function highlightNearestParking(lat, lng) {
  const nearest = findNearestParking(lat, lng);

  if (!nearest) {
    document.getElementById("nearestInfo").textContent =
      "No hi ha aparcaments visibles amb el filtre actual.";
    return;
  }

  if (nearestMarker) {
    map.removeLayer(nearestMarker);
  }

  nearestMarker = L.marker([nearest.lat, nearest.lng], {
    icon: createBikeIcon(nearest.seguretat, true)
  })
    .addTo(map)
    .bindPopup(buildPopup(nearest, true));

  document.getElementById("nearestInfo").textContent =
    `Parking més proper: ${nearest.nom} · ${formatDistance(nearest.distance)}`;

  nearestMarker.openPopup();
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

        if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) return null;

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

    if (allParkings.length === 0) {
      alert("El fitxer s'ha carregat, però no s'han trobat coordenades.");
      return;
    }

    renderParkings();

  } catch (error) {
    console.error("Error carregant aparcaments:", error);
    alert("No s'han pogut carregar els aparcaments. Comprova que aparcaments.json existeix al repositori.");
  } finally {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
}

async function searchLocation() {
  const query = document.getElementById("searchInput").value.trim();

  if (!query) {
    alert("Escriu una adreça o lloc.");
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Barcelona")}&limit=1&countrycodes=es`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      alert("No s'ha trobat cap resultat.");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    map.setView([lat, lon], 17);

    if (searchMarker) map.removeLayer(searchMarker);

    searchMarker = L.marker([lat, lon], { icon: searchIcon })
      .addTo(map)
      .bindPopup(`<strong>${data[0].display_name}</strong>`)
      .openPopup();

    highlightNearestParking(lat, lon);

  } catch (error) {
    alert("Hi ha hagut un error fent la cerca.");
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

      map.setView([lat, lng], 16);

      if (userMarker) map.removeLayer(userMarker);

      userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Estàs aquí")
        .openPopup();

      highlightNearestParking(lat, lng);
    },
    () => {
      alert("No s'ha pogut obtenir la teva ubicació.");
    }
  );
}

function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));

      button.classList.add("active");
      currentFilter = button.dataset.filter;

      renderParkings();

      if (searchMarker) {
        const pos = searchMarker.getLatLng();
        highlightNearestParking(pos.lat, pos.lng);
      } else if (userMarker) {
        const pos = userMarker.getLatLng();
        highlightNearestParking(pos.lat, pos.lng);
      }
    });
  });
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

document.getElementById("searchBtn").addEventListener("click", searchLocation);
document.getElementById("nearBtn").addEventListener("click", locateUser);

document.getElementById("searchInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") searchLocation();
});

setupFilters();
setupLegend();
loadRealBikeParkings();
