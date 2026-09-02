(() => {
  "use strict";

  if (window.__BICIPARK_DYNAMIC_WEATHER_BRIDGE_V4__) {
    return;
  }

  window.__BICIPARK_DYNAMIC_WEATHER_BRIDGE_V4__ = true;

  const params =
    new URLSearchParams(
      location.search
    );

  if (
    params.get("dynamic") !== "1"
  ) {
    return;
  }

  const requestedId =
    params.get("route") || "";

  const isResolved =
    params.get("resolved") === "1";

  const originalFetch =
    window.fetch.bind(window);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function readJson(key) {
    try {
      const raw =
        sessionStorage.getItem(key);

      return raw
        ? JSON.parse(raw)
        : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (_) {}
  }

  function removeKey(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_) {}
  }

  function readMeta() {
    return readJson(
      "bicipark.weather.dynamicRoute"
    );
  }

  function readResolved() {
    const route =
      readJson(
        "bicipark.weather.dynamicResolved"
      );

    if (!route) {
      return null;
    }

    if (
      requestedId &&
      route.id !== requestedId
    ) {
      return null;
    }

    return route;
  }

  function fallbackPoints() {
    return [
      [41.38, 2.12],
      [41.39, 2.14],
      [41.40, 2.16],
      [41.41, 2.18],
      [41.42, 2.20]
    ];
  }

  function placeholderRoute(meta) {
    return {
      id:
        meta?.id ||
        requestedId ||
        (
          "dynamic-" +
          Date.now()
        ),

      name:
        meta?.title ||
        "Ruta Route Explorer",

      distanceKm:
        Number.isFinite(
          Number(meta?.distanceKm)
        )
          ? Number(meta.distanceKm)
          : 0,

      elevationM:
        Number.isFinite(
          Number(meta?.elevationM)
        )
          ? Number(meta.elevationM)
          : 0,

      difficulty:
        meta?.difficulty ||
        "Sense classificar",

      mode:
        meta?.mode ||
        "Ruta",

      points:
        fallbackPoints(),

      dynamicEstimated:
        true,

      geoMode:
        "fallback"
    };
  }

  /*
   * Intercept ONLY the Weather Route module's route catalogue
   * while a dynamic Route Explorer route is open.
   */
  window.fetch =
    async function(input, init) {
      const url =
        typeof input === "string"
          ? input
          : (
              input?.url ||
              ""
            );

      if (
        /weather-routes\.json(?:\?|$)/.test(
          url
        )
      ) {
        const meta =
          readMeta();

        const resolved =
          readResolved();

        const route =
          resolved ||
          placeholderRoute(meta);

        return new Response(
          JSON.stringify([
            route
          ]),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );
      }

      return originalFetch(
        input,
        init
      );
    };

  /*
   * Weather dynamic routes need a little more context around
   * their bounds. This patch is local to the Weather Route page
   * and never affects mapa-ciclista.html.
   */
  function installFitBoundsGuard() {
    if (
      !window.L ||
      !L.Map ||
      !L.Map.prototype.fitBounds ||
      L.Map.prototype
        .__biciparkWeatherDynamicFitV4
    ) {
      return;
    }

    const originalFitBounds =
      L.Map.prototype.fitBounds;

    L.Map.prototype.fitBounds =
      function(bounds, options) {
        let safeBounds;

        try {
          safeBounds =
            L.latLngBounds(bounds);

          if (
            safeBounds &&
            safeBounds.isValid()
          ) {
            safeBounds =
              safeBounds.pad(0.20);
          }
        } catch (_) {
          safeBounds = bounds;
        }

        const safeOptions =
          Object.assign(
            {},
            options || {},
            {
              padding:
                [45, 45],

              /*
               * Prevent an estimated long stage from opening
               * excessively close.
               */
              maxZoom:
                8
            }
          );

        const result =
          originalFitBounds.call(
            this,
            safeBounds,
            safeOptions
          );

        window.setTimeout(
          () => {
            try {
              this.invalidateSize(
                false
              );
            } catch (_) {}
          },
          100
        );

        return result;
      };

    L.Map.prototype
      .__biciparkWeatherDynamicFitV4 =
      true;
  }

  installFitBoundsGuard();

  function radians(value) {
    return (
      value *
      Math.PI /
      180
    );
  }

  function haversineKm(a, b) {
    const earth =
      6371;

    const dLat =
      radians(
        b.lat - a.lat
      );

    const dLng =
      radians(
        b.lng - a.lng
      );

    const lat1 =
      radians(a.lat);

    const lat2 =
      radians(b.lat);

    const h =
      Math.sin(
        dLat / 2
      ) ** 2 +
      Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2
      ) ** 2;

    return (
      2 *
      earth *
      Math.asin(
        Math.sqrt(h)
      )
    );
  }

  function westEurope(candidate) {
    return (
      candidate.lat >= 35 &&
      candidate.lat <= 52 &&
      candidate.lng >= -10 &&
      candidate.lng <= 12
    );
  }

  function countryPenalty(code) {
    if (
      code === "ES" ||
      code === "FR" ||
      code === "AD"
    ) {
      return 0;
    }

    if (
      code === "PT"
    ) {
      return 18;
    }

    return 90;
  }

  function exactNameBonus(query, candidate) {
    const a =
      normalize(query);

    const b =
      normalize(
        candidate.name
      );

    if (!a || !b) {
      return 0;
    }

    if (a === b) {
      return -22;
    }

    if (
      a.includes(b) ||
      b.includes(a)
    ) {
      return -8;
    }

    return 0;
  }

  function populationBonus(candidate) {
    const population =
      Number(
        candidate.population || 0
      );

    if (!population) {
      return 0;
    }

    return (
      -Math.min(
        12,
        Math.log10(
          population + 1
        ) * 2
      )
    );
  }

  async function searchPlace(place) {
    if (!place) {
      return [];
    }

    const url =
      "https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({
        name: place,
        count: "10",
        language: "ca",
        format: "json"
      }).toString();

    const response =
      await originalFetch(
        url,
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    const rows =
      Array.isArray(
        data.results
      )
        ? data.results
        : [];

    const mapped =
      rows
        .map(row => ({
          name:
            row.name || place,

          lat:
            Number(
              row.latitude
            ),

          lng:
            Number(
              row.longitude
            ),

          country:
            row.country || "",

          countryCode:
            String(
              row.country_code || ""
            )
              .toUpperCase(),

          admin1:
            row.admin1 || "",

          admin2:
            row.admin2 || "",

          population:
            Number(
              row.population || 0
            )
        }))
        .filter(row =>
          Number.isFinite(row.lat) &&
          Number.isFinite(row.lng)
        );

    const regional =
      mapped.filter(
        westEurope
      );

    return (
      regional.length
        ? regional
        : mapped
    );
  }

  function pairScore(
    originName,
    destinationName,
    origin,
    destination,
    routeDistance
  ) {
    const straight =
      haversineKm(
        origin,
        destination
      );

    let score =
      countryPenalty(
        origin.countryCode
      ) +
      countryPenalty(
        destination.countryCode
      );

    score +=
      exactNameBonus(
        originName,
        origin
      );

    score +=
      exactNameBonus(
        destinationName,
        destination
      );

    score +=
      populationBonus(
        origin
      );

    score +=
      populationBonus(
        destination
      );

    if (
      Number.isFinite(
        routeDistance
      ) &&
      routeDistance > 0
    ) {
      /*
       * A cycling route cannot normally be substantially shorter
       * than the straight-line distance.
       */
      if (
        straight >
        routeDistance * 1.12
      ) {
        score +=
          500 +
          (
            straight -
            routeDistance
          );
      } else {
        const ratio =
          routeDistance /
          Math.max(
            1,
            straight
          );

        /*
         * A route / straight-line ratio around 1.2-1.7 is common.
         * Large detours are possible in mountain stages, so the
         * penalty stays soft up to roughly 2.8.
         */
        const target =
          1.42;

        score +=
          Math.abs(
            ratio -
            target
          ) *
          22;

        if (
          ratio > 2.8
        ) {
          score +=
            (
              ratio -
              2.8
            ) *
            35;
        }

        if (
          straight <
          routeDistance * 0.20
        ) {
          score += 60;
        }
      }
    }

    return {
      score,
      straight
    };
  }

  function choosePair(
    meta,
    origins,
    destinations
  ) {
    let best =
      null;

    const routeDistance =
      Number(
        meta?.distanceKm
      );

    origins.forEach(origin => {
      destinations.forEach(
        destination => {
          const result =
            pairScore(
              meta.origin,
              meta.destination,
              origin,
              destination,
              routeDistance
            );

          const candidate = {
            origin,
            destination,
            score:
              result.score,
            straightKm:
              result.straight
          };

          if (
            !best ||
            candidate.score <
            best.score
          ) {
            best =
              candidate;
          }
        }
      );
    });

    return best;
  }

  function interpolate(
    a,
    b,
    count = 5
  ) {
    const points = [];

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const t =
        count === 1
          ? 0
          : (
              i /
              (count - 1)
            );

      points.push([
        a.lat +
          (
            b.lat -
            a.lat
          ) * t,

        a.lng +
          (
            b.lng -
            a.lng
          ) * t
      ]);
    }

    return points;
  }

  function loopAround(point) {
    return [
      [
        point.lat - 0.025,
        point.lng - 0.025
      ],
      [
        point.lat - 0.012,
        point.lng
      ],
      [
        point.lat,
        point.lng + 0.018
      ],
      [
        point.lat + 0.012,
        point.lng
      ],
      [
        point.lat + 0.025,
        point.lng - 0.025
      ]
    ];
  }

  async function resolveDynamicRoute(meta) {
    if (!meta) {
      return placeholderRoute(
        meta
      );
    }

    const origins =
      await searchPlace(
        meta.origin
      );

    const destinations =
      await searchPlace(
        meta.destination
      );

    if (
      !origins.length ||
      !destinations.length
    ) {
      return placeholderRoute(
        meta
      );
    }

    const best =
      choosePair(
        meta,
        origins,
        destinations
      );

    if (!best) {
      return placeholderRoute(
        meta
      );
    }

    const samePoint =
      haversineKm(
        best.origin,
        best.destination
      ) < 2;

    const points =
      samePoint
        ? loopAround(
            best.origin
          )
        : interpolate(
            best.origin,
            best.destination,
            5
          );

    return {
      id:
        meta.id ||
        requestedId ||
        (
          "dynamic-" +
          Date.now()
        ),

      name:
        meta.title ||
        "Ruta Route Explorer",

      distanceKm:
        Number.isFinite(
          Number(meta.distanceKm)
        )
          ? Number(meta.distanceKm)
          : 0,

      elevationM:
        Number.isFinite(
          Number(meta.elevationM)
        )
          ? Number(meta.elevationM)
          : 0,

      difficulty:
        meta.difficulty ||
        "Sense classificar",

      mode:
        meta.mode ||
        "Ruta",

      points,

      dynamicEstimated:
        true,

      geoMode:
        "geocoded",

      geo: {
        origin: {
          query:
            meta.origin,

          name:
            best.origin.name,

          country:
            best.origin.country,

          countryCode:
            best.origin.countryCode,

          admin1:
            best.origin.admin1,

          lat:
            best.origin.lat,

          lng:
            best.origin.lng
        },

        destination: {
          query:
            meta.destination,

          name:
            best.destination.name,

          country:
            best.destination.country,

          countryCode:
            best.destination.countryCode,

          admin1:
            best.destination.admin1,

          lat:
            best.destination.lat,

          lng:
            best.destination.lng
        },

        straightKm:
          Math.round(
            best.straightKm
          )
      }
    };
  }

  function addWarning(route) {
    const attempt =
      () => {
        if (
          document.querySelector(
            ".wr-dynamic-warning"
          )
        ) {
          return true;
        }

        const status =
          document.getElementById(
            "weatherStatus"
          );

        if (!status) {
          return false;
        }

        const box =
          document.createElement(
            "div"
          );

        box.className =
          "wr-dynamic-warning";

        if (
          route?.geoMode ===
          "geocoded" &&
          route.geo
        ) {
          const origin =
            route.geo.origin;

          const destination =
            route.geo.destination;

          box.innerHTML =
            "<strong>Estimacio provisional:</strong> " +
            "encara no utilitzem el tracat GPX complet d'aquesta etapa. " +
            "La meteorologia es calcula entre " +
            origin.name +
            " (" +
            origin.countryCode +
            ") i " +
            destination.name +
            " (" +
            destination.countryCode +
            "). " +
            "El mapa mostra una aproximacio geografica, no el recorregut real.";
        } else {
          box.innerHTML =
            "<strong>Estimacio molt provisional:</strong> " +
            "no s'ha pogut identificar amb prou seguretat l'origen o la destinacio. " +
            "No utilitzis aquest mapa com a tracat real.";
        }

        status.insertAdjacentElement(
          "afterend",
          box
        );

        return true;
      };

    if (attempt()) {
      return;
    }

    let tries = 0;

    const timer =
      window.setInterval(
        () => {
          tries++;

          if (
            attempt() ||
            tries > 80
          ) {
            window.clearInterval(
              timer
            );
          }
        },
        100
      );
  }

  async function prepare() {
    const meta =
      readMeta();

    if (!meta) {
      return;
    }

    /*
     * Avoid reusing the previous stage's resolved geometry.
     */
    const existing =
      readJson(
        "bicipark.weather.dynamicResolved"
      );

    if (
      existing &&
      existing.id !==
      (
        meta.id ||
        requestedId
      )
    ) {
      removeKey(
        "bicipark.weather.dynamicResolved"
      );
    }

    if (isResolved) {
      const resolved =
        readResolved();

      addWarning(
        resolved ||
        placeholderRoute(meta)
      );

      return;
    }

    removeKey(
      "bicipark.weather.dynamicResolved"
    );

    const resolved =
      await resolveDynamicRoute(
        meta
      );

    writeJson(
      "bicipark.weather.dynamicResolved",
      resolved
    );

    const next =
      new URL(
        location.href
      );

    next.searchParams.set(
      "resolved",
      "1"
    );

    location.replace(
      next.href
    );
  }

  prepare().catch(error => {
    console.warn(
      "[Weather Dynamic v4]",
      error
    );

    const meta =
      readMeta();

    const fallback =
      placeholderRoute(
        meta
      );

    writeJson(
      "bicipark.weather.dynamicResolved",
      fallback
    );

    if (!isResolved) {
      const next =
        new URL(
          location.href
        );

      next.searchParams.set(
        "resolved",
        "1"
      );

      location.replace(
        next.href
      );
    } else {
      addWarning(
        fallback
      );
    }
  });
})();