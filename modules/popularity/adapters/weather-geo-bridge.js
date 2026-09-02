(() => {
  "use strict";

  if (
    window.__BICIPARK_POPULARITY_WEATHER_GEO_BRIDGE_V3__
  ) {
    return;
  }

  window.__BICIPARK_POPULARITY_WEATHER_GEO_BRIDGE_V3__ = true;

  const GEO_KEY =
    "bicipark.popularity.routeGeo.v2";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function canonicalId(name, explicitId) {
    const explicit =
      normalize(explicitId);

    const byName =
      normalize(name);

    const text =
      explicit || byName;

    if (
      /carretera.*aigues/.test(text) ||
      /carretera.*aigues/.test(byName)
    ) {
      return "carretera-aigues";
    }

    if (
      /front.*maritim/.test(text) ||
      /front.*maritim/.test(byName)
    ) {
      return "front-maritim";
    }

    if (
      /\bbesos\b/.test(text) ||
      /\bbesos\b/.test(byName)
    ) {
      return "riu-besos";
    }

    return text
      .replace(/^dynamic\s+/, "")
      .replace(/\s+/g, "-")
      .slice(0, 120);
  }

  function readCatalog() {
    try {
      const raw =
        localStorage.getItem(
          GEO_KEY
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : {};

      return (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      )
        ? parsed
        : {};
    } catch (_) {
      return {};
    }
  }

  function writeCatalog(catalog) {
    try {
      localStorage.setItem(
        GEO_KEY,
        JSON.stringify(catalog)
      );
    } catch (_) {}
  }

  function validCoordinate(value, kind) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return false;
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return false;
    }

    if (kind === "lat") {
      return (
        number >= -90 &&
        number <= 90
      );
    }

    return (
      number >= -180 &&
      number <= 180
    );
  }

  function validPoints(points) {
    return (
      Array.isArray(points) &&
      points.length >= 2 &&
      points.every(point =>
        Array.isArray(point) &&
        validCoordinate(
          point[0],
          "lat"
        ) &&
        validCoordinate(
          point[1],
          "lng"
        )
      )
    );
  }

  function saveRoute(route) {
    if (
      !route ||
      !validPoints(route.points)
    ) {
      return false;
    }

    const id =
      canonicalId(
        route.name,
        route.id
      );

    if (!id) {
      return false;
    }

    const catalog =
      readCatalog();

    const saved = {
      id,
      sourceId:
        route.id || "",
      name:
        route.name || id,
      points:
        route.points.map(point => [
          Number(point[0]),
          Number(point[1])
        ]),
      distanceKm:
        Number.isFinite(
          Number(route.distanceKm)
        )
          ? Number(route.distanceKm)
          : null,
      elevationM:
        Number.isFinite(
          Number(route.elevationM)
        )
          ? Number(route.elevationM)
          : null,
      geoMode:
        route.geoMode || "",
      geo:
        route.geo || null,
      updatedAt:
        new Date().toISOString(),
      source:
        "weather-route"
    };

    /*
     * Store with canonical key.
     */
    catalog[id] =
      saved;

    /*
     * Also remove obsolete aliases for the same source route,
     * avoiding duplicated geometry records.
     */
    Object.keys(catalog)
      .forEach(key => {
        if (
          key !== id &&
          catalog[key] &&
          route.id &&
          catalog[key].sourceId ===
          route.id
        ) {
          delete catalog[key];
        }
      });

    writeCatalog(
      catalog
    );

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:popularity:route-geo-saved",
        {
          detail:
            saved
        }
      )
    );

    return true;
  }

  function readDynamicResolved() {
    try {
      const raw =
        sessionStorage.getItem(
          "bicipark.weather.dynamicResolved"
        );

      return raw
        ? JSON.parse(raw)
        : null;
    } catch (_) {
      return null;
    }
  }

  function saveCurrentDynamic() {
    const route =
      readDynamicResolved();

    if (route) {
      saveRoute(route);
    }
  }

  function saveFromWeatherApi() {
    try {
      const route =
        window.BiciParkWeatherRoute
          ?.getRoute?.();

      if (
        route &&
        validPoints(
          route.points
        )
      ) {
        saveRoute(route);
      }
    } catch (_) {}
  }

  function sweep() {
    saveCurrentDynamic();
    saveFromWeatherApi();
  }

  function boot() {
    sweep();

    [
      100,
      350,
      800,
      1500,
      3000
    ].forEach(ms => {
      setTimeout(
        sweep,
        ms
      );
    });

    window.addEventListener(
      "bicipark:weather-route:updated",
      sweep
    );
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