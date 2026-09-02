(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DETAIL_INTEGRATIONS_V2__) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_INTEGRATIONS_V2__ = true;

  const SOURCES =
    window.BiciParkRouteDetailIntegrationSourcesV2 ||
    {
      highlights: [],
      incidents: [],
      bikeBases: [],
      missions: []
    };

  const ROUTES =
    window.BiciParkRouteDetailData ||
    {};

  const state = {
    routeId: null,
    route: null,
    segments: [],
    flatPoints: []
  };

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
        geometry.coordinates.forEach(segment => segments.push(segment));
      }
      else if (geometry.type === "GeometryCollection") {
        geometry.geometries.forEach(addGeometry);
      }
    }

    if (data?.type === "FeatureCollection") {
      data.features.forEach(feature => addGeometry(feature.geometry));
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
          const lat = Number(node.getAttribute("lat"));
          const lng = Number(node.getAttribute("lon"));

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
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

              if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
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

  async function loadRouteGeometry() {
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
            segments = gpxCoordinates(text);
          }
          else if (ext === "kml") {
            segments = kmlCoordinates(text);
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
    const rad = deg => deg * Math.PI / 180;

    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);

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

  function distanceToRoute(point) {
    if (!point || !state.flatPoints.length) {
      return Infinity;
    }

    const step =
      Math.max(
        1,
        Math.floor(
          state.flatPoints.length /
          400
        )
      );

    let min = Infinity;

    for (let i = 0; i < state.flatPoints.length; i += step) {
      min =
        Math.min(
          min,
          haversineKm(
            point,
            state.flatPoints[i]
          )
        );
    }

    return min;
  }

  function nestedValue(obj, keys) {
    for (const key of keys) {
      if (
        obj &&
        obj[key] !== undefined &&
        obj[key] !== null
      ) {
        return obj[key];
      }
    }

    return null;
  }

  function coordinatesOf(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const latRaw =
      nestedValue(
        item,
        [
          "lat",
          "latitude"
        ]
      );

    const lngRaw =
      nestedValue(
        item,
        [
          "lng",
          "lon",
          "long",
          "longitude"
        ]
      );

    const lat =
      latRaw === null
        ? NaN
        : Number(latRaw);

    const lng =
      lngRaw === null
        ? NaN
        : Number(lngRaw);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    const geometry =
      item.geometry;

    if (
      geometry?.type === "Point" &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length >= 2
    ) {
      const glng = Number(geometry.coordinates[0]);
      const glat = Number(geometry.coordinates[1]);

      if (Number.isFinite(glat) && Number.isFinite(glng)) {
        return {
          lat: glat,
          lng: glng
        };
      }
    }

    for (const key of ["location", "position", "coordinates", "coord"]) {
      const value = item[key];

      if (Array.isArray(value) && value.length >= 2) {
        const a = Number(value[0]);
        const b = Number(value[1]);

        if (
          Number.isFinite(a) &&
          Number.isFinite(b) &&
          Math.abs(a) <= 180 &&
          Math.abs(b) <= 90
        ) {
          return {
            lng: a,
            lat: b
          };
        }
      }

      if (value && typeof value === "object") {
        const nested = coordinatesOf(value);

        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  function titleOf(item) {
    return clean(
      nestedValue(
        item,
        [
          "title",
          "name",
          "nom",
          "label",
          "headline"
        ]
      ) ||
      "Element"
    );
  }

  function typeOf(item) {
    return clean(
      nestedValue(
        item,
        [
          "type",
          "category",
          "categoria",
          "kind",
          "status",
          "severity",
          "level"
        ]
      ) ||
      ""
    );
  }

  function routeTextOf(item) {
    return clean(
      nestedValue(
        item,
        [
          "route",
          "routeId",
          "route_id",
          "ruta",
          "rutaId",
          "routeName",
          "route_name"
        ]
      ) ||
      ""
    );
  }

  function recursivelyCollect(value, output, depth = 0) {
    if (depth > 9 || value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item =>
        recursivelyCollect(
          item,
          output,
          depth + 1
        )
      );
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const point =
      coordinatesOf(value);

    const routeText =
      routeTextOf(value);

    if (point || routeText) {
      output.push({
        raw: value,
        title: titleOf(value),
        type: typeOf(value),
        routeText,
        point
      });
    }

    Object.keys(value)
      .forEach(key => {
        if (
          key === "geometry" ||
          key === "location" ||
          key === "position"
        ) {
          return;
        }

        recursivelyCollect(
          value[key],
          output,
          depth + 1
        );
      });
  }

  async function loadJsonSources(urls) {
    const results = [];

    for (const url of urls || []) {
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

        const data =
          await response.json();

        const items = [];

        recursivelyCollect(
          data,
          items
        );

        items.forEach(item => {
          item.sourceUrl = url;
        });

        results.push(
          ...items
        );
      }
      catch (_) {}
    }

    return results;
  }

  function directRouteMatch(item) {
    const routeText =
      norm(
        item.routeText
      );

    if (!routeText) {
      return false;
    }

    const routeIdNorm =
      norm(
        state.routeId
      );

    const routeNameNorm =
      norm(
        state.route.name
      );

    return (
      routeText === routeIdNorm ||
      routeText.includes(routeIdNorm) ||
      routeText.includes(routeNameNorm) ||
      routeNameNorm.includes(routeText)
    );
  }

  function rankNearby(items, radiusKm) {
    return items
      .map(item => {
        const direct =
          directRouteMatch(item);

        const distance =
          item.point
            ? distanceToRoute(item.point)
            : Infinity;

        return {
          ...item,
          direct,
          distance
        };
      })
      .filter(item =>
        item.direct ||
        item.distance <= radiusKm
      )
      .sort((a, b) => {
        if (a.direct !== b.direct) {
          return a.direct ? -1 : 1;
        }

        return a.distance - b.distance;
      });
  }

  function cardByHeading(text) {
    const wanted =
      norm(text);

    return (
      Array.from(
        document.querySelectorAll(
          ".bp360-side-card, .bp360-info-card"
        )
      )
        .find(card =>
          norm(
            card.querySelector("h3")?.textContent
          ) === wanted
        ) ||
      null
    );
  }

  function formatDistance(km) {
    if (!Number.isFinite(km)) {
      return "";
    }

    if (km < 1) {
      return (
        Math.round(km * 1000) +
        " m"
      );
    }

    return (
      km.toFixed(1)
        .replace(".", ",") +
      " km"
    );
  }

  function translateType(value) {
    const text =
      norm(value);

    const rules = [
      [/closed|tancat|tancada/, "Tram tancat"],
      [/works|roadwork|obres|obra/, "Obres"],
      [/warning|precau|caution/, "Precauci\u00f3"],
      [/danger|greu|critical/, "Incid\u00e8ncia greu"],
      [/open|obert/, "Obert"],
      [/food|caf[eÃ¨]|restaurant/, "Caf\u00e8 / restauraci\u00f3"],
      [/view|mirador|vista/, "Mirador"],
      [/water|font/, "Font"],
      [/repair|taller/, "Taller"],
      [/hotel|camping|accommodation|allotjament/, "Allotjament ciclista"]
    ];

    for (const [regex, label] of rules) {
      if (regex.test(text)) {
        return label;
      }
    }

    return clean(value) || "";
  }

  function severityClass(type) {
    const value =
      norm(type);

    if (/tanc|closed|greu|danger|alta|critical/.test(value)) {
      return "is-danger";
    }

    if (/precau|warning|obra|fang|medium|mitjana/.test(value)) {
      return "is-warning";
    }

    return "is-ok";
  }

  function removeChildrenExcept(card, keepNodes) {
    Array.from(card.children)
      .forEach(child => {
        if (!keepNodes.includes(child)) {
          child.remove();
        }
      });
  }

  function renderHighlights(items) {
    const card =
      cardByHeading(
        "Highlights"
      );

    if (!card) {
      return;
    }

    const link =
      card.querySelector(
        ".bp360-card-link"
      );

    const title =
      card.querySelector("h3");

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    const badge =
      document.createElement(
        "div"
      );

    badge.className =
      "bp360-data-badge";

    badge.textContent =
      "Dades geolocalitzades";

    if (title) {
      title.insertAdjacentElement(
        "afterend",
        badge
      );
    }

    if (!items.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "bp360-live-empty is-neutral";

      empty.textContent =
        "No hi ha Highlights geolocalitzats prou a prop del tra\u00e7at.";

      card.insertBefore(
        empty,
        link
      );

      return;
    }

    const list =
      document.createElement("ul");

    list.className =
      "bp360-live-list";

    items
      .slice(0, 4)
      .forEach(item => {
        const li =
          document.createElement("li");

        li.innerHTML =
          '<span class="bp360-live-dot"></span>' +
          "<div>" +
            "<strong>" +
              item.title +
            "</strong>" +
            "<small>" +
              (
                translateType(item.type) ||
                "Highlight"
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp360-live-distance">' +
            (
              item.direct
                ? "ruta"
                : formatDistance(item.distance)
            ) +
          "</span>";

        list.appendChild(li);
      });

    card.insertBefore(
      list,
      link
    );
  }

  function renderIncidents(items) {
    const card =
      cardByHeading(
        "Incidencies"
      );

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

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    if (!items.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "bp360-live-empty";

      empty.innerHTML =
        "<strong>\u2713 Cap incid\u00e8ncia detectada sobre aquesta ruta</strong><br>" +
        "Segons les dades locals disponibles.";

      card.insertBefore(
        empty,
        link
      );

      return;
    }

    const list =
      document.createElement("ul");

    list.className =
      "bp360-live-list";

    items
      .slice(0, 4)
      .forEach(item => {
        const li =
          document.createElement("li");

        li.innerHTML =
          '<span class="bp360-live-dot ' +
            severityClass(item.type) +
          '"></span>' +
          "<div>" +
            "<strong>" +
              item.title +
            "</strong>" +
            "<small>" +
              (
                translateType(item.type) ||
                "Av\u00eds de ruta"
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp360-live-distance">' +
            (
              item.direct
                ? "ruta"
                : formatDistance(item.distance)
            ) +
          "</span>";

        list.appendChild(li);
      });

    card.insertBefore(
      list,
      link
    );
  }

  function sampleRoutePoints() {
    if (!state.flatPoints.length) {
      return [];
    }

    const indexes = [
      0,
      Math.floor((state.flatPoints.length - 1) / 2),
      state.flatPoints.length - 1
    ];

    const result = [];

    indexes.forEach(index => {
      const point =
        state.flatPoints[index];

      if (
        point &&
        !result.some(other =>
          haversineKm(other, point) < .05
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
      values.filter(Number.isFinite);

    if (!valid.length) {
      return null;
    }

    return (
      valid.reduce((a, b) => a + b, 0) /
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

    score -= Math.max(0, rain) * .55;
    score -= Math.max(0, wind - 12) * 1.6;
    score -= Math.max(0, 10 - temp) * 2;
    score -= Math.max(0, temp - 29) * 2.2;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  }

  function withinDaylight(date, sunrise, sunset) {
    if (!date || !sunrise || !sunset) {
      const hour = date?.getHours?.();

      return (
        Number.isFinite(hour) &&
        hour >= 7 &&
        hour <= 20
      );
    }

    return (
      date.getTime() >= sunrise.getTime() &&
      date.getTime() <= sunset.getTime()
    );
  }

  function daylightForDate(primary, date) {
    const dates =
      primary?.daily?.time ||
      [];

    const index =
      dates.findIndex(day =>
        day ===
        date.toISOString().slice(0,10)
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
          primary.daily.sunrise[index]
        ),

      sunset:
        new Date(
          primary.daily.sunset[index]
        )
    };
  }

  function bestWindow(weatherRows, primary) {
    if (!weatherRows.length) {
      return null;
    }

    const future =
      weatherRows
        .filter(row =>
          row.time.getTime() >=
          Date.now() -
          30 * 60 * 1000
        )
        .slice(0, 30);

    let best = null;

    for (let i = 0; i <= future.length - 3; i++) {
      const block =
        future.slice(i, i + 3);

      const allDaylight =
        block.every(row => {
          const light =
            daylightForDate(
              primary,
              row.time
            );

          return withinDaylight(
            row.time,
            light.sunrise,
            light.sunset
          );
        });

      if (!allDaylight) {
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
          score > best.score
        )
      ) {
        best = {
          score,
          start: block[0].time,
          end: block[block.length - 1].time
        };
      }
    }

    return best;
  }

  function aggregateWeather(dataSets) {
    const currentTemps =
      dataSets.map(data =>
        Number(
          data.current?.temperature_2m
        )
      );

    const currentWinds =
      dataSets.map(data =>
        Number(
          data.current?.wind_speed_10m
        )
      );

    const primary =
      dataSets[0];

    const hourlyRows = [];

    if (primary?.hourly?.time) {
      primary.hourly.time.forEach((time, index) => {
        const temps =
          dataSets.map(data =>
            Number(
              data.hourly?.temperature_2m?.[index]
            )
          );

        const rains =
          dataSets.map(data =>
            Number(
              data.hourly?.precipitation_probability?.[index]
            )
          );

        const winds =
          dataSets.map(data =>
            Number(
              data.hourly?.wind_speed_10m?.[index]
            )
          );

        hourlyRows.push({
          time: new Date(time),
          temp: average(temps),
          rain: average(rains),
          wind: average(winds)
        });
      });
    }

    const nowIndex =
      hourlyRows.findIndex(row =>
        row.time.getTime() >= Date.now()
      );

    const nextRows =
      hourlyRows.slice(
        Math.max(0, nowIndex),
        Math.max(0, nowIndex) + 6
      );

    const validRain =
      nextRows
        .map(row => Number(row.rain))
        .filter(Number.isFinite);

    const rainProbability =
      validRain.length
        ? Math.max(...validRain)
        : 0;

    return {
      temp:
        average(currentTemps),

      wind:
        average(currentWinds),

      rainProbability,

      best:
        bestWindow(
          hourlyRows,
          primary
        )
    };
  }

  function timeText(date) {
    return date.toLocaleTimeString(
      "ca-ES",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function renderWeather(weather) {
    const card =
      cardByHeading(
        "Meteorologia"
      );

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

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    const summary =
      document.createElement("div");

    summary.className =
      "bp360-live-summary";

    const score =
      weatherScore(
        weather.temp,
        weather.rainProbability,
        weather.wind
      );

    summary.innerHTML =
      '<div class="bp360-live-stat">' +
        "<strong>" +
          (
            Number.isFinite(weather.temp)
              ? Math.round(weather.temp) + "\u00b0C"
              : "--"
          ) +
        "</strong>" +
        "<small>Temperatura</small>" +
      "</div>" +
      '<div class="bp360-live-stat">' +
        "<strong>" +
          Math.round(weather.rainProbability || 0) +
          "%"
        +
        "</strong>" +
        "<small>Pluja (properes 6 h)</small>" +
      "</div>" +
      '<div class="bp360-live-stat">' +
        "<strong>" +
          (
            Number.isFinite(weather.wind)
              ? Math.round(weather.wind) + " km/h"
              : "--"
          ) +
        "</strong>" +
        "<small>Vent</small>" +
      "</div>";

    card.insertBefore(
      summary,
      link
    );

    if (Number.isFinite(score)) {
      const scoreEl =
        document.createElement("div");

      scoreEl.className =
        "bp360-weather-score";

      scoreEl.textContent =
        "Weather Score " +
        score +
        "/100";

      card.insertBefore(
        scoreEl,
        link
      );
    }

    if (weather.best) {
      const best =
        document.createElement("div");

      best.className =
        "bp360-best-window";

      best.textContent =
        "Millor finestra amb llum: " +
        timeText(weather.best.start) +
        " - " +
        timeText(weather.best.end);

      card.insertBefore(
        best,
        link
      );
    }

    const source =
      document.createElement("div");

    source.className =
      "bp360-live-source";

    source.textContent =
      "Open-Meteo \u00b7 inici, mig i final del tra\u00e7at \u00b7 finestra limitada a hores de llum";

    card.insertBefore(
      source,
      link
    );
  }

  async function integrateWeather() {
    const points =
      sampleRoutePoints();

    if (!points.length) {
      return;
    }

    try {
      const dataSets =
        await Promise.all(
          points.map(openMeteo)
        );

      renderWeather(
        aggregateWeather(
          dataSets
        )
      );
    }
    catch (error) {
      console.warn(
        "[BiciPark] Weather v2 unavailable",
        error
      );
    }
  }

  function renderBikeBases(items) {
    const card =
      cardByHeading(
        "Bike Bases properes"
      );

    if (!card) {
      return;
    }

    const title =
      card.querySelector("h3");

    const link =
      card.querySelector(
        ".bp360-card-link"
      );

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    if (!items.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "bp360-live-empty is-neutral";

      empty.textContent =
        "No hi ha Bike Bases geolocalitzades prou a prop d'aquesta ruta.";

      card.insertBefore(
        empty,
        link
      );

      return;
    }

    const list =
      document.createElement("ul");

    list.className =
      "bp360-nearby-list";

    items
      .slice(0, 3)
      .forEach(item => {
        const li =
          document.createElement("li");

        li.innerHTML =
          '<span class="bp360-nearby-icon">\u2302</span>' +
          "<div>" +
            "<strong>" +
              item.title +
            "</strong>" +
            "<small>" +
              (
                translateType(item.type) ||
                "Bike Base"
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp360-live-distance">' +
            (
              item.direct
                ? "ruta"
                : formatDistance(item.distance)
            ) +
          "</span>";

        list.appendChild(li);
      });

    card.insertBefore(
      list,
      link
    );
  }

  function popularityFromLocalStorage() {
    const routeNeedles = [
      norm(state.routeId),
      norm(state.route.name)
    ];

    let score = 0;
    let interactions = 0;
    let matches = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key =
        localStorage.key(i);

      const value =
        localStorage.getItem(key);

      const haystack =
        norm(
          key +
          " " +
          value
        );

      if (
        !routeNeedles.some(needle =>
          needle &&
          haystack.includes(needle)
        )
      ) {
        continue;
      }

      matches++;

      const numbers =
        String(value || "")
          .match(/\b\d+(?:\.\d+)?\b/g) ||
        [];

      const numeric =
        numbers
          .map(Number)
          .filter(Number.isFinite);

      const localSum =
        numeric
          .slice(0, 8)
          .reduce(
            (sum, n) =>
              sum +
              Math.min(
                n,
                50
              ),
            0
          );

      interactions +=
        Math.max(
          1,
          numeric.length
        );

      score +=
        Math.max(
          1,
          localSum
        );
    }

    /*
     * Fallback: route open itself counts as minimum local interest.
     */
    if (!matches) {
      const recentText =
        Array.from(
          { length: localStorage.length },
          (_, i) => {
            const key =
              localStorage.key(i);

            return (
              key +
              " " +
              (
                localStorage.getItem(key) ||
                ""
              )
            );
          }
        )
          .join(" ");

      const normalizedRecent =
        norm(recentText);

      if (
        routeNeedles.some(needle =>
          needle &&
          normalizedRecent.includes(needle)
        )
      ) {
        score = 1;
        interactions = 1;
      }
    }

    return {
      score:
        Math.min(
          100,
          Math.round(
            20 +
            Math.log2(
              Math.max(
                1,
                score + interactions
              )
            ) *
            14
          )
        ),

      interactions
    };
  }

  function renderPopularity(data) {
    const card =
      cardByHeading(
        "Popularitat"
      );

    if (!card) {
      return;
    }

    const title =
      card.querySelector("h3");

    const link =
      card.querySelector(
        ".bp360-card-link"
      );

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    const layout =
      document.createElement("div");

    layout.className =
      "bp360-popularity-layout";

    const label =
      data.score >= 75
        ? "Alta"
        : (
            data.score >= 50
              ? "Mitjana"
              : "Emergent"
          );

    layout.innerHTML =
      '<div class="bp360-popularity-score">' +
        "<strong>" +
          data.score +
        "</strong>" +
        "<small>/100 local</small>" +
      "</div>" +
      '<div class="bp360-popularity-copy">' +
        "<strong>" +
          label +
        "</strong><br>" +
        (
          data.interactions
            ? (
                data.interactions +
                " senyal(s) d'inter\u00e8s guardats en aquest navegador."
              )
            : "Encara hi ha poca activitat local registrada."
        ) +
      "</div>";

    card.insertBefore(
      layout,
      link
    );
  }

  function missionPoints(item) {
    const raw =
      item.raw ||
      {};

    const value =
      nestedValue(
        raw,
        [
          "points",
          "punts",
          "reward",
          "score",
          "xp"
        ]
      );

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function renderMissions(items) {
    const card =
      cardByHeading(
        "Missions disponibles"
      );

    if (!card) {
      return;
    }

    const title =
      card.querySelector("h3");

    const link =
      card.querySelector(
        ".bp360-card-link"
      );

    removeChildrenExcept(
      card,
      [title, link].filter(Boolean)
    );

    if (!items.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "bp360-live-empty is-neutral";

      empty.textContent =
        "No hi ha cap missi\u00f3 vinculada o prou propera a aquesta ruta.";

      card.insertBefore(
        empty,
        link
      );

      return;
    }

    const container =
      document.createElement("div");

    items
      .slice(0, 3)
      .forEach(item => {
        const row =
          document.createElement("div");

        row.className =
          "bp360-mission-row";

        const points =
          missionPoints(item);

        row.innerHTML =
          '<span class="bp360-mission-icon">\u2605</span>' +
          "<div>" +
            "<strong>" +
              item.title +
            "</strong>" +
            "<small>" +
              (
                points
                  ? points + " punts"
                  : (
                      translateType(item.type) ||
                      "Missi\u00f3 BiciPark"
                    )
              ) +
            "</small>" +
          "</div>" +
          '<span class="bp360-live-distance">' +
            (
              item.direct
                ? "ruta"
                : formatDistance(item.distance)
            ) +
          "</span>";

        container.appendChild(row);
      });

    card.insertBefore(
      container,
      link
    );
  }

  function cleanNullBadges() {
    document.querySelectorAll(
      ".bp360-route-card-tag"
    )
      .forEach(tag => {
        const text =
          norm(
            tag.textContent
          );

        if (
          /\bnull\b|\bundefined\b|\bnan\b/.test(text)
        ) {
          tag.remove();
        }
      });
  }

  async function boot() {
    state.routeId =
      getRouteId();

    state.route =
      ROUTES[state.routeId];

    if (!state.route) {
      return;
    }

    cleanNullBadges();

    await loadRouteGeometry();

    const [
      rawHighlights,
      rawIncidents,
      rawBikeBases,
      rawMissions
    ] =
      await Promise.all([
        loadJsonSources(
          SOURCES.highlights
        ),
        loadJsonSources(
          SOURCES.incidents
        ),
        loadJsonSources(
          SOURCES.bikeBases
        ),
        loadJsonSources(
          SOURCES.missions
        )
      ]);

    const highlights =
      rankNearby(
        rawHighlights,
        2.5
      );

    const incidents =
      rankNearby(
        rawIncidents,
        1.5
      );

    const bikeBases =
      rankNearby(
        rawBikeBases,
        15
      );

    const missions =
      rankNearby(
        rawMissions,
        2
      );

    renderHighlights(
      highlights
    );

    renderIncidents(
      incidents
    );

    renderBikeBases(
      bikeBases
    );

    renderPopularity(
      popularityFromLocalStorage()
    );

    renderMissions(
      missions
    );

    /* Weather handled by route-detail-weather-geometry-v3.js */
    setTimeout(
      cleanNullBadges,
      300
    );

    console.info(
      "[BiciPark] Route Detail integrations v2",
      {
        highlights:
          highlights.length,
        incidents:
          incidents.length,
        bikeBases:
          bikeBases.length,
        missions:
          missions.length
      }
    );
  }

  if (
    document.readyState === "loading"
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