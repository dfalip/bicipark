import { gameLocations } from "./data/locations.js";

const SETTINGS = Object.freeze({
  maximumRounds: 5,
  maximumPointsPerRound: 5000,
  zeroPointsDistanceKm: 25,
  scoreDecayKm: 2.5,
  initialCenter: [41.3874, 2.1686],
  initialZoom: 12
});

const elements = {
  roundScreen: document.getElementById("roundScreen"),
  finalScreen: document.getElementById("finalScreen"),
  roundNumber: document.getElementById("roundNumber"),
  totalScore: document.getElementById("totalScore"),
  gameImage: document.getElementById("gameImage"),
  photoCredit: document.getElementById("photoCredit"),
  photoAuthor: document.getElementById("photoAuthor"),
  photoSourceLink: document.getElementById("photoSourceLink"),
  photoLicenseLink: document.getElementById("photoLicenseLink"),
  photoError: document.getElementById("photoError"),
  difficulty: document.getElementById("difficulty"),
  confirmButton: document.getElementById("confirmButton"),
  centerButton: document.getElementById("centerButton"),
  selectionStatus: document.getElementById("selectionStatus"),
  nextButton: document.getElementById("nextButton"),
  restartButton: document.getElementById("restartButton"),
  resultBox: document.getElementById("resultBox"),
  resultPoints: document.getElementById("resultPoints"),
  resultDistance: document.getElementById("resultDistance"),
  resultDescription: document.getElementById("resultDescription"),
  finalScore: document.getElementById("finalScore")
};

const map = L.map("gameMap", {
  zoomControl: true
}).setView(SETTINGS.initialCenter, SETTINGS.initialZoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;

const state = {
  questions: [],
  currentRoundIndex: 0,
  totalScore: 0,
  selectedPosition: null,
  userMarker: null,
  realMarker: null,
  resultLine: null,
  roundLocked: false,
  imageFailed: false
};

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [
      result[randomIndex],
      result[index]
    ];
  }

  return result;
}

function clearMapResult() {
  for (const layerName of ["userMarker", "realMarker", "resultLine"]) {
    const layer = state[layerName];

    if (layer) {
      map.removeLayer(layer);
      state[layerName] = null;
    }
  }
}

