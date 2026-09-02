(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_MATCH_ROUTE_EXPLORER_ADAPTER__) return;
  window.__BICIPARK_ROUTE_MATCH_ROUTE_EXPLORER_ADAPTER__ = true;

  const current =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /route-match\/adapters\/route-explorer-adapter\.js/.test(script.src)
    );

  if (!current?.src) return;

  const moduleUrl =
    new URL("../", current.src).href;

  function createCta() {
    const link =
      document.createElement("a");

    link.id =
      "bp-route-match-route-explorer-cta";

    link.className =
      "bp-rm-route-explorer-cta";

    link.href =
      moduleUrl;

    link.innerHTML =
      '<span class="bp-rm-route-explorer-icon">🎯</span>' +
      '<span class="bp-rm-route-explorer-copy">' +
        '<strong>Quina ruta em convé?</strong>' +
        '<small>Recomanacions segons nivell, objectiu i temps disponible</small>' +
      '</span>' +
      '<span class="bp-rm-route-explorer-arrow">→</span>';

    return link;
  }

  function scoreContainer(node) {
    if (!node) return -1;

    let score = 0;

    const selects =
      node.querySelectorAll?.("select")?.length || 0;

    const text =
      String(node.textContent || "");

    if (selects >= 2) score += 6;
    if (/Regi[oó]/i.test(text)) score += 4;
    if (/Modalitat/i.test(text)) score += 3;
    if (/Dificultat/i.test(text)) score += 3;

    const rect =
      node.getBoundingClientRect?.();

    if (
      rect &&
      rect.width > 220 &&
      rect.width < 620
    ) {
      score += 2;
    }

    return score;
  }

  function findFiltersContainer() {
    const select =
      document.querySelector("select");

    if (!select) return null;

    let node =
      select.parentElement;

    let best =
      null;

    let bestScore =
      -1;

    for (
      let depth = 0;
      depth < 7 &&
      node;
      depth++
    ) {
      const score =
        scoreContainer(node);

      if (score > bestScore) {
        best =
          node;

        bestScore =
          score;
      }

      node =
        node.parentElement;
    }

    return bestScore >= 5
      ? best
      : null;
  }

  function insert() {
    if (
      document.getElementById(
        "bp-route-match-route-explorer-cta"
      )
    ) {
      return true;
    }

    const filters =
      findFiltersContainer();

    if (!filters) {
      return false;
    }

    filters.insertAdjacentElement(
      "afterbegin",
      createCta()
    );

    return true;
  }

  function boot() {
    if (insert()) return;

    let tries = 0;

    const timer =
      setInterval(
        () => {
          tries++;

          if (
            insert() ||
            tries > 40
          ) {
            clearInterval(timer);
          }
        },
        200
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