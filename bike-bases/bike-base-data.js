(() => {
  "use strict";

  const CACHE = {
    catalog: null,
    bases: new Map()
  };

  async function fetchJson(url) {
    const response = await fetch(
      url,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "Bicipark Bike Bases: no s'ha pogut carregar " + url
      );
    }

    return response.json();
  }

  async function loadCatalog() {
    if (CACHE.catalog) {
      return CACHE.catalog;
    }

    CACHE.catalog = await fetchJson(
      "./data/bike-bases.json"
    );

    return CACHE.catalog;
  }

  async function loadBase(baseId) {
    if (CACHE.bases.has(baseId)) {
      return CACHE.bases.get(baseId);
    }

    const catalog = await loadCatalog();

    const summary = catalog.bases.find(
      item => item.id === baseId
    );

    if (!summary) {
      throw new Error(
        "Bike Base no trobada: " + baseId
      );
    }

    const detail = await fetchJson(
      summary.dataFile
    );

    CACHE.bases.set(
      baseId,
      detail
    );

    return detail;
  }

  window.BiciparkBikeBases = {
    loadCatalog,
    loadBase
  };
})();