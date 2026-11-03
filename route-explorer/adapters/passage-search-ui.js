import { findRoutesPassingNear } from "../modules/route-passage-catalog.js";
import { loadRouteGeometry } from "../modules/geometry-loader.js";

const COPY = {
  ca: { title: "Rutes que passen per aquí", intro: "Cerca només sobre rutes amb geometria real carregable. L’absència d’un resultat no vol dir necessàriament que la ruta no hi passi.", lat: "Latitud", lng: "Longitud", radius: "Radi", search: "Cercar", pick: "Triar punt al mapa", picking: "Clica un punt del mapa", picked: "Punt seleccionat al mapa", searching: "Comprovant geometries…", empty: "Cap coincidència dins del radi entre les rutes amb geometria disponible.", coverage: n => `${n} rutes amb geometria comprovades`, near: km => `${km} km del track`, open: "Veure ruta al mapa", invalid: "Introdueix coordenades vàlides." },
  es: { title: "Rutas que pasan por aquí", intro: "Busca solo sobre rutas con geometría real cargable. La ausencia de un resultado no significa necesariamente que la ruta no pase por aquí.", lat: "Latitud", lng: "Longitud", radius: "Radio", search: "Buscar", pick: "Elegir punto en el mapa", picking: "Haz clic en un punto del mapa", picked: "Punto seleccionado en el mapa", searching: "Comprobando geometrías…", empty: "Ninguna coincidencia dentro del radio entre las rutas con geometría disponible.", coverage: n => `${n} rutas con geometría comprobadas`, near: km => `${km} km del track`, open: "Ver ruta en el mapa", invalid: "Introduce coordenadas válidas." },
  en: { title: "Routes passing near here", intro: "Searches only routes with loadable real geometry. No result does not necessarily mean a route does not pass here.", lat: "Latitude", lng: "Longitude", radius: "Radius", search: "Search", pick: "Pick point on map", picking: "Click a point on the map", picked: "Point selected on map", searching: "Checking route geometry…", empty: "No matches within the radius among routes with available geometry.", coverage: n => `${n} routes with geometry checked`, near: km => `${km} km from track`, open: "View route on map", invalid: "Enter valid coordinates." },
  fr: { title: "Itinéraires passant près d’ici", intro: "Recherche uniquement les itinéraires disposant d’une géométrie réelle chargeable. L’absence de résultat ne signifie pas forcément qu’un itinéraire ne passe pas ici.", lat: "Latitude", lng: "Longitude", radius: "Rayon", search: "Rechercher", pick: "Choisir un point sur la carte", picking: "Cliquez sur un point de la carte", picked: "Point sélectionné sur la carte", searching: "Vérification des géométries…", empty: "Aucune correspondance dans le rayon parmi les itinéraires avec géométrie disponible.", coverage: n => `${n} itinéraires avec géométrie vérifiés`, near: km => `${km} km de la trace`, open: "Voir sur la carte", invalid: "Saisissez des coordonnées valides." }
};

function language() {
  const raw = (document.documentElement.lang || localStorage.getItem("bicipark-language") || "ca").toLowerCase();
  return COPY[raw.slice(0, 2)] ? raw.slice(0, 2) : "ca";
}

async function loadRoutes() {
  const response = await fetch("./data/routes.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`routes ${response.status}`);
  const routes = await response.json();
  return Array.isArray(routes) ? routes.filter(route => route?.enabled !== false) : [];
}

function formatDistance(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: value < 1 ? 2 : 1 });
}

function getMap() {
  return window.__BICIPARK_ROUTE_EXPLORER_MAP__ || null;
}

