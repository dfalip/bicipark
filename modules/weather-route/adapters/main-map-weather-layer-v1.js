(() => {
  "use strict";

  if (window.__BICIPARK_WEATHER_MAIN_MAP_SAFE_V3__) {
    return;
  }

  window.__BICIPARK_WEATHER_MAIN_MAP_SAFE_V3__ = true;

  if (!window.L) {
    console.warn("[Weather Main Map] Leaflet no disponible.");
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /weather-route\/adapters\/main-map-weather-layer-v1\.js/.test(
          script.src
        )
      );

  if (!selfScript?.src) {
    return;
  }

  const adapterUrl =
    new URL("./", selfScript.src);

  const weatherModuleUrl =
    new URL("../", adapterUrl);

  const routesUrl =
    new URL(
      "../data/weather-routes.json",
      adapterUrl
    ).href;

  const state = {
    map: null,
    layer: null,
    routes: [],
    items: [],
    visible: false,
    loading: false,
    booted: false,
    lastForecastAt: 0,
    visibilityToken: 0
  };

  const CACHE_MS =
    10 * 60 * 1000;

  function escapeHtml(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validCoordinate(value, kind) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return false;
    }

    const n =
      Number(value);

    if (!Number.isFinite(n)) {
      return false;
    }

    return kind === "lat"
      ? n >= 34 && n <= 53
      : n >= -11 && n <= 14;
  }

  function validPoint(point) {
    return (
      Array.isArray(point) &&
      validCoordinate(
        point[0],
        "lat"
      ) &&
      validCoordinate(
        point[1],
        "lng"
      )
    );
  }

  function validPoints(points) {
    return (
      Array.isArray(points) &&
      points.length >= 2 &&
      points.every(validPoint)
    );
  }

  function normalizeRoute(raw) {
    if (!raw) {
      return null;
    }

    const points =
      validPoints(raw.points)
        ? raw.points.map(point => [
            Number(point[0]),
            Number(point[1])
          ])
        : null;

    if (!points) {
      return null;
    }

    return {
      id:
        String(
          raw.id ||
          raw.slug ||
          raw.name ||
          "route"
        ),

      name:
        String(
          raw.name ||
          raw.title ||
          raw.id ||
          "Ruta"
        ),

      points
    };
  }

  function routePointAt(route, fraction) {
    const points =
      route.points;

    if (!points.length) {
      return null;
    }

    const safeFraction =
      Math.max(
        0,
        Math.min(
          1,
          Number(fraction)
        )
      );

    const index =
      Math.max(
        0,
        Math.min(
          points.length - 1,
          Math.round(
            (points.length - 1) *
            safeFraction
          )
        )
      );

    const point =
      points[index];

    return {
      lat:
        Number(point[0]),
      lng:
        Number(point[1])
    };
  }

  function forecastPoint(route) {
    /*
     * Forecast stays close to route center for a representative
     * quick summary.
     */
    return routePointAt(
      route,
      0.50
    );
  }

  function markerPoint(route) {
    /*
     * Popularity uses a central route marker.
     * Weather intentionally uses a different route position
     * to keep both layers readable when active together.
     */
    return routePointAt(
      route,
      0.37
    );
  }

  function weatherScore(temp, rain, wind) {
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
        rain * 5;
    }

    if (wind > 15) {
      score -=
        (wind - 15) * 1.5;
    }

    if (wind > 30) {
      score -= 8;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  }

  function scoreClass(score) {
    if (score >= 85) {
      return "is-good";
    }

    if (score >= 65) {
      return "is-caution";
    }

    return "is-poor";
  }

  function scoreColor(score) {
    if (score >= 85) {
      return "#1b8a54";
    }

    if (score >= 65) {
      return "#d08a1d";
    }

    return "#c9554b";
  }

  function weatherIcon(code) {
    const value =
      Number(code);

    if (value === 0) {
      return "\u2600\uFE0F";
    }

    if (
      value === 1 ||
      value === 2
    ) {
      return "\u26C5";
    }

    if (
      value === 3 ||
      value === 45 ||
      value === 48
    ) {
      return "\u2601\uFE0F";
    }

    if (
      value >= 51 &&
      value <= 67
    ) {
      return "\u2614";
    }

    if (
      value >= 71 &&
      value <= 77
    ) {
      return "\u2744\uFE0F";
    }

    if (
      value >= 80 &&
      value <= 82
    ) {
      return "\u2614";
    }

    if (
      value === 85 ||
      value === 86
    ) {
      return "\u2744\uFE0F";
    }

    if (value >= 95) {
      return "\u26C8\uFE0F";
    }

    return "\u26C5";
  }

  function alertHtml(item) {
    if (
      Number(item.rain) >= 0.5
    ) {
      return (
        '<span class="bp-weather-map-alert">' +
          "\u2614 " +
          Number(item.rain).toFixed(1) +
        "</span>"
      );
    }

    if (
      Number(item.wind) >= 28
    ) {
      return (
        '<span class="bp-weather-map-alert">' +
          "\uD83D\uDCA8 " +
          Math.round(item.wind) +
        "</span>"
      );
    }

    return "";
  }

  function markerIcon(item) {
    const html =
      '<div class="bp-weather-map-marker ' +
        scoreClass(item.score) +
        '">' +
        '<span class="bp-weather-map-marker-icon">' +
          weatherIcon(item.weatherCode) +
        "</span>" +
        '<span class="bp-weather-map-marker-temp">' +
          Math.round(item.temp) +
          "\u00b0" +
        "</span>" +
        alertHtml(item) +
      "</div>";

    const hasAlert =
      Number(item.rain) >= 0.5 ||
      Number(item.wind) >= 28;

    return L.divIcon({
      className:
        "bp-weather-map-marker-wrap",

      html,

      iconSize:
        [
          hasAlert ? 76 : 48,
          30
        ],

      iconAnchor:
        [
          hasAlert ? 38 : 24,
          15
        ],

      popupAnchor:
        [0, -14]
    });
  }

  function routeAnalysisUrl(route) {
    const url =
      new URL(
        "./",
        weatherModuleUrl
      );

    url.searchParams.set(
      "route",
      route.id
    );

    return url.href;
  }

  function popupHtml(item) {
    return (
      '<div class="bp-weather-map-popup">' +
        '<div class="bp-weather-map-popup-kicker">BICIPARK WEATHER ROUTE</div>' +
        "<h3>" +
          escapeHtml(item.name) +
        "</h3>" +
        '<div class="bp-weather-map-popup-grid">' +
          '<div class="bp-weather-map-popup-stat">' +
            "<small>Temperatura</small>" +
            "<strong>" +
              weatherIcon(item.weatherCode) +
              " " +
              Math.round(item.temp) +
              " \u00b0C" +
            "</strong>" +
          "</div>" +
          '<div class="bp-weather-map-popup-stat">' +
            "<small>Vent</small>" +
            "<strong>" +
              Math.round(item.wind) +
              " km/h" +
            "</strong>" +
          "</div>" +
          '<div class="bp-weather-map-popup-stat">' +
            "<small>Pluja</small>" +
            "<strong>" +
              (
                Number.isFinite(item.rain)
                  ? item.rain.toFixed(1)
                  : "0.0"
              ) +
              " mm" +
            "</strong>" +
          "</div>" +
          '<div class="bp-weather-map-popup-stat">' +
            "<small>Weather Score</small>" +
            "<strong>" +
              item.score +
              "/100" +
            "</strong>" +
          "</div>" +
        "</div>" +
        '<div class="bp-weather-map-popup-note">' +
          "Resum de condicions actuals al punt central de la ruta. " +
          "Per veure previsio al llarg del recorregut, millor hora i vent segons el sentit de marxa, obre Weather Route." +
        "</div>" +
        '<a href="' +
          routeAnalysisUrl(item) +
          '">' +
          "Analitzar ruta completa \u2192" +
        "</a>" +
      "</div>"
    );
  }

  async function loadRoutes() {
    if (state.routes.length) {
      return;
    }

    const response =
      await fetch(
        routesUrl,
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status +
        " carregant weather-routes.json"
      );
    }

    const raw =
      await response.json();

    const list =
      Array.isArray(raw)
        ? raw
        : (
            Array.isArray(raw?.routes)
              ? raw.routes
              : (
                  Array.isArray(raw?.items)
                    ? raw.items
                    : []
                )
          );

    state.routes =
      list
        .map(normalizeRoute)
        .filter(Boolean);
  }

  async function fetchCurrentWeather(route) {
    const point =
      forecastPoint(route);

    if (!point) {
      return null;
    }

    const params =
      new URLSearchParams({
        latitude:
          String(point.lat),

        longitude:
          String(point.lng),

        current:
          [
            "temperature_2m",
            "precipitation",
            "wind_speed_10m",
            "weather_code"
          ].join(","),

        timezone:
          "Europe/Madrid"
      });

    const response =
      await fetch(
        "https://api.open-meteo.com/v1/forecast?" +
        params.toString(),
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    const current =
      data.current ||
      {};

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

    const weatherCode =
      Number(
        current.weather_code
      );

    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(wind)
    ) {
      return null;
    }

    const marker =
      markerPoint(route) ||
      point;

    return {
      ...route,

      lat:
        marker.lat,

      lng:
        marker.lng,

      temp,

      rain:
        Number.isFinite(rain)
          ? rain
          : 0,

      wind,

      weatherCode:
        Number.isFinite(weatherCode)
          ? weatherCode
          : 2,

      score:
        weatherScore(
          temp,
          Number.isFinite(rain)
            ? rain
            : 0,
          wind
        )
    };
  }

  async function refreshForecasts(force) {
    const now =
      Date.now();

    if (
      !force &&
      state.items.length &&
      now -
      state.lastForecastAt <
      CACHE_MS
    ) {
      return;
    }

    if (state.loading) {
      return;
    }

    state.loading =
      true;

    emitStatus();

    try {
      await loadRoutes();

      const settled =
        await Promise.allSettled(
          state.routes.map(
            fetchCurrentWeather
          )
        );

      state.items =
        settled
          .filter(result =>
            result.status ===
            "fulfilled" &&
            result.value
          )
          .map(result =>
            result.value
          );

      state.lastForecastAt =
        Date.now();
    } finally {
      state.loading =
        false;

      rebuildLayer();
      emitStatus();
    }
  }

  function rebuildLayer() {
    if (!state.map) {
      return;
    }

    if (!state.layer) {
      state.layer =
        L.layerGroup();
    }

    state.layer.clearLayers();

    state.items.forEach(item => {
      const color =
        scoreColor(
          item.score
        );

      L.polyline(
        item.points,
        {
          color,
          weight:
            13,
          opacity:
            .12,
          lineCap:
            "round",
          lineJoin:
            "round",
          interactive:
            false
        }
      )
        .addTo(
          state.layer
        );

      L.polyline(
        item.points,
        {
          color,
          weight:
            3,
          opacity:
            .28,
          lineCap:
            "round",
          lineJoin:
            "round",
          interactive:
            true
        }
      )
        .bindPopup(
          popupHtml(item),
          {
            maxWidth:
              310
          }
        )
        .addTo(
          state.layer
        );

      L.marker(
        [
          item.lat,
          item.lng
        ],
        {
          icon:
            markerIcon(item),

          zIndexOffset:
            420
        }
      )
        .bindPopup(
          popupHtml(item),
          {
            maxWidth:
              310
          }
        )
        .addTo(
          state.layer
        );
    });

    /*
     * Critical: asynchronous fetch may finish after the user has
     * already switched Weather OFF. Never re-add the layer unless
     * current state still says it is visible.
     */
    if (
      state.visible &&
      !state.map.hasLayer(
        state.layer
      )
    ) {
      state.layer.addTo(
        state.map
      );
    }

    emitStatus();
  }

  function emitStatus() {
    window.dispatchEvent(
      new CustomEvent(
        "bicipark:weather-main-map-status",
        {
          detail: {
            visible:
              state.visible,
            loading:
              state.loading,
            count:
              state.items.length
          }
        }
      )
    );
  }

  async function show() {
    if (!state.map) {
      return;
    }

    const token =
      ++state.visibilityToken;

    state.visible =
      true;

    emitStatus();

    await refreshForecasts(
      false
    );

    /*
     * User may have clicked OFF while requests were running.
     */
    if (
      token !==
      state.visibilityToken ||
      !state.visible
    ) {
      return;
    }

    if (
      state.layer &&
      !state.map.hasLayer(
        state.layer
      )
    ) {
      state.layer.addTo(
        state.map
      );
    }

    emitStatus();
  }

  function hide() {
    ++state.visibilityToken;

    state.visible =
      false;

    if (
      state.map &&
      state.layer &&
      state.map.hasLayer(
        state.layer
      )
    ) {
      state.map.removeLayer(
        state.layer
      );
    }

    emitStatus();
  }

  function toggle() {
    if (state.visible) {
      hide();
    } else {
      show();
    }
  }

  async function refresh() {
    await refreshForecasts(
      true
    );
  }

  function publishApi() {
    window.BiciParkWeatherMap = {
      show,
      hide,
      toggle,
      refresh,

      isVisible: () =>
        state.visible,

      isLoading: () =>
        state.loading,

      getItems: () =>
        [...state.items],

      getLayer: () =>
        state.layer
    };

    window.BiciParkCore
      ?.registerModule({
        id:
          "weather-main-map-adapter",
        version:
          "3.0.0",
        api:
          window.BiciParkWeatherMap
      });

    emitStatus();
  }

  function bootWithMap(map) {
    if (
      state.booted ||
      !map
    ) {
      return;
    }

    state.booted =
      true;

    state.map =
      map;

    state.layer =
      L.layerGroup();

    state.visible =
      false;

    publishApi();

    console.info(
      "[Weather Main Map] Safe adapter v3 ready."
    );
  }

  function findMap() {
    try {
      return (
        window.BiciParkMapTools
          ?.getMap?.() ||
        null
      );
    } catch (_) {
      return null;
    }
  }

  function waitForMap() {
    const started =
      Date.now();

    const timer =
      setInterval(
        () => {
          const map =
            findMap();

          if (map) {
            clearInterval(
              timer
            );

            bootWithMap(
              map
            );

            return;
          }

          if (
            Date.now() -
            started >
            20000
          ) {
            clearInterval(
              timer
            );

            console.warn(
              "[Weather Main Map] No s'ha trobat BiciParkMapTools.getMap()."
            );
          }
        },
        150
      );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      waitForMap
    );
  } else {
    waitForMap();
  }
})();