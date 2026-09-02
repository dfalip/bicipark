import {
  levels
} from "./levels.js";

import {
  clamp,
  getInrunPosition,
  getLandingY,
  launchBike,
  integrateFlight,
  evaluateLanding
} from "./physics.js";

const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

const elements = {
  attemptValue: document.getElementById("attemptValue"),
  totalScoreValue: document.getElementById("totalScoreValue"),
  highScoreValue: document.getElementById("highScoreValue"),
  windValue: document.getElementById("windValue"),
  powerValue: document.getElementById("powerValue"),
  powerBar: document.getElementById("powerBar"),
  statusText: document.getElementById("statusText"),
  launchButton: document.getElementById("launchButton"),
  restartButton: document.getElementById("restartButton"),
  rotateLeftButton: document.getElementById("rotateLeftButton"),
  rotateRightButton: document.getElementById("rotateRightButton"),
  resultPanel: document.getElementById("resultPanel"),
  resultTitle: document.getElementById("resultTitle"),
  resultDescription: document.getElementById("resultDescription"),
  distanceResult: document.getElementById("distanceResult"),
  takeoffResult: document.getElementById("takeoffResult"),
  controlResult: document.getElementById("controlResult"),
  landingResult: document.getElementById("landingResult"),
  jumpScoreResult: document.getElementById("jumpScoreResult"),
  nextAttemptButton: document.getElementById("nextAttemptButton"),
  countdown: document.getElementById("countdown")
};

const STORAGE_KEY = "bicipark-bike-jump-high-score-v1";
const level = levels[0];

const state = {
  phase: "ready",
  attempt: 1,
  totalScore: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  runStartedAt: null,
  chargeStartedAt: null,
  runProgress: 0,
  power: 0,
  wind: 0,
  bike: null,
  rotationInput: 0,
  lastFrameAt: null,
  releaseRequested: false,
  animationFrameId: null
};

function randomWind() {
  return Math.round(
    (-2.2 + Math.random() * 4.4) * 10
  ) / 10;
}

function formatScore(value) {
  return Math.round(value).toLocaleString("ca-ES");
}

function updateDashboard() {
  elements.attemptValue.textContent =
    `${state.attempt} / ${level.attempts}`;

  elements.totalScoreValue.textContent =
    formatScore(state.totalScore);

  elements.highScoreValue.textContent =
    formatScore(state.highScore);

  elements.windValue.textContent =
    `${state.wind.toLocaleString("ca-ES", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} m/s`;
}

function updatePowerDisplay() {
  const percentage = Math.round(state.power * 100);

  elements.powerValue.textContent = `${percentage}%`;
  elements.powerBar.style.width = `${percentage}%`;

  if (percentage >= 92) {
    elements.powerBar.style.background = "#b42318";
  } else if (percentage >= 72) {
    elements.powerBar.style.background = "#d17c0f";
  } else {
    elements.powerBar.style.background = "#176b45";
  }
}

function resetAttempt() {
  state.phase = "ready";
  state.runStartedAt = null;
  state.chargeStartedAt = null;
  state.runProgress = 0;
  state.power = 0;
  state.releaseRequested = false;
  state.rotationInput = 0;
  state.lastFrameAt = null;
  state.wind = randomWind();

  const position = getInrunPosition(level, 0);

  state.bike = {
    x: position.x,
    y: position.y,
    velocityX: 0,
    velocityY: 0,
    rotation: 0.46,
    angularVelocity: 0,
    flightTime: 0,
    controlEffort: 0,
    takeoffAccuracy: 0,
    crashed: false
  };

  elements.resultPanel.hidden = true;
  elements.launchButton.disabled = false;
  elements.launchButton.textContent = "Preparar salt";
  elements.rotateLeftButton.disabled = true;
  elements.rotateRightButton.disabled = true;
  elements.statusText.textContent =
    "Mantén premut «Preparar salt» i deixa’l anar prop del final del trampolí.";

  updateDashboard();
  updatePowerDisplay();
}

function startRun() {
  if (state.phase !== "ready") {
    return;
  }

  state.phase = "inrun";
  state.runStartedAt = performance.now();
  state.chargeStartedAt = state.runStartedAt;
  state.releaseRequested = false;
  elements.launchButton.textContent = "Deixa anar per saltar";
  elements.statusText.textContent =
    "La bicicleta baixa pel trampolí. Deixa anar a prop de la vora.";

  ensureAnimation();
}

function requestLaunch() {
  if (state.phase !== "inrun") {
    return;
  }

  state.releaseRequested = true;
}

