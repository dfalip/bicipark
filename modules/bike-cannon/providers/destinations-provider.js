(() => {
  "use strict";

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
        " carregant " +
        url
      );
    }

    return response.json();
  }

  async function load(baseUrl) {
    /*
     * baseUrl points to modules/bike-cannon/
     * destinations.json lives in modules/bike-cannon/data/
     */
    const dataUrl =
      new URL(
        "./data/destinations.json",
        baseUrl
      ).href;

    const raw =
      await fetchJson(
        dataUrl
      );

    return Array.isArray(raw)
      ? raw
      : [];
  }

  function random(items) {
    if (!items.length) {
      return null;
    }

    return items[
      Math.floor(
        Math.random() *
        items.length
      )
    ];
  }

  function closestByDistance(
    items,
    distanceKm
  ) {
    if (!items.length) {
      return null;
    }

    return [...items]
      .sort(
        (a, b) =>
          Math.abs(
            Number(a.distanceKm) -
            distanceKm
          ) -
          Math.abs(
            Number(b.distanceKm) -
            distanceKm
          )
      )[0];
  }

  window.BiciParkBikeCannonDestinations = {
    load,
    random,
    closestByDistance
  };
})();