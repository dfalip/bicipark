const DATA_URL = "./aparcaments.json";

const map = L.map("map").setView([41.3874, 2.1686], 13);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CartoDB | Dades: Open Data BCN"
}).addTo(map);

let searchMarker;
let userMarker;
let allParkings = [];
let currentFilter = "tots";

const markers = L.markerClusterGroup();

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

function createBikeIcon(seguretat) {
  const securityClass = getSecurityClass(seguretat);

  return L.divIcon({
    html: `<div class="pin pin-${securityClass}">🚲</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
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
  const direct = findCoordinatesDeep(rawItem);
  return direct || null;
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

function buildPopup(parking) {
  const securityClass = getSecurityClass(parking.seguretat);

  return `
    <div class="popup-title">${parking.nom}</div>
    ${parking.address}<br>
    Places: ${parking.places}<br>
    Seguretat estimada:
    <span class="security-label label-${securityClass}">
      ${getSecurityText(parking.seguretat)}
    </span>
    <br><br>
    <small>Dades: Open Data BCN</small>
    <br>
    <a class="popup-link" href="https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}" target="_blank">
      Com arribar
    </a>
  `;
}

function renderParkings() {
  markers.clearLayers();

  const filtered = allParkings.filter(parking => {
    if (currentFilter === "tots") return true;
    return parking.seguretat === currentFilter;
  });

  filtered.forEach(parking => {
    const marker = L.marker([parking.lat, parking.lng], {
      icon: createBikeIcon(parking.seguretat)
    }).bindPopup(buildPopup(parking));

    markers.addLayer(marker);
  });

  if (!map.hasLayer(markers)) {
    map.addLayer(markers);
  }

  console.log("Aparcaments mostrats:", filtered.length);
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

    console.log("Aparcaments carregats:", allParkings.length);

    if (allParkings.length === 0) {
      alert("El fitxer s'ha carregat, però no s'han trobat coordenades.");
      return;
    }

    renderParkings();

  } catch (error) {
    console.error("Error carregant aparcaments:", error);
    alert("No s'han pogut carregar els aparcaments. Comprova que aparcaments.json existeix al repositori.");
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
