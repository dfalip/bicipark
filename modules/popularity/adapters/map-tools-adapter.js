(() => {
  "use strict";

  if (window.__BICIPARK_POPULARITY_MAP_TOOLS_ADAPTER__) return;
  window.__BICIPARK_POPULARITY_MAP_TOOLS_ADAPTER__ = true;

  let boundToggle = null;
  let refreshTimer = null;

  function api() {
    return window.BiciParkPopularityMap || null;
  }

  function findRow() {
    return (
      Array.from(document.querySelectorAll(".bp-map-tools-row"))
        .find(row => /popularitat/i.test(row.textContent || "")) ||
      null
    );
  }

  function refresh() {
    const row = findRow();
    if (!row) return;

    const current = api();
    const toggle = row.querySelector(".bp-map-tools-toggle");
    const count = row.querySelector(".bp-map-tools-count");
    const small = row.querySelector(".bp-map-tools-row-copy small");

    row.classList.remove("bp-map-tools-future");

    if (small) small.textContent = "Interes local BiciPark";

    if (count) {
      let value = "-";

      try {
        const items = current?.getItems?.();
        value = Array.isArray(items) ? String(items.length) : "-";
      } catch (_) {}

      count.textContent = value;
    }

    if (!toggle) return;

    toggle.disabled = !current;
    toggle.classList.toggle("is-on", Boolean(current?.isVisible?.()));

    if (current && boundToggle !== toggle) {
      boundToggle = toggle;

      toggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        api()?.toggle?.();

        setTimeout(refresh, 60);
      });
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 50);
  }

  function boot() {
    refresh();

    const observer = new MutationObserver(scheduleRefresh);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("bicipark:map-layer-ready", scheduleRefresh);
    window.addEventListener("bicipark:popularity:visibility", scheduleRefresh);

    let tries = 0;

    const timer = setInterval(() => {
      tries++;
      refresh();

      if (api() || tries > 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();