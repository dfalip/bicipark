(() => {
  "use strict";

  if (
    window.__BICIPARK_WEATHER_MAP_TOOLS_ADAPTER__
  ) {
    return;
  }

  window.__BICIPARK_WEATHER_MAP_TOOLS_ADAPTER__ =
    true;

  let boundRow = null;

  function api() {
    return (
      window.BiciParkWeatherMap ||
      null
    );
  }

  function findWeatherRow() {
    return (
      Array.from(
        document.querySelectorAll(
          ".bp-map-tools-row"
        )
      ).find(row =>
        /meteorologia/i.test(
          row.textContent || ""
        )
      ) ||
      null
    );
  }

  function count() {
    const current =
      api();

    if (!current) {
      return "-";
    }

    try {
      const items =
        current.getItems?.();

      return Array.isArray(items)
        ? String(items.length)
        : "-";
    } catch (_) {
      return "-";
    }
  }

  function refresh() {
    const row =
      findWeatherRow();

    if (!row) {
      return;
    }

    const toggle =
      row.querySelector(
        ".bp-map-tools-toggle"
      );

    const countNode =
      row.querySelector(
        ".bp-map-tools-count"
      );

    const small =
      row.querySelector(
        ".bp-map-tools-row-copy small"
      );

    const current =
      api();

    row.classList.remove(
      "bp-map-tools-future"
    );

    if (small) {
      small.textContent =
        "Temps actual de rutes";
    }

    if (countNode) {
      countNode.textContent =
        count();
    }

    if (toggle) {
      toggle.disabled =
        !current;

      toggle.classList.toggle(
        "is-on",
        Boolean(
          current?.isVisible?.()
        )
      );

      if (
        current &&
        boundRow !== row
      ) {
        boundRow =
          row;

        toggle.addEventListener(
          "click",
          event => {
            event.preventDefault();
            event.stopPropagation();

            api()?.toggle?.();

            setTimeout(
              refresh,
              100
            );
          }
        );
      }
    }
  }

  function boot() {
    refresh();

    const observer =
      new MutationObserver(
        refresh
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    window.addEventListener(
      "bicipark:map-layer-ready",
      refresh
    );

    window.addEventListener(
      "bicipark:weather-route:visibility",
      refresh
    );

    setInterval(
      refresh,
      1000
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
  } else {
    boot();
  }
})();