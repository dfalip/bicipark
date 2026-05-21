const CITIES_URL = "./cities.json";

let cities = {};
let currentCityKey = null;
let currentCity = null;

let allParkings = [];
let currentFilter = "tots";
let currentRadius = "all";
let activeLocation = null;

let searchMarker;
let userMarker;
let nearestMarker;
let bikeLaneLayer;
let bikeLanesVisible = false;

let favorites = JSON.parse(
  localStorage.getItem("biciparkFavorites") || "[]"
);

const map = L.map("map").setView([41.3874, 2.1686], 13);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CartoDB"
  }
).addTo(map);

const markers = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
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
  html: `<div class="search-pin"></div>`,
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

  localStorage.setItem(
    "biciparkFavorites",
    JSON.stringify(favorites)
  );

  renderParkings();
}

function resetMapState() {
  allParkings = [];
  activeLocation = null;

  markers.clearLayers();

  if (searchMarker) map.removeLayer(searchMarker);
  if (userMarker) map.removeLayer(userMarker);
  if (nearestMarker) map.removeLayer(nearestMarker);
  if (bikeLaneLayer) map.removeLayer(bikeLaneLayer);

  searchMarker = null;
  userMarker = null;
  nearestMarker = null;
  bikeLaneLayer = null;
  bikeLanesVisible = false;

  document
    .getElementById("bikeLaneBtn")
    .classList.remove("active");

  document.getElementById("nearestInfo").textContent =
    "Busca una ubicació o prem “A prop meu”.";
}

