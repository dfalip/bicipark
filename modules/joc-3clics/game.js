const CONFIG = {
  maxAttempts: 3,
  initialZoom: 2,
  initialCenter: [22, 5],

  zoomAfterAttempt: {
    1: 5,
    2: 10
  },

  earlyWinRadiusMeters: {
    1: 20000,
    2: 2500
  },

  baseScore: {
    1: 1400,
    2: 1000,
    3: 700
  },

  pointsLostPerSecond: 2.2,

  distancePenaltyScaleMeters: {
    1: 5000,
    2: 1000,
    3: 500
  }
};

const elements = {
  placeTitle: document.getElementById("place-title"),
  placeHint: document.getElementById("place-hint"),
  timer: document.getElementById("timer"),
  attempt: document.getElementById("attempt"),
  score: document.getElementById("score"),
  statusTitle: document.getElementById("status-title"),
  statusText: document.getElementById("status-text"),
  resultCard: document.getElementById("result-card"),
  resultTitle: document.getElementById("result-title"),
  resultDistance: document.getElementById("result-distance"),
  resultDetail: document.getElementById("result-detail"),
  nextButton: document.getElementById("next-btn"),
  restartButton: document.getElementById("restart-btn"),
  showAnswerCheckbox: document.getElementById("show-answer-checkbox"),
  stepChip: document.getElementById("step-chip")
};

