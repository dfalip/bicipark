(() => {
  "use strict";

  if (window.__BICIPARK_WEATHER_ENHANCER_V2__) {
    return;
  }

  window.__BICIPARK_WEATHER_ENHANCER_V2__ = true;

  let queryApplied = false;
  let updateTimer = null;

  function numberFromText(value) {
    const match =
      String(value || "")
        .replace(",", ".")
        .match(/-?\d+(?:\.\d+)?/);

    return match
      ? Number(match[0])
      : null;
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function applyRouteFromQuery() {
    if (queryApplied) {
      return;
    }

    const routeId =
      new URLSearchParams(
        location.search
      ).get("route");

    if (!routeId) {
      queryApplied = true;
      return;
    }

    const select =
      document.getElementById(
        "routeSelect"
      );

    if (!select?.options?.length) {
      return;
    }

    const option =
      Array.from(
        select.options
      ).find(current =>
        current.value === routeId
      );

    queryApplied = true;

    if (!option) {
      return;
    }

    if (
      select.value !==
      routeId
    ) {
      select.value =
        routeId;

      select.dispatchEvent(
        new Event(
          "change",
          {
            bubbles: true
          }
        )
      );
    }
  }

  function directionalAdjustment() {
    const segments =
      Array.from(
        document.querySelectorAll(
          ".wr-wind-badge"
        )
      );

    if (!segments.length) {
      return {
        adjustment: 0,
        label: ""
      };
    }

    let head = 0;
    let tail = 0;
    let cross = 0;

    segments.forEach(segment => {
      if (
        segment.classList
          .contains("wr-head")
      ) {
        head++;
      } else if (
        segment.classList
          .contains("wr-tail")
      ) {
        tail++;
      } else {
        cross++;
      }
    });

    const count =
      segments.length;

    const headRatio =
      head / count;

    const tailRatio =
      tail / count;

    const crossRatio =
      cross / count;

    const wind =
      numberFromText(
        document.getElementById(
          "windValue"
        )?.textContent
      ) || 0;

    const intensity =
      clamp(
        wind / 30,
        0,
        1.4
      );

    const adjustment =
      Math.round(
        (
          -18 * headRatio +
          5 * tailRatio -
          3 * crossRatio
        ) *
        intensity
      );

    let label =
      "Vent lateral predominant";

    if (
      head >= tail &&
      head >= cross
    ) {
      label =
        "Vent de cara predominant";
    } else if (
      tail >= head &&
      tail >= cross
    ) {
      label =
        "Vent favorable predominant";
    }

    return {
      adjustment,
      label
    };
  }

  function enhanceScore() {
    const scoreNode =
      document.getElementById(
        "rideScore"
      );

    const labelNode =
      document.getElementById(
        "rideScoreLabel"
      );

    const windMaxNode =
      document.getElementById(
        "windMax"
      );

    if (
      !scoreNode ||
      !labelNode
    ) {
      return;
    }

    const original =
      numberFromText(
        scoreNode.dataset
          .bpBaseWeatherScore ||
        scoreNode.textContent
      );

    if (original == null) {
      return;
    }

    if (
      !scoreNode.dataset
        .bpBaseWeatherScore
    ) {
      scoreNode.dataset
        .bpBaseWeatherScore =
        String(original);
    }

    const context =
      directionalAdjustment();

    const adjusted =
      clamp(
        original +
        context.adjustment,
        0,
        100
      );

    scoreNode.textContent =
      String(adjusted);

    let label =
      "Condicions millorables";

    if (adjusted >= 85) {
      label =
        "Excel.lent moment per pedalar";
    } else if (
      adjusted >= 70
    ) {
      label =
        "Bones condicions";
    } else if (
      adjusted >= 50
    ) {
      label =
        "Condicions acceptables";
    }

    labelNode.textContent =
      label;

    if (
      windMaxNode &&
      context.label
    ) {
      const clean =
        windMaxNode.textContent
          .split(" | ")[0]
          .trim();

      windMaxNode.textContent =
        clean +
        " | " +
        context.label;
    }
  }

  function scheduleEnhance() {
    if (updateTimer) {
      clearTimeout(
        updateTimer
      );
    }

    updateTimer =
      setTimeout(
        () => {
          applyRouteFromQuery();

          /*
           * The base module may have just recalculated the score.
           * Refresh the stored base score before applying the
           * directional adjustment.
           */
          const scoreNode =
            document.getElementById(
              "rideScore"
            );

          if (scoreNode) {
            const visible =
              numberFromText(
                scoreNode.textContent
              );

            if (
              visible != null &&
              !document.querySelector(
                ".wr-wind-badge"
              )
            ) {
              scoreNode.dataset
                .bpBaseWeatherScore =
                String(visible);
            }
          }

          enhanceScore();
        },
        120
      );
  }

  function boot() {
    applyRouteFromQuery();
    scheduleEnhance();

    window.addEventListener(
      "bicipark:weather-route:updated",
      () => {
        const scoreNode =
          document.getElementById(
            "rideScore"
          );

        if (scoreNode) {
          const base =
            numberFromText(
              scoreNode.textContent
            );

          if (base != null) {
            scoreNode.dataset
              .bpBaseWeatherScore =
              String(base);
          }
        }

        scheduleEnhance();
      }
    );

    const observer =
      new MutationObserver(
        scheduleEnhance
      );

    const root =
      document.querySelector(
        ".wr-page"
      ) ||
      document.body;

    observer.observe(
      root,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
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