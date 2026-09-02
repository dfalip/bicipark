(() => {
  "use strict";

  if (window.__BICIPARK_ACTIVITY_HISTORY_POLISH_V11__) {
    return;
  }

  window.__BICIPARK_ACTIVITY_HISTORY_POLISH_V11__ = true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const PROFILE_KEY =
    "bicipark.routeMatch.profile.v1";

  const MY_PLAN_STATE_KEY =
    "bicipark.myPlan.state.v1";

  const WEEK_LABELS = [
    "Adaptaci\u00f3",
    "Construcci\u00f3",
    "Consolidaci\u00f3",
    "Objectiu"
  ];

  function byId(id) {
    return document.getElementById(id);
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

  function writeJson(key, value) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  function daysPerWeek() {
    const profile =
      readJson(
        PROFILE_KEY,
        {}
      );

    return Math.max(
      1,
      Math.min(
        5,
        num(
          profile.daysPerWeek,
          3
        )
      )
    );
  }

  function planState() {
    return readJson(
      MY_PLAN_STATE_KEY,
      {
        currentWeek: 1,
        selectedWeek: 1,
        completedWeeks: [],
        sessions: {}
      }
    );
  }

  function completedCountForWeek(
    progress,
    week
  ) {
    const prefix =
      "w" +
      week +
      ":";

    return Object.keys(
      progress.sessions ||
      {}
    )
      .filter(
        key =>
          key.startsWith(
            prefix
          ) &&
          progress.sessions[key] ===
          true
      )
      .length;
  }

  function deriveCurrentWeek(
    progress
  ) {
    const expected =
      daysPerWeek();

    for (
      let week = 1;
      week <= 4;
      week++
    ) {
      const done =
        completedCountForWeek(
          progress,
          week
        );

      if (done < expected) {
        return week;
      }
    }

    return 4;
  }

  function totalCompletedSessions(
    progress
  ) {
    return Object.values(
      progress.sessions ||
      {}
    )
      .filter(
        Boolean
      )
      .length;
  }

  function normalizePlanState() {
    const progress =
      planState();

    const derived =
      deriveCurrentWeek(
        progress
      );

    const oldWeek =
      Math.max(
        1,
        Math.min(
          4,
          num(
            progress.currentWeek,
            1
          )
        )
      );

    /*
     * currentWeek is progress state, not the tab the user is previewing.
     * Repair stale test state when it disagrees with completed sessions.
     * selectedWeek is deliberately left untouched.
     */
    if (oldWeek !== derived) {
      progress.currentWeek =
        derived;

      progress.updatedAt =
        new Date()
          .toISOString();

      writeJson(
        MY_PLAN_STATE_KEY,
        progress
      );

      window.dispatchEvent(
        new CustomEvent(
          "bicipark:my-plan:normalized",
          {
            detail: {
              previousWeek:
                oldWeek,
              currentWeek:
                derived
            }
          }
        )
      );
    }

    return {
      progress,
      currentWeek:
        derived
    };
  }

  function renderCorrectPlanProgress() {
    const {
      progress,
      currentWeek
    } =
      normalizePlanState();

    const expected =
      daysPerWeek();

    const total =
      expected *
      4;

    const completed =
      totalCompletedSessions(
        progress
      );

    const percent =
      Math.min(
        100,
        Math.round(
          (
            completed /
            total
          ) *
          100
        )
      );

    const weekNode =
      byId(
        "bp-plan-week"
      );

    const percentNode =
      byId(
        "bp-plan-percent"
      );

    const bar =
      byId(
        "bp-plan-bar"
      );

    const caption =
      byId(
        "bp-plan-caption"
      );

    if (weekNode) {
      weekNode.textContent =
        "Setmana " +
        currentWeek +
        " de 4 \u00b7 " +
        WEEK_LABELS[
          currentWeek - 1
        ];
    }

    if (percentNode) {
      percentNode.textContent =
        percent +
        "%";
    }

    if (bar) {
      bar.style.width =
        percent +
        "%";
    }

    if (caption) {
      caption.textContent =
        completed +
        " de " +
        total +
        " sessions completades";
    }
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

  function hasDemoActivities() {
    return activities()
      .some(
        activity =>
          activity &&
          activity.demo ===
          true
      );
  }

  function renderDemoKpis() {
    const ids = [
      "bp-kpi-rides-delta",
      "bp-kpi-time-delta",
      "bp-kpi-ascent-delta",
      "bp-kpi-distance-delta",
      "bp-kpi-level-delta"
    ];

    if (!hasDemoActivities()) {
      ids.forEach(
        id => {
          byId(id)
            ?.classList
            .remove(
              "bp-demo-kpi-label"
            );
        }
      );

      return;
    }

    ids.forEach(
      id => {
        const node =
          byId(id);

        if (!node) {
          return;
        }

        node.textContent =
          "Dades de mostra";

        node.classList.add(
          "bp-demo-kpi-label"
        );
      }
    );

    const chartDelta =
      byId(
        "bp-chart-delta"
      );

    if (chartDelta) {
      chartDelta.textContent =
        "Dades de mostra";

      chartDelta.classList.add(
        "bp-demo-kpi-label"
      );
    }
  }

  function refreshPolish() {
    /*
     * Run after Activity History's own render cycle.
     * No MutationObserver: finite refreshes only.
     */
    window.setTimeout(
      () => {
        renderCorrectPlanProgress();
        renderDemoKpis();
      },
      0
    );
  }

  function boot() {
    refreshPolish();

    window.addEventListener(
      "bicipark:activity-history:updated",
      refreshPolish
    );

    window.addEventListener(
      "bicipark:my-plan:normalized",
      refreshPolish
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          ACTIVITY_KEY ||
          event.key ===
          PROFILE_KEY ||
          event.key ===
          MY_PLAN_STATE_KEY
        ) {
          refreshPolish();
        }
      }
    );

    console.info(
      "[BiciPark] Activity History polish v1.1 loaded"
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