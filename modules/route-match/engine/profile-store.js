(() => {
  "use strict";

  const KEY =
    "bicipark.routeMatch.profile.v1";

  const DEFAULT_PROFILE = {
    level: "Intermedi",
    daysPerWeek: 3,
    goal: "millorar",
    terrain: "Carretera + Gravel",
    usualDistanceMin: 30,
    usualDistanceMax: 50,
    usualElevationMin: 400,
    usualElevationMax: 800,
    weeklyTimeHours: 5,
    capacities: {
      endurance: 72,
      climbing: 68,
      technique: 60,
      consistency: 80
    }
  };

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function read() {
    try {
      const raw =
        localStorage.getItem(KEY);

      if (!raw) {
        return clone(
          DEFAULT_PROFILE
        );
      }

      const saved =
        JSON.parse(raw);

      return {
        ...clone(DEFAULT_PROFILE),
        ...saved,
        capacities: {
          ...clone(
            DEFAULT_PROFILE.capacities
          ),
          ...(
            saved.capacities ||
            {}
          )
        }
      };
    } catch (_) {
      return clone(
        DEFAULT_PROFILE
      );
    }
  }

  function write(profile) {
    const next = {
      ...read(),
      ...profile
    };

    localStorage.setItem(
      KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new CustomEvent(
        "bicipark:route-match:profile",
        {
          detail: next
        }
      )
    );

    return next;
  }

  function reset() {
    localStorage.removeItem(KEY);
    return read();
  }

  window.BiciParkRiderProfile = {
    get: read,
    set: write,
    reset,
    defaults: () =>
      clone(
        DEFAULT_PROFILE
      )
  };
})();