(() => {
  "use strict";

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /route-intelligence\.js/.test(
          script.src
        )
      );

  const baseUrl =
    new URL("./", selfScript.src);

  const POP_EVENTS_KEY =
    "bicipark.popularity.events.v1";

  const POP_GEO_KEY =
    "bicipark.popularity.routeGeo.v2";

  const weights = {
    security: 24,
    quality: 20,
    weather: 20,
    incidents: 14,
    bikeBases: 10,
    highlights: 7,
    popularity: 5
  };

  const state = {
    routes: [],
    route: null,
    factors: {},
    score: null
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function canonicalId(name, explicitId) {
    const explicit = normalize(explicitId);
    const byName = normalize(name);
    const text = explicit || byName;

    if (/carretera.*aigues/.test(text) || /carretera.*aigues/.test(byName)) {
      return "carretera-aigues";
    }

    if (/front.*maritim/.test(text) || /front.*maritim/.test(byName)) {
      return "front-maritim";
    }

    if (/\bbesos\b/.test(text) || /\bbesos\b/.test(byName)) {
      return "riu-besos";
    }

    return text.replace(/\s+/g, "-").slice(0,120);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function status(message, mode = "") {
    const node = document.getElementById("riStatus");

    node.textContent = message;
    node.className =
      "ri-status" +
      (mode ? " is-" + mode : "");
  }

  async function fetchJson(url) {
    const response =
      await fetch(
        url,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status
      );
    }

    return response.json();
  }

  function readArray(key) {
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(key) ||
          "[]"
        );

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  function readObject(key) {
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(key) ||
          "{}"
        );

      return (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      )
        ? parsed
        : {};
    } catch (_) {
      return {};
    }
  }

  function validLatLng(lat, lng) {
    if (
      lat === null ||
      lat === undefined ||
      lng === null ||
      lng === undefined ||
      lat === "" ||
      lng === ""
    ) {
      return false;
    }

    const y = Number(lat);
    const x = Number(lng);

    return (
      Number.isFinite(y) &&
      Number.isFinite(x) &&
      y >= 34 &&
      y <= 53 &&
      x >= -11 &&
      x <= 14
    );
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad = value => value * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  async function loadRoutes() {
    const raw =
      await fetchJson(
        new URL(
          "./data/known-routes.json",
          baseUrl
        ).href
      );

    state.routes =
      Array.isArray(raw)
        ? raw
        : [];
  }

  function renderRouteSelect() {
    const select =
      document.getElementById(
        "riRouteSelect"
      );

    select.innerHTML =
      state.routes
        .map(route =>
          '<option value="' +
            escapeHtml(route.id) +
            '">' +
            escapeHtml(route.name) +
          "</option>"
        )
        .join("");

    state.route =
      state.routes[0] ||
      null;
  }

  function routeCenter(route) {
    const geo =
      readObject(
        POP_GEO_KEY
      );

    const id =
      canonicalId(
        route.name,
        route.id
      );

    const saved =
      geo[id];

    if (
      saved &&
      Array.isArray(saved.points) &&
      saved.points.length
    ) {
      const valid =
        saved.points
          .filter(point =>
            Array.isArray(point) &&
            validLatLng(
              point[0],
              point[1]
            )
          );

      if (valid.length) {
        const sum =
          valid.reduce(
            (acc, point) => {
              acc.lat +=
                Number(point[0]);

              acc.lng +=
                Number(point[1]);

              return acc;
            },
            {
              lat: 0,
              lng: 0
            }
          );

        return {
          lat:
            sum.lat /
            valid.length,
          lng:
            sum.lng /
            valid.length
        };
      }
    }

    if (
      validLatLng(
        route.lat,
        route.lng
      )
    ) {
      return {
        lat:
          Number(route.lat),
        lng:
          Number(route.lng)
      };
    }

    return null;
  }

  async function weatherFactor(route) {
    const center =
      routeCenter(route);

    if (!center) {
      return null;
    }

    const params =
      new URLSearchParams({
        latitude:
          String(center.lat),
        longitude:
          String(center.lng),
        current:
          [
            "temperature_2m",
            "precipitation",
            "wind_speed_10m"
          ].join(","),
        timezone:
          "Europe/Madrid"
      });

    const data =
      await fetchJson(
        "https://api.open-meteo.com/v1/forecast?" +
        params.toString()
      );

    const current =
      data.current || {};

    const temp =
      Number(
        current.temperature_2m
      );

    const rain =
      Number(
        current.precipitation
      );

    const wind =
      Number(
        current.wind_speed_10m
      );

    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(wind)
    ) {
      return null;
    }

    let score = 100;

    if (temp < 8) {
      score -=
        (8 - temp) * 3;
    }

    if (temp > 30) {
      score -=
        (temp - 30) * 4;
    }

    if (
      temp >= 12 &&
      temp <= 25
    ) {
      score += 2;
    }

    if (
      Number.isFinite(rain)
    ) {
      score -=
        rain * 4;
    }

    if (wind > 15) {
      score -=
        (wind - 15) * 1.6;
    }

    if (wind > 30) {
      score -= 8;
    }

    score =
      clamp(
        Math.round(score),
        0,
        100
      );

    return {
      score,
      detail:
        Math.round(temp) +
        " C · " +
        Math.round(wind) +
        " km/h" +
        (
          Number.isFinite(rain)
            ? " · " +
              rain +
              " mm"
            : ""
        )
    };
  }

  function popularityFactor(route) {
    const events =
      readArray(
        POP_EVENTS_KEY
      );

    const id =
      canonicalId(
        route.name,
        route.id
      );

    let points = 0;
    let count = 0;

    events.forEach(event => {
      const eventId =
        canonicalId(
          event.routeName,
          event.routeId
        );

      if (eventId !== id) {
        return;
      }

      count++;

      if (
        event.type ===
        "route-open"
      ) {
        points += 3;
      } else if (
        event.type ===
        "weather-open"
      ) {
        points += 2;
      } else {
        points += 1;
      }
    });

    if (!count) {
      return {
        score: 50,
        detail:
          "Encara sense prou activitat local",
        neutral: true
      };
    }

    return {
      score:
        clamp(
          50 +
          points * 5,
          50,
          100
        ),
      detail:
        count +
        " interaccions · " +
        points +
        " punts locals"
    };
  }

  async function loadBikeBases() {
    const candidates = [
      "../../bike-bases/data/bike-bases.json",
      "../../bike-bases/data/catalog.json"
    ];

    for (const relative of candidates) {
      try {
        const raw =
          await fetchJson(
            new URL(
              relative,
              baseUrl
            ).href
          );

        const list =
          Array.isArray(raw)
            ? raw
            : (
                Array.isArray(raw?.items)
                  ? raw.items
                  : (
                      Array.isArray(raw?.bases)
                        ? raw.bases
                        : null
                    )
              );

        if (list) {
          return list;
        }
      } catch (_) {}
    }

    return null;
  }

  function extractLatLng(item) {
    const candidates = [
      [
        item?.lat,
        item?.lng
      ],
      [
        item?.latitude,
        item?.longitude
      ],
      [
        item?.location?.lat,
        item?.location?.lng
      ],
      [
        item?.coordinates?.lat,
        item?.coordinates?.lng
      ]
    ];

    for (const pair of candidates) {
      if (
        validLatLng(
          pair[0],
          pair[1]
        )
      ) {
        return {
          lat:
            Number(pair[0]),
          lng:
            Number(pair[1])
        };
      }
    }

    return null;
  }

  async function bikeBasesFactor(route) {
    const center =
      routeCenter(route);

    if (!center) {
      return null;
    }

    const bases =
      await loadBikeBases();

    if (!bases) {
      return null;
    }

    const distances =
      bases
        .map(extractLatLng)
        .filter(Boolean)
        .map(point =>
          haversineKm(
            center,
            point
          )
        )
        .sort(
          (a, b) =>
            a - b
        );

    if (!distances.length) {
      return null;
    }

    const near10 =
      distances.filter(
        d => d <= 10
      ).length;

    const near25 =
      distances.filter(
        d => d <= 25
      ).length;

    const nearest =
      distances[0];

    let score =
      45;

    if (nearest <= 5) {
      score += 25;
    } else if (
      nearest <= 10
    ) {
      score += 18;
    } else if (
      nearest <= 25
    ) {
      score += 10;
    }

    score +=
      Math.min(
        25,
        near10 * 7 +
        Math.max(
          0,
          near25 - near10
        ) * 3
      );

    return {
      score:
        clamp(
          score,
          0,
          100
        ),
      detail:
        near10 +
        " Bike Bases <=10 km · mes propera " +
        nearest.toFixed(1) +
        " km"
    };
  }

  async function genericPointDatasetFactor(
    route,
    candidates,
    label
  ) {
    const center =
      routeCenter(route);

    if (!center) {
      return null;
    }

    let list = null;

    for (const relative of candidates) {
      try {
        const raw =
          await fetchJson(
            new URL(
              relative,
              baseUrl
            ).href
          );

        list =
          Array.isArray(raw)
            ? raw
            : (
                Array.isArray(raw?.items)
                  ? raw.items
                  : (
                      Array.isArray(raw?.features)
                        ? raw.features
                        : null
                    )
              );

        if (list) {
          break;
        }
      } catch (_) {}
    }

    if (!list) {
      return null;
    }

    const points =
      list
        .map(item => {
          if (
            item?.geometry?.type ===
            "Point" &&
            Array.isArray(
              item.geometry.coordinates
            )
          ) {
            return {
              lat:
                Number(
                  item.geometry.coordinates[1]
                ),
              lng:
                Number(
                  item.geometry.coordinates[0]
                )
            };
          }

          return extractLatLng(item);
        })
        .filter(point =>
          point &&
          validLatLng(
            point.lat,
            point.lng
          )
        );

    if (!points.length) {
      return null;
    }

    const near =
      points
        .map(point =>
          haversineKm(
            center,
            point
          )
        )
        .filter(
          d => d <= 10
        );

    return {
      count:
        near.length,
      detail:
        near.length +
        " " +
        label +
        " <=10 km"
    };
  }

  async function highlightsFactor(route) {
    const result =
      await genericPointDatasetFactor(
        route,
        [
          "../highlights/data/highlights.json",
          "../highlights/data/points.json",
          "../highlights/data/items.json"
        ],
        "Highlights"
      );

    if (!result) {
      return null;
    }

    return {
      score:
        clamp(
          55 +
          result.count * 7,
          55,
          100
        ),
      detail:
        result.detail
    };
  }

  async function incidentsFactor(route) {
    const result =
      await genericPointDatasetFactor(
        route,
        [
          "../live-conditions/data/conditions.json",
          "../live-conditions/data/incidents.json",
          "../live-conditions/data/items.json"
        ],
        "avisos"
      );

    if (!result) {
      return null;
    }

    return {
      score:
        clamp(
          100 -
          result.count * 14,
          25,
          100
        ),
      detail:
        result.count
          ? result.detail
          : "Sense avisos propers detectats"
    };
  }

  function staticFactor(score, detail) {
    return {
      score:
        Number(score),
      detail
    };
  }

  function computeOverall(factors) {
    let weighted = 0;
    let weightTotal = 0;

    Object.entries(factors)
      .forEach(([key, factor]) => {
        if (
          !factor ||
          !Number.isFinite(
            Number(
              factor.score
            )
          )
        ) {
          return;
        }

        const weight =
          weights[key] || 0;

        weighted +=
          Number(
            factor.score
          ) *
          weight;

        weightTotal +=
          weight;
      });

    if (!weightTotal) {
      return null;
    }

    return Math.round(
      weighted /
      weightTotal
    );
  }

  function labelForScore(score) {
    if (score >= 90) {
      return "Excel·lent";
    }

    if (score >= 80) {
      return "Molt bona";
    }

    if (score >= 70) {
      return "Bona";
    }

    if (score >= 60) {
      return "Correcta";
    }

    return "Millorable";
  }

  function factorCard(
    title,
    icon,
    factor,
    fallback
  ) {
    if (!factor) {
      return (
        '<article class="ri-factor-card">' +
          '<div class="ri-factor-head">' +
            "<strong>" +
              icon +
              " " +
              title +
            "</strong>" +
            '<span class="ri-factor-score is-na">Sense dades</span>' +
          "</div>" +
          '<div class="ri-bar"><span style="--value:0"></span></div>' +
          "<p>" +
            escapeHtml(
              fallback
            ) +
          "</p>" +
        "</article>"
      );
    }

    return (
      '<article class="ri-factor-card">' +
        '<div class="ri-factor-head">' +
          "<strong>" +
            icon +
            " " +
            title +
          "</strong>" +
          '<span class="ri-factor-score">' +
            Math.round(
              factor.score
            ) +
          "</span>" +
        "</div>" +
        '<div class="ri-bar"><span style="--value:' +
          clamp(
            Math.round(
              factor.score
            ),
            0,
            100
          ) +
          '"></span></div>' +
        "<p>" +
          escapeHtml(
            factor.detail ||
            ""
          ) +
        "</p>" +
      "</article>"
    );
  }

  function render() {
    const route =
      state.route;

    const factors =
      state.factors;

    document.getElementById(
      "riRouteName"
    ).textContent =
      route.name;

    document.getElementById(
      "riRouteMeta"
    ).innerHTML =
      "<span>" +
        route.distanceKm +
        " km</span>" +
      "<span>+" +
        route.elevationM +
        " m</span>" +
      "<span>" +
        escapeHtml(
          route.difficulty
        ) +
        "</span>" +
      "<span>" +
        escapeHtml(
          route.mode
        ) +
        "</span>";

    const score =
      state.score;

    document.getElementById(
      "riHeroScore"
    ).textContent =
      score == null
        ? "-"
        : String(score);

    document.getElementById(
      "riRing"
    ).style.setProperty(
      "--score",
      score == null
        ? "0"
        : String(score)
    );

    document.getElementById(
      "riRingScore"
    ).textContent =
      score == null
        ? "-"
        : String(score);

    document.getElementById(
      "riOverallLabel"
    ).textContent =
      score == null
        ? "Sense prou dades"
        : labelForScore(
            score
          );

    const available =
      Object.values(
        factors
      )
        .filter(Boolean)
        .length;

    document.getElementById(
      "riOverallCopy"
    ).textContent =
      "Score calculat amb " +
      available +
      " de 7 senyals disponibles. Els factors sense dades no penalitzen la ruta.";

    document.getElementById(
      "riFactors"
    ).innerHTML =
      factorCard(
        "Seguretat",
        "🛡",
        factors.security,
        "Score base de seguretat no disponible."
      ) +
      factorCard(
        "Qualitat via",
        "🛣",
        factors.quality,
        "Score base de qualitat no disponible."
      ) +
      factorCard(
        "Meteorologia",
        "☀",
        factors.weather,
        "No s'ha pogut consultar Open-Meteo."
      ) +
      factorCard(
        "Incidències",
        "⚠",
        factors.incidents,
        "Mòdul Live Conditions sense dataset compatible."
      ) +
      factorCard(
        "Bike Bases",
        "🏡",
        factors.bikeBases,
        "No s'ha pogut llegir el catàleg Bike Bases."
      ) +
      factorCard(
        "Highlights",
        "✦",
        factors.highlights,
        "Mòdul Highlights sense dataset compatible."
      ) +
      factorCard(
        "Popularitat",
        "🔥",
        factors.popularity,
        "Sense activitat local."
      );

    renderExplanations();
    renderSources();
  }

  function renderExplanations() {
    const list =
      document.getElementById(
        "riExplainList"
      );

    const items = [];

    const f =
      state.factors;

    if (
      f.security?.score >= 85
    ) {
      items.push(
        "✓ Seguretat alta segons el score base actual de BiciPark."
      );
    } else if (
      f.security
    ) {
      items.push(
        "⚠ La seguretat és un factor a revisar abans de sortir."
      );
    }

    if (
      f.quality?.score >= 85
    ) {
      items.push(
        "✓ Bona qualitat general de la ruta segons les dades base."
      );
    }

    if (
      f.weather?.score >= 85
    ) {
      items.push(
        "✓ Meteorologia favorable en aquest moment."
      );
    } else if (
      f.weather
    ) {
      items.push(
        "⚠ La meteorologia redueix l'atractiu actual de la ruta."
      );
    }

    if (
      f.incidents?.score >= 90
    ) {
      items.push(
        "✓ No s'han detectat incidències rellevants a prop."
      );
    } else if (
      f.incidents
    ) {
      items.push(
        "⚠ Hi ha incidències properes que poden afectar el recorregut."
      );
    }

    if (
      f.bikeBases?.score >= 75
    ) {
      items.push(
        "✓ Bona cobertura de Bike Bases o serveis ciclistes propers."
      );
    }

    if (
      f.highlights?.score >= 70
    ) {
      items.push(
        "✓ La ruta té punts d'interès que milloren l'experiència."
      );
    }

    if (
      f.popularity?.score >= 70
    ) {
      items.push(
        "✓ Hi ha interès local recent dels usuaris de BiciPark."
      );
    }

    if (!items.length) {
      items.push(
        "ℹ Encara falten dades per generar explicacions més detallades."
      );
    }

    list.innerHTML =
      items
        .map(item =>
          "<li>" +
            escapeHtml(item) +
          "</li>"
        )
        .join("");
  }

  function renderSources() {
    const root =
      document.getElementById(
        "riSourceList"
      );

    const rows = [
      [
        "Seguretat BiciPark",
        Boolean(
          state.factors.security
        )
      ],
      [
        "Qualitat BiciPark",
        Boolean(
          state.factors.quality
        )
      ],
      [
        "Open-Meteo",
        Boolean(
          state.factors.weather
        )
      ],
      [
        "Live Conditions",
        Boolean(
          state.factors.incidents
        )
      ],
      [
        "Bike Bases",
        Boolean(
          state.factors.bikeBases
        )
      ],
      [
        "Highlights",
        Boolean(
          state.factors.highlights
        )
      ],
      [
        "Popularity local",
        Boolean(
          state.factors.popularity
        )
      ]
    ];

    root.innerHTML =
      rows
        .map(([name, ok]) =>
          '<div class="ri-source">' +
            "<strong>" +
              escapeHtml(name) +
            "</strong>" +
            '<span class="' +
              (
                ok
                  ? "is-ok"
                  : "is-missing"
              ) +
              '">' +
              (
                ok
                  ? "Disponible"
                  : "Sense dades"
              ) +
            "</span>" +
          "</div>"
        )
        .join("");
  }

  async function analyze() {
    if (!state.route) {
      return;
    }

    status(
      "Combinant senyals de BiciPark...",
      "loading"
    );

    const route =
      state.route;

    const factors = {
      security:
        Number.isFinite(
          Number(
            route.securityScore
          )
        )
          ? staticFactor(
              Number(
                route.securityScore
              ),
              "Score base actual de BiciPark"
            )
          : null,

      quality:
        Number.isFinite(
          Number(
            route.qualityScore
          )
        )
          ? staticFactor(
              Number(
                route.qualityScore
              ),
              "Score base actual de qualitat"
            )
          : null,

      popularity:
        popularityFactor(
          route
        )
    };

    const [
      weather,
      incidents,
      bikeBases,
      highlights
    ] =
      await Promise.all([
        weatherFactor(route)
          .catch(() => null),

        incidentsFactor(route)
          .catch(() => null),

        bikeBasesFactor(route)
          .catch(() => null),

        highlightsFactor(route)
          .catch(() => null)
      ]);

    factors.weather =
      weather;

    factors.incidents =
      incidents;

    factors.bikeBases =
      bikeBases;

    factors.highlights =
      highlights;

    state.factors =
      factors;

    state.score =
      computeOverall(
        factors
      );

    render();

    status(
      "Route Intelligence actualitzat. Cap factor sense dades penalitza el score."
    );
  }

  function bindUi() {
    document.getElementById(
      "riRouteSelect"
    ).addEventListener(
      "change",
      event => {
        state.route =
          state.routes.find(
            route =>
              route.id ===
              event.target.value
          ) ||
          state.routes[0];

        analyze();
      }
    );

    document.getElementById(
      "riAnalyzeButton"
    ).addEventListener(
      "click",
      analyze
    );
  }

  async function boot() {
    bindUi();

    try {
      await loadRoutes();
      renderRouteSelect();
      await analyze();

      window.BiciParkRouteIntelligence = {
        analyze,
        getRoute: () =>
          state.route,
        getFactors: () =>
          ({
            ...state.factors
          }),
        getScore: () =>
          state.score
      };

      window.BiciParkCore
        ?.registerModule({
          id:
            "route-intelligence",
          version:
            "1.0.0",
          api:
            window.BiciParkRouteIntelligence
        });

      console.info(
        "[Route Intelligence] v1 ready."
      );
    } catch (error) {
      console.error(
        "[Route Intelligence]",
        error
      );

      status(
        "No s'ha pogut iniciar Route Intelligence.",
        "error"
      );
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();