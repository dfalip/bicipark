import {
  regions,
  cataloniaView
} from "./data/regions.js";

import {
  loadRouteGeometry,
  createGeometryLayer,
  routeIntersectsBounds
} from "./modules/geometry-loader.js";

import {
  loadSegmentedRouteSources,
  getVisibleSegmentedSections,
  getSourceBounds
} from "./modules/segmented-route-source.js";

const SETTINGS = Object.freeze({
  overviewMaximumZoom: 7,
  regionalMaximumZoom: 9,
  localMaximumZoom: 11,
  regionalRouteLimit: 5,
  localRouteLimit: 15,
  detailRouteLimit: 30
});

const difficultyStyles = Object.freeze({
  facil: {
    label: "Fàcil",
    color: "#16856b",
    weight: 4
  },
  moderada: {
    label: "Moderada",
    color: "#2864dc",
    weight: 4
  },
  dificil: {
    label: "Difícil",
    color: "#e18118",
    weight: 5
  },
  experta: {
    label: "Experta",
    color: "#a43a78",
    weight: 5
  }
});

const modalityLabels = Object.freeze({
  road: "Carretera",
  btt: "BTT",
  gravel: "Gravel",
  urban: "Urbana",
  greenway: "Via verda"
});

const elements = {
  regionFilter: document.getElementById("regionFilter"),
  modalityFilter: document.getElementById("modalityFilter"),
  difficultyFilter: document.getElementById("difficultyFilter"),
  showOtherRoutes: document.getElementById("showOtherRoutes"),
  viewStatus: document.getElementById("viewStatus"),
  routeList: document.getElementById("routeList"),
  routeDetails: document.getElementById("routeDetails"),
  collectionsSection: document.getElementById("collectionsSection"),
  collectionList: document.getElementById("collectionList")
};

const map = L.map("routeMap").setView(
  cataloniaView.center,
  cataloniaView.zoom
);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);

const regionLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);

const state = {
  localRoutes: [],
  collections: [],
  segmentedSources: [],
  segmentedSections: [],
  activeSourceIds: new Set(),
  selectedRouteId: null,
  routeLayers: new Map(),
  renderToken: 0
};

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`No s'ha pogut carregar ${path}`, error);
    return fallback;
  }
}

function ensureInternationalRegionOption() {
  const existingOption = [
    ...elements.regionFilter.options
  ].some(option => option.value === "international");

  if (existingOption) {
    return;
  }

  const option = document.createElement("option");
  option.value = "international";
  option.textContent = "Internacional";
  elements.regionFilter.appendChild(option);
}

function getVisibilityMode(zoom) {
  if (zoom <= SETTINGS.overviewMaximumZoom) {
    return "overview";
  }

  if (zoom <= SETTINGS.regionalMaximumZoom) {
    return "regional";
  }

  if (zoom <= SETTINGS.localMaximumZoom) {
    return "local";
  }

  return "detail";
}

function getLocalRouteLimit(mode) {
  if (mode === "regional") {
    return SETTINGS.regionalRouteLimit;
  }

  if (mode === "local") {
    return SETTINGS.localRouteLimit;
  }

  return SETTINGS.detailRouteLimit;
}

function routeMatchesFilters(route) {
  const region = elements.regionFilter.value;
  const modality = elements.modalityFilter.value;
  const difficulty = elements.difficultyFilter.value;

  return (
    (region === "all" || route.region === region) &&
    (modality === "all" || route.modality === modality) &&
    (difficulty === "all" || route.difficulty === difficulty)
  );
}

