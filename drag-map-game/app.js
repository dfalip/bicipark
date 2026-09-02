(() => {
  "use strict";

  const challenges = Array.isArray(window.BICIPARK_CHALLENGES)
    ? window.BICIPARK_CHALLENGES
    : [];

  const ROUND_TOTAL_SECONDS = 35;
  const NO_PENALTY_SECONDS = 5;
  const MIN_MULTIPLIER = 0.35;
  const DEFAULT_ROUNDS = 5;

  const els = {
    citySelect: document.getElementById("citySelect"),
    targetIcon: document.getElementById("targetIcon"),
    targetTitle: document.getElementById("targetTitle"),
    targetSubtitle: document.getElementById("targetSubtitle"),
    instructionText: document.getElementById("instructionText"),
    roundLabel: document.getElementById("roundLabel"),
    scoreLabel: document.getElementById("scoreLabel"),
    timerLabel: document.getElementById("timerLabel"),
    timerMultiplier: document.getElementById("timerMultiplier"),
    timeHeadline: document.getElementById("timeHeadline"),
    timeBarFill: document.getElementById("timeBarFill"),
    timeMultiplierInline: document.getElementById("timeMultiplierInline"),
    distanceCard: document.getElementById("distanceCard"),
    distanceLabel: document.getElementById("distanceLabel"),
    resultPanel: document.getElementById("resultPanel"),
    resultEmoji: document.getElementById("resultEmoji"),
    resultTitle: document.getElementById("resultTitle"),
    resultText: document.getElementById("resultText"),
    roundScore: document.getElementById("roundScore"),
    roundTimeUsed: document.getElementById("roundTimeUsed"),
    roundMultiplier: document.getElementById("roundMultiplier"),
    scaleDistanceValue: document.getElementById("scaleDistanceValue"),
    scaleMarker: document.getElementById("scaleMarker"),
    nextBtn: document.getElementById("nextBtn"),
    retryBtn: document.getElementById("retryBtn"),
    newGameBtn: document.getElementById("newGameBtn"),
    helpBtn: document.getElementById("helpBtn"),
    helpModal: document.getElementById("helpModal"),
    closeHelpBtn: document.getElementById("closeHelpBtn"),
    cityWatermark: document.getElementById("cityWatermark"),
    decorLayer: document.getElementById("decorLayer"),
    confettiLayer: document.getElementById("confettiLayer")
  };

  const cityViews = {
    all: { center: [46.3, 5.4], zoom: 5 },
    Barcelona: { center: [41.395, 2.16], zoom: 12 },
    "París": { center: [48.86, 2.335], zoom: 12 },
    Roma: { center: [41.9, 12.48], zoom: 12 }
  };

  // BICIPARK_DRAG_POLISH_V2
  const decorByCity = {
    Barcelona: [
      { icon: "🌴", label: "Parc Güell", x: 43, y: 12 },
      { icon: "🏰", label: "Montjuïc", x: 39, y: 76 },
      { icon: "🌊", label: "Barceloneta", x: 72, y: 66 }
    ],
    "París": [
      { icon: "⛪", label: "Montmartre", x: 58, y: 11 },
      { icon: "🏛️", label: "Invalides", x: 40, y: 66 },
      { icon: "🌳", label: "Tuileries", x: 63, y: 53 }
    ],
    Roma: [
      { icon: "⛲", label: "Trevi", x: 59, y: 40 },
      { icon: "⛪", label: "Vaticà", x: 36, y: 50 },
      { icon: "🏛️", label: "Foro Romano", x: 68, y: 63 }
    ]
  };

  function setDecor(city) {
    if (!els.decorLayer || !els.cityWatermark) return;

    els.decorLayer.innerHTML = "";
    els.cityWatermark.textContent =
      city === "París" ? "PARÍS" : String(city || "EUROPA").toUpperCase();

    (decorByCity[city] || []).forEach(item => {
      const badge = document.createElement("div");
      badge.className = "decor-badge";
      badge.style.left = `${item.x}%`;
      badge.style.top = `${item.y}%`;
      badge.innerHTML =
        `<span>${item.icon}</span><strong>${item.label}</strong>`;
      els.decorLayer.appendChild(badge);
    });
  }

  function launchConfetti(strength = 28) {
    if (!els.confettiLayer) return;

    const colors = [
      "#ef4e79",
      "#f5c64c",
      "#31b76b",
      "#8058e4",
      "#45a9df",
      "#f28f3b"
    ];

    els.confettiLayer.innerHTML = "";

    for (let i = 0; i < strength; i += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti-piece";
      piece.style.left = `${10 + Math.random() * 80}%`;
      piece.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * .28}s`;
      els.confettiLayer.appendChild(piece);
    }

    window.setTimeout(() => {
      if (els.confettiLayer) els.confettiLayer.innerHTML = "";
    }, 2000);
  }
  const state = {
    pool: [],
    roundIndex: 0,
    totalRounds: DEFAULT_ROUNDS,
    score: 0,
    current: null,
    answered: false,
    lastGuess: null,
    timerId: null,
    timeLeft: ROUND_TOTAL_SECONDS,
    timeStartedAt: null,
    guessMarker: null,
    realMarker: null,
    line: null,
    distanceMarker: null
  };

  const map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView(cityViews.all.center, cityViews.all.zoom);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(map);

  function iconPath(challenge) {
    return `./assets/icons/${challenge.iconKey}.svg`;
  }

  function difficultyLabel(value) {
    if (value === "easy") return "Nivell fàcil";
    if (value === "medium") return "Nivell mitjà";
    if (value === "hard") return "Nivell difícil";
    return "";
  }

  function shuffle(items) {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function filteredChallenges() {
    const city = els.citySelect.value;
    if (city === "all") return challenges;
    return challenges.filter(item => item.city === city);
  }

  function clearLayers() {
    [state.guessMarker, state.realMarker, state.line, state.distanceMarker]
      .filter(Boolean)
      .forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });

    state.guessMarker = null;
    state.realMarker = null;
    state.line = null;
    state.distanceMarker = null;
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function getTimeUsedSeconds() {
    return Math.max(0, ROUND_TOTAL_SECONDS - state.timeLeft);
  }

  function getTimerMultiplier() {
    const timeUsed = getTimeUsedSeconds();

    if (timeUsed <= NO_PENALTY_SECONDS) {
      return 1;
    }

    const penalizedSeconds = ROUND_TOTAL_SECONDS - NO_PENALTY_SECONDS;
    const elapsedPenalty = Math.min(
      penalizedSeconds,
      timeUsed - NO_PENALTY_SECONDS
    );

    const ratio = elapsedPenalty / penalizedSeconds;
    return Math.max(
      MIN_MULTIPLIER,
      1 - ratio * (1 - MIN_MULTIPLIER)
    );
  }

  function updateTimerUI() {
    const multiplier = getTimerMultiplier();
    const percent = Math.round(multiplier * 100);
    const progress = Math.max(0, Math.min(1, state.timeLeft / ROUND_TOTAL_SECONDS));

    els.timerLabel.textContent = String(state.timeLeft);
    els.timerMultiplier.textContent = `${percent}%`;
    els.timeHeadline.textContent = `${state.timeLeft}s`;
    els.timeMultiplierInline.textContent = `${percent}%`;
    els.timeBarFill.style.width = `${progress * 100}%`;

    const warning = state.timeLeft <= 10 && !state.answered;
    const timerPanel = document.querySelector(".time-box");
    const timerChip = document.querySelector(".timer-chip");

    if (timerPanel) {
      timerPanel.classList.toggle("timer-warning", warning);
    }

    if (timerChip) {
      timerChip.classList.toggle("timer-warning", warning);
    }

    if (progress > 0.55) {
      els.timeBarFill.style.filter = "none";
    } else if (progress > 0.25) {
      els.timeBarFill.style.filter = "saturate(1)";
    } else {
      els.timeBarFill.style.filter = "saturate(1.2)";
    }
  }

  function startTimer() {
    stopTimer();
    state.timeLeft = ROUND_TOTAL_SECONDS;
    state.timeStartedAt = Date.now();
    updateTimerUI();

    state.timerId = window.setInterval(() => {
      state.timeLeft = Math.max(
        0,
        ROUND_TOTAL_SECONDS - Math.floor((Date.now() - state.timeStartedAt) / 1000)
      );

      updateTimerUI();

      if (state.timeLeft <= 0) {
        stopTimer();

        if (!state.answered && state.current) {
          revealAnswer(map.getCenter(), { automatic: true });
        }
      }
    }, 250);
  }

  function resetRoundChrome() {
    els.distanceCard.classList.add("hidden");
    els.resultPanel.classList.add("hidden");
    clearLayers();
  }

  function startGame() {
    stopTimer();
    resetRoundChrome();

    const pool = filteredChallenges();

    if (!pool.length) {
      alert("No hi ha reptes per aquesta ciutat.");
      return;
    }

    state.pool = shuffle(pool);
    state.totalRounds = Math.min(DEFAULT_ROUNDS, state.pool.length);
    state.roundIndex = 0;
    state.score = 0;
    state.current = null;
    state.answered = false;
    state.lastGuess = null;

    els.scoreLabel.textContent = "0";

    const view = cityViews[els.citySelect.value] || cityViews.all;
    map.setView(view.center, view.zoom);

    showRound();
  }

  function showRound() {
    stopTimer();
    resetRoundChrome();

    if (state.roundIndex >= state.totalRounds) {
      showFinalResult();
      return;
    }

    state.current = state.pool[state.roundIndex];
    state.answered = false;
    state.lastGuess = null;

    const c = state.current;

    els.roundLabel.textContent = `${state.roundIndex + 1} / ${state.totalRounds}`;
    els.targetIcon.src = iconPath(c);
    els.targetIcon.alt = c.name;
    els.targetTitle.textContent = `${c.city} · ${c.name}`;
    els.targetSubtitle.textContent = c.subtitle || difficultyLabel(c.difficulty);
    els.instructionText.textContent = "Arrossega el mapa i fes clic al lloc on creus que és!";
    els.nextBtn.textContent =
      state.roundIndex === state.totalRounds - 1
        ? "Veure resultat →"
        : "Següent ronda →";

    const view = cityViews[c.city] || cityViews.all;
    map.setView(view.center, view.zoom);
    setDecor(c.city);

    startTimer();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function guessIcon() {
    return L.divIcon({
      className: "guess-location-icon",
      html:
        '<div class="guess-location">' +
          '<div class="guess-location-label">El teu clic</div>' +
          '<div class="guess-location-pin"></div>' +
        '</div>',
      iconSize: [120, 92],
      iconAnchor: [60, 84]
    });
  }

  function realLocationIcon(challenge) {
    return L.divIcon({
      className: "real-location-icon",
      html:
        '<div class="real-location">' +
          '<div class="real-location-card">' +
            `<img src="${iconPath(challenge)}" alt="${escapeHtml(challenge.name)}">` +
          '</div>' +
          `<div class="real-location-label">${escapeHtml(challenge.name)}</div>` +
        '</div>',
      iconSize: [186, 164],
      iconAnchor: [93, 156]
    });
  }

  function distanceBubbleIcon(distanceText) {
    return L.divIcon({
      className: "distance-bubble-icon",
      html:
        '<div class="distance-bubble">' +
          '<span>Has quedat a</span>' +
          `<strong>${distanceText}</strong>` +
        '</div>',
      iconSize: [170, 94],
      iconAnchor: [85, 47]
    });
  }

  function midpoint(a, b) {
    return [
      (a.lat + b.lat) / 2,
      (a.lng + b.lng) / 2
    ];
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  }

  function formatDistance(km) {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }

    return `${km.toFixed(1).replace(".", ",")} km`;
  }

  function resultCopy(distanceKm, automatic) {
    if (automatic) {
      return {
        emoji: "⏱️",
        title: "Temps esgotat",
        text: "No has arribat a fer clic a temps. T’hem mostrat la ubicació real."
      };
    }

    if (distanceKm <= 0.15) {
      return {
        emoji: "🤩",
        title: "Clavat!",
        text: "Has encertat gairebé al punt exacte."
      };
    }

    if (distanceKm <= 0.75) {
      return {
        emoji: "😄",
        title: "Excel·lent!",
        text: "Has quedat molt a prop de la ubicació real."
      };
    }

    if (distanceKm <= 2) {
      return {
        emoji: "🙂",
        title: "Molt bé!",
        text: "Has estat força a prop. Molt bona aproximació."
      };
    }

    if (distanceKm <= 5) {
      return {
        emoji: "🧐",
        title: "Bona aproximació",
        text: "Ja tens la zona ben situada."
      };
    }

    return {
      emoji: "🧭",
      title: "Una mica lluny",
      text: "Ara ja saps on és. La propera ronda anirà millor."
    };
  }

  function calculateRoundScore(distanceKm, multiplier, automatic) {
    if (automatic) return 0;

    const base = 1000 * Math.exp(-distanceKm / 6);
    return Math.max(0, Math.round(base * multiplier));
  }

  function scaleMarkerPercent(distanceKm) {
    // Com més lluny, més cap a l'esquerra.
    // 0 km = 100%, 8 km o més = 0%
    const ratio = Math.max(0, Math.min(1, 1 - distanceKm / 8));
    return ratio * 100;
  }

  function showScale(distanceKm) {
    const percent = scaleMarkerPercent(distanceKm);
    els.scaleMarker.style.left = `calc(${percent}% - 3px)`;
    els.scaleDistanceValue.textContent = formatDistance(distanceKm);
  }

  function revealAnswer(guessLatLng, options = {}) {
    if (state.answered || !state.current) {
      return;
    }

    stopTimer();

    const automatic = options.automatic === true;
    const c = state.current;
    const realLatLng = L.latLng(c.lat, c.lng);

    state.answered = true;
    state.lastGuess = guessLatLng;

    const distanceKm = haversineKm(
      guessLatLng.lat,
      guessLatLng.lng,
      c.lat,
      c.lng
    );

    const distanceText = formatDistance(distanceKm);
    const multiplier = getTimerMultiplier();
    const roundScore = calculateRoundScore(distanceKm, multiplier, automatic);
    const timeUsed = getTimeUsedSeconds();

    state.score += roundScore;
    els.scoreLabel.textContent = String(state.score);

    clearLayers();

    state.guessMarker = L.marker(guessLatLng, {
      icon: guessIcon(),
      keyboard: false,
      zIndexOffset: 1200
    }).addTo(map);

    state.realMarker = L.marker(realLatLng, {
      icon: realLocationIcon(c),
      keyboard: false,
      zIndexOffset: 1500
    }).addTo(map);

    state.line = L.polyline([guessLatLng, realLatLng], {
      color: "#ee4d79",
      weight: 4,
      opacity: .95,
      dashArray: "11, 11"
    }).addTo(map);

    state.distanceMarker = L.marker(midpoint(guessLatLng, realLatLng), {
      icon: distanceBubbleIcon(distanceText),
      keyboard: false,
      interactive: false,
      zIndexOffset: 1400
    }).addTo(map);

    els.distanceLabel.textContent = distanceText;
    els.distanceCard.classList.remove("hidden");

    const feedback = resultCopy(distanceKm, automatic);
    els.resultEmoji.textContent = feedback.emoji;
    els.resultTitle.textContent = feedback.title;
    els.resultText.textContent = feedback.text;
    els.roundScore.textContent = `${roundScore} ⭐`;
    els.roundTimeUsed.textContent = `${timeUsed}s`;
    els.roundMultiplier.textContent = `${Math.round(multiplier * 100)}%`;

    showScale(distanceKm);

    els.resultPanel.classList.remove("hidden");

    els.instructionText.textContent =
      automatic
        ? "S'ha acabat el temps. Mira la posició real i prova de nou a la següent ronda."
        : "La icona mostra ara la ubicació real. Compara-la amb el teu clic.";

    if (!automatic && distanceKm <= 2) {
      launchConfetti(distanceKm <= 0.75 ? 42 : 28);
    }

    const bounds = L.latLngBounds([guessLatLng, realLatLng]);
    map.fitBounds(bounds.pad(.35), { maxZoom: 14, animate: true });
  }

  function showFinalResult() {
    stopTimer();
    resetRoundChrome();

    state.current = null;
    state.answered = true;

    els.roundLabel.textContent = `${state.totalRounds} / ${state.totalRounds}`;
    els.targetIcon.src = "./assets/icons/finish.svg";
    els.targetTitle.textContent = "Partida acabada";
    els.targetSubtitle.textContent = `Puntuació final: ${state.score} punts`;
    els.instructionText.textContent = "Prem “Nova partida” o canvia de ciutat per tornar a jugar.";
    els.timerLabel.textContent = "0";
    els.timeHeadline.textContent = "0s";
    els.timerMultiplier.textContent = "100%";
    els.timeMultiplierInline.textContent = "100%";
    els.timeBarFill.style.width = "0%";

    els.resultEmoji.textContent = "🏆";
    els.resultTitle.textContent = "Resultat final";
    els.resultText.textContent = `Has completat ${state.totalRounds} rondes i has aconseguit ${state.score} punts.`;
    els.roundScore.textContent = `${state.score} ⭐`;
    els.roundTimeUsed.textContent = `${ROUND_TOTAL_SECONDS * state.totalRounds}s màx`;
    els.roundMultiplier.textContent = "—";
    els.scaleDistanceValue.textContent = "Final";
    els.scaleMarker.style.left = "calc(100% - 3px)";
    els.nextBtn.textContent = "Nova partida →";
    els.resultPanel.classList.remove("hidden");
  }

  map.on("click", event => {
    if (!state.current || state.answered) {
      return;
    }

    revealAnswer(event.latlng);
  });

  els.nextBtn.addEventListener("click", () => {
    if (state.current && state.answered) {
      state.roundIndex += 1;
      showRound();
      return;
    }

    startGame();
  });

  els.retryBtn.addEventListener("click", () => {
    if (state.current) {
      showRound();
    }
  });

  els.newGameBtn.addEventListener("click", startGame);
  els.citySelect.addEventListener("change", startGame);

  els.helpBtn.addEventListener("click", () => {
    els.helpModal.classList.remove("hidden");
  });

  els.closeHelpBtn.addEventListener("click", () => {
    els.helpModal.classList.add("hidden");
  });

  els.helpModal.addEventListener("click", event => {
    if (event.target === els.helpModal) {
      els.helpModal.classList.add("hidden");
    }
  });

  startGame();
})();

