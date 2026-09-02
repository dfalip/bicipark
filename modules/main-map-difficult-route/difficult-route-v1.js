(() => {
  "use strict";

  if (window.__BICIPARK_OFFICIAL_HARD_ROUTE_V1__) {
    return;
  }

  window.__BICIPARK_OFFICIAL_HARD_ROUTE_V1__ = true;

  const HARD_COLOR =
    "#CA3657";

  const OFFICIAL_PAGE =
    "https://parcnaturalcollserola.cat/itinerais/volta-integral/";

  const ROUTE = {
    id:
      "volta-integral-collserola",

    name:
      "Volta integral de Collserola",

    distance:
      "67,9 km",

    time:
      "7 h 30 min",

    modality:
      "BTT",

    difficulty:
      "Dif\u00edcil"
  };

  const state = {
    map: null,
    layerGroup: null,
    routeLayer: null,
    casingLayer: null,
    points: [],
    card: null,
    loaded: false,
    visible: true
  };

  function normalized(value) {
    return String(
      value == null ? "" : value
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseCoordinates(xmlText) {
    const doc =
      new DOMParser()
        .parseFromString(
          xmlText,
          "application/xml"
        );

    if (
      doc.querySelector(
        "parsererror"
      )
    ) {
      throw new Error(
        "KML XML invalid"
      );
    }

    const result = [];

    const coordinateNodes =
      Array.from(
        doc.querySelectorAll(
          "LineString coordinates"
        )
      );

    coordinateNodes.forEach(node => {
      String(
        node.textContent || ""
      )
        .trim()
        .split(/\s+/)
        .forEach(tuple => {
          const parts =
            tuple
              .split(",")
              .map(Number);

          const lng =
            parts[0];

          const lat =
            parts[1];

          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            result.push(
              [lat, lng]
            );
          }
        });
    });

    if (result.length >= 2) {
      return result;
    }

    /*
     * Support gx:Track KML as fallback.
     */
    const gxCoords =
      Array.from(
        doc.getElementsByTagNameNS(
          "*",
          "coord"
        )
      );

    gxCoords.forEach(node => {
      const parts =
        String(
          node.textContent || ""
        )
          .trim()
          .split(/\s+/)
          .map(Number);

      const lng =
        parts[0];

      const lat =
        parts[1];

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        result.push(
          [lat, lng]
        );
      }
    });

    return result;
  }

  function popupHtml() {
    return (
      '<div class="bp-hard-route-popup">' +
        '<div class="bp-hard-route-popup-kicker">RUTA OFICIAL Â· PARC NATURAL DE COLLSEROLA</div>' +
        "<h3>" +
          ROUTE.name +
        "</h3>" +
        '<div class="bp-hard-route-popup-grid">' +
          '<div class="bp-hard-route-popup-stat">' +
            "<small>Dist\u00e0ncia</small>" +
            "<strong>" +
              ROUTE.distance +
            "</strong>" +
          "</div>" +
          '<div class="bp-hard-route-popup-stat">' +
            "<small>Temps orientatiu</small>" +
            "<strong>" +
              ROUTE.time +
            "</strong>" +
          "</div>" +
          '<div class="bp-hard-route-popup-stat">' +
            "<small>Modalitat</small>" +
            "<strong>" +
              ROUTE.modality +
            "</strong>" +
          "</div>" +
          '<div class="bp-hard-route-popup-stat">' +
            "<small>Dificultat</small>" +
            "<strong>" +
              ROUTE.difficulty +
            "</strong>" +
          "</div>" +
        "</div>" +
        '<div class="bp-hard-route-popup-note">' +
          "Tra\u00e7at carregat des del KML oficial del Parc Natural de la Serra de Collserola." +
        "</div>" +
        '<a href="' +
          OFFICIAL_PAGE +
          '" target="_blank" rel="noopener">' +
          "Veure font oficial \u2192" +
        "</a>" +
      "</div>"
    );
  }

  function drawRoute() {
    if (
      !state.map ||
      state.points.length < 2
    ) {
      return;
    }

    state.layerGroup =
      L.layerGroup();

    /*
     * Thin white casing helps the hard route remain legible
     * over forest, roads and urban map detail.
     */
    state.casingLayer =
      L.polyline(
        state.points,
        {
          color:
            "#ffffff",
          weight:
            9,
          opacity:
            .88,
          lineCap:
            "round",
          lineJoin:
            "round",
          interactive:
            false,
          className:
            "bp-official-hard-route-casing"
        }
      )
        .addTo(
          state.layerGroup
        );

    state.routeLayer =
      L.polyline(
        state.points,
        {
          color:
            HARD_COLOR,
          weight:
            5,
          opacity:
            1,
          lineCap:
            "round",
          lineJoin:
            "round",
          className:
            "bp-official-hard-route-line"
        }
      )
        .bindPopup(
          popupHtml(),
          {
            maxWidth:
              310
          }
        )
        .addTo(
          state.layerGroup
        );

    /*
     * Mark it as a BiciPark difficult route so the existing
     * difficulty palette does not misclassify it.
     */
    state.routeLayer.__bpDifficultyRoute =
      true;

    state.routeLayer.__bpDifficultyKey =
      "hard";

    state.casingLayer.__bpOfficialHardCasing =
      true;

    if (state.visible) {
      state.layerGroup.addTo(
        state.map
      );
    }
  }

  function findFeaturedList() {
    return (
      document.querySelector(
        ".bp-proposal-a-sidebar .bp-featured-list"
      ) ||
      null
    );
  }

  function cardHtml() {
    return (
      '<div class="bp-featured-card-header">' +
        "<div>" +
          '<div class="bp-featured-card-title">' +
            ROUTE.name +
          "</div>" +
          '<div class="bp-featured-meta">' +
            "<span>" +
              ROUTE.distance +
            "</span>" +
            "<span>" +
              ROUTE.time +
            "</span>" +
            '<span class="bp-route-difficulty-pill bp-difficulty-hard">' +
              ROUTE.difficulty +
            "</span>" +
          "</div>" +
          '<div class="bp-featured-tags">' +
            '<span class="bp-chip">BTT</span>' +
          "</div>" +
          '<span class="bp-official-route-source">' +
            "<strong>Oficial</strong> Â· Parc Natural de Collserola" +
          "</span>" +
        "</div>" +
        '<svg class="bp-featured-card-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="9 18 15 12 9 6"></polyline>' +
        "</svg>" +
      "</div>"
    );
  }

  function ensureCard() {
    const list =
      findFeaturedList();

    if (!list) {
      return false;
    }

    let card =
      list.querySelector(
        '[data-bp-route-id="' +
          ROUTE.id +
        '"]'
      );

    if (!card) {
      card =
        document.createElement(
          "button"
        );

      card.type =
        "button";

      card.className =
        "bp-featured-card bp-difficulty-hard bp-official-hard-route-card";

      card.dataset.bpRouteId =
        ROUTE.id;

      card.innerHTML =
        cardHtml();

      list.appendChild(
        card
      );

      card.addEventListener(
        "click",
        () => {
          if (
            !state.map ||
            !state.routeLayer
          ) {
            return;
          }

          try {
            state.map.fitBounds(
              state.routeLayer.getBounds(),
              {
                padding:
                  [35, 35],
                maxZoom:
                  13
              }
            );

            state.routeLayer.openPopup();
          } catch (_) {}
        }
      );
    }

    state.card =
      card;

    return true;
  }

  function selectedDifficulty() {
    const sidebar =
      document.querySelector(
        ".bp-proposal-a-sidebar"
      );

    if (!sidebar) {
      return "";
    }

    const selects =
      Array.from(
        sidebar.querySelectorAll(
          "select"
        )
      );

    if (selects.length < 2) {
      return "";
    }

    return normalized(
      selects[1]
        .selectedOptions?.[0]
        ?.textContent ||
      selects[1].value
    );
  }

  function selectedModality() {
    const sidebar =
      document.querySelector(
        ".bp-proposal-a-sidebar"
      );

    if (!sidebar) {
      return "";
    }

    const selects =
      Array.from(
        sidebar.querySelectorAll(
          "select"
        )
      );

    if (!selects.length) {
      return "";
    }

    return normalized(
      selects[0]
        .selectedOptions?.[0]
        ?.textContent ||
      selects[0].value
    );
  }

  function shouldShow() {
    const difficulty =
      selectedDifficulty();

    const modality =
      selectedModality();

    const difficultyOk =
      !difficulty ||
      difficulty === "totes" ||
      difficulty === "tots" ||
      /dificil|hard|alta|expert/.test(
        difficulty
      );

    const modalityOk =
      !modality ||
      modality === "totes" ||
      modality === "tots" ||
      /btt|mtb|muntanya|mountain/.test(
        modality
      );

    return (
      difficultyOk &&
      modalityOk
    );
  }

  function hideNoResultsMessage() {
    if (!state.card || !shouldShow()) {
      return;
    }

    const sidebar =
      state.card.closest(
        ".bp-proposal-a-sidebar"
      );

    if (!sidebar) {
      return;
    }

    Array.from(
      sidebar.querySelectorAll(
        "p,div,span"
      )
    )
      .filter(node => {
        const text =
          normalized(
            node.textContent
          );

        return (
          /cap ruta|no hi ha cap ruta|0 rutes/.test(
            text
          ) &&
          node.children.length <= 2
        );
      })
      .forEach(node => {
        node.style.display =
          "none";
      });
  }

  function syncVisibility() {
    const show =
      shouldShow();

    state.visible =
      show;

    if (state.card) {
      state.card.style.display =
        show
          ? ""
          : "none";
    }

    if (
      state.map &&
      state.layerGroup
    ) {
      const present =
        state.map.hasLayer(
          state.layerGroup
        );

      if (
        show &&
        !present
      ) {
        state.layerGroup.addTo(
          state.map
        );
      }

      if (
        !show &&
        present
      ) {
        state.map.removeLayer(
          state.layerGroup
        );
      }
    }

    if (show) {
      hideNoResultsMessage();
    }
  }

  async function loadKml() {
    const response =
      await fetch(
        "./modules/main-map-difficult-route/data/volta-integral-collserola.kml",
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status +
        " carregant KML"
      );
    }

    const xml =
      await response.text();

    state.points =
      parseCoordinates(
        xml
      );

    if (
      state.points.length < 2
    ) {
      throw new Error(
        "El KML no conte un LineString utilitzable."
      );
    }

    state.loaded =
      true;
  }

  function bindUi() {
    document.addEventListener(
      "change",
      event => {
        if (
          event.target?.closest?.(
            ".bp-proposal-a-sidebar"
          )
        ) {
          setTimeout(
            syncVisibility,
            80
          );

          setTimeout(
            syncVisibility,
            350
          );
        }
      },
      true
    );

    const observer =
      new MutationObserver(
        () => {
          if (!state.card) {
            ensureCard();
          }

          syncVisibility();
        }
      );

    observer.observe(
      document.body,
      {
        childList:
          true,
        subtree:
          true
      }
    );
  }

  async function bootWithMap(map) {
    state.map =
      map;

    await loadKml();

    drawRoute();
    ensureCard();
    bindUi();
    syncVisibility();

    setTimeout(
      () => {
        ensureCard();
        syncVisibility();
      },
      400
    );

    setTimeout(
      () => {
        ensureCard();
        syncVisibility();
      },
      1000
    );

    console.info(
      "[BiciPark] Official difficult route ready:",
      state.points.length,
      "points"
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
        async () => {
          const map =
            findMap();

          if (map) {
            clearInterval(
              timer
            );

            try {
              await bootWithMap(
                map
              );
            } catch (error) {
              console.error(
                "[BiciPark] Official difficult route error:",
                error
              );
            }

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