function calculatePoints(distanceMeters) {
  const distanceKm = distanceMeters / 1000;

  if (distanceKm >= SETTINGS.zeroPointsDistanceKm) {
    return 0;
  }

  const score = Math.round(
    SETTINGS.maximumPointsPerRound *
      Math.exp(-distanceKm / SETTINGS.scoreDecayKm)
  );

  return Math.max(
    0,
    Math.min(SETTINGS.maximumPointsPerRound, score)
  );
}

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} metres`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function updateScore() {
  elements.totalScore.textContent =
    state.totalScore.toLocaleString("ca-ES");
}

function loadRound() {
  clearMapResult();

  state.selectedPosition = null;
  state.roundLocked = false;
  state.imageFailed = false;

  const question = state.questions[state.currentRoundIndex];

  elements.roundNumber.textContent =
    `${state.currentRoundIndex + 1} / ${state.questions.length}`;

  // A round must be based on a source photograph, never an invented demo SVG.
  elements.gameImage.hidden = false;
  elements.photoError.hidden = true;
  elements.photoCredit.hidden = !question.photoSource;
  elements.photoAuthor.textContent = question.photoAuthor || "Autor no indicat";
  elements.photoSourceLink.href = question.photoSource || "#";
  elements.photoLicenseLink.href = question.photoLicenseUrl || "#";
  elements.photoLicenseLink.textContent = question.photoLicense || "Llicència";
  elements.gameImage.alt = "Fotografia real de la ronda " + (state.currentRoundIndex + 1)
    + ". Identifica el monument al mapa.";
  elements.gameImage.onerror = () => {
    if(state.roundLocked || state.imageFailed)return;
    state.imageFailed = true;
    elements.gameImage.hidden = true;
    elements.photoError.hidden = false;
    elements.confirmButton.disabled = true;
    elements.centerButton.disabled = true;
    elements.nextButton.hidden = false;
    elements.nextButton.textContent = "Ometre fotografia sense penalització →";
    elements.selectionStatus.textContent = "La imatge no està disponible; aquesta pregunta no puntuarà.";
  };
  elements.gameImage.src = question.image;

  elements.difficulty.textContent = question.difficulty;
  elements.confirmButton.disabled = true;
  elements.centerButton.disabled = false;
  elements.selectionStatus.textContent = "Mou el mapa i marca el centre, o toca un punt directament.";
  elements.confirmButton.hidden = false;
  elements.nextButton.hidden = true;
  elements.resultBox.classList.remove("is-visible");

  map.setView(SETTINGS.initialCenter, SETTINGS.initialZoom);

  window.setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

function startGame() {
  if (gameLocations.length === 0) {
    throw new Error(
      "No hi ha ubicacions configurades a data/locations.js."
    );
  }

  state.questions = shuffle(gameLocations).slice(
    0,
    Math.min(SETTINGS.maximumRounds, gameLocations.length)
  );

  state.currentRoundIndex = 0;
  state.totalScore = 0;

  elements.roundScreen.hidden = false;
  elements.finalScreen.hidden = true;

  updateScore();
  loadRound();
}

function selectPosition(latlng) {
  if (state.roundLocked || state.imageFailed) {
    return;
  }

  state.selectedPosition = latlng;

  if (!state.userMarker) {
    state.userMarker = L.marker(latlng, {
      draggable: true,
      title: "La teva resposta"
    })
      .addTo(map)
      .bindPopup("La teva resposta")
      .openPopup();

    state.userMarker.on("dragend", (event) => {
      state.selectedPosition = event.target.getLatLng();
      elements.selectionStatus.textContent = "Marcador desplaçat. Confirma quan estiguis a punt.";
    });
  } else {
    state.userMarker.setLatLng(latlng);
  }

  elements.confirmButton.disabled = false;
  elements.selectionStatus.textContent = "Punt escollit. Pots ajustar el marcador o confirmar.";
}

function confirmGuess() {
  if (!state.selectedPosition || state.roundLocked || state.imageFailed) {
    return;
  }

  state.roundLocked = true;
  elements.centerButton.disabled = true;
  elements.selectionStatus.textContent = "Resposta confirmada. Mostrant la distància real.";

  const question = state.questions[state.currentRoundIndex];
  const realPosition = L.latLng(question.lat, question.lng);
  const distanceMeters =
    state.selectedPosition.distanceTo(realPosition);
  const points = calculatePoints(distanceMeters);

  state.totalScore += points;
  updateScore();

  state.realMarker = L.marker(realPosition, {
    title: question.title
  })
    .addTo(map)
    .bindPopup(`<strong>${question.title}</strong>`)
    .openPopup();

  state.resultLine = L.polyline(
    [state.selectedPosition, realPosition],
    {
      weight: 4,
      dashArray: "8 8"
    }
  ).addTo(map);

  const revealBounds=L.latLngBounds([state.selectedPosition, realPosition]);
  const revealOptions={padding:[50,50],maxZoom:16};
  if(!reducedMotion&&typeof map.flyToBounds==="function")
    map.flyToBounds(revealBounds,{...revealOptions,duration:1.1});
  else map.fitBounds(revealBounds,revealOptions);

  elements.resultPoints.textContent =
    `+${points.toLocaleString("ca-ES")} punts`;

  elements.resultDistance.textContent =
    `T'has quedat a ${formatDistance(distanceMeters)}.`;

  elements.resultDescription.textContent =
    `${question.title}. ${question.description}`;

  elements.resultBox.classList.add("is-visible");
  elements.confirmButton.hidden = true;
  elements.nextButton.hidden = false;

  const isLastRound =
    state.currentRoundIndex === state.questions.length - 1;

  elements.nextButton.textContent = isLastRound
    ? "Veure resultat final"
    : "Següent fotografia";
}

function showFinalScreen() {
  clearMapResult();

  const maximumScore =
    state.questions.length * SETTINGS.maximumPointsPerRound;

  elements.roundScreen.hidden = true;
  elements.finalScreen.hidden = false;
  elements.selectionStatus.textContent = "";
  elements.finalScore.textContent =
    state.questions.length === 0 ? "Cap fotografia disponible. Torna-ho a provar més tard." :
    `${state.totalScore.toLocaleString("ca-ES")} / ` +
    `${maximumScore.toLocaleString("ca-ES")} punts`;

  map.setView(SETTINGS.initialCenter, SETTINGS.initialZoom);
}

function nextRound() {
  if(state.imageFailed){
    // A failed external photo is not a lost guess; remove the unplayable round.
    state.questions.splice(state.currentRoundIndex,1);
    state.imageFailed = false;
  }else{
    state.currentRoundIndex += 1;
  }

  if (state.currentRoundIndex >= state.questions.length) {
    showFinalScreen();
    return;
  }

  loadRound();
}

map.on("click", (event) => {
  selectPosition(event.latlng);
});

elements.confirmButton.addEventListener("click", confirmGuess);
elements.centerButton.addEventListener("click",()=>selectPosition(map.getCenter()));
elements.nextButton.addEventListener("click", nextRound);
elements.restartButton.addEventListener("click", startGame);

startGame();
