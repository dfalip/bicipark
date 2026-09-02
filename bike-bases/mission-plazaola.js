(() => {
  "use strict";

  const GPX_PATH = "./data/gpx/izarpe-route-5.gpx";
  const STORAGE_KEY = "bicipark-mission-plazaola-v1";

  const CHECKPOINT_POINTS = 200;
  const COMPLETE_BONUS = 500;
  const MAX_SCORE = 1500;

  const base = {
    lat: 42.93854,
    lng: -1.69241
  };

  /*
   * Geographic anchors.
   * After GPX load, each checkpoint is snapped to the nearest point
   * of the actual Route 5 track.
   */
  const checkpointDefinitions = [
    {
      id: "eraso",
      number: 1,
      name: "Eraso / EuroVelo 1",
      detail: "Connexio amb EuroVelo 1.",
      anchor: [42.94965, -1.80573],
      radiusM: 300
    },
    {
      id: "latasa",
      number: 2,
      name: "Latasa / Plazaola",
      detail: "Entrada a la Via Verde del Plazaola.",
      anchor: [42.95, -1.816667],
      radiusM: 300
    },
    {
      id: "irurtzun",
      number: 3,
      name: "Irurtzun / Dos Hermanas",
      detail: "Sector d'Irurtzun, prop de Dos Hermanas.",
      anchor: [42.918889, -1.835],
      radiusM: 350
    },
    {
      id: "san-bartolome",
      number: 4,
      name: "Sector San Bartolome",
      detail: "Sector de pista entre Osacar i Beorburu.",
      anchor: [42.919, -1.73],
      radiusM: 350
    },
    {
      id: "izarpe-finish",
      number: 5,
      name: "Retorn a Camping Izarpe",
      detail: "Completa la ruta tornant a la Bike Base.",
      anchor: [base.lat, base.lng],
      radiusM: 300
    }
  ];

  const els = {
    score: document.getElementById("scoreValue"),
    missionStatus: document.getElementById("missionStatus"),
    checkpointStatus: document.getElementById("checkpointStatus"),
    elapsedTime: document.getElementById("elapsedTime"),
    gpsStatus: document.getElementById("gpsStatus"),
    startBtn: document.getElementById("startMissionBtn"),
    gpsBtn: document.getElementById("gpsBtn"),
    resetBtn: document.getElementById("resetMissionBtn"),
    validateBtn: document.getElementById("validateCheckpointBtn"),
    demoBtn: document.getElementById("demoCheckpointBtn"),
    nextName: document.getElementById("nextCheckpointName"),
    nextDistance: document.getElementById("nextCheckpointDistance"),
    distanceToNext: document.getElementById("distanceToNext"),
    gpsAccuracy: document.getElementById("gpsAccuracy"),
    checkpointList: document.getElementById("checkpointList"),
    completeCard: document.getElementById("completeCard"),
    completeSummary: document.getElementById("completeSummary")
  };

  const map = L.map("missionMap", {
    preferCanvas: true
  }).setView([42.935, -1.755], 11);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  const state = {
    started: false,
    completed: false,
    completedIds: [],
    score: 0,
    startTimestamp: null,
    completedTimestamp: null,
    timerId: null,
    watchId: null,
    currentPosition: null,
    gpsAccuracy: null,
    routePoints: [],
    routeSegments: [],
    checkpoints: [],
    checkpointMarkers: [],
    routeLayer: null,
    userMarker: null,
    accuracyCircle: null
  };

  function haversineM(a, b) {
    const R = 6371000;
    const toRad = value => value * Math.PI / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(
      Math.sqrt(aa),
      Math.sqrt(1 - aa)
    );
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return "--";

    if (meters < 1000) {
      return Math.round(meters) + " m";
    }

    return (meters / 1000)
      .toFixed(1)
      .replace(".", ",") + " km";
  }

  function formatElapsed(ms) {
    const totalSeconds =
      Math.max(0, Math.floor(ms / 1000));

    const hours =
      Math.floor(totalSeconds / 3600);

    const minutes =
      Math.floor((totalSeconds % 3600) / 60);

    const seconds =
      totalSeconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":");
  }

  function parseGpx(text) {
    const xml = new DOMParser().parseFromString(
      text,
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("GPX invalid");
    }

    const segmentNodes =
      Array.from(xml.querySelectorAll("trkseg"));

    const segments = [];
    const allPoints = [];

    segmentNodes.forEach(segmentNode => {
      const points =
        Array.from(
          segmentNode.querySelectorAll(":scope > trkpt")
        )
          .map(node => ({
            lat: Number(node.getAttribute("lat")),
            lng: Number(node.getAttribute("lon"))
          }))
          .filter(point =>
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng)
          );

      if (points.length) {
        segments.push(points);
        allPoints.push(...points);
      }
    });

    if (!allPoints.length) {
      throw new Error("No GPX track points");
    }

    return {
      segments,
      allPoints
    };
  }

  function snapToTrack(anchor) {
    const target = {
      lat: anchor[0],
      lng: anchor[1]
    };

    let best = null;
    let bestDistance = Infinity;

    state.routePoints.forEach(point => {
      const distance = haversineM(target, point);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    });

    return {
      lat: best.lat,
      lng: best.lng,
      snapDistanceM: bestDistance
    };
  }

  function buildCheckpoints() {
    state.checkpoints =
      checkpointDefinitions.map(definition => {
        const snapped = snapToTrack(definition.anchor);

        return {
          ...definition,
          lat: snapped.lat,
          lng: snapped.lng,
          snapDistanceM: snapped.snapDistanceM
        };
      });
  }

  function checkpointIcon(checkpoint, index) {
    const complete =
      state.completedIds.includes(checkpoint.id);

    const next =
      !complete &&
      index === state.completedIds.length;

    const cls =
      complete
        ? "is-complete"
        : next
          ? "is-next"
          : "";

    return L.divIcon({
      className: "checkpoint-leaflet-icon",
      html:
        '<div class="checkpoint-map-marker ' +
        cls +
        '">' +
        (complete ? "&#10003;" : checkpoint.number) +
        "</div>",
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });
  }

  function renderCheckpointMarkers() {
    state.checkpointMarkers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });

    state.checkpointMarkers = [];

    state.checkpoints.forEach((checkpoint, index) => {
      const marker = L.marker(
        [checkpoint.lat, checkpoint.lng],
        {
          icon: checkpointIcon(checkpoint, index),
          zIndexOffset: 900 + index
        }
      );

      marker.bindPopup(
        "<strong>" +
        checkpoint.number +
        ". " +
        checkpoint.name +
        "</strong><br>" +
        checkpoint.detail +
        "<br>Radi: " +
        checkpoint.radiusM +
        " m"
      );

      marker.addTo(map);
      state.checkpointMarkers.push(marker);
    });
  }

  function renderCheckpointList() {
    const nextIndex = state.completedIds.length;

    els.checkpointList.innerHTML =
      state.checkpoints
        .map((checkpoint, index) => {
          const complete =
            state.completedIds.includes(checkpoint.id);

          const next =
            !complete &&
            index === nextIndex &&
            state.started &&
            !state.completed;

          const cls =
            complete
              ? " is-complete"
              : next
                ? " is-next"
                : "";

          const stateIcon =
            complete
              ? "&#10003;"
              : next
                ? "&#9679;"
                : "&#9675;";

          return (
            '<div class="checkpoint' + cls + '">' +
              '<div class="checkpoint-number">' +
                (complete ? "&#10003;" : checkpoint.number) +
              "</div>" +

              '<div class="checkpoint-copy">' +
                "<strong>" + checkpoint.name + "</strong>" +
                "<span>" + checkpoint.detail + "</span>" +
              "</div>" +

              '<div class="checkpoint-state">' +
                stateIcon +
              "</div>" +
            "</div>"
          );
        })
        .join("");
  }

  function nextCheckpoint() {
    return state.checkpoints[
      state.completedIds.length
    ] || null;
  }

  function currentDistanceToNext() {
    const checkpoint = nextCheckpoint();

    if (!checkpoint || !state.currentPosition) {
      return Infinity;
    }

    return haversineM(
      state.currentPosition,
      checkpoint
    );
  }

  function updateNextCheckpointUi() {
    const checkpoint = nextCheckpoint();

    if (!state.started) {
      els.nextName.textContent =
        "Inicia la missio";

      els.nextDistance.textContent = "--";
      els.distanceToNext.textContent = "--";
      els.validateBtn.disabled = true;
      els.validateBtn.textContent =
        "Encara massa lluny";

      return;
    }

    if (!checkpoint) {
      els.nextName.textContent =
        "Tots els checkpoints completats";

      els.nextDistance.textContent = "";
      els.distanceToNext.textContent = "--";
      els.validateBtn.disabled = true;
      els.validateBtn.textContent = "Completada";

      return;
    }

    els.nextName.textContent =
      checkpoint.number + ". " + checkpoint.name;

    const distance = currentDistanceToNext();

    if (Number.isFinite(distance)) {
      const formatted = formatDistance(distance);

      els.nextDistance.textContent =
        formatted +
        " · radi " +
        checkpoint.radiusM +
        " m";

      els.distanceToNext.textContent =
        formatted;

      const accuracy =
        Number.isFinite(state.gpsAccuracy)
          ? state.gpsAccuracy
          : 0;

      /*
       * Give some tolerance for normal phone GPS.
       * If reported accuracy is poor, validation radius grows slightly.
       */
      const effectiveRadius =
        checkpoint.radiusM +
        Math.min(100, Math.max(0, accuracy * 0.35));

      const valid =
        distance <= effectiveRadius;

      els.validateBtn.disabled = !valid;

      els.validateBtn.textContent =
        valid
          ? "Validar checkpoint"
          : "Encara massa lluny";
    } else {
      els.nextDistance.textContent =
        "Activa el GPS per calcular la distancia";

      els.distanceToNext.textContent = "--";
      els.validateBtn.disabled = true;
    }
  }

  function calculateScore() {
    const checkpointScore =
      state.completedIds.length *
      CHECKPOINT_POINTS;

    const completeBonus =
      state.completed
        ? COMPLETE_BONUS
        : 0;

    return Math.min(
      MAX_SCORE,
      checkpointScore + completeBonus
    );
  }

  function updateHud() {
    state.score = calculateScore();

    els.score.textContent =
      String(state.score);

    els.checkpointStatus.textContent =
      state.completedIds.length +
      " / " +
      state.checkpoints.length;

    if (state.completed) {
      els.missionStatus.textContent =
        "Completada";
    } else if (state.started) {
      els.missionStatus.textContent =
        "En curs";
    } else {
      els.missionStatus.textContent =
        "Preparada";
    }

    els.resetBtn.classList.toggle(
      "hidden",
      !state.started &&
      !state.completed
    );

    renderCheckpointList();
    renderCheckpointMarkers();
    updateNextCheckpointUi();
  }

  function elapsedMs() {
    if (!state.startTimestamp) return 0;

    const end =
      state.completedTimestamp ||
      Date.now();

    return end - state.startTimestamp;
  }

  function updateTimer() {
    els.elapsedTime.textContent =
      formatElapsed(elapsedMs());
  }

  function startTimer() {
    window.clearInterval(state.timerId);

    updateTimer();

    state.timerId =
      window.setInterval(
        updateTimer,
        1000
      );
  }

  function stopTimer() {
    window.clearInterval(state.timerId);
    state.timerId = null;
    updateTimer();
  }

  function saveState() {
    const data = {
      started: state.started,
      completed: state.completed,
      completedIds: state.completedIds,
      startTimestamp: state.startTimestamp,
      completedTimestamp: state.completedTimestamp
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  }

  function loadState() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const saved = JSON.parse(raw);

      state.started =
        saved.started === true;

      state.completed =
        saved.completed === true;

      state.completedIds =
        Array.isArray(saved.completedIds)
          ? saved.completedIds
          : [];

      state.startTimestamp =
        Number.isFinite(saved.startTimestamp)
          ? saved.startTimestamp
          : null;

      state.completedTimestamp =
        Number.isFinite(saved.completedTimestamp)
          ? saved.completedTimestamp
          : null;
    } catch (error) {
      console.warn(error);
    }
  }

  function startMission() {
    if (state.completed) {
      resetMission();
    }

    if (!state.started) {
      state.started = true;

      if (!state.startTimestamp) {
        state.startTimestamp =
          Date.now();
      }

      saveState();
    }

    els.startBtn.textContent =
      "Missio en curs";

    els.startBtn.disabled = true;

    startTimer();
    updateHud();
  }

  function validateCheckpoint() {
    if (!state.started || state.completed) {
      return;
    }

    const checkpoint = nextCheckpoint();

    if (!checkpoint) return;

    const distance = currentDistanceToNext();

    if (
      Number.isFinite(distance) &&
      distance > checkpoint.radiusM + 150
    ) {
      return;
    }

    if (
      !state.completedIds.includes(
        checkpoint.id
      )
    ) {
      state.completedIds.push(
        checkpoint.id
      );
    }

    if (
      state.completedIds.length >=
      state.checkpoints.length
    ) {
      state.completed = true;
      state.started = false;
      state.completedTimestamp = Date.now();

      stopTimer();

      els.completeCard.classList.remove(
        "hidden"
      );

      els.completeSummary.textContent =
        "Has completat els 5 checkpoints en " +
        formatElapsed(elapsedMs()) +
        " i has aconseguit 1.500 punts.";
    }

    saveState();
    updateHud();
  }

  function resetMission() {
    const confirmed =
      window.confirm(
        "Vols reiniciar la Missio Plazaola?"
      );

    if (!confirmed) return;

    state.started = false;
    state.completed = false;
    state.completedIds = [];
    state.score = 0;
    state.startTimestamp = null;
    state.completedTimestamp = null;

    stopTimer();

    localStorage.removeItem(STORAGE_KEY);

    els.startBtn.disabled = false;
    els.startBtn.textContent =
      "Iniciar missio";

    els.completeCard.classList.add(
      "hidden"
    );

    updateTimer();
    updateHud();
  }

  function updateUserMarker(position) {
    const latlng = [
      position.lat,
      position.lng
    ];

    if (!state.userMarker) {
      const icon = L.divIcon({
        className: "",
        html:
          '<div class="user-location-marker"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      state.userMarker =
        L.marker(
          latlng,
          {
            icon,
            zIndexOffset: 1300
          }
        ).addTo(map);
    } else {
      state.userMarker.setLatLng(latlng);
    }

    if (!state.accuracyCircle) {
      state.accuracyCircle =
        L.circle(
          latlng,
          {
            radius:
              Math.max(
                5,
                state.gpsAccuracy || 5
              ),
            color: "#2469d8",
            weight: 1,
            fillColor: "#2469d8",
            fillOpacity: .08
          }
        ).addTo(map);
    } else {
      state.accuracyCircle
        .setLatLng(latlng)
        .setRadius(
          Math.max(
            5,
            state.gpsAccuracy || 5
          )
        );
    }
  }

  function startGps() {
    if (!navigator.geolocation) {
      els.gpsStatus.textContent =
        "No disponible";
      return;
    }

    if (state.watchId != null) {
      navigator.geolocation.clearWatch(
        state.watchId
      );

      state.watchId = null;

      els.gpsBtn.textContent =
        "Activar GPS";

      els.gpsStatus.textContent =
        "Aturat";

      return;
    }

    els.gpsStatus.textContent =
      "Buscant...";

    state.watchId =
      navigator.geolocation.watchPosition(
        position => {
          state.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          state.gpsAccuracy =
            position.coords.accuracy;

          els.gpsStatus.textContent =
            "Actiu";

          els.gpsBtn.textContent =
            "Aturar GPS";

          els.gpsAccuracy.textContent =
            Math.round(
              position.coords.accuracy
            ) + " m";

          updateUserMarker(
            state.currentPosition
          );

          updateNextCheckpointUi();
        },

        error => {
          console.warn(error);

          els.gpsStatus.textContent =
            "Sense permisos";

          els.gpsBtn.textContent =
            "Activar GPS";
        },

        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 3000
        }
      );
  }

  function enableDemoMode() {
    const local =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";

    if (!local) return;

    els.demoBtn.classList.remove("hidden");

    els.demoBtn.addEventListener(
      "click",
      () => {
        if (!state.started) {
          startMission();
        }

        const checkpoint =
          nextCheckpoint();

        if (!checkpoint) return;

        state.currentPosition = {
          lat: checkpoint.lat,
          lng: checkpoint.lng
        };

        state.gpsAccuracy = 5;

        els.gpsAccuracy.textContent =
          "5 m (demo)";

        els.gpsStatus.textContent =
          "Demo";

        updateUserMarker(
          state.currentPosition
        );

        updateNextCheckpointUi();

        window.setTimeout(
          validateCheckpoint,
          180
        );
      }
    );
  }

  async function loadRoute() {
    try {
      const response = await fetch(
        GPX_PATH,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          "GPX Route 5 not found"
        );
      }

      const text =
        await response.text();

      const parsed = parseGpx(text);

      state.routeSegments =
        parsed.segments;

      state.routePoints =
        parsed.allPoints;

      state.routeLayer =
        L.polyline(
          parsed.segments.map(segment =>
            segment.map(point => [
              point.lat,
              point.lng
            ])
          ),
          {
            color: "#dc720c",
            weight: 5,
            opacity: .9,
            lineJoin: "round"
          }
        ).addTo(map);

      const bounds =
        state.routeLayer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(
          bounds.pad(.06)
        );
      }

      buildCheckpoints();
      loadState();

      if (state.completed) {
        els.completeCard.classList.remove(
          "hidden"
        );

        els.completeSummary.textContent =
          "Missio completada en " +
          formatElapsed(elapsedMs()) +
          ". Puntuacio: 1.500 punts.";
      }

      if (state.started) {
        els.startBtn.disabled = true;
        els.startBtn.textContent =
          "Missio en curs";

        startTimer();
      } else {
        updateTimer();
      }

      updateHud();
      enableDemoMode();

    } catch (error) {
      console.error(error);

      els.missionStatus.textContent =
        "Falta GPX";

      els.nextName.textContent =
        "No s'ha pogut carregar la Ruta 5";

      els.startBtn.disabled = true;
      els.gpsBtn.disabled = true;
    }
  }

  els.startBtn.addEventListener(
    "click",
    startMission
  );

  els.gpsBtn.addEventListener(
    "click",
    startGps
  );

  els.validateBtn.addEventListener(
    "click",
    validateCheckpoint
  );

  els.resetBtn.addEventListener(
    "click",
    resetMission
  );

  loadRoute();
})();
