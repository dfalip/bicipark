"use strict";

const map = L.map("bike-map").setView([41.3874, 2.1686], 12);
  // BICIPARK_MAIN_MAP_EXPORT_V1
  window.BICIPARK_MAIN_MAP = map;

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);

const routeLayers = new Map();

let routes = [];

async function loadRoutes() {
  try {
    const response = await fetch("data/rutes.json");

    if (!response.ok) {
      throw new Error(`Error carregant rutes: ${response.status}`);
    }

    routes = await response.json();

    await drawRoutes(routes);
    renderRouteList(routes);
  } catch (error) {
    console.error(error);

    document.getElementById("llista-rutes").innerHTML =
      "<p>No s'han pogut carregar les rutes.</p>";
  }
}

async function drawRoutes(routeList) {
  for (const route of routeList) {
    try {
      const response = await fetch(route.fitxer);

      if (!response.ok) {
        throw new Error(`No s'ha pogut carregar ${route.nom}`);
      }

      const geojson = await response.json();

      const layer = L.geoJSON(geojson, {
        weight: 5,
        opacity: 0.85,
        onEachFeature: (_, featureLayer) => {
          featureLayer.bindPopup(createRoutePopup(route));

          featureLayer.on("click", () => {
            selectRoute(route.id);
          });
        }
      });

      layer.addTo(map);
      routeLayers.set(route.id, layer);
    } catch (error) {
      console.error(error);
    }
  }
}

function createRoutePopup(route) {
  return `
    <strong>${escapeHtml(route.nom)}</strong><br>
    ${route.distanciaKm} km Â· ${route.desnivell} m+<br>
    Seguretat: ${route.seguretat}/100<br>
    Qualitat: ${route.qualitat}/100
  `;
}

function renderRouteList(routeList) {
  const container = document.getElementById("llista-rutes");

  if (!routeList.length) {
    container.innerHTML = "<p>No hi ha rutes amb aquests filtres.</p>";
    return;
  }

  container.innerHTML = routeList
    .map(
      route => `
        <article
          class="route-card"
          data-route-id="${escapeHtml(route.id)}"
          tabindex="0"
        >
          <h2>${escapeHtml(route.nom)}</h2>

          <div class="route-data">
            <span>${route.distanciaKm} km</span>
            <span>${route.desnivell} m+</span>
            <span>${escapeHtml(route.dificultat)}</span>
          </div>

          <p>
            <span class="score">
              Seguretat ${route.seguretat}
            </span>

            <span class="score">
              Qualitat ${route.qualitat}
            </span>
          </p>
        </article>
      `
    )
    .join("");

  container.querySelectorAll(".route-card").forEach(card => {
    const openRoute = () => {
      selectRoute(card.dataset.routeId);
    };

    card.addEventListener("click", openRoute);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        openRoute();
      }
    });
  });
}

function selectRoute(routeId) {
  const layer = routeLayers.get(routeId);

  if (!layer) {
    return;
  }

  map.fitBounds(layer.getBounds(), {
    padding: [30, 30]
  });

  layer.openPopup();
}

function filterRoutes() {
  const modality = document.getElementById("modalitat").value;
  const difficulty = document.getElementById("dificultat").value;

  const filteredRoutes = routes.filter(route => {
    const matchesModality =
      modality === "totes" || route.modalitat === modality;

    const matchesDifficulty =
      difficulty === "totes" || route.dificultat === difficulty;

    return matchesModality && matchesDifficulty;
  });

  routeLayers.forEach((layer, routeId) => {
    const visible = filteredRoutes.some(route => route.id === routeId);

    if (visible && !map.hasLayer(layer)) {
      layer.addTo(map);
    }

    if (!visible && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });

  renderRouteList(filteredRoutes);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document
  .getElementById("modalitat")
  .addEventListener("change", filterRoutes);

document
  .getElementById("dificultat")
  .addEventListener("change", filterRoutes);

loadRoutes();