const map = L.map("three-click-map", {
  worldCopyJump: true,
  zoomControl: true,
  minZoom: 2
}).setView(CONFIG.initialCenter, CONFIG.initialZoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let places = [];
let place = null;
let attemptNumber = 1;
let startTime = null;
let elapsedMs = 0;
let timerHandle = null;
let roundEnded = false;
let guesses = [];
let guessMarkers = [];
let targetMarker = null;
let answerLine = null;
let lastPlaceId = null;

function toRad(value) {
  return value * Math.PI / 180;
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  return `${String(minutes).padStart(2, "0")}:${seconds
    .toFixed(1)
    .padStart(4, "0")}`;
}

function randomPlace() {
  if (places.length === 1) {
    return places[0];
  }

  let candidate;

  do {
    candidate = places[Math.floor(Math.random() * places.length)];
  } while (candidate.id === lastPlaceId);

  return candidate;
}

function updateTimer() {
  if (!startTime || roundEnded) {
    return;
  }

  elapsedMs = performance.now() - startTime;
  elements.timer.textContent = formatTime(elapsedMs);
}

function startTimer() {
  stopTimer();
  startTime = performance.now();
  elapsedMs = 0;
  elements.timer.textContent = "00:00.0";

  timerHandle = window.setInterval(updateTimer, 100);
}

function stopTimer() {
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  if (startTime && !roundEnded) {
    elapsedMs = performance.now() - startTime;
  }
}

function guessIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="guess-marker"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function targetIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="target-marker">${place.icon || "📍"}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function clearRoundLayers() {
  guessMarkers.forEach(marker => marker.remove());
  guessMarkers = [];

  if (targetMarker) {
    targetMarker.remove();
    targetMarker = null;
  }

  if (answerLine) {
    answerLine.remove();
    answerLine = null;
  }
}

function revealTarget() {
  if (!targetMarker) {
    targetMarker = L.marker([place.lat, place.lng], {
      icon: targetIcon(),
      zIndexOffset: 1500
    })
      .bindPopup(`<strong>${place.name}</strong><br>${place.city}, ${place.country}`)
      .addTo(map);
  }
}

function calculateScore(distance, finishedAttempt) {
  const elapsedSeconds = elapsedMs / 1000;
  const base = CONFIG.baseScore[finishedAttempt] ?? 500;
  const timePenalty = elapsedSeconds * CONFIG.pointsLostPerSecond;
  const scale = CONFIG.distancePenaltyScaleMeters[finishedAttempt] ?? 500;
  const distancePenalty = Math.log10(1 + distance / scale) * 150;

  return Math.max(
    0,
    Math.round(base - timePenalty - distancePenalty)
  );
}

function updateAttemptUI() {
  elements.attempt.textContent =
    `${attemptNumber} / ${CONFIG.maxAttempts}`;

  const labels = {
    1: "Clic 1 · Món",
    2: "Clic 2 · Regió",
    3: "Clic 3 · Punt final"
  };

  elements.stepChip.textContent = labels[attemptNumber];
}

function finishRound(distance, finishedAttempt, earlyWin) {
  stopTimer();
  roundEnded = true;
  elements.timer.textContent = formatTime(elapsedMs);

  revealTarget();

  const finalGuess = guesses[guesses.length - 1];

  if (answerLine) {
    answerLine.remove();
  }

  answerLine = L.polyline(
    [
      [finalGuess.lat, finalGuess.lng],
      [place.lat, place.lng]
    ],
    {
      color: "#263c2e",
      weight: 3,
      opacity: .8,
      dashArray: "7 8"
    }
  ).addTo(map);

  const score = calculateScore(distance, finishedAttempt);

  elements.score.textContent = score.toLocaleString("ca-ES");
  elements.resultCard.hidden = false;
  elements.nextButton.hidden = false;

  if (earlyWin) {
    elements.resultTitle.textContent =
      `Encert al clic ${finishedAttempt}!`;

    elements.resultDetail.textContent =
      `Has aturat el temps abans del tercer intent: ${formatTime(elapsedMs)}.`;
  } else {
    elements.resultTitle.textContent = "Resultat final";

    elements.resultDetail.textContent =
      `3 clics utilitzats · Temps: ${formatTime(elapsedMs)}.`;
  }

  elements.resultDistance.textContent =
    `Distància al lloc real: ${formatDistance(distance)}.`;

  elements.statusTitle.textContent = "Ronda completada";
  elements.statusText.textContent =
    `${place.name} és a ${place.city}, ${place.country}.`;

  const bounds = L.latLngBounds(
    [finalGuess.lat, finalGuess.lng],
    [place.lat, place.lng]
  );

  map.fitBounds(bounds.pad(0.35), {
    maxZoom: 13,
    animate: true
  });
}

function handleMapClick(event) {
  if (roundEnded || !place) {
    return;
  }

  const guess = {
    lat: event.latlng.lat,
    lng: event.latlng.lng,
    attempt: attemptNumber,
    timestamp: performance.now()
  };

  guesses.push(guess);

  const marker = L.marker(
    [guess.lat, guess.lng],
    {
      icon: guessIcon(),
      zIndexOffset: 1000
    }
  )
    .bindPopup(`Intent ${attemptNumber}`)
    .addTo(map);

  guessMarkers.push(marker);

  const distance = distanceMeters(
    guess,
    { lat: place.lat, lng: place.lng }
  );

  const earlyThreshold =
    CONFIG.earlyWinRadiusMeters[attemptNumber] ?? 0;

  if (
    attemptNumber < CONFIG.maxAttempts &&
    distance <= earlyThreshold
  ) {
    finishRound(distance, attemptNumber, true);
    return;
  }

  if (attemptNumber === CONFIG.maxAttempts) {
    finishRound(distance, attemptNumber, false);
    return;
  }

  const currentAttempt = attemptNumber;
  attemptNumber += 1;
  updateAttemptUI();

  elements.statusTitle.textContent =
    `Intent ${currentAttempt} registrat`;

  elements.statusText.textContent =
    "Continua afinant la zona. El temps segueix corrent.";

  const nextZoom =
    CONFIG.zoomAfterAttempt[currentAttempt] ??
    Math.min(map.getZoom() + 4, 12);

  map.flyTo(
    [guess.lat, guess.lng],
    Math.max(nextZoom, map.getZoom() + 1),
    {
      animate: true,
      duration: .85
    }
  );
}

function resetRoundSamePlace() {
  stopTimer();

  attemptNumber = 1;
  roundEnded = false;
  guesses = [];
  clearRoundLayers();

  elements.score.textContent = "—";
  elements.resultCard.hidden = true;
  elements.nextButton.hidden = true;

  elements.statusTitle.textContent = "Busca el lloc";
  elements.statusText.textContent =
    "Fes el primer clic al mapa. El temps ja està corrent.";

  updateAttemptUI();

  map.setView(CONFIG.initialCenter, CONFIG.initialZoom, {
    animate: false
  });

  if (elements.showAnswerCheckbox.checked) {
    revealTarget();
  }

  startTimer();
}

function newRound() {
  lastPlaceId = place?.id ?? lastPlaceId;
  place = randomPlace();

  elements.placeTitle.textContent = `On és ${place.name}?`;
  elements.placeHint.textContent =
    `${place.hint} · ${place.country}`;

  resetRoundSamePlace();
}

elements.restartButton.addEventListener(
  "click",
  resetRoundSamePlace
);

elements.nextButton.addEventListener(
  "click",
  newRound
);

elements.showAnswerCheckbox.addEventListener(
  "change",
  () => {
    if (elements.showAnswerCheckbox.checked) {
      revealTarget();
    } else if (!roundEnded && targetMarker) {
      targetMarker.remove();
      targetMarker = null;
    }
  }
);

map.on("click", handleMapClick);

window.addEventListener(
  "resize",
  () => map.invalidateSize()
);

async function initialize() {
  const response = await fetch(
    "data/joc-3clics/places.json"
  );

  if (!response.ok) {
    throw new Error(
      `No s'han pogut carregar els llocs (${response.status}).`
    );
  }

  places = await response.json();

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("No hi ha llocs configurats.");
  }

  newRound();

  requestAnimationFrame(() => {
    map.invalidateSize(true);
  });
}

initialize().catch(error => {
  console.error(error);

  elements.placeTitle.textContent = "Error";
  elements.placeHint.textContent = error.message;
  elements.statusTitle.textContent = "No s'ha pogut iniciar el joc";
  elements.statusText.textContent =
    "Revisa la consola del navegador i la configuració del mòdul.";
});
