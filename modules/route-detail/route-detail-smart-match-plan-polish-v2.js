(() => {
  "use strict";

  if (window.__BICIPARK_SMART_MATCH_PLAN_POLISH_V2__) {
    return;
  }

  window.__BICIPARK_SMART_MATCH_PLAN_POLISH_V2__ = true;

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const LEGACY_PLAN_KEY =
    "bicipark_route_plan";

  const PLAN_ACTIVE_KEY =
    "bicipark.routeMatch.planActive.v1";

  const ROUTES =
    window.BiciParkRouteDetailData ||
    {};

  const GOALS = {
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
    week: 1
  };

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
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

    return ROUTES[id]
      ? id
      : Object.keys(ROUTES)[0];
  }

  function profile() {
    if (
      window.BiciParkRiderProfile
        ?.get
    ) {
      return (
        window.BiciParkRiderProfile
          .get()
      );
    }

    return {
      level:
        "Intermedi",
      daysPerWeek:
        3,
      goal:
        "millorar",
      weeklyTimeHours:
        5
    };
  }

  function number(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
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

  function goalLabel(goal) {
    return (
      GOALS[goal] ||
      GOALS.millorar
    );
  }

  function visibleCompatibility() {
    const node =
      document.getElementById(
        "bp360-match-score"
      );

    const match =
      clean(
        node?.textContent
      )
        .match(/\d+/);

    return match
      ? Number(match[0])
      : 0;
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
        active: false,
        routes: [],
        focusRouteId: null
      };
    }
  }

  function routeInPlan() {
    const plan =
      readPlan();

    return plan.routes.some(
      route =>
        route.id ===
        state.routeId
    );
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
        visibleCompatibility()
    };
  }

  function writePlan(plan) {
    const now =
      new Date()
        .toISOString();

    const next = {
      ...plan,
      active:
        true,
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
      JSON.stringify(next)
    );

    localStorage.setItem(
      PLAN_ACTIVE_KEY,
      "true"
    );

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

  function addToPlan() {
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

    routes.push(route);

    writePlan({
      ...plan,
      routes,
      focusRouteId:
        route.id
    });
  }

  function removeFromPlan() {
    const plan =
      readPlan();

    const routes =
      plan.routes
        .filter(
          item =>
            item.id !==
            state.routeId
        );

    writePlan({
      ...plan,
      routes,
      focusRouteId:
        plan.focusRouteId ===
        state.routeId
          ? (
              routes[
                routes.length - 1
              ]?.id ||
              null
            )
          : plan.focusRouteId
    });

    if (!routes.length) {
      localStorage.setItem(
        PLAN_ACTIVE_KEY,
        "false"
      );
    }

    closeModal();
  }

  function makeRouteMatchClickable() {
    const card =
      document.querySelector(
        ".bp360-match-card"
      );

    if (!card) {
      return;
    }

    const candidates =
      Array.from(
        card.querySelectorAll(
          "span, div, strong, a"
        )
      );

    const badge =
      candidates.find(
        node =>
          clean(
            node.textContent
          ) ===
          "Route Match" &&
          !node.closest(
            ".bp360-smart-match-copy"
          )
      );

    if (
      badge &&
      badge.tagName !==
      "A"
    ) {
      const link =
        document.createElement(
          "a"
        );

      link.href =
        "../route-match/";

      link.className =
        clean(
          badge.className
        ) +
        " bp360-route-match-link";

      link.textContent =
        "Route Match";

      link.setAttribute(
        "aria-label",
        "Obrir Route Match i ajustar el perfil"
      );

      badge.replaceWith(link);
    }
    else if (
      badge &&
      badge.tagName ===
      "A"
    ) {
      if (
        !badge.classList.contains(
          "bp360-route-match-link"
        )
      ) {
        badge.classList.add(
          "bp360-route-match-link"
        );
      }

      if (
        badge.getAttribute(
          "href"
        ) !==
        "../route-match/"
      ) {
        badge.href =
          "../route-match/";
      }
    }
  }

  function polishMiniPlan() {
    const wanted =
      "Veure pla de 4 setmanes \u2192";

    document
      .querySelectorAll(
        ".bp360-smart-plan-mini button"
      )
      .forEach(button => {
        if (
          button.textContent !==
          wanted
        ) {
          button.textContent =
            wanted;
        }
      });
  }

  function targetDistance(
    ratio
  ) {
    const km =
      number(
        state.route.distanceKm
      );

    if (!km) {
      return "";
    }

    return (
      formatNumber(
        km *
        ratio
      ) +
      " km aprox."
    );
  }

  function specificSession(
    week,
    goal
  ) {
    if (goal === "passejar") {
      return {
        name:
          week <= 2
            ? "Pedalada relaxada + cad\u00e8ncia"
            : "Pedalada c\u00f2moda amb petits canvis de ritme",

        duration:
          week === 1
            ? "35-40 min"
            : (
                week === 2
                  ? "40-45 min"
                  : (
                      week === 3
                        ? "45-50 min"
                        : "35-40 min"
                    )
              )
      };
    }

    if (goal === "dificultat") {
      return {
        name:
          week === 1
            ? "Pujades curtes suaus"
            : (
                week === 2
                  ? "Pujades curtes controlades"
                  : (
                      week === 3
                        ? "Pujades + ritme moderat"
                        : "Activaci\u00f3 curta en pujada"
                    )
              ),

        duration:
          week === 1
            ? "35-45 min"
            : (
                week === 2
                  ? "45-50 min"
                  : (
                      week === 3
                        ? "50-55 min"
                        : "30-40 min"
                    )
              )
      };
    }

    if (goal === "repte") {
      return {
        name:
          week === 1
            ? "Ritme moderat controlat"
            : (
                week === 2
                  ? "2 blocs de ritme moderat"
                  : (
                      week === 3
                        ? "3 blocs de ritme moderat"
                        : "Activaci\u00f3 curta"
                    )
              ),

        duration:
          week === 1
            ? "40-45 min"
            : (
                week === 2
                  ? "45-55 min"
                  : (
                      week === 3
                        ? "50-60 min"
                        : "30-40 min"
                    )
              )
      };
    }

    return {
      name:
        week === 1
          ? "Cad\u00e8ncia + ritme suau"
          : (
              week === 2
                ? "Cad\u00e8ncia + ritme moderat"
                : (
                    week === 3
                      ? "Ritme moderat sostingut"
                      : "Activaci\u00f3 curta"
                  )
            ),

      duration:
        week === 1
          ? "35-45 min"
          : (
              week === 2
                ? "45-50 min"
                : (
                    week === 3
                      ? "50-60 min"
                      : "30-40 min"
                  )
            )
    };
  }

  function baseSession(week) {
    return {
      name:
        week === 4
          ? "Base aer\u00f2bia molt suau"
          : "Base aer\u00f2bia suau",

      duration:
        week === 1
          ? "40-50 min"
          : (
              week === 2
                ? "45-55 min"
                : (
                    week === 3
                      ? "50-65 min"
                      : "35-45 min"
                  )
            )
    };
  }

  function targetSession(week) {
    const score =
      visibleCompatibility();

    const ratios =
      score < 65
        ? [.55, .65, .75, .85]
        : [.65, .80, .90, 1];

    const ratio =
      ratios[
        week - 1
      ];

    const finalWeek =
      week === 4;

    return {
      name:
        finalWeek
          ? (
              score < 65
                ? "Ruta objectiu adaptada: " +
                  state.route.name
                : "Ruta objectiu completa: " +
                  state.route.name
            )
          : "Progressi\u00f3 cap a " +
            state.route.name,

      duration:
        finalWeek &&
        score >= 65 &&
        state.route.estimatedTime
          ? state.route.estimatedTime
          : targetDistance(ratio)
    };
  }

  function weekPlan(week) {
    const goal =
      state.profile.goal ||
      "millorar";

    const days =
      Math.max(
        1,
        Math.min(
          5,
          number(
            state.profile.daysPerWeek,
            3
          )
        )
      );

    const base =
      baseSession(week);

    const specific =
      specificSession(
        week,
        goal
      );

    const target =
      targetSession(week);

    const all = [
      {
        day:
          "Dilluns",
        name:
          "Mobilitat + core",
        duration:
          week === 4
            ? "10-12 min"
            : "15-20 min",
        priority:
          4
      },
      {
        day:
          "Dimarts",
        name:
          base.name,
        duration:
          base.duration,
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
          "Dissabte",
        name:
          target.name,
        duration:
          target.duration,
        priority:
          0,
        target:
          true
      },
      {
        day:
          "Diumenge",
        name:
          "Recuperaci\u00f3 activa",
        duration:
          "25-40 min",
        priority:
          3
      }
    ];

    return all
      .filter(
        item =>
          item.priority <
          days
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

  function weekMeta(week) {
    const data = {
      1: {
        title:
          "Setmana 1 \u00b7 Adaptaci\u00f3",
        load:
          "C\u00e0rrega suau"
      },

      2: {
        title:
          "Setmana 2 \u00b7 Construcci\u00f3",
        load:
          "Augment progressiu"
      },

      3: {
        title:
          "Setmana 3 \u00b7 Consolidaci\u00f3",
        load:
          "Setmana m\u00e9s completa"
      },

      4: {
        title:
          "Setmana 4 \u00b7 Objectiu",
        load:
          "Menys c\u00e0rrega abans de la ruta"
      }
    };

    return data[week];
  }

  function ensureModal() {
    let backdrop =
      document.querySelector(
        ".bp4w-backdrop"
      );

    let modal =
      document.querySelector(
        ".bp4w-modal"
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
      "bp4w-backdrop";

    modal =
      document.createElement(
        "section"
      );

    modal.className =
      "bp4w-modal";

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
      closeModal
    );

    return {
      backdrop,
      modal
    };
  }

  function renderWeekContent(
    container
  ) {
    const meta =
      weekMeta(
        state.week
      );

    const sessions =
      weekPlan(
        state.week
      );

    container.innerHTML =
      '<div class="bp4w-week-title">' +
        "<strong>" +
          meta.title +
        "</strong>" +
        "<small>" +
          meta.load +
        "</small>" +
      "</div>" +

      '<div class="bp4w-sessions">' +
        sessions
          .map(item =>
            '<div class="bp4w-session ' +
              (
                item.target
                  ? "is-target"
                  : ""
              ) +
            '">' +
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
      "</div>";
  }

  function renderModal() {
    state.profile =
      profile();

    const {
      modal
    } =
      ensureModal();

    const score =
      visibleCompatibility();

    modal.innerHTML =
      '<div class="bp4w-header">' +
        "<div>" +
          "<h3>Pla b\u00e0sic \u00b7 4 setmanes</h3>" +
          "<p>Progressi\u00f3 senzilla per combinar exercicis b\u00e0sics amb la ruta objectiu.</p>" +
        "</div>" +
        '<button class="bp4w-close" type="button" aria-label="Tancar">\u00d7</button>' +
      "</div>" +

      '<div class="bp4w-body">' +
        '<div class="bp4w-route">' +
          "<div>" +
            "<strong>" +
              state.route.name +
            "</strong>" +
            "<small>" +
              formatNumber(
                state.route.distanceKm
              ) +
              " km \u00b7 " +
              number(
                state.route.ascentM
              ) +
              " m+ \u00b7 " +
              clean(
                state.route.modality
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp4w-score">' +
            score +
            "%" +
          "</span>" +
        "</div>" +

        '<div class="bp4w-meta">' +
          '<span class="bp4w-chip">Objectiu: ' +
            goalLabel(
              state.profile.goal
            ) +
          "</span>" +
          '<span class="bp4w-chip">' +
            number(
              state.profile.daysPerWeek,
              3
            ) +
            " dies/setmana" +
          "</span>" +
          '<span class="bp4w-chip">' +
            number(
              state.profile.weeklyTimeHours,
              5
            ) +
            " h/setmana" +
          "</span>" +
        "</div>" +

        '<div class="bp4w-tabs">' +
          [1,2,3,4]
            .map(week => {
              const meta =
                weekMeta(week);

              return (
                '<button type="button" class="bp4w-tab ' +
                  (
                    state.week ===
                    week
                      ? "is-active"
                      : ""
                  ) +
                '" data-week="' +
                  week +
                '">' +
                  "<strong>Setmana " +
                    week +
                  "</strong>" +
                  "<small>" +
                    meta.title
                      .split("\u00b7")[1]
                      .trim() +
                  "</small>" +
                "</button>"
              );
            })
            .join("") +
        "</div>" +

        '<div data-bp4w-week-content></div>' +

        '<div class="bp4w-note">' +
          (
            score < 65
              ? "La ruta continua sent exigent per al perfil actual. La setmana 4 mant\u00e9 una versi\u00f3 adaptada i no obliga a completar-la sencera."
              : "El volum augmenta durant tres setmanes i baixa una mica abans de la ruta objectiu. Les sessions suaus han de continuar sent suaus."
          ) +
        "</div>" +

        '<div class="bp4w-actions">' +
          '<a class="bp4w-primary" href="../route-match/">Ajustar perfil a Route Match</a>' +
          '<button class="bp4w-secondary" type="button" data-action="close">Tancar</button>' +
          (
            routeInPlan()
              ? '<button class="bp4w-danger" type="button" data-action="remove">Treure aquesta ruta</button>'
              : ""
          ) +
        "</div>" +
      "</div>";

    const weekContent =
      modal.querySelector(
        "[data-bp4w-week-content]"
      );

    renderWeekContent(
      weekContent
    );

    modal
      .querySelectorAll(
        ".bp4w-tab"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            state.week =
              Number(
                button.dataset.week
              );

            modal
              .querySelectorAll(
                ".bp4w-tab"
              )
              .forEach(tab =>
                tab.classList.toggle(
                  "is-active",
                  Number(
                    tab.dataset.week
                  ) ===
                  state.week
                )
              );

            renderWeekContent(
              weekContent
            );
          }
        );
      });

    modal
      .querySelector(
        ".bp4w-close"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelector(
        '[data-action="close"]'
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelector(
        '[data-action="remove"]'
      )
      ?.addEventListener(
        "click",
        removeFromPlan
      );
  }

  function openModal() {
    state.profile =
      profile();

    renderModal();

    const {
      backdrop,
      modal
    } =
      ensureModal();

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

  function closeModal() {
    document
      .querySelector(
        ".bp4w-backdrop"
      )
      ?.classList.remove(
        "is-visible"
      );

    document
      .querySelector(
        ".bp4w-modal"
      )
      ?.classList.remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function syncPlanUiSoon() {
    setTimeout(
      () => {
        polishMiniPlan();
        makeRouteMatchClickable();
      },
      50
    );

    setTimeout(
      () => {
        polishMiniPlan();
        makeRouteMatchClickable();
      },
      350
    );
  }

  function interceptClicks(event) {
    const planButton =
      event.target.closest(
        "#bp360-plan"
      );

    const miniButton =
      event.target.closest(
        ".bp360-smart-plan-mini button"
      );

    if (
      !planButton &&
      !miniButton
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!routeInPlan()) {
      addToPlan();
    }

    syncPlanUiSoon();
    openModal();
  }

  function boot() {
    state.routeId =
      routeIdFromUrl();

    state.route =
      ROUTES[
        state.routeId
      ];

    state.profile =
      profile();

    if (!state.route) {
      return;
    }

    makeRouteMatchClickable();
    polishMiniPlan();

    /*
     * Document capture runs before the older target listeners.
     * This lets v2 own the Plan button without altering v1 files.
     */
    document.addEventListener(
      "click",
      interceptClicks,
      true
    );
    /*
     * Important:
     * No global MutationObserver here.
     * The previous version could create a self-triggering DOM loop
     * because polishMiniPlan() rewrote button text on every mutation.
     * Finite syncs are enough for the Route Detail lifecycle.
     */
    syncPlanUiSoon();
window.addEventListener(
      "bicipark:training-plan:updated",
      syncPlanUiSoon
    );

    window.addEventListener(
      "bicipark:route-match:profile",
      () => {
        state.profile =
          profile();
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeModal();
        }
      }
    );

    console.info(
      "[BiciPark] Smart Match + 4-week Plan polish v2"
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