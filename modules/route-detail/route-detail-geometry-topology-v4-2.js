(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DETAIL_GEOMETRY_TOPOLOGY_V42__) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_GEOMETRY_TOPOLOGY_V42__ = true;

  const ROUTES =
    window.BiciParkRouteDetailData ||
    {};

  const state = {
    routeId: null,
    route: null,
    segments: [],
    flatPoints: [],
    computedKm: null,
    endpointGapKm: null,
    segmentGapKm: null,
    overlapRatio: 0,
    markers: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function routeIdFromUrl() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      clean(
        params.get("route")
      );

    return ROUTES[id]
      ? id
      : Object.keys(ROUTES)[0];
  }

  function extension(url) {
    return clean(url)
      .split("?")[0]
      .split("#")[0]
      .toLowerCase()
      .split(".")
      .pop();
  }

  function geoJsonSegments(data) {
    const segments = [];

    function addGeometry(geometry) {
      if (!geometry) return;

      if (geometry.type === "LineString") {
        segments.push(geometry.coordinates);
      }
      else if (geometry.type === "MultiLineString") {
        geometry.coordinates.forEach(
          segment => segments.push(segment)
        );
      }
      else if (geometry.type === "GeometryCollection") {
        geometry.geometries.forEach(addGeometry);
      }
    }

    if (data?.type === "FeatureCollection") {
      data.features.forEach(
        feature => addGeometry(feature.geometry)
      );
    }
    else if (data?.type === "Feature") {
      addGeometry(data.geometry);
    }
    else {
      addGeometry(data);
    }

    return segments;
  }

  function gpxSegments(text) {
    const doc =
      new DOMParser()
        .parseFromString(
          text,
          "application/xml"
        );

    const segmentNodes =
      Array.from(
        doc.querySelectorAll("trkseg")
      );

    if (segmentNodes.length) {
      return segmentNodes
        .map(segmentNode =>
          Array.from(
            segmentNode.querySelectorAll("trkpt")
          )
            .map(node => {
              const lat =
                Number(
                  node.getAttribute("lat")
                );

              const lng =
                Number(
                  node.getAttribute("lon")
                );

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                return null;
              }

              return [lng, lat];
            })
            .filter(Boolean)
        )
        .filter(segment => segment.length >= 2);
    }

    const routePoints =
      Array.from(
        doc.querySelectorAll("rtept")
      )
        .map(node => {
          const lat =
            Number(
              node.getAttribute("lat")
            );

          const lng =
            Number(
              node.getAttribute("lon")
            );

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return null;
          }

          return [lng, lat];
        })
        .filter(Boolean);

    return routePoints.length
      ? [routePoints]
      : [];
  }

  function kmlSegments(text) {
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
          clean(node.textContent)
            .split(/\s+/)
            .map(tuple => {
              const parts =
                tuple
                  .split(",")
                  .map(Number);

              if (
                !Number.isFinite(parts[0]) ||
                !Number.isFinite(parts[1])
              ) {
                return null;
              }

              return [parts[0], parts[1]];
            })
            .filter(Boolean);

        if (coords.length >= 2) {
          segments.push(coords);
        }
      });

    return segments;
  }

  async function loadGeometry() {
    const candidates =
      state.route?.geometryCandidates ||
      [];

    for (const url of candidates) {
      try {
        const response =
          await fetch(
            url,
            {
              cache: "no-store"
            }
          );

        if (!response.ok) {
          continue;
        }

        const ext =
          extension(url);

        let segments = [];

        if (
          ext === "json" ||
          ext === "geojson"
        ) {
          segments =
            geoJsonSegments(
              await response.json()
            );
        }
        else {
          const text =
            await response.text();

          if (ext === "gpx") {
            segments =
              gpxSegments(text);
          }
          else if (ext === "kml") {
            segments =
              kmlSegments(text);
          }
        }

        segments =
          segments
            .map(segment =>
              segment.filter(coord =>
                Array.isArray(coord) &&
                Number.isFinite(Number(coord[0])) &&
                Number.isFinite(Number(coord[1]))
              )
            )
            .filter(segment => segment.length >= 2);

        if (segments.length) {
          state.segments =
            segments;

          state.flatPoints =
            segments
              .flat()
              .map(coord => ({
                lng: Number(coord[0]),
                lat: Number(coord[1])
              }));

          return true;
        }
      }
      catch (_) {}
    }

    return false;
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad =
      deg =>
        deg *
        Math.PI /
        180;

    const dLat =
      rad(
        b.lat - a.lat
      );

    const dLng =
      rad(
        b.lng - a.lng
      );

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

    return (
      2 *
      R *
      Math.atan2(
        Math.sqrt(x),
        Math.sqrt(1 - x)
      )
    );
  }

  function pointOf(coord) {
    return {
      lng: Number(coord[0]),
      lat: Number(coord[1])
    };
  }

  function routeLengthKm() {
    let total = 0;

    state.segments
      .forEach(segment => {
        for (
          let i = 1;
          i < segment.length;
          i++
        ) {
          total +=
            haversineKm(
              pointOf(segment[i - 1]),
              pointOf(segment[i])
            );
        }
      });

    return total;
  }

  function endpointGapKm() {
    if (state.flatPoints.length < 2) {
      return null;
    }

    return haversineKm(
      state.flatPoints[0],
      state.flatPoints[
        state.flatPoints.length - 1
      ]
    );
  }

  function maxSegmentGapKm() {
    if (state.segments.length <= 1) {
      return 0;
    }

    let maxGap = 0;

    for (
      let i = 1;
      i < state.segments.length;
      i++
    ) {
      const previous =
        state.segments[i - 1];

      const current =
        state.segments[i];

      const gap =
        haversineKm(
          pointOf(
            previous[
              previous.length - 1
            ]
          ),
          pointOf(
            current[0]
          )
        );

      maxGap =
        Math.max(
          maxGap,
          gap
        );
    }

    return maxGap;
  }

  function corridorOverlapRatio() {
    if (state.flatPoints.length < 20) {
      return 0;
    }

    const maxSamples = 900;

    const step =
      Math.max(
        1,
        Math.floor(
          state.flatPoints.length /
          maxSamples
        )
      );

    const sampled = [];

    for (
      let i = 0;
      i < state.flatPoints.length;
      i += step
    ) {
      sampled.push(
        state.flatPoints[i]
      );
    }

    const last =
      state.flatPoints[
        state.flatPoints.length - 1
      ];

    if (
      sampled[
        sampled.length - 1
      ] !== last
    ) {
      sampled.push(last);
    }

    const avgLat =
      sampled.reduce(
        (sum, point) =>
          sum + point.lat,
        0
      ) /
      sampled.length;

    const metersPerLon =
      111320 *
      Math.cos(
        avgLat *
        Math.PI /
        180
      );

    const metersPerLat =
      110540;

    const cellSize =
      35;

    const cells =
      new Map();

    let revisited = 0;

    sampled.forEach(
      (point, index) => {
        const x =
          Math.round(
            (
              point.lng *
              metersPerLon
            ) /
            cellSize
          );

        const y =
          Math.round(
            (
              point.lat *
              metersPerLat
            ) /
            cellSize
          );

        const key =
          x + ":" + y;

        if (!cells.has(key)) {
          cells.set(
            key,
            index
          );
          return;
        }

        const previousIndex =
          cells.get(key);

        if (
          Math.abs(
            index -
            previousIndex
          ) >= 8
        ) {
          revisited++;
        }
      }
    );

    return (
      revisited /
      Math.max(
        1,
        sampled.length
      )
    );
  }

  function classifyTopology() {
    const totalKm =
      state.computedKm;

    const gapKm =
      state.endpointGapKm;

    if (
      state.segments.length > 1 &&
      state.segmentGapKm > .30
    ) {
      return {
        code: "segmented",
        label: "Tra\u00e7at segmentat",
        attention: true,
        description:
          "La geometria cont\u00e9 diversos segments que no connecten entre ells."
      };
    }

    if (
      !Number.isFinite(totalKm) ||
      !Number.isFinite(gapKm) ||
      totalKm <= 0
    ) {
      return {
        code: "unknown",
        label: "Pendent de validar",
        attention: true,
        description:
          "No hi ha prou geometria per classificar el recorregut."
      };
    }

    const circularThreshold =
      Math.max(
        .25,
        totalKm * .015
      );

    const quasiThreshold =
      Math.max(
        1,
        totalKm * .05
      );

    if (
      gapKm <= circularThreshold &&
      state.overlapRatio >= .18
    ) {
      return {
        code: "out-back",
        label: "Anada i tornada",
        attention: false,
        description:
          "L'inici i el final queden pr\u00e0cticament al mateix punt, per\u00f2 una part significativa del recorregut torna pel mateix corredor."
      };
    }

    if (gapKm <= circularThreshold) {
      return {
        code: "circular",
        label: "Circular",
        attention: false,
        description:
          "El tra\u00e7at forma un bucle i l'inici i el final queden pr\u00e0cticament al mateix punt."
      };
    }

    if (gapKm <= quasiThreshold) {
      return {
        code: "quasi",
        label: "Quasi circular",
        attention: false,
        description:
          "L'inici i el final queden relativament a prop, per\u00f2 el recorregut no es tanca completament."
      };
    }

    return {
      code: "linear",
      label: "Lineal",
      attention: false,
      description:
        "L'inici i el final estan clarament separats."
    };
  }

  function formatKm(value, digits = 1) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return (
      value
        .toFixed(digits)
        .replace(".", ",") +
      " km"
    );
  }

  function renderKpi(classification) {
    const routeType =
      byId(
        "bp360-route-type"
      );

    if (!routeType) {
      return;
    }

    routeType.textContent =
      classification.label;

    const article =
      routeType.closest("article");

    const small =
      article?.querySelector("small");

    if (small) {
      small.className =
        "bp360-route-geometry-note";

      small.textContent =
        "Inici\u2013final: " +
        formatKm(
          state.endpointGapKm,
          state.endpointGapKm < 1
            ? 2
            : 1
        );
    }
  }

  function renderAudit(classification) {
    const kpis =
      document.querySelector(
        ".bp360-kpis"
      );

    if (!kpis) {
      return;
    }

    document
      .querySelectorAll(
        ".bp360-topology-audit"
      )
      .forEach(node =>
        node.remove()
      );

    const declaredKm =
      Number(
        state.route?.distanceKm
      );

    const differencePct =
      (
        Number.isFinite(declaredKm) &&
        declaredKm > 0
      )
        ? (
            Math.abs(
              state.computedKm -
              declaredKm
            ) /
            declaredKm
          )
        : null;

    const distanceWarning =
      Number.isFinite(differencePct) &&
      differencePct > .12;

    const audit =
      document.createElement("div");

    audit.className =
      "bp360-topology-audit" +
      (
        classification.attention
          ? " is-attention"
          : (
              distanceWarning
                ? " is-warning"
                : ""
            )
      );

    const icon =
      classification.attention ||
      distanceWarning
        ? "!"
        : "\u2713";

    let text =
      "<strong>" +
      classification.label +
      ".</strong> " +
      classification.description;

    if (distanceWarning) {
      text +=
        " La dist\u00e0ncia declarada (" +
        formatKm(declaredKm) +
        ") difereix del tra\u00e7at calculat (" +
        formatKm(state.computedKm) +
        ").";
    }

    audit.innerHTML =
      '<span class="bp360-topology-audit-icon">' +
        icon +
      "</span>" +
      "<span>" +
        text +
      "</span>" +
      '<span class="bp360-topology-badges">' +
        '<span class="bp360-topology-badge">' +
          formatKm(state.computedKm) +
          " calculats" +
        "</span>" +
        '<span class="bp360-topology-badge">' +
          state.segments.length +
          (
            state.segments.length === 1
              ? " segment"
              : " segments"
          ) +
        "</span>" +
        '<span class="bp360-topology-badge">' +
          "corredor repetit ~" +
          Math.round(
            state.overlapRatio *
            100
          ) +
          "%" +
        "</span>" +
      "</span>";

    kpis.insertAdjacentElement(
      "afterend",
      audit
    );
  }

  function endpointIcon(label, kind) {
    return L.divIcon({
      className:
        "bp360-endpoint-marker",

      html:
        '<span class="bp360-endpoint-pin ' +
        (
          kind === "finish"
            ? "is-finish"
            : (
                kind === "combined"
                  ? "is-combined"
                  : ""
              )
        ) +
        '">' +
        label +
        "</span>",

      iconSize:
        kind === "combined"
          ? [42, 32]
          : [32, 32],

      iconAnchor:
        kind === "combined"
          ? [21, 16]
          : [16, 16]
    });
  }

  function waitForMap() {
    return new Promise(resolve => {
      const started =
        Date.now();

      const timer =
        setInterval(
          () => {
            const map =
              window.BiciParkRouteDetailMap ||
              null;

            if (map) {
              clearInterval(timer);
              resolve(map);
              return;
            }

            if (
              Date.now() -
              started >
              12000
            ) {
              clearInterval(timer);
              resolve(null);
            }
          },
          120
        );
    });
  }

  function ensureEndpointLegend(map) {
    const container =
      map.getContainer?.();

    if (!container) {
      return;
    }

    container
      .querySelectorAll(
        ".bp360-endpoint-legend"
      )
      .forEach(node =>
        node.remove()
      );

    const legend =
      document.createElement("div");

    legend.className =
      "bp360-endpoint-legend";

    legend.innerHTML =
      '<span><i class="bp360-endpoint-dot"></i>A Inici</span>' +
      '<span><i class="bp360-endpoint-dot is-finish"></i>B Final</span>';

    container.appendChild(legend);
  }

  async function renderEndpoints() {
    const map =
      await waitForMap();

    if (
      !map ||
      !window.L ||
      state.flatPoints.length < 2
    ) {
      return;
    }

    const start =
      state.flatPoints[0];

    const finish =
      state.flatPoints[
        state.flatPoints.length - 1
      ];

    if (
      Number.isFinite(
        state.endpointGapKm
      ) &&
      state.endpointGapKm < .05
    ) {
      const midpoint = {
        lat:
          (
            start.lat +
            finish.lat
          ) /
          2,

        lng:
          (
            start.lng +
            finish.lng
          ) /
          2
      };

      const marker =
        L.marker(
          [
            midpoint.lat,
            midpoint.lng
          ],
          {
            icon:
              endpointIcon(
                "A/B",
                "combined"
              ),
            zIndexOffset: 1000
          }
        )
          .addTo(map)
          .bindPopup(
            '<div class="bp360-endpoint-popup">' +
              '<strong>Inici i final</strong><br>' +
              "Separaci\u00f3 aproximada: " +
              formatKm(
                state.endpointGapKm,
                2
              ) +
            "</div>"
          );

      state.markers.push(marker);
    }
    else {
      const startMarker =
        L.marker(
          [
            start.lat,
            start.lng
          ],
          {
            icon:
              endpointIcon(
                "A",
                "start"
              ),
            zIndexOffset: 1000
          }
        )
          .addTo(map)
          .bindPopup(
            '<div class="bp360-endpoint-popup">' +
              '<strong>A \u00b7 Inici</strong><br>' +
              state.route.name +
            "</div>"
          );

      const finishMarker =
        L.marker(
          [
            finish.lat,
            finish.lng
          ],
          {
            icon:
              endpointIcon(
                "B",
                "finish"
              ),
            zIndexOffset: 1000
          }
        )
          .addTo(map)
          .bindPopup(
            '<div class="bp360-endpoint-popup">' +
              '<strong>B \u00b7 Final</strong><br>' +
              "Separaci\u00f3 respecte de l'inici: " +
              formatKm(
                state.endpointGapKm,
                state.endpointGapKm < 1
                  ? 2
                  : 1
              ) +
            "</div>"
          );

      state.markers.push(
        startMarker,
        finishMarker
      );
    }

    ensureEndpointLegend(map);

    try {
      const bounds =
        L.latLngBounds(
          state.flatPoints.map(
            point =>
              [
                point.lat,
                point.lng
              ]
          )
        );

      map.fitBounds(
        bounds,
        {
          paddingTopLeft:
            [34, 34],

          paddingBottomRight:
            [42, 52],

          maxZoom:
            14
        }
      );
    }
    catch (_) {}
  }

  async function boot() {
    state.routeId =
      routeIdFromUrl();

    state.route =
      ROUTES[
        state.routeId
      ];

    if (!state.route) {
      return;
    }

    const loaded =
      await loadGeometry();

    if (!loaded) {
      return;
    }

    state.computedKm =
      routeLengthKm();

    state.endpointGapKm =
      endpointGapKm();

    state.segmentGapKm =
      maxSegmentGapKm();

    state.overlapRatio =
      corridorOverlapRatio();

    const classification =
      classifyTopology();

    renderKpi(
      classification
    );

    renderAudit(
      classification
    );

    renderEndpoints();

    console.info(
      "[BiciPark] Topology v4.2",
      {
        route:
          state.routeId,
        classification:
          classification.label,
        computedKm:
          state.computedKm,
        endpointGapKm:
          state.endpointGapKm,
        segments:
          state.segments.length,
        maxSegmentGapKm:
          state.segmentGapKm,
        overlapRatio:
          state.overlapRatio
      }
    );
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