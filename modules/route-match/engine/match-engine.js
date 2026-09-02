(() => {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function goalBonus(route, goal) {
    const tags =
      Array.isArray(route.tags)
        ? route.tags
        : [];

    const rules = {
      millorar: [
        "progressio",
        "resistencia"
      ],
      dificultat: [
        "progressio",
        "resistencia"
      ],
      passejar: [
        "passeig",
        "paisatge",
        "suau"
      ],
      repte: [
        "progressio",
        "resistencia"
      ]
    };

    const wanted =
      rules[goal] ||
      [];

    return wanted.reduce(
      (score, tag) =>
        score +
        (
          tags.includes(tag)
            ? 3
            : 0
        ),
      0
    );
  }

  function distanceScore(route, profile) {
    const km =
      Number(route.distanceKm);

    const min =
      Number(
        profile.usualDistanceMin ||
        0
      );

    const max =
      Number(
        profile.usualDistanceMax ||
        999
      );

    if (
      km >= min &&
      km <= max
    ) {
      return 10;
    }

    const delta =
      km < min
        ? min - km
        : km - max;

    return clamp(
      10 -
      delta * .35,
      0,
      10
    );
  }

  function elevationScore(route, profile) {
    const elevation =
      Number(route.elevationM);

    const min =
      Number(
        profile.usualElevationMin ||
        0
      );

    const max =
      Number(
        profile.usualElevationMax ||
        9999
      );

    if (
      elevation >= min &&
      elevation <= max
    ) {
      return 10;
    }

    const delta =
      elevation < min
        ? min - elevation
        : elevation - max;

    return clamp(
      10 -
      delta / 90,
      0,
      10
    );
  }

  function scoreRoute(route, profile) {
    const base =
      Number(
        route.baseMatch ||
        75
      );

    const score =
      base * .78 +
      distanceScore(
        route,
        profile
      ) *
      1.0 +
      elevationScore(
        route,
        profile
      ) *
      .8 +
      goalBonus(
        route,
        profile.goal
      );

    return clamp(
      Math.round(score),
      1,
      99
    );
  }

  function rank(routes, profile) {
    return routes
      .map(route => ({
        ...route,
        matchScore:
          scoreRoute(
            route,
            profile
          )
      }))
      .sort(
        (a, b) =>
          b.matchScore -
          a.matchScore
      );
  }

  window.BiciParkRouteMatchEngine = {
    scoreRoute,
    rank
  };
})();