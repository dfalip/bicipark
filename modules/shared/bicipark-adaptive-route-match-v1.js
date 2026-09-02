(() => {
  "use strict";

  if (window.BiciParkAdaptiveRouteMatch) {
    return;
  }

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const PROFILE_KEY =
    "bicipark.routeMatch.profile.v1";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const UPDATED_EVENT =
    "bicipark:adaptive-route-match:updated";

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

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
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

  function activities() {
    if (
      window.BiciParkActivitySync
    ) {
      return window
        .BiciParkActivitySync
        .getActivities({
          includeDemo: false
        });
    }

    const list =
      readJson(
        ACTIVITY_KEY,
        []
      );

    return Array.isArray(list)
      ? list.filter(
          item =>
            item &&
            item.demo !== true
        )
      : [];
  }

  function profile() {
    if (
      window.BiciParkRiderProfile
        ?.get
    ) {
      return window
        .BiciParkRiderProfile
        .get();
    }

    return readJson(
      PROFILE_KEY,
      {
        level: "Principiant",
        daysPerWeek: 3,
        goal: "millorar",
        terrain: "Carretera + Gravel",
        usualDistanceMin: 15,
        usualDistanceMax: 30,
        usualElevationMin: 100,
        usualElevationMax: 400
      }
    );
  }

  function planRoutes() {
    const plan =
      readJson(
        PLAN_KEY,
        {
          routes: []
        }
      );

    return Array.isArray(
      plan.routes
    )
      ? plan.routes
      : [];
  }

  function routeCatalog() {
    const source =
      window.BiciParkRouteDetailData ||
      {};

    const catalog =
      Object.keys(source)
        .map(
          key => {
            const route =
              source[key];

            if (
              !route ||
              typeof route !==
              "object"
            ) {
              return null;
            }

            return normalizeRoute({
              id:
                route.id ||
                key,
              ...route
            });
          }
        )
        .filter(Boolean);

    if (catalog.length) {
      return dedupeRoutes(
        catalog
      );
    }

    return dedupeRoutes(
      planRoutes()
        .map(
          normalizeRoute
        )
        .filter(Boolean)
    );
  }

  function dedupeRoutes(routes) {
    const seen =
      new Set();

    return routes.filter(
      route => {
        const key =
          clean(
            route.id ||
            route.name
          )
            .toLowerCase();

        if (
          !key ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);
        return true;
      }
    );
  }

  function normalizeRoute(route) {
    if (!route) {
      return null;
    }

    const distance =
      num(
        route.distanceKm ??
        route.distance ??
        route.km ??
        route.lengthKm
      );

    const ascent =
      num(
        route.ascentM ??
        route.ascent ??
        route.elevationGain ??
        route.elevation ??
        route.positiveElevation
      );

    return {
      ...route,

      id:
        clean(
          route.id ||
          route.slug ||
          route.name
        ),

      name:
        clean(
          route.name ||
          route.title ||
          "Ruta"
        ),

      distanceKm:
        distance,

      ascentM:
        ascent,

      modality:
        clean(
          route.modality ||
          route.type ||
          route.discipline ||
          "Ciclisme"
        ),

      difficultyLabel:
        clean(
          route.difficultyLabel ||
          route.difficulty ||
          ""
        ),

      compatibilityScore:
        num(
          route.compatibilityScore,
          0
        )
    };
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
      return (
        Number(
          hours[1]
            .replace(",", ".")
        ) *
        60
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

  function recentList(limit = 10) {
    return [...activities()]
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
      )
      .slice(
        0,
        limit
      );
  }

  function average(list, accessor) {
    const values =
      list
        .map(accessor)
        .map(Number)
        .filter(
          Number.isFinite
        );

    if (!values.length) {
      return 0;
    }

    return values.reduce(
      (a, b) =>
        a +
        b,
      0
    ) /
    values.length;
  }

  function ridesLastDays(days) {
    const now =
      new Date();

    return activities()
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

          const age =
            (
              now -
              date
            ) /
            86400000;

          return (
            age >= 0 &&
            age <= days
          );
        }
      )
      .length;
  }

  function confidence(count) {
    if (count <= 0) {
      return {
        code: "none",
        label: "Sense dades",
        weight: 0
      };
    }

    if (count <= 2) {
      return {
        code: "low",
        label: "Baixa",
        weight: .20
      };
    }

    if (count <= 5) {
      return {
        code: "medium",
        label: "Mitjana",
        weight: .48
      };
    }

    return {
      code: "high",
      label: "Alta",
      weight: .72
    };
  }

  function manualTargets(p) {
    const minDistance =
      num(
        p.usualDistanceMin,
        15
      );

    const maxDistance =
      num(
        p.usualDistanceMax,
        Math.max(
          minDistance,
          30
        )
      );

    const minAscent =
      num(
        p.usualElevationMin,
        100
      );

    const maxAscent =
      num(
        p.usualElevationMax,
        Math.max(
          minAscent,
          400
        )
      );

    return {
      distanceKm:
        (
          minDistance +
          maxDistance
        ) /
        2,

      ascentM:
        (
          minAscent +
          maxAscent
        ) /
        2
    };
  }

  function observedMetrics() {
    const p =
      profile();

    const list =
      recentList(10);

    const conf =
      confidence(
        list.length
      );

    const manual =
      manualTargets(p);

    const avgDistance =
      average(
        list.filter(
          item =>
            num(
              item.distanceKm
            ) >
            0
        ),
        item =>
          item.distanceKm
      );

    const avgAscent =
      average(
        list.filter(
          item =>
            num(
              item.ascentM
            ) >=
            0
        ),
        item =>
          item.ascentM
      );

    const avgFeeling =
      average(
        list.filter(
          item =>
            num(
              item.feeling
            ) >
            0
        ),
        item =>
          item.feeling
      );

    const avgMatch =
      average(
        list.filter(
          item =>
            num(
              item.matchScore
            ) >
            0
        ),
        item =>
          item.matchScore
      );

    const rides28 =
      ridesLastDays(28);

    const observedDistance =
      avgDistance ||
      manual.distanceKm;

    const observedAscent =
      avgAscent ||
      manual.ascentM;

    const performanceIndex =
      (
        .45 *
        clamp(
          observedDistance /
          30,
          0,
          2.5
        )
      ) +
      (
        .35 *
        clamp(
          observedAscent /
          500,
          0,
          2.5
        )
      ) +
      (
        .20 *
        clamp(
          rides28 /
          4,
          0,
          2
        )
      );

    let observedLevel;

    if (
      performanceIndex <
      .55
    ) {
      observedLevel =
        "Principiant";
    }
    else if (
      performanceIndex <
      .90
    ) {
      observedLevel =
        "Principiant avan\u00e7at";
    }
    else if (
      performanceIndex <
      1.25
    ) {
      observedLevel =
        "Intermedi inicial";
    }
    else if (
      performanceIndex <
      1.75
    ) {
      observedLevel =
        "Intermedi";
    }
    else {
      observedLevel =
        "Avan\u00e7at";
    }

    let loadSignal =
      "estable";

    if (
      list.length >= 2 &&
      avgFeeling > 0 &&
      avgFeeling <= 2.6
    ) {
      loadSignal =
        "reduir";
    }
    else if (
      list.length >= 3 &&
      avgFeeling >= 4.2
    ) {
      loadSignal =
        "progressar";
    }

    return {
      count:
        list.length,

      confidence:
        conf,

      manualLevel:
        clean(
          p.level ||
          "Principiant"
        ),

      observedLevel,

      avgDistanceKm:
        observedDistance,

      avgAscentM:
        observedAscent,

      avgFeeling,

      avgMatch,

      rides28,

      loadSignal,

      performanceIndex
    };
  }

  function modalityScore(route, p) {
    const preferred =
      clean(
        p.terrain ||
        p.modality ||
        ""
      )
        .toLowerCase();

    const modality =
      clean(
        route.modality
      )
        .toLowerCase();

    if (
      !preferred ||
      !modality
    ) {
      return 88;
    }

    if (
      preferred.includes(
        modality
      ) ||
      modality.includes(
        preferred
      )
    ) {
      return 100;
    }

    if (
      preferred.includes(
        "carretera"
      ) &&
      modality.includes(
        "road"
      )
    ) {
      return 100;
    }

    return 82;
  }

  function proximityScore(
    value,
    target,
    maxPenalty
  ) {
    if (
      value <= 0 ||
      target <= 0
    ) {
      return 82;
    }

    const relative =
      Math.abs(
        value -
        target
      ) /
      Math.max(
        target,
        1
      );

    return clamp(
      100 -
      relative *
      maxPenalty,
      35,
      100
    );
  }

  function adaptiveScore(routeInput) {
    const route =
      normalizeRoute(
        routeInput
      );

    const p =
      profile();

    const observed =
      observedMetrics();

    const manual =
      manualTargets(p);

    const confidenceWeight =
      observed
        .confidence
        .weight;

    const targetDistance =
      (
        manual.distanceKm *
        (
          1 -
          confidenceWeight
        )
      ) +
      (
        observed.avgDistanceKm *
        confidenceWeight
      );

    const targetAscent =
      (
        manual.ascentM *
        (
          1 -
          confidenceWeight
        )
      ) +
      (
        observed.avgAscentM *
        confidenceWeight
      );

    const distanceScore =
      proximityScore(
        route.distanceKm,
        targetDistance,
        58
      );

    const ascentScore =
      proximityScore(
        route.ascentM,
        targetAscent,
        52
      );

    const modeScore =
      modalityScore(
        route,
        p
      );

    let adaptive =
      (
        distanceScore *
        .45
      ) +
      (
        ascentScore *
        .38
      ) +
      (
        modeScore *
        .17
      );

    if (
      observed.avgFeeling >=
      4.2
    ) {
      adaptive += 3;
    }
    else if (
      observed.avgFeeling > 0 &&
      observed.avgFeeling <=
      2.6
    ) {
      adaptive -= 7;
    }

    if (
      observed.loadSignal ===
      "reduir" &&
      route.distanceKm >
      targetDistance *
      1.15
    ) {
      adaptive -= 7;
    }

    const manualBase =
      route.compatibilityScore >
      0
        ? route.compatibilityScore
        : 78;

    const score =
      clamp(
        Math.round(
          manualBase *
          (
            1 -
            confidenceWeight
          ) +
          adaptive *
          confidenceWeight
        ),
        1,
        99
      );

    return {
      score,
      adaptiveRaw:
        Math.round(
          adaptive
        ),
      manualBase,
      confidence:
        observed.confidence,
      observed,
      targetDistanceKm:
        targetDistance,
      targetAscentM:
        targetAscent
    };
  }

  function progressionReason(
    route,
    result
  ) {
    const observed =
      result.observed;

    const distanceBase =
      Math.max(
        observed.avgDistanceKm,
        1
      );

    const ascentBase =
      Math.max(
        observed.avgAscentM,
        50
      );

    const distanceDelta =
      (
        route.distanceKm -
        distanceBase
      ) /
      distanceBase *
      100;

    const ascentDelta =
      (
        route.ascentM -
        ascentBase
      ) /
      ascentBase *
      100;

    if (
      observed.confidence.code ===
      "low"
    ) {
      return "Recomanaci\u00f3 provisional: encara estem aprenent del teu historial.";
    }

    if (
      observed.loadSignal ===
      "reduir"
    ) {
      return "Prioritza una sortida controlada: les \u00faltimes sensacions indiquen c\u00e0rrega elevada.";
    }

    if (
      distanceDelta >= 5 &&
      distanceDelta <= 20 &&
      Math.abs(
        ascentDelta
      ) <= 25
    ) {
      return (
        "+" +
        Math.round(
          distanceDelta
        ) +
        "% de dist\u00e0ncia amb desnivell similar: bona progressi\u00f3."
      );
    }

    if (
      Math.abs(
        distanceDelta
      ) <= 12 &&
      ascentDelta > 5 &&
      ascentDelta <= 25
    ) {
      return "Dist\u00e0ncia similar amb una mica m\u00e9s de desnivell: progressi\u00f3 controlada.";
    }

    if (
      result.score >=
      88
    ) {
      return "Molt bona compatibilitat amb el teu nivell observat.";
    }

    return "Opcio coherent amb el teu perfil i les activitats registrades.";
  }

  function recommendations(limit = 3) {
    const observed =
      observedMetrics();

    const recent =
      recentList(1);

    const lastName =
      clean(
        recent[0]
          ?.name
      )
        .toLowerCase();

    let candidates =
      routeCatalog()
        .filter(
          route =>
            route.distanceKm >
            0
        );

    if (
      candidates.length >
      limit &&
      lastName
    ) {
      candidates =
        candidates.filter(
          route =>
            clean(
              route.name
            )
              .toLowerCase() !==
            lastName
        );
    }

    return candidates
      .map(
        route => {
          const result =
            adaptiveScore(
              route
            );

          return {
            route,
            score:
              result.score,
            reason:
              progressionReason(
                route,
                result
              ),
            confidence:
              result.confidence,
            result
          };
        }
      )
      .sort(
        (a, b) => {
          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }

          return (
            a.route
              .distanceKm -
            b.route
              .distanceKm
          );
        }
      )
      .slice(
        0,
        limit
      );
  }

  function previousPeriodAvailable(
    days = 28
  ) {
    const now =
      new Date();

    return activities()
      .some(
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

          const age =
            (
              now -
              date
            ) /
            86400000;

          return (
            age >
            days &&
            age <=
            days *
            2
          );
        }
      );
  }

  function refreshEvent() {
    window.dispatchEvent(
      new CustomEvent(
        UPDATED_EVENT,
        {
          detail:
            observedMetrics()
        }
      )
    );
  }

  window.addEventListener(
    "bicipark:activity-history:updated",
    refreshEvent
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
        PLAN_KEY
      ) {
        refreshEvent();
      }
    }
  );

  window.BiciParkAdaptiveRouteMatch = {
    observedMetrics,
    adaptiveScore,
    recommendations,
    routeCatalog,
    normalizeRoute,
    previousPeriodAvailable,
    UPDATED_EVENT
  };
})();