(() => {
  "use strict";

  if (window.__BICIPARK_ADAPTIVE_V11_PATCH__) {
    return;
  }

  window.__BICIPARK_ADAPTIVE_V11_PATCH__ = true;

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function key(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function formatNumber(value) {
    const n = Number(value);

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

  function baseEngine() {
    return window.BiciParkAdaptiveRouteMatch;
  }

  function catalog() {
    const source =
      window.BiciParkAdaptiveRouteCatalogV11 ||
      {};

    const routes =
      Object.keys(source)
        .map(
          id => {
            const route =
              source[id] ||
              {};

            return {
              ...route,
              id:
                clean(
                  route.id ||
                  id
                ),
              name:
                clean(
                  route.name ||
                  id
                ),
              distanceKm:
                num(
                  route.distanceKm ??
                  route.distance ??
                  route.km
                ),
              ascentM:
                num(
                  route.ascentM ??
                  route.ascent ??
                  route.elevationGain
                ),
              modality:
                clean(
                  route.modality ||
                  route.type ||
                  "Ciclisme"
                ),
              compatibilityScore:
                num(
                  route.compatibilityScore ??
                  route.compatibility,
                  78
                )
            };
          }
        )
        .filter(
          route =>
            route.name &&
            route.distanceKm > 0
        );

    const seen = new Set();

    return routes.filter(
      route => {
        const routeKey =
          key(
            route.id ||
            route.name
          );

        if (
          !routeKey ||
          seen.has(routeKey)
        ) {
          return false;
        }

        seen.add(routeKey);
        return true;
      }
    );
  }

  function recentActivities(limit = 3) {
    let list = [];

    if (
      window.BiciParkActivitySync
    ) {
      list =
        window.BiciParkActivitySync
          .getActivities({
            includeDemo: false
          });
    }
    else {
      try {
        list =
          JSON.parse(
            localStorage.getItem(
              "bicipark.activityHistory.v1"
            ) ||
            "[]"
          );
      }
      catch (_) {
        list = [];
      }
    }

    return [...list]
      .filter(
        item =>
          item &&
          item.demo !== true
      )
      .sort(
        (a, b) =>
          new Date(
            b.date +
            "T" +
            (
              b.time ||
              "12:00"
            )
          ) -
          new Date(
            a.date +
            "T" +
            (
              a.time ||
              "12:00"
            )
          )
      )
      .slice(
        0,
        limit
      );
  }

  function completedKeys() {
    const result =
      new Set();

    recentActivities(3)
      .forEach(
        activity => {
          if (activity.name) {
            result.add(
              "name:" +
              key(
                activity.name
              )
            );
          }

          if (activity.routeId) {
            result.add(
              "id:" +
              key(
                activity.routeId
              )
            );
          }
        }
      );

    return result;
  }

  function recentlyCompleted(
    route,
    completed
  ) {
    return (
      completed.has(
        "name:" +
        key(
          route.name
        )
      ) ||
      completed.has(
        "id:" +
        key(
          route.id
        )
      )
    );
  }

  function purposeFor(
    route,
    observed,
    score
  ) {
    const base =
      Math.max(
        num(
          observed.avgDistanceKm,
          1
        ),
        1
      );

    const ratio =
      route.distanceKm /
      base;

    if (ratio <= .92) {
      return {
        code: "recovery",
        label: "Sortida suau"
      };
    }

    if (
      ratio >= 1.05 &&
      ratio <= 1.30 &&
      score >= 70
    ) {
      return {
        code: "progression",
        label: "Progressi\u00f3 suau"
      };
    }

    if (
      ratio > 1.55 ||
      score < 70
    ) {
      return {
        code: "future",
        label: "Repte futur"
      };
    }

    return {
      code: "balanced",
      label: "Alternativa"
    };
  }

  function reasonFor(
    route,
    observed,
    purpose,
    score
  ) {
    const baseDistance =
      Math.max(
        num(
          observed.avgDistanceKm,
          1
        ),
        1
      );

    const delta =
      (
        route.distanceKm -
        baseDistance
      ) /
      baseDistance *
      100;

    if (
      purpose.code ===
      "recovery"
    ) {
      return "M\u00e9s curta i controlada: bona opci\u00f3 per recuperar o sumar const\u00e0ncia.";
    }

    if (
      purpose.code ===
      "future"
    ) {
      return "No \u00e9s la seg\u00fcent sortida ideal; queda guardada com a repte per m\u00e9s endavant.";
    }

    if (
      purpose.code ===
      "progression"
    ) {
      return (
        "+" +
        Math.round(delta) +
        "% de dist\u00e0ncia: progressi\u00f3 gradual respecte al teu nivell observat."
      );
    }

    if (score >= 88) {
      return "Molt bona compatibilitat amb el teu nivell observat.";
    }

    return "Alternativa coherent amb el teu perfil i les activitats registrades.";
  }

  function recommendations(limit = 3) {
    const engine =
      baseEngine();

    if (!engine) {
      return [];
    }

    const observed =
      engine.observedMetrics();

    const completed =
      completedKeys();

    const scored =
      catalog()
        .filter(
          route =>
            !recentlyCompleted(
              route,
              completed
            )
        )
        .map(
          route => {
            const result =
              engine.adaptiveScore(
                route
              );

            const purpose =
              purposeFor(
                route,
                observed,
                result.score
              );

            return {
              route,
              score:
                result.score,
              purpose,
              confidence:
                result.confidence,
              result
            };
          }
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    const chosen = [];
    const used = new Set();

    function add(item) {
      if (
        !item ||
        chosen.length >= limit ||
        used.has(
          item.route.id
        )
      ) {
        return;
      }

      item.reason =
        reasonFor(
          item.route,
          observed,
          item.purpose,
          item.score
        );

      chosen.push(item);
      used.add(
        item.route.id
      );
    }

    [
      "progression",
      "balanced",
      "recovery"
    ]
      .forEach(
        purpose => {
          add(
            scored.find(
              item =>
                item.purpose.code ===
                purpose &&
                !used.has(
                  item.route.id
                )
            )
          );
        }
      );

    scored
      .filter(
        item =>
          item.purpose.code !==
          "future" &&
          item.score >= 60
      )
      .forEach(add);

    if (chosen.length < 2) {
      scored
        .filter(
          item =>
            item.purpose.code ===
            "future"
        )
        .forEach(add);
    }

    return chosen.slice(
      0,
      limit
    );
  }

  function installEngineOverrides() {
    const engine =
      baseEngine();

    if (!engine) {
      return false;
    }

    engine.routeCatalog =
      catalog;

    engine.recommendations =
      recommendations;

    engine.version =
      "1.1";

    return true;
  }

  function purposeClass(code) {
    if (code === "progression") {
      return "is-progression";
    }

    if (code === "recovery") {
      return "is-recovery";
    }

    if (code === "future") {
      return "is-future";
    }

    return "is-balanced";
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

  function adaptiveCopy(observed) {
    if (
      observed.loadSignal ===
      "reduir"
    ) {
      return "Les \u00faltimes sensacions suggereixen reduir temporalment la c\u00e0rrega.";
    }

    if (
      observed.loadSignal ===
      "progressar"
    ) {
      return "Les teves sensacions permeten augmentar la dificultat de manera gradual.";
    }

    return "BiciPark mantindr\u00e0 una progressi\u00f3 conservadora mentre apr\u00e8n del teu historial.";
  }

  function levelCopy(observed) {
    if (observed.count < 3) {
      return "Encara no canviarem el teu perfil: necessitem m\u00e9s activitats reals.";
    }

    if (
      key(
        observed.manualLevel
      ) ===
      key(
        observed.observedLevel
      )
    ) {
      return "El teu perfil personal i el nivell observat estan alineats.";
    }

    if (
      observed.confidence.code ===
      "high"
    ) {
      return "Ja hi ha prou dades per valorar si vols actualitzar el teu perfil personal.";
    }

    return "S'observa una possible evoluci\u00f3, per\u00f2 encara cal m\u00e9s historial.";
  }

  function renderHistory() {
    if (
      !window.location.pathname
        .includes(
          "/activity-history/"
        )
    ) {
      return;
    }

    const engine =
      baseEngine();

    const section =
      document.getElementById(
        "bp-adaptive-section"
      );

    if (
      !engine ||
      !section
    ) {
      return;
    }

    const observed =
      engine.observedMetrics();

    const recs =
      recommendations(3);

    const cards =
      recs.length
        ? recs.map(
            item => {
              const route =
                item.route;

              return (
                '<a class="bp-adaptive-route-card" href="../route-detail/?route=' +
                encodeURIComponent(
                  route.id
                ) +
                '">' +

                  '<div class="bp-adaptive-purpose ' +
                    purposeClass(
                      item.purpose.code
                    ) +
                  '">' +
                    item.purpose.label +
                  "</div>" +

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
                      route.modality +
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
              "No hi ha prou alternatives diferents al cat\u00e0leg actual." +
            "</div>"
          );

    section.innerHTML =
      '<div class="bp-adaptive-head">' +
        "<div>" +
          "<span>Adaptive Route Match</span>" +
          "<h2>BiciPark est\u00e0 aprenent de tu</h2>" +
          "<p>El perfil personal es conserva. Les activitats reals creen un nivell observat independent.</p>" +
        "</div>" +

        '<span class="bp-adaptive-confidence ' +
          confidenceClass(
            observed.confidence.code
          ) +
        '">' +
          "Confian\u00e7a " +
          observed.confidence.label +
        "</span>" +
      "</div>" +

      '<div class="bp-adaptive-grid">' +
        '<article class="bp-adaptive-profile-card">' +

          '<div class="bp-adaptive-levels">' +
            "<div><small>Perfil personal</small><strong>" +
              observed.manualLevel +
            "</strong></div>" +

            '<span class="bp-adaptive-arrow">\u2192</span>' +

            "<div><small>Nivell observat</small><strong>" +
              observed.observedLevel +
            "</strong></div>" +
          "</div>" +

          '<div class="bp-adaptive-metrics">' +
            "<div><small>Dist\u00e0ncia observada</small><strong>" +
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

            "<div><small>Sensaci\u00f3 mitjana</small><strong>" +
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
              adaptiveCopy(
                observed
              ) +
            "</strong>" +
            "<span>" +
              levelCopy(
                observed
              ) +
            "</span>" +
          "</div>" +

          '<a class="bp-adaptive-profile-link" href="../route-match/">' +
            "Revisar perfil personal \u2192" +
          "</a>" +
        "</article>" +

        '<article class="bp-adaptive-recommendations">' +
          '<div class="bp-adaptive-rec-head">' +
            "<div>" +
              "<small>Seg\u00fcent pas</small>" +
              "<h3>Rutes recomanades per a tu</h3>" +
            "</div>" +

            '<span class="bp-adaptive-provisional">' +
              (
                observed.confidence.code ===
                "low"
                  ? "Recomanacions provisionals"
                  : "Recomanacions adaptatives"
              ) +
            "</span>" +
          "</div>" +

          '<div class="bp-adaptive-route-list">' +
            cards +
          "</div>" +
        "</article>" +
      "</div>";

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

          if (
            node &&
            node.textContent
              .toLowerCase()
              .includes(
                "primer periode"
              )
          ) {
            node.textContent =
              "Primer per\u00edode registrat";
          }
        }
      );
  }

  function refresh() {
    installEngineOverrides();

    window.setTimeout(
      renderHistory,
      20
    );
  }

  function boot() {
    [
      0,
      200,
      600,
      1200
    ]
      .forEach(
        delay =>
          window.setTimeout(
            refresh,
            delay
          )
      );

    window.addEventListener(
      "bicipark:activity-history:updated",
      refresh
    );

    window.addEventListener(
      "bicipark:adaptive-route-match:updated",
      refresh
    );

    console.info(
      "[BiciPark] Adaptive Route Match v1.1 patch loaded"
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