function performLaunch() {
  if (state.phase !== "inrun") {
    return;
  }

  const launch = launchBike({
    level,
    progress: state.runProgress,
    power: state.power,
    wind: state.wind
  });

  state.phase = "flight";
  state.bike.velocityX = launch.velocityX;
  state.bike.velocityY = launch.velocityY;
  state.bike.rotation = launch.rotation;
  state.bike.angularVelocity = launch.angularVelocity;
  state.bike.takeoffAccuracy = launch.takeoffAccuracy;

  elements.launchButton.disabled = true;
  elements.rotateLeftButton.disabled = false;
  elements.rotateRightButton.disabled = false;
  elements.statusText.textContent =
    "En vol: ajusta la bicicleta a la pendent d’aterratge.";
}

function calculateScores(landing) {
  const takeoffScore = Math.round(
    state.bike.takeoffAccuracy * 1000
  );

  const distancePixels = Math.max(
    0,
    state.bike.x - level.takeoffPoint.x
  );

  const distanceMeters = clamp(
    distancePixels * level.distanceScale,
    0,
    level.maximumDistanceMeters
  );

  const distanceScore = Math.round(
    (distanceMeters / level.maximumDistanceMeters) *
    5000
  );

  const controlScore = Math.round(
    clamp(
      1000 -
      state.bike.controlEffort * 115 -
      Math.abs(state.bike.angularVelocity) * 95,
      0,
      1000
    )
  );

  const crashPenalty = landing.crashed ? 2500 : 0;

  const jumpScore = Math.max(
    0,
    distanceScore +
    takeoffScore +
    controlScore +
    landing.score -
    crashPenalty
  );

  return {
    distanceMeters,
    distanceScore,
    takeoffScore,
    controlScore,
    landingScore: landing.score,
    crashPenalty,
    jumpScore
  };
}

function finishAttempt() {
  if (state.phase !== "flight") {
    return;
  }

  const landing = evaluateLanding({
    bike: state.bike,
    level
  });

  state.phase = "result";
  state.bike.crashed = landing.crashed;
  state.bike.rotation = landing.crashed
    ? landing.slopeAngle + 0.82
    : landing.slopeAngle;

  const scores = calculateScores(landing);
  state.totalScore += scores.jumpScore;

  if (state.totalScore > state.highScore) {
    state.highScore = state.totalScore;
    localStorage.setItem(
      STORAGE_KEY,
      String(state.highScore)
    );
  }

  elements.rotateLeftButton.disabled = true;
  elements.rotateRightButton.disabled = true;
  elements.resultPanel.hidden = false;
  elements.resultTitle.textContent = landing.label;

  elements.resultDescription.textContent =
    landing.crashed
      ? "La bicicleta no estava alineada amb la pendent. Ajusta abans l’angle en el proper salt."
      : "Has completat el salt. La distància i la qualitat tècnica determinen la puntuació.";

  elements.distanceResult.textContent =
    `${scores.distanceMeters.toLocaleString("ca-ES", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} m`;

  elements.takeoffResult.textContent =
    formatScore(scores.takeoffScore);

  elements.controlResult.textContent =
    formatScore(scores.controlScore);

  elements.landingResult.textContent =
    formatScore(scores.landingScore);

  elements.jumpScoreResult.textContent =
    formatScore(scores.jumpScore);

  const isLastAttempt = state.attempt >= level.attempts;

  elements.nextAttemptButton.textContent = isLastAttempt
    ? "Nova partida"
    : "Següent salt";

  elements.statusText.textContent =
    `Salt completat: ${formatScore(scores.jumpScore)} punts.`;

  updateDashboard();
}

function nextAttempt() {
  if (state.phase !== "result") {
    return;
  }

  if (state.attempt >= level.attempts) {
    state.attempt = 1;
    state.totalScore = 0;
  } else {
    state.attempt += 1;
  }

  resetAttempt();
}

function restartGame() {
  state.attempt = 1;
  state.totalScore = 0;
  resetAttempt();
}

function updateInrun(now) {
  const elapsed =
    (now - state.runStartedAt) / 1000;

  const chargeElapsed =
    (now - state.chargeStartedAt) / 1000;

  state.runProgress = clamp(
    elapsed / level.inrunDurationSeconds,
    0,
    1
  );

  state.power = clamp(
    chargeElapsed / level.chargeDurationSeconds,
    0,
    1
  );

  const position = getInrunPosition(
    level,
    state.runProgress
  );

  state.bike.x = position.x;
  state.bike.y = position.y;
  state.bike.rotation =
    0.33 + state.runProgress * 0.18;

  updatePowerDisplay();

  if (state.releaseRequested) {
    performLaunch();
    return;
  }

  if (state.runProgress >= 1) {
    state.power *= 0.78;
    performLaunch();
  }
}

