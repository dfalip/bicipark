import {
  tourMetadata,
  tourStages
} from "./data/stages.js";

const elements = {
  typeFilter: document.getElementById("typeFilter"),
  availableOnly: document.getElementById("availableOnly"),
  catalogStatus: document.getElementById("catalogStatus"),
  stageList: document.getElementById("stageList"),
  stageDetails: document.getElementById("stageDetails")
};

const map = L.map("tourMap").setView([46.4, 2.3], 6);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);

const state = {
  geometryStatus: null,
  selectedStage: null,
  routeLayer: null,
  startMarker: null,
  finishMarker: null
};

async function loadGeometryStatus() {
  try {
    const response = await fetch(
      "./data/geometry-status.json",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `No s'ha pogut carregar l'estat (${response.status}).`
      );
    }

    state.geometryStatus = await response.json();
  } catch (error) {
    console.error(error);

    state.geometryStatus = {
      stages: {}
    };
  }
}

function getGeometry(stageNumber) {
  return (
    state.geometryStatus?.stages?.[String(stageNumber)] ?? {
      available: false,
      accepted: false,
      status: "unknown",
      message: "No hi ha informació de geometria."
    }
  );
}

function clearRoute() {
  for (const propertyName of [
    "routeLayer",
    "startMarker",
    "finishMarker"
  ]) {
    const layer = state[propertyName];

    if (layer) {
      map.removeLayer(layer);
      state[propertyName] = null;
    }
  }
}

function parseGpx(gpxText) {
  const documentNode = new DOMParser().parseFromString(
    gpxText,
    "application/xml"
  );

  const parserError = documentNode.querySelector("parsererror");

  if (parserError) {
    throw new Error("El fitxer GPX no és XML vàlid.");
  }

  const points = [
    ...documentNode.querySelectorAll("trkpt, rtept")
  ].map(node => [
    Number(node.getAttribute("lat")),
    Number(node.getAttribute("lon"))
  ]).filter(
    ([latitude, longitude]) =>
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
  );

  if (points.length < 2) {
    throw new Error("El GPX no conté prou punts.");
  }

  return points;
}

async function drawStageGeometry(stage, geometry) {
  clearRoute();

  if (!geometry.accepted || !geometry.file) {
    map.setView([46.4, 2.3], 6);
    return;
  }

  try {
    const response = await fetch(
      `./${geometry.file}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `No s'ha pogut carregar el GPX (${response.status}).`
      );
    }

    const points = parseGpx(await response.text());

    state.routeLayer = L.polyline(points, {
      color: "#d6b900",
      weight: 5,
      opacity: 0.9
    }).addTo(map);

    const startPoint = points[0];
    const finishPoint = points[points.length - 1];

    state.startMarker = L.marker(startPoint)
      .addTo(map)
      .bindPopup(`<strong>Sortida</strong><br>${stage.start}`);

    state.finishMarker = L.marker(finishPoint)
      .addTo(map)
      .bindPopup(`<strong>Arribada</strong><br>${stage.finish}`);

    map.fitBounds(state.routeLayer.getBounds(), {
      padding: [35, 35],
      maxZoom: 14
    });
  } catch (error) {
    console.error(error);
    map.setView([46.4, 2.3], 6);

    const warning = document.createElement("p");
    warning.className =
      "tour-route-warning tour-route-error";

    warning.textContent =
      `No s'ha pogut dibuixar el GPX: ${error.message}`;

    elements.stageDetails.appendChild(warning);
  }
}