function mount() {
  const controls = document.querySelector(".route-explorer-controls");
  if (!controls || document.getElementById("passageSearch")) return;
  const t = COPY[language()];
  const section = document.createElement("section");
  section.id = "passageSearch";
  section.className = "passage-search";
  section.innerHTML = `<h2>${t.title}</h2><p class="passage-search-note">${t.intro}</p><div class="passage-search-grid"><label><span>${t.lat}</span><input id="passageLat" type="number" inputmode="decimal" step="any" min="-90" max="90" placeholder="41.387"></label><label><span>${t.lng}</span><input id="passageLng" type="number" inputmode="decimal" step="any" min="-180" max="180" placeholder="2.170"></label><label><span>${t.radius}</span><select id="passageRadius"><option value="0.5">0.5 km</option><option value="1">1 km</option><option value="2" selected>2 km</option><option value="5">5 km</option></select></label></div><div class="passage-search-actions"><button id="passagePick" type="button" class="route-explorer-route-action">${t.pick}</button><button id="passageSubmit" type="button" class="route-explorer-route-action">${t.search}</button></div><p id="passageStatus" class="passage-search-status" role="status" aria-live="polite"></p><div id="passageResults" class="passage-search-results"></div>`;
  controls.appendChild(section);

  const status = section.querySelector("#passageStatus");
  const results = section.querySelector("#passageResults");
  const latInput = section.querySelector("#passageLat");
  const lngInput = section.querySelector("#passageLng");
  const pickButton = section.querySelector("#passagePick");
  let pickMarker = null;
  let picking = false;

  function stopPicking() {
    picking = false;
    section.classList.remove("is-picking");
    const map = getMap();
    if (map?.getContainer) map.getContainer().classList.remove("is-passage-picking");
  }

  function bindMapPicker(map) {
    if (!map || map.__biciparkPassagePickerBound) return;
    map.__biciparkPassagePickerBound = true;
    map.on("click", event => {
      if (!picking || !event?.latlng) return;
      const { lat, lng } = event.latlng;
      latInput.value = Number(lat).toFixed(6);
      lngInput.value = Number(lng).toFixed(6);
      if (pickMarker) pickMarker.setLatLng(event.latlng);
      else if (window.L) pickMarker = L.circleMarker(event.latlng, { radius: 7, weight: 3, fillOpacity: 0.65 }).addTo(map);
      stopPicking();
      status.textContent = t.picked;
      section.querySelector("#passageSubmit").focus();
    });
  }

  bindMapPicker(getMap());
  window.addEventListener("bicipark:route-map-ready", event => bindMapPicker(event.detail?.map), { once: true });

  pickButton.addEventListener("click", () => {
    const map = getMap();
    if (!map) return;
    picking = !picking;
    section.classList.toggle("is-picking", picking);
    map.getContainer().classList.toggle("is-passage-picking", picking);
    status.textContent = picking ? t.picking : "";
  });

  section.querySelector("#passageSubmit").addEventListener("click", async () => {
    stopPicking();
    const lat = Number(latInput.value);
    const lng = Number(lngInput.value);
    const radius = Number(section.querySelector("#passageRadius").value);
    results.replaceChildren();
    if (!latInput.value.trim() || !lngInput.value.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { status.textContent = t.invalid; return; }
    status.textContent = t.searching;
    try {
      const routes = await loadRoutes();
      let checked = 0;
      const matches = await findRoutesPassingNear({ routes, target: [lat, lng], maximumDistanceKm: radius, loadGeometry: async route => { const geometry = await loadRouteGeometry(route); checked += 1; return geometry; } });
      status.textContent = t.coverage(checked);
      if (!matches.length) { results.textContent = t.empty; return; }
      const list = document.createElement("ul");
      for (const match of matches.slice(0, 10)) {
        const item = document.createElement("li");
        const name = document.createElement("button");
        name.type = "button";
        name.className = "passage-search-open";
        name.textContent = match.route.name || match.route.id;
        name.setAttribute("aria-label", `${t.open}: ${name.textContent}`);
        name.addEventListener("click", () => window.dispatchEvent(new CustomEvent("bicipark:passage-open-route", { detail: { routeId: match.route.id } })));
        const distance = document.createElement("span");
        distance.textContent = t.near(formatDistance(match.distanceKm));
        item.append(name, distance);
        list.appendChild(item);
      }
      results.appendChild(list);
    } catch (error) {
      console.warn("Passage search:", error);
      status.textContent = t.empty;
    }
  });
}

mount();