function updateFlight(deltaSeconds) {
  integrateFlight({
    bike: state.bike,
    level,
    deltaSeconds,
    rotationInput: state.rotationInput,
    wind: state.wind
  });

  const landingY = getLandingY(
    level,
    state.bike.x
  );

  if (
    state.bike.x >= level.landingStartX &&
    state.bike.y >= landingY - 8 &&
    state.bike.velocityY > 0
  ) {
    state.bike.y = landingY - 8;
    finishAttempt();
  }

  if (
    state.bike.x > canvas.width + 120 ||
    state.bike.y > canvas.height + 120
  ) {
    state.bike.x = Math.min(
      state.bike.x,
      canvas.width - 20
    );

    state.bike.y = getLandingY(
      level,
      state.bike.x
    ) - 8;

    state.bike.rotation += 1.2;
    finishAttempt();
  }
}

function update(now) {
  const deltaSeconds = state.lastFrameAt == null
    ? 0
    : Math.min(
        0.034,
        (now - state.lastFrameAt) / 1000
      );

  state.lastFrameAt = now;

  if (state.phase === "inrun") {
    updateInrun(now);
  } else if (state.phase === "flight") {
    updateFlight(deltaSeconds);
  }
}

function drawBackground() {
  const gradient = context.createLinearGradient(
    0,
    0,
    0,
    canvas.height
  );

  gradient.addColorStop(0, "#bcddea");
  gradient.addColorStop(0.62, "#eaf3ee");
  gradient.addColorStop(1, "#d6e4d2");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#ffffff";
  context.globalAlpha = 0.76;

  for (const cloud of [
    [155, 95, 38],
    [715, 88, 48],
    [875, 148, 30]
  ]) {
    context.beginPath();
    context.arc(cloud[0], cloud[1], cloud[2], 0, Math.PI * 2);
    context.arc(cloud[0] + 34, cloud[1] + 8, cloud[2] * 0.75, 0, Math.PI * 2);
    context.arc(cloud[0] - 31, cloud[1] + 12, cloud[2] * 0.62, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
}

function drawMountains() {
  context.fillStyle = "#8cab9d";
  context.beginPath();
  context.moveTo(0, 360);
  context.lineTo(115, 220);
  context.lineTo(225, 345);
  context.lineTo(365, 180);
  context.lineTo(520, 340);
  context.lineTo(680, 205);
  context.lineTo(820, 340);
  context.lineTo(930, 245);
  context.lineTo(1000, 330);
  context.lineTo(1000, 560);
  context.lineTo(0, 560);
  context.closePath();
  context.fill();

  context.fillStyle = "#6f927f";
  context.beginPath();
  context.moveTo(0, 430);
  context.quadraticCurveTo(250, 325, 490, 420);
  context.quadraticCurveTo(760, 315, 1000, 395);
  context.lineTo(1000, 560);
  context.lineTo(0, 560);
  context.closePath();
  context.fill();
}

function drawRamp() {
  context.strokeStyle = "#5e6570";
  context.lineWidth = 18;
  context.lineCap = "round";

  context.beginPath();

  for (let index = 0; index <= 60; index += 1) {
    const progress = index / 60;
    const position = getInrunPosition(
      level,
      progress
    );

    if (index === 0) {
      context.moveTo(position.x, position.y + 14);
    } else {
      context.lineTo(position.x, position.y + 14);
    }
  }

  context.stroke();

  context.strokeStyle = "#f4f5f6";
  context.lineWidth = 8;
  context.stroke();

  context.fillStyle = "#4a5058";

  for (let x = 120; x <= 350; x += 42) {
    const progress =
      (x - level.startPoint.x) /
      (level.takeoffPoint.x - level.startPoint.x);

    const position = getInrunPosition(
      level,
      clamp(progress, 0, 1)
    );

    context.fillRect(
      position.x - 3,
      position.y + 18,
      6,
      110
    );
  }

  context.fillStyle = "#d8dbde";
  context.fillRect(
    level.takeoffPoint.x - 6,
    level.takeoffPoint.y - 2,
    80,
    12
  );
}

function drawLandingHill() {
  context.fillStyle = "#f3f5f4";
  context.beginPath();
  context.moveTo(level.landingStartX, getLandingY(level, level.landingStartX));

  for (
    let x = level.landingStartX;
    x <= canvas.width;
    x += 8
  ) {
    context.lineTo(x, getLandingY(level, x));
  }

  context.lineTo(canvas.width, canvas.height);
  context.lineTo(level.landingStartX, canvas.height);
  context.closePath();
  context.fill();

  context.strokeStyle = "#c9d0cc";
  context.lineWidth = 3;
  context.beginPath();

  for (
    let x = level.landingStartX;
    x <= canvas.width;
    x += 8
  ) {
    const y = getLandingY(level, x);

    if (x === level.landingStartX) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();

  context.fillStyle = "#6b8f77";

  for (let x = 520; x < 980; x += 58) {
    const y = getLandingY(level, x);

    context.beginPath();
    context.moveTo(x, y - 18);
    context.lineTo(x - 12, y + 6);
    context.lineTo(x + 12, y + 6);
    context.closePath();
    context.fill();
  }
}

function drawDistanceMarkers() {
  context.font = "12px Arial";
  context.textAlign = "center";

  for (let meters = 20; meters <= 140; meters += 20) {
    const x =
      level.takeoffPoint.x +
      meters / level.distanceScale;

    if (x >= canvas.width) {
      break;
    }

    const y = getLandingY(level, x);

    context.strokeStyle = "#7f8c85";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y - 7);
    context.lineTo(x, y + 12);
    context.stroke();

    context.fillStyle = "#40534a";
    context.fillText(`${meters} m`, x, y + 28);
  }
}

function drawBike() {
  const bike = state.bike;

  context.save();
  context.translate(bike.x, bike.y);
  context.rotate(bike.rotation);

  const wheelRadius = 11;

  context.strokeStyle = bike.crashed
    ? "#8a1c13"
    : "#263238";

  context.lineWidth = 3;

  context.beginPath();
  context.arc(-17, 9, wheelRadius, 0, Math.PI * 2);
  context.arc(17, 9, wheelRadius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "#176b45";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-17, 9);
  context.lineTo(0, -5);
  context.lineTo(17, 9);
  context.lineTo(-4, 7);
  context.lineTo(-17, 9);
  context.moveTo(0, -5);
  context.lineTo(-4, 7);
  context.stroke();

  context.strokeStyle = "#1f2937";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, -5);
  context.lineTo(8, -20);
  context.lineTo(16, -13);
  context.moveTo(8, -20);
  context.lineTo(-4, -28);
  context.stroke();

  context.fillStyle = "#f4d719";
  context.beginPath();
  context.arc(-6, -34, 7, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawHud() {
  context.fillStyle = "rgb(255 255 255 / 84%)";
  context.fillRect(18, 18, 236, 66);

  context.fillStyle = "#1f2937";
  context.font = "bold 16px Arial";
  context.textAlign = "left";
  context.fillText(level.name, 31, 44);

  context.font = "13px Arial";

  const phaseLabels = {
    ready: "Preparat",
    inrun: "Descens",
    flight: "En vol",
    result: "Resultat"
  };

  context.fillText(
    `Estat: ${phaseLabels[state.phase]}`,
    31,
    67
  );
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawMountains();
  drawRamp();
  drawLandingHill();
  drawDistanceMarkers();
  drawBike();
  drawHud();
}

function frame(now) {
  update(now);
  draw();

  if (
    state.phase === "inrun" ||
    state.phase === "flight"
  ) {
    state.animationFrameId =
      requestAnimationFrame(frame);
  } else {
    state.animationFrameId = null;
  }
}

function ensureAnimation() {
  if (state.animationFrameId == null) {
    state.animationFrameId =
      requestAnimationFrame(frame);
  }
}

function setRotationInput(value) {
  state.rotationInput = value;
}

function handleSpaceDown(event) {
  if (event.code !== "Space" || event.repeat) {
    return;
  }

  event.preventDefault();
  startRun();
}

function handleSpaceUp(event) {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();
  requestLaunch();
}

document.addEventListener("keydown", event => {
  handleSpaceDown(event);

  if (event.code === "ArrowLeft") {
    event.preventDefault();
    setRotationInput(-1);
  }

  if (event.code === "ArrowRight") {
    event.preventDefault();
    setRotationInput(1);
  }
});

document.addEventListener("keyup", event => {
  handleSpaceUp(event);

  if (
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight"
  ) {
    setRotationInput(0);
  }
});

elements.launchButton.addEventListener(
  "pointerdown",
  event => {
    event.preventDefault();
    elements.launchButton.setPointerCapture(
      event.pointerId
    );
    startRun();
  }
);

elements.launchButton.addEventListener(
  "pointerup",
  event => {
    event.preventDefault();
    requestLaunch();
  }
);

elements.launchButton.addEventListener(
  "pointercancel",
  requestLaunch
);

function addRotationPointerControl(button, value) {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setRotationInput(value);
  });

  button.addEventListener("pointerup", event => {
    event.preventDefault();
    setRotationInput(0);
  });

  button.addEventListener("pointercancel", () => {
    setRotationInput(0);
  });
}

addRotationPointerControl(
  elements.rotateLeftButton,
  -1
);

addRotationPointerControl(
  elements.rotateRightButton,
  1
);

elements.nextAttemptButton.addEventListener(
  "click",
  nextAttempt
);

elements.restartButton.addEventListener(
  "click",
  restartGame
);

resetAttempt();
draw();
