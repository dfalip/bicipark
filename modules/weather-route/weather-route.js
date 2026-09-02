(() => {
  "use strict";

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /weather-route\.js/.test(script.src)
      );

  const baseUrl =
    new URL("./", selfScript.src);

  const state = {
    map: null,
    routeLayer: null,
    weatherLayer: null,
    routes: [],
    route: null,
    weatherByPoint: [],
    selectedDate: "",
    selectedHour: 9
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, digits = 0) {
    const factor =
      Math.pow(10, digits);

    return Math.round(value * factor) / factor;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function todayIso() {
    const now =
      new Date();

    return (
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1) +
      "-" +
      pad(now.getDate())
    );
  }

  function status(message, mode = "") {
    const root =
      document.getElementById(
        "weatherStatus"
      );

    root.textContent =
      message;

    root.className =
      "wr-status" +
      (
        mode
          ? " is-" + mode
          : ""
      );
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

  async function loadRoutes() {
    state.routes =
      await fetchJson(
        new URL(
          "./data/weather-routes.json",
          baseUrl
        ).href
      );
  }

  function initMap() {
    state.map =
      L.map(
        "weatherRouteMap"
      ).setView(
        [41.40, 2.17],
        11
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    ).addTo(
      state.map
    );

    state.routeLayer =
      L.layerGroup().addTo(
        state.map
      );

    state.weatherLayer =
      L.layerGroup().addTo(
        state.map
      );
  }

  function renderRouteSelect() {
    const select =
      document.getElementById(
        "routeSelect"
      );

    select.innerHTML =
      state.routes
        .map(route =>
          '<option value="' +
            escapeHtml(route.id) +
            '">' +
            escapeHtml(route.name) +
          "</option>"
        )
        .join("");

    state.route =
      state.routes[0] ||
      null;
  }

  function drawRoute() {
    state.routeLayer.clearLayers();

    if (!state.route) {
      return;
    }

    const points =
      state.route.points;

    const polyline =
      L.polyline(
        points,
        {
          weight: 6,
          opacity: .88,
          className:
            "wr-route-line"
        }
      ).addTo(
        state.routeLayer
      );

    state.map.fitBounds(
      polyline.getBounds(),
      {
        padding: [30, 30]
      }
    );

    points.forEach(
      (point, index) => {
        L.circleMarker(
          point,
          {
            radius:
              index === 0 ||
              index === points.length - 1
                ? 6
                : 4,
            weight: 3,
            color: "#ffffff",
            fillColor:
              index === 0
                ? "#117446"
                : (
                    index === points.length - 1
                      ? "#bb4141"
                      : "#3577b9"
                  ),
            fillOpacity: 1
          }
        ).addTo(
          state.routeLayer
        );
      }
    );
  }

  function bearingDegrees(a, b) {
    const lat1 =
      a[0] * Math.PI / 180;

    const lat2 =
      b[0] * Math.PI / 180;

    const deltaLng =
      (b[1] - a[1]) *
      Math.PI / 180;

    const y =
      Math.sin(deltaLng) *
      Math.cos(lat2);

    const x =
      Math.cos(lat1) *
      Math.sin(lat2) -
      Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(deltaLng);

    return (
      Math.atan2(y, x) *
      180 / Math.PI +
      360
    ) % 360;
  }

  function angleDifference(a, b) {
    return (
      ((a - b + 540) % 360) -
      180
    );
  }

  function windEffect(
    routeBearing,
    windFrom
  ) {
    const windToward =
      (windFrom + 180) % 360;

    const diff =
      angleDifference(
        windToward,
        routeBearing
      );

    const component =
      Math.cos(
        diff * Math.PI / 180
      );

    if (component > 0.35) {
      return {
        key: "tail",
        label: "Vent favorable"
      };
    }

    if (component < -0.35) {
      return {
        key: "head",
        label: "Vent de cara"
      };
    }

    return {
      key: "cross",
      label: "Vent lateral"
    };
  }

  function weatherScore(
    temp,
    rain,
    wind
  ) {
    let score = 100;

    const temperature =
      Number(temp);

    const precipitation =
      Number(rain);

    const windSpeed =
      Number(wind);

    if (temperature < 8) {
      score -=
        (8 - temperature) * 3;
    }

    if (temperature > 30) {
      score -=
        (temperature - 30) * 4;
    }

    if (
      temperature >= 12 &&
      temperature <= 25
    ) {
      score += 3;
    }

    score -=
      precipitation * .35;

    if (windSpeed > 12) {
      score -=
        (windSpeed - 12) * 1.7;
    }

    if (windSpeed > 30) {
      score -= 8;
    }

    return clamp(
      Math.round(score),
      0,
      100
    );
  }

  function selectedDateTimeKey() {
    return (
      state.selectedDate +
      "T" +
      pad(state.selectedHour) +
      ":00"
    );
  }

  function findHourlyIndex(data) {
    const key =
      selectedDateTimeKey();

    return data.hourly.time
      .findIndex(time =>
        time.startsWith(key)
      );
  }

  async function fetchPointWeather(point) {
    const params =
      new URLSearchParams({
        latitude:
          String(point[0]),
        longitude:
          String(point[1]),
        hourly:
          [
            "temperature_2m",
            "precipitation_probability",
            "wind_speed_10m",
            "wind_direction_10m"
          ].join(","),
        timezone:
          "Europe/Madrid",
        forecast_days:
          "7"
      });

    return fetchJson(
      "https://api.open-meteo.com/v1/forecast?" +
      params.toString()
    );
  }

  async function analyzeWeather() {
    if (!state.route) {
      return;
    }

    state.selectedDate =
      document.getElementById(
        "dateInput"
      ).value;

    state.selectedHour =
      Number(
        document.getElementById(
          "hourSelect"
        ).value
      );

    status(
      "Consultant Open-Meteo per diversos punts de la ruta...",
      "loading"
    );

    try {
      state.weatherByPoint =
        await Promise.all(
          state.route.points.map(
            fetchPointWeather
          )
        );

      const index =
        findHourlyIndex(
          state.weatherByPoint[0]
        );

      if (index < 0) {
        throw new Error(
          "La data/hora seleccionada no esta disponible en la previsio."
        );
      }

      renderAnalysis(index);

      status(
        "Previsio actualitzada. Les dades meteorologiques provenen d'Open-Meteo."
      );

      window.BiciParkCore
        ?.emit(
          "weather-route:updated",
          {
            route:
              state.route,
            date:
              state.selectedDate,
            hour:
              state.selectedHour
          }
        );
    } catch (error) {
      console.error(
        "[Weather Route]",
        error
      );

      status(
        "No s'ha pogut consultar la meteorologia. Comprova la connexio a Internet i torna-ho a provar.",
        "error"
      );
    }
  }

  function pointWeather(
    pointIndex,
    hourlyIndex
  ) {
    const hourly =
      state.weatherByPoint[
        pointIndex
      ].hourly;

    return {
      temp:
        Number(
          hourly.temperature_2m[
            hourlyIndex
          ]
        ),
      rain:
        Number(
          hourly.precipitation_probability[
            hourlyIndex
          ]
        ),
      wind:
        Number(
          hourly.wind_speed_10m[
            hourlyIndex
          ]
        ),
      direction:
        Number(
          hourly.wind_direction_10m[
            hourlyIndex
          ]
        )
    };
  }

  function renderAnalysis(hourlyIndex) {
    const values =
      state.route.points
        .map((_, index) =>
          pointWeather(
            index,
            hourlyIndex
          )
        );

    const average =
      key =>
        values.reduce(
          (sum, item) =>
            sum + item[key],
          0
        ) / values.length;

    const avgTemp =
      average("temp");

    const avgRain =
      average("rain");

    const avgWind =
      average("wind");

    const maxWind =
      Math.max(
        ...values.map(
          item => item.wind
        )
      );

    const score =
      weatherScore(
        avgTemp,
        avgRain,
        avgWind
      );

    renderSummary(
      avgTemp,
      avgRain,
      avgWind,
      maxWind,
      score
    );

    renderSegments(
      values
    );

    renderBestHours();

    renderWeatherMarkers(
      values
    );
  }

  function renderSummary(
    temp,
    rain,
    wind,
    maxWind,
    score
  ) {
    document.getElementById(
      "summaryRouteName"
    ).textContent =
      state.route.name;

    document.getElementById(
      "routeMeta"
    ).innerHTML =
      "<span>" +
        state.route.distanceKm +
        " km</span>" +
      "<span>+" +
        state.route.elevationM +
        " m</span>" +
      "<span>" +
        escapeHtml(
          state.route.difficulty
        ) +
        "</span>" +
      "<span>" +
        escapeHtml(
          state.route.mode
        ) +
        "</span>";

    document.getElementById(
      "tempValue"
    ).textContent =
      round(temp, 1)
        .toString()
        .replace(".", ",") +
      " C";

    document.getElementById(
      "rainValue"
    ).textContent =
      Math.round(rain) +
      " %";

    document.getElementById(
      "windValue"
    ).textContent =
      Math.round(wind) +
      " km/h";

    document.getElementById(
      "windMax"
    ).textContent =
      "max. " +
      Math.round(maxWind) +
      " km/h";

    document.getElementById(
      "rideScore"
    ).textContent =
      score;

    let label =
      "Condicions millorables";

    if (score >= 85) {
      label =
        "Excel.lent moment per pedalar";
    } else if (score >= 70) {
      label =
        "Bones condicions";
    } else if (score >= 50) {
      label =
        "Condicions acceptables";
    }

    document.getElementById(
      "rideScoreLabel"
    ).textContent =
      label;
  }

  function renderSegments(values) {
    const root =
      document.getElementById(
        "windSegments"
      );

    const segments =
      [];

    const totalDistance =
      Number(
        state.route.distanceKm
      );

    const segmentDistance =
      totalDistance /
      (
        state.route.points.length - 1
      );

    for (
      let i = 0;
      i < state.route.points.length - 1;
      i++
    ) {
      const bearing =
        bearingDegrees(
          state.route.points[i],
          state.route.points[i + 1]
        );

      const averageWindFrom =
        (
          values[i].direction +
          values[i + 1].direction
        ) / 2;

      const averageWind =
        (
          values[i].wind +
          values[i + 1].wind
        ) / 2;

      const effect =
        windEffect(
          bearing,
          averageWindFrom
        );

      const startKm =
        Math.round(
          i * segmentDistance
        );

      const endKm =
        Math.round(
          (i + 1) *
          segmentDistance
        );

      segments.push({
        startKm,
        endKm,
        wind:
          averageWind,
        effect
      });
    }

    root.innerHTML =
      segments
        .map(segment =>
          '<div class="wr-segment">' +
            '<span class="wr-segment-km">' +
              "Km " +
              segment.startKm +
              "-" +
              segment.endKm +
            "</span>" +
            '<span class="wr-segment-copy">' +
              "<strong>" +
                segment.effect.label +
              "</strong>" +
              "<small>" +
                Math.round(
                  segment.wind
                ) +
                " km/h" +
              "</small>" +
            "</span>" +
            '<span class="wr-wind-badge wr-' +
              segment.effect.key +
              '">' +
              (
                segment.effect.key === "tail"
                  ? "\u2192 Favorable"
                  : (
                      segment.effect.key === "head"
                        ? "\u2190 De cara"
                        : "\u2197 Lateral"
                    )
              ) +
            "</span>" +
          "</div>"
        )
        .join("");
  }

  function renderBestHours() {
    const midpointIndex =
      Math.floor(
        state.weatherByPoint.length /
        2
      );

    const data =
      state.weatherByPoint[
        midpointIndex
      ].hourly;

    const candidates =
      [];

    for (
      let i = 0;
      i < data.time.length;
      i++
    ) {
      const time =
        data.time[i];

      if (
        !time.startsWith(
          state.selectedDate + "T"
        )
      ) {
        continue;
      }

      const hour =
        Number(
          time.slice(11, 13)
        );

      if (
        hour < 6 ||
        hour > 20
      ) {
        continue;
      }

      const score =
        weatherScore(
          data.temperature_2m[i],
          data.precipitation_probability[i],
          data.wind_speed_10m[i]
        );

      candidates.push({
        hour,
        score,
        temp:
          Number(
            data.temperature_2m[i]
          ),
        rain:
          Number(
            data.precipitation_probability[i]
          ),
        wind:
          Number(
            data.wind_speed_10m[i]
          )
      });
    }

    const best =
      candidates
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 4)
        .sort(
          (a, b) =>
            a.hour - b.hour
        );

    const root =
      document.getElementById(
        "bestHours"
      );

    root.innerHTML =
      best.length
        ? best
            .map(item =>
              '<div class="wr-hour">' +
                "<strong>" +
                  pad(item.hour) +
                  ":00" +
                "</strong>" +
                "<span>" +
                  item.score +
                  "/100" +
                "</span>" +
                "<small>" +
                  Math.round(
                    item.temp
                  ) +
                  " C · " +
                  Math.round(
                    item.wind
                  ) +
                  " km/h · " +
                  Math.round(
                    item.rain
                  ) +
                  "% pluja" +
                "</small>" +
              "</div>"
            )
            .join("")
        : (
          '<div class="wr-empty">' +
            "Sense hores disponibles per a aquesta data." +
          "</div>"
        );
  }

  function renderWeatherMarkers(values) {
    state.weatherLayer
      .clearLayers();

    state.route.points
      .forEach((point, index) => {
        const value =
          values[index];

        const icon =
          L.divIcon({
            className: "",
            html:
              '<div class="wr-weather-marker">' +
                Math.round(
                  value.temp
                ) +
                "\u00b0" +
              "</div>",
            iconSize:
              [28, 28],
            iconAnchor:
              [14, 14]
          });

        L.marker(
          point,
          {
            icon
          }
        )
          .bindPopup(
            "<strong>" +
              Math.round(
                value.temp
              ) +
              " C</strong><br>" +
            "Vent: " +
              Math.round(
                value.wind
              ) +
              " km/h<br>" +
            "Pluja: " +
              Math.round(
                value.rain
              ) +
              "%"
          )
          .addTo(
            state.weatherLayer
          );
      });
  }

  function bindUi() {
    document.getElementById(
      "routeSelect"
    ).addEventListener(
      "change",
      event => {
        state.route =
          state.routes.find(
            route =>
              route.id ===
              event.target.value
          ) ||
          state.routes[0];

        drawRoute();
        analyzeWeather();
      }
    );

    document.getElementById(
      "analyzeButton"
    ).addEventListener(
      "click",
      analyzeWeather
    );
  }

  async function boot() {
    initMap();

    document.getElementById(
      "dateInput"
    ).value =
      todayIso();

    document.getElementById(
      "dateInput"
    ).min =
      todayIso();

    bindUi();

    try {
      await loadRoutes();
      renderRouteSelect();
      drawRoute();
      await analyzeWeather();

      window.BiciParkCore
        ?.registerModule({
          id:
            "weather-route",
          version:
            "1.0.0",
          api: {
            analyze:
              analyzeWeather,
            getRoute: () =>
              state.route,
            getWeather: () =>
              [...state.weatherByPoint]
          }
        });

      window.BiciParkCore
        ?.emit(
          "weather-route:ready",
          {
            routeCount:
              state.routes.length
          }
        );
    } catch (error) {
      console.error(
        "[Weather Route boot]",
        error
      );

      status(
        "No s'ha pogut iniciar Weather Route.",
        "error"
      );
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();