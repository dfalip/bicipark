(() => {
  "use strict";

  if (window.__BICIPARK_WEATHER_MAP_TOOLS_ADAPTER_V2__) {
    return;
  }

  window.__BICIPARK_WEATHER_MAP_TOOLS_ADAPTER_V2__ = true;

  let boundToggle =
    null;

  let refreshTimer =
    null;

  function api() {
    return (
      window.BiciParkWeatherMap ||
      null
    );
  }

  function findRow() {
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

  function refresh() {
    const row =
      findRow();

    if (!row) {
      return;
    }

    const current =
      api();

    const toggle =
      row.querySelector(
        ".bp-map-tools-toggle"
      );

    const count =
      row.querySelector(
        ".bp-map-tools-count"
      );

    const small =
      row.querySelector(
        ".bp-map-tools-row-copy small"
      );

    row.classList.remove(
      "bp-map-tools-future"
    );

    const loading =
      Boolean(
        current?.isLoading?.()
      );

    const visible =
      Boolean(
        current?.isVisible?.()
      );

    if (small) {
      if (loading) {
        small.textContent =
          visible
            ? "Actualitzant Open-Meteo... pots desactivar-la"
            : "Actualitzant Open-Meteo...";
      } else {
        small.textContent =
          "Condicions actuals de les rutes";
      }
    }

    if (count) {
      let value = "-";

      try {
        const items =
          current?.getItems?.();

        value =
          Array.isArray(items)
            ? String(
                items.length
              )
            : "-";
      } catch (_) {}

      count.textContent =
        value;
    }

    if (!toggle) {
      return;
    }

    /*
     * Only disabled before the Weather API exists.
     * Loading must never prevent the user from switching OFF.
     */
    toggle.disabled =
      !current;

    toggle.classList.toggle(
      "is-on",
      visible
    );

    toggle.setAttribute(
      "aria-pressed",
      visible
        ? "true"
        : "false"
    );

    if (
      current &&
      boundToggle !==
      toggle
    ) {
      boundToggle =
        toggle;

      toggle.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          api()?.toggle?.();

          requestAnimationFrame(
            refresh
          );

          setTimeout(
            refresh,
            80
          );
        }
      );
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) {
      clearTimeout(
        refreshTimer
      );
    }

    refreshTimer =
      setTimeout(
        refresh,
        40
      );
  }

  function boot() {
    refresh();

    const observer =
      new MutationObserver(
        scheduleRefresh
      );

    observer.observe(
      document.body,
      {
        childList:
          true,
        subtree:
          true
      }
    );

    window.addEventListener(
      "bicipark:weather-main-map-status",
      scheduleRefresh
    );

    let tries = 0;

    const timer =
      setInterval(
        () => {
          tries++;
          refresh();

          if (
            api() ||
            tries > 50
          ) {
            clearInterval(
              timer
            );
          }
        },
        250
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