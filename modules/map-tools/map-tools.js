(() => {
  "use strict";

  if (window.__BICIPARK_MAP_TOOLS__) {
    return;
  }

  window.__BICIPARK_MAP_TOOLS__ = true;

  if (!window.L || !L.map) {
    console.warn(
      "[Map Tools] Leaflet no disponible."
    );
    return;
  }

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /modules\/map-tools\/map-tools\.js/.test(script.src)
      );

  const selfUrl =
    selfScript?.src
      ? new URL("./", selfScript.src)
      : null;

  const rootUrl =
    selfUrl
      ? new URL("../../", selfUrl)
      : new URL("./", location.href);

  const links = {
    highlights:
      new URL(
        "modules/highlights/",
        rootUrl
      ).href,

    conditions:
      new URL(
        "modules/live-conditions/",
        rootUrl
      ).href
  };

  const state = {
    map: null,
    root: null,
    refreshTimer: null
  };

  const originalMapFactory =
    L.map;

  L.map = function(...args) {
    const instance =
      originalMapFactory.apply(
        this,
        args
      );

    if (!state.map) {
      const target =
        typeof args[0] === "string"
          ? document.getElementById(
              args[0]
            )
          : args[0];

      const looksLikeMainMap =
        target &&
        (
          target.id === "map" ||
          target.id === "mapa" ||
          target.classList
            ?.contains(
              "leaflet-container"
            )
        );

      if (looksLikeMainMap) {
        state.map =
          instance;

        window.setTimeout(
          boot,
          0
        );
      }
    }

    return instance;
  };

  Object.keys(
    originalMapFactory
  ).forEach(key => {
    try {
      L.map[key] =
        originalMapFactory[key];
    } catch (_) {}
  });

  function apiFor(id) {
    if (id === "highlights") {
      return (
        window.BiciParkHighlightsMap ||
        null
      );
    }

    if (
      id ===
      "live-conditions"
    ) {
      return (
        window.BiciParkLiveConditionsMap ||
        null
      );
    }

    return null;
  }

  function isVisible(
    id,
    api
  ) {
    if (!api) {
      return false;
    }

    if (
      typeof api.isVisible ===
      "function"
    ) {
      try {
        return Boolean(
          api.isVisible()
        );
      } catch (_) {}
    }

    try {
      const layer =
        api.getLayer?.();

      return Boolean(
        layer &&
        state.map &&
        state.map.hasLayer(
          layer
        )
      );
    } catch (_) {
      return false;
    }
  }

  function countFor(api) {
    if (!api) {
      return null;
    }

    try {
      const items =
        api.getItems?.();

      return Array.isArray(
        items
      )
        ? items.length
        : null;
    } catch (_) {
      return null;
    }
  }

  function findBikeBasesControl() {
    const controls =
      Array.from(
        document.querySelectorAll(
          ".leaflet-control"
        )
      );

    return (
      controls.find(control => {
        if (
          control.classList
            .contains(
              "bp-map-tools"
            )
        ) {
          return false;
        }

        const text =
          (
            control.textContent ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim();

        return (
          text.includes(
            "Bike Bases"
          ) &&
          (
            text.includes("llocs") ||
            text.includes("Bike Base")
          )
        );
      }) ||
      null
    );
  }

  function bikeBasesCount() {
    const control =
      findBikeBasesControl();

    if (!control) {
      return null;
    }

    const text =
      (
        control.textContent ||
        ""
      ).replace(/\s+/g, " ");

    const match =
      text.match(
        /(\d+)\s*llocs/i
      );

    return match
      ? Number(match[1])
      : null;
  }

  function rowHtml(
    id,
    icon,
    label,
    description,
    link
  ) {
    return (
      '<div class="bp-map-tools-row" data-bp-map-row="' +
        id +
        '">' +
        '<span class="bp-map-tools-row-icon">' +
          icon +
        "</span>" +
        '<span class="bp-map-tools-row-copy">' +
          "<strong>" +
            label +
          "</strong>" +
          "<small>" +
            description +
          "</small>" +
        "</span>" +
        '<span class="bp-map-tools-count" data-bp-map-count="' +
          id +
          '">-</span>' +
        '<button class="bp-map-tools-toggle" type="button" data-bp-map-toggle="' +
          id +
          '" aria-label="' +
          label +
          '"></button>' +
      "</div>"
    );
  }

  function futureRowHtml(
    icon,
    label
  ) {
    return (
      '<div class="bp-map-tools-row bp-map-tools-future">' +
        '<span class="bp-map-tools-row-icon">' +
          icon +
        "</span>" +
        '<span class="bp-map-tools-row-copy">' +
          "<strong>" +
            label +
          "</strong>" +
          "<small>Properament</small>" +
        "</span>" +
        '<span class="bp-map-tools-count"></span>' +
        '<button class="bp-map-tools-toggle" type="button" disabled></button>' +
      "</div>"
    );
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
            "leaflet-control bp-map-tools"
          );

        root.innerHTML =
          '<button class="bp-map-tools-head" type="button" data-bp-map-tools-head>' +
            '<span class="bp-map-tools-icon">\u2630</span>' +
            '<span class="bp-map-tools-title">' +
              "<strong>Capes del mapa</strong>" +
              "<small>Informacio ciclista</small>" +
            "</span>" +
            '<span class="bp-map-tools-chevron">\u25be</span>' +
          "</button>" +
          '<div class="bp-map-tools-panel">' +
            rowHtml(
              "highlights",
              "\u2726",
              "Highlights",
              "POIs i llocs d'interes",
              links.highlights
            ) +
            rowHtml(
              "live-conditions",
              "\u26a0",
              "Incidencies",
              "Estat actual dels trams",
              links.conditions
            ) +
            '<div class="bp-map-tools-row" data-bp-map-row="bike-bases">' +
              '<span class="bp-map-tools-row-icon">\ud83c\udfe1</span>' +
              '<span class="bp-map-tools-row-copy">' +
                "<strong>Bike Bases</strong>" +
                "<small>Control independent amb mes opcions</small>" +
              "</span>" +
              '<span class="bp-map-tools-count" data-bp-map-count="bike-bases">-</span>' +
              '<span></span>' +
            "</div>" +
            '<div class="bp-map-tools-separator"></div>' +
            futureRowHtml(
              "\u2600",
              "Meteorologia"
            ) +
            futureRowHtml(
              "\ud83d\udd25",
              "Popularitat"
            ) +
            '<a class="bp-map-tools-open" href="' +
              links.highlights +
              '">' +
              "Explorar Highlights" +
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

        root
          .querySelector(
            "[data-bp-map-tools-head]"
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
          .querySelectorAll(
            "[data-bp-map-toggle]"
          )
          .forEach(button => {
            button.addEventListener(
              "click",
              () => {
                const id =
                  button.dataset
                    .bpMapToggle;

                const api =
                  apiFor(id);

                if (!api) {
                  return;
                }

                try {
                  api.toggle();
                } catch (error) {
                  console.warn(
                    "[Map Tools] toggle error",
                    id,
                    error
                  );
                }

                window.setTimeout(
                  refresh,
                  30
                );
              }
            );
          });

        state.root =
          root;

        return root;
      };

    control.addTo(
      state.map
    );

    document.body
      .classList.add(
        "bp-map-tools-ready"
      );
  }

  function refreshModule(
    id
  ) {
    if (!state.root) {
      return;
    }

    const api =
      apiFor(id);

    const toggle =
      state.root
        .querySelector(
          '[data-bp-map-toggle="' +
          id +
          '"]'
        );

    const count =
      state.root
        .querySelector(
          '[data-bp-map-count="' +
          id +
          '"]'
        );

    if (toggle) {
      toggle.disabled =
        !api;

      toggle
        .classList
        .toggle(
          "is-on",
          isVisible(
            id,
            api
          )
        );
    }

    if (count) {
      const value =
        countFor(api);

      count.textContent =
        value == null
          ? "-"
          : String(value);
    }
  }

  function refresh() {
    refreshModule(
      "highlights"
    );

    refreshModule(
      "live-conditions"
    );

    if (state.root) {
      const bikeCount =
        state.root
          .querySelector(
            '[data-bp-map-count="bike-bases"]'
          );

      if (bikeCount) {
        const value =
          bikeBasesCount();

        bikeCount.textContent =
          value == null
            ? "-"
            : String(value);
      }
    }
  }

  function boot() {
    if (
      !state.map ||
      state.root
    ) {
      return;
    }

    createControl();
    refresh();

    state.refreshTimer =
      window.setInterval(
        refresh,
        600
      );

    window.setTimeout(
      () => {
        if (
          state.refreshTimer
        ) {
          window.clearInterval(
            state.refreshTimer
          );

          state.refreshTimer =
            null;
        }

        refresh();
      },
      12000
    );

    window.addEventListener(
      "bicipark:highlights:visibility",
      refresh
    );

    window.addEventListener(
      "bicipark:live-conditions:visibility",
      refresh
    );

    window.addEventListener(
      "bicipark:map-layer-ready",
      refresh
    );

    window.BiciParkMapTools = {
      refresh,
      getMap: () =>
        state.map
    };

    console.info(
      "[Map Tools] Ready."
    );
  }
})();