function getSecurityClass(seguretat) {
  if (seguretat === "alta") return "alta";
  if (seguretat === "baixa") return "baixa";
  return "mitjana";
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
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function getFilteredParkings() {
  return allParkings.filter(parking => {

    if (currentFilter === "favorites") {
      if (!isFavorite(parking)) return false;
    }

    else if (
      currentFilter !== "tots" &&
      parking.seguretat !== currentFilter
    ) {
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

function buildPopup(parking) {
  return `
    <strong>${parking.nom}</strong><br>
    📍 ${parking.address}<br>
    🚲 Places: ${parking.places}<br><br>

    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}')">
      Com arribar
    </button>
  `;
}

function createParkingCard(parking) {

  const favoriteIcon = isFavorite(parking)
    ? "❤️"
    : "🤍";

  const card = document.createElement("div");

  card.className = "parkingCard";

  card.innerHTML = `
    <div class="cardTop">
      <div>
        <div class="cardTitle">
          ${parking.nom}
          <span class="favoriteIcon">
            ${favoriteIcon}
          </span>
        </div>

        <div class="cardAddress">
          ${parking.address}
        </div>
      </div>
    </div>

    <div class="cardFooter">
      <span class="badge badge-dark">
        🚲 ${parking.places}
      </span>
    </div>
  `;

  const favoriteBtn =
    card.querySelector(".favoriteIcon");

  favoriteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(parking);
  });

  card.addEventListener("click", () => {
    map.setView([parking.lat, parking.lng], 17);

    L.popup()
      .setLatLng([parking.lat, parking.lng])
      .setContent(buildPopup(parking))
      .openOn(map);
  });

  return card;
}

function renderSidebar() {

  const container =
    document.getElementById("parkingList");

  const filtered = getFilteredParkings();

  const alphabetical = [...filtered].sort((a, b) =>
    a.nom.localeCompare(b.nom, "ca")
  );

  container.innerHTML = "";

  alphabetical.forEach(parking => {
    container.appendChild(
      createParkingCard(parking)
    );
  });

  if (alphabetical.length === 0) {
    container.innerHTML = `
      <div class="emptySidebar">
        No hi ha resultats.
      </div>
    `;
  }
}

function renderParkings() {

  markers.clearLayers();

  const filtered = getFilteredParkings();

  filtered.forEach(parking => {

    const marker = L.marker(
      [parking.lat, parking.lng],
      {
        icon: createBikeIcon(parking.seguretat)
      }
    ).bindPopup(buildPopup(parking));

    markers.addLayer(marker);
  });

  if (!map.hasLayer(markers)) {
    map.addLayer(markers);
  }

  document.getElementById(
    "parkingCounter"
  ).textContent =
    `${filtered.length} aparcaments visibles`;

  renderSidebar();
}

async function loadBikeLanes() {

  if (!currentCity.bikeLanes) return;

  try {

    const response =
      await fetch(currentCity.bikeLanes);

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
    console.warn(error);
  }
}

async function loadParkings() {

  const response =
    await fetch(currentCity.parkings);

  const data = await response.json();

  allParkings = data.map(item => ({
    nom:
      item.name ||
      item.nom ||
      "Parking bici",

    address:
      item.address ||
      "Ubicació",

    lat: item.lat,

    lng: item.lng,

    places:
      item.capacity ||
      item.places ||
      "N/D",

    seguretat:
      item.security ||
      item.seguretat ||
      "mitjana"
  }));
}

async function loadCity(cityKey) {

  showLoading();

  currentCityKey = cityKey;
  currentCity = cities[cityKey];

  resetMapState();

  document.getElementById(
    "citySubtitle"
  ).textContent =
    `Aparcaments de bicicleta a ${currentCity.name}`;

  map.setView(
    currentCity.center,
    currentCity.zoom || 13
  );

  try {

    await loadParkings();

    await loadBikeLanes();

    renderParkings();

  } catch (error) {

    console.error(error);

    alert(
      "No s'han pogut carregar les dades."
    );

  } finally {

    hideLoading();
  }
}

async function loadCities() {

  const response =
    await fetch(CITIES_URL);

  cities = await response.json();

  const enabledCities =
    Object.entries(cities).filter(
      ([key, city]) => city.enabled === true
    );

  const select =
    document.getElementById("citySelect");

  select.innerHTML = "";

  enabledCities.forEach(([key, city]) => {

    const option =
      document.createElement("option");

    option.value = key;

    option.textContent =
      `${city.name}, ${city.country}`;

    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    loadCity(select.value);
  });

  const firstCity =
    enabledCities[0][0];

  select.value = firstCity;

  await loadCity(firstCity);
}

async function searchLocation() {

  const query =
    document.getElementById("searchInput")
      .value
      .trim();

  if (!query) return;

  const suffix =
    currentCity.searchSuffix;

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

    activeLocation = {
      lat,
      lng: lon
    };

    map.setView([lat, lon], 15);

    if (searchMarker) {
      map.removeLayer(searchMarker);
    }

    searchMarker =
      L.marker([lat, lon], {
        icon: searchIcon
      })
      .addTo(map);

  } catch (error) {

    alert("Error cercant ubicació");
  }
}

function locateUser() {

  if (!navigator.geolocation) {
    alert(
      "El navegador no permet geolocalització."
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {

      const lat =
        position.coords.latitude;

      const lng =
        position.coords.longitude;

      map.setView([lat, lng], 15);

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker =
        L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Estàs aquí")
        .openPopup();
    },

    () => {
      alert(
        "No s'ha pogut obtenir la ubicació."
      );
    }
  );
}

function setupLegend() {

  const legend = L.control({
    position: "bottomright"
  });

  legend.onAdd = function () {

    const div =
      L.DomUtil.create("div", "legend");

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

function setupEvents() {

  document
    .getElementById("searchBtn")
    .addEventListener("click", searchLocation);

  document
    .getElementById("nearBtn")
    .addEventListener("click", locateUser);

  document
    .getElementById("searchInput")
    .addEventListener("keypress", function(e) {

      if (e.key === "Enter") {
        searchLocation();
      }
    });

  document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

      button.addEventListener("click", () => {

        document
          .querySelectorAll(".filter-btn")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        button.classList.add("active");

        currentFilter =
          button.dataset.filter;

        renderParkings();
      });
    });

  document
    .querySelectorAll(".radius-btn")
    .forEach(button => {

      button.addEventListener("click", () => {

        document
          .querySelectorAll(".radius-btn")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        button.classList.add("active");

        currentRadius =
          button.dataset.radius;

        renderParkings();
      });
    });

  document
    .getElementById("bikeLaneBtn")
    .addEventListener("click", () => {

      if (!bikeLaneLayer) return;

      bikeLanesVisible =
        !bikeLanesVisible;

      if (bikeLanesVisible) {

        bikeLaneLayer.addTo(map);

        document
          .getElementById("bikeLaneBtn")
          .classList.add("active");

      } else {

        map.removeLayer(bikeLaneLayer);

        document
          .getElementById("bikeLaneBtn")
          .classList.remove("active");
      }
    });
}

setupLegend();
setupEvents();
loadCities();
