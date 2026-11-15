import {
  levels
} from "./levels.js";

import {
  clamp,
  getInrunPosition,
  getLandingY,
  getLandingAngle,
  launchBike,
  integrateFlight,
  evaluateLanding
} from "./physics.js";
import {landingStory, landingPose, flightReadout, cinematicCamera, easeCamera} from "./cinematics.js";

const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

const elements = {
  attemptValue: document.getElementById("attemptValue"),
  attemptLabel: document.getElementById("attemptLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  challengeModeButton: document.getElementById("challengeModeButton"),
  practiceModeButton: document.getElementById("practiceModeButton"),
  gameModeNote: document.getElementById("gameModeNote"),
  challengeTitle: document.getElementById("challengeTitle"),
  challengeSubtitle: document.getElementById("challengeSubtitle"),
  totalScoreValue: document.getElementById("totalScoreValue"),
  highScoreValue: document.getElementById("highScoreValue"),
  windValue: document.getElementById("windValue"),
  powerValue: document.getElementById("powerValue"),
  powerBar: document.getElementById("powerBar"),
  runProgressValue: document.getElementById("runProgressValue"),
  runProgressBar: document.getElementById("runProgressBar"),
  runProgressTrack: document.getElementById("runProgressTrack"),
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
  countdown: document.getElementById("countdown"),
  jumpFeedback: document.getElementById("jumpFeedback"),
  flightHint: document.getElementById("flightHint"),
  flightReadout: document.getElementById("flightReadout"),
  flightDistance: document.getElementById("flightDistance"),
  flightClearance: document.getElementById("flightClearance"),
  airtimeBanner: document.getElementById("airtimeBanner"),
  jumpStars: document.getElementById("jumpStars"),
  gameSummary: document.getElementById("gameSummary"),
  gameSummaryTitle: document.getElementById("gameSummaryTitle"),
  gameSummaryText: document.getElementById("gameSummaryText"),
  phasePill: document.getElementById("phasePill"),
  stageHint: document.getElementById("stageHint"),
  launchButtonLabel: document.getElementById("launchButtonLabel"),
  modeTapButton: document.getElementById("modeTapButton"),
  modeHoldButton: document.getElementById("modeHoldButton"),
  controlHelp: document.getElementById("controlHelp"),
  courseSelect: document.getElementById("courseSelect"),
  courseHint: document.getElementById("courseHint"),
  courseTag: document.getElementById("courseTag")
};

const STORAGE_KEY = "bicipark-bike-jump-high-score-v1";
let level = levels[0];

function scoreStorageKey(course=level){
  // Keep the original K90 local high score compatible with previous versions.
  return course.id===levels[0].id?STORAGE_KEY:`${STORAGE_KEY}-${course.id}`;
}
function readCourseRecord(course=level){
  try{
    const value=Number(localStorage.getItem(scoreStorageKey(course))||0);
    return Number.isFinite(value)&&value>=0?value:0;
  }catch{return 0;}
}
const safeStoredRecord=readCourseRecord(level);

const state = {
  phase: "ready",
  controlMode: "tap",
  gameMode: "challenge",
  practiceJumps: 0,
  practiceLastScore: 0,
  attempt: 1,
  totalScore: 0,
  highScore: Number.isFinite(safeStoredRecord) && safeStoredRecord >= 0 ? safeStoredRecord : 0,
  gameStartingRecord: Number.isFinite(safeStoredRecord) && safeStoredRecord >= 0 ? safeStoredRecord : 0,
  runStartedAt: null,
  chargeStartedAt: null,
  runProgress: 0,
  power: 0,
  wind: 0,
  bike: null,
  rotationInput: 0,
  lastFrameAt: null,
  releaseRequested: false,
  idealZoneAnnounced: false,
  flightTrail: [],
  impact: null,
  camera: {x:500,y:280,zoom:1},
  animationFrameId: null
};

function setLaunchLabel(label) {
  elements.launchButtonLabel.textContent = label;
  elements.launchButton.setAttribute("aria-label", label);
}

function syncControlMode() {
  const tap = state.controlMode === "tap";
  const busy = ["inrun","flight","impact"].includes(state.phase);
  elements.modeTapButton.setAttribute("aria-pressed", String(tap));
  elements.modeHoldButton.setAttribute("aria-pressed", String(!tap));
  elements.modeTapButton.disabled = busy;
  elements.modeHoldButton.disabled = busy;
  elements.controlHelp.textContent = tap
    ? "Toca una vegada per arrencar i un altre cop per saltar. En vol, corregeix l'angle amb ← → o amb els botons. També pots activar el mode «Mantén»."
    : "Mantén premut per baixar el trampolí i deixa anar a la zona daurada. En vol, corregeix l'angle amb ← → o amb els botons.";
}

function syncCourse() {
  elements.courseSelect.value=level.id;
  elements.courseTag.textContent=level.tag;
  elements.courseHint.textContent=level.description;
}
function changeCourse(id){
  if(["inrun","flight","impact"].includes(state.phase)){
    elements.courseSelect.value=level.id;
    return;
  }
  const next=levels.find(course=>course.id===id);
  if(!next || next.id===level.id){
    elements.courseSelect.value=level.id;
    return;
  }
  level=next;
  state.highScore=readCourseRecord(next);
  state.gameStartingRecord=state.highScore;
  state.attempt=1;
  state.totalScore=0;
  state.practiceJumps=0;
  state.practiceLastScore=0;
  resetAttempt();
}
function syncGameMode() {
  const practice=state.gameMode==="practice";
  const busy=["inrun","flight","impact"].includes(state.phase);
  elements.courseSelect.disabled=busy;
  elements.practiceModeButton.setAttribute("aria-pressed",String(practice));
  elements.challengeModeButton.setAttribute("aria-pressed",String(!practice));
  elements.practiceModeButton.disabled=busy;
  elements.challengeModeButton.disabled=busy;
  elements.scoreLabel.textContent=practice?"Últim salt":"Punts";
  elements.attemptLabel.textContent=practice?"Pràctica":"Salt";
  elements.challengeTitle.textContent=practice?"∞ salts":"3 salts";
  elements.challengeSubtitle.textContent=practice?"Entrena sense tocar el rècord.":"Supera el teu millor total.";
  elements.gameModeNote.textContent=practice
    ? "Pràctica: salts il·limitats. Les puntuacions no es sumen al repte ni modifiquen el rècord."
    : "Repte: tres salts puntuables. La pràctica és il·limitada i no modifica els rècords.";
  document.body.classList.toggle("bike-jump-practice-mode",practice);
}

function changeGameMode(next) {
  if(next!=="practice" && next!=="challenge")return;
  if(["inrun","flight","impact"].includes(state.phase))return;
  if(state.gameMode===next)return;
  state.gameMode=next;
  state.attempt=1;
  state.totalScore=0;
  state.practiceJumps=0;
  state.practiceLastScore=0;
  state.gameStartingRecord=state.highScore;
  resetAttempt();
}

function randomWind() {
  const range=level.windRange||2.2;
  return Math.round((-range + Math.random()*2*range)*10)/10;
}

function formatScore(value) {
  return Math.round(value).toLocaleString("ca-ES");
}

function updateDashboard() {
  elements.attemptValue.textContent = state.gameMode==="practice"
    ? `${state.practiceJumps+1} / ∞`
    : `${state.attempt} / ${level.attempts}`;

  elements.totalScoreValue.textContent = formatScore(
    state.gameMode==="practice"?state.practiceLastScore:state.totalScore
  );

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

function updateRunProgress() {
  const percent = Math.round(state.runProgress * 100);
  elements.runProgressValue.textContent = `${percent}%`;
  elements.runProgressBar.style.width = `${percent}%`;
  elements.runProgressTrack.setAttribute("aria-valuenow", String(percent));
}

function resetAttempt() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
  state.phase = "ready";
  document.body.classList.remove("bike-jump-in-flight", "bike-jump-in-sweetspot",
    "bike-jump-impacting", "bike-jump-crashing");
  elements.flightHint.hidden = true;
  elements.flightReadout.hidden = true;
  elements.airtimeBanner.hidden = true;
  state.runStartedAt = null;
  state.chargeStartedAt = null;
  state.runProgress = 0;
  state.power = 0;
  state.releaseRequested = false;
  state.idealZoneAnnounced = false;
  state.flightTrail = [];
  state.impact = null;
  state.camera = {x:canvas.width/2,y:canvas.height/2,zoom:1};
  clearAllRotationControls();
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
    crashed: false,
    wheelSpin:0,
    compression:0
  };

  elements.resultPanel.hidden = true;
  document.body.classList.remove("bike-jump-show-result");
  elements.jumpFeedback.hidden = true;
  elements.gameSummary.hidden = true;
  elements.launchButton.disabled = false;
  setLaunchLabel(state.controlMode === "tap" ? "TOCA PER COMENÇAR" : "MANTÉN PER COMENÇAR");
  elements.stageHint.textContent = state.controlMode === "tap"
    ? "Toca una vegada per baixar. Torna a tocar a la zona daurada."
    : "Mantén premut mentre baixes i deixa anar a la zona daurada.";
  elements.phasePill.textContent = "● PREPARAT";
  syncControlMode();
  syncGameMode();
  syncCourse();
  elements.rotateLeftButton.disabled = true;
  elements.rotateRightButton.disabled = true;
  elements.statusText.textContent = state.controlMode === "tap"
    ? "Toca per començar el descens; torna a tocar a la zona daurada per saltar."
    : "Mantén premut per baixar; deixa anar a la zona daurada per saltar.";

  updateDashboard();
  updatePowerDisplay();
  updateRunProgress();
  draw();
}