function getVisibleLocalRoutes() {
  const zoom = map.getZoom();
  const mode = getVisibilityMode(zoom);
  const viewport = map.getBounds();

  if (mode === "overview") {
    return [];
  }

  let candidates = state.localRoutes
    .filter(route => route.enabled !== false)
    .filter(routeMatchesFilters)
    .filter(
      route =>
        Number(route.minimumZoom ?? 0) <= zoom
    )
    .filter(
      route => routeIntersectsBounds(route, viewport)
    );

  if (mode === "regional") {
    candidates = candidates.filter(
      route => route.featured === true
    );
  }

  candidates.sort((first, second) => {
    const firstPriority = Number(first.priority ?? 999);
    const secondPriority = Number(second.priority ?? 999);

    return firstPriority - secondPriority;
  });

  return candidates.slice(
    0,
    getLocalRouteLimit(mode)
  );
}

function getVisibleSegmentedRoutes() {
  return getVisibleSegmentedSections({
    sources: state.segmentedSources,
    sections: state.segmentedSections,
    activeSourceIds: state.activeSourceIds,
    mapBounds: map.getBounds(),
    zoom: map.getZoom()
  }).filter(routeMatchesFilters);
}

function getVisibleRoutes() {
  return [
    ...getVisibleLocalRoutes(),
    ...getVisibleSegmentedRoutes()
  ];
}

function getRegionCount(regionId) {
  return [
    ...state.localRoutes,
    ...state.segmentedSections
  ].filter(
    route =>
      route.enabled !== false &&
      route.region === regionId
  ).length;
}

function renderRegionMarkers() {
  regionLayer.clearLayers();

  if (getVisibilityMode(map.getZoom()) !== "overview") {
    return;
  }

  for (const region of Object.values(regions)) {
    const count = getRegionCount(region.id);

    const icon = L.divIcon({
      className: "",
      html:
        `<div class="route-region-marker">` +
        `<strong>${region.label}</strong>` +
        `<small>${count} ${count === 1 ? "ruta" : "rutes"}</small>` +
        `</div>`,
      iconSize: [98, 62],
      iconAnchor: [49, 31]
    });

    const marker = L.marker(region.center, {
      icon,
      title: `Explorar ${region.label}`
    }).addTo(regionLayer);

    marker.on("click", () => {
      elements.regionFilter.value = region.id;

      map.fitBounds(region.viewBounds, {
        padding: [24, 24]
      });
    });
  }
}

function getRouteStyle(route, selected) {
  const base =
    difficultyStyles[route.difficulty] ??
    difficultyStyles.moderada;

  const hideSecondary =
    state.selectedRouteId &&
    !elements.showOtherRoutes.checked &&
    !selected;

  return {
    color:
      route.collectionColor ||
      base.color,
    weight: selected
      ? base.weight + 4
      : route.segmented
        ? base.weight + 1
        : base.weight,
    opacity: hideSecondary
      ? 0
      : selected
        ? 1
        : route.segmented
          ? 0.72
          : 0.5,
    lineCap: "round",
    lineJoin: "round"
  };
}

// BICIPARK_STAGE_NUMBER_MARKERS_V1
function getStageMarkerPosition(route, geometry, layer) {
  // En GPX, col·loquem el número sobre un punt real aproximadament
  // al mig de l'etapa perquè sigui fàcil d'identificar.
  if (
    geometry?.kind === "polylines" &&
    Array.isArray(geometry.data)
  ) {
    const points = geometry.data
      .flat()
      .filter(
        point =>
          Array.isArray(point) &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      );

    if (points.length > 0) {
      return points[Math.floor(points.length / 2)];
    }
  }

  // Fallback per altres geometries.
  if (
    route?.center &&
    Number.isFinite(Number(route.center.lat)) &&
    Number.isFinite(Number(route.center.lng))
  ) {
    return [
      Number(route.center.lat),
      Number(route.center.lng)
    ];
  }

  if (layer?.getBounds) {
    const bounds = layer.getBounds();

    if (bounds?.isValid()) {
      return bounds.getCenter();
    }
  }

  return null;
}

