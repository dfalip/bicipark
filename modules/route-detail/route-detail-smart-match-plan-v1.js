(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DETAIL_SMART_MATCH_PLAN_V1__) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_SMART_MATCH_PLAN_V1__ = true;

  const PROFILE_KEY =
    "bicipark.routeMatch.profile.v1";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const LEGACY_PLAN_KEY =
    "bicipark_route_plan";

  const PLAN_ACTIVE_KEY =
    "bicipark.routeMatch.planActive.v1";

  const ROUTES =
    window.BiciParkRouteDetailData ||
    {};

  const LEVELS = {
    principiant: 1,
    ocasional: 1.5,
    intermedi: 2,
    avancat: 3,
    expert: 4
  };

  const DIFFICULTIES = {
    easy: 1,
    medium: 2,
    hard: 3
  };

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

  const state = {
    routeId: null,
    route: null,
    profile: null,
    personalProfile: false,
    assessment: null
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

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
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

  function routeIdFromUrl() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      clean(
        params.get("route")
      );

    return (
      ROUTES[id]
        ? id
        : Object.keys(ROUTES)[0]
    );
  }

  function defaultProfile() {
    if (
      window.BiciParkRiderProfile
        ?.defaults
    ) {
      return (
        window.BiciParkRiderProfile
          .defaults()
      );
    }

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
        5,

      capacities: {
        endurance:
          72,

        climbing:
          68,

        technique:
          60,

        consistency:
          80
      }
    };
  }

  function readProfile() {
    state.personalProfile =
      Boolean(
        localStorage.getItem(
          PROFILE_KEY
        )
      );

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

  function number(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function rangeFit(
    value,
    min,
    max,
    options = {}
  ) {
    const safeValue =
      Math.max(
        0,
        number(value)
      );

    let safeMin =
      Math.max(
        0,
        number(min)
      );

    let safeMax =
      Math.max(
        safeMin + 1,
        number(
          max,
          safeMin + 1
        )
      );

    if (
      safeValue >= safeMin &&
      safeValue <= safeMax
    ) {
      return 1;
    }

    if (safeValue < safeMin) {
      if (!safeMin) {
        return 1;
      }

      const ratio =
        safeValue /
        safeMin;

      return clamp(
        (
          options.lowFloor ??
          .58
        ) +
        ratio *
        (
          1 -
          (
            options.lowFloor ??
            .58
          )
        ),
        0,
        1
      );
    }

    const excess =
      (
        safeValue -
        safeMax
      ) /
      safeMax;

    if (
      options.progression &&
      excess <= .18
    ) {
      return .94;
    }

    if (
      options.challenge &&
      excess <= .30
    ) {
      return .88;
    }

    return clamp(
      1 -
      excess *
      1.55,
      .08,
      1
    );
  }

  function parseEstimatedHours(text) {
    const value =
      clean(text);

    if (!value) {
      return null;
    }

    const colon =
      value.match(
        /(\d+)\s*:\s*(\d+)/
      );

    if (colon) {
      return (
        Number(colon[1]) +
        Number(colon[2]) /
        60
      );
    }

    const hours =
      value.match(
        /(\d+(?:[.,]\d+)?)\s*h/
      );

    if (hours) {
      return Number(
        hours[1]
          .replace(
            ",",
            "."
          )
      );
    }

    const minutes =
      value.match(
        /(\d+)\s*min/
      );

    if (minutes) {
      return (
        Number(minutes[1]) /
        60
      );
    }

    return null;
  }

  function levelScore(
    routeDifficulty,
    profileLevel,
    goal
  ) {
    const routeLevel =
      DIFFICULTIES[
        routeDifficulty
      ] ||
      2;

    const riderLevel =
      LEVELS[
        norm(profileLevel)
      ] ||
      2;

    const delta =
      routeLevel -
      riderLevel;

    if (
      goal === "passejar"
    ) {
      if (delta <= -1) {
        return 1;
      }

      if (delta <= 0) {
        return .95;
      }

      if (delta <= .5) {
        return .72;
      }

      return .40;
    }

    if (
      goal === "dificultat" ||
      goal === "repte"
    ) {
      if (
        delta > 0 &&
        delta <= 1
      ) {
        return 1;
      }

      if (delta === 0) {
        return .92;
      }

      if (delta < 0) {
        return .72;
      }

      return .46;
    }

    if (delta === 0) {
      return 1;
    }

    if (
      delta > 0 &&
      delta <= 1
    ) {
      return .92;
    }

    if (delta < 0) {
      return .82;
    }

    return .48;
  }

  function terrainScore(
    routeModality,
    terrain
  ) {
    const route =
      norm(
        routeModality
      );

    const wanted =
      norm(
        terrain
      );

    if (!wanted) {
      return .8;
    }

    const aliases = {
      carretera: [
        "carretera",
        "road"
      ],

      gravel: [
        "gravel"
      ],

      mtb: [
        "mtb",
        "btt"
      ],

      urbana: [
        "urbana",
        "urban"
      ]
    };

    const routeTypes =
      Object.entries(
        aliases
      )
        .filter(
          (
            [, words]
          ) =>
            words.some(word =>
              route.includes(word)
            )
        )
        .map(
          ([key]) =>
            key
        );

    if (!routeTypes.length) {
      return .78;
    }

    const matches =
      routeTypes.some(
        type =>
          aliases[type]
            .some(word =>
              wanted.includes(word)
            )
      );

    return matches
      ? 1
      : .58;
  }

  function goalScore(
    route,
    profile
  ) {
    const goal =
      profile.goal ||
      "millorar";

    const difficulty =
      route.difficulty ||
      "medium";

    const km =
      number(
        route.distanceKm
      );

    const ascent =
      number(
        route.ascentM
      );

    const maxKm =
      Math.max(
        1,
        number(
          profile.usualDistanceMax,
          40
        )
      );

    const maxAscent =
      Math.max(
        1,
        number(
          profile.usualElevationMax,
          600
        )
      );

    const load =
      (
        km /
        maxKm +
        ascent /
        maxAscent
      ) /
      2;

    if (goal === "passejar") {
      let score =
        difficulty === "easy"
          ? 1
          : (
              difficulty === "medium"
                ? .72
                : .32
            );

      if (
        number(
          route.safety
        ) >= 85
      ) {
        score += .05;
      }

      return clamp(
        score,
        0,
        1
      );
    }

    if (goal === "dificultat") {
      if (
        difficulty === "hard"
      ) {
        return load <= 1.35
          ? 1
          : .70;
      }

      if (
        difficulty === "medium"
      ) {
        return .88;
      }

      return .55;
    }

    if (goal === "repte") {
      if (
        load >= .85 &&
        load <= 1.35
      ) {
        return 1;
      }

      if (load < .85) {
        return .68;
      }

      return .62;
    }

    /*
     * millorar:
     * Ideal route is around current range or a small step above.
     */
    if (
      load >= .70 &&
      load <= 1.16
    ) {
      return 1;
    }

    if (
      load > 1.16 &&
      load <= 1.28
    ) {
      return .88;
    }

    if (load < .70) {
      return .74;
    }

    return .56;
  }

  function timeScore(
    route,
    profile
  ) {
    const hours =
      parseEstimatedHours(
        route.estimatedTime
      );

    if (
      !Number.isFinite(hours)
    ) {
      return .8;
    }

    const weekly =
      Math.max(
        1,
        number(
          profile.weeklyTimeHours,
          5
        )
      );

    if (
      hours <=
      weekly *
      .55
    ) {
      return 1;
    }

    if (
      hours <=
      weekly *
      .75
    ) {
      return .90;
    }

    if (
      hours <=
      weekly
    ) {
      return .72;
    }

    return .45;
  }

  function distanceReason(
    route,
    profile
  ) {
    const km =
      number(
        route.distanceKm
      );

    const min =
      Math.max(
        0,
        number(
          profile.usualDistanceMin
        )
      );

    const max =
      Math.max(
        min + 1,
        number(
          profile.usualDistanceMax,
          min + 1
        )
      );

    if (
      km >= min &&
      km <= max
    ) {
      return {
        tone:
          "ok",
        text:
          "Dist\u00e0ncia dins del teu rang habitual (" +
          formatNumber(km) +
          " km vs " +
          formatNumber(min) +
          "\u2013" +
          formatNumber(max) +
          " km)."
      };
    }

    if (km < min) {
      return {
        tone:
          profile.goal ===
          "passejar"
            ? "ok"
            : "progress",

        text:
          profile.goal ===
          "passejar"
            ? "Dist\u00e0ncia curta i c\u00f2moda respecte al teu habitual."
            : "Dist\u00e0ncia per sota del teu habitual; pot ser una bona sortida suau."
      };
    }

    const excess =
      Math.round(
        (
          (
            km -
            max
          ) /
          max
        ) *
        100
      );

    if (excess <= 18) {
      return {
        tone:
          "progress",

        text:
          "Dist\u00e0ncia un " +
          excess +
          "% per sobre del teu habitual: progressi\u00f3 assumible."
      };
    }

    return {
      tone:
        "warning",

      text:
        "Dist\u00e0ncia un " +
        excess +
        "% per sobre del teu habitual."
    };
  }

  function ascentReason(
    route,
    profile
  ) {
    const ascent =
      number(
        route.ascentM
      );

    const min =
      Math.max(
        0,
        number(
          profile.usualElevationMin
        )
      );

    const max =
      Math.max(
        min + 1,
        number(
          profile.usualElevationMax,
          min + 1
        )
      );

    if (
      ascent >= min &&
      ascent <= max
    ) {
      return {
        tone:
          "ok",

        text:
          "Desnivell dins del teu rang habitual (" +
          Math.round(ascent) +
          " m+)."
      };
    }

    if (ascent < min) {
      return {
        tone:
          profile.goal ===
          "dificultat"
            ? "progress"
            : "ok",

        text:
          "Desnivell inferior al teu habitual; exig\u00e8ncia de pujada baixa."
      };
    }

    const excess =
      Math.round(
        (
          (
            ascent -
            max
          ) /
          max
        ) *
        100
      );

    if (excess <= 18) {
      return {
        tone:
          "progress",

        text:
          "Desnivell un " +
          excess +
          "% per sobre del teu habitual: bon pas de progressi\u00f3."
      };
    }

    return {
      tone:
        "warning",

      text:
        "Desnivell un " +
        excess +
        "% per sobre del teu habitual."
    };
  }

  function difficultyReason(
    route,
    profile
  ) {
    const routeLevel =
      DIFFICULTIES[
        route.difficulty
      ] ||
      2;

    const riderLevel =
      LEVELS[
        norm(
          profile.level
        )
      ] ||
      2;

    const delta =
      routeLevel -
      riderLevel;

    if (delta <= 0) {
      return {
        tone:
          "ok",

        text:
          "Dificultat compatible amb el teu nivell " +
          clean(profile.level) +
          "."
      };
    }

    if (delta <= 1) {
      return {
        tone:
          "progress",

        text:
          "Dificultat lleugerament superior: adequada per progressar amb control."
      };
    }

    return {
      tone:
        "warning",

      text:
        "Dificultat clarament superior al teu nivell actual."
    };
  }

  function terrainReason(
    route,
    profile,
    score
  ) {
    if (score >= .95) {
      return {
        tone:
          "ok",

        text:
          "Modalitat coherent amb el teu terreny preferit (" +
          clean(
            profile.terrain
          ) +
          ")."
      };
    }

    return {
      tone:
        "progress",

      text:
        "La modalitat " +
        clean(
          route.modality
        ) +
        " no \u00e9s la teva prefer\u00e8ncia principal."
    };
  }

  function formatNumber(value) {
    return Number(value)
      .toFixed(
        Number(value) %
        1 ===
        0
          ? 0
          : 1
      )
      .replace(
        ".",
        ","
      );
  }

  function scoreLabel(score) {
    if (score >= 90) {
      return {
        title:
          "Excel\u00b7lent encaix",
        text:
          "Molt adequada per al teu perfil i objectiu."
      };
    }

    if (score >= 80) {
      return {
        title:
          "Molt bon encaix",
        text:
          "Ruta adequada amb un nivell de repte raonable."
      };
    }

    if (score >= 68) {
      return {
        title:
          "Bon encaix",
        text:
          "Pot encaixar b\u00e9, amb algun factor a tenir en compte."
      };
    }

    if (score >= 55) {
      return {
        title:
          "Encaix moderat",
        text:
          "La ruta demana una mica de preparaci\u00f3 o adaptaci\u00f3."
      };
    }

    return {
      title:
        "Repte alt",
      text:
        "Millor preparar-la progressivament abans de fer-la completa."
    };
  }

  function assessRoute(
    route,
    profile
  ) {
    const progression =
      profile.goal ===
      "millorar";

    const challenge =
      profile.goal ===
      "dificultat" ||
      profile.goal ===
      "repte";

    const distance =
      rangeFit(
        route.distanceKm,
        profile.usualDistanceMin,
        profile.usualDistanceMax,
        {
          progression,
          challenge,
          lowFloor:
            profile.goal ===
            "passejar"
              ? .78
              : .58
        }
      );

    const ascent =
      rangeFit(
        route.ascentM,
        profile.usualElevationMin,
        profile.usualElevationMax,
        {
          progression,
          challenge,
          lowFloor:
            profile.goal ===
            "passejar"
              ? .84
              : .60
        }
      );

    const difficulty =
      levelScore(
        route.difficulty,
        profile.level,
        profile.goal
      );

    const terrain =
      terrainScore(
        route.modality,
        profile.terrain
      );

    const goal =
      goalScore(
        route,
        profile
      );

    const time =
      timeScore(
        route,
        profile
      );

    const score =
      clamp(
        Math.round(
          distance *
          25 +
          ascent *
          20 +
          difficulty *
          20 +
          terrain *
          10 +
          goal *
          15 +
          time *
          10
        ),
        1,
        99
      );

    const label =
      scoreLabel(
        score
      );

    const reasons = [
      distanceReason(
        route,
        profile
      ),

      ascentReason(
        route,
        profile
      ),

      difficultyReason(
        route,
        profile
      ),

      terrainReason(
        route,
        profile,
        terrain
      )
    ];

    return {
      score,
      label,
      reasons,
      components: {
        distance,
        ascent,
        difficulty,
        terrain,
        goal,
        time
      }
    };
  }

  function goalLabel(goal) {
    return (
      GOAL_LABELS[
        goal
      ] ||
      GOAL_LABELS.millorar
    );
  }

  function renderMatch() {
    const card =
      document.querySelector(
        ".bp360-match-card"
      );

    if (!card) {
      return;
    }

    const scoreNode =
      byId(
        "bp360-match-score"
      );

    if (scoreNode) {
      scoreNode.textContent =
        state.assessment.score +
        "%";
    }

    const ringSmall =
      card.querySelector(
        ".bp360-score-ring small"
      );

    if (ringSmall) {
      ringSmall.textContent =
        state.personalProfile
          ? "Compatible"
          : "Estimaci\u00f3";
    }

    const sectionTitle =
      card.querySelector(
        ".bp360-section-title"
      );

    if (sectionTitle) {
      sectionTitle
        .querySelectorAll(
          ".bp360-smart-profile-status"
        )
        .forEach(node =>
          node.remove()
        );

      const status =
        document.createElement(
          "span"
        );

      status.className =
        "bp360-smart-profile-status" +
        (
          state.personalProfile
            ? " is-personal"
            : ""
        );

      status.textContent =
        state.personalProfile
          ? "Perfil personal"
          : "Perfil base";

      sectionTitle.appendChild(
        status
      );
    }

    const textNode =
      byId(
        "bp360-match-text"
      );

    const linkNode =
      byId(
        "bp360-match-link"
      );

    const copy =
      textNode?.parentElement;

    if (!copy) {
      return;
    }

    copy.classList.add(
      "bp360-smart-match-copy"
    );

    Array.from(
      copy.children
    )
      .forEach(child => {
        if (
          child !== textNode &&
          child !== linkNode
        ) {
          child.remove();
        }
      });

    if (textNode) {
      textNode.style.display =
        "none";
    }

    if (linkNode) {
      linkNode.style.display =
        "none";
    }

    const headline =
      document.createElement(
        "div"
      );

    headline.className =
      "bp360-smart-match-headline";

    headline.innerHTML =
      "<strong>" +
        state.assessment
          .label.title +
      "</strong><br>" +
      state.assessment
        .label.text;

    const goal =
      document.createElement(
        "div"
      );

    goal.className =
      "bp360-smart-match-goal";

    goal.textContent =
      "Objectiu: " +
      goalLabel(
        state.profile.goal
      );

    const list =
      document.createElement(
        "ul"
      );

    list.className =
      "bp360-smart-match-list";

    state.assessment.reasons
      .slice(0, 4)
      .forEach(reason => {
        const li =
          document.createElement(
            "li"
          );

        const icon =
          reason.tone ===
          "warning"
            ? "!"
            : (
                reason.tone ===
                "progress"
                  ? "\u2191"
                  : "\u2713"
              );

        li.innerHTML =
          '<span class="bp360-smart-reason-icon ' +
            (
              reason.tone ===
              "warning"
                ? "is-warning"
                : (
                    reason.tone ===
                    "progress"
                      ? "is-progress"
                      : ""
                  )
            ) +
          '">' +
            icon +
          "</span>" +
          "<span>" +
            reason.text +
          "</span>";

        list.appendChild(
          li
        );
      });

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "bp360-smart-match-actions";

    actions.innerHTML =
      '<a href="../route-match/">Ajustar perfil \u2192</a>';

    copy.insertBefore(
      headline,
      textNode ||
      null
    );

    copy.insertBefore(
      goal,
      textNode ||
      null
    );

    copy.insertBefore(
      list,
      textNode ||
      null
    );

    copy.insertBefore(
      actions,
      textNode ||
      null
    );

    renderPlanMini();
  }

  function readPlan() {
    try {
      const raw =
        localStorage.getItem(
          PLAN_KEY
        );

      if (!raw) {
        return {
          active: false,
          routes: [],
          focusRouteId: null
        };
      }

      const data =
        JSON.parse(raw);

      return {
        active:
          Boolean(
            data.active
          ),

        goal:
          data.goal ||
          null,

        routes:
          Array.isArray(
            data.routes
          )
            ? data.routes
            : [],

        focusRouteId:
          data.focusRouteId ||
          null,

        createdAt:
          data.createdAt ||
          null,

        updatedAt:
          data.updatedAt ||
          null
      };
    }
    catch (_) {
      return {
        active: false,
        routes: [],
        focusRouteId: null
      };
    }
  }

  function writePlan(plan) {
    const now =
      new Date()
        .toISOString();

    const next = {
      ...plan,
      active: true,
      goal:
        state.profile.goal,
      createdAt:
        plan.createdAt ||
        now,
      updatedAt:
        now
    };

    localStorage.setItem(
      PLAN_KEY,
      JSON.stringify(
        next
      )
    );

    localStorage.setItem(
      PLAN_ACTIVE_KEY,
      "true"
    );

    /*
     * Keep the old Route Detail key in sync for backwards
     * compatibility with route-detail.js.
     */
    localStorage.setItem(
      LEGACY_PLAN_KEY,
      JSON.stringify(
        next.routes.map(
          route =>
            route.id
        )
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:training-plan:updated",
        {
          detail: next
        }
      )
    );

    return next;
  }

  function routeForPlan() {
    return {
      id:
        state.route.id,

      name:
        state.route.name,

      distanceKm:
        state.route.distanceKm,

      ascentM:
        state.route.ascentM,

      difficulty:
        state.route.difficulty,

      modality:
        state.route.modality,

      estimatedTime:
        state.route.estimatedTime,

      compatibilityScore:
        state.assessment.score
    };
  }

  function isInPlan() {
    const plan =
      readPlan();

    return plan.routes.some(
      route =>
        route.id ===
        state.routeId
    );
  }

  function addRouteToPlan() {
    const plan =
      readPlan();

    const route =
      routeForPlan();

    const routes =
      plan.routes
        .filter(
          item =>
            item.id !==
            route.id
        );

    routes.push(
      route
    );

    writePlan({
      ...plan,
      routes,
      focusRouteId:
        route.id
    });

    syncPlanButton();
    renderPlanMini();
    openPlanModal();
  }

  function removeRouteFromPlan() {
    const plan =
      readPlan();

    const routes =
      plan.routes
        .filter(
          route =>
            route.id !==
            state.routeId
        );

    const focusRouteId =
      plan.focusRouteId ===
      state.routeId
        ? (
            routes[
              routes.length - 1
            ]?.id ||
            null
          )
        : plan.focusRouteId;

    writePlan({
      ...plan,
      routes,
      focusRouteId
    });

    if (!routes.length) {
      localStorage.setItem(
        PLAN_ACTIVE_KEY,
        "false"
      );
    }

    syncPlanButton();
    renderPlanMini();
    closePlanModal();
  }

  function syncPlanButton() {
    const button =
      byId(
        "bp360-plan"
      );

    if (!button) {
      return;
    }

    if (isInPlan()) {
      button.textContent =
        "\u2713 Al meu pla";
    }
    else {
      button.textContent =
        "\u25c9 Afegeix al meu pla";
    }
  }

  function renderPlanMini() {
    const card =
      document.querySelector(
        ".bp360-match-card"
      );

    if (!card) {
      return;
    }

    card
      .querySelectorAll(
        ".bp360-smart-plan-mini"
      )
      .forEach(node =>
        node.remove()
      );

    if (!isInPlan()) {
      return;
    }

    const mini =
      document.createElement(
        "div"
      );

    mini.className =
      "bp360-smart-plan-mini";

    mini.innerHTML =
      "<strong>\u2713 Ruta afegida al teu pla</strong>" +
      "<small>" +
        goalLabel(
          state.profile.goal
        ) +
        " \u00b7 " +
        number(
          state.profile.daysPerWeek,
          3
        ) +
        " dies/setmana" +
      "</small>" +
      '<button type="button">Veure pla b\u00e0sic \u2192</button>';

    mini
      .querySelector("button")
      .addEventListener(
        "click",
        openPlanModal
      );

    card.appendChild(
      mini
    );
  }

  function sessionPool() {
    const goal =
      state.profile.goal ||
      "millorar";

    const score =
      state.assessment.score;

    const routeName =
      state.route.name;

    const routeTime =
      state.route
        .estimatedTime ||
      "2-3 h";

    const specific =
      goal ===
      "passejar"
        ? {
            name:
              "Pedalada molt suau",
            duration:
              "35-45 min"
          }
        : (
            goal ===
            "dificultat"
              ? {
                  name:
                    "Pujades curtes controlades",
                  duration:
                    "45-55 min"
                }
              : (
                  goal ===
                  "repte"
                    ? {
                        name:
                          "Blocs de ritme moderat",
                        duration:
                          "50-65 min"
                      }
                    : {
                        name:
                          "Cad\u00e8ncia + ritme moderat",
                        duration:
                          "45-60 min"
                      }
                )
          );

    const target =
      score < 65
        ? {
            name:
              "Progressi\u00f3 cap a " +
              routeName,
            duration:
              "60-75% de la ruta"
          }
        : {
            name:
              "Ruta objectiu: " +
              routeName,
            duration:
              routeTime
          };

    return [
      {
        day:
          "Dimarts",
        name:
          goal ===
          "passejar"
            ? "Pedalada suau"
            : "Base aer\u00f2bia suau",
        duration:
          "45-60 min",
        priority:
          1
      },
      {
        day:
          "Dijous",
        name:
          specific.name,
        duration:
          specific.duration,
        priority:
          2
      },
      {
        day:
          "Divendres",
        name:
          goal ===
          "dificultat"
            ? "For\u00e7a cames + core"
            : "For\u00e7a b\u00e0sica + core",
        duration:
          "20-25 min",
        priority:
          3
      },
      {
        day:
          "Dissabte",
        name:
          target.name,
        duration:
          target.duration,
        priority:
          0
      },
      {
        day:
          "Diumenge",
        name:
          "Recuperaci\u00f3 activa",
        duration:
          "30-45 min",
        priority:
          4
      }
    ];
  }

  function planSessions() {
    const days =
      clamp(
        number(
          state.profile.daysPerWeek,
          3
        ),
        1,
        5
      );

    return sessionPool()
      .filter(
        item =>
          item.priority <
          days
      )
      .sort(
        (a, b) => {
          const order = {
            Dimarts: 2,
            Dijous: 4,
            Divendres: 5,
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

  function ensurePlanModal() {
    let backdrop =
      document.querySelector(
        ".bp-smart-plan-backdrop"
      );

    let modal =
      document.querySelector(
        ".bp-smart-plan-modal"
      );

    if (
      backdrop &&
      modal
    ) {
      return {
        backdrop,
        modal
      };
    }

    backdrop =
      document.createElement(
        "div"
      );

    backdrop.className =
      "bp-smart-plan-backdrop";

    modal =
      document.createElement(
        "section"
      );

    modal.className =
      "bp-smart-plan-modal";

    modal.setAttribute(
      "role",
      "dialog"
    );

    modal.setAttribute(
      "aria-modal",
      "true"
    );

    document.body.appendChild(
      backdrop
    );

    document.body.appendChild(
      modal
    );

    backdrop.addEventListener(
      "click",
      closePlanModal
    );

    return {
      backdrop,
      modal
    };
  }

  function renderPlanModal() {
    const {
      modal
    } =
      ensurePlanModal();

    const sessions =
      planSessions();

    modal.innerHTML =
      '<div class="bp-smart-plan-header">' +
        "<div>" +
          "<h3>El teu pla b\u00e0sic</h3>" +
          "<p>Un pla senzill per compaginar exercicis b\u00e0sics amb el teu objectiu ciclista.</p>" +
        "</div>" +
        '<button class="bp-smart-plan-close" type="button" aria-label="Tancar">\u00d7</button>' +
      "</div>" +

      '<div class="bp-smart-plan-body">' +
        '<div class="bp-smart-plan-route">' +
          "<div>" +
            "<strong>" +
              state.route.name +
            "</strong>" +
            "<small>" +
              formatNumber(
                state.route.distanceKm
              ) +
              " km \u00b7 " +
              (
                state.route.ascentM == null
                  ? "--"
                  : state.route.ascentM +
                    " m+"
              ) +
              " \u00b7 " +
              clean(
                state.route.modality
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp-smart-plan-score">' +
            state.assessment.score +
            "%" +
          "</span>" +
        "</div>" +

        '<div class="bp-smart-plan-meta">' +
          '<span class="bp-smart-plan-chip">Objectiu: ' +
            goalLabel(
              state.profile.goal
            ) +
          "</span>" +
          '<span class="bp-smart-plan-chip">' +
            number(
              state.profile.daysPerWeek,
              3
            ) +
            " dies/setmana" +
          "</span>" +
          '<span class="bp-smart-plan-chip">' +
            number(
              state.profile.weeklyTimeHours,
              5
            ) +
            " h/setmana" +
          "</span>" +
        "</div>" +

        '<div class="bp-smart-plan-sessions">' +
          sessions
            .map(item =>
              '<div class="bp-smart-plan-session">' +
                "<strong>" +
                  item.day +
                "</strong>" +
                "<span>" +
                  item.name +
                "</span>" +
                "<small>" +
                  item.duration +
                "</small>" +
              "</div>"
            )
            .join("") +
        "</div>" +

        '<div class="bp-smart-plan-note">' +
          (
            state.assessment.score <
            65
              ? "Aquesta ruta \u00e9s un repte alt per al perfil actual. El pla la tracta com a objectiu de progressi\u00f3 i no obliga a completar-la des de la primera setmana."
              : "Pla orientatiu: mant\u00e9 les sessions suaus realment suaus i incrementa la c\u00e0rrega de manera progressiva."
          ) +
        "</div>" +

        '<div class="bp-smart-plan-actions">' +
          '<a class="bp-smart-plan-primary" href="../route-match/">Obrir Route Match / perfil</a>' +
          '<button class="bp-smart-plan-secondary" type="button" data-bp-action="close-plan">Tancar</button>' +
          (
            isInPlan()
              ? '<button class="bp-smart-plan-danger" type="button" data-bp-action="remove-route">Treure aquesta ruta</button>'
              : ""
          ) +
        "</div>" +
      "</div>";

    modal
      .querySelector(
        ".bp-smart-plan-close"
      )
      ?.addEventListener(
        "click",
        closePlanModal
      );

    modal
      .querySelector(
        '[data-bp-action="close-plan"]'
      )
      ?.addEventListener(
        "click",
        closePlanModal
      );

    modal
      .querySelector(
        '[data-bp-action="remove-route"]'
      )
      ?.addEventListener(
        "click",
        removeRouteFromPlan
      );
  }

  function openPlanModal() {
    renderPlanModal();

    const {
      backdrop,
      modal
    } =
      ensurePlanModal();

    backdrop.classList.add(
      "is-visible"
    );

    modal.classList.add(
      "is-visible"
    );

    document.documentElement
      .style.overflow =
      "hidden";
  }

  function closePlanModal() {
    document
      .querySelector(
        ".bp-smart-plan-backdrop"
      )
      ?.classList.remove(
        "is-visible"
      );

    document
      .querySelector(
        ".bp-smart-plan-modal"
      )
      ?.classList.remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function bindPlanButton() {
    const button =
      byId(
        "bp360-plan"
      );

    if (!button) {
      return;
    }

    if (
      button.dataset
        .bpSmartPlanBound ===
      "1"
    ) {
      return;
    }

    button.dataset
      .bpSmartPlanBound =
      "1";

    /*
     * Capture phase prevents the old togglePlan handler from
     * writing a conflicting state before the smart plan logic.
     */
    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (isInPlan()) {
          openPlanModal();
        }
        else {
          addRouteToPlan();
        }
      },
      true
    );
  }

  function refresh() {
    state.profile =
      readProfile();

    state.assessment =
      assessRoute(
        state.route,
        state.profile
      );

    renderMatch();
    syncPlanButton();
    renderPlanMini();
  }

  function boot() {
    state.routeId =
      routeIdFromUrl();

    state.route =
      ROUTES[
        state.routeId
      ];

    if (!state.route) {
      return;
    }

    refresh();
    bindPlanButton();

    window.addEventListener(
      "bicipark:route-match:profile",
      refresh
    );

    window.addEventListener(
      "bicipark:training-plan:updated",
      () => {
        syncPlanButton();
        renderPlanMini();
      }
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          PROFILE_KEY ||
          event.key ===
          PLAN_KEY
        ) {
          refresh();
        }
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closePlanModal();
        }
      }
    );

    console.info(
      "[BiciPark] Smart Route Match + Plan v1",
      {
        route:
          state.routeId,
        score:
          state.assessment.score,
        personalProfile:
          state.personalProfile,
        goal:
          state.profile.goal
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