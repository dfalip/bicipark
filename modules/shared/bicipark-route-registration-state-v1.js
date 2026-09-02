(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_REGISTRATION_STATE_V1_FIXED__) {
    return;
  }

  window.__BICIPARK_ROUTE_REGISTRATION_STATE_V1_FIXED__ = true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const BUTTON_ID =
    "bp-route-done-button";

  let updateQueued =
    false;

  function clean(value) {
    return String(
      value == null
        ? ""
        : value
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function normalize(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  function currentRouteId() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    return clean(
      params.get("route") ||
      params.get("id") ||
      ""
    );
  }

  function currentRouteName() {
    const source =
      window.BiciParkAdaptiveRouteCatalogV11 ||
      window.BiciParkRouteDetailData ||
      {};

    const routeId =
      currentRouteId();

    if (
      routeId &&
      source[routeId]
    ) {
      return clean(
        source[routeId].name
      );
    }

    const title =
      document.querySelector(
        "h1"
      );

    return clean(
      title
        ? title.textContent
        : ""
    )
      .replace(
        /\s+(F\u00e0cil|Mitjana|Dif\u00edcil|Exigent)\s*$/i,
        ""
      );
  }

  function readActivities() {
    try {
      if (
        window.BiciParkActivitySync &&
        typeof window.BiciParkActivitySync.getActivities ===
          "function"
      ) {
        const list =
          window.BiciParkActivitySync
            .getActivities({
              includeDemo: false
            });

        return Array.isArray(list)
          ? list
          : [];
      }
    }
    catch (error) {
      console.warn(
        "[BiciPark] ActivitySync read failed",
        error
      );
    }

    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            ACTIVITY_KEY
          ) ||
          "[]"
        );

      return Array.isArray(parsed)
        ? parsed.filter(
            item =>
              item &&
              item.demo !== true
          )
        : [];
    }
    catch (_) {
      return [];
    }
  }

  function routeIsRegistered() {
    const wantedId =
      normalize(
        currentRouteId()
      );

    const wantedName =
      normalize(
        currentRouteName()
      );

    return readActivities()
      .some(
        activity => {
          const activityId =
            normalize(
              activity.routeId
            );

          const activityName =
            normalize(
              activity.name
            );

          if (
            wantedId &&
            activityId &&
            wantedId ===
              activityId
          ) {
            return true;
          }

          if (
            wantedName &&
            activityName &&
            wantedName ===
              activityName
          ) {
            return true;
          }

          return false;
        }
      );
  }

  function renderButtonState() {
    const button =
      document.getElementById(
        BUTTON_ID
      );

    if (!button) {
      return false;
    }

    const routeId =
      currentRouteId();

    const registered =
      routeIsRegistered();

    const state =
      registered
        ? "registered"
        : "pending";

    button.dataset
      .routeRegistrationState =
      state;

    button.dataset
      .routeRegistrationRoute =
      routeId;

    button.classList.toggle(
      "is-done",
      registered
    );

    button.classList.toggle(
      "is-pending",
      !registered
    );

    button.setAttribute(
      "aria-pressed",
      registered
        ? "true"
        : "false"
    );

    if (registered) {
      button.innerHTML =
        '<span aria-hidden="true">\u2713</span> Ruta registrada';

      button.title =
        "Aquesta ruta ja consta al teu Historial. Pots registrar una nova sortida si la tornes a fer.";
    }
    else {
      button.innerHTML =
        '<span aria-hidden="true">\u25CB</span> Registrar ruta';

      button.title =
        "Registra aquesta ruta al teu Historial.";
    }

    return true;
  }

  function scheduleUpdate() {
    if (updateQueued) {
      return;
    }

    updateQueued =
      true;

    window.requestAnimationFrame(
      () => {
        updateQueued =
          false;

        renderButtonState();
      }
    );
  }

  function wrapHistoryMethod(name) {
    const original =
      window.history[name];

    if (
      typeof original !==
      "function"
    ) {
      return;
    }

    if (
      original
        .__biciparkRouteRegistrationWrapped
    ) {
      return;
    }

    function wrapped(...args) {
      const result =
        original.apply(
          this,
          args
        );

      window.dispatchEvent(
        new Event(
          "bicipark:route-registration:url-change"
        )
      );

      return result;
    }

    wrapped
      .__biciparkRouteRegistrationWrapped =
      true;

    window.history[name] =
      wrapped;
  }

  function boot() {
    wrapHistoryMethod(
      "pushState"
    );

    wrapHistoryMethod(
      "replaceState"
    );

    window.addEventListener(
      "bicipark:route-registration:url-change",
      scheduleUpdate
    );

    window.addEventListener(
      "popstate",
      scheduleUpdate
    );

    window.addEventListener(
      "bicipark:activity-history:updated",
      scheduleUpdate
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          ACTIVITY_KEY
        ) {
          scheduleUpdate();
        }
      }
    );

    const observer =
      new MutationObserver(
        () => {
          if (
            document.getElementById(
              BUTTON_ID
            )
          ) {
            scheduleUpdate();
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    [
      0,
      80,
      220,
      500,
      1000,
      1800
    ]
      .forEach(
        delay =>
          window.setTimeout(
            scheduleUpdate,
            delay
          )
      );

    console.info(
      "[BiciPark] Route registration state fixed v1 loaded"
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