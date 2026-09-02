(() => {
  "use strict";

  const DATA =
    window.BiciParkRouteDetailData ||
    {};

  const DIFFICULTY = {
    easy: {
      label: "F\u00e0cil",
      color: "#9D85E6"
    },

    medium: {
      label: "Mitjana",
      color: "#ED7A0F"
    },

    hard: {
      label: "Dif\u00edcil",
      color: "#CA3657"
    }
  };

  const state = {
    route: null,
    routeId: null,
    map: null,
    geometry: null,
    geometryUrl: null,
    elevations: [],
    routeLayer: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function getRouteId() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const requested =
      clean(
        params.get("route")
      );

    if (
      requested &&
      DATA[requested]
    ) {
      return requested;
    }

    return (
      Object.keys(DATA)[0] ||
      null
    );
  }

  function difficultyInfo(route) {
    return (
      DIFFICULTY[
        route.difficulty
      ] ||
      {
        label: "--",
        color: "#087B43"
      }
    );
  }

  function modalityKey(value) {
    const text =
      clean(value)
        .toLowerCase();

    if (
      /btt|mtb/.test(text)
    ) {
      return "mtb";
    }

    if (
      /carretera|road/.test(text)
    ) {
      return "road";
    }

    return "urban";
  }

  function formatNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "--";
    }

    return String(value)
      .replace(".", ",");
  }

  function makeRouteCard(route) {
    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "bp360-route-card";

    button.dataset.routeId =
      route.id;

    button.dataset.difficulty =
      route.difficulty;

    button.dataset.modality =
      modalityKey(
        route.modality
      );

    const diff =
      difficultyInfo(route);

    const safetyValue =
      route.safety === null ||
      route.safety === undefined ||
      route.safety === ""
        ? null
        : Number(route.safety);

    const safety =
      Number.isFinite(
        safetyValue
      )
        ? (
            '<span class="bp360-route-card-tag is-safe">' +
              "Seguretat " +
              safetyValue +
            "</span>"
          )
        : "";

    const qualityValue =
      route.quality === null ||
      route.quality === undefined ||
      route.quality === ""
        ? null
        : Number(route.quality);

    const quality =
      Number.isFinite(
        qualityValue
      )
        ? (
            '<span class="bp360-route-card-tag is-quality">' +
              "Qualitat " +
              qualityValue +
            "</span>"
          )
        : "";

    button.innerHTML =
      "<strong>" +
        route.name +
      "</strong>" +
      '<div class="bp360-route-card-meta">' +
        "<span>" +
          formatNumber(
            route.distanceKm
          ) +
          " km" +
        "</span>" +
        "<span>" +
          (
            route.ascentM == null
              ? "--"
              : route.ascentM + " m+"
          ) +
        "</span>" +
      "</div>" +
      '<div class="bp360-route-card-tags">' +
        '<span class="bp360-route-card-tag is-' +
          route.difficulty +
        '">' +
          diff.label +
        "</span>" +
        safety +
        quality +
      "</div>";

    button.addEventListener(
      "click",
      () => {
        window.location.href =
          "./?route=" +
          encodeURIComponent(
            route.id
          );
      }
    );

    return button;
  }

  function renderRouteList() {
    const list =
      byId(
        "bp360-route-list"
      );

    list.innerHTML = "";

    Object.values(DATA)
      .forEach(route => {
        const card =
          makeRouteCard(
            route
          );

        if (
          route.id ===
          state.routeId
        ) {
          card.classList.add(
            "is-active"
          );
        }

        list.appendChild(
          card
        );
      });

    applySidebarFilters();
  }

  function applySidebarFilters() {
    const modality =
      byId(
        "bp360-modality"
      )?.value ||
      "all";

    const difficulty =
      byId(
        "bp360-difficulty"
      )?.value ||
      "all";

    document.querySelectorAll(
      ".bp360-route-card"
    )
      .forEach(card => {
        const modalityOk =
          modality === "all" ||
          card.dataset.modality ===
            modality;

        const difficultyOk =
          difficulty === "all" ||
          card.dataset.difficulty ===
            difficulty;

        card.style.display =
          modalityOk &&
          difficultyOk
            ? ""
            : "none";
      });
  }

  function renderRoute() {
    const route =
      state.route;

    const diff =
      difficultyInfo(
        route
      );

    byId(
      "bp360-title"
    ).textContent =
      route.name;

    byId(
      "bp360-area"
    ).textContent =
      route.area ||
      "";

    const badge =
      byId(
        "bp360-difficulty-badge"
      );

    badge.textContent =
      diff.label;

    badge.className =
      "bp360-difficulty-badge is-" +
      route.difficulty;

    byId(
      "bp360-distance"
    ).textContent =
      formatNumber(
        route.distanceKm
      ) +
      " km";

    byId(
      "bp360-ascent"
    ).textContent =
      route.ascentM == null
        ? "--"
        : route.ascentM + " m+";

    byId(
      "bp360-time"
    ).textContent =
      route.estimatedTime ||
      "--";

    byId(
      "bp360-kpi-difficulty"
    ).textContent =
      diff.label;

    byId(
      "bp360-modality-value"
    ).textContent =
      route.modality ||
      "--";

    byId(
      "bp360-route-type"
    ).textContent =
      route.routeType ||
      "--";

    byId(
      "bp360-match-score"
    ).textContent =
      (
        route.compatibility ??
        "--"
      ) +
      (
        route.compatibility == null
          ? ""
          : "%"
      );

    byId(
      "bp360-match-text"
    ).textContent =
      route.compatibilityText ||
      "Obre Route Match per analitzar la compatibilitat.";

    byId(
      "bp360-match-link"
    ).href =
      "../route-match/?route=" +
      encodeURIComponent(
        route.id
      );

    byId(
      "bp360-weather-link"
    ).href =
      "../weather-route/?route=" +
      encodeURIComponent(
        route.weatherRouteId ||
        route.id
      );

    renderSafetyQuality();
    renderHighlights();
    syncFavoriteButton();
    syncPlanButton();
  }

  function renderSafetyQuality() {
    const route =
      state.route;

    const safety =
      Number(route.safety);

    const quality =
      Number(route.quality);

    byId(
      "bp360-safety-label"
    ).textContent =
      Number.isFinite(safety)
        ? safety + "/100"
        : "Pendent";

    byId(
      "bp360-quality-label"
    ).textContent =
      Number.isFinite(quality)
        ? quality + "/100"
        : "Pendent";

    byId(
      "bp360-safety-meter"
    ).style.width =
      Number.isFinite(safety)
        ? Math.max(
            0,
            Math.min(
              100,
              safety
            )
          ) + "%"
        : "0%";

    byId(
      "bp360-quality-meter"
    ).style.width =
      Number.isFinite(quality)
        ? Math.max(
            0,
            Math.min(
              100,
              quality
            )
          ) + "%"
        : "0%";
  }

  function renderHighlights() {
    const list =
      byId(
        "bp360-highlights"
      );

    list.innerHTML = "";

    (
      state.route.highlights ||
      []
    )
      .slice(
        0,
        4
      )
      .forEach(item => {
        const li =
          document.createElement(
            "li"
          );

        li.textContent =
          item;

        list.appendChild(
          li
        );
      });
  }

  function initMap() {
    state.map =
      L.map(
        "bp360-map",
        {
          zoomControl:
            false
        }
      )
        .setView(
          [41.405, 2.12],
          12
        );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    )
      .addTo(
        state.map
      );

    window.BiciParkRouteDetailMap = state.map;

    L.control.zoom(
      {
        position:
          "bottomright"
      }
    )
      .addTo(
        state.map
      );
  }

  function extension(url) {
    return clean(url)
      .split("?")[0]
      .split("#")[0]
      .toLowerCase()
      .split(".")
      .pop();
  }

  function geoJsonCoordinates(data) {
    const segments = [];

    function addGeometry(geometry) {
      if (!geometry) {
        return;
      }

      if (
        geometry.type ===
        "LineString"
      ) {
        segments.push(
          geometry.coordinates
        );
      }
      else if (
        geometry.type ===
        "MultiLineString"
      ) {
        geometry.coordinates
          .forEach(segment =>
            segments.push(
              segment
            )
          );
      }
      else if (
        geometry.type ===
        "GeometryCollection"
      ) {
        geometry.geometries
          .forEach(
            addGeometry
          );
      }
    }

    if (
      data.type ===
      "FeatureCollection"
    ) {
      data.features
        .forEach(feature =>
          addGeometry(
            feature.geometry
          )
        );
    }
    else if (
      data.type ===
      "Feature"
    ) {
      addGeometry(
        data.geometry
      );
    }
    else {
      addGeometry(
        data
      );
    }

    return segments;
  }

  function gpxCoordinates(text) {
    const doc =
      new DOMParser()
        .parseFromString(
          text,
          "application/xml"
        );

    const points =
      Array.from(
        doc.querySelectorAll(
          "trkpt, rtept"
        )
      )
        .map(node => {
          const lat =
            Number(
              node.getAttribute(
                "lat"
              )
            );

          const lng =
            Number(
              node.getAttribute(
                "lon"
              )
            );

          const ele =
            Number(
              node.querySelector(
                "ele"
              )?.textContent
            );

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return null;
          }

          return [
            lng,
            lat,
            Number.isFinite(ele)
              ? ele
              : null
          ];
        })
        .filter(Boolean);

    return points.length
      ? [points]
      : [];
  }

  function kmlCoordinates(text) {
    const doc =
      new DOMParser()
        .parseFromString(
          text,
          "application/xml"
        );

    const segments = [];

    Array.from(
      doc.querySelectorAll(
        "LineString coordinates"
      )
    )
      .forEach(node => {
        const coords =
          clean(
            node.textContent
          )
            .split(/\s+/)
            .map(tuple => {
              const parts =
                tuple
                  .split(",")
                  .map(Number);

              if (
                !Number.isFinite(
                  parts[0]
                ) ||
                !Number.isFinite(
                  parts[1]
                )
              ) {
                return null;
              }

              return [
                parts[0],
                parts[1],
                Number.isFinite(
                  parts[2]
                )
                  ? parts[2]
                  : null
              ];
            })
            .filter(Boolean);

        if (
          coords.length >= 2
        ) {
          segments.push(
            coords
          );
        }
      });

    return segments;
  }

  async function tryGeometry(url) {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status
      );
    }

    const ext =
      extension(url);

    let segments;

    if (
      ext ===
      "geojson" ||
      ext ===
      "json"
    ) {
      const data =
        await response.json();

      segments =
        geoJsonCoordinates(
          data
        );
    }
    else {
      const text =
        await response.text();

      if (
        ext ===
        "gpx"
      ) {
        segments =
          gpxCoordinates(
            text
          );
      }
      else if (
        ext ===
        "kml"
      ) {
        segments =
          kmlCoordinates(
            text
          );
      }
      else {
        throw new Error(
          "Format no suportat"
        );
      }
    }

    if (
      !segments ||
      !segments.length
    ) {
      throw new Error(
        "Sense geometria"
      );
    }

    return {
      url,
      segments
    };
  }

  async function loadGeometry() {
    const candidates =
      state.route
        .geometryCandidates ||
      [];

    for (
      const url of candidates
    ) {
      try {
        const result =
          await tryGeometry(
            url
          );

        state.geometry =
          result.segments;

        state.geometryUrl =
          result.url;

        return true;
      }
      catch (_) {}
    }

    return false;
  }

  function drawGeometry() {
    if (
      !state.geometry ||
      !state.geometry.length
    ) {
      return;
    }

    const diff =
      difficultyInfo(
        state.route
      );

    const group =
      L.featureGroup()
        .addTo(
          state.map
        );

    state.elevations = [];

    state.geometry
      .forEach(segment => {
        const latLngs =
          segment
            .map(coord => {
              const lng =
                Number(
                  coord[0]
                );

              const lat =
                Number(
                  coord[1]
                );

              const ele =
                Number(
                  coord[2]
                );

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                return null;
              }

              if (
                Number.isFinite(ele)
              ) {
                state.elevations.push(
                  ele
                );
              }

              return [
                lat,
                lng
              ];
            })
            .filter(Boolean);

        if (
          latLngs.length < 2
        ) {
          return;
        }

        L.polyline(
          latLngs,
          {
            color:
              "#FFFFFF",
            weight:
              10,
            opacity:
              .92,
            interactive:
              false
          }
        )
          .addTo(
            group
          );

        L.polyline(
          latLngs,
          {
            color:
              diff.color,
            weight:
              6,
            opacity:
              1,
            lineCap:
              "round",
            lineJoin:
              "round"
          }
        )
          .addTo(
            group
          );
      });

    state.routeLayer =
      group;

    try {
      state.map.fitBounds(
        group.getBounds(),
        {
          padding:
            [24, 24]
        }
      );
    }
    catch (_) {}

    byId(
      "bp360-map-status"
    ).textContent =
      "Tracat carregat des de dades locals BiciPark.";

    renderAltitudeProfile();
    syncDownloadButton();
  }

  function renderAltitudeProfile() {
    const svg =
      byId(
        "bp360-profile-svg"
      );

    const status =
      byId(
        "bp360-profile-status"
      );

    const values =
      state.elevations
        .filter(
          Number.isFinite
        );

    if (
      values.length < 4
    ) {
      svg.style.display =
        "none";

      const parent =
        byId(
          "bp360-profile"
        );

      let placeholder =
        parent.querySelector(
          ".bp360-profile-placeholder"
        );

      if (!placeholder) {
        placeholder =
          document.createElement(
            "div"
          );

        placeholder.className =
          "bp360-profile-placeholder";

        parent.appendChild(
          placeholder
        );
      }

      placeholder.textContent =
        "El tracat actual no inclou prou dades d'altitud.";

      status.textContent =
        "Altimetria pendent";

      return;
    }

    svg.style.display =
      "";

    const min =
      Math.min(
        ...values
      );

    const max =
      Math.max(
        ...values
      );

    const range =
      Math.max(
        1,
        max - min
      );

    const W = 800;
    const H = 150;
    const padX = 12;
    const padY = 14;

    const points =
      values
        .map(
          (
            value,
            index
          ) => {
            const x =
              padX +
              (
                index /
                Math.max(
                  1,
                  values.length - 1
                )
              ) *
              (
                W -
                padX * 2
              );

            const y =
              H -
              padY -
              (
                (
                  value - min
                ) /
                range
              ) *
              (
                H -
                padY * 2
              );

            return [
              x,
              y
            ];
          }
        );

    const line =
      points
        .map(
          (
            point,
            index
          ) =>
            (
              index
                ? "L"
                : "M"
            ) +
            point[0].toFixed(2) +
            "," +
            point[1].toFixed(2)
        )
        .join(" ");

    const area =
      line +
      " L " +
      points[
        points.length - 1
      ][0].toFixed(2) +
      "," +
      (
        H -
        padY
      ) +
      " L " +
      points[0][0].toFixed(2) +
      "," +
      (
        H -
        padY
      ) +
      " Z";

    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="bp360-profile-gradient" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#9D85E6" stop-opacity=".38"></stop>' +
          '<stop offset="100%" stop-color="#9D85E6" stop-opacity=".03"></stop>' +
        "</linearGradient>" +
      "</defs>" +
      '<line class="bp360-profile-grid" x1="0" y1="40" x2="800" y2="40"></line>' +
      '<line class="bp360-profile-grid" x1="0" y1="80" x2="800" y2="80"></line>' +
      '<line class="bp360-profile-grid" x1="0" y1="120" x2="800" y2="120"></line>' +
      '<path class="bp360-profile-area" d="' +
        area +
      '"></path>' +
      '<path class="bp360-profile-line" d="' +
        line +
      '"></path>';

    status.textContent =
      Math.round(min) +
      " - " +
      Math.round(max) +
      " m";
  }

  function renderGeometryMissing() {
    byId(
      "bp360-map-status"
    ).textContent =
      "No he trobat encara el tracat local d'aquesta ruta.";

    byId(
      "bp360-profile-status"
    ).textContent =
      "Sense geometria";
  }

  function favoriteKey() {
    return (
      "bicipark_route_favorite_" +
      state.routeId
    );
  }

  function syncFavoriteButton() {
    const active =
      localStorage.getItem(
        favoriteKey()
      ) ===
      "1";

    const button =
      byId(
        "bp360-favorite"
      );

    button.textContent =
      active
        ? "\u2665 A favorits"
        : "\u2661 Afegeix a favorits";

    button.dataset.active =
      active
        ? "1"
        : "0";
  }

  function toggleFavorite() {
    const active =
      localStorage.getItem(
        favoriteKey()
      ) ===
      "1";

    if (active) {
      localStorage.removeItem(
        favoriteKey()
      );
    }
    else {
      localStorage.setItem(
        favoriteKey(),
        "1"
      );
    }

    syncFavoriteButton();
  }

  function planKey() {
    return "bicipark_route_plan";
  }

  function getPlan() {
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            planKey()
          ) ||
          "[]"
        );

      return Array.isArray(parsed)
        ? parsed
        : [];
    }
    catch (_) {
      return [];
    }
  }

  function syncPlanButton() {
    const plan =
      getPlan();

    const active =
      plan.includes(
        state.routeId
      );

    byId(
      "bp360-plan"
    ).textContent =
      active
        ? "\u2713 Afegida al meu pla"
        : "\u25C9 Afegeix al meu pla";
  }

  function togglePlan() {
    const plan =
      getPlan();

    const index =
      plan.indexOf(
        state.routeId
      );

    if (
      index >= 0
    ) {
      plan.splice(
        index,
        1
      );
    }
    else {
      plan.push(
        state.routeId
      );
    }

    localStorage.setItem(
      planKey(),
      JSON.stringify(
        plan
      )
    );

    syncPlanButton();
  }

  function syncDownloadButton() {
    const button =
      byId(
        "bp360-download"
      );

    if (
      !state.geometryUrl
    ) {
      button.disabled =
        true;

      button.textContent =
        "\u2193 Tracat no disponible";

      return;
    }

    button.disabled =
      false;

    button.textContent =
      "\u2193 Descarregar tracat";
  }

  function downloadGeometry() {
    if (
      !state.geometryUrl
    ) {
      return;
    }

    const a =
      document.createElement(
        "a"
      );

    a.href =
      state.geometryUrl;

    a.download =
      "";

    document.body.appendChild(
      a
    );

    a.click();
    a.remove();
  }

  async function shareRoute() {
    const url =
      window.location.href;

    const title =
      state.route.name +
      " Â· BiciPark";

    if (
      navigator.share
    ) {
      try {
        await navigator.share(
          {
            title,
            url
          }
        );

        return;
      }
      catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(
        url
      );

      const button =
        byId(
          "bp360-share"
        );

      const previous =
        button.textContent;

      button.textContent =
        "\u2713";

      setTimeout(
        () => {
          button.textContent =
            previous;
        },
        1200
      );
    }
    catch (_) {}
  }

  function bindEvents() {
    byId(
      "bp360-modality"
    )
      .addEventListener(
        "change",
        applySidebarFilters
      );

    byId(
      "bp360-difficulty"
    )
      .addEventListener(
        "change",
        applySidebarFilters
      );

    byId(
      "bp360-favorite"
    )
      .addEventListener(
        "click",
        toggleFavorite
      );

    byId(
      "bp360-plan"
    )
      .addEventListener(
        "click",
        togglePlan
      );
    /* BICIPARK_ROUTE_DETAIL_HISTORY_BIND_V1 */
    byId(
      "bp360-history"
    )
      .addEventListener(
        "click",
        () => {
          window.location.href =
            "../activity-history/";
        }
      );

    byId(
      "bp360-download"
    )
      .addEventListener(
        "click",
        downloadGeometry
      );

    byId(
      "bp360-share"
    )
      .addEventListener(
        "click",
        shareRoute
      );
  }

  async function boot() {
    state.routeId =
      getRouteId();

    if (!state.routeId) {
      return;
    }

    state.route =
      DATA[
        state.routeId
      ];

    renderRouteList();
    renderRoute();
    bindEvents();
    initMap();
    syncDownloadButton();

    const loaded =
      await loadGeometry();

    if (loaded) {
      drawGeometry();
    }
    else {
      renderGeometryMissing();
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
  }
  else {
    boot();
  }
})();