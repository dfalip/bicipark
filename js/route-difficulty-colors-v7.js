(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DIFFICULTY_COLORS_V7__) {
    return;
  }

  window.__BICIPARK_ROUTE_DIFFICULTY_COLORS_V7__ = true;

  const PALETTE = {
    easy: {
      color: "#9D85E6",
      label: "Fàcil",
      weight: 5.5,
      opacity: 1
    },

    medium: {
      color: "#ED7A0F",
      label: "Mitjana",
      weight: 6,
      opacity: 1
    },

    hard: {
      color: "#CA3657",
      label: "Difícil",
      weight: 8,
      opacity: 1
    }
  };

  const KNOWN_ROUTE_DIFFICULTY = [
    { match: /carretera de les aigues/i, key: "medium" },
    { match: /front maritim/i, key: "easy" },
    { match: /riu besos|riu bes[oÃ²]s/i, key: "easy" },
    { match: /volta integral de collserola|collserola classica/i, key: "hard" }
  ];

  const state = {
    map: null,
    legend: null,
    timer: null,
    observer: null,
    booted: false
  };

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalized(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u00c3\u00bc/g, "u")
      .replace(/\u00c3\u00ad/g, "i")
      .replace(/\u00c3\u00a0/g, "a");
  }

  function difficultyKey(value) {
    const text = normalized(value);

    if (/\b(facil|easy|suau|baixa)\b/.test(text)) return "easy";
    if (/\b(mitjana|mitja|moderada|medium|intermedia)\b/.test(text)) return "medium";
    if (/\b(dificil|hard|alta|expert|experta)\b/.test(text)) return "hard";

    return null;
  }

  function keyFromTitle(value) {
    const title = normalized(value);

    for (const item of KNOWN_ROUTE_DIFFICULTY) {
      if (item.match.test(title)) {
        return item.key;
      }
    }

    return null;
  }

  function sidebarCards() {
    return Array.from(
      document.querySelectorAll(".bp-proposal-a-sidebar .bp-featured-card")
    );
  }

  function paintCards() {
    sidebarCards().forEach(card => {
      const title = clean(card.querySelector(".bp-featured-card-title")?.textContent);
      const meta = card.querySelector(".bp-featured-meta");
      const raw = clean(meta?.textContent || card.textContent);

      const key = difficultyKey(raw) || keyFromTitle(title);
      if (!key) return;

      card.classList.remove(
        "bp-difficulty-easy",
        "bp-difficulty-medium",
        "bp-difficulty-hard"
      );

      card.classList.add("bp-difficulty-" + key);

      if (!meta) return;

      let difficultySpan = Array.from(meta.querySelectorAll("span"))
        .find(span => difficultyKey(span.textContent));

      if (!difficultySpan) {
        Array.from(meta.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && difficultyKey(node.textContent)) {
            const span = document.createElement("span");
            span.textContent = PALETTE[key].label;
            node.replaceWith(span);
            difficultySpan = span;
          }
        });
      }

      if (difficultySpan) {
        difficultySpan.textContent = PALETTE[key].label;
        difficultySpan.classList.remove(
          "bp-difficulty-easy",
          "bp-difficulty-medium",
          "bp-difficulty-hard"
        );
        difficultySpan.classList.add(
          "bp-route-difficulty-pill",
          "bp-difficulty-" + key
        );
      }
    });
  }

  function layerText(layer) {
    const pieces = [];

    const objects = [
      layer?.feature?.properties,
      layer?.options,
      layer?.route,
      layer?._route,
      layer?.routeData,
      layer?._routeData,
      layer?.data,
      layer?._data
    ];

    objects.forEach(obj => {
      if (!obj || typeof obj !== "object") return;

      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === "string" || typeof value === "number") {
          pieces.push(String(value));
        }
      });
    });

    try {
      const popup = layer.getPopup?.();
      const content = popup?.getContent?.();
      if (typeof content === "string") {
        pieces.push(content.replace(/<[^>]+>/g, " "));
      }
    } catch (_) {}

    try {
      const tooltip = layer.getTooltip?.();
      const content = tooltip?.getContent?.();
      if (typeof content === "string") {
        pieces.push(content.replace(/<[^>]+>/g, " "));
      }
    } catch (_) {}

    return clean(pieces.join(" "));
  }

  function flattenLatLngs(items, acc = []) {
    if (!Array.isArray(items)) {
      return acc;
    }

    items.forEach(item => {
      if (Array.isArray(item)) {
        flattenLatLngs(item, acc);
      } else if (item && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        acc.push(item);
      }
    });

    return acc;
  }

  function getFlatLatLngs(layer) {
    try {
      return flattenLatLngs(layer.getLatLngs?.() || []);
    } catch (_) {
      return [];
    }
  }

  function latLngCount(layer) {
    return getFlatLatLngs(layer).length;
  }

  function isCandidatePolyline(layer) {
    if (!window.L || !(layer instanceof L.Polyline) || layer instanceof L.Polygon) {
      return false;
    }

    if (layer.__bpOfficialHardCasing) {
      return false;
    }

    const className = normalized(layer.options?.className);

    if (/weather|popular|highlight|inciden|bike.?base|casing/.test(className)) {
      return false;
    }

    return latLngCount(layer) >= 5;
  }

  function currentFilterKey() {
    const sidebar = document.querySelector(".bp-proposal-a-sidebar");
    if (!sidebar) return null;

    const selects = Array.from(sidebar.querySelectorAll("select"));
    if (selects.length < 2) return null;

    return difficultyKey(
      selects[1].selectedOptions?.[0]?.textContent || selects[1].value
    );
  }

  function cardKeysInOrder() {
    return sidebarCards()
      .map(card => {
        const title = clean(card.querySelector(".bp-featured-card-title")?.textContent);
        const raw = clean(card.textContent);
        return difficultyKey(raw) || keyFromTitle(title);
      })
      .filter(Boolean);
  }

  function decoratePath(layer) {
    try {
      const path = layer._path;
      if (!path) return;
      path.classList.add("bp-difficulty-route-path");
    } catch (_) {}
  }

  function applyStyle(layer, key) {
    if (!key || !PALETTE[key]) return;

    const item = PALETTE[key];

    try {
      layer.setStyle({
        color: item.color,
        weight: item.weight,
        opacity: item.opacity,
        dashArray: null,
        dashOffset: null,
        lineCap: "round",
        lineJoin: "round"
      });
    } catch (_) {}

    layer.__bpDifficultyStyled = true;
    layer.__bpDifficultyKey = key;
    decoratePath(layer);
  }

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);

    const aa =
      s1 * s1 +
      Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      s2 * s2;

    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  function approximateRouteKm(layer) {
    if (Number.isFinite(layer.__bpApproxRouteKm)) {
      return layer.__bpApproxRouteKm;
    }

    const pts = getFlatLatLngs(layer);
    if (pts.length < 2) {
      layer.__bpApproxRouteKm = 0;
      return 0;
    }

    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += haversineKm(pts[i - 1], pts[i]);
    }

    layer.__bpApproxRouteKm = Number(total.toFixed(3));
    return layer.__bpApproxRouteKm;
  }

  function difficultyPriority(key) {
    if (key === "hard") return 1;
    if (key === "medium") return 2;
    if (key === "easy") return 3;
    return 99;
  }

  function reorderLayers(layers) {
    /*
     * Objectiu demanat:
     * - si dues rutes se solapen, la mÃ©s petita ha de quedar per sobre
     * - per aconseguir-ho, posem primer al fons les mÃ©s grans
     *   i desprÃ©s anem portant al davant les mÃ©s petites
     *
     * Tie-breaks:
     * - si dues rutes tenen mida semblant, mantenim un ordre estable
     *   per dificultat: difícil al fons, mitjana al mig, fàcil a sobre
     * - com a Ãºltim criteri, _leaflet_id
     */
    layers
      .slice()
      .sort((a, b) => {
        const lenA = approximateRouteKm(a);
        const lenB = approximateRouteKm(b);

        if (Math.abs(lenA - lenB) > 0.05) {
          return lenB - lenA; // gran primer (fons), petita desprÃ©s (damunt)
        }

        const diffA = difficultyPriority(a.__bpDifficultyKey);
        const diffB = difficultyPriority(b.__bpDifficultyKey);

        if (diffA !== diffB) {
          return diffA - diffB;
        }

        return Number(a._leaflet_id || 0) - Number(b._leaflet_id || 0);
      })
      .forEach(layer => {
        try {
          layer.bringToFront?.();
        } catch (_) {}
      });
  }

  function paintRoutes() {
    if (!state.map) return;

    paintCards();

    const filterKey = currentFilterKey();
    const orderedKeys = cardKeysInOrder();

    const candidates = [];

    state.map.eachLayer(layer => {
      if (isCandidatePolyline(layer)) {
        candidates.push(layer);
      }
    });

    candidates.sort(
      (a, b) =>
        Number(a._leaflet_id || 0) -
        Number(b._leaflet_id || 0)
    );

    let fallbackIndex = 0;

    candidates.forEach(layer => {
      const text = layerText(layer);

      let key =
        difficultyKey(text) ||
        keyFromTitle(text) ||
        layer.__bpDifficultyKey ||
        null;

      if (/bp-official-hard-route-line/.test(normalized(layer.options?.className))) {
        key = "hard";
      }

      if (!key && filterKey) {
        key = filterKey;
      }

      if (!key) {
        key = orderedKeys[fallbackIndex] || null;
        fallbackIndex++;
      }

      if (!key || !PALETTE[key]) {
        return;
      }

      applyStyle(layer, key);
    });

    reorderLayers(candidates);
  }

  function ensureLegend() {
    if (!state.map) return;

    const container = state.map.getContainer?.();
    if (!container) return;

    Array.from(container.querySelectorAll(".bp-route-difficulty-legend"))
      .forEach(node => {
        if (node !== state.legend) {
          node.remove();
        }
      });

    if (state.legend && state.legend.isConnected) {
      return;
    }

    const legend = document.createElement("div");
    legend.className = "bp-route-difficulty-legend";
    legend.innerHTML =
      "<strong>Dificultat</strong>" +
      '<span class="bp-route-difficulty-legend-item">' +
        '<span class="bp-route-difficulty-legend-line is-easy"></span>' +
        "<span>Fàcil</span>" +
      "</span>" +
      '<span class="bp-route-difficulty-legend-item">' +
        '<span class="bp-route-difficulty-legend-line is-medium"></span>' +
        "<span>Mitjana</span>" +
      "</span>" +
      '<span class="bp-route-difficulty-legend-item">' +
        '<span class="bp-route-difficulty-legend-line is-hard"></span>' +
        "<span>Difícil</span>" +
      "</span>";

    container.appendChild(legend);
    state.legend = legend;
  }

  function reconcile() {
    ensureLegend();
    paintRoutes();
  }

  function schedule(delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(reconcile, Number(delay || 60));
  }

  function bind() {
    document.addEventListener(
      "change",
      event => {
        if (event.target?.closest?.(".bp-proposal-a-sidebar")) {
          schedule(80);
          setTimeout(reconcile, 350);
          setTimeout(reconcile, 800);
        }
      },
      true
    );

    state.map.on("layeradd", () => schedule(80));
    state.map.on("zoomend moveend", () => schedule(50));

    state.observer = new MutationObserver(() => {
      schedule(100);
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    let rounds = 0;
    const persistence = setInterval(() => {
      rounds++;
      reconcile();
      if (rounds >= 12) {
        clearInterval(persistence);
      }
    }, 500);
  }

  function bootWithMap(map) {
    if (state.booted || !map) return;

    state.booted = true;
    state.map = map;

    ensureLegend();
    bind();

    setTimeout(reconcile, 150);
    setTimeout(reconcile, 500);
    setTimeout(reconcile, 1200);

    console.info("[BiciPark] Route palette v7 ready. Small routes stay on top.");
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
      }
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForMap);
  } else {
    waitForMap();
  }
})();