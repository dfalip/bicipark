(() => {
  "use strict";

  if (window.__BICIPARK_HIGHLIGHTS_MAIN_MAP_ADAPTER__) {
    return;
  }

  window.__BICIPARK_HIGHLIGHTS_MAIN_MAP_ADAPTER__ = true;

  if (!window.L || !L.map) {
    console.warn(
      "[Highlights Main Map] Leaflet no disponible."
    );
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /highlights\/adapters\/main-map-adapter\.js/.test(script.src)
      );

  if (!selfScript || !selfScript.src) {
    return;
  }

  const adapterUrl =
    new URL("./", selfScript.src);

  const dataUrl =
    new URL(
      "../data/highlights.json",
      adapterUrl
    ).href;

  const bikeBasesUrl =
    new URL(
      "../../../bike-bases/data/bike-bases.json",
      adapterUrl
    ).href;

  const pageUrl =
    new URL(
      "../",
      adapterUrl
    ).href;

  const categoryInfo = {
    "bike-base": {
      label: "Bike Base",
      icon: "\ud83c\udfe1"
    },
    mirador: {
      label: "Mirador",
      icon: "\ud83d\udcf8"
    },
    monument: {
      label: "Monument",
      icon: "\ud83c\udfdb\ufe0f"
    },
    platja: {
      label: "Platja",
      icon: "\ud83c\udfd6\ufe0f"
    },
    estacio: {
      label: "Estacio",
      icon: "\ud83d\ude89"
    },
    "tram-bonic": {
      label: "Tram bonic",
      icon: "\ud83c\udf3f"
    },
    font: {
      label: "Font",
      icon: "\ud83d\udca7"
    },
    cafe: {
      label: "Cafe",
      icon: "\u2615"
    },
    taller: {
      label: "Taller",
      icon: "\ud83d\udd27"
    },
    botiga: {
      label: "Botiga",
      icon: "\ud83d\uded2"
    },
    conflictiu: {
      label: "Precaucio",
      icon: "\u26a0\ufe0f"
    }
  };

  const state = {
    map: null,
    items: [],
    layer: null,
    visible: false,
    filter: "all",
    controlRoot: null
  };

  const originalMapFactory = L.map;

  L.map = function(...args) {
    const instance =
      originalMapFactory.apply(
        this,
        args
      );

    if (!state.map) {
      const target =
        typeof args[0] === "string"
          ? document.getElementById(args[0])
          : args[0];

      const looksLikeMainMap =
        target &&
        (
          target.id === "map" ||
          target.id === "mapa" ||
          target.classList?.contains(
            "leaflet-container"
          )
        );

      if (looksLikeMainMap) {
        state.map = instance;

        window.setTimeout(
          bootWhenMapReady,
          0
        );
      }
    }

    return instance;
  };

  Object.keys(originalMapFactory)
    .forEach(key => {
      try {
        L.map[key] =
          originalMapFactory[key];
      } catch (_) {}
    });

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

  function toNumber(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function flattenBaseList(raw) {
    if (Array.isArray(raw)) {
      return raw.flat(Infinity);
    }

    if (!raw || typeof raw !== "object") {
      return [];
    }

    const candidates = [
      raw.bases,
      raw.items,
      raw.data,
      raw.results,
      raw.bikeBases
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.flat(Infinity);
      }
    }

    return [];
  }

  function bikeBaseToHighlight(base) {
    if (!base || typeof base !== "object") {
      return null;
    }

    const location =
      base.location || {};

    const coords =
      base.coords || {};

    const lat =
      toNumber(base.lat) ??
      toNumber(base.latitude) ??
      toNumber(location.lat) ??
      toNumber(location.latitude) ??
      toNumber(coords.lat) ??
      toNumber(coords.latitude);

    const lng =
      toNumber(base.lng) ??
      toNumber(base.lon) ??
      toNumber(base.longitude) ??
      toNumber(location.lng) ??
      toNumber(location.lon) ??
      toNumber(location.longitude) ??
      toNumber(coords.lng) ??
      toNumber(coords.lon) ??
      toNumber(coords.longitude);

    if (lat == null || lng == null) {
      return null;
    }

    const rawId =
      base.id ||
      base.slug ||
      base.code ||
      base.name ||
      (
        "base-" +
        lat +
        "-" +
        lng
      );

    const name =
      base.name ||
      base.title ||
      base.displayName ||
      "Bike Base";

    const region =
      base.region ||
      location.region ||
      base.locality ||
      location.locality ||
      base.city ||
      location.city ||
      "";

    const score =
      toNumber(
        base.bikeFriendlyIndex ??
        base.bikeFriendlyScore ??
        base.score
      );

    return {
      id:
        "bike-base-" +
        String(rawId),
      name,
      category:
        "bike-base",
      lat,
      lng,
      region,
      description:
        base.description ||
        "Bike Base BiciPark per descobrir el territori en bicicleta.",
      rating:
        score != null
          ? Math.min(
              5,
              Math.max(
                1,
                score / 20
              )
            )
          : 4.5,
      votes: 0,
      sourceType:
        "bike-base",
      sourceId:
        String(rawId)
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
        response.status +
        " " +
        url
      );
    }

    return response.json();
  }

  async function fetchItems() {
    const local =
      await fetchJson(
        dataUrl
      );

    const localItems =
      Array.isArray(local)
        ? local
        : [];

    let bikeBaseItems = [];

    try {
      const rawBases =
        await fetchJson(
          bikeBasesUrl
        );

      bikeBaseItems =
        flattenBaseList(rawBases)
          .map(
            bikeBaseToHighlight
          )
          .filter(Boolean);
    } catch (error) {
      console.info(
        "[Highlights Main Map] Bike Bases no carregades.",
        error.message
      );
    }

    const deduped =
      new Map();

    [
      ...localItems,
      ...bikeBaseItems
    ].forEach(item => {
      if (
        !item ||
        !item.id ||
        !Number.isFinite(
          Number(item.lat)
        ) ||
        !Number.isFinite(
          Number(item.lng)
        )
      ) {
        return;
      }

      deduped.set(
        item.id,
        item
      );
    });

    state.items =
      Array.from(
        deduped.values()
      );
  }

  function infoFor(category) {
    return (
      categoryInfo[category] ||
      {
        label:
          category || "Highlight",
        icon:
          "\u2726"
      }
    );
  }

  function markerIcon(item) {
    const info =
      infoFor(
        item.category
      );

    return L.divIcon({
      className:
        "bp-hl-marker-wrap",
      html:
        '<div class="bp-hl-map-marker">' +
          "<span>" +
            info.icon +
          "</span>" +
        "</div>",
      iconSize:
        [31, 31],
      iconAnchor:
        [15, 30],
      popupAnchor:
        [0, -28]
    });
  }

  function popupHtml(item) {
    const info =
      infoFor(
        item.category
      );

    const rating =
      Number(
        item.rating || 0
      );

    const ratingText =
      rating
        ? rating
            .toFixed(1)
            .replace(".", ",")
        : "-";

    const votes =
      Number(
        item.votes || 0
      );

    return (
      '<div class="bp-hl-popup">' +
        '<div class="bp-hl-popup-kicker">' +
          info.icon +
          " " +
          escapeHtml(
            info.label
          ) +
        "</div>" +
        "<h3>" +
          escapeHtml(
            item.name
          ) +
        "</h3>" +
        "<p>" +
          escapeHtml(
            item.description || ""
          ) +
        "</p>" +
        '<div class="bp-hl-popup-meta">' +
          (
            item.region
              ? "<span>\ud83d\udccd " +
                escapeHtml(
                  item.region
                ) +
                "</span>"
              : ""
          ) +
          "<span>\u2b50 " +
            ratingText +
          "</span>" +
          (
            item.sourceType === "bike-base"
              ? "<span>Bike Base</span>"
              : "<span>\ud83d\udc4d " +
                votes +
                "</span>"
          ) +
        "</div>" +
        '<div class="bp-hl-popup-actions">' +
          (
            item.sourceType === "bike-base"
              ? ""
              : (
                '<button class="bp-hl-primary" type="button" data-bp-hl-route="' +
                escapeHtml(
                  item.id
                ) +
                '">' +
                "Afegir a ruta" +
                "</button>"
              )
          ) +
          '<a href="' +
            pageUrl +
            '">' +
            "Veure Highlights" +
          "</a>" +
        "</div>" +
      "</div>"
    );
  }

  function visibleItems() {
    if (
      state.filter === "all"
    ) {
      return state.items;
    }

    return state.items.filter(
      item =>
        item.category ===
        state.filter
    );
  }

  function rebuildLayer() {
    if (!state.map) {
      return;
    }

    if (state.layer) {
      state.layer.clearLayers();
    } else {
      state.layer =
        L.layerGroup();
    }

    visibleItems()
      .forEach(item => {
        const marker =
          L.marker(
            [
              Number(item.lat),
              Number(item.lng)
            ],
            {
              icon:
                markerIcon(item)
            }
          );

        marker.bindPopup(
          popupHtml(item),
          {
            maxWidth: 300
          }
        );

        marker.on(
          "popupopen",
          wirePopupActions
        );

        marker.addTo(
          state.layer
        );
      });

    if (state.visible) {
      state.layer.addTo(
        state.map
      );
    }

    updateControl();
  }

  function wirePopupActions() {
    document
      .querySelectorAll(
        "[data-bp-hl-route]"
      )
      .forEach(button => {
        if (
          button.dataset
            .bpHlBound === "1"
        ) {
          return;
        }

        button.dataset
          .bpHlBound =
          "1";

        button.addEventListener(
          "click",
          event => {
            const id =
              event.currentTarget
                .dataset
                .bpHlRoute;

            const item =
              state.items.find(
                current =>
                  current.id === id
              );

            if (!item) {
              return;
            }

            window.dispatchEvent(
              new CustomEvent(
                "bicipark:highlights:add-to-route",
                {
                  detail:
                    item
                }
              )
            );

            try {
              sessionStorage.setItem(
                "bicipark.highlights.pendingRoutePoint",
                JSON.stringify(
                  item
                )
              );
            } catch (_) {}

            window.BiciParkCore?.emit(
              "highlights:add-to-route",
              item
            );

            alert(
              "Highlight preparat per al Route Planner: " +
              item.name
            );
          }
        );
      });
  }

  function setVisible(next) {
    state.visible =
      Boolean(next);

    if (!state.layer) {
      rebuildLayer();
    }

    if (state.visible) {
      if (
        !state.map.hasLayer(
          state.layer
        )
      ) {
        state.layer.addTo(
          state.map
        );
      }
    } else if (
      state.map.hasLayer(
        state.layer
      )
    ) {
      state.map.removeLayer(
        state.layer
      );
    }

    updateControl();

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:highlights:visibility",
        {
          detail: {
            visible:
              state.visible
          }
        }
      )
    );
  }

  function updateControl() {
    if (!state.controlRoot) {
      return;
    }

    state.controlRoot
      .classList.toggle(
        "is-active",
        state.visible
      );

    const count =
      state.controlRoot
        .querySelector(
          "[data-bp-hl-count]"
        );

    if (count) {
      count.textContent =
        visibleItems().length;
    }

    const eye =
      state.controlRoot
        .querySelector(
          "[data-bp-hl-eye]"
        );

    if (eye) {
      eye.title =
        state.visible
          ? "Amagar Highlights"
          : "Mostrar Highlights";
    }
  }

  function renderFilters(root) {
    const present =
      new Set(
        state.items.map(
          item =>
            item.category
        )
      );

    const keys = [
      "all",
      ...Object.keys(
        categoryInfo
      ).filter(
        key =>
          present.has(key)
      )
    ];

    root.innerHTML =
      keys.map(key => {
        const info =
          key === "all"
            ? {
                label: "Tots",
                icon: "\u2726"
              }
            : infoFor(key);

        return (
          '<button class="bp-hl-filter ' +
            (
              state.filter === key
                ? "is-active"
                : ""
            ) +
            '" type="button" data-bp-hl-filter="' +
            key +
            '">' +
            info.icon +
            " " +
            escapeHtml(
              info.label
            ) +
          "</button>"
        );
      }).join("");

    root
      .querySelectorAll(
        "[data-bp-hl-filter]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            state.filter =
              button.dataset
                .bpHlFilter;

            root
              .querySelectorAll(
                "[data-bp-hl-filter]"
              )
              .forEach(current => {
                current
                  .classList
                  .toggle(
                    "is-active",
                    current === button
                  );
              });

            rebuildLayer();
          }
        );
      });
  }

  function createControl() {
    const control =
      L.control({
        position:
          "topright"
      });

    control.onAdd =
      function() {
        const root =
          L.DomUtil.create(
            "div",
            "leaflet-control bp-hl-map-control"
          );

        root.innerHTML =
          '<div class="bp-hl-control-row">' +
            '<button class="bp-hl-control-main" type="button" data-bp-hl-main>' +
              '<span class="bp-hl-control-icon">\u2726</span>' +
              '<span class="bp-hl-control-copy">' +
                "<strong>Highlights</strong>" +
                "<small>POIs ciclistes</small>" +
              "</span>" +
              '<span class="bp-hl-control-count" data-bp-hl-count>0</span>' +
            "</button>" +
            '<button class="bp-hl-control-eye" type="button" data-bp-hl-eye title="Mostrar Highlights">' +
              "\ud83d\udc41" +
            "</button>" +
          "</div>" +
          '<div class="bp-hl-control-panel">' +
            '<div class="bp-hl-filter-grid" data-bp-hl-filters></div>' +
            '<a class="bp-hl-panel-link" href="' +
              pageUrl +
              '">' +
              "Explorar tots els Highlights" +
            "</a>" +
          "</div>";

        L.DomEvent
          .disableClickPropagation(
            root
          );

        L.DomEvent
          .disableScrollPropagation(
            root
          );

        state.controlRoot =
          root;

        root
          .querySelector(
            "[data-bp-hl-main]"
          )
          .addEventListener(
            "click",
            () => {
              root
                .classList
                .toggle(
                  "is-expanded"
                );
            }
          );

        root
          .querySelector(
            "[data-bp-hl-eye]"
          )
          .addEventListener(
            "click",
            () => {
              setVisible(
                !state.visible
              );
            }
          );

        renderFilters(
          root.querySelector(
            "[data-bp-hl-filters]"
          )
        );

        updateControl();

        return root;
      };

    control.addTo(
      state.map
    );
  }

  async function bootWhenMapReady() {
    if (
      !state.map ||
      state.map
        .__biciparkHighlightsReady
    ) {
      return;
    }

    state.map
      .__biciparkHighlightsReady =
      true;

    try {
      await fetchItems();

      rebuildLayer();
      createControl();
      setVisible(false);

      window.BiciParkHighlightsMap = {
        show: () =>
          setVisible(true),

        hide: () =>
          setVisible(false),

        toggle: () =>
          setVisible(
            !state.visible
          ),

        isVisible: () =>
          state.visible,

        getItems: () =>
          [...state.items],

        getVisibleItems: () =>
          [...visibleItems()],

        getLayer: () =>
          state.layer
      };

      window.BiciParkCore
        ?.registerModule({
          id:
            "highlights-main-map-adapter",
          version:
            "2.0.0",
          api:
            window.BiciParkHighlightsMap
        });

      window.dispatchEvent(
        new CustomEvent(
          "bicipark:map-layer-ready",
          {
            detail: {
              id: "highlights",
              count:
                state.items.length
            }
          }
        )
      );

      console.info(
        "[Highlights Main Map] Adapter v2 ready.",
        state.items.length
      );
    } catch (error) {
      console.error(
        "[Highlights Main Map] Error",
        error
      );
    }
  }
})();