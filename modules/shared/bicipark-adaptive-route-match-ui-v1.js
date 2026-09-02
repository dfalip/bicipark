(() => {
  "use strict";

  if (
    window.__BICIPARK_ADAPTIVE_ROUTE_MATCH_UI_V1__
  ) {
    return;
  }

  window.__BICIPARK_ADAPTIVE_ROUTE_MATCH_UI_V1__ =
    true;

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatNumber(value) {
    const n =
      Number(value);

    if (
      !Number.isFinite(n)
    ) {
      return "--";
    }

    return n
      .toFixed(
        n % 1 ===
        0
          ? 0
          : 1
      )
      .replace(".", ",");
  }

  function engine() {
    return window
      .BiciParkAdaptiveRouteMatch;
  }

  function historyPage() {
    return window.location
      .pathname
      .includes(
        "/activity-history/"
      );
  }

  function myPlanPage() {
    return window.location
      .pathname
      .includes(
        "/my-plan/"
      );
  }

  function routeDetailPage() {
    return window.location
      .pathname
      .includes(
        "/route-detail/"
      );
  }

  function confidenceClass(code) {
    if (code === "high") {
      return "is-high";
    }

    if (code === "medium") {
      return "is-medium";
    }

    return "is-low";
  }

  function levelSuggestion(observed) {
    if (
      observed.count <
      3
    ) {
      return "Encara no canviarem el teu perfil: necessitem mes activitats reals.";
    }

    if (
      observed.manualLevel
        .toLowerCase() ===
      observed.observedLevel
        .toLowerCase()
    ) {
      return "El teu perfil manual i el nivell observat estan alineats.";
    }

    if (
      observed.confidence.code ===
      "high"
    ) {
      return "Hi ha prou dades per revisar si vols actualitzar el teu perfil personal.";
    }

    return "S'observa una possible evolucio, pero encara cal mes historial.";
  }

  function profileAdaptiveCopy(observed) {
    if (
      observed.loadSignal ===
      "reduir"
    ) {
      return "Les ultimes sensacions suggereixen baixar temporalment la carrega.";
    }

    if (
      observed.loadSignal ===
      "progressar"
    ) {
      return "Les teves sensacions permeten augmentar la dificultat de manera gradual.";
    }

    return "BiciPark mantindra una progressio conservadora mentre apren del teu historial.";
  }

  function ensureHistorySection() {
    if (
      !historyPage() ||
      !engine()
    ) {
      return;
    }

    const progressGrid =
      document.querySelector(
        ".bp-progress-grid"
      );

    if (!progressGrid) {
      return;
    }

    let section =
      document.getElementById(
        "bp-adaptive-section"
      );

    if (!section) {
      section =
        document.createElement(
          "section"
        );

      section.id =
        "bp-adaptive-section";

      section.className =
        "bp-adaptive-section";

      progressGrid.insertAdjacentElement(
        "afterend",
        section
      );
    }

    renderHistorySection(
      section
    );
  }

  function renderHistorySection(section) {
    const observed =
      engine()
        .observedMetrics();

    const recs =
      engine()
        .recommendations(3);

    const confidence =
      observed.confidence;

    const profileHref =
      "../route-match/";

    const recommendationsHtml =
      recs.length
        ? recs
            .map(
              item => {
                const route =
                  item.route;

                const href =
                  "../route-detail/?route=" +
                  encodeURIComponent(
                    route.id
                  );

                return (
                  '<a class="bp-adaptive-route-card" href="' +
                  href +
                  '">' +
                    '<div class="bp-adaptive-route-top">' +
                      "<strong>" +
                        route.name +
                      "</strong>" +
                      '<span class="bp-adaptive-score">' +
                        item.score +
                        "%" +
                      "</span>" +
                    "</div>" +
                    '<div class="bp-adaptive-route-meta">' +
                      "<span>" +
                        formatNumber(
                          route.distanceKm
                        ) +
                        " km</span>" +
                      "<span>" +
                        Math.round(
                          route.ascentM
                        ) +
                        " m+</span>" +
                      "<span>" +
                        clean(
                          route.modality
                        ) +
                      "</span>" +
                    "</div>" +
                    "<p>" +
                      item.reason +
                    "</p>" +
                    "<em>Veure ruta \u2192</em>" +
                  "</a>"
                );
              }
            )
            .join("")
        : (
            '<div class="bp-adaptive-empty">' +
              "Encara no hi ha prou rutes al cataleg per generar alternatives." +
            "</div>"
          );

    section.innerHTML =
      '<div class="bp-adaptive-head">' +
        "<div>" +
          "<span>Adaptive Route Match</span>" +
          "<h2>BiciPark esta aprenent de tu</h2>" +
          "<p>El perfil manual es conserva. Les activitats reals creen un nivell observat independent.</p>" +
        "</div>" +
        '<span class="bp-adaptive-confidence ' +
          confidenceClass(
            confidence.code
          ) +
        '">' +
          "Confianca " +
          confidence.label +
        "</span>" +
      "</div>" +

      '<div class="bp-adaptive-grid">' +
        '<article class="bp-adaptive-profile-card">' +
          '<div class="bp-adaptive-levels">' +
            "<div>" +
              "<small>Perfil personal</small>" +
              "<strong>" +
                observed.manualLevel +
              "</strong>" +
            "</div>" +
            '<span class="bp-adaptive-arrow">\u2192</span>' +
            "<div>" +
              "<small>Nivell observat</small>" +
              "<strong>" +
                observed.observedLevel +
              "</strong>" +
            "</div>" +
          "</div>" +

          '<div class="bp-adaptive-metrics">' +
            "<div><small>Distancia observada</small><strong>" +
              formatNumber(
                observed.avgDistanceKm
              ) +
              " km</strong></div>" +
            "<div><small>Desnivell observat</small><strong>" +
              Math.round(
                observed.avgAscentM
              ) +
              " m+</strong></div>" +
            "<div><small>Activitats analitzades</small><strong>" +
              observed.count +
              "</strong></div>" +
            "<div><small>Sensacio mitjana</small><strong>" +
              (
                observed.avgFeeling
                  ? formatNumber(
                      observed.avgFeeling
                    ) +
                    "/5"
                  : "--"
              ) +
              "</strong></div>" +
          "</div>" +

          '<div class="bp-adaptive-insight">' +
            "<strong>" +
              profileAdaptiveCopy(
                observed
              ) +
            "</strong>" +
            "<span>" +
              levelSuggestion(
                observed
              ) +
            "</span>" +
          "</div>" +

          '<a class="bp-adaptive-profile-link" href="' +
            profileHref +
          '">Revisar perfil personal \u2192</a>' +
        "</article>" +

        '<article class="bp-adaptive-recommendations">' +
          '<div class="bp-adaptive-rec-head">' +
            "<div>" +
              "<small>Seguent pas</small>" +
              "<h3>Rutes recomanades per a tu</h3>" +
            "</div>" +
            '<span class="bp-adaptive-provisional">' +
              (
                confidence.code ===
                "low"
                  ? "Provisional"
                  : "Adaptatiu"
              ) +
            "</span>" +
          "</div>" +
          '<div class="bp-adaptive-route-list">' +
            recommendationsHtml +
          "</div>" +
        "</article>" +
      "</div>";
  }

  function fixFirstPeriodLabels() {
    if (
      !historyPage() ||
      !engine()
    ) {
      return;
    }

    const observed =
      engine()
        .observedMetrics();

    if (
      observed.count <=
      0
    ) {
      return;
    }

    if (
      engine()
        .previousPeriodAvailable(
          28
        )
    ) {
      return;
    }

    [
      "bp-kpi-rides-delta",
      "bp-kpi-time-delta",
      "bp-kpi-ascent-delta",
      "bp-kpi-distance-delta",
      "bp-kpi-level-delta"
    ]
      .forEach(
        id => {
          const node =
            document.getElementById(
              id
            );

          if (node) {
            node.textContent =
              "Primer periode registrat";

            node.classList.add(
              "bp-adaptive-first-period"
            );
          }
        }
      );
  }

  function currentDomRoute() {
    const catalog =
      engine()
        ?.routeCatalog() ||
      [];

    const title =
      clean(
        document.querySelector(
          "h1"
        )
          ?.textContent ||
        document.getElementById(
          "bp-route-name"
        )
          ?.textContent
      )
        .replace(
          /\s+(Facil|Mitjana|Dificil|Exigent)\s*$/i,
          ""
        )
        .toLowerCase();

    if (!title) {
      return null;
    }

    return (
      catalog.find(
        route =>
          clean(
            route.name
          )
            .toLowerCase() ===
          title
      ) ||
      catalog.find(
        route =>
          title.includes(
            clean(
              route.name
            )
              .toLowerCase()
          )
      ) ||
      null
    );
  }

  function ensureAdaptiveBadge(
    scoreNode,
    result
  ) {
    if (!scoreNode) {
      return;
    }

    let note =
      scoreNode.parentElement
        ?.querySelector(
          ".bp-adaptive-score-note"
        );

    if (!note) {
      note =
        document.createElement(
          "small"
        );

      note.className =
        "bp-adaptive-score-note";

      scoreNode.parentElement
        ?.appendChild(
          note
        );
    }

    note.textContent =
      "Adaptatiu \u00b7 confianca " +
      result.confidence.label.toLowerCase();
  }

  function applyAdaptiveScoreToRouteUi() {
    if (
      !engine() ||
      (
        !myPlanPage() &&
        !routeDetailPage()
      )
    ) {
      return;
    }

    const route =
      currentDomRoute();

    if (!route) {
      return;
    }

    const result =
      engine()
        .adaptiveScore(
          route
        );

    [
      "bp-route-score",
      "bp-side-score"
    ]
      .forEach(
        id => {
          const node =
            document.getElementById(
              id
            );

          if (node) {
            node.textContent =
              result.score +
              "%";

            ensureAdaptiveBadge(
              node,
              result
            );
          }
        }
      );
  }

  function refresh() {
    window.setTimeout(
      () => {
        ensureHistorySection();
        fixFirstPeriodLabels();
        applyAdaptiveScoreToRouteUi();
      },
      30
    );
  }

  function finiteRetries() {
    [
      0,
      220,
      650,
      1250
    ]
      .forEach(
        delay =>
          window.setTimeout(
            refresh,
            delay
          )
      );
  }

  function boot() {
    finiteRetries();

    window.addEventListener(
      "bicipark:activity-history:updated",
      finiteRetries
    );

    window.addEventListener(
      "bicipark:adaptive-route-match:updated",
      finiteRetries
    );

    console.info(
      "[BiciPark] Adaptive Route Match UI v1 loaded"
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