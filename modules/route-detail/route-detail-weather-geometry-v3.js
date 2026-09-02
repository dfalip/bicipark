(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DETAIL_WEATHER_GEOMETRY_V3__) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_WEATHER_GEOMETRY_V3__ = true;

  const ROUTES =
    window.BiciParkRouteDetailData ||
    {};

  const state = {
    routeId: null,
    route: null,
    segments: [],
    flatPoints: [],
    computedKm: null,
    endpointGapKm: null
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

    const id =
      clean(
        params.get("route")
      );

    return (
      ROUTES[id]
        ? id
        : Object.keys(ROUTES)[0]
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

    return points.length ? [points] : [];
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

        if (ext === "json" || ext === "geojson") {
          segments =
            geoJsonCoordinates(
              await response.json()
            );
        }
        else {
          const text =
            await response.text();

          if (ext === "gpx") {
            segments =
              gpxCoordinates(text);
          }
          else if (ext === "kml") {
            segments =
              kmlCoordinates(text);
          }
        }

        if (segments.length) {
          state.segments =
            segments;

          state.flatPoints =
            segments
              .flat()
              .map(coord => ({
                lng: Number(coord[0]),
                lat: Number(coord[1])
              }))
              .filter(point =>
                Number.isFinite(point.lat) &&
                Number.isFinite(point.lng)
              );

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

  function routeLengthKm() {
    let total = 0;

    state.segments
      .forEach(segment => {
        const points =
          segment
            .map(coord => ({
              lng: Number(coord[0]),
              lat: Number(coord[1])
            }))
            .filter(point =>
              Number.isFinite(point.lat) &&
              Number.isFinite(point.lng)
            );

        for (let i = 1; i < points.length; i++) {
          total +=
            haversineKm(
              points[i - 1],
              points[i]
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

  function classifyRoute(totalKm, gapKm) {
    if (
      !Number.isFinite(totalKm) ||
      !Number.isFinite(gapKm) ||
      totalKm <= 0
    ) {
      return {
        label: "--",
        code: "unknown"
      };
    }

    /*
     * Circular:
     * endpoint gap <= max(250 m, 1.5% of route)
     *
     * Quasi-circular:
     * endpoint gap <= max(1 km, 5% of route)
     */
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

    if (gapKm <= circularThreshold) {
      return {
        label: "Circular",
        code: "circular"
      };
    }

    if (gapKm <= quasiThreshold) {
      return {
        label: "Quasi circular",
        code: "quasi"
      };
    }

    return {
      label: "Lineal",
      code: "linear"
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

  function findKpiArticle(strongId) {
    const strong =
      byId(strongId);

    return (
      strong?.closest("article") ||
      null
    );
  }

  function renderGeometryAudit() {
    const totalKm =
      routeLengthKm();

    const gapKm =
      endpointGapKm();

    state.computedKm =
      totalKm;

    state.endpointGapKm =
      gapKm;

    const classification =
      classifyRoute(
        totalKm,
        gapKm
      );

    const routeType =
      byId(
        "bp360-route-type"
      );

    if (routeType) {
      routeType.textContent =
        classification.label;

      const article =
        findKpiArticle(
          "bp360-route-type"
        );

      const small =
        article?.querySelector("small");

      if (small) {
        small.className =
          "bp360-route-geometry-note";

        small.textContent =
          "Inici-final " +
          formatKm(
            gapKm,
            gapKm < 1
              ? 2
              : 1
          );
      }
    }

    const declaredKm =
      Number(
        state.route?.distanceKm
      );

    const differenceKm =
      Number.isFinite(declaredKm) &&
      Number.isFinite(totalKm)
        ? Math.abs(
            declaredKm -
            totalKm
          )
        : null;

    const differencePct =
      Number.isFinite(differenceKm) &&
      declaredKm > 0
        ? (
            differenceKm /
            declaredKm
          ) *
          100
        : null;

    const kpis =
      document.querySelector(
        ".bp360-kpis"
      );

    if (!kpis) {
      return;
    }

    document
      .querySelectorAll(
        ".bp360-geometry-audit"
      )
      .forEach(node =>
        node.remove()
      );

    const audit =
      document.createElement(
        "div"
      );

    const warning =
      Number.isFinite(
        differencePct
      ) &&
      differencePct >
        12;

    audit.className =
      "bp360-geometry-audit" +
      (
        warning
          ? " is-warning"
          : ""
      );

    if (warning) {
      audit.innerHTML =
        '<span class="bp360-geometry-audit-icon">!</span>' +
        "<span>" +
          "<strong>Geometria per revisar.</strong> " +
          "La fitxa declara " +
          formatKm(declaredKm) +
          " pero el tracat carregat calcula aproximadament " +
          formatKm(totalKm) +
          ". " +
          "Tipus detectat: <strong>" +
          classification.label +
          "</strong>." +
        "</span>";
    }
    else {
      audit.innerHTML =
        '<span class="bp360-geometry-audit-icon">\u2713</span>' +
        "<span>" +
          "Tra\u00e7at verificat autom\u00e0ticament: " +
          "<strong>" +
            formatKm(totalKm) +
          "</strong> \u00b7 inici-final " +
          "<strong>" +
            formatKm(
              gapKm,
              gapKm < 1
                ? 2
                : 1
            ) +
          "</strong> \u00b7 " +
          "<strong>" +
            classification.label +
          "</strong>." +
        "</span>";
    }

    kpis.insertAdjacentElement(
      "afterend",
      audit
    );
  }

  function sampleRoutePoints() {
    if (!state.flatPoints.length) {
      return [];
    }

    const indexes = [
      0,
      Math.floor(
        (
          state.flatPoints.length -
          1
        ) /
        2
      ),
      state.flatPoints.length - 1
    ];

    const result = [];

    indexes.forEach(index => {
      const point =
        state.flatPoints[index];

      if (
        point &&
        !result.some(other =>
          haversineKm(
            other,
            point
          ) < .05
        )
      ) {
        result.push(point);
      }
    });

    return result;
  }

  async function openMeteo(point) {
    const params =
      new URLSearchParams({
        latitude:
          point.lat.toFixed(5),

        longitude:
          point.lng.toFixed(5),

        current:
          [
            "temperature_2m",
            "wind_speed_10m",
            "precipitation"
          ].join(","),

        hourly:
          [
            "temperature_2m",
            "precipitation_probability",
            "wind_speed_10m"
          ].join(","),

        daily:
          [
            "sunrise",
            "sunset"
          ].join(","),

        forecast_days:
          "2",

        timezone:
          "auto"
      });

    const response =
      await fetch(
        "https://api.open-meteo.com/v1/forecast?" +
        params.toString()
      );

    if (!response.ok) {
      throw new Error(
        "Open-Meteo " +
        response.status
      );
    }

    return response.json();
  }

  function average(values) {
    const valid =
      values.filter(
        Number.isFinite
      );

    if (!valid.length) {
      return null;
    }

    return (
      valid.reduce(
        (a, b) =>
          a + b,
        0
      ) /
      valid.length
    );
  }

  function weatherScore(temp, rain, wind) {
    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(rain) ||
      !Number.isFinite(wind)
    ) {
      return null;
    }

    let score = 100;

    score -=
      Math.max(
        0,
        rain
      ) *
      .55;

    score -=
      Math.max(
        0,
        wind - 12
      ) *
      1.6;

    score -=
      Math.max(
        0,
        10 - temp
      ) *
      2;

    score -=
      Math.max(
        0,
        temp - 29
      ) *
      2.2;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  }

  function daylightForDate(primary, date) {
    const days =
      primary?.daily?.time ||
      [];

    const key =
      date.toISOString()
        .slice(0, 10);

    const index =
      days.findIndex(
        day =>
          day === key
      );

    if (index < 0) {
      return {
        sunrise: null,
        sunset: null
      };
    }

    return {
      sunrise:
        new Date(
          primary.daily
            .sunrise[index]
        ),

      sunset:
        new Date(
          primary.daily
            .sunset[index]
        )
    };
  }

  function practicalDaylight(row, primary) {
    const light =
      daylightForDate(
        primary,
        row.time
      );

    const date =
      row.time;

    const localStart =
      new Date(date);

    localStart.setHours(
      7,
      0,
      0,
      0
    );

    const localEnd =
      new Date(date);

    localEnd.setHours(
      21,
      0,
      0,
      0
    );

    let start =
      localStart;

    let end =
      localEnd;

    if (light.sunrise) {
      const sunriseSafe =
        new Date(
          light.sunrise
            .getTime() +
          30 *
          60 *
          1000
        );

      if (
        sunriseSafe >
        start
      ) {
        start =
          sunriseSafe;
      }
    }

    if (light.sunset) {
      const sunsetSafe =
        new Date(
          light.sunset
            .getTime() -
          30 *
          60 *
          1000
        );

      if (
        sunsetSafe <
        end
      ) {
        end =
          sunsetSafe;
      }
    }

    return (
      date >= start &&
      date <= end
    );
  }

  function bestWindow(rows, primary) {
    const future =
      rows
        .filter(row =>
          row.time.getTime() >=
          Date.now() -
          30 *
          60 *
          1000
        )
        .slice(
          0,
          32
        );

    let best = null;

    for (
      let i = 0;
      i <=
      future.length - 3;
      i++
    ) {
      const block =
        future.slice(
          i,
          i + 3
        );

      if (
        !block.every(row =>
          practicalDaylight(
            row,
            primary
          )
        )
      ) {
        continue;
      }

      const score =
        average(
          block.map(row =>
            weatherScore(
              row.temp,
              row.rain,
              row.wind
            )
          )
        );

      if (
        Number.isFinite(score) &&
        (
          !best ||
          score >
          best.score
        )
      ) {
        best = {
          score,
          start:
            block[0].time,
          end:
            block[
              block.length - 1
            ].time
        };
      }
    }

    return best;
  }

  function aggregateWeather(dataSets) {
    const primary =
      dataSets[0];

    const currentTemps =
      dataSets.map(data =>
        Number(
          data.current
            ?.temperature_2m
        )
      );

    const currentWinds =
      dataSets.map(data =>
        Number(
          data.current
            ?.wind_speed_10m
        )
      );

    const hourlyRows = [];

    if (
      primary?.hourly?.time
    ) {
      primary.hourly.time
        .forEach(
          (
            time,
            index
          ) => {
            hourlyRows.push({
              time:
                new Date(time),

              temp:
                average(
                  dataSets.map(
                    data =>
                      Number(
                        data.hourly
                          ?.temperature_2m
                          ?.[index]
                      )
                  )
                ),

              rain:
                average(
                  dataSets.map(
                    data =>
                      Number(
                        data.hourly
                          ?.precipitation_probability
                          ?.[index]
                      )
                  )
                ),

              wind:
                average(
                  dataSets.map(
                    data =>
                      Number(
                        data.hourly
                          ?.wind_speed_10m
                          ?.[index]
                      )
                  )
                )
            });
          }
        );
    }

    const nowIndex =
      hourlyRows.findIndex(
        row =>
          row.time.getTime() >=
          Date.now()
      );

    const nextRows =
      hourlyRows.slice(
        Math.max(
          0,
          nowIndex
        ),
        Math.max(
          0,
          nowIndex
        ) +
        6
      );

    const rains =
      nextRows
        .map(row =>
          Number(row.rain)
        )
        .filter(
          Number.isFinite
        );

    return {
      temp:
        average(
          currentTemps
        ),

      wind:
        average(
          currentWinds
        ),

      rain:
        rains.length
          ? Math.max(...rains)
          : 0,

      best:
        bestWindow(
          hourlyRows,
          primary
        )
    };
  }

  function weatherLabel(score) {
    if (!Number.isFinite(score)) {
      return {
        title:
          "Previsi\u00f3 disponible",
        text:
          "Consulta el detall abans de sortir."
      };
    }

    if (score >= 90) {
      return {
        title:
          "Excel\u00b7lent per pedalar",
        text:
          "Condicions molt favorables per a aquesta ruta."
      };
    }

    if (score >= 75) {
      return {
        title:
          "Molt bones condicions",
        text:
          "Bon moment per fer la ruta."
      };
    }

    if (score >= 60) {
      return {
        title:
          "Bones condicions",
        text:
          "Condicions correctes amb algun factor a vigilar."
      };
    }

    if (score >= 40) {
      return {
        title:
          "Condicions acceptables",
        text:
          "Revisa vent, pluja o temperatura abans de sortir."
      };
    }

    return {
      title:
        "Poc recomanable",
      text:
        "Valora ajornar la sortida o escollir una altra franja."
    };
  }

  function timeText(date) {
    return date
      .toLocaleTimeString(
        "ca-ES",
        {
          hour:
            "2-digit",
          minute:
            "2-digit"
        }
      );
  }

  function weatherCard() {
    return (
      Array.from(
        document.querySelectorAll(
          ".bp360-side-card"
        )
      )
        .find(card =>
          clean(
            card.querySelector(
              "h3"
            )?.textContent
          )
            .toLowerCase()
            .startsWith(
              "meteor"
            )
        ) ||
      null
    );
  }

  function renderWeather(weather) {
    const card =
      weatherCard();

    if (!card) {
      return;
    }

    const title =
      card.querySelector(
        ".bp360-section-title"
      );

    const link =
      card.querySelector(
        ".bp360-card-link"
      );

    Array.from(
      card.children
    )
      .forEach(child => {
        if (
          child !== title &&
          child !== link
        ) {
          child.remove();
        }
      });

    const score =
      weatherScore(
        weather.temp,
        weather.rain,
        weather.wind
      );

    const label =
      weatherLabel(score);

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "bp360-weather-v3";

    wrapper.innerHTML =
      '<div class="bp360-weather-v3-main">' +
        '<div class="bp360-weather-v3-stat">' +
          '<span class="bp360-weather-v3-stat-icon">\u2600</span>' +
          "<strong>" +
            (
              Number.isFinite(
                weather.temp
              )
                ? Math.round(
                    weather.temp
                  ) +
                  "\u00b0C"
                : "--"
            ) +
          "</strong>" +
          "<small>Temperatura</small>" +
        "</div>" +
        '<div class="bp360-weather-v3-stat">' +
          '<span class="bp360-weather-v3-stat-icon">\u2614</span>' +
          "<strong>" +
            Math.round(
              weather.rain ||
              0
            ) +
            "%"
          +
          "</strong>" +
          "<small>Pluja properes 6 h</small>" +
        "</div>" +
        '<div class="bp360-weather-v3-stat">' +
          '<span class="bp360-weather-v3-stat-icon">\u2192</span>' +
          "<strong>" +
            (
              Number.isFinite(
                weather.wind
              )
                ? Math.round(
                    weather.wind
                  ) +
                  " km/h"
                : "--"
            ) +
          "</strong>" +
          "<small>Vent mitj\u00e0</small>" +
        "</div>" +
      "</div>" +

      '<div class="bp360-weather-v3-score">' +
        '<div class="bp360-weather-v3-score-badge">' +
          "<strong>" +
            (
              Number.isFinite(score)
                ? score
                : "--"
            ) +
          "</strong>" +
          "<small>Weather Score</small>" +
        "</div>" +
        '<div class="bp360-weather-v3-score-copy">' +
          "<strong>" +
            label.title +
          "</strong>" +
          "<p>" +
            label.text +
          "</p>" +
        "</div>" +
      "</div>" +

      (
        weather.best
          ? (
              '<div class="bp360-weather-v3-window">' +
                '<span class="bp360-weather-v3-window-icon">\u2600</span>' +
                "<div>" +
                  "<strong>Millor hora per sortir</strong>" +
                  "<small>" +
                    timeText(
                      weather.best.start
                    ) +
                    " - " +
                    timeText(
                      weather.best.end
                    ) +
                    " \u00b7 amb llum natural" +
                  "</small>" +
                "</div>" +
              "</div>"
            )
          : ""
      ) +

      '<div class="bp360-weather-v3-source">' +
        "Open-Meteo \u00b7 mostreig a inici, mig i final del tra\u00e7at" +
      "</div>";

    card.insertBefore(
      wrapper,
      link
    );

    if (link) {
      link.textContent =
        "Analitzar meteorologia completa \u2192";
    }
  }

  async function renderWeatherFromRoute() {
    const points =
      sampleRoutePoints();

    if (!points.length) {
      return;
    }

    try {
      const dataSets =
        await Promise.all(
          points.map(
            openMeteo
          )
        );

      renderWeather(
        aggregateWeather(
          dataSets
        )
      );
    }
    catch (error) {
      console.warn(
        "[BiciPark] Weather v3 unavailable",
        error
      );
    }
  }

  async function boot() {
    state.routeId =
      getRouteId();

    state.route =
      ROUTES[
        state.routeId
      ];

    if (!state.route) {
      return;
    }

    const loaded =
      await loadGeometry();

    if (loaded) {
      /* Geometry audit handled by topology v4 */
      renderWeatherFromRoute();
    }

    console.info(
      "[BiciPark] Weather + geometry v3",
      {
        route:
          state.routeId,
        computedKm:
          state.computedKm,
        endpointGapKm:
          state.endpointGapKm
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