function startRun() {
  if (state.phase !== "ready") {
    return;
  }

  state.phase = "inrun";
  syncGameMode();
  state.runStartedAt = performance.now();
  state.chargeStartedAt = state.runStartedAt;
  state.releaseRequested = false;
  setLaunchLabel(state.controlMode === "tap" ? "TOCA PER SALTAR!" : "DEIXA ANAR PER SALTAR");
  elements.phasePill.textContent = "↘ DESCENS";
  elements.stageHint.textContent = state.controlMode === "tap"
    ? "Mira la barra daurada: torna a tocar just abans de la vora."
    : "Mantén premut i deixa anar a la zona daurada.";
  elements.statusText.textContent = "La bicicleta baixa. Prepara la sortida!";
  syncControlMode();

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
  document.body.classList.add("bike-jump-in-flight");
  document.body.classList.remove("bike-jump-in-sweetspot");
  elements.phasePill.textContent = "✦ EN VOL";
  elements.stageHint.textContent = "Equilibra la bici amb ← → o els botons de sota.";
  elements.flightHint.hidden = false;
  elements.flightReadout.hidden = false;
  state.bike.velocityX = launch.velocityX;
  state.bike.velocityY = launch.velocityY;
  state.bike.rotation = launch.rotation;
  state.bike.angularVelocity = launch.angularVelocity;
  state.bike.takeoffAccuracy = launch.takeoffAccuracy;
  state.flightTrail = [{x: state.bike.x, y: state.bike.y}];

  elements.launchButton.disabled = true;
  syncControlMode();
  syncGameMode();
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
      state.bike.controlEffort * 85 -
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

function finishAttempt(){
  if(state.phase!=="flight")return;
  const landing=evaluateLanding({bike:state.bike,level});
  // Physical scoring is fixed on first contact. The subsequent tumble
  // affects only the visual pose, not ranking, distance or score.
  const scores=calculateScores(landing);
  const story=landingStory(landing,state.bike);
  state.impact={landing,scores,story,elapsed:0,initial:{...state.bike},pose:null};
  state.phase="impact";
  state.bike.crashed=landing.crashed;
  document.body.classList.add("bike-jump-impacting");
  document.body.classList.toggle("bike-jump-crashing",landing.crashed);
  elements.airtimeBanner.hidden=true;
  document.body.classList.remove("bike-jump-in-flight","bike-jump-in-sweetspot");
  elements.phasePill.textContent=story.kind==="crash"?"⚠ CAIGUDA":"✦ ATERRATGE";
  elements.flightHint.hidden=true;
  elements.stageHint.textContent=story.kind==="crash"
    ?"La bici ha perdut el control. Mira com acaba la caiguda."
    :"Mira com la bicicleta absorbeix l'aterratge.";
  elements.statusText.textContent=story.label;
  clearAllRotationControls();
  elements.launchButton.disabled=true;
  elements.rotateLeftButton.disabled=true;
  elements.rotateRightButton.disabled=true;
  syncControlMode();
  syncGameMode();
}

function updateImpact(deltaSeconds){
  if(!state.impact)return;
  const impact=state.impact;
  impact.elapsed+=deltaSeconds;
  impact.pose=landingPose({level,story:impact.story,initial:impact.initial,elapsed:impact.elapsed});
  const pose=impact.pose;
  state.bike.x=pose.x;
  state.bike.y=pose.y;
  state.bike.rotation=pose.rotation;
  state.bike.wheelSpin=pose.wheelSpin;
  state.bike.compression=pose.compression;
  if(impact.elapsed>=impact.story.duration)finalizeAttempt();
}

function finalizeAttempt(){
  if(state.phase!=="impact"||!state.impact)return;
  const {landing,scores,story}=state.impact;
  state.phase="result";
  document.body.classList.remove("bike-jump-impacting","bike-jump-crashing");
  elements.flightReadout.hidden=true;
  state.bike.crashed=landing.crashed;
  elements.phasePill.textContent="✦ RESULTAT";
  syncControlMode();
  syncGameMode();
  elements.resultPanel.hidden=false;
  document.body.classList.add("bike-jump-show-result");
  if(state.gameMode==="practice"){
    // Practice scores are informational; never update the three-jump total,
    // localStorage or the official best score.
    state.practiceLastScore=scores.jumpScore;
  }else{
    state.totalScore+=scores.jumpScore;
    if(state.totalScore>state.highScore){
      state.highScore=state.totalScore;
      try{localStorage.setItem(scoreStorageKey(),String(state.highScore));}
      catch{/* record remains visible in memory */}
    }
  }

  clearAllRotationControls();
  elements.rotateLeftButton.disabled = true;
  elements.rotateRightButton.disabled = true;
  // Results open after the cinematic impact, not at the first contact.
  elements.resultTitle.textContent = story.label;
  const stars = landing.crashed ? 0 :
    landing.score === 2000 && scores.takeoffScore >= 750 ? 3 :
    landing.score >= 1450 ? 2 : 1;
  elements.jumpStars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  elements.jumpStars.setAttribute("aria-label", `${stars} de 3 estrelles`);
  elements.jumpFeedback.hidden = false;
  elements.jumpFeedback.classList.toggle("bike-jump-feedback--crash", landing.crashed);
  elements.jumpFeedback.textContent = landing.crashed ? "Ui! Torna-ho a provar" :
    stars === 3 ? "SALT PERFECTE!" : stars === 2 ? "MOLT BÉ!" : "BON SALT!";

  elements.resultDescription.textContent = story.description;

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

  const isPractice=state.gameMode==="practice";
  const isLastAttempt=!isPractice && state.attempt>=level.attempts;
  elements.nextAttemptButton.textContent = isPractice
    ? "TORNA A PRACTICAR ↻"
    : isLastAttempt?"Torna-hi!":"Següent salt";

  elements.gameSummary.hidden = !isLastAttempt;
  if (isLastAttempt) {
    const newRecord = state.totalScore > state.gameStartingRecord;
    elements.gameSummaryTitle.textContent = newRecord ? "🏆 Nou rècord!" : "🏁 Partida completada!";
    elements.gameSummaryText.textContent = `3 salts · ${formatScore(state.totalScore)} punts totals. ${newRecord ? "Fantàstic!" : "Pots superar-ho?"}`;
  }

  elements.statusText.textContent =
    `Salt completat: ${formatScore(scores.jumpScore)} punts.`;
  elements.stageHint.textContent = "Pots continuar al panell de resultat.";
  elements.nextAttemptButton.focus({preventScroll:true});
  updateDashboard();
}

function nextAttempt() {
  if (state.phase !== "result") {
    return;
  }

  if(state.gameMode==="practice"){
    state.practiceJumps+=1;
  }else if(state.attempt>=level.attempts){
    state.attempt=1;
    state.totalScore=0;
    state.gameStartingRecord=state.highScore;
  }else{
    state.attempt+=1;
  }

  resetAttempt();
  elements.launchButton.focus({preventScroll:true});
}

function restartGame() {
  state.attempt = 1;
  state.totalScore = 0;
  state.practiceJumps=0;
  state.practiceLastScore=0;
  state.gameStartingRecord = state.highScore;
  resetAttempt();
  elements.launchButton.focus({preventScroll:true});
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
  state.bike.wheelSpin=state.runProgress*11;

  updatePowerDisplay();
  updateRunProgress();

  const sweetspot = state.runProgress >= level.idealTakeoffProgress - 0.05;
  document.body.classList.toggle("bike-jump-in-sweetspot", sweetspot);
  if (!state.idealZoneAnnounced && sweetspot) {
    state.idealZoneAnnounced = true;
    elements.stageHint.textContent = state.controlMode === "tap" ? "✦ ARA! TOCA PER SALTAR!" : "✦ ARA! DEIXA ANAR!";
    elements.statusText.textContent = "Zona òptima: salta ara!";
  }

  if (state.releaseRequested) {
    performLaunch();
    return;
  }

  if (state.runProgress >= 1) {
    state.power *= 0.78;
    performLaunch();
  }
}

function updateFlightHint() {
  // Anticipate the landing gradient; tell the player what to correct.
  // Keep the on-screen guidance non-live to avoid noisy announcements each frame.
  const targetX = Math.max(level.landingStartX, Math.min(canvas.width, state.bike.x + 100));
  const targetAngle = getLandingAngle(level, targetX);
  const delta = Math.atan2(Math.sin(targetAngle - state.bike.rotation), Math.cos(targetAngle - state.bike.rotation));
  const direction = delta > 0.13 ? "forward" : delta < -0.13 ? "backward" : "balanced";
  const messages = {
    forward: "→ Inclina endavant",
    backward: "← Inclina enrere",
    balanced: "✓ Bona posició!"
  };
  if (elements.flightHint.dataset.balance !== direction) {
    elements.flightHint.dataset.balance = direction;
    elements.flightHint.textContent = messages[direction];
  }
}

function updateFlight(deltaSeconds) {
  // The short apex slowdown increases perceived hang-time, but the physics
  // still advances with the SAME elapsed simulation time for every input.
  // No artificial metres are credited to the score.
  const apex=Math.abs(state.bike.velocityY)<45 && state.bike.flightTime>.25;
  const motionSeconds=deltaSeconds*(apex?.78:1);
  elements.airtimeBanner.hidden=!apex;
  integrateFlight({
    bike: state.bike,
    level,
    deltaSeconds:motionSeconds,
    rotationInput: state.rotationInput,
    wind: state.wind
  });

  state.bike.wheelSpin+=(Math.abs(state.bike.velocityX)*motionSeconds)/11;
  state.flightTrail.push({x: state.bike.x, y: state.bike.y});
  if (state.flightTrail.length > 32) state.flightTrail.shift();
  updateFlightHint();

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
    state.bike.x > level.takeoffPoint.x + level.maximumDistanceMeters/level.distanceScale + 250 ||
    state.bike.y > canvas.height + 380
  ) {
    state.bike.x = Math.min(
      state.bike.x,
      level.takeoffPoint.x + level.maximumDistanceMeters/level.distanceScale + 220
    );

    state.bike.y = getLandingY(
      level,
      state.bike.x
    ) - 8;

    state.bike.rotation += 1.2;
    finishAttempt();
  }
}

