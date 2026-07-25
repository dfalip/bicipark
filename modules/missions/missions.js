import {
  distanceToPolylineMeters,
  flattenGeoJsonCoordinates,
  formatDistance,
  haversineMeters,
  pointAtFraction
} from "./geo.js";

import {
  clearProgress,
  createInitialProgress,
  loadProgress,
  saveProgress
} from "./storage.js";

import { bikeTagAdapter } from "./bike-tag.js";

const MISSIONS_URL = "data/missions/missions.json";
const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug") === "1";

const elements = {
  missionSelect: document.getElementById("mission-select"),
  missionTitle: document.getElementById("mission-title"),
  missionDescription: document.getElementById("mission-description"),
  missionMeta: document.getElementById("mission-meta"),
  missionStatus: document.getElementById("mission-status"),
  missionBadge: document.getElementById("mission-badge"),
  checkpointList: document.getElementById("checkpoint-list"),
  progressSummary: document.getElementById("progress-summary"),
  startButton: document.getElementById("start-mission-btn"),
  stopButton: document.getElementById("stop-mission-btn"),
  resetButton: document.getElementById("reset-mission-btn"),
  rewardPanel: document.getElementById("reward-panel"),
  rewardText: document.getElementById("reward-text"),
  liveData: document.getElementById("live-data"),
  accuracyValue: document.getElementById("accuracy-value"),
  checkpointDistanceValue: document.getElementById(
    "checkpoint-distance-value"
  ),
  routeMatchValue: document.getElementById("route-match-value"),
  tagValue: document.getElementById("tag-value"),
  demoTagCheckbox: document.getElementById("demo-tag-checkbox"),
  debugTools: document.getElementById("debug-tools"),
  debugNextButton: document.getElementById("debug-next-btn")
};

