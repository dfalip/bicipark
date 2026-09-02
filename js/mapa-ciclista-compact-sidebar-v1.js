(() => {
  "use strict";

  if (window.__BICIPARK_COMPACT_MAIN_MAP_SIDEBAR_V4__) {
    return;
  }

  window.__BICIPARK_COMPACT_MAIN_MAP_SIDEBAR_V4__ = true;

  let resizeTimer = null;

  function findHeading() {
    return Array.from(
      document.querySelectorAll("h1,h2")
    ).find(node =>
      /explora\s+rutes/i.test(
        node.textContent || ""
      )
    ) || null;
  }

  function findLayout() {
    const heading = findHeading();

    if (!heading) {
      return null;
    }

    let child = heading;

    for (
      let depth = 0;
      depth < 10 &&
      child?.parentElement;
      depth++
    ) {
      const parent = child.parentElement;

      const childHasMap =
        Boolean(
          child.querySelector?.(
            ".leaflet-container"
          )
        );

      const parentHasMap =
        Boolean(
          parent.querySelector?.(
            ".leaflet-container"
          )
        );

      if (
        !childHasMap &&
        parentHasMap
      ) {
        const sidebar = child;
        const shell = parent;

        const leaflet =
          shell.querySelector(
            ".leaflet-container"
          );

        let mapPane = null;

        if (leaflet) {
          mapPane =
            Array.from(
              shell.children || []
            ).find(item =>
              item !== sidebar &&
              Boolean(
                item.querySelector?.(
                  ".leaflet-container"
                )
              )
            ) || null;

          if (!mapPane) {
            let node = leaflet;

            while (
              node.parentElement &&
              node.parentElement !== shell
            ) {
              node = node.parentElement;
            }

            mapPane =
              node !== sidebar
                ? node
                : null;
          }
        }

        return {
          sidebar,
          shell,
          leaflet,
          mapPane
        };
      }

      child = parent;
    }

    return null;
  }

  function clearDynamicFix(layout) {
    const target =
      layout?.mapPane;

    if (!target) {
      return;
    }

    target.style.removeProperty(
      "--bp-sidebar-gap"
    );

    target.style.removeProperty(
      "margin-left"
    );

    target.style.removeProperty(
      "width"
    );

    target.style.removeProperty(
      "max-width"
    );

    target.classList.remove(
      "bp-map-gap-dynamic-fix"
    );
  }

  function invalidateMap() {
    try {
      const map =
        window.BiciParkMapTools
          ?.getMap?.();

      if (map) {
        map.invalidateSize(false);
      }
    } catch (_) {}
  }

  function repairGap() {
    if (
      window.innerWidth < 1100
    ) {
      return false;
    }

    const layout =
      findLayout();

    if (
      !layout?.sidebar ||
      !layout?.leaflet ||
      !layout?.mapPane
    ) {
      return false;
    }

    layout.sidebar.classList.add(
      "bp-map-compact-sidebar"
    );

    layout.shell.classList.add(
      "bp-map-compact-shell"
    );

    layout.mapPane.classList.add(
      "bp-map-compact-map-pane"
    );

    /*
     * First remove the previous dynamic offset so the measurement
     * always reflects the real/native layout.
     */
    clearDynamicFix(layout);

    const sidebarRect =
      layout.sidebar
        .getBoundingClientRect();

    const leafletRect =
      layout.leaflet
        .getBoundingClientRect();

    const gap =
      Math.round(
        leafletRect.left -
        sidebarRect.right
      );

    /*
     * Only repair plausible accidental gaps.
     * This avoids touching intentional mobile/other layouts.
     */
    if (
      gap > 2 &&
      gap < 260
    ) {
      layout.mapPane.style.setProperty(
        "--bp-sidebar-gap",
        gap + "px"
      );

      layout.mapPane.classList.add(
        "bp-map-gap-dynamic-fix"
      );

      /*
       * Inline fallback because the real project has accumulated
       * several layout generations. This works in flex and grid.
       */
      layout.mapPane.style.setProperty(
        "margin-left",
        "-" + gap + "px",
        "important"
      );

      layout.mapPane.style.setProperty(
        "width",
        "calc(100% + " +
          gap +
          "px)",
        "important"
      );

      layout.mapPane.style.setProperty(
        "max-width",
        "none",
        "important"
      );

      console.info(
        "[BiciPark Sidebar] Gap reparat:",
        gap,
        "px"
      );
    }

    setTimeout(
      invalidateMap,
      30
    );

    setTimeout(
      invalidateMap,
      150
    );

    setTimeout(
      invalidateMap,
      350
    );

    return true;
  }

  function scheduleRepair() {
    clearTimeout(
      resizeTimer
    );

    resizeTimer =
      setTimeout(
        repairGap,
        80
      );
  }

  function boot() {
    let tries = 0;

    const timer =
      setInterval(
        () => {
          tries++;

          if (
            repairGap() ||
            tries > 50
          ) {
            clearInterval(timer);
          }
        },
        120
      );

    window.addEventListener(
      "resize",
      scheduleRepair
    );

    window.addEventListener(
      "load",
      scheduleRepair
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