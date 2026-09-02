(() => {
  "use strict";

  if (window.__BICIPARK_WEATHER_VIEWPORT_FIT_V5__) {
    return;
  }

  window.__BICIPARK_WEATHER_VIEWPORT_FIT_V5__ = true;

  if (!window.L || !L.Map) {
    return;
  }

  let weatherMap = null;
  let refitTimer = null;

  /*
   * Capture ONLY the Leaflet map whose container is weatherRouteMap.
   * This file is loaded only on the Weather Route page.
   */
  L.Map.addInitHook(function() {
    try {
      const container =
        this.getContainer();

      if (
        container &&
        container.id === "weatherRouteMap"
      ) {
        weatherMap = this;
      }
    } catch (_) {}
  });

  function routeBounds() {
    if (!weatherMap) {
      return null;
    }

    let bounds = null;

    weatherMap.eachLayer(layer => {
      try {
        if (
          layer instanceof L.Polyline &&
          layer.options &&
          layer.options.className === "wr-route-line"
        ) {
          const current =
            layer.getBounds();

          if (
            current &&
            current.isValid()
          ) {
            if (!bounds) {
              bounds =
                L.latLngBounds(
                  current
                );
            } else {
              bounds.extend(
                current
              );
            }
          }
        }
      } catch (_) {}
    });

    return bounds;
  }

  function refit() {
    if (!weatherMap) {
      return;
    }

    const bounds =
      routeBounds();

    try {
      weatherMap.invalidateSize(
        false
      );
    } catch (_) {}

    if (
      !bounds ||
      !bounds.isValid()
    ) {
      return;
    }

    const padded =
      bounds.pad(0.28);

    /*
     * Long estimated stages need a wider opening view.
     * Known shorter routes can naturally zoom closer.
     */
    const northSouth =
      Math.abs(
        padded.getNorth() -
        padded.getSouth()
      );

    const eastWest =
      Math.abs(
        padded.getEast() -
        padded.getWest()
      );

    const longRoute =
      northSouth > 1.0 ||
      eastWest > 1.4;

    weatherMap.fitBounds(
      padded,
      {
        padding:
          [55, 55],

        maxZoom:
          longRoute
            ? 7
            : 10,

        animate:
          false
      }
    );
  }

  function scheduleRefit() {
    if (refitTimer) {
      clearTimeout(
        refitTimer
      );
    }

    refitTimer =
      setTimeout(
        refit,
        80
      );

    /*
     * The warning, cards and responsive layout can still change
     * the map size during the first second. Re-fit after those
     * changes so endpoints remain visible.
     */
    [250, 650, 1200].forEach(ms => {
      setTimeout(
        refit,
        ms
      );
    });
  }

  window.addEventListener(
    "bicipark:weather-route:updated",
    scheduleRefit
  );

  window.addEventListener(
    "resize",
    scheduleRefit
  );

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      scheduleRefit
    );
  } else {
    scheduleRefit();
  }
})();