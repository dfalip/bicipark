(() => {
  "use strict";

  if (!window.L || !L.Map || !L.Map.prototype.fitBounds) {
    console.warn("[Highlights Map Guard] Leaflet no disponible.");
    return;
  }

  if (L.Map.prototype.__biciparkFitBoundsGuardInstalled) {
    return;
  }

  const originalFitBounds = L.Map.prototype.fitBounds;

  /*
   * Current BiciPark Highlights are concentrated in Catalunya,
   * Girona, Roses, Pla de l'Estany and Navarra.
   *
   * This guard only acts when a calculated fitBounds is clearly
   * absurd for the current dataset (for example UK / northern
   * Europe because of a malformed imported coordinate).
   *
   * It does NOT affect flyTo(), setView(), manual zoom or pan.
   */
  const fallbackBounds = L.latLngBounds(
    [40.65, -2.75],
    [43.45, 4.10]
  );

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function isSuspicious(bounds) {
    if (!bounds) return false;

    const south = Number(bounds.getSouth());
    const north = Number(bounds.getNorth());
    const west = Number(bounds.getWest());
    const east = Number(bounds.getEast());

    if (
      !isFiniteNumber(south) ||
      !isFiniteNumber(north) ||
      !isFiniteNumber(west) ||
      !isFiniteNumber(east)
    ) {
      return true;
    }

    const latSpan = north - south;
    const lngSpan = east - west;

    return (
      north > 49.5 ||
      south < 30 ||
      east > 15 ||
      west < -15 ||
      latSpan > 16 ||
      lngSpan > 24
    );
  }

  L.Map.prototype.fitBounds = function(bounds, options) {
    let normalized;

    try {
      normalized = L.latLngBounds(bounds);
    } catch (error) {
      console.warn(
        "[Highlights Map Guard] Bounds invalids. S'aplica l'enquadrament BiciPark.",
        error
      );

      return originalFitBounds.call(
        this,
        fallbackBounds,
        options
      );
    }

    if (isSuspicious(normalized)) {
      console.warn(
        "[Highlights Map Guard] Enquadrament anomal detectat.",
        {
          south: normalized.getSouth(),
          north: normalized.getNorth(),
          west: normalized.getWest(),
          east: normalized.getEast()
        }
      );

      const safeOptions = Object.assign(
        {},
        options || {},
        {
          padding: [30, 30],
          maxZoom: 9
        }
      );

      return originalFitBounds.call(
        this,
        fallbackBounds,
        safeOptions
      );
    }

    return originalFitBounds.call(
      this,
      normalized,
      options
    );
  };

  L.Map.prototype.__biciparkFitBoundsGuardInstalled = true;

  console.info(
    "[Highlights Map Guard] Adapter instal.lat."
  );
})();