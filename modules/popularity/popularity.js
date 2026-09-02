(() => {
  "use strict";

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /popularity\.js/.test(
          script.src
        )
      );

  const baseUrl =
    new URL(
      "./",
      selfScript.src
    );

  const EVENTS_KEY =
    "bicipark.popularity.events.v1";

  const GEO_KEY =
    "bicipark.popularity.routeGeo.v2";

  const state = {
    map: null,
    layer: null,
    knownRoutes: [],
    weatherRoutes: [],
    geoCatalog: {},
    events: [],
    stats: []
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
    const explicit =
      normalize(explicitId);

    const byName =
      normalize(name);

    const text =
      explicit || byName;

    if (
      /carretera.*aigues/.test(text) ||
      /carretera.*aigues/.test(byName)
    ) {
      return "carretera-aigues";
    }

    if (
      /front.*maritim/.test(text) ||
      /front.*maritim/.test(byName)
    ) {
      return "front-maritim";
    }

    if (
      /\bbesos\b/.test(text) ||
      /\bbesos\b/.test(byName)
    ) {
      return "riu-besos";
    }

    return text
      .replace(/^dynamic\s+/, "")
      .replace(/\s+/g, "-")
      .slice(0, 120);
  }

  function readArray(key) {
    try {
      const raw =
        localStorage.getItem(key);

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  function readObject(key) {
    try {
      const raw =
        localStorage.getItem(key);

      const parsed =
        raw
          ? JSON.parse(raw)
          : {};

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

  function validCoordinate(value, kind) {
    /*
     * Critical fix:
     * Number(null) and Number("") are zero in JavaScript.
     * They must NEVER be accepted as real route coordinates.
     */
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return false;
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return false;
    }

    if (kind === "lat") {
      return (
        number >= -90 &&
        number <= 90
      );
    }

    return (
      number >= -180 &&
      number <= 180
    );
  }

  function validLatLng(lat, lng) {
    return (
      validCoordinate(
        lat,
        "lat"
      ) &&
      validCoordinate(
        lng,
        "lng"
      )
    );
  }

  function westEuropeLatLng(lat, lng) {
    if (
      !validLatLng(
        lat,
        lng
      )
    ) {
      return false;
    }

    const y =
      Number(lat);

    const x =
      Number(lng);

    return (
      y >= 34 &&
      y <= 53 &&
      x >= -11 &&
      x <= 14
    );
  }

  function validPoints(points) {
    return (
      Array.isArray(points) &&
      points.length >= 2 &&
      points.every(point =>
        Array.isArray(point) &&
        westEuropeLatLng(
          point[0],
          point[1]
        )
      )
    );
  }

  function centerOf(points) {
    if (!validPoints(points)) {
      return null;
    }

    const sums =
      points.reduce(
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
        sums.lat /
        points.length,
      lng:
        sums.lng /
        points.length
    };
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

  async function loadSources() {
    const ownUrl =
      new URL(
        "./data/known-routes.json",
        baseUrl
      ).href;

    const weatherUrl =
      new URL(
        "../weather-route/data/weather-routes.json",
        baseUrl
      ).href;

    const results =
      await Promise.allSettled([
        fetchJson(
          ownUrl
        ),
        fetchJson(
          weatherUrl
        )
      ]);

    state.knownRoutes =
      (
        results[0].status ===
        "fulfilled" &&
        Array.isArray(
          results[0].value
        )
      )
        ? results[0].value
        : [];

    state.weatherRoutes =
      (
        results[1].status ===
        "fulfilled" &&
        Array.isArray(
          results[1].value
        )
      )
        ? results[1].value
        : [];
  }

  function routeSources() {
    const map =
      new Map();

    state.knownRoutes
      .forEach(route => {
        const id =
          canonicalId(
            route.name,
            route.id
          );

        const hasPoint =
          westEuropeLatLng(
            route.lat,
            route.lng
          );

        map.set(
          id,
          {
            id,
            name:
              route.name,
            lat:
              hasPoint
                ? Number(route.lat)
                : null,
            lng:
              hasPoint
                ? Number(route.lng)
                : null,
            points:
              null,
            distanceKm:
              Number.isFinite(
                Number(
                  route.distanceKm
                )
              )
                ? Number(
                    route.distanceKm
                  )
                : null,
            category:
              route.category ||
              "Ruta"
          }
        );
      });

    state.weatherRoutes
      .forEach(route => {
        const id =
          canonicalId(
            route.name,
            route.id
          );

        const existing =
          map.get(id) || {
            id,
            name:
              route.name,
            category:
              "Ruta"
          };

        const points =
          validPoints(
            route.points
          )
            ? route.points.map(
                point => [
                  Number(
                    point[0]
                  ),
                  Number(
                    point[1]
                  )
                ]
              )
            : null;

        const center =
          centerOf(
            points
          );

        map.set(
          id,
          {
            ...existing,
            name:
              route.name ||
              existing.name,
            points:
              points ||
              existing.points ||
              null,
            lat:
              center?.lat ??
              (
                westEuropeLatLng(
                  existing.lat,
                  existing.lng
                )
                  ? existing.lat
                  : null
              ),
            lng:
              center?.lng ??
              (
                westEuropeLatLng(
                  existing.lat,
                  existing.lng
                )
                  ? existing.lng
                  : null
              ),
            distanceKm:
              Number.isFinite(
                Number(
                  route.distanceKm
                )
              )
                ? Number(
                    route.distanceKm
                  )
                : (
                    existing.distanceKm ||
                    null
                  )
          }
        );
      });

    Object.values(
      state.geoCatalog
    )
      .forEach(route => {
        if (!route) {
          return;
        }

        const id =
          canonicalId(
            route.name,
            route.id ||
            route.sourceId
          );

        const existing =
          map.get(id) || {
            id,
            name:
              route.name ||
              id,
            category:
              "Route Explorer"
          };

        const points =
          validPoints(
            route.points
          )
            ? route.points.map(
                point => [
                  Number(
                    point[0]
                  ),
                  Number(
                    point[1]
                  )
                ]
              )
            : null;

        const center =
          centerOf(
            points
          );

        map.set(
          id,
          {
            ...existing,
            name:
              route.name ||
              existing.name,
            points:
              points ||
              existing.points ||
              null,
            lat:
              center?.lat ??
              (
                westEuropeLatLng(
                  existing.lat,
                  existing.lng
                )
                  ? existing.lat
                  : null
              ),
            lng:
              center?.lng ??
              (
                westEuropeLatLng(
                  existing.lat,
                  existing.lng
                )
                  ? existing.lng
                  : null
              ),
            distanceKm:
              Number.isFinite(
                Number(
                  route.distanceKm
                )
              )
                ? Number(
                    route.distanceKm
                  )
                : (
                    existing.distanceKm ||
                    null
                  ),
            geoMode:
              route.geoMode || "",
            geo:
              route.geo || null
          }
        );
      });

    return map;
  }

  function eventWeight(type) {
    if (
      type === "route-open"
    ) {
      return 3;
    }

    if (
      type === "weather-open"
    ) {
      return 2;
    }

    return 1;
  }

  function buildStats() {
    const sources =
      routeSources();

    const stats =
      new Map();

    sources.forEach(
      (route, id) => {
        stats.set(
          id,
          {
            ...route,
            count: 0,
            score: 0,
            lastAt: null
          }
        );
      }
    );

    state.events
      .forEach(event => {
        const id =
          canonicalId(
            event.routeName,
            event.routeId
          );

        let item =
          stats.get(id);

        if (!item) {
          item = {
            id,
            name:
              event.routeName ||
              id ||
              "Ruta",
            lat: null,
            lng: null,
            points: null,
            category:
              "Route Explorer",
            count: 0,
            score: 0,
            lastAt: null
          };

          stats.set(
            id,
            item
          );
        }

        item.count += 1;

        item.score +=
          eventWeight(
            event.type
          );

        if (
          !item.lastAt ||
          String(
            event.timestamp
          ) >
          String(
            item.lastAt
          )
        ) {
          item.lastAt =
            event.timestamp;
        }
      });

    state.stats =
      Array.from(
        stats.values()
      )
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.count - a.count ||
            a.name.localeCompare(
              b.name
            )
        );
  }

  function initMap() {
    state.map =
      L.map(
        "popularityMap"
      ).setView(
        [42.0, 1.8],
        7
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    ).addTo(
      state.map
    );

    state.layer =
      L.layerGroup()
        .addTo(
          state.map
        );
  }

  function markerIcon(item) {
    const score =
      Number(
        item.score || 0
      );

    const label =
      score > 99
        ? "99+"
        : String(score);

    return L.divIcon({
      className: "",
      html:
        '<div class="pop-marker ' +
          (
            score === 0
              ? "is-zero"
              : ""
          ) +
          '">' +
          escapeHtml(
            label
          ) +
        "</div>",
      iconSize:
        [34, 34],
      iconAnchor:
        [17, 17],
      popupAnchor:
        [0, -15]
    });
  }

  function heatOpacity(score) {
    return Math.min(
      .42,
      .08 +
      Number(
        score || 0
      ) *
      .025
    );
  }

  function heatRadius(score) {
    return (
      250 +
      Math.min(
        1000,
        Number(
          score || 0
        ) *
        75
      )
    );
  }

  function renderHeatCorridor(item) {
    if (
      !validPoints(
        item.points
      )
    ) {
      return [];
    }

    const score =
      Number(
        item.score || 0
      );

    const latlngs =
      item.points.map(
        point => [
          Number(
            point[0]
          ),
          Number(
            point[1]
          )
        ]
      );

    if (score > 0) {
      L.polyline(
        latlngs,
        {
          weight:
            Math.min(
              18,
              5 +
              score * .9
            ),
          opacity:
            Math.min(
              .50,
              .15 +
              score * .03
            ),
          lineCap:
            "round",
          lineJoin:
            "round"
        }
      ).addTo(
        state.layer
      );
    }

    latlngs
      .forEach(point => {
        L.circle(
          point,
          {
            radius:
              heatRadius(
                score
              ),
            weight: 0,
            fillOpacity:
              score > 0
                ? heatOpacity(
                    score
                  )
                : .025
          }
        ).addTo(
          state.layer
        );
      });

    return latlngs;
  }

  function renderMap() {
    state.layer
      .clearLayers();

    const hasGeo =
      item =>
        validPoints(
          item.points
        ) ||
        westEuropeLatLng(
          item.lat,
          item.lng
        );

    const active =
      state.stats.filter(
        item =>
          item.score > 0 &&
          hasGeo(item)
      );

    const displayItems =
      active.length
        ? active
        : state.stats.filter(
            hasGeo
          );

    const allPoints = [];

    displayItems
      .forEach(item => {
        let markerLat =
          null;

        let markerLng =
          null;

        if (
          validPoints(
            item.points
          )
        ) {
          const corridor =
            renderHeatCorridor(
              item
            );

          allPoints.push(
            ...corridor
          );

          const center =
            centerOf(
              item.points
            );

          markerLat =
            center?.lat ??
            null;

          markerLng =
            center?.lng ??
            null;
        } else if (
          westEuropeLatLng(
            item.lat,
            item.lng
          )
        ) {
          markerLat =
            Number(
              item.lat
            );

          markerLng =
            Number(
              item.lng
            );

          const score =
            Number(
              item.score || 0
            );

          L.circle(
            [
              markerLat,
              markerLng
            ],
            {
              radius:
                heatRadius(
                  score
                ),
              weight: 0,
              fillOpacity:
                score > 0
                  ? heatOpacity(
                      score
                    )
                  : .025
            }
          ).addTo(
            state.layer
          );

          allPoints.push([
            markerLat,
            markerLng
          ]);
        }

        if (
          !westEuropeLatLng(
            markerLat,
            markerLng
          )
        ) {
          return;
        }

        L.marker(
          [
            markerLat,
            markerLng
          ],
          {
            icon:
              markerIcon(
                item
              )
          }
        )
          .bindPopup(
            '<div class="pop-popup">' +
              "<h3>" +
                escapeHtml(
                  item.name
                ) +
              "</h3>" +
              "<p>" +
                item.count +
                " interaccions locals · " +
                item.score +
                " punts d'interes" +
                (
                  validPoints(
                    item.points
                  )
                    ? " · recorregut geolocalitzat"
                    : ""
                ) +
              "</p>" +
            "</div>"
          )
          .addTo(
            state.layer
          );
      });

    const cleanPoints =
      allPoints.filter(point =>
        Array.isArray(point) &&
        westEuropeLatLng(
          point[0],
          point[1]
        )
      );

    if (
      cleanPoints.length
    ) {
      const bounds =
        L.latLngBounds(
          cleanPoints
        );

      if (
        bounds.isValid()
      ) {
        state.map.fitBounds(
          bounds.pad(.18),
          {
            padding:
              [45, 45],
            maxZoom:
              10
          }
        );
      }
    } else {
      state.map.setView(
        [42.0, 1.8],
        7
      );
    }
  }

  function renderRanking() {
    const root =
      document.getElementById(
        "popularityRanking"
      );

    const ranked =
      state.stats.filter(
        item =>
          item.score > 0
      );

    if (!ranked.length) {
      root.innerHTML =
        '<div class="pop-empty">' +
          "Encara no hi ha activitat local suficient. Navega per Route Explorer, obre rutes o consulta Meteorologia i torna aqui." +
        "</div>";

      return;
    }

    root.innerHTML =
      ranked
        .slice(0, 12)
        .map((item, index) =>
          '<div class="pop-rank">' +
            '<span class="pop-rank-num">' +
              (index + 1) +
            "</span>" +
            '<span class="pop-rank-copy">' +
              "<strong>" +
                escapeHtml(
                  item.name
                ) +
              "</strong>" +
              "<small>" +
                item.count +
                " interaccions" +
                (
                  validPoints(
                    item.points
                  )
                    ? " · geo"
                    : ""
                ) +
              "</small>" +
            "</span>" +
            '<span class="pop-rank-score">' +
              item.score +
            "</span>" +
          "</div>"
        )
        .join("");
  }

  function renderEvents() {
    const root =
      document.getElementById(
        "recentEvents"
      );

    const recent =
      [...state.events]
        .sort(
          (a, b) =>
            String(
              b.timestamp
            ).localeCompare(
              String(
                a.timestamp
              )
            )
        )
        .slice(
          0,
          14
        );

    if (
      !recent.length
    ) {
      root.innerHTML =
        '<div class="pop-empty">' +
          "Sense interaccions registrades encara." +
        "</div>";

      return;
    }

    root.innerHTML =
      recent
        .map(event =>
          '<div class="pop-event">' +
            "<strong>" +
              escapeHtml(
                event.routeName ||
                "Ruta"
              ) +
            "</strong>" +
            " · " +
            escapeHtml(
              event.type ===
              "weather-open"
                ? "Meteorologia"
                : (
                    event.type ===
                    "route-open"
                      ? "Ruta oberta"
                      : "Interaccio"
                  )
            ) +
          "</div>"
        )
        .join("");
  }

  function renderCounter() {
    document.getElementById(
      "interactionCount"
    ).textContent =
      String(
        state.events.length
      );
  }

  /*
   * Recovery helper:
   * if the latest Weather dynamic route is still in sessionStorage,
   * import it directly into the Popularity geometry catalogue.
   */
  function recoverLatestWeatherGeometry() {
    try {
      const raw =
        sessionStorage.getItem(
          "bicipark.weather.dynamicResolved"
        );

      if (!raw) {
        return;
      }

      const route =
        JSON.parse(raw);

      if (
        !route ||
        !validPoints(
          route.points
        )
      ) {
        return;
      }

      const id =
        canonicalId(
          route.name,
          route.id
        );

      if (!id) {
        return;
      }

      const catalog =
        readObject(
          GEO_KEY
        );

      catalog[id] = {
        id,
        sourceId:
          route.id || "",
        name:
          route.name || id,
        points:
          route.points.map(
            point => [
              Number(
                point[0]
              ),
              Number(
                point[1]
              )
            ]
          ),
        distanceKm:
          Number.isFinite(
            Number(
              route.distanceKm
            )
          )
            ? Number(
                route.distanceKm
              )
            : null,
        elevationM:
          Number.isFinite(
            Number(
              route.elevationM
            )
          )
            ? Number(
                route.elevationM
              )
            : null,
        geoMode:
          route.geoMode || "",
        geo:
          route.geo || null,
        updatedAt:
          new Date().toISOString(),
        source:
          "weather-route-recovered"
      };

      localStorage.setItem(
        GEO_KEY,
        JSON.stringify(
          catalog
        )
      );
    } catch (_) {}
  }

  function renderAll() {
    recoverLatestWeatherGeometry();

    state.events =
      readArray(
        EVENTS_KEY
      );

    state.geoCatalog =
      readObject(
        GEO_KEY
      );

    buildStats();
    renderCounter();
    renderRanking();
    renderEvents();
    renderMap();
  }

  function bindUi() {
    document.getElementById(
      "refreshPopularity"
    ).addEventListener(
      "click",
      renderAll
    );

    document.getElementById(
      "clearPopularity"
    ).addEventListener(
      "click",
      () => {
        const ok =
          confirm(
            "Vols esborrar totes les interaccions locals de Popularity en aquest navegador?"
          );

        if (!ok) {
          return;
        }

        localStorage.setItem(
          EVENTS_KEY,
          "[]"
        );

        renderAll();
      }
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          EVENTS_KEY ||
          event.key ===
          GEO_KEY
        ) {
          renderAll();
        }
      }
    );

    window.addEventListener(
      "bicipark:popularity:route-geo-saved",
      renderAll
    );
  }

  async function boot() {
    initMap();
    bindUi();

    try {
      await loadSources();
      renderAll();

      window.BiciParkPopularity = {
        refresh:
          renderAll,
        getEvents: () =>
          [...state.events],
        getStats: () =>
          [...state.stats],
        getGeoCatalog: () =>
          ({
            ...state.geoCatalog
          })
      };

      window.BiciParkCore
        ?.registerModule({
          id:
            "popularity",
          version:
            "3.0.0",
          api:
            window.BiciParkPopularity
        });

      console.info(
        "[Popularity] v3 ready."
      );
    } catch (error) {
      console.error(
        "[Popularity]",
        error
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();