(() => {
  "use strict";

  const routesUrl =
    "./data/routes.json";

  const state = {
    routes: [],
    profile: null,
    planActive: false
  };

  const nodes = {};

  function cacheNodes() {
    nodes.toast =
      document.getElementById(
        "rmToast"
      );

    nodes.drawer =
      document.getElementById(
        "rmDrawer"
      );

    nodes.backdrop =
      document.getElementById(
        "rmBackdrop"
      );

    nodes.close =
      document.getElementById(
        "rmClose"
      );

    nodes.form =
      document.getElementById(
        "rmProfileForm"
      );

    nodes.planRows =
      document.getElementById(
        "rmPlanRows"
      );

    nodes.level =
      document.getElementById(
        "rmLevel"
      );

    nodes.days =
      document.getElementById(
        "rmDays"
      );

    nodes.weeklyHours =
      document.getElementById(
        "rmWeeklyHours"
      );

    nodes.goal =
      document.getElementById(
        "rmGoal"
      );

    nodes.terrain =
      document.getElementById(
        "rmTerrain"
      );

    nodes.distanceMin =
      document.getElementById(
        "rmDistanceMin"
      );

    nodes.distanceMax =
      document.getElementById(
        "rmDistanceMax"
      );

    nodes.elevationMin =
      document.getElementById(
        "rmElevationMin"
      );

    nodes.elevationMax =
      document.getElementById(
        "rmElevationMax"
      );

    nodes.reset =
      document.getElementById(
        "rmReset"
      );
  }

  function showToast(message) {
    nodes.toast.textContent =
      message;

    nodes.toast.classList.add(
      "is-visible"
    );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          nodes.toast.classList.remove(
            "is-visible"
          );
        },
        2200
      );
  }

  function openDrawer() {
    state.profile =
      window.BiciParkRiderProfile.get();

    fillForm(
      state.profile
    );

    renderPlan();

    nodes.drawer.classList.add(
      "is-open"
    );

    nodes.backdrop.classList.add(
      "is-visible"
    );

    nodes.drawer.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeDrawer() {
    nodes.drawer.classList.remove(
      "is-open"
    );

    nodes.backdrop.classList.remove(
      "is-visible"
    );

    nodes.drawer.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function fillForm(profile) {
    nodes.level.value =
      profile.level;

    nodes.days.value =
      profile.daysPerWeek;

    nodes.weeklyHours.value =
      profile.weeklyTimeHours;

    nodes.goal.value =
      profile.goal;

    nodes.terrain.value =
      profile.terrain;

    nodes.distanceMin.value =
      profile.usualDistanceMin;

    nodes.distanceMax.value =
      profile.usualDistanceMax;

    nodes.elevationMin.value =
      profile.usualElevationMin;

    nodes.elevationMax.value =
      profile.usualElevationMax;
  }

  function profileFromForm() {
    return {
      level:
        nodes.level.value,

      daysPerWeek:
        Number(
          nodes.days.value
        ),

      weeklyTimeHours:
        Number(
          nodes.weeklyHours.value
        ),

      goal:
        nodes.goal.value,

      terrain:
        nodes.terrain.value,

      usualDistanceMin:
        Number(
          nodes.distanceMin.value
        ),

      usualDistanceMax:
        Number(
          nodes.distanceMax.value
        ),

      usualElevationMin:
        Number(
          nodes.elevationMin.value
        ),

      usualElevationMax:
        Number(
          nodes.elevationMax.value
        )
    };
  }

  function renderPlan() {
    const profile =
      window.BiciParkRiderProfile.get();

    const plan =
      window.BiciParkTrainingPlanEngine
        .getPlan(
          profile
        );

    nodes.planRows.innerHTML =
      plan
        .map(item =>
          '<div class="rm-plan-row">' +
            "<strong>" +
              item.day +
            "</strong>" +
            "<span>" +
              item.type +
            "</span>" +
            "<span>" +
              item.duration +
            "</span>" +
          "</div>"
        )
        .join("");
  }

  function bestMatchMessage() {
    if (!state.routes.length) {
      return "";
    }

    const profile =
      window.BiciParkRiderProfile.get();

    const ranked =
      window.BiciParkRouteMatchEngine
        .rank(
          state.routes,
          profile
        );

    if (!ranked.length) {
      return "";
    }

    return (
      ranked[0].name +
      " · encaix " +
      ranked[0].matchScore +
      "%"
    );
  }

  function setGoal(goal) {
    const profile =
      window.BiciParkRiderProfile.set({
        goal
      });

    renderPlan();

    const labels = {
      millorar:
        "Objectiu: millorar progressivament",
      dificultat:
        "Objectiu: incrementar dificultat",
      passejar:
        "Objectiu: passejar",
      repte:
        "Objectiu: preparar un repte"
    };

    const best =
      bestMatchMessage();

    showToast(
      (
        labels[goal] ||
        "Objectiu actualitzat"
      ) +
      (
        best
          ? " · " + best
          : ""
      )
    );
  }

  function activatePlan() {
    state.planActive =
      true;

    localStorage.setItem(
      "bicipark.routeMatch.planActive.v1",
      "true"
    );

    showToast(
      "Pla bàsic activat. El podràs ajustar des del teu perfil."
    );
  }

  async function loadRoutes() {
    try {
      const response =
        await fetch(
          routesUrl,
          {
            cache:
              "no-store"
          }
        );

      if (!response.ok) {
        return;
      }

      const raw =
        await response.json();

      state.routes =
        Array.isArray(raw)
          ? raw
          : [];
    } catch (_) {
      state.routes = [];
    }
  }

  function bindHotspots() {
    document.querySelectorAll(
      "[data-goal]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => {
          setGoal(
            button.dataset.goal
          );
        }
      );
    });

    document.querySelectorAll(
      '[data-action="profile"]'
    ).forEach(button => {
      button.addEventListener(
        "click",
        openDrawer
      );
    });

    document.querySelectorAll(
      '[data-action="activate-plan"]'
    ).forEach(button => {
      button.addEventListener(
        "click",
        activatePlan
      );
    });
  }

  function bindDrawer() {
    nodes.close.addEventListener(
      "click",
      closeDrawer
    );

    nodes.backdrop.addEventListener(
      "click",
      closeDrawer
    );

    nodes.form.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        window.BiciParkRiderProfile.set(
          profileFromForm()
        );

        renderPlan();

        showToast(
          "Perfil guardat · " +
          bestMatchMessage()
        );

        closeDrawer();
      }
    );

    nodes.reset.addEventListener(
      "click",
      () => {
        const profile =
          window.BiciParkRiderProfile.reset();

        fillForm(
          profile
        );

        renderPlan();

        showToast(
          "Perfil inicial recuperat."
        );
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeDrawer();
        }
      }
    );
  }

  async function boot() {
    cacheNodes();

    state.profile =
      window.BiciParkRiderProfile.get();

    state.planActive =
      localStorage.getItem(
        "bicipark.routeMatch.planActive.v1"
      ) === "true";

    await loadRoutes();

    bindHotspots();
    bindDrawer();
    renderPlan();

    window.BiciParkRouteMatch = {
      getProfile: () =>
        window.BiciParkRiderProfile.get(),

      getRecommendations: () =>
        window.BiciParkRouteMatchEngine.rank(
          state.routes,
          window.BiciParkRiderProfile.get()
        ),

      getTrainingPlan: () =>
        window.BiciParkTrainingPlanEngine.getPlan(
          window.BiciParkRiderProfile.get()
        ),

      openProfile:
        openDrawer
    };

    console.info(
      "[BiciPark Route Match] visual-first v1 ready."
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