function addStageNumberMarker(route, geometry, layer, selected) {
  const stageNumber = Number(route?.sectionIndex);
  const stageCount = Number(route?.sectionCount);

  if (
    route?.segmented !== true ||
    !Number.isFinite(stageNumber) ||
    stageNumber < 1 ||
    !Number.isFinite(stageCount) ||
    stageCount < 2
  ) {
    return;
  }

  const position = getStageMarkerPosition(
    route,
    geometry,
    layer
  );

  if (!position) {
    return;
  }

  const icon = L.divIcon({
    className: "route-stage-number-icon",
    html:
      `<div class="route-stage-number-marker${selected ? " is-selected" : ""}">` +
      `${stageNumber}` +
      `</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const marker = L.marker(position, {
    icon,
    title: route.name || `Etapa ${stageNumber}`,
    keyboard: true,
    zIndexOffset: selected ? 1800 : 1200
  }).addTo(routeLayer);

  marker.bindTooltip(
    route.name || `Etapa ${stageNumber}`,
    {
      direction: "top",
      offset: [0, -15],
      opacity: 0.96
    }
  );

  marker.on("click", event => {
    if (event?.originalEvent) {
      L.DomEvent.stopPropagation(event.originalEvent);
    }

    selectRoute(route.id, {
      fit: true
    });
  });
}
async function renderRouteLayers(routes, token) {
  routeLayer.clearLayers();
  state.routeLayers.clear();

  for (const route of routes) {
    if (token !== state.renderToken) {
      return;
    }

    try {
      const geometry = await loadRouteGeometry(route);

      if (token !== state.renderToken) {
        return;
      }

      const selected =
        state.selectedRouteId === route.id;

      const style = getRouteStyle(
        route,
        selected
      );

      if (style.opacity === 0) {
        continue;
      }

      const layer = createGeometryLayer(
        route,
        geometry,
        style
      ).addTo(routeLayer);

      layer.on("click", () => {
        selectRoute(route.id, {
          fit: false
        });
      });

      state.routeLayers.set(route.id, layer);

      addStageNumberMarker(
        route,
        geometry,
        layer,
        selected
      );
    } catch (error) {
      console.warn(`Ruta ${route.id}:`, error.message);
    }
  }
}

function formatNumber(value, maximumFractionDigits = 0) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("ca-ES", {
    maximumFractionDigits
  });
}

function getRegionLabel(route) {
  if (route.region === "international") {
    return "Internacional";
  }

  return regions[route.region]?.label ?? route.region;
}

function createRouteCard(route) {
  const article = document.createElement("article");
  article.className = "route-explorer-route-card";

  if (route.segmented) {
    article.classList.add("is-segmented");
  }

  if (state.selectedRouteId === route.id) {
    article.classList.add("is-selected");
  }

  const header = document.createElement("div");
  header.className = "route-explorer-route-card-header";

  const title = document.createElement("h2");
  title.textContent = route.name;

  const badge = document.createElement("span");
  badge.className = "route-explorer-route-badge";
  badge.textContent = route.segmented
    ? `${route.collectionName} · ${route.sectionIndex}/${route.sectionCount}`
    : getRegionLabel(route);

  header.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "route-explorer-route-meta";
  meta.textContent =
    `${modalityLabels[route.modality] ?? route.modality} · ` +
    `${difficultyStyles[route.difficulty]?.label ?? route.difficulty} · ` +
    `${formatNumber(route.distanceKm, 1)} km · ` +
    `${formatNumber(route.elevationGain)} m+`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "route-explorer-route-action";
  button.textContent =
    state.selectedRouteId === route.id
      ? "Ruta seleccionada"
      : "Veure ruta";

  button.addEventListener("click", () => {
    selectRoute(route.id, {
      fit: true
    });
  });

  article.append(header, meta, button);
  return article;
}

function renderRouteCards(routes) {
  if (routes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "route-explorer-empty";

    const hasAnyCatalog =
      state.localRoutes.length > 0 ||
      state.segmentedSections.length > 0;

    if (!hasAnyCatalog) {
      empty.innerHTML =
        "<strong>Encara no hi ha rutes importades.</strong><br>" +
        "Executa l’actualitzador d’importació per carregar els GPX i GeoJSON existents.";
    } else {
      empty.textContent =
        "No hi ha rutes que coincideixin amb aquesta vista i aquests filtres.";
    }

    elements.routeList.replaceChildren(empty);
    return;
  }

  elements.routeList.replaceChildren(
    ...routes.map(createRouteCard)
  );
}

function createDetailValue(label, value) {
  const wrapper = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  labelElement.textContent = label;
  valueElement.textContent = value;
  wrapper.append(labelElement, valueElement);

  return wrapper;
}

function renderRouteDetails(route) {
  if (!route) {
    return;
  }

  const wrapper = document.createElement("div");

  const kicker = document.createElement("p");
  kicker.className = "route-explorer-details-kicker";

  kicker.textContent = route.segmented
    ? `${route.collectionName} · Tram ${route.sectionIndex} de ${route.sectionCount}`
    : `${getRegionLabel(route)} · ${modalityLabels[route.modality] ?? route.modality}`;

  const title = document.createElement("h2");
  title.textContent = route.name;

  const description = document.createElement("p");
  description.textContent =
    route.description ||
    "Ruta incorporada al catàleg progressiu de Bicipark.";

  const grid = document.createElement("div");
  grid.className = "route-explorer-details-grid";

  grid.append(
    createDetailValue(
      "Dificultat",
      difficultyStyles[route.difficulty]?.label ?? route.difficulty
    ),
    createDetailValue(
      "Distància",
      `${formatNumber(route.distanceKm, 1)} km`
    ),
    createDetailValue(
      "Desnivell",
      `${formatNumber(route.elevationGain)} m+`
    ),
    createDetailValue(
      route.segmented ? "Col·lecció" : "Zona",
      route.segmented
        ? route.collectionName
        : route.area || "—"
    )
  );

  wrapper.append(kicker, title, description, grid);
  elements.routeDetails.replaceChildren(wrapper);
}

function findRouteById(routeId) {
  return [
    ...state.localRoutes,
    ...state.segmentedSections
  ].find(route => route.id === routeId);
}

async function selectRoute(routeId, options = {}) {
  const route = findRouteById(routeId);

  if (!route) {
    return;
  }

  state.selectedRouteId = route.id;
  renderRouteDetails(route);

  await updateVisibleContent();

  const layer = state.routeLayers.get(route.id);

  if (options.fit !== false && layer?.getBounds) {
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 14
      });
    }
  }
}

function createCollectionCard(collection) {
  const article = document.createElement("article");
  article.className = "route-explorer-collection-card";

  const title = document.createElement("strong");
  title.textContent = collection.title;

  const description = document.createElement("span");
  description.textContent = collection.description;

  const actions = document.createElement("div");
  actions.className =
    "route-explorer-collection-actions";

  if (collection.sourceId) {
    const sourceButton = document.createElement("button");
    sourceButton.type = "button";

    const isActive = state.activeSourceIds.has(
      collection.sourceId
    );

    sourceButton.textContent = isActive
      ? "Amagar del mapa"
      : "Mostrar al mapa";

    sourceButton.addEventListener("click", async () => {
      if (state.activeSourceIds.has(collection.sourceId)) {
        state.activeSourceIds.delete(collection.sourceId);
      } else {
        state.activeSourceIds.add(collection.sourceId);

        const source = state.segmentedSources.find(
          item => item.id === collection.sourceId
        );

        const bounds = getSourceBounds(source);

        if (bounds?.isValid()) {
          map.fitBounds(bounds, {
            padding: [25, 25]
          });
        }
      }

      renderCollections();
      await updateVisibleContent();
    });

    actions.appendChild(sourceButton);
  }

  if (collection.href) {
    const link = document.createElement("a");
    link.href = collection.href;
    link.textContent = "Obrir fitxa";
    actions.appendChild(link);
  }

  article.append(title, description, actions);
  return article;
}

function renderCollections() {
  const enabledCollections = state.collections.filter(
    collection => collection.enabled !== false
  );

  if (enabledCollections.length === 0) {
    elements.collectionsSection.hidden = true;
    return;
  }

  elements.collectionsSection.hidden = false;

  elements.collectionList.replaceChildren(
    ...enabledCollections.map(createCollectionCard)
  );
}

function getStatusText(
  mode,
  localRoutes,
  segmentedRoutes
) {
  const total = localRoutes.length + segmentedRoutes.length;

  if (mode === "overview") {
    const activeCompleteSources =
      state.segmentedSources.filter(
        source =>
          state.activeSourceIds.has(source.id) &&
          map.getZoom() <= Number(source.wholeRouteZoom ?? 6)
      );

    if (activeCompleteSources.length > 0) {
      return (
        `Vista general: ${total} trams visibles. ` +
        "En aquest nivell es mostra el recorregut complet de les col·leccions actives."
      );
    }

    return (
      `Vista Catalunya: ${segmentedRoutes.length} trams de col·leccions visibles. ` +
      "Fes zoom out per ampliar el recorregut o selecciona una regió."
    );
  }

  const modeLabels = {
    regional: "Vista regional",
    local: "Vista local",
    detail: "Vista de detall"
  };

  return (
    `${modeLabels[mode]} · ` +
    `${localRoutes.length} rutes locals · ` +
    `${segmentedRoutes.length} trams de col·leccions`
  );
}

async function updateVisibleContent() {
  const token = ++state.renderToken;
  const mode = getVisibilityMode(map.getZoom());
  const localRoutes = getVisibleLocalRoutes();
  const segmentedRoutes = getVisibleSegmentedRoutes();
  const visibleRoutes = [
    ...localRoutes,
    ...segmentedRoutes
  ];

  renderRegionMarkers();
  renderRouteCards(visibleRoutes);

  elements.viewStatus.textContent =
    getStatusText(
      mode,
      localRoutes,
      segmentedRoutes
    );

  await renderRouteLayers(
    visibleRoutes,
    token
  );
}

function applyRegionFilter() {
  const regionId = elements.regionFilter.value;

  state.selectedRouteId = null;

  if (regionId === "all") {
    map.fitBounds(cataloniaView.bounds, {
      padding: [15, 15]
    });

    return;
  }

  if (regionId === "international") {
    const activeSource = state.segmentedSources.find(
      source => state.activeSourceIds.has(source.id)
    );

    const bounds = getSourceBounds(activeSource);

    if (bounds?.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20]
      });
    }

    return;
  }

  const region = regions[regionId];

  if (region) {
    map.fitBounds(region.viewBounds, {
      padding: [20, 20]
    });
  }
}

elements.regionFilter.addEventListener(
  "change",
  applyRegionFilter
);

elements.modalityFilter.addEventListener(
  "change",
  updateVisibleContent
);

elements.difficultyFilter.addEventListener(
  "change",
  updateVisibleContent
);

elements.showOtherRoutes.addEventListener(
  "change",
  updateVisibleContent
);

map.on("zoomend moveend", updateVisibleContent);

ensureInternationalRegionOption();

state.localRoutes = await loadJson(
  "./data/routes.json",
  []
);

state.collections = await loadJson(
  "./data/collections.json",
  []
);

const segmentedData =
  await loadSegmentedRouteSources();

state.segmentedSources =
  segmentedData.sources;

state.segmentedSections =
  segmentedData.sections;

for (const source of state.segmentedSources) {
  if (source.visibleByDefault !== false) {
    state.activeSourceIds.add(source.id);
  }
}

renderCollections();
await updateVisibleContent();

window.addEventListener("resize", () => {
  map.invalidateSize();
});

