(() => {
  "use strict";

  if (window.__BICIPARK_POPULARITY_MAIN_MAP_SAFE_V2__) return;
  window.__BICIPARK_POPULARITY_MAIN_MAP_SAFE_V2__ = true;

  if (!window.L) {
    console.warn("[Popularity Main Map] Leaflet no disponible.");
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /popularity\/adapters\/main-map-adapter\.js/.test(script.src)
    );

  if (!selfScript?.src) return;

  const adapterUrl = new URL("./", selfScript.src);
  const popularityPageUrl = new URL("../", adapterUrl).href;
  const weatherRoutesUrl =
    new URL("../../weather-route/data/weather-routes.json", adapterUrl).href;

  const EVENTS_KEY = "bicipark.popularity.events.v1";
  const GEO_KEY = "bicipark.popularity.routeGeo.v2";

  const state = {
    map: null,
    layer: null,
    visible: false,
    stats: [],
    knownWeatherRoutes: [],
    booted: false
  };

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

    return text
      .replace(/^dynamic\s+/, "")
      .replace(/\s+/g, "-")
      .slice(0, 120);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function readObject(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (_) {
      return {};
    }
  }

  function validCoordinate(value, kind) {
    if (value === null || value === undefined || value === "") return false;

    const n = Number(value);
    if (!Number.isFinite(n)) return false;

    return kind === "lat"
      ? n >= 34 && n <= 53
      : n >= -11 && n <= 14;
  }

  function validPoint(point) {
    return (
      Array.isArray(point) &&
      validCoordinate(point[0], "lat") &&
      validCoordinate(point[1], "lng")
    );
  }

  function validPoints(points) {
    return Array.isArray(points) && points.length >= 2 && points.every(validPoint);
  }

  function centerOf(points) {
    if (!validPoints(points)) return null;

    const sum = points.reduce(
      (acc, point) => {
        acc.lat += Number(point[0]);
        acc.lng += Number(point[1]);
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length
    };
  }

  function weightFor(type) {
    if (type === "route-open") return 3;
    if (type === "weather-open") return 2;
    return 1;
  }

  async function loadKnownWeatherRoutes() {
    try {
      const response = await fetch(weatherRoutesUrl, { cache: "no-store" });

      if (!response.ok) {
        state.knownWeatherRoutes = [];
        return;
      }

      const raw = await response.json();

      state.knownWeatherRoutes = Array.isArray(raw)
        ? raw.filter(route => validPoints(route.points))
        : [];
    } catch (_) {
      state.knownWeatherRoutes = [];
    }
  }

  function geometryCatalog() {
    const map = new Map();

    state.knownWeatherRoutes.forEach(route => {
      const id = canonicalId(route.name, route.id);

      if (!id || !validPoints(route.points)) return;

      map.set(id, {
        id,
        sourceId: route.id || "",
        name: route.name || id,
        points: route.points.map(point => [
          Number(point[0]),
          Number(point[1])
        ])
      });
    });

    const saved = readObject(GEO_KEY);

    Object.values(saved).forEach(route => {
      if (!route || !validPoints(route.points)) return;

      const id = canonicalId(route.name, route.id || route.sourceId);

      if (!id) return;

      map.set(id, {
        id,
        sourceId: route.sourceId || route.id || "",
        name: route.name || id,
        points: route.points.map(point => [
          Number(point[0]),
          Number(point[1])
        ])
      });
    });

    return map;
  }

  function rebuildStats() {
    const events = readArray(EVENTS_KEY);
    const geo = geometryCatalog();
    const map = new Map();

    geo.forEach((route, id) => {
      map.set(id, {
        ...route,
        count: 0,
        score: 0
      });
    });

    events.forEach(event => {
      const id = canonicalId(event.routeName, event.routeId);
      let item = map.get(id);

      if (!item) {
        item = {
          id,
          name: event.routeName || id || "Ruta",
          points: null,
          count: 0,
          score: 0
        };

        map.set(id, item);
      }

      item.count += 1;
      item.score += weightFor(event.type);
    });

    state.stats = Array.from(map.values())
      .filter(item => item.score > 0 && validPoints(item.points))
      .sort((a, b) => b.score - a.score || b.count - a.count);
  }

  function markerIcon(item) {
    const label = item.score > 99 ? "99+" : String(item.score);

    return L.divIcon({
      className: "bp-pop-map-marker-wrap",
      html:
        '<div class="bp-pop-map-marker">' +
          "<span>\ud83d\udd25</span>" +
          "<span>" + escapeHtml(label) + "</span>" +
        "</div>",
      iconSize: [46, 30],
      iconAnchor: [23, 15],
      popupAnchor: [0, -14]
    });
  }

  function popupHtml(item) {
    return (
      '<div class="bp-pop-map-popup">' +
        '<div class="bp-pop-map-popup-kicker">BICIPARK POPULARITY</div>' +
        "<h3>" + escapeHtml(item.name) + "</h3>" +
        '<div class="bp-pop-map-popup-meta">' +
          "<span>\ud83d\udd25 " + item.score + " punts</span>" +
          "<span>\ud83d\udc46 " + item.count + " interaccions</span>" +
        "</div>" +
        '<a href="' + popularityPageUrl + '">Veure tendencies</a>' +
      "</div>"
    );
  }

  function heatColor(score) {
    if (score >= 12) return "#c94c2d";
    if (score >= 7) return "#df5b2f";
    if (score >= 4) return "#ef7138";
    return "#f08a4b";
  }

  function addHeatCorridor(item) {
    const latlngs = item.points.map(point => [
      Number(point[0]),
      Number(point[1])
    ]);

    const color = heatColor(item.score);

    L.polyline(latlngs, {
      color,
      weight: Math.min(18, 6 + item.score * .9),
      opacity: Math.min(.82, .48 + item.score * .035),
      lineCap: "round",
      lineJoin: "round",
      interactive: true
    })
      .bindPopup(popupHtml(item), { maxWidth: 290 })
      .addTo(state.layer);

    latlngs.forEach(point => {
      L.circle(point, {
        radius: 250 + Math.min(1000, item.score * 75),
        color,
        weight: 0,
        fillColor: color,
        fillOpacity: Math.min(.25, .07 + item.score * .018),
        interactive: false
      }).addTo(state.layer);
    });

    const center = centerOf(item.points);

    if (center) {
      L.marker([center.lat, center.lng], {
        icon: markerIcon(item)
      })
        .bindPopup(popupHtml(item), { maxWidth: 290 })
        .addTo(state.layer);
    }
  }

  function emitReady() {
    window.dispatchEvent(
      new CustomEvent("bicipark:map-layer-ready", {
        detail: {
          id: "popularity",
          count: state.stats.length
        }
      })
    );
  }

  function rebuildLayer() {
    if (!state.map) return;

    rebuildStats();

    if (!state.layer) state.layer = L.layerGroup();

    state.layer.clearLayers();
    state.stats.forEach(addHeatCorridor);

    if (state.visible && !state.map.hasLayer(state.layer)) {
      state.layer.addTo(state.map);
    }

    emitReady();
  }

  function emitVisibility() {
    window.dispatchEvent(
      new CustomEvent("bicipark:popularity:visibility", {
        detail: { visible: state.visible }
      })
    );
  }

  function show() {
    if (!state.map) return;

    rebuildLayer();
    state.visible = true;

    if (!state.map.hasLayer(state.layer)) {
      state.layer.addTo(state.map);
    }

    emitVisibility();
  }

  function hide() {
    state.visible = false;

    if (state.map && state.layer && state.map.hasLayer(state.layer)) {
      state.map.removeLayer(state.layer);
    }

    emitVisibility();
  }

  function toggle() {
    state.visible ? hide() : show();
  }

  function publishApi() {
    window.BiciParkPopularityMap = {
      show,
      hide,
      toggle,
      isVisible: () => state.visible,
      getItems: () => [...state.stats],
      getLayer: () => state.layer,
      refresh: () => rebuildLayer()
    };

    window.BiciParkCore?.registerModule({
      id: "popularity-main-map-adapter",
      version: "2.0.0",
      api: window.BiciParkPopularityMap
    });

    emitReady();
  }

  async function bootWithMap(map) {
    if (state.booted || !map) return;

    state.booted = true;
    state.map = map;
    state.layer = L.layerGroup();

    await loadKnownWeatherRoutes();

    rebuildLayer();
    publishApi();

    state.visible = false;

    window.addEventListener("storage", event => {
      if (event.key === EVENTS_KEY || event.key === GEO_KEY) {
        rebuildLayer();
      }
    });

    console.info("[Popularity Main Map] Safe adapter v2 ready.");
  }

  function findMap() {
    try {
      return window.BiciParkMapTools?.getMap?.() || null;
    } catch (_) {
      return null;
    }
  }

  function waitForMap() {
    const started = Date.now();

    const timer = setInterval(() => {
      const map = findMap();

      if (map) {
        clearInterval(timer);
        bootWithMap(map);
        return;
      }

      if (Date.now() - started > 20000) {
        clearInterval(timer);
        console.warn(
          "[Popularity Main Map] No s'ha trobat BiciParkMapTools.getMap()."
        );
      }
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForMap);
  } else {
    waitForMap();
  }
})();