function createGeometryBadge(geometry) {
  const badge = document.createElement("span");
  badge.className = "tour-geometry-state";

  if (geometry.accepted) {
    badge.classList.add("is-available");
    badge.textContent = "Ruta disponible";
    return badge;
  }

  // BICIPARK_TOUR_MISSING_STAGES_V1
  if (geometry.officialMap) {
    badge.classList.add("is-map");
    badge.textContent = "Mapa oficial";
    return badge;
  }

  if (geometry.status === "rejected-distance-mismatch") {
    badge.classList.add("is-rejected");
    badge.textContent = "GPX rebutjat";
    return badge;
  }

  badge.textContent = "Només dades";
  return badge;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatDistance(value) {
  return value.toLocaleString("ca-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function createStageButton(stage) {
  const geometry = getGeometry(stage.stage);
  const button = document.createElement("button");

  button.type = "button";
  button.className = "tour-stage-button";

  if (state.selectedStage?.stage === stage.stage) {
    button.classList.add("is-selected");
  }

  const number = document.createElement("span");
  number.className = "tour-stage-number";
  number.textContent = stage.stage;

  const main = document.createElement("span");
  main.className = "tour-stage-main";

  const title = document.createElement("strong");
  title.textContent = `${stage.start} → ${stage.finish}`;

  const secondary = document.createElement("small");
  secondary.textContent =
    `${formatDistance(stage.distanceKm)} km · ${stage.typeLabel}`;

  main.append(title, secondary);

  button.append(
    number,
    main,
    createGeometryBadge(geometry)
  );

  button.addEventListener("click", async () => {
    state.selectedStage = stage;
    renderStageList();
    renderStageDetails(stage, geometry);
    await drawStageGeometry(stage, geometry);
  });

  return button;
}

function getFilteredStages() {
  const selectedType = elements.typeFilter.value;
  const onlyAvailable = elements.availableOnly.checked;

  return tourStages.filter(stage => {
    const geometry = getGeometry(stage.stage);

    const matchesType =
      selectedType === "all" ||
      stage.type === selectedType;

    const matchesAvailability =
      !onlyAvailable || geometry.accepted;

    return matchesType && matchesAvailability;
  });
}

function renderStageList() {
  const visibleStages = getFilteredStages();

  elements.stageList.replaceChildren(
    ...visibleStages.map(createStageButton)
  );

  const availableCount = tourStages.filter(
    stage => getGeometry(stage.stage).accepted
  ).length;

  elements.catalogStatus.textContent =
    `${visibleStages.length} etapes mostrades · ` +
    `${availableCount} geometries disponibles i acceptades`;
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

function renderStageDetails(stage, geometry) {
  const wrapper = document.createElement("div");

  const kicker = document.createElement("p");
  kicker.className = "tour-details-kicker";
  kicker.textContent = `Etapa ${stage.stage} · ${formatDate(stage.date)}`;

  const title = document.createElement("h2");
  title.textContent = `${stage.start} → ${stage.finish}`;

  const note = document.createElement("p");
  note.textContent =
    stage.routeNote ||
    "Consulta les dades oficials i la geometria disponible.";

  const grid = document.createElement("div");
  grid.className = "tour-detail-grid";

  grid.append(
    createDetailValue(
      "Distància oficial",
      `${formatDistance(stage.distanceKm)} km`
    ),
    createDetailValue("Tipus", stage.typeLabel),
    createDetailValue(
      "Geometria",
      geometry.accepted
        ? "Interactiva"
        : geometry.officialMap
          ? "Mapa oficial"
          : "No validada"
    ),
    createDetailValue(
      "GPX calculat",
      geometry.computedDistanceKm == null
        ? "—"
        : `${formatDistance(geometry.computedDistanceKm)} km`
    )
  );

  const links = document.createElement("div");
  links.className = "tour-detail-links";

  const officialLink = document.createElement("a");
  officialLink.href = stage.officialUrl;
  officialLink.target = "_blank";
  officialLink.rel = "noopener noreferrer";
  officialLink.textContent = "Fitxa oficial";

  const raceCenterLink = document.createElement("a");
  raceCenterLink.href = stage.raceCenterUrl;
  raceCenterLink.target = "_blank";
  raceCenterLink.rel = "noopener noreferrer";
  raceCenterLink.className = "secondary";
  raceCenterLink.textContent = "Race Center oficial";

  links.append(officialLink, raceCenterLink);

  wrapper.append(kicker, title, note, grid, links);
  elements.stageDetails.replaceChildren(wrapper);

  if (!geometry.accepted) {
    const warning = document.createElement("p");

    warning.className = "tour-route-warning";

    if (geometry.status === "rejected-distance-mismatch") {
      warning.classList.add("tour-route-error");
    }

    warning.textContent =
      geometry.message ||
      "Aquesta etapa encara no té una geometria validada.";

    elements.stageDetails.appendChild(warning);
  } else {
    const warning = document.createElement("p");
    warning.className = "tour-route-warning";
    warning.textContent =
      "Geometria de referència externa acceptada per coincidència de distància. " +
      "No equival a una certificació oficial del traçat.";
    elements.stageDetails.appendChild(warning);
  }

  // BICIPARK_TOUR_MISSING_STAGES_V1
  if (geometry.officialMap) {
    const figure = document.createElement("figure");
    figure.className = "tour-official-map";

    const mapLink = document.createElement("a");
    mapLink.href = `./${geometry.officialMap}`;
    mapLink.target = "_blank";
    mapLink.rel = "noopener noreferrer";
    mapLink.setAttribute(
      "aria-label",
      `Obrir el mapa oficial de l'etapa ${stage.stage}`
    );

    const mapImage = document.createElement("img");
    mapImage.src = `./${geometry.officialMap}`;
    mapImage.alt =
      `Mapa oficial de l'etapa ${stage.stage}: ` +
      `${stage.start} a ${stage.finish}`;

    const caption = document.createElement("figcaption");
    caption.textContent =
      geometry.officialMapCaption ||
      "Mapa final publicat per l'organització del Tour de France.";

    mapLink.appendChild(mapImage);
    figure.append(mapLink, caption);
    elements.stageDetails.appendChild(figure);
  }
}

elements.typeFilter.addEventListener("change", renderStageList);
elements.availableOnly.addEventListener("change", renderStageList);

await loadGeometryStatus();
renderStageList();

if (tourStages.length > 0) {
  const firstStage = tourStages[0];
  const geometry = getGeometry(firstStage.stage);

  state.selectedStage = firstStage;
  renderStageList();
  renderStageDetails(firstStage, geometry);
  await drawStageGeometry(firstStage, geometry);
}

