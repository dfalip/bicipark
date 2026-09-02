(() => {
  "use strict";

  if (
    window.__BICIPARK_WEATHER_MAIN_MAP_ADAPTER_SAFE__
  ) {
    return;
  }

  window.__BICIPARK_WEATHER_MAIN_MAP_ADAPTER_SAFE__ =
    true;

  if (!window.L) {
    console.warn(
      "[Weather Main Map] Leaflet no disponible."
    );
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /weather-route\/adapters\/main-map-adapter\.js/.test(
          script.src
        )
      );

  if (!selfScript?.src) {
    return;
  }

  const adapterUrl =
    new URL(
      "./",
      selfScript.src
    );

  const routesUrl =
    new URL(
      "../data/weather-routes.json",
      adapterUrl
    ).href;

  const weatherPageUrl =
    new URL(
      "../",
      adapterUrl
    ).href;

  const state = {
    map: null,
    routes: [],
    items: [],
    layer: null,
    visible: false,
    loadedAt: 0,
    booted: false
  };

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function midpoint(route) {
    const points =
      route.points || [];

    if (!points.length) {
      return null;
    }

    return points[
      Math.floor(
        points.length / 2
      )
    ];
  }

  async function weatherForRoute(route) {
    const point =
      midpoint(route);

    if (!point) {
      return null;
    }

    const params =
      new URLSearchParams({
        latitude:
          String(point[0]),
        longitude:
          String(point[1]),
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

    return {
      id: route.id,
      name: route.name,
      lat: Number(point[0]),
      lng: Number(point[1]),
      temp:
        Number(
          current.temperature_2m
        ),
      rain:
        Number(
          current.precipitation
        ),
      wind:
        Number(
          current.wind_speed_10m
        )
    };
  }

  async function loadWeather() {
    if (
      state.items.length &&
      Date.now() - state.loadedAt <
      15 * 60 * 1000
    ) {
      return;
    }

    const results =
      await Promise.all(
        state.routes.map(
          weatherForRoute
        )
      );

    state.items =
      results.filter(item =>
        item &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        Number.isFinite(item.temp)
      );

    state.loadedAt =
      Date.now();
  }

  function markerIcon(item) {
    return L.divIcon({
      className:
        "bp-wr-map-marker-wrap",
      html:
        '<div class="bp-wr-map-marker">' +
          "<span>\u2600</span>" +
          "<span>" +
            Math.round(item.temp) +
            "\u00b0" +
          "</span>" +
        "</div>",
      iconSize:
        [48, 31],
      iconAnchor:
        [24, 15],
      popupAnchor:
        [0, -14]
    });
  }

  function popupHtml(item) {
    return (
      '<div class="bp-wr-map-popup">' +
        '<div class="bp-wr-map-popup-kicker">' +
          "WEATHER ROUTE" +
        "</div>" +
        "<h3>" +
          escapeHtml(item.name) +
        "</h3>" +
        '<div class="bp-wr-map-popup-meta">' +
          "<span>\u2600 " +
            Math.round(item.temp) +
            " C</span>" +
          "<span>\ud83d\udca8 " +
            Math.round(item.wind) +
            " km/h</span>" +
          "<span>\ud83c\udf27 " +
            (
              Number.isFinite(item.rain)
                ? item.rain
                : 0
            ) +
            " mm</span>" +
        "</div>" +
        '<a href="' +
          weatherPageUrl +
          "?route=" +
          encodeURIComponent(item.id) +
          '">' +
          "Analitzar meteorologia" +
        "</a>" +
      "</div>"
    );
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
      L.marker(
        [
          item.lat,
          item.lng
        ],
        {
          icon:
            markerIcon(item)
        }
      )
        .bindPopup(
          popupHtml(item),
          {
            maxWidth: 290
          }
        )
        .addTo(
          state.layer
        );
    });

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
  }

  function emitVisibility() {
    window.dispatchEvent(
      new CustomEvent(
        "bicipark:weather-route:visibility",
        {
          detail: {
            visible:
              state.visible
          }
        }
      )
    );
  }

  async function show() {
    if (!state.map) {
      return;
    }

    try {
      await loadWeather();
      rebuildLayer();

      state.visible =
        true;

      if (
        !state.map.hasLayer(
          state.layer
        )
      ) {
        state.layer.addTo(
          state.map
        );
      }

      emitVisibility();
    } catch (error) {
      console.warn(
        "[Weather Main Map] No s'ha pogut carregar la meteorologia.",
        error
      );
    }
  }

  function hide() {
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

    emitVisibility();
  }

  function toggle() {
    if (state.visible) {
      hide();
    } else {
      show();
    }
  }

  function publishApi() {
    window.BiciParkWeatherMap = {
      show,
      hide,
      toggle,

      isVisible: () =>
        state.visible,

      getItems: () =>
        state.items.length
          ? [...state.items]
          : [...state.routes],

      getLayer: () =>
        state.layer,

      refresh: async () => {
        state.loadedAt = 0;

        if (state.visible) {
          await show();
        }
      }
    };

    window.BiciParkCore
      ?.registerModule({
        id:
          "weather-route-main-map-adapter",
        version:
          "2.1.0",
        api:
          window.BiciParkWeatherMap
      });

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:map-layer-ready",
        {
          detail: {
            id:
              "weather-route",
            count:
              state.routes.length
          }
        }
      )
    );
  }

  async function bootWithMap(map) {
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

    try {
      const raw =
        await fetchJson(
          routesUrl
        );

      state.routes =
        Array.isArray(raw)
          ? raw
          : [];

      state.layer =
        L.layerGroup();

      publishApi();

      console.info(
        "[Weather Main Map] Safe adapter ready."
      );
    } catch (error) {
      state.booted =
        false;

      console.warn(
        "[Weather Main Map] Boot error",
        error
      );
    }
  }

  function findExistingMap() {
    try {
      const map =
        window.BiciParkMapTools
          ?.getMap?.();

      if (map) {
        return map;
      }
    } catch (_) {}

    return null;
  }

  function waitForMap() {
    const started =
      Date.now();

    const timer =
      window.setInterval(
        () => {
          const map =
            findExistingMap();

          if (map) {
            window.clearInterval(
              timer
            );

            bootWithMap(
              map
            );

            return;
          }

          if (
            Date.now() - started >
            20000
          ) {
            window.clearInterval(
              timer
            );

            console.warn(
              "[Weather Main Map] No s'ha trobat el mapa principal."
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