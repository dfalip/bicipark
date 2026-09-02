import {
  distanceToPolylineMeters,
  flattenGeoJsonCoordinates,
  formatDistance,
  haversineMeters,
  pointAtFraction
} from "../missions/geo.js";

import {
  clearProgress,
  initialProgress,
  loadProgress,
  saveProgress
} from "./storage.js";

import { bikeTagAdapter } from "../missions/bike-tag.js";

const params = new URLSearchParams(location.search);
const DEBUG = params.get("debug") === "1";
const ADMIN = DEBUG || params.get("admin") === "1";
const CONFIG_URL = "data/missions/missions-surprise.json";

const el = {
  title: document.getElementById("mission-title"),
  description: document.getElementById("mission-description"),
  select: document.getElementById("mission-select"),
  meta: document.getElementById("mission-meta"),
  surpriseStatus: document.getElementById("surprise-status"),
  statusBadge: document.getElementById("status-badge"),
  statusText: document.getElementById("status-text"),
  liveData: document.getElementById("live-data"),
  accuracy: document.getElementById("accuracy"),
  secretDistance: document.getElementById("secret-distance"),
  routeMatch: document.getElementById("route-match"),
  tagStatus: document.getElementById("tag-status"),
  adminBanner: document.getElementById("admin-banner"),
  adminPanel: document.getElementById("admin-panel"),
  checkpointList: document.getElementById("checkpoint-list"),
  progressSummary: document.getElementById("progress-summary"),
  rewardPanel: document.getElementById("reward-panel"),
  rewardText: document.getElementById("reward-text"),
  start: document.getElementById("start-btn"),
  stop: document.getElementById("stop-btn"),
  reset: document.getElementById("reset-btn"),
  demoTag: document.getElementById("demo-tag"),
  debugTools: document.getElementById("debug-tools"),
  debugNext: document.getElementById("debug-next-btn")
};