const map = L.map("missions-map", {
  zoomControl: true
}).setView([41.3874, 2.1686], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let missions = [];
let activeMission = null;
let routeCoordinates = [];
let routeLayer = null;
let checkpointMarkers = [];
let progress = null;
let geolocationWatchId = null;
let userMarker = null;
let accuracyCircle = null;
let lastPosition = null;

function setStatus(message, type = "idle") {
  elements.missionStatus.textContent = message;
  elements.missionBadge.className = `status-badge status-badge--${type}`;

  const labels = {
    idle: "Preparada",
    active: "En curs",
    warning: "Atenció",
    complete: "Completada"
  };

  elements.missionBadge.textContent = labels[type] ?? "Estat";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeValidation(mission) {
  return {
    checkpointRadiusMeters: 45,
    maxAccuracyMeters: 60,
    consecutiveReadings: 3,
    minSecondsBetweenCheckpoints: 15,
    routeToleranceMeters: 120,
    minimumRouteMatchRatio: 0.55,
    minimumValidSamples: 5,
    tagRequired: false,
    ...mission.validation
  };
}

function renderMissionMeta() {
  const validation = normalizeValidation(activeMission);
  const modes = activeMission.transportModes?.join(" · ") ?? "bicicleta";

  elements.missionMeta.innerHTML = [
    activeMission.distanceKm ? `${activeMission.distanceKm} km` : null,
    activeMission.difficulty ?? null,
    modes,
    `${activeMission.reward.points} punts`,
    validation.tagRequired ? "Tag obligatori" : "Tag opcional"
  ]
    .filter(Boolean)
    .map(value => `<span class="meta-pill">${escapeHtml(value)}</span>`)
    .join("");
}

function checkpointIcon(index, state) {
  const className = [
    "mission-checkpoint-icon",
    state === "complete" ? "complete" : "",
    state === "current" ? "current" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const content = state === "complete" ? "✓" : String(index + 1);

  return L.divIcon({
    className: "",
    html: `<div class="${className}">${content}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function deriveCheckpoints(mission) {
  return mission.checkpoints.map((checkpoint, index) => {
    const point = checkpoint.coordinates
      ? {
          lat: Number(checkpoint.coordinates[0]),
          lng: Number(checkpoint.coordinates[1])
        }
      : pointAtFraction(routeCoordinates, Number(checkpoint.routeFraction));

    return {
      ...checkpoint,
      index,
      lat: point.lat,
      lng: point.lng
    };
  });
}

function renderCheckpoints() {
  checkpointMarkers.forEach(marker => marker.remove());
  checkpointMarkers = [];

  const checkpoints = deriveCheckpoints(activeMission);
  const unlockedIds = new Set(progress.unlockedCheckpointIds);

  elements.checkpointList.innerHTML = checkpoints
    .map(checkpoint => {
      const isComplete = unlockedIds.has(checkpoint.id);
      const isCurrent =
        !isComplete && checkpoint.index === progress.nextCheckpointIndex;

      return `
        <li class="checkpoint-item ${
          isComplete
            ? "checkpoint-item--complete"
            : isCurrent
              ? "checkpoint-item--current"
              : ""
        }">
          <span class="checkpoint-name">${escapeHtml(checkpoint.name)}</span>
          <span class="checkpoint-state">
            ${isComplete ? "Completat" : isCurrent ? "Següent" : "Pendent"}
          </span>
        </li>
      `;
    })
    .join("");

  checkpoints.forEach(checkpoint => {
    const state = unlockedIds.has(checkpoint.id)
      ? "complete"
      : checkpoint.index === progress.nextCheckpointIndex
        ? "current"
        : "pending";

    const marker = L.marker([checkpoint.lat, checkpoint.lng], {
      icon: checkpointIcon(checkpoint.index, state),
      keyboard: true,
      title: checkpoint.name
    })
      .bindPopup(`<strong>${escapeHtml(checkpoint.name)}</strong>`)
      .addTo(map);

    checkpointMarkers.push(marker);
  });

  elements.progressSummary.textContent =
    `${progress.unlockedCheckpointIds.length}/${checkpoints.length}`;

  return checkpoints;
}

function updateRewardPanel() {
  const completed = progress.rewardUnlocked;

  elements.rewardPanel.hidden = !completed;

  if (completed) {
    const reward = activeMission.reward;
    elements.rewardText.textContent =
      `${reward.points} punts i la insígnia «${reward.badge}».`;
  }
}

function updateControls() {
  const isActive = progress.status === "active";

  elements.startButton.disabled = isActive || progress.rewardUnlocked;
  elements.stopButton.disabled = !isActive;
  elements.liveData.hidden = !isActive && !lastPosition;
}

function updateRouteMatchDisplay() {
  const ratio =
    progress.validGpsSamples > 0
      ? progress.routeMatchedSamples / progress.validGpsSamples
      : 0;

  elements.routeMatchValue.textContent =
    progress.validGpsSamples > 0
      ? `${Math.round(ratio * 100)}%`
      : "—";
}

function updateTagDisplay(status) {
  elements.tagValue.textContent = status.label;
}

async function loadMissionRoute(mission) {
  const response = await fetch(mission.routeFile);

  if (!response.ok) {
    throw new Error(
      `No s'ha pogut carregar la ruta (${response.status}): ${mission.routeFile}`
    );
  }

  const geojson = await response.json();
  routeCoordinates = flattenGeoJsonCoordinates(geojson);

  if (routeCoordinates.length < 2) {
    throw new Error("La ruta no conté prou coordenades.");
  }

  if (routeLayer) {
    routeLayer.remove();
  }

  routeLayer = L.geoJSON(geojson, {
    style: {
      color: "#116530",
      weight: 6,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  requestAnimationFrame(() => {
  map.invalidateSize(true);

  map.fitBounds(routeLayer.getBounds(), {
    padding: [30, 30]
  });
});
}

async function selectMission(missionId) {
  stopGeolocation();

  activeMission = missions.find(mission => mission.id === missionId);

  if (!activeMission) {
    throw new Error("No s'ha trobat la missió seleccionada.");
  }

  progress = loadProgress(activeMission.id);
  lastPosition = null;

  elements.missionTitle.textContent = activeMission.name;
  elements.missionDescription.textContent = activeMission.description;
  renderMissionMeta();

  try {
    setStatus("Carregant el recorregut…", "idle");
    await loadMissionRoute(activeMission);
    renderCheckpoints();
    updateRewardPanel();
    updateControls();
    updateRouteMatchDisplay();

    if (progress.rewardUnlocked) {
      setStatus("Aquesta missió ja està completada en aquest dispositiu.", "complete");
    } else if (progress.status === "active") {
      progress.status = "stopped";
      saveProgress(progress);
      setStatus(
        "La sessió anterior va quedar interrompuda. Prem «Comença» per continuar.",
        "warning"
      );
    } else {
      setStatus("Missió preparada. Prem «Comença» quan siguis al recorregut.", "idle");
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message, "warning");
  }
}

function populateMissionSelect() {
  elements.missionSelect.innerHTML = missions
    .map(
      mission =>
        `<option value="${escapeHtml(mission.id)}">${escapeHtml(mission.name)}</option>`
    )
    .join("");

  elements.missionSelect.disabled = missions.length === 0;
}

function createUserMarker(position) {
  const latLng = [position.lat, position.lng];

  if (!userMarker) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="user-location-icon"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarker = L.marker(latLng, {
      icon,
      zIndexOffset: 1000
    }).addTo(map);

    accuracyCircle = L.circle(latLng, {
      radius: position.accuracy,
      color: "#1f6fff",
      weight: 1,
      fillColor: "#1f6fff",
      fillOpacity: 0.08
    }).addTo(map);
  } else {
    userMarker.setLatLng(latLng);
    accuracyCircle.setLatLng(latLng);
    accuracyCircle.setRadius(position.accuracy);
  }
}

function canValidateCheckpoint(checkpoint, position, tagStatus) {
  const validation = normalizeValidation(activeMission);
  const distance = haversineMeters(position, checkpoint);
  const accurateEnough = position.accuracy <= validation.maxAccuracyMeters;
  const closeEnough = distance <= validation.checkpointRadiusMeters;
  const tagValid = !validation.tagRequired || tagStatus.present;

  const enoughTimePassed =
    !progress.lastCheckpointAt ||
    Date.now() - progress.lastCheckpointAt >=
      validation.minSecondsBetweenCheckpoints * 1_000;

  return {
    valid: accurateEnough && closeEnough && tagValid && enoughTimePassed,
    distance,
    accurateEnough,
    closeEnough,
    tagValid,
    enoughTimePassed
  };
}

function routeValidationPassed() {
  const validation = normalizeValidation(activeMission);

  if (progress.validGpsSamples < validation.minimumValidSamples) {
    return false;
  }

  return (
    progress.routeMatchedSamples / progress.validGpsSamples >=
    validation.minimumRouteMatchRatio
  );
}

function completeCheckpoint(checkpoint) {
  progress.unlockedCheckpointIds = [
    ...new Set([...progress.unlockedCheckpointIds, checkpoint.id])
  ];
  progress.nextCheckpointIndex += 1;
  progress.candidateReadings = 0;
  progress.lastCheckpointAt = Date.now();

  const allCompleted =
    progress.nextCheckpointIndex >= activeMission.checkpoints.length;

  if (allCompleted) {
    if (routeValidationPassed()) {
      progress.status = "complete";
      progress.completedAt = new Date().toISOString();
      progress.rewardUnlocked = true;
      stopGeolocation();
      setStatus("Missió completada i premi virtual desbloquejat.", "complete");
    } else {
      progress.status = "stopped";
      stopGeolocation();
      setStatus(
        "Has completat els punts, però encara no hi ha prou mostres vàlides sobre la ruta.",
        "warning"
      );
    }
  } else {
    setStatus(
      `Punt «${checkpoint.name}» completat. Continua fins al següent.`,
      "active"
    );
  }

  saveProgress(progress);
  renderCheckpoints();
  updateRewardPanel();
  updateControls();
}

async function processPosition(geolocationPosition) {
  if (!activeMission || progress.status !== "active") {
    return;
  }

  const position = {
    lat: geolocationPosition.coords.latitude,
    lng: geolocationPosition.coords.longitude,
    accuracy: geolocationPosition.coords.accuracy,
    speed: geolocationPosition.coords.speed,
    timestamp: geolocationPosition.timestamp
  };

  lastPosition = position;
  createUserMarker(position);

  elements.accuracyValue.textContent =
    `${Math.round(position.accuracy)} m`;

  const validation = normalizeValidation(activeMission);
  const routeDistance = distanceToPolylineMeters(position, routeCoordinates);

  if (position.accuracy <= validation.maxAccuracyMeters) {
    progress.validGpsSamples += 1;

    if (routeDistance <= validation.routeToleranceMeters) {
      progress.routeMatchedSamples += 1;
    }
  }

  updateRouteMatchDisplay();

  const tagStatus = await bikeTagAdapter.getStatus();
  updateTagDisplay(tagStatus);

  const checkpoints = deriveCheckpoints(activeMission);
  const checkpoint = checkpoints[progress.nextCheckpointIndex];

  if (!checkpoint) {
    return;
  }

  const result = canValidateCheckpoint(checkpoint, position, tagStatus);
  elements.checkpointDistanceValue.textContent = formatDistance(result.distance);

  if (result.valid) {
    progress.candidateReadings += 1;

    setStatus(
      `Detectant «${checkpoint.name}»: ${progress.candidateReadings}/${validation.consecutiveReadings} lectures vàlides.`,
      "active"
    );

    if (progress.candidateReadings >= validation.consecutiveReadings) {
      completeCheckpoint(checkpoint);
      return;
    }
  } else {
    progress.candidateReadings = 0;

    if (!result.accurateEnough) {
      setStatus(
        `Esperant una millor precisió GPS. Precisió actual: ${Math.round(position.accuracy)} m.`,
        "warning"
      );
    } else if (!result.tagValid) {
      setStatus("No es detecta el tag de la bicicleta.", "warning");
    } else {
      setStatus(
        `Missió en curs. Següent punt: «${checkpoint.name}» (${formatDistance(result.distance)}).`,
        "active"
      );
    }
  }

  saveProgress(progress);
}

function handleGeolocationError(error) {
  const messages = {
    1: "Permís de geolocalització denegat.",
    2: "No s'ha pogut determinar la ubicació.",
    3: "La geolocalització ha trigat massa."
  };

  setStatus(messages[error.code] ?? "Error de geolocalització.", "warning");
}

function startMission() {
  if (!navigator.geolocation) {
    setStatus(
      "Aquest navegador no ofereix geolocalització.",
      "warning"
    );
    return;
  }

  if (progress.rewardUnlocked) {
    setStatus("La missió ja està completada.", "complete");
    return;
  }

  progress.status = "active";
  progress.startedAt ??= new Date().toISOString();
  progress.stoppedAt = null;
  saveProgress(progress);

  elements.liveData.hidden = false;
  setStatus(
    "Demanant la ubicació. Mantén la pantalla activa durant el prototip.",
    "active"
  );

  geolocationWatchId = navigator.geolocation.watchPosition(
    processPosition,
    handleGeolocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 2_000,
      timeout: 15_000
    }
  );

  updateControls();
}

function stopGeolocation() {
  if (geolocationWatchId !== null) {
    navigator.geolocation.clearWatch(geolocationWatchId);
    geolocationWatchId = null;
  }
}

function stopMission() {
  stopGeolocation();

  if (progress?.status === "active") {
    progress.status = "stopped";
    progress.stoppedAt = new Date().toISOString();
    saveProgress(progress);
  }

  setStatus("Missió aturada. Pots reprendre-la més endavant.", "warning");
  updateControls();
}

function resetMission() {
  if (!activeMission) {
    return;
  }

  const confirmed = window.confirm(
    "Vols eliminar el progrés local d'aquesta missió?"
  );

  if (!confirmed) {
    return;
  }

  stopGeolocation();
  clearProgress(activeMission.id);
  progress = createInitialProgress(activeMission.id);
  lastPosition = null;

  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }

  if (accuracyCircle) {
    accuracyCircle.remove();
    accuracyCircle = null;
  }

  elements.liveData.hidden = true;
  elements.accuracyValue.textContent = "—";
  elements.checkpointDistanceValue.textContent = "—";
  elements.routeMatchValue.textContent = "—";

  renderCheckpoints();
  updateRewardPanel();
  updateControls();
  setStatus("Progrés reiniciat. La missió està preparada.", "idle");
}

function simulateNextCheckpoint() {
  if (!DEBUG_MODE || !activeMission || progress.rewardUnlocked) {
    return;
  }

  if (progress.status !== "active") {
    progress.status = "active";
    progress.startedAt ??= new Date().toISOString();
  }

  const validation = normalizeValidation(activeMission);
  progress.validGpsSamples = Math.max(
    progress.validGpsSamples,
    validation.minimumValidSamples
  );
  progress.routeMatchedSamples = progress.validGpsSamples;

  const checkpoint = deriveCheckpoints(activeMission)[
    progress.nextCheckpointIndex
  ];

  if (checkpoint) {
    completeCheckpoint(checkpoint);
  }
}

async function initialize() {
  elements.debugTools.hidden = !DEBUG_MODE;

  const response = await fetch(MISSIONS_URL);

  if (!response.ok) {
    throw new Error(
      `No s'han pogut carregar les missions (${response.status}).`
    );
  }

  missions = await response.json();

  if (!Array.isArray(missions) || missions.length === 0) {
    throw new Error("No hi ha cap missió configurada.");
  }

  populateMissionSelect();
  await selectMission(missions[0].id);
}

elements.missionSelect.addEventListener("change", event => {
  selectMission(event.target.value).catch(error => {
    console.error(error);
    setStatus(error.message, "warning");
  });
});

elements.startButton.addEventListener("click", startMission);
elements.stopButton.addEventListener("click", stopMission);
elements.resetButton.addEventListener("click", resetMission);
elements.debugNextButton.addEventListener("click", simulateNextCheckpoint);

elements.demoTagCheckbox.addEventListener("change", event => {
  bikeTagAdapter.setDemoPresent(event.target.checked);
  updateTagDisplay({
    label: event.target.checked ? "Simulat" : "No detectat"
  });
});

window.addEventListener("beforeunload", stopGeolocation);
window.addEventListener("resize", () => map.invalidateSize());

initialize().catch(error => {
  console.error(error);
  setStatus(error.message, "warning");
});