function updateCinematicCamera(deltaSeconds) {
  if(state.phase==="result")return;
  const target=cinematicCamera({phase:state.phase,bike:state.bike,level,
    width:canvas.width,height:canvas.height});
  state.camera=easeCamera(state.camera,target,deltaSeconds);
  if(state.phase==="flight"||state.phase==="impact"){
    const {distanceMeters,clearanceMeters}=flightReadout(level,state.bike);
    elements.flightDistance.textContent=`${Math.round(distanceMeters)} m`;
    elements.flightClearance.textContent=`${Math.round(clearanceMeters)} m`;
    elements.flightReadout.hidden=false;
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
  } else if (state.phase === "impact") {
    updateImpact(deltaSeconds);
  }
  updateCinematicCamera(deltaSeconds);
}

function drawBackground() {
  const gradient = context.createLinearGradient(
    0,
    0,
    0,
    canvas.height
  );

  const sky=level.theme==="city"
    ? ["#122044","#465a91","#b8cee3"]
    : level.theme==="canyon"
      ? ["#853858","#d87b65","#f4cf9d"]
      : ["#104762","#32899b","#b0dbc9"];
  gradient.addColorStop(0,sky[0]);
  gradient.addColorStop(.48,sky[1]);
  gradient.addColorStop(1,sky[2]);

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Soft sun and distant atmosphere, all drawn locally on the canvas.
  const sun = context.createRadialGradient(800, 126, 8, 800, 126, 186);
  sun.addColorStop(0, "rgba(255,237,151,1)");
  sun.addColorStop(.36, "rgba(255,199,113,.55)");
  sun.addColorStop(1, "rgba(255,206,134,0)");
  context.fillStyle = sun;
  context.fillRect(610, 0, 390, 325);
  context.fillStyle = level.theme==="city"?"#e8f2ff":level.theme==="canyon"?"#ffca84":"#ffe8a3";
  context.beginPath();
  context.arc(800, 126, 42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#e0fcf8";
  context.globalAlpha = 0.45;

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
  if(level.theme==="city"){
    // Two skyline depths, with the near buildings kept below the ramp.
    const skyline=[[0,130,300],[105,75,245],[175,95,290],[252,112,225],[366,80,290],[463,110,255],[562,85,305],[642,145,224],[786,115,289],[895,118,240]];
    context.fillStyle="#455b7a";
    for(const [x,w,y] of skyline)context.fillRect(x,y,w,560-y);
    context.fillStyle="#263f60";
    for(const [x,w,y] of [[30,135,360],[210,125,380],[414,100,355],[592,122,380],[774,145,352],[928,90,385]])
      context.fillRect(x,y,w,560-y);
    return;
  }
  if(level.theme==="canyon"){
    context.fillStyle="#9c4e60";
    context.beginPath();
    context.moveTo(0,355);
    context.lineTo(85,330);context.lineTo(85,229);context.lineTo(199,229);
    context.lineTo(206,340);context.lineTo(330,355);
    context.lineTo(379,291);context.lineTo(505,291);context.lineTo(542,354);
    context.lineTo(685,350);context.lineTo(716,222);context.lineTo(821,222);
    context.lineTo(845,348);context.lineTo(1000,340);
    context.lineTo(1000,560);context.lineTo(0,560);context.closePath();context.fill();
    context.fillStyle="#743947";
    context.beginPath();context.moveTo(0,421);context.lineTo(140,375);
    context.lineTo(285,415);context.lineTo(450,387);
    context.lineTo(615,418);context.lineTo(817,368);
    context.lineTo(1000,411);context.lineTo(1000,560);
    context.lineTo(0,560);context.closePath();context.fill();
    return;
  }
  context.fillStyle = "#527f89";
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

  context.fillStyle = "#245e6c";
  context.beginPath();
  context.moveTo(0, 430);
  context.quadraticCurveTo(250, 325, 490, 420);
  context.quadraticCurveTo(760, 315, 1000, 395);
  context.lineTo(1000, 560);
  context.lineTo(0, 560);
  context.closePath();
  context.fill();
}

// Small layered alpine silhouettes add depth without external assets.
// All objects are created procedurally in the canvas.
function drawSceneryDetails() {
  context.save();
  if(level.theme==="city"){
    for(const [x,y,w,h] of [[20,360,135,200],[210,380,125,180],[414,355,100,205],[592,380,122,180],[774,352,145,208],[928,385,90,175]]){
      context.fillStyle="rgba(238,229,162,.72)";
      for(let wx=x+12;wx<x+w-10;wx+=19){
        for(let wy=y+15;wy<y+h-12;wy+=27){
          if(Math.floor((wx+wy)/19)%3!==0)context.fillRect(wx,wy,6,11);
        }
      }
    }
    context.restore();return;
  }
  if(level.theme==="canyon"){
    context.strokeStyle="#315f57";
    context.lineCap="round";
    for(const [x,y,h] of [[55,417,42],[256,419,30],[695,430,35],[940,441,34]]){
      context.lineWidth=9;
      context.beginPath();context.moveTo(x,y);context.lineTo(x,y-h);context.stroke();
      context.lineWidth=7;
      context.beginPath();context.moveTo(x,y-h*.44);context.lineTo(x-13,y-h*.44);
      context.lineTo(x-13,y-h*.72);context.moveTo(x,y-h*.62);
      context.lineTo(x+14,y-h*.62);context.lineTo(x+14,y-h*.88);context.stroke();
    }
    context.restore();return;
  }
  for (const [x, y, size] of [[42,419,27],[78,422,35],[430,440,22],[475,446,29],[920,429,24],[963,429,33]]) {
    context.strokeStyle = "#163d48";
    context.lineWidth = Math.max(2,size*.12);
    context.beginPath();
    context.moveTo(x,y);
    context.lineTo(x,y-size*2);
    context.stroke();
    context.fillStyle = "#1c5360";
    for (let j=0;j<3;j++) {
      const tip=y-size*2.3 + j*size*.52;
      context.beginPath();
      context.moveTo(x,tip);
      context.lineTo(x-size*(.46+j*.1),tip+size*.72);
      context.lineTo(x+size*(.46+j*.1),tip+size*.72);
      context.closePath();
      context.fill();
    }
  }
  context.strokeStyle="rgba(231,250,248,.47)";
  context.lineWidth=2;
  for(const [x,y] of [[62,124],[554,90],[607,125]]) {
    context.beginPath();
    context.moveTo(x-8,y);
    context.quadraticCurveTo(x,y-6,x+8,y);
    context.quadraticCurveTo(x+16,y-5,x+21,y-1);
    context.stroke();
  }
  context.restore();
}

function drawRamp() {
  context.strokeStyle = "#173f52";
  context.lineWidth = 21;
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

  context.strokeStyle = "#78f5dd";
  context.lineWidth = 8;
  context.stroke();

  context.fillStyle = "#194354";

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

  context.fillStyle = "#f2d764";
  context.fillRect(
    level.takeoffPoint.x - 6,
    level.takeoffPoint.y - 2,
    80,
    12
  );
}

function landingHorizonX(){
  return level.takeoffPoint.x + level.maximumDistanceMeters/level.distanceScale + 340;
}

function drawLandingHill() {
  context.fillStyle = level.theme==="city"?"#71849c":level.theme==="canyon"?"#e2a475":"#d7eee5";
  context.beginPath();
  context.moveTo(level.landingStartX, getLandingY(level, level.landingStartX));

  for (
    let x = level.landingStartX;
    x <= landingHorizonX();
    x += 8
  ) {
    context.lineTo(x, getLandingY(level, x));
  }

  context.lineTo(landingHorizonX(), canvas.height + 1400);
  context.lineTo(level.landingStartX, canvas.height + 1400);
  context.closePath();
  context.fill();

  context.strokeStyle = level.theme==="city"?"#bdcbd8":level.theme==="canyon"?"#f5c08f":"#65b7ac";
  context.lineWidth = 3;
  context.beginPath();

  for (
    let x = level.landingStartX;
    x <= landingHorizonX();
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

  context.fillStyle = level.theme==="city"?"#d4e8e8":level.theme==="canyon"?"#c47959":"#4f9080";
  for (let x = 520; x < landingHorizonX(); x += 58) {
    const y = getLandingY(level, x);
    if(level.theme==="city"){
      context.fillRect(x-9,y-5,23,3);
    }else if(level.theme==="canyon"){
      context.beginPath();context.arc(x,y+1,7,Math.PI,Math.PI*2);context.fill();
    }else{
      context.beginPath();
      context.moveTo(x, y - 18);
      context.lineTo(x - 12, y + 6);
      context.lineTo(x + 12, y + 6);
      context.closePath();
      context.fill();
    }
  }
}

function drawDistanceMarkers() {
  context.font = "12px Arial";
  context.textAlign = "center";

  for (let meters = 20; meters <= 140; meters += 20) {
    const x =
      level.takeoffPoint.x +
      meters / level.distanceScale;

    // Markers beyond the first screen remain visible when the camera pans.
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

function drawTakeoffBeacon() {
  if(state.phase!=="ready" && state.phase!=="inrun")return;
  context.save();
  const x=level.takeoffPoint.x+15, y=level.takeoffPoint.y-36;
  const ready=state.phase==="inrun" && state.runProgress>=level.idealTakeoffProgress-.05;
  context.fillStyle=ready?"rgba(116,255,177,.32)":"rgba(255,227,92,.24)";
  context.beginPath();context.arc(x,y,ready?45:33,0,Math.PI*2);context.fill();
  context.fillStyle=ready?"#b9ffd1":"#ffe779";
  context.beginPath();context.moveTo(x,y-22);context.lineTo(x+11,y-4);context.lineTo(x,y+13);context.lineTo(x-11,y-4);context.closePath();context.fill();
  context.font="bold 15px system-ui";
  context.textAlign="center";
  context.fillStyle="#fff7c3";
  context.fillText(ready?"ARA!":"SORTIDA",x,y-33);
  context.restore();
}

function drawBike() {
  const bike = state.bike;

  context.save();
  context.translate(bike.x, bike.y);
  context.rotate(bike.rotation);
  context.scale(1.52, 1.52);

  const wheelRadius = 11;

  context.strokeStyle = bike.crashed
    ? "#8a1c13"
    : "#263238";

  context.lineWidth = 3;

  context.beginPath();
  context.arc(-17, 9, wheelRadius, 0, Math.PI * 2);
  context.arc(17, 9, wheelRadius, 0, Math.PI * 2);
  context.stroke();

  // Rotating spokes expose speed during the descent and flight.
  for(const wheelX of [-17,17]){
    context.save();
    context.translate(wheelX,9);
    context.rotate(bike.wheelSpin||0);
    context.strokeStyle="rgba(230,250,248,.86)";
    context.lineWidth=1.3;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/4;
      context.beginPath();
      context.moveTo(-Math.cos(a)*wheelRadius,-Math.sin(a)*wheelRadius);
      context.lineTo(Math.cos(a)*wheelRadius,Math.sin(a)*wheelRadius);
      context.stroke();
    }
    context.restore();
  }
  // A compression transform simulates the suspension taking the impact.
  context.save();
  context.translate(0,(bike.compression||0)/1.52);

  context.strokeStyle = "#ffe46c";
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

  // During a crash the pilot becomes a separate animated body; otherwise
  // the fixed rider would unrealistically stay attached to an inverted bike.
  const detached=state.phase==="impact" && state.impact?.story.kind==="crash";
  if(!detached){
  // Rider jersey and a brighter helmet for readability on small screens.
  context.fillStyle = "#ff6c8f";
  context.beginPath();
  context.moveTo(-7, -25);
  context.lineTo(8, -20);
  context.lineTo(1, -9);
  context.lineTo(-12, -14);
  context.closePath();
  context.fill();

  context.fillStyle = "#bcfff1";
  context.beginPath();
  context.arc(-6, -34, 7, 0, Math.PI * 2);
  context.fill();
  }
  context.restore(); // suspension
  context.restore(); // bicycle
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

function drawFlightTrail() {
  if (state.flightTrail.length < 2) return;
  context.save();
  context.strokeStyle = "rgba(255,245,145,.82)";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.setLineDash([7, 8]);
  context.beginPath();
  state.flightTrail.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();
  context.restore();
}

function drawSpeedLines() {
  if ((state.phase !== "inrun" || state.runProgress < 0.2) &&
      state.phase !== "flight") return;
  const bike = state.bike;
  context.save();
  context.strokeStyle = "rgba(255,255,255,.9)";
  context.lineWidth = 3;
  context.lineCap = "round";
  for (let i = -1; i <= 1; i += 1) {
    context.beginPath();
    const length=state.phase==="flight"?100:70;
    context.moveTo(bike.x-length-(i+1)*14,bike.y+i*17);
    context.lineTo(bike.x-25-(i+1)*14,bike.y+i*17);
    context.stroke();
  }
  context.restore();
}

function prefersReducedMotion(){
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function drawShadow(){
  if(state.phase!=="flight" && state.phase!=="impact")return;
  const bike=state.bike;
  const sx=Math.max(level.landingStartX,bike.x);
  const sy=getLandingY(level,sx);
  const height=Math.max(0,sy-bike.y);
  const opacity=clamp(.47-height/900,.13,.49);
  context.save();
  context.strokeStyle="rgba(223,249,245,.3)";
  context.lineWidth=2;
  context.setLineDash([5,11]);
  context.beginPath();
  context.moveTo(bike.x,bike.y+14);
  context.lineTo(sx,sy);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle=`rgba(1,32,39,${opacity})`;
  context.beginPath();
  context.ellipse(sx,sy+4,22+height*.12,7+height*.025,0,0,Math.PI*2);
  context.fill();
  context.restore();
}

function drawTumblingRider(){
  const pose=state.phase==="impact"?state.impact?.pose:null;
  if(!pose?.rider)return;
  const rider=pose.rider;
  context.save();
  context.translate(rider.x,rider.y);
  context.rotate(rider.rotation);
  // A separate pilot in a wipeout: no longer stuck to the bike frame.
  context.strokeStyle="#14343c";
  context.lineWidth=5;
  context.lineCap="round";
  context.beginPath();context.moveTo(-12,-3);context.lineTo(10,14);
  context.moveTo(0,6);context.lineTo(-20,14);
  context.moveTo(0,6);context.lineTo(15,-6);
  context.stroke();
  context.fillStyle="#fa6d90";
  context.beginPath();context.ellipse(0,-9,13,17,-.3,0,Math.PI*2);context.fill();
  context.fillStyle="#c4fff1";
  context.beginPath();context.arc(1,-29,10,0,Math.PI*2);context.fill();
  context.restore();
}

function drawLandingEffect() {
  if(state.phase!=="impact" || !state.impact?.pose)return;
  const {initial,pose,story}=state.impact;
  const t=pose.progress;
  context.save();
  const gy=getLandingY(level,initial.x);
  for(let i=0;i<18;i++){
    const a=(i/18)*Math.PI*2;
    const drift=(story.kind==="crash"?110:story.kind==="rough"?63:42);
    const spread=(.2+t)*drift;
    const x=initial.x+Math.cos(a)*spread + t*(story.direction==="forward"?28:-14);
    const y=gy - Math.abs(Math.sin(a))*spread*.4 - Math.sin(t*Math.PI)*18;
    const radius=(story.kind==="crash"?5:3)*(1-t*.65);
    context.fillStyle=story.kind==="crash"
      ?`rgba(255,196,137,${Math.max(0,.73-t*.67)})`
      :`rgba(221,254,226,${Math.max(0,.78-t*.69)})`;
    context.beginPath();
    context.arc(x,y,Math.max(.7,radius),0,Math.PI*2);
    context.fill();
  }
  if(story.kind==="perfect" && t<.65){
    context.strokeStyle=`rgba(254,234,107,${1-t})`;
    context.lineWidth=5;
    context.beginPath();
    context.arc(initial.x,initial.y,32+t*38,0,Math.PI*2);
    context.stroke();
  }
  context.restore();
}


function draw() {
  context.clearRect(0,0,canvas.width,canvas.height);
  drawBackground();
  // Far background drifts slower than the bike, making the valley feel deep.
  context.save();
  const parallax=-(state.camera.x-canvas.width/2)*.18;
  context.translate(parallax,0);
  for(let step=-1;step<=2;step++){
    context.save();
    context.translate(step*1000,0);
    drawMountains();
    context.restore();
  }
  context.restore();

  // Near scenery, ramp, hillside, rider and their shadow share one camera
  // projection. This is deliberately cosmetic: the physics stays in world
  // coordinates and the metres shown are never increased by camera zoom.
  context.save();
  const camera=state.camera;
  context.translate(canvas.width/2,canvas.height/2);
  context.scale(camera.zoom,camera.zoom);
  context.translate(-camera.x,-camera.y);
  drawSceneryDetails();
  context.save();
  context.translate(1000,0);
  drawSceneryDetails();
  context.restore();
  drawRamp();
  drawLandingHill();
  drawDistanceMarkers();
  drawFlightTrail();
  drawShadow();
  drawSpeedLines();
  drawTakeoffBeacon();
  if(state.impact?.pose && state.phase==="impact" && !prefersReducedMotion()){
    const shake=state.impact.pose.shake;
    context.translate(Math.sin(state.impact.elapsed*65)*shake,
      Math.cos(state.impact.elapsed*44)*shake*.58);
  }
  drawBike();
  drawLandingEffect();
  drawTumblingRider();
  context.restore();
}


function frame(now) {
  update(now);
  draw();

  if (
    state.phase === "inrun" ||
    state.phase === "flight" ||
    state.phase === "impact"
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

// All simultaneous inputs contribute to the same explicit direction.
// Releasing one held input never cancels a different held arrow or touch.
// Opposite directions cancel neutrally instead of oscillating.
const heldRotationKeys = new Set();
const heldButtonDirections = new Set();
const activeRotationPointers = new Map();
function syncRotationControl() {
  const pointers = [...activeRotationPointers.values()];
  const left = heldRotationKeys.has("ArrowLeft") ||
    heldButtonDirections.has(-1) || pointers.includes(-1);
  const right = heldRotationKeys.has("ArrowRight") ||
    heldButtonDirections.has(1) || pointers.includes(1);
  setRotationInput(state.phase === "flight" ? Number(right) - Number(left) : 0);
}
function clearAllRotationControls() {
  heldRotationKeys.clear();
  heldButtonDirections.clear();
  activeRotationPointers.clear();
  setRotationInput(0);
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName));
}

// Two-tap mode makes the first touch start the descent (instead of launching
// immediately on release) and the second touch trigger the jump.
// Press-and-hold remains available as an explicit alternative.
function tapAction() {
  if (state.phase === "ready") startRun();
  else if (state.phase === "inrun") requestLaunch();
}
function changeControlMode(next) {
  if (state.phase === "inrun" || state.phase === "flight") return;
  if (next !== "tap" && next !== "hold") return;
  state.controlMode = next;
  if (state.phase === "ready") {
    setLaunchLabel(next === "tap" ? "TOCA PER COMENÇAR" : "MANTÉN PER COMENÇAR");
    elements.stageHint.textContent = next === "tap"
      ? "Toca una vegada per baixar. Torna a tocar a la zona daurada."
      : "Mantén premut mentre baixes i deixa anar a la zona daurada.";
    elements.statusText.textContent = next === "tap"
      ? "Toca per començar el descens; torna a tocar per saltar."
      : "Mantén premut per baixar i deixa anar a la zona daurada.";
  }
  syncControlMode();
}

function handleSpaceDown(event) {
  if (event.code !== "Space" || event.repeat || isTypingTarget(event.target)) {
    return;
  }

  event.preventDefault();
  if (state.controlMode === "tap") tapAction();
  else startRun();
}

function handleSpaceUp(event) {
  if (event.code !== "Space" || isTypingTarget(event.target)) {
    return;
  }

  event.preventDefault();
  if (state.controlMode === "hold") requestLaunch();
}

document.addEventListener("keydown", event => {
  handleSpaceDown(event);
  if (state.phase === "flight" && !isTypingTarget(event.target) &&
      (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
    event.preventDefault();
    heldRotationKeys.add(event.code);
    syncRotationControl();
  }
});
document.addEventListener("keyup", event => {
  handleSpaceUp(event);
  if(event.code==="ArrowLeft" || event.code==="ArrowRight"){
    heldRotationKeys.delete(event.code);
    syncRotationControl();
  }
});
window.addEventListener("blur", () => {
  clearAllRotationControls();
  if (state.phase === "inrun") requestLaunch();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearAllRotationControls();
    if (state.phase === "inrun") requestLaunch();
  }
});

// Keyboard controls work both with and without the stage button focused.
elements.launchButton.addEventListener("keydown", event => {
  if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
    event.preventDefault();
    if (state.controlMode === "tap") tapAction();
    else startRun();
  }
});
elements.launchButton.addEventListener("keyup", event => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    if (state.controlMode === "hold") requestLaunch();
  }
});
elements.launchButton.addEventListener("pointerdown", event => {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  if (state.controlMode === "tap") tapAction();
  else {
    try { elements.launchButton.setPointerCapture(event.pointerId); }
    catch { /* fallback if pointer capture is unavailable */ }
    startRun();
  }
});
elements.launchButton.addEventListener("pointerup", event => {
  event.preventDefault();
  if (state.controlMode === "hold") requestLaunch();
});
elements.launchButton.addEventListener("pointercancel", () => {
  if (state.controlMode === "hold") requestLaunch();
});
elements.launchButton.addEventListener("lostpointercapture", () => {
  if (state.controlMode === "hold") requestLaunch();
});
elements.modeTapButton.addEventListener("click", () => changeControlMode("tap"));
elements.modeHoldButton.addEventListener("click", () => changeControlMode("hold"));
elements.challengeModeButton.addEventListener("click",()=>changeGameMode("challenge"));
elements.practiceModeButton.addEventListener("click",()=>changeGameMode("practice"));
elements.courseSelect.addEventListener("change",()=>changeCourse(elements.courseSelect.value));

function addRotationPointerControl(button,value) {
  // Track each pointer independently, including two simultaneous touches.
  button.addEventListener("pointerdown",event=>{
    if(state.phase!=="flight" || (event.button!=null && event.button!==0))return;
    event.preventDefault();
    try{button.setPointerCapture(event.pointerId);}catch{/* Some browsers do not support capture. */}
    activeRotationPointers.set(event.pointerId,value);
    syncRotationControl();
  });
  const release=event=>{
    activeRotationPointers.delete(event.pointerId);
    syncRotationControl();
  };
  button.addEventListener("pointerup",release);
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);
}

// Controls remain accessible from the keyboard even when the buttons have focus.
for(const [button,value] of [[elements.rotateLeftButton,-1],[elements.rotateRightButton,1]]){
  button.addEventListener("keydown",event=>{
    if((event.code==="Space" || event.code==="Enter") && state.phase==="flight"){
      event.preventDefault();
      heldButtonDirections.add(value);
      syncRotationControl();
    }
  });
  button.addEventListener("keyup",event=>{
    if(event.code==="Space" || event.code==="Enter"){
      event.preventDefault();
      heldButtonDirections.delete(value);
      syncRotationControl();
    }
  });
  button.addEventListener("blur",()=>{
    heldButtonDirections.delete(value);
    syncRotationControl();
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
