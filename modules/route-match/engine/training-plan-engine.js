(() => {
  "use strict";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  function readPlanStore() {
    try {
      const raw =
        localStorage.getItem(
          PLAN_KEY
        );

      if (!raw) {
        return {
          active: false,
          routes: [],
          focusRouteId: null
        };
      }

      const data =
        JSON.parse(raw);

      return {
        active:
          Boolean(
            data.active
          ),

        routes:
          Array.isArray(
            data.routes
          )
            ? data.routes
            : [],

        focusRouteId:
          data.focusRouteId ||
          null
      };
    }
    catch (_) {
      return {
        active: false,
        routes: [],
        focusRouteId: null
      };
    }
  }

  function targetRoute() {
    const store =
      readPlanStore();

    if (!store.routes.length) {
      return null;
    }

    return (
      store.routes.find(
        route =>
          route.id ===
          store.focusRouteId
      ) ||
      store.routes[
        store.routes.length - 1
      ]
    );
  }

  function goalLabel(goal) {
    const labels = {
      millorar:
        "Millorar progressivament",

      dificultat:
        "Incrementar dificultat",

      passejar:
        "Passejar",

      repte:
        "Preparar un repte"
    };

    return (
      labels[goal] ||
      labels.millorar
    );
  }

  function targetDuration(route) {
    if (!route) {
      return "2-3 h";
    }

    if (route.estimatedTime) {
      return route.estimatedTime;
    }

    const km =
      Number(
        route.distanceKm
      );

    if (!Number.isFinite(km)) {
      return "2-3 h";
    }

    const hours =
      clamp(
        km /
        18,
        .75,
        6
      );

    const whole =
      Math.floor(hours);

    const minutes =
      Math.round(
        (
          hours -
          whole
        ) *
        60 /
        5
      ) *
      5;

    if (!whole) {
      return (
        minutes +
        " min"
      );
    }

    return (
      whole +
      " h" +
      (
        minutes
          ? " " +
            minutes +
            " min"
          : ""
      )
    );
  }

  function specificSession(goal) {
    if (goal === "passejar") {
      return {
        type:
          "Pedalada molt suau",
        duration:
          "35-45 min"
      };
    }

    if (goal === "dificultat") {
      return {
        type:
          "Pujades curtes controlades",
        duration:
          "45-55 min"
      };
    }

    if (goal === "repte") {
      return {
        type:
          "Blocs de ritme moderat",
        duration:
          "50-65 min"
      };
    }

    return {
      type:
        "Cadencia + ritme moderat",
      duration:
        "45-60 min"
    };
  }

  function routeSession(route, score) {
    if (!route) {
      return {
        type:
          "Ruta objectiu",
        duration:
          "2-3 h"
      };
    }

    const routeName =
      route.name ||
      "Ruta objectiu";

    if (
      Number.isFinite(
        Number(score)
      ) &&
      Number(score) <
        65
    ) {
      return {
        type:
          "Progressio cap a " +
          routeName,
        duration:
          "60-75% de la ruta"
      };
    }

    return {
      type:
        "Ruta objectiu: " +
        routeName,
      duration:
        targetDuration(route)
    };
  }

  function planFor(profile) {
    const route =
      targetRoute();

    const goal =
      profile?.goal ||
      "millorar";

    const days =
      clamp(
        Number(
          profile?.daysPerWeek ||
          3
        ),
        1,
        7
      );

    const specific =
      specificSession(
        goal
      );

    const target =
      routeSession(
        route,
        route?.compatibilityScore
      );

    const plan = [
      {
        day:
          "Dilluns",
        type:
          "Mobilitat + core",
        duration:
          "15 min",
        priority:
          3
      },
      {
        day:
          "Dimarts",
        type:
          goal ===
          "passejar"
            ? "Pedalada suau"
            : "Base aerobia suau",
        duration:
          "45-60 min",
        priority:
          1
      },
      {
        day:
          "Dimecres",
        type:
          "Descans o caminada",
        duration:
          "30 min",
        priority:
          6
      },
      {
        day:
          "Dijous",
        type:
          specific.type,
        duration:
          specific.duration,
        priority:
          2
      },
      {
        day:
          "Divendres",
        type:
          goal ===
          "dificultat"
            ? "Forca cames + core"
            : "Forca basica + core",
        duration:
          "20-25 min",
        priority:
          4
      },
      {
        day:
          "Dissabte",
        type:
          target.type,
        duration:
          target.duration,
        priority:
          0
      },
      {
        day:
          "Diumenge",
        type:
          "Recuperacio activa",
        duration:
          "30-45 min",
        priority:
          5
      }
    ];

    const active =
      plan
        .filter(item =>
          item.priority <=
          Math.max(
            0,
            days - 1
          )
        );

    /*
     * Route Match currently renders seven rows.
     * Keep rest days explicit instead of returning fewer rows.
     */
    return plan.map(item => {
      const isActive =
        active.includes(item);

      if (
        item.priority === 6
      ) {
        return {
          day:
            item.day,
          type:
            item.type,
          duration:
            item.duration
        };
      }

      if (!isActive) {
        return {
          day:
            item.day,
          type:
            "Descans",
          duration:
            "-"
        };
      }

      return {
        day:
          item.day,
        type:
          item.type,
        duration:
          item.duration
      };
    });
  }

  window.BiciParkTrainingPlanEngine = {
    getPlan:
      planFor,

    getTargetRoute:
      targetRoute,

    getGoalLabel:
      goalLabel
  };
})();