(() => {
  "use strict";

  if (
    window.__BICIPARK_ACTIVITY_SYNC_V12__
  ) {
    return;
  }

  window.__BICIPARK_ACTIVITY_SYNC_V12__ =
    true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const MIGRATION_KEY =
    "bicipark.activitySync.migration.v1_2";

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function num(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function readJson(key, fallback) {
    try {
      const raw =
        localStorage.getItem(key);

      return raw
        ? JSON.parse(raw)
        : fallback;
    }
    catch (_) {
      return fallback;
    }
  }

  function writeActivities(list) {
    if (
      window.BiciParkActivitySync
    ) {
      window
        .BiciParkActivitySync
        .writeActivities(list);

      return;
    }

    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(list)
    );

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:activity-history:updated",
        {
          detail: {
            activities: list
          }
        }
      )
    );
  }

  function activities() {
    if (
      window.BiciParkActivitySync
    ) {
      return window
        .BiciParkActivitySync
        .getActivities({
          includeDemo: true
        });
    }

    return readJson(
      ACTIVITY_KEY,
      []
    );
  }

  function realActivities() {
    return activities()
      .filter(
        activity =>
          activity &&
          activity.demo !== true
      );
  }

  function hasDemo() {
    return activities()
      .some(
        activity =>
          activity &&
          activity.demo === true
      );
  }

  function parseMinutes(text) {
    const value =
      clean(text);

    const colon =
      value.match(
        /(\d+)\s*:\s*(\d+)/
      );

    if (colon) {
      return (
        Number(colon[1]) *
        60 +
        Number(colon[2])
      );
    }

    const hours =
      value.match(
        /(\d+(?:[.,]\d+)?)\s*h/
      );

    if (hours) {
      return Math.round(
        Number(
          hours[1]
            .replace(",", ".")
        ) *
        60
      );
    }

    const range =
      value.match(
        /(\d+)\s*-\s*(\d+)\s*min/
      );

    if (range) {
      return Math.round(
        (
          Number(range[1]) +
          Number(range[2])
        ) /
        2
      );
    }

    const minutes =
      value.match(
        /(\d+)\s*min/
      );

    return minutes
      ? Number(minutes[1])
      : 0;
  }

  function formatMinutes(minutes) {
    const total =
      Math.max(
        0,
        Math.round(
          num(minutes)
        )
      );

    const h =
      Math.floor(
        total / 60
      );

    const m =
      total % 60;

    if (!h) {
      return (
        total +
        " min"
      );
    }

    return (
      h +
      ":" +
      String(m)
        .padStart(2, "0") +
      " h"
    );
  }

  function malformedDuration(activity) {
    const duration =
      clean(
        activity?.duration
      );

    if (!duration) {
      return false;
    }

    return (
      /\bkm\b/i.test(
        duration
      ) ||
      (
        duration
          .replace(",", ".")
          .match(
            /^\s*\d+(?:\.\d+)?\s*$/
          ) &&
        num(
          duration
            .replace(",", ".")
        ) ===
        num(
          activity.distanceKm
        )
      )
    );
  }

  function planRouteFor(activity) {
    const plan =
      readJson(
        PLAN_KEY,
        {
          routes: []
        }
      );

    const routes =
      Array.isArray(
        plan.routes
      )
        ? plan.routes
        : [];

    const activityName =
      clean(
        activity.name
      )
        .toLowerCase();

    return (
      routes.find(
        route =>
          clean(
            route.name
          )
            .toLowerCase() ===
          activityName
      ) ||
      routes.find(
        route =>
          route.id &&
          activity.routeId &&
          route.id ===
          activity.routeId
      ) ||
      null
    );
  }

  function migrateMalformedDurations() {
    if (
      localStorage.getItem(
        MIGRATION_KEY
      ) ===
      "done"
    ) {
      return false;
    }

    const list =
      activities();

    let changed =
      false;

    list.forEach(
      activity => {
        if (
          activity.demo === true ||
          !malformedDuration(
            activity
          )
        ) {
          return;
        }

        const route =
          planRouteFor(
            activity
          );

        const routeMinutes =
          parseMinutes(
            route
              ?.estimatedTime
          );

        const routeDistance =
          num(
            route
              ?.distanceKm
          );

        const actualDistance =
          num(
            activity
              .distanceKm
          );

        if (
          routeMinutes > 0 &&
          routeDistance > 0 &&
          actualDistance > 0
        ) {
          const estimated =
            Math.round(
              routeMinutes *
              (
                actualDistance /
                routeDistance
              )
            );

          activity.duration =
            "~" +
            formatMinutes(
              estimated
            );

          activity.durationEstimated =
            true;

          activity.durationNeedsReview =
            false;
        }
        else {
          /*
           * Never invent real performance data if we cannot derive
           * a reasonable estimate from the known route.
           */
          activity.duration =
            "";

          activity.durationEstimated =
            false;

          activity.durationNeedsReview =
            true;
        }

        activity.updatedAt =
          new Date()
            .toISOString();

        changed =
          true;
      }
    );

    localStorage.setItem(
      MIGRATION_KEY,
      "done"
    );

    if (changed) {
      writeActivities(list);
    }

    return changed;
  }

  function removeStaleDemoBanner() {
    if (hasDemo()) {
      return;
    }

    document
      .querySelectorAll(
        ".bp-demo-banner"
      )
      .forEach(
        node =>
          node.remove()
      );
  }

  function findActivityRows() {
    const body =
      document.getElementById(
        "bp-activity-body"
      );

    if (!body) {
      return [];
    }

    return Array.from(
      body.querySelectorAll(
        "tr"
      )
    );
  }

  function decorateDurationCells() {
    const list =
      [...realActivities()]
        .sort(
          (a, b) =>
            new Date(
              b.date +
              "T" +
              (
                b.time ||
                "12:00"
              )
            ) -
            new Date(
              a.date +
              "T" +
              (
                a.time ||
                "12:00"
              )
            )
        );

    const rows =
      findActivityRows();

    rows.forEach(
      row => {
        const cells =
          row.querySelectorAll(
            "td"
          );

        if (
          cells.length < 5
        ) {
          return;
        }

        const routeText =
          clean(
            cells[1]
              .textContent
          )
            .toLowerCase();

        const dateText =
          clean(
            cells[0]
              .textContent
          );

        const activity =
          list.find(
            item =>
              routeText.includes(
                clean(
                  item.name
                )
                  .toLowerCase()
              )
          );

        if (!activity) {
          return;
        }

        const durationCell =
          cells[4];

        durationCell
          .classList
          .remove(
            "bp-history-duration-estimated",
            "bp-history-duration-pending"
          );

        if (
          activity.durationNeedsReview
        ) {
          durationCell.textContent =
            "Pendent";

          durationCell.classList.add(
            "bp-history-duration-pending"
          );
        }
        else if (
          activity.durationEstimated
        ) {
          durationCell.classList.add(
            "bp-history-duration-estimated"
          );
        }
      }
    );
  }

  function feelingCard() {
    const score =
      document.getElementById(
        "bp-feeling-score"
      );

    return score
      ?.closest(
        ".bp-progress-card"
      ) ||
      null;
  }

  function updateFeelingCaption() {
    const list =
      realActivities()
        .sort(
          (a, b) =>
            new Date(
              b.date +
              "T" +
              (
                b.time ||
                "12:00"
              )
            ) -
            new Date(
              a.date +
              "T" +
              (
                a.time ||
                "12:00"
              )
            )
        );

    const usable =
      list
        .filter(
          activity =>
            Number.isFinite(
              Number(
                activity.feeling
              )
            )
        )
        .slice(
          0,
          10
        );

    const card =
      feelingCard();

    const caption =
      card
        ?.querySelector(
          ":scope > small"
        );

    if (!caption) {
      return;
    }

    if (
      usable.length ===
      0
    ) {
      caption.textContent =
        "Encara no hi ha sensacions registrades.";
    }
    else if (
      usable.length ===
      1
    ) {
      caption.textContent =
        "Basat en 1 sortida";
    }
    else {
      caption.textContent =
        "Basat en " +
        usable.length +
        " sortides";
    }
  }

  function weeklyMatchData() {
    const now =
      new Date();

    const result =
      [];

    for (
      let index = 0;
      index < 4;
      index++
    ) {
      const start =
        new Date(now);

      start.setHours(
        0,
        0,
        0,
        0
      );

      start.setDate(
        start.getDate() -
        (
          27 -
          index *
          7
        )
      );

      const end =
        new Date(start);

      end.setDate(
        end.getDate() +
        6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      const values =
        realActivities()
          .filter(
            activity => {
              const date =
                new Date(
                  activity.date +
                  "T" +
                  (
                    activity.time ||
                    "12:00"
                  )
                );

              return (
                date >=
                start &&
                date <=
                end &&
                Number.isFinite(
                  Number(
                    activity.matchScore
                  )
                )
              );
            }
          )
          .map(
            activity =>
              Number(
                activity.matchScore
              )
          );

      result.push(
        values.length
          ? values.reduce(
              (a, b) =>
                a +
                b,
              0
            ) /
            values.length
          : null
      );
    }

    return result;
  }

  function redrawRealChart() {
    const svg =
      document.getElementById(
        "bp-level-chart"
      );

    const line =
      document.getElementById(
        "bp-chart-line"
      );

    const pointGroup =
      document.getElementById(
        "bp-chart-points"
      );

    if (
      !svg ||
      !line ||
      !pointGroup
    ) {
      return;
    }

    const values =
      weeklyMatchData();

    const points =
      [];

    values.forEach(
      (value, index) => {
        if (
          value == null
        ) {
          return;
        }

        const x =
          60 +
          index *
          85;

        const bounded =
          Math.max(
            25,
            Math.min(
              100,
              value
            )
          );

        const y =
          108 -
          (
            bounded -
            25
          ) *
          1.2;

        points.push({
          index,
          value,
          x,
          y
        });
      }
    );

    /*
     * Never connect missing weeks as if they had data.
     * A line is only drawn between consecutive populated weeks.
     */
    if (
      points.length >=
      2 &&
      points.every(
        (point, position) =>
          position === 0 ||
          point.index ===
          points[
            position - 1
          ].index +
          1
      )
    ) {
      line.setAttribute(
        "points",
        points
          .map(
            point =>
              point.x +
              "," +
              point.y
          )
          .join(" ")
      );
    }
    else {
      line.setAttribute(
        "points",
        ""
      );
    }

    pointGroup.innerHTML =
      "";

    points.forEach(
      (point, position) => {
        const circle =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );

        circle.setAttribute(
          "cx",
          point.x
        );

        circle.setAttribute(
          "cy",
          point.y
        );

        circle.setAttribute(
          "r",
          position ===
          points.length - 1
            ? 4
            : 3
        );

        if (
          position ===
          points.length - 1
        ) {
          circle.setAttribute(
            "class",
            "is-last"
          );
        }

        pointGroup.appendChild(
          circle
        );
      }
    );

    const currentNode =
      document.getElementById(
        "bp-chart-current"
      );

    const deltaNode =
      document.getElementById(
        "bp-chart-delta"
      );

    const card =
      svg.closest(
        ".bp-progress-card"
      );

    let note =
      card
        ?.querySelector(
          ".bp-history-chart-note"
        );

    if (
      !note &&
      card
    ) {
      note =
        document.createElement(
          "p"
        );

      note.className =
        "bp-history-chart-note";

      svg.insertAdjacentElement(
        "afterend",
        note
      );
    }

    if (
      points.length ===
      0
    ) {
      if (currentNode) {
        currentNode.textContent =
          "--";
      }

      if (deltaNode) {
        deltaNode.textContent =
          "Sense dades";
      }

      if (note) {
        note.innerHTML =
          "<strong>Encara no hi ha dades Route Match reals.</strong>";
      }

      return;
    }

    const last =
      points[
        points.length - 1
      ];

    if (currentNode) {
      currentNode.textContent =
        Math.round(
          last.value
        ) +
        "%";
    }

    if (
      points.length ===
      1
    ) {
      if (deltaNode) {
        deltaNode.textContent =
          "Sense tendencia encara";
      }

      if (note) {
        note.textContent =
          "Calen almenys 2 setmanes amb activitat per mostrar una tendencia.";
      }

      return;
    }

    const first =
      points[0];

    const delta =
      Math.round(
        last.value -
        first.value
      );

    if (deltaNode) {
      deltaNode.textContent =
        (
          delta >= 0
            ? "\u2197 +"
            : "\u2198 "
        ) +
        delta +
        "%";
    }

    if (note) {
      note.textContent =
        "Tendencia calculada nomes amb setmanes que tenen activitat real.";
    }
  }

  function refresh() {
    window.setTimeout(
      () => {
        removeStaleDemoBanner();
        updateFeelingCaption();
        redrawRealChart();
        decorateDurationCells();
      },
      30
    );
  }

  function boot() {
    const migrated =
      migrateMalformedDurations();

    refresh();

    window.addEventListener(
      "bicipark:activity-history:updated",
      refresh
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          ACTIVITY_KEY ||
          event.key ===
          PLAN_KEY
        ) {
          refresh();
        }
      }
    );

    if (migrated) {
      window.setTimeout(
        () => {
          if (
            typeof window
              .BiciParkActivityHistoryRefresh ===
            "function"
          ) {
            window
              .BiciParkActivityHistoryRefresh();
          }

          refresh();
        },
        60
      );
    }

    console.info(
      "[BiciPark] Activity Sync v1.2 loaded"
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
  }
  else {
    boot();
  }
})();