(() => {
  "use strict";

  const PROFILE_KEY =
    "bicipark.routeMatch.profile.v1";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const STATE_KEY =
    "bicipark.myPlan.state.v1";

  const GOAL_LABELS = {
    millorar:
      "Millorar progressivament",

    dificultat:
      "Incrementar dificultat",

    passejar:
      "Passejar",

    repte:
      "Preparar un repte"
  };

  const WEEK_META = {
    1: {
      label:
        "Adaptaci\u00f3",

      objective:
        "crear base, millorar la resist\u00e8ncia i acostumar el cos al volum."
    },

    2: {
      label:
        "Construcci\u00f3",

      objective:
        "augmentar lleugerament el temps i consolidar una rutina estable."
    },

    3: {
      label:
        "Consolidaci\u00f3",

      objective:
        "fer la setmana m\u00e9s completa mantenint una intensitat controlada."
    },

    4: {
      label:
        "Objectiu",

      objective:
        "reduir una mica la c\u00e0rrega i arribar amb bones sensacions a la ruta objectiu."
    }
  };

  const TIPS = [
    "Beu petits glops d'aigua cada 15-20 minuts i menja alguna cosa cada 60 minuts.",
    "Mant\u00e9 les sessions suaus realment suaus. La const\u00e0ncia \u00e9s m\u00e9s important que la intensitat.",
    "Si avui tens les cames carregades, baixa el ritme. El pla s'adapta millor quan respectes la recuperaci\u00f3.",
    "Abans de sortir, revisa pressi\u00f3 dels pneum\u00e0tics, aigua i previsi\u00f3 meteorol\u00f2gica."
  ];

  const state = {
    week: 1,
    route: null,
    profile: null,
    plan: null,
    progress: null,
    map: null,
    routeLayer: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function num(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  function formatNumber(value) {
    const n =
      Number(value);

    if (!Number.isFinite(n)) {
      return "--";
    }

    return n
      .toFixed(
        n % 1 === 0
          ? 0
          : 1
      )
      .replace(".", ",");
  }

  function formatMinutes(minutes) {
    const value =
      Math.max(
        0,
        Math.round(
          num(minutes)
        )
      );

    if (value < 60) {
      return value + " min";
    }

    const h =
      Math.floor(
        value / 60
      );

    const m =
      value % 60;

    return (
      h +
      "h" +
      (
        m
          ? " " +
            m +
            "m"
          : ""
      )
    );
  }

  function goalLabel(goal) {
    return (
      GOAL_LABELS[goal] ||
      GOAL_LABELS.millorar
    );
  }

  function defaultProfile() {
    return {
      level:
        "Intermedi",

      daysPerWeek:
        3,

      goal:
        "millorar",

      terrain:
        "Carretera + Gravel",

      usualDistanceMin:
        30,

      usualDistanceMax:
        50,

      usualElevationMin:
        400,

      usualElevationMax:
        800,

      weeklyTimeHours:
        5
    };
  }

  function readProfile() {
    if (
      window.BiciParkRiderProfile
        ?.get
    ) {
      return (
        window.BiciParkRiderProfile
          .get()
      );
    }

    try {
      const raw =
        localStorage.getItem(
          PROFILE_KEY
        );

      return raw
        ? {
            ...defaultProfile(),
            ...JSON.parse(raw)
          }
        : defaultProfile();
    }
    catch (_) {
      return defaultProfile();
    }
  }

  function saveProfile(next) {
    state.profile = {
      ...state.profile,
      ...next
    };

    if (
      window.BiciParkRiderProfile
        ?.set
    ) {
      window.BiciParkRiderProfile
        .set(
          state.profile
        );
    }
    else {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(
          state.profile
        )
      );
    }

    renderAll();
  }

  function readPlan() {
    try {
      const raw =
        localStorage.getItem(
          PLAN_KEY
        );

      if (!raw) {
        return {
          active:
            false,

          routes:
            [],

          focusRouteId:
            null
        };
      }

      const data =
        JSON.parse(raw);

      return {
        ...data,
        routes:
          Array.isArray(
            data.routes
          )
            ? data.routes
            : []
      };
    }
    catch (_) {
      return {
        active:
          false,
        routes:
          [],
        focusRouteId:
          null
      };
    }
  }

  function savePlan(plan) {
    state.plan = {
      ...plan,
      updatedAt:
        new Date()
          .toISOString()
    };

    localStorage.setItem(
      PLAN_KEY,
      JSON.stringify(
        state.plan
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:training-plan:updated",
        {
          detail:
            state.plan
        }
      )
    );
  }

  function defaultState() {
    return {
      currentWeek:
        1,

      selectedWeek:
        1,

      completedWeeks:
        [],

      sessions:
        {},

      createdAt:
        new Date()
          .toISOString()
    };
  }

  function readProgress() {
    try {
      const raw =
        localStorage.getItem(
          STATE_KEY
        );

      if (!raw) {
        return defaultState();
      }

      const data =
        JSON.parse(raw);

      return {
        ...defaultState(),
        ...data,
        sessions:
          data.sessions ||
          {}
      };
    }
    catch (_) {
      return defaultState();
    }
  }

  function saveProgress() {
    state.progress.updatedAt =
      new Date()
        .toISOString();

    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(
        state.progress
      )
    );
  }

  function routeFromPlan() {
    const routes =
      state.plan?.routes ||
      [];

    if (!routes.length) {
      return null;
    }

    return (
      routes.find(
        route =>
          route.id ===
          state.plan.focusRouteId
      ) ||
      routes[
        routes.length - 1
      ]
    );
  }

  function routeFromCatalog(routeId) {
    const catalog =
      window.BiciParkRouteDetailData ||
      {};

    return catalog[
      routeId
    ] ||
    null;
  }

  function effectiveRoute() {
    const planRoute =
      routeFromPlan();

    if (planRoute) {
      const catalogRoute =
        routeFromCatalog(
          planRoute.id
        );

      return {
        ...(catalogRoute || {}),
        ...planRoute
      };
    }

    const catalog =
      window.BiciParkRouteDetailData ||
      {};

    const first =
      Object.keys(catalog)[0];

    if (first) {
      return catalog[first];
    }

    return {
      id:
        "carretera-aigues",

      name:
        "Carretera de les Aig\u00fces",

      distanceKm:
        18.4,

      ascentM:
        270,

      difficulty:
        "medium",

      difficultyLabel:
        "Mitjana",

      modality:
        "Carretera",

      routeType:
        "Anada i tornada",

      estimatedTime:
        "2:15 h",

      compatibilityScore:
        88,

      geometryCandidates:
        []
    };
  }

  function compatibilityScore() {
    return clamp(
      num(
        state.route
          ?.compatibilityScore,
        88
      ),
      1,
      99
    );
  }

  function compatibilityText() {
    const score =
      compatibilityScore();

    if (score >= 90) {
      return "Ruta molt adequada per al teu nivell actual.";
    }

    if (score >= 80) {
      return "Ruta adequada amb un nivell de repte raonable.";
    }

    if (score >= 65) {
      return "Bona opci\u00f3, amb algun factor a vigilar.";
    }

    return "Ruta exigent: millor arribar-hi de manera progressiva.";
  }

  function difficultyLabel() {
    const raw =
      clean(
        state.route
          ?.difficultyLabel
      );

    if (raw) {
      return raw;
    }

    const code =
      clean(
        state.route
          ?.difficulty
      )
        .toLowerCase();

    if (code === "easy") {
      return "F\u00e0cil";
    }

    if (code === "hard") {
      return "Dif\u00edcil";
    }

    return "Mitjana";
  }

  function targetRatioForWeek(week) {
    const score =
      compatibilityScore();

    if (score < 65) {
      return [
        .50,
        .60,
        .72,
        .82
      ][week - 1];
    }

    return [
      .62,
      .76,
      .90,
      1
    ][week - 1];
  }

  function sessionDescriptions(week) {
    const goal =
      state.profile.goal ||
      "millorar";

    const base = {
      type:
        "Base aer\u00f2bica",

      subtitle:
        "Sortida suau",

      description:
        week === 1
          ? "Ritme molt c\u00f2mode. Conversaci\u00f3 f\u00e0cil."
          : (
              week === 2
                ? "Ritme c\u00f2mode i constant, sense for\u00e7ar."
                : (
                    week === 3
                      ? "Una mica m\u00e9s de temps, mantenint ritme controlat."
                      : "Sortida molt suau per arribar fresc a la ruta objectiu."
                  )
            ),

      duration:
        [
          "45-50 min",
          "50-55 min",
          "55-65 min",
          "35-45 min"
        ][week - 1],

      intensity:
        "easy"
    };

    let specific;

    if (goal === "passejar") {
      specific = {
        type:
          "Cad\u00e8ncia c\u00f2moda",

        subtitle:
          "Treball t\u00e8cnic",

        description:
          week <= 2
            ? "Pedala rod\u00f3, sense buscar velocitat."
            : "Petits canvis de ritme mantenint comoditat.",

        duration:
          [
            "35-40 min",
            "40-45 min",
            "45-50 min",
            "30-35 min"
          ][week - 1],

        intensity:
          "easy"
      };
    }
    else if (goal === "dificultat") {
      specific = {
        type:
          "Pujades controlades",

        subtitle:
          "Treball espec\u00edfic",

        description:
          week === 1
            ? "4 x 2 min en pujada suau. Recupera completament."
            : (
                week === 2
                  ? "5 x 3 min en pujada controlada."
                  : (
                      week === 3
                        ? "6 x 3 min en pujada moderada."
                        : "3 x 2 min per activar les cames."
                    )
              ),

        duration:
          [
            "40-45 min",
            "45-50 min",
            "50-55 min",
            "30-35 min"
          ][week - 1],

        intensity:
          "moderate"
      };
    }
    else {
      specific = {
        type:
          "Cad\u00e8ncia + ritme",

        subtitle:
          "Treball t\u00e8cnic",

        description:
          week === 1
            ? "6 x 3 min a ritme moderat, cad\u00e8ncia alta. 3 min suaus."
            : (
                week === 2
                  ? "3 blocs de 6 min a ritme moderat."
                  : (
                      week === 3
                        ? "2 blocs de 12 min a ritme moderat sostingut."
                        : "Activaci\u00f3 curta: 4 x 2 min alegres."
                    )
              ),

        duration:
          [
            "45-50 min",
            "45-55 min",
            "50-60 min",
            "30-40 min"
          ][week - 1],

        intensity:
          "moderate"
      };
    }

    const ratio =
      targetRatioForWeek(
        week
      );

    const targetDistance =
      num(
        state.route
          ?.distanceKm
      ) *
      ratio;

    const targetAscent =
      num(
        state.route
          ?.ascentM
      ) *
      ratio;

    const target = {
      type:
        week === 4
          ? "Ruta objectiu"
          : "Progressi\u00f3 ruta",

      subtitle:
        clean(
          state.route
            ?.modality
        ) ||
        "Ciclisme",

      description:
        week === 4
          ? clean(
              state.route
                ?.name
            )
          : (
              clean(
                state.route
                  ?.name
              ) +
              " \u00b7 " +
              Math.round(
                ratio *
                100
              ) +
              "% aproximat"
            ),

      /*
       * v1.2: duration and distance are independent fields.
       * Previous versions accidentally placed targetDistance in
       * session.duration for weeks 1-3.
       */
      duration:
        state.route
          ?.estimatedTime
          ? formatMinutes(
              Math.max(
                20,
                Math.round(
                  parseDurationMinutes(
                    state.route
                      .estimatedTime
                  ) *
                  ratio
                )
              )
            )
          : formatMinutes(
              Math.max(
                30,
                Math.round(
                  targetDistance *
                  5
                )
              )
            ),

      intensity:
        "target",

      targetDistance,
      targetAscent
    };

    return {
      base,
      specific,
      target
    };
  }

  function weekSessions(week) {
    const descriptions =
      sessionDescriptions(
        week
      );

    const desiredDays =
      clamp(
        num(
          state.profile
            ?.daysPerWeek,
          3
        ),
        1,
        5
      );

    const pool = [
      {
        id:
          "base",
        day:
          "Dimarts",
        ...descriptions.base,
        priority:
          1
      },

      {
        id:
          "specific",
        day:
          "Dijous",
        ...descriptions.specific,
        priority:
          2
      },

      {
        id:
          "target",
        day:
          "Dissabte",
        ...descriptions.target,
        priority:
          0
      },

      {
        id:
          "recovery",
        day:
          "Diumenge",
        type:
          "Recuperaci\u00f3 activa",
        subtitle:
          "Molt suau",
        description:
          "Pedalada curta o caminada. Sensaci\u00f3 f\u00e0cil.",
        duration:
          "30-40 min",
        intensity:
          "easy",
        priority:
          3
      },

      {
        id:
          "core",
        day:
          "Dilluns",
        type:
          "Core + mobilitat",
        subtitle:
          "Exercici b\u00e0sic",
        description:
          "Treball senzill de tronc, malucs i mobilitat.",
        duration:
          "15-20 min",
        intensity:
          "easy",
        priority:
          4
      }
    ];

    return pool
      .filter(
        item =>
          item.priority <
          desiredDays
      )
      .sort(
        (a, b) => {
          const order = {
            Dilluns: 1,
            Dimarts: 2,
            Dijous: 4,
            Dissabte: 6,
            Diumenge: 7
          };

          return (
            order[a.day] -
            order[b.day]
          );
        }
      );
  }

  function sessionKey(
    week,
    sessionId
  ) {
    return (
      "w" +
      week +
      ":" +
      sessionId
    );
  }

  function isSessionDone(
    week,
    sessionId
  ) {
    return Boolean(
      state.progress
        .sessions[
          sessionKey(
            week,
            sessionId
          )
        ]
    );
  }

  async function toggleSession(
    week,
    sessionId
  ) {
    const key =
      sessionKey(
        week,
        sessionId
      );

    const nextDone =
      !state.progress
        .sessions[key];

    state.progress
      .sessions[key] =
      nextDone;

    saveProgress();
    renderWeek();
    renderProgressCards();

    const session =
      weekSessions(week)
        .find(
          item =>
            item.id ===
            sessionId
        );

    if (
      !window.BiciParkActivitySync ||
      !session
    ) {
      return;
    }

    /*
     * Core/mobility can be completed in the training plan but it is
     * not a cycling activity, so it does not enter Activity History.
     */
    if (
      session.id ===
      "core"
    ) {
      return;
    }

    if (!nextDone) {
      window
        .BiciParkActivitySync
        .unlinkPlanSession(
          key
        );

      renderProgressCards();
      return;
    }

    const existing =
      window
        .BiciParkActivitySync
        .findBySessionKey(
          key
        );

    if (existing) {
      window
        .BiciParkActivitySync
        .linkPlanSession(
          key
        );

      renderProgressCards();
      return;
    }

    await window
      .BiciParkActivitySync
      .capturePlanSession({
        week,
        sessionKey: key,
        session,
        route: state.route,
        profile: state.profile
      });

    renderProgressCards();
  }

  function weekCompletionRatio(week) {
    const sessions =
      weekSessions(week);

    if (!sessions.length) {
      return 0;
    }

    const done =
      sessions.filter(
        session =>
          isSessionDone(
            week,
            session.id
          )
      )
        .length;

    return (
      done /
      sessions.length
    );
  }

  function overallProgress() {
    let total = 0;

    for (
      let week = 1;
      week <= 4;
      week++
    ) {
      total +=
        weekCompletionRatio(
          week
        );
    }

    return (
      total /
      4
    );
  }

  function parseDurationMinutes(text) {
    const value =
      clean(text);

    const colon =
      value.match(
        /(\d+)\s*:\s*(\d+)/
      );

    if (colon) {
      return (
        Number(colon[1]) *
        60 +
        Number(colon[2])
      );
    }

    const hours =
      value.match(
        /(\d+(?:[.,]\d+)?)\s*h/
      );

    if (hours) {
      return (
        Number(
          hours[1]
            .replace(",", ".")
        ) *
        60
      );
    }

    const range =
      value.match(
        /(\d+)\s*-\s*(\d+)\s*min/
      );

    if (range) {
      return (
        (
          Number(range[1]) +
          Number(range[2])
        ) /
        2
      );
    }

    const minutes =
      value.match(
        /(\d+)\s*min/
      );

    if (minutes) {
      return Number(
        minutes[1]
      );
    }

    return 0;
  }

  function currentWeekMetrics() {
    /*
     * "El teu progres" now reflects REAL activities, not planned
     * sessions. The training plan percentage remains session-based.
     */
    if (
      window.BiciParkActivitySync
    ) {
      const real =
        window
          .BiciParkActivitySync
          .recentRealMetrics(7);

      return {
        rides:
          real.rides,
        minutes:
          real.minutes,
        ascent:
          real.ascent
      };
    }

    return {
      rides: 0,
      minutes: 0,
      ascent: 0
    };
  }

  function weekScore(week) {
    return (
      18 +
      weekCompletionRatio(week) *
      62 +
      (
        state.progress
          .completedWeeks
          .includes(week)
          ? 15
          : 0
      )
    );
  }

  function showToast(text) {
    const toast =
      byId(
        "bp-toast"
      );

    if (!toast) {
      return;
    }

    toast.textContent =
      text;

    toast.classList.add(
      "is-visible"
    );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          toast.classList
            .remove(
              "is-visible"
            );
        },
        2600
      );
  }

  function renderHeader() {
    byId(
      "bp-level-label"
    ).textContent =
      clean(
        state.profile
          ?.level
      ) ||
      "Intermedi";

    byId(
      "bp-goal-chip"
    ).textContent =
      goalLabel(
        state.profile
          ?.goal
      );

    const days =
      clamp(
        num(
          state.profile
            ?.daysPerWeek,
          3
        ),
        1,
        7
      );

    byId(
      "bp-days-chip"
    ).textContent =
      days +
      " dies / setmana";

    byId(
      "bp-summary-days"
    ).textContent =
      days +
      " dies";

    const tip =
      TIPS[
        (
          new Date()
            .getDate() -
          1
        ) %
        TIPS.length
      ];

    byId(
      "bp-tip-text"
    ).textContent =
      tip;
  }

  function renderRoute() {
    const route =
      state.route;

    byId(
      "bp-route-name"
    ).textContent =
      clean(
        route.name
      ) ||
      "Ruta objectiu";

    const distance =
      num(
        route.distanceKm
      );

    const ascent =
      num(
        route.ascentM
      );

    const modality =
      clean(
        route.modality
      ) ||
      "Ciclisme";

    const routeType =
      clean(
        route.routeType
      ) ||
      (
        route.id ===
        "carretera-aigues"
          ? "Anada i tornada"
          : "Ruta"
      );

    byId(
      "bp-route-meta"
    ).innerHTML =
      "<span>&#9873; " +
        formatNumber(
          distance
        ) +
        " km</span>" +
      "<span>&#9651; " +
        Math.round(
          ascent
        ) +
        " m+</span>" +
      "<span>&#128692; " +
        modality +
        "</span>" +
      "<span>&#8634; " +
        routeType +
        "</span>";

    byId(
      "bp-route-reason"
    ).textContent =
      "\u2726 " +
      compatibilityText();

    const score =
      compatibilityScore();

    byId(
      "bp-route-score"
    ).textContent =
      score +
      "%";

    byId(
      "bp-side-score"
    ).textContent =
      score +
      "%";

    byId(
      "bp-side-match-copy"
    ).textContent =
      compatibilityText();

    const detailLink =
      byId(
        "bp-route-detail-link"
      );

    detailLink.href =
      "../route-detail/?route=" +
      encodeURIComponent(
        route.id ||
        ""
      );

    renderMap();
  }

  function routeGeometryUrls() {
    const candidates =
      Array.isArray(
        state.route
          ?.geometryCandidates
      )
        ? state.route
            .geometryCandidates
        : [];

    const base =
      new URL(
        "../route-detail/",
        window.location.href
      );

    return candidates.map(
      candidate => {
        try {
          return new URL(
            candidate,
            base
          ).href;
        }
        catch (_) {
          return candidate;
        }
      }
    );
  }

  function geoJsonSegments(data) {
    const segments = [];

    function addGeometry(geometry) {
      if (!geometry) {
        return;
      }

      if (
        geometry.type ===
        "LineString"
      ) {
        segments.push(
          geometry.coordinates
        );
      }
      else if (
        geometry.type ===
        "MultiLineString"
      ) {
        geometry.coordinates
          .forEach(
            segment =>
              segments.push(
                segment
              )
          );
      }
    }

    if (
      data?.type ===
      "FeatureCollection"
    ) {
      data.features
        .forEach(
          feature =>
            addGeometry(
              feature.geometry
            )
        );
    }
    else if (
      data?.type ===
      "Feature"
    ) {
      addGeometry(
        data.geometry
      );
    }
    else {
      addGeometry(data);
    }

    return segments;
  }

  function gpxSegments(text) {
    const doc =
      new DOMParser()
        .parseFromString(
          text,
          "application/xml"
        );

    const trkseg =
      Array.from(
        doc.querySelectorAll(
          "trkseg"
        )
      );

    if (trkseg.length) {
      return trkseg
        .map(segment =>
          Array.from(
            segment.querySelectorAll(
              "trkpt"
            )
          )
            .map(node => [
              Number(
                node.getAttribute(
                  "lon"
                )
              ),
              Number(
                node.getAttribute(
                  "lat"
                )
              )
            ])
            .filter(coord =>
              Number.isFinite(
                coord[0]
              ) &&
              Number.isFinite(
                coord[1]
              )
            )
        )
        .filter(
          segment =>
            segment.length > 1
        );
    }

    return [];
  }

  async function loadRouteSegments() {
    const urls =
      routeGeometryUrls();

    for (const url of urls) {
      try {
        const response =
          await fetch(
            url,
            {
              cache:
                "no-store"
            }
          );

        if (!response.ok) {
          continue;
        }

        const cleanUrl =
          url
            .split("?")[0]
            .toLowerCase();

        if (
          cleanUrl.endsWith(
            ".json"
          ) ||
          cleanUrl.endsWith(
            ".geojson"
          )
        ) {
          const data =
            await response.json();

          const segments =
            geoJsonSegments(
              data
            );

          if (segments.length) {
            return segments;
          }
        }
        else if (
          cleanUrl.endsWith(
            ".gpx"
          )
        ) {
          const text =
            await response.text();

          const segments =
            gpxSegments(
              text
            );

          if (segments.length) {
            return segments;
          }
        }
      }
      catch (_) {}
    }

    return [];
  }

  async function renderMap() {
    const mapNode =
      byId(
        "bp-plan-map"
      );

    if (
      !mapNode ||
      !window.L
    ) {
      return;
    }

    if (
      state.map
    ) {
      state.map.remove();
      state.map = null;
    }

    state.map =
      L.map(
        mapNode,
        {
          zoomControl:
            false,
          attributionControl:
            false,
          dragging:
            false,
          scrollWheelZoom:
            false,
          doubleClickZoom:
            false,
          boxZoom:
            false,
          keyboard:
            false,
          tap:
            false
        }
      )
        .setView(
          [
            41.405,
            2.115
          ],
          12
        );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom:
          19
      }
    )
      .addTo(
        state.map
      );

    const segments =
      await loadRouteSegments();

    if (!segments.length) {
      return;
    }

    const latLngs =
      segments
        .flat()
        .map(coord => [
          Number(
            coord[1]
          ),
          Number(
            coord[0]
          )
        ])
        .filter(
          coord =>
            Number.isFinite(
              coord[0]
            ) &&
            Number.isFinite(
              coord[1]
            )
        );

    segments.forEach(
      segment => {
        L.polyline(
          segment.map(
            coord => [
              Number(
                coord[1]
              ),
              Number(
                coord[0]
              )
            ]
          ),
          {
            color:
              "#f07c00",
            weight:
              5,
            opacity:
              .96
          }
        )
          .addTo(
            state.map
          );
      }
    );

    if (latLngs.length) {
      state.map.fitBounds(
        L.latLngBounds(
          latLngs
        ),
        {
          padding:
            [12, 12]
        }
      );
    }
  }

  function renderWeekTabs() {
    const selected =
      state.progress
        .selectedWeek;

    document
      .querySelectorAll(
        "#bp-week-tabs button"
      )
      .forEach(button => {
        const week =
          Number(
            button.dataset.week
          );

        button.classList
          .toggle(
            "is-active",
            week ===
            selected
          );
      });
  }

  function intensityHtml(
    intensity
  ) {
    const label =
      intensity ===
      "target"
        ? "Moderada/Alta"
        : (
            intensity ===
            "moderate"
              ? "Moderada"
              : "F\u00e0cil"
          );

    return (
      '<div class="bp-intensity ' +
      "is-" +
      intensity +
      '">' +
        "<i></i><i></i><i></i><i></i><i></i>" +
      "</div>" +
      '<span class="bp-intensity-label">' +
        label +
      "</span>"
    );
  }

  function renderWeek() {
    state.week =
      state.progress
        .selectedWeek;

    renderWeekTabs();

    const week =
      state.week;

    const meta =
      WEEK_META[week];

    byId(
      "bp-current-week-title"
    ).textContent =
      "Setmana " +
      week +
      " de 4 \u00b7 " +
      meta.label;

    byId(
      "bp-week-objective"
    ).textContent =
      "Objectiu: " +
      meta.objective;

    const sessions =
      weekSessions(
        week
      );

    const rows =
      byId(
        "bp-session-rows"
      );

    rows.innerHTML =
      "";

    sessions.forEach(
      (
        session,
        index
      ) => {
        const done =
          isSessionDone(
            week,
            session.id
          );

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "bp-session-row is-" +
          session.intensity;

        row.innerHTML =
          '<div class="bp-session-cell">' +
            "<strong>" +
              session.day +
            "</strong>" +
            "<small>Sessi\u00f3 " +
              (
                index +
                1
              ) +
            "</small>" +
          "</div>" +

          '<div class="bp-session-cell">' +
            "<strong>" +
              session.type +
            "</strong>" +
            "<small>" +
              session.subtitle +
            "</small>" +
          "</div>" +

          '<div class="bp-session-description">' +
            session.description +
          "</div>" +

          '<div class="bp-session-cell">' +
            "<strong>" +
              session.duration +
            "</strong>" +
            "<small>" +
              (
                session.id ===
                "target"
                  ? (
                      formatNumber(
                        session.targetDistance ||
                        state.route
                          .distanceKm
                      ) +
                      " km"
                    )
                  : "\u2014"
              ) +
            "</small>" +
          "</div>" +

          "<div>" +
            intensityHtml(
              session.intensity
            ) +
          "</div>" +

          '<div>' +
            '<button class="bp-session-status ' +
              (
                done
                  ? "is-done"
                  : ""
              ) +
              '" type="button" data-session="' +
              session.id +
            '">' +
              (
                done
                  ? "\u2713 Fet"
                  : "\u25cb Per fer"
              ) +
            "</button>" +
          "</div>";

        rows.appendChild(
          row
        );
      });

    rows
      .querySelectorAll(
        "[data-session]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            toggleSession(
              week,
              button.dataset
                .session
            );
          }
        );
      });

    renderProgressHeader();
  }

  function renderProgressHeader() {
    const overall =
      overallProgress();

    const percent =
      Math.round(
        overall *
        100
      );

    byId(
      "bp-progress-percent"
    ).textContent =
      percent +
      "%";

    byId(
      "bp-progress-bar"
    ).style.width =
      percent +
      "%";

    const currentWeek =
      clamp(
        num(
          state.progress
            .currentWeek,
          1
        ),
        1,
        4
      );

    let totalSessions =
      0;

    let completedSessions =
      0;

    for (
      let week = 1;
      week <= 4;
      week++
    ) {
      const sessions =
        weekSessions(
          week
        );

      totalSessions +=
        sessions.length;

      completedSessions +=
        sessions.filter(
          session =>
            isSessionDone(
              week,
              session.id
            )
        ).length;
    }

    byId(
      "bp-progress-caption"
    ).textContent =
      "Setmana actual: " +
      currentWeek +
      " de 4 \u00b7 " +
      completedSessions +
      " de " +
      totalSessions +
      " sessions completades";
  }

  function renderProgressCards() {
    const metrics =
      currentWeekMetrics();

    byId(
      "bp-progress-rides"
    ).textContent =
      metrics.rides;

    byId(
      "bp-progress-time"
    ).textContent =
      formatMinutes(
        metrics.minutes
      );

    byId(
      "bp-progress-ascent"
    ).textContent =
      metrics.ascent +
      " m+";

    const points = [
      [
        24,
        54 -
        weekScore(1) *
        .35
      ],
      [
        96,
        54 -
        weekScore(2) *
        .35
      ],
      [
        168,
        54 -
        weekScore(3) *
        .35
      ],
      [
        244,
        54 -
        weekScore(4) *
        .35
      ]
    ];

    byId(
      "bp-evolution-line"
    )
      .setAttribute(
        "points",
        points
          .map(point =>
            point
              .map(value =>
                Math.round(
                  value
                )
              )
              .join(",")
          )
          .join(" ")
      );

    points.forEach(
      (
        point,
        index
      ) => {
        const circle =
          byId(
            "bp-evo-c" +
            (
              index +
              1
            )
          );

        circle.setAttribute(
          "cy",
          Math.round(
            point[1]
          )
        );
      }
    );
  }

  function completeSelectedWeek() {
    const week =
      state.progress
        .selectedWeek;

    const sessions =
      weekSessions(
        week
      );

    sessions.forEach(
      session => {
        state.progress
          .sessions[
            sessionKey(
              week,
              session.id
            )
          ] =
          true;
      }
    );

    if (
      !state.progress
        .completedWeeks
        .includes(week)
    ) {
      state.progress
        .completedWeeks
        .push(week);
    }

    state.progress
      .completedWeeks
      .sort(
        (a, b) =>
          a - b
      );

    if (week < 4) {
      state.progress
        .currentWeek =
        Math.max(
          state.progress
            .currentWeek,
          week +
          1
        );

      state.progress
        .selectedWeek =
        week +
        1;

      showToast(
        "Setmana " +
        week +
        " completada. Passem a la setmana " +
        (
          week +
          1
        ) +
        "."
      );
    }
    else {
      showToast(
        "Pla de 4 setmanes completat. Ja podem recalcular el proper objectiu."
      );
    }

    saveProgress();
    renderWeek();
    renderProgressCards();
  }

  function replanWeek() {
    const week =
      state.progress
        .selectedWeek;

    weekSessions(week)
      .forEach(
        session => {
          delete state.progress
            .sessions[
              sessionKey(
                week,
                session.id
              )
            ];
        }
      );

    state.progress
      .completedWeeks =
      state.progress
        .completedWeeks
        .filter(
          item =>
            item !==
            week
        );

    saveProgress();
    renderWeek();
    renderProgressCards();

    showToast(
      "Setmana " +
      week +
      " replanificada."
    );
  }

  function openGoalModal() {
    byId(
      "bp-goal-backdrop"
    )
      .classList.add(
        "is-visible"
      );

    byId(
      "bp-goal-modal"
    )
      .classList.add(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "hidden";
  }

  function closeGoalModal() {
    byId(
      "bp-goal-backdrop"
    )
      .classList.remove(
        "is-visible"
      );

    byId(
      "bp-goal-modal"
    )
      .classList.remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function selectGoal(goal) {
    saveProfile({
      goal
    });

    closeGoalModal();

    showToast(
      "Objectiu actualitzat: " +
      goalLabel(goal) +
      "."
    );
  }

  function bindUi() {
    document
      .querySelectorAll(
        "#bp-week-tabs button"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            state.progress
              .selectedWeek =
              Number(
                button.dataset.week
              );

            saveProgress();
            renderWeek();
          }
        );
      });

    byId(
      "bp-complete-week"
    )
      .addEventListener(
        "click",
        completeSelectedWeek
      );

    byId(
      "bp-replan-week"
    )
      .addEventListener(
        "click",
        replanWeek
      );

    byId(
      "bp-change-goal"
    )
      .addEventListener(
        "click",
        openGoalModal
      );

    byId(
      "bp-close-goal"
    )
      .addEventListener(
        "click",
        closeGoalModal
      );

    byId(
      "bp-goal-backdrop"
    )
      .addEventListener(
        "click",
        closeGoalModal
      );

    document
      .querySelectorAll(
        "#bp-goal-options [data-goal]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            selectGoal(
              button.dataset.goal
            );
          }
        );
      });

    document
      .querySelectorAll(
        "[data-section]"
      )
      .forEach(button => {
        if (
          button.closest(
            "#bp-week-tabs"
          )
        ) {
          return;
        }

        button.addEventListener(
          "click",
          () => {
            showToast(
              "Aquesta secci\u00f3 quedar\u00e0 connectada en una fase posterior."
            );
          }
        );
      });

    byId(
      "bp-user-avatar"
    )
      ?.addEventListener(
        "click",
        () => {
          window.location.href =
            "../route-match/";
        }
      );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeGoalModal();
        }
      }
    );
  }

  function renderAll() {
    state.profile =
      readProfile();

    state.plan =
      readPlan();

    state.route =
      effectiveRoute();

    renderHeader();
    renderRoute();
    renderWeek();
    renderProgressCards();
  }

  function boot() {
    state.profile =
      readProfile();

    state.plan =
      readPlan();

    state.progress =
      readProgress();

    state.route =
      effectiveRoute();

    state.progress
      .selectedWeek =
      clamp(
        num(
          state.progress
            .selectedWeek,
          state.progress
            .currentWeek
        ),
        1,
        4
      );

    bindUi();
    renderAll();

    window.addEventListener(
      "bicipark:route-match:profile",
      renderAll
    );

    window.addEventListener(
      "bicipark:training-plan:updated",
      renderAll
    );

    window.addEventListener(
      "bicipark:activity-history:updated",
      () => {
        renderProgressCards();
      }
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          PROFILE_KEY ||
          event.key ===
          PLAN_KEY ||
          event.key ===
          STATE_KEY
        ) {
          state.progress =
            readProgress();

          renderAll();
        }
      }
    );

    console.info(
      "[BiciPark] My Plan v1 loaded",
      {
        route:
          state.route
            ?.id,
        week:
          state.progress
            ?.selectedWeek
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  }
  else {
    boot();
  }
})();