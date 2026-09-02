(() => {
  "use strict";

  if (window.__BICIPARK_LIVE_CONDITIONS_MAIN_MAP_ADAPTER__) {
    return;
  }

  window.__BICIPARK_LIVE_CONDITIONS_MAIN_MAP_ADAPTER__ = true;

  if (!window.L || !L.map) {
    console.warn(
      "[Live Conditions Main Map] Leaflet no disponible."
    );
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /live-conditions\/adapters\/main-map-adapter\.js/.test(script.src)
      );

  if (!selfScript || !selfScript.src) {
    return;
  }

  const adapterUrl =
    new URL("./", selfScript.src);

  const dataUrl =
    new URL(
      "../data/conditions-demo.json",
      adapterUrl
    ).href;

  const pageUrl =
    new URL(
      "../",
      adapterUrl
    ).href;

  const state = {
    map: null,
    items: [],
    layer: null,
    visible: false,
    filter: "all",
    controlRoot: null
  };

  const statusInfo = {
    open: {
      label: "Transitable",
      icon: "\ud83d\udfe2"
    },
    caution: {
      label: "Precaucio",
      icon: "\ud83d\udfe0"
    },
    closed: {
      label: "Tancat",
      icon: "\ud83d\udd34"
    }
  };

  const typeInfo = {
    ok: {
      label: "Sense incidencia",
      icon: "\u2713"
    },
    works: {
      label: "Obres",
      icon: "\ud83d\udea7"
    },
    closed: {
      label: "Tancament",
      icon: "\u26d4"
    },
    mud: {
      label: "Fang",
      icon: "\ud83c\udf27\ufe0f"
    },
    obstacle: {
      label: "Obstacle",
      icon: "\ud83c\udf33"
    },
    traffic: {
      label: "Transit",
      icon: "\ud83d\ude97"
    },
    danger: {
      label: "Perill",
      icon: "\u26a0\ufe0f"
    },
    maintenance: {
      label: "Manteniment",
      icon: "\ud83d\udd27"
    },
    other: {
      label: "Altres",
      icon: "\ud83d\udccd"
    }
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
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function localItems() {
    try {
      const raw =
        localStorage.getItem(
          "bicipark.liveConditions.reports"
        );

      const parsed =
        raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  async function fetchItems() {
    const response =
      await fetch(
        dataUrl,
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

    const demo =
      await response.json();

    state.items = [
      ...(Array.isArray(demo) ? demo : []),
      ...localItems()
    ].filter(
      item =>
        Number.isFinite(
          Number(item.lat)
        ) &&
        Number.isFinite(
          Number(item.lng)
        )
    );
  }

  function visibleItems() {
    if (state.filter === "all") {
      return state.items;
    }

    return state.items.filter(
      item =>
        item.status === state.filter
    );
  }

  function markerIcon(item) {
    const status =
      ["open","caution","closed"]
        .includes(item.status)
          ? item.status
          : "caution";

    const type =
      typeInfo[item.type] ||
      typeInfo.other;

    return L.divIcon({
      className:
        "bp-lc-marker-wrap",
      html:
        '<div class="bp-lc-map-marker bp-lc-' +
          status +
          '">' +
          type.icon +
        "</div>",
      iconSize: [31,31],
      iconAnchor: [15,15],
      popupAnchor: [0,-14]
    });
  }

  function popupHtml(item) {
    const status =
      statusInfo[item.status] ||
      statusInfo.caution;

    const type =
      typeInfo[item.type] ||
      typeInfo.other;

    return (
      '<div class="bp-lc-popup">' +
        '<div class="bp-lc-popup-kicker">' +
          status.icon + " " +
          escapeHtml(status.label) +
          " · " +
          type.icon + " " +
          escapeHtml(type.label) +
        "</div>" +
        "<h3>" +
          escapeHtml(item.title) +
        "</h3>" +
        "<p>" +
          escapeHtml(item.description || "") +
        "</p>" +
        '<div class="bp-lc-popup-meta">' +
          (
            item.region
              ? "<span>\ud83d\udccd " +
                escapeHtml(item.region) +
                "</span>"
              : ""
          ) +
          (
            item.sourceType === "demo"
              ? "<span>Demo</span>"
              : "<span>Usuari</span>"
          ) +
        "</div>" +
        '<div class="bp-lc-popup-actions">' +
          '<a href="' +
            pageUrl +
            '">' +
            "Veure Live Conditions" +
          "</a>" +
        "</div>" +
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

    visibleItems()
      .forEach(item => {
        L.marker(
          [
            Number(item.lat),
            Number(item.lng)
          ],
          {
            icon: markerIcon(item)
          }
        )
          .bindPopup(
            popupHtml(item),
            {
              maxWidth: 300
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

    updateControl();
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
        "bicipark:live-conditions:visibility",
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
      state.controlRoot.querySelector(
        "[data-bp-lc-count]"
      );

    if (count) {
      count.textContent =
        visibleItems().length;
    }

    const eye =
      state.controlRoot.querySelector(
        "[data-bp-lc-eye]"
      );

    if (eye) {
      eye.title =
        state.visible
          ? "Amagar incidencies"
          : "Mostrar incidencies";
    }
  }

  function renderFilters(root) {
    const keys = [
      "all",
      "open",
      "caution",
      "closed"
    ];

    root.innerHTML =
      keys.map(key => {
        const info =
          key === "all"
            ? {
                label: "Tots",
                icon: "\u2726"
              }
            : statusInfo[key];

        return (
          '<button class="bp-lc-filter ' +
            (
              state.filter === key
                ? "is-active"
                : ""
            ) +
            '" type="button" data-bp-lc-filter="' +
            key +
            '">' +
            info.icon +
            " " +
            escapeHtml(info.label) +
          "</button>"
        );
      }).join("");

    root
      .querySelectorAll(
        "[data-bp-lc-filter]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            state.filter =
              button.dataset
                .bpLcFilter;

            root
              .querySelectorAll(
                "[data-bp-lc-filter]"
              )
              .forEach(current => {
                current.classList.toggle(
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
        position: "topright"
      });

    control.onAdd = function() {
      const root =
        L.DomUtil.create(
          "div",
          "leaflet-control bp-lc-map-control"
        );

      root.innerHTML =
        '<div class="bp-lc-control-row">' +
          '<button class="bp-lc-control-main" type="button" data-bp-lc-main>' +
            '<span class="bp-lc-control-icon">\u26a0</span>' +
            '<span class="bp-lc-control-copy">' +
              "<strong>Incidencies</strong>" +
              "<small>Live Conditions</small>" +
            "</span>" +
            '<span class="bp-lc-control-count" data-bp-lc-count>0</span>' +
          "</button>" +
          '<button class="bp-lc-control-eye" type="button" data-bp-lc-eye title="Mostrar incidencies">' +
            "\ud83d\udc41" +
          "</button>" +
        "</div>" +
        '<div class="bp-lc-control-panel">' +
          '<div class="bp-lc-filter-grid" data-bp-lc-filters></div>' +
          '<a class="bp-lc-panel-link" href="' +
            pageUrl +
            '">' +
            "Obrir Live Conditions" +
          "</a>" +
        "</div>";

      L.DomEvent.disableClickPropagation(
        root
      );

      L.DomEvent.disableScrollPropagation(
        root
      );

      state.controlRoot =
        root;

      root
        .querySelector(
          "[data-bp-lc-main]"
        )
        .addEventListener(
          "click",
          () => {
            root.classList.toggle(
              "is-expanded"
            );
          }
        );

      root
        .querySelector(
          "[data-bp-lc-eye]"
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
          "[data-bp-lc-filters]"
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
        .__biciparkLiveConditionsReady
    ) {
      return;
    }

    state.map
      .__biciparkLiveConditionsReady =
      true;

    try {
      await fetchItems();

      rebuildLayer();
      createControl();
      setVisible(false);

      window.BiciParkLiveConditionsMap = {
        show: () =>
          setVisible(true),

        hide: () =>
          setVisible(false),

        toggle: () =>
          setVisible(
            !state.visible
          ),

        getItems: () =>
          [...state.items],

        getLayer: () =>
          state.layer
      };

      window.BiciParkCore?.registerModule({
        id:
          "live-conditions-main-map-adapter",
        version:
          "1.0.0",
        api:
          window.BiciParkLiveConditionsMap
      });

      console.info(
        "[Live Conditions Main Map] Adapter ready.",
        state.items.length
      );
    } catch (error) {
      console.error(
        "[Live Conditions Main Map]",
        error
      );
    }
  }
})();