const map = L.map("surprise-map").setView([41.3874, 2.1686], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let missions = [];
let mission = null;
let progress = null;
let routeCoordinates = [];
let routeLayer = null;
let markers = [];
let watchId = null;
let userMarker = null;
let accuracyCircle = null;

function status(message, type = "idle") {
  const labels = {
    idle: "Preparada",
    active: "En curs",
    warning: "Atenció",
    complete: "Completada"
  };

  el.statusText.textContent = message;
  el.statusBadge.textContent = labels[type];
  el.statusBadge.className = `badge badge-${type}`;
}

function validationConfig() {
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

function triggerConfig() {
  return {
    mode: "randomCheckpoint",
    eligibleCheckpointIds: mission.checkpoints.slice(1, -1).map(item => item.id),
    ...mission.rewardTrigger
  };
}

function randomIndex(maximum) {
  if (maximum <= 1) return 0;

  if (crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % maximum;
  }

  return Math.floor(Math.random() * maximum);
}

function ensureSecretCheckpoint() {
  const eligible = triggerConfig().eligibleCheckpointIds.filter(id =>
    mission.checkpoints.some(checkpoint => checkpoint.id === id)
  );

  if (!eligible.length) {
    throw new Error("No hi ha controls elegibles per al premi.");
  }

  if (!eligible.includes(progress.secretRewardCheckpointId)) {
    progress.secretRewardCheckpointId = eligible[randomIndex(eligible.length)];
    progress.rewardCheckpointReached = false;
    saveProgress(progress);
  }
}

function checkpoints() {
  return mission.checkpoints.map((checkpoint, index) => {
    const position = checkpoint.coordinates
      ? { lat: Number(checkpoint.coordinates[0]), lng: Number(checkpoint.coordinates[1]) }
      : pointAtFraction(routeCoordinates, Number(checkpoint.routeFraction));

    return { ...checkpoint, index, ...position };
  });
}

function renderMeta() {
  const rewardLabel =
    ADMIN || progress.rewardUnlocked
      ? `${mission.reward.points} punts`
      : "Premi sorpresa";

  el.meta.innerHTML = [
    mission.distanceKm ? `${mission.distanceKm} km` : null,
    mission.difficulty,
    mission.transportModes?.join(" · "),
    rewardLabel,
    validationConfig().tagRequired ? "Tag obligatori" : "Tag opcional"
  ]
    .filter(Boolean)
    .map(value => `<span class="meta-pill">${value}</span>`)
    .join("");
}

function markerIcon(checkpoint, state) {
  const isReward = checkpoint.id === progress.secretRewardCheckpointId;
  const classes = [
    "checkpoint-icon",
    state === "current" ? "current" : "",
    state === "complete" ? "complete" : "",
    ADMIN && isReward ? "reward" : ""
  ].filter(Boolean).join(" ");

  const text =
    state === "complete"
      ? "✓"
      : ADMIN && isReward
        ? "★"
        : checkpoint.index + 1;

  return L.divIcon({
    className: "",
    html: `<div class="${classes}">${text}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function renderCheckpoints() {
  markers.forEach(marker => marker.remove());
  markers = [];

  const items = checkpoints();
  const unlocked = new Set(progress.unlockedCheckpointIds);

  el.adminPanel.hidden = !ADMIN;

  if (!ADMIN) {
    el.checkpointList.innerHTML = "";
    return items;
  }

  el.checkpointList.innerHTML = items.map(checkpoint => {
    const complete = unlocked.has(checkpoint.id);
    const current = !complete && checkpoint.index === progress.nextCheckpointIndex;
    const reward = checkpoint.id === progress.secretRewardCheckpointId;

    return `
      <li class="checkpoint-item ${current ? "current" : ""}">
        <span class="checkpoint-name">
          ${checkpoint.name}${reward ? " ★ Premi" : ""}
        </span>
        <span class="checkpoint-state">
          ${complete ? "Completat" : current ? "Següent" : "Pendent"}
        </span>
      </li>
    `;
  }).join("");

  items.forEach(checkpoint => {
    const state = unlocked.has(checkpoint.id)
      ? "complete"
      : checkpoint.index === progress.nextCheckpointIndex
        ? "current"
        : "pending";

    const reward = checkpoint.id === progress.secretRewardCheckpointId;
    const popup = reward
      ? `<strong>${checkpoint.name}</strong><br>★ Punt secret del premi`
      : `<strong>${checkpoint.name}</strong>`;

    markers.push(
      L.marker([checkpoint.lat, checkpoint.lng], {
        icon: markerIcon(checkpoint, state)
      }).bindPopup(popup).addTo(map)
    );
  });

  el.progressSummary.textContent =
    `${progress.unlockedCheckpointIds.length}/${items.length}`;

  return items;
}

function renderReward() {
  el.rewardPanel.hidden = !progress.rewardUnlocked;

  if (progress.rewardUnlocked) {
    el.rewardText.textContent =
      `${mission.reward.points} punts i la insígnia «${mission.reward.badge}».`;

    el.surpriseStatus.textContent =
      "Ja has trobat la recompensa amagada d'aquesta missió.";
  } else {
    el.surpriseStatus.textContent =
      "Hi ha una recompensa amagada en algun punt del recorregut.";
  }

  renderMeta();
}

function updateControls() {
  const active = progress.status === "active";
  el.start.disabled = active || progress.status === "complete";
  el.stop.disabled = !active;
}

function updateRouteMatch() {
  const ratio = progress.validGpsSamples
    ? progress.routeMatchedSamples / progress.validGpsSamples
    : 0;

  el.routeMatch.textContent = progress.validGpsSamples
    ? `${Math.round(ratio * 100)}%`
    : "—";
}

async function loadRoute() {
  const response = await fetch(mission.routeFile);

  if (!response.ok) {
    throw new Error(`No s'ha pogut carregar ${mission.routeFile}.`);
  }

  const geojson = await response.json();
  routeCoordinates = flattenGeoJsonCoordinates(geojson);

  if (routeCoordinates.length < 2) {
    throw new Error("La ruta no té prou coordenades.");
  }

  routeLayer?.remove();

  routeLayer = L.geoJSON(geojson, {
    style: {
      color: "#116530",
      weight: 6,
      opacity: .9,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  requestAnimationFrame(() => {
    map.invalidateSize(true);
    map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
  });
}

async function selectMission(id) {
  stopGeolocation();
  mission = missions.find(item => item.id === id);

  if (!mission) throw new Error("No s'ha trobat la missió.");

  progress = loadProgress(mission.id);
  el.title.textContent = mission.name;
  el.description.textContent = mission.description;

  await loadRoute();
  ensureSecretCheckpoint();
  renderMeta();
  renderCheckpoints();
  renderReward();
  updateControls();
  updateRouteMatch();

  el.adminBanner.hidden = !ADMIN;
  el.secretDistance.textContent = ADMIN ? "—" : "Ocult";

  if (progress.status === "active") {
    progress.status = "stopped";
    saveProgress(progress);
  }

  status(
    progress.status === "complete"
      ? "Aquesta missió ja està completada en aquest dispositiu."
      : "Missió preparada. Prem «Comença» quan siguis al recorregut.",
    progress.status === "complete" ? "complete" : "idle"
  );
}

function createUserMarker(position) {
  const latLng = [position.lat, position.lng];

  if (!userMarker) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="user-location"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);

    accuracyCircle = L.circle(latLng, {
      radius: position.accuracy,
      color: "#1f6fff",
      weight: 1,
      fillColor: "#1f6fff",
      fillOpacity: .08
    }).addTo(map);
  } else {
    userMarker.setLatLng(latLng);
    accuracyCircle.setLatLng(latLng);
    accuracyCircle.setRadius(position.accuracy);
  }
}

function routeValidationPassed() {
  const config = validationConfig();

  return (
    progress.validGpsSamples >= config.minimumValidSamples &&
    progress.routeMatchedSamples / progress.validGpsSamples >=
      config.minimumRouteMatchRatio
  );
}

function unlockReward() {
  if (progress.rewardUnlocked) return;

  progress.rewardUnlocked = true;
  progress.rewardUnlockedAt = new Date().toISOString();
  saveProgress(progress);
  renderReward();

  status(
    "Sorpresa! Has desbloquejat el premi. Pots continuar fins al final.",
    "active"
  );
}

function maybeUnlockReward() {
  if (
    progress.rewardCheckpointReached &&
    !progress.rewardUnlocked &&
    routeValidationPassed()
  ) {
    unlockReward();
  }
}

function completeCheckpoint(checkpoint) {
  progress.unlockedCheckpointIds = [
    ...new Set([...progress.unlockedCheckpointIds, checkpoint.id])
  ];

  progress.nextCheckpointIndex += 1;
  progress.candidateReadings = 0;
  progress.lastCheckpointAt = Date.now();

  if (checkpoint.id === progress.secretRewardCheckpointId) {
    progress.rewardCheckpointReached = true;
  }

  maybeUnlockReward();

  const finished = progress.nextCheckpointIndex >= mission.checkpoints.length;

  if (finished) {
    progress.status = "complete";
    progress.completedAt = new Date().toISOString();
    stopGeolocation();

    status(
      progress.rewardUnlocked
        ? "Ruta completada i premi sorpresa aconseguit."
        : "Ruta completada, però no hi ha prou mostres per validar el premi.",
      progress.rewardUnlocked ? "complete" : "warning"
    );
  } else if (!progress.rewardUnlocked) {
    status(
      ADMIN
        ? `Control «${checkpoint.name}» completat.`
        : "Recorregut validat. Continua: la sorpresa pot aparèixer en qualsevol moment.",
      "active"
    );
  }

  saveProgress(progress);
  renderCheckpoints();
  renderReward();
  updateControls();
}

async function processPosition(rawPosition) {
  if (!mission || progress.status !== "active") return;

  const position = {
    lat: rawPosition.coords.latitude,
    lng: rawPosition.coords.longitude,
    accuracy: rawPosition.coords.accuracy,
    speed: rawPosition.coords.speed,
    timestamp: rawPosition.timestamp
  };

  createUserMarker(position);
  el.accuracy.textContent = `${Math.round(position.accuracy)} m`;

  const config = validationConfig();
  const routeDistance = distanceToPolylineMeters(position, routeCoordinates);

  if (position.accuracy <= config.maxAccuracyMeters) {
    progress.validGpsSamples += 1;

    if (routeDistance <= config.routeToleranceMeters) {
      progress.routeMatchedSamples += 1;
    }
  }

  updateRouteMatch();
  maybeUnlockReward();

  const tag = await bikeTagAdapter.getStatus();
  el.tagStatus.textContent = tag.label;

  const next = checkpoints()[progress.nextCheckpointIndex];
  if (!next) return;

  const distance = haversineMeters(position, next);
  const enoughTime =
    !progress.lastCheckpointAt ||
    Date.now() - progress.lastCheckpointAt >=
      config.minSecondsBetweenCheckpoints * 1000;

  const valid =
    position.accuracy <= config.maxAccuracyMeters &&
    distance <= config.checkpointRadiusMeters &&
    (!config.tagRequired || tag.present) &&
    enoughTime;

  el.secretDistance.textContent = ADMIN ? formatDistance(distance) : "Ocult";

  if (valid) {
    progress.candidateReadings += 1;

    status(
      ADMIN
        ? `Detectant «${next.name}»: ${progress.candidateReadings}/${config.consecutiveReadings}.`
        : "Validant el recorregut…",
      "active"
    );

    if (progress.candidateReadings >= config.consecutiveReadings) {
      completeCheckpoint(next);
      return;
    }
  } else {
    progress.candidateReadings = 0;

    status(
      position.accuracy > config.maxAccuracyMeters
        ? `Esperant millor precisió GPS: ${Math.round(position.accuracy)} m.`
        : ADMIN
          ? `Següent control: «${next.name}» (${formatDistance(distance)}).`
          : "Segueix la ruta: la recompensa continua amagada.",
      position.accuracy > config.maxAccuracyMeters ? "warning" : "active"
    );
  }

  saveProgress(progress);
}

function geolocationError(error) {
  const messages = {
    1: "Permís de geolocalització denegat.",
    2: "No s'ha pogut determinar la ubicació.",
    3: "La geolocalització ha trigat massa."
  };

  status(messages[error.code] ?? "Error de geolocalització.", "warning");
}

function startMission() {
  if (!navigator.geolocation) {
    status("Aquest navegador no ofereix geolocalització.", "warning");
    return;
  }

  progress.status = "active";
  progress.startedAt ??= new Date().toISOString();
  saveProgress(progress);

  el.liveData.hidden = false;
  status("Demanant la ubicació…", "active");

  watchId = navigator.geolocation.watchPosition(
    processPosition,
    geolocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000
    }
  );

  updateControls();
}

function stopGeolocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function stopMission() {
  stopGeolocation();

  if (progress.status === "active") {
    progress.status = "stopped";
    progress.stoppedAt = new Date().toISOString();
    saveProgress(progress);
  }

  status("Missió aturada. La pots reprendre més endavant.", "warning");
  updateControls();
}

function resetMission() {
  if (!confirm("Vols reiniciar el progrés i generar un nou punt sorpresa?")) {
    return;
  }

  stopGeolocation();
  clearProgress(mission.id);
  progress = initialProgress(mission.id);
  ensureSecretCheckpoint();

  userMarker?.remove();
  accuracyCircle?.remove();
  userMarker = null;
  accuracyCircle = null;

  el.liveData.hidden = true;
  el.accuracy.textContent = "—";
  el.secretDistance.textContent = ADMIN ? "—" : "Ocult";
  el.routeMatch.textContent = "—";

  renderMeta();
  renderCheckpoints();
  renderReward();
  updateControls();
  status("Progrés reiniciat. S'ha generat un nou punt sorpresa.", "idle");
}

function simulateNext() {
  if (!DEBUG || progress.status === "complete") return;

  progress.status = "active";
  progress.startedAt ??= new Date().toISOString();

  const config = validationConfig();
  progress.validGpsSamples = Math.max(
    progress.validGpsSamples,
    config.minimumValidSamples
  );
  progress.routeMatchedSamples = progress.validGpsSamples;

  const next = checkpoints()[progress.nextCheckpointIndex];
  if (next) completeCheckpoint(next);
}

async function initialize() {
  el.debugTools.hidden = !DEBUG;
  el.adminBanner.hidden = !ADMIN;

  const response = await fetch(CONFIG_URL);
  if (!response.ok) throw new Error("No s'han pogut carregar les missions.");

  missions = await response.json();
  if (!Array.isArray(missions) || !missions.length) {
    throw new Error("No hi ha missions configurades.");
  }

  el.select.innerHTML = missions
    .map(item => `<option value="${item.id}">${item.name}</option>`)
    .join("");

  el.select.disabled = false;
  await selectMission(missions[0].id);
}

el.select.addEventListener("change", event => {
  selectMission(event.target.value).catch(error => {
    console.error(error);
    status(error.message, "warning");
  });
});

el.start.addEventListener("click", startMission);
el.stop.addEventListener("click", stopMission);
el.reset.addEventListener("click", resetMission);
el.debugNext.addEventListener("click", simulateNext);

el.demoTag.addEventListener("change", event => {
  bikeTagAdapter.setDemoPresent(event.target.checked);
  el.tagStatus.textContent = event.target.checked ? "Simulat" : "No detectat";
});

addEventListener("beforeunload", stopGeolocation);
addEventListener("resize", () => map.invalidateSize());

initialize().catch(error => {
  console.error(error);
  status(error.message, "warning");
});
