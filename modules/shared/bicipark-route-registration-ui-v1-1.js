(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_REG_UI_V11__) {
    return;
  }

  window.__BICIPARK_ROUTE_REG_UI_V11__ = true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const ORIGINAL_MAIN =
    "bp-route-done-button";

  const ORIGINAL_MANAGE =
    "bp-route-manage-registrations";

  const GROUP_ID =
    "bp-route-registration-group-v11";

  let queued =
    false;

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  function currentRoute() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      clean(
        params.get("route") ||
        params.get("id") ||
        ""
      );

    const source =
      window.BiciParkAdaptiveRouteCatalogV11 ||
      window.BiciParkRouteDetailData ||
      {};

    if (
      id &&
      source[id]
    ) {
      return {
        id,
        ...source[id]
      };
    }

    const name =
      clean(
        document.querySelector("h1")
          ?.textContent
      )
        .replace(
          /\s+(F\u00e0cil|Mitjana|Dif\u00edcil|Exigent)\s*$/i,
          ""
        );

    return {
      id,
      name
    };
  }

  function readActivities() {
    try {
      if (
        window.BiciParkActivitySync &&
        typeof window.BiciParkActivitySync
          .getActivities ===
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
    catch (_) {}

    try {
      const list =
        JSON.parse(
          localStorage.getItem(
            ACTIVITY_KEY
          ) ||
          "[]"
        );

      return Array.isArray(list)
        ? list.filter(
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

  function routeActivities() {
    const route =
      currentRoute();

    const routeId =
      norm(route.id);

    const routeName =
      norm(route.name);

    return readActivities()
      .filter(
        activity => {
          const activityId =
            norm(
              activity.routeId
            );

          const activityName =
            norm(
              activity.name
            );

          if (
            routeId &&
            activityId &&
            routeId ===
              activityId
          ) {
            return true;
          }

          return (
            routeName &&
            activityName &&
            routeName ===
              activityName
          );
        }
      );
  }

  function isFree(activity) {
    return (
      clean(activity.source) ===
        "route-detail" ||
      clean(activity.planSession) ===
        "Fora del pla" ||
      clean(activity.planRelation) ===
        "Activitat lliure"
    );
  }

  function ensureGroup(main) {
    let group =
      document.getElementById(
        GROUP_ID
      );

    if (group) {
      return group;
    }

    group =
      document.createElement(
        "div"
      );

    group.id =
      GROUP_ID;

    group.className =
      "bp-route-registration-group-v11";

    group.innerHTML =
      '<div id="bp-route-registration-status-v11" class="bp-route-registration-status-v11"></div>' +
      '<button id="bp-route-registration-action-v11" class="bp-route-registration-action-v11" type="button"></button>' +
      '<button id="bp-route-registration-manage-v11" class="bp-route-registration-manage-v11" type="button"></button>';

    main.parentElement
      .insertBefore(
        group,
        main
      );

    group
      .querySelector(
        "#bp-route-registration-action-v11"
      )
      .addEventListener(
        "click",
        () => {
          document
            .getElementById(
              ORIGINAL_MAIN
            )
            ?.click();
        }
      );

    group
      .querySelector(
        "#bp-route-registration-manage-v11"
      )
      .addEventListener(
        "click",
        () => {
          document
            .getElementById(
              ORIGINAL_MANAGE
            )
            ?.click();
        }
      );

    return group;
  }

  function setText(node, value) {
    if (
      node &&
      node.textContent !==
        value
    ) {
      node.textContent =
        value;
    }
  }

  function render() {
    const originalMain =
      document.getElementById(
        ORIGINAL_MAIN
      );

    if (
      !originalMain ||
      !originalMain.parentElement
    ) {
      return;
    }

    const group =
      ensureGroup(
        originalMain
      );

    const originalManage =
      document.getElementById(
        ORIGINAL_MANAGE
      );

    originalMain.classList.add(
      "bp-route-original-control-v11"
    );

    if (originalManage) {
      originalManage.classList.add(
        "bp-route-original-control-v11"
      );
    }

    const status =
      group.querySelector(
        "#bp-route-registration-status-v11"
      );

    const action =
      group.querySelector(
        "#bp-route-registration-action-v11"
      );

    const manage =
      group.querySelector(
        "#bp-route-registration-manage-v11"
      );

    const activities =
      routeActivities();

    const count =
      activities.length;

    const freeCount =
      activities.filter(
        isFree
      ).length;
    /* BICIPARK_OPTION1_SOURCE_STATE_START */
    const historyButton =
      document.getElementById(
        "bp360-history"
      );

    const actionsHost =
      originalMain.closest(
        ".bp360-actions"
      );

    if (historyButton) {
      historyButton.hidden =
        count === 0;
    }

    if (actionsHost) {
      actionsHost.classList.toggle(
        "is-route-unregistered",
        count === 0
      );

      actionsHost.classList.toggle(
        "has-route-registration",
        count > 0
      );
    }

    manage.classList.remove(
      "is-destructive",
      "is-manage"
    );
    /* BICIPARK_OPTION1_SOURCE_STATE_END */

    if (count === 0) {
      status.hidden = true;
      manage.hidden = true;

      setText(
        action,
        "\u25cb Registrar ruta"
      );

      action.title =
        "Registra aquesta ruta al teu Historial.";

      group.classList.remove(
        "has-registration"
      );

      return;
    }

    group.classList.add(
      "has-registration"
    );

    status.hidden = false;
    manage.hidden = false;

    setText(
      status,
      count === 1
        ? "\u2713 1 sortida registrada"
        : "\u2713 " +
          count +
          " sortides registrades"
    );

    setText(
      action,
      "+ Registrar nova sortida"
    );

    action.title =
      "Registra una nova sortida d aquesta mateixa ruta.";

    if (
      count === 1 &&
      freeCount === 1
    ) {
      manage.hidden =
        false;

      setText(
        manage,
        "Desfer registre"
      );

      manage.classList.add(
        "is-destructive"
      );

      manage.title =
        "Elimina aquesta activitat lliure de l Historial.";
    }
    else if (
      count === 1
    ) {
      /*
       * Veure registre is now a permanent source-level button.
       * A plan-linked activity cannot be removed here.
       */
      manage.hidden =
        true;
    }
    else {
      manage.hidden =
        false;

      setText(
        manage,
        "Gestionar " +
        count +
        " sortides"
      );

      manage.classList.add(
        "is-manage"
      );

      manage.title =
        "Consulta i gestiona les sortides registrades.";
    }
  }

  function queueRender() {
    if (queued) {
      return;
    }

    queued = true;

    window.requestAnimationFrame(
      () => {
        queued = false;
        render();
      }
    );
  }

  function boot() {
    [
      0,
      100,
      250,
      600,
      1200,
      1800
    ]
      .forEach(
        delay =>
          window.setTimeout(
            queueRender,
            delay
          )
      );

    window.addEventListener(
      "bicipark:activity-history:updated",
      queueRender
    );

    window.addEventListener(
      "popstate",
      queueRender
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          ACTIVITY_KEY
        ) {
          queueRender();
        }
      }
    );

    const observer =
      new MutationObserver(
        queueRender
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    console.info(
      "[BiciPark] Route Registration UI v1.1 loaded"
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