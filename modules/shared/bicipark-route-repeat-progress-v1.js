(() => {
  "use strict";

  if (
    window.__BICIPARK_ROUTE_REPEAT_PROGRESS_V1__
  ) {
    return;
  }

  window.__BICIPARK_ROUTE_REPEAT_PROGRESS_V1__ =
    true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const MAIN_BUTTON_ID =
    "bp-route-done-button";

  const MANAGE_BUTTON_ID =
    "bp-route-manage-registrations";

  const PROGRESS_ID =
    "bp-route-repeat-progress";

  let renderQueued =
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

  function normalized(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  function num(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function currentRoute() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const routeId =
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
      routeId &&
      source[routeId]
    ) {
      return {
        id:
          routeId,
        ...source[routeId]
      };
    }

    const heading =
      clean(
        document.querySelector(
          "h1"
        )
          ?.textContent
      )
        .replace(
          /\s+(F\u00e0cil|Mitjana|Dif\u00edcil|Exigent)\s*$/i,
          ""
        );

    const found =
      Object.keys(source)
        .map(
          id => ({
            id,
            ...source[id]
          })
        )
        .find(
          route =>
            normalized(
              route.name
            ) ===
            normalized(
              heading
            )
        );

    return found || {
      id:
        routeId,
      name:
        heading
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

  function writeActivities(list) {
    if (
      window.BiciParkActivitySync &&
      typeof window.BiciParkActivitySync
        .writeActivities ===
        "function"
    ) {
      window.BiciParkActivitySync
        .writeActivities(
          list
        );

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

  function routeActivities() {
    const route =
      currentRoute();

    const routeId =
      normalized(
        route.id
      );

    const routeName =
      normalized(
        route.name
      );

    return readActivities()
      .filter(
        activity => {
          const activityId =
            normalized(
              activity.routeId
            );

          const activityName =
            normalized(
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

          if (
            routeName &&
            activityName &&
            routeName ===
              activityName
          ) {
            return true;
          }

          return false;
        }
      )
      .sort(
        (a, b) =>
          activityDate(b) -
          activityDate(a)
      );
  }

  function activityDate(activity) {
    const date =
      clean(
        activity.date
      ) ||
      "1970-01-01";

    const time =
      clean(
        activity.time
      ) ||
      "12:00";

    const parsed =
      new Date(
        date +
        "T" +
        time
      );

    return Number.isNaN(
      parsed.getTime()
    )
      ? new Date(0)
      : parsed;
  }

  function isFreeActivity(activity) {
    return (
      clean(
        activity.source
      ) ===
      "route-detail" ||
      clean(
        activity.planSession
      ) ===
      "Fora del pla" ||
      clean(
        activity.planRelation
      ) ===
      "Activitat lliure"
    );
  }

  function parseDurationMinutes(value) {
    const text =
      clean(value)
        .replace(
          /^~/,
          ""
        );

    const colon =
      text.match(
        /(\d+)\s*:\s*(\d+)/
      );

    if (colon) {
      return (
        Number(colon[1]) *
        60 +
        Number(colon[2])
      );
    }

    const hourMatch =
      text.match(
        /(\d+(?:[.,]\d+)?)\s*h/
      );

    if (hourMatch) {
      return Math.round(
        Number(
          hourMatch[1]
            .replace(
              ",",
              "."
            )
        ) *
        60
      );
    }

    const minuteMatch =
      text.match(
        /(\d+)\s*min/
      );

    return minuteMatch
      ? Number(
          minuteMatch[1]
        )
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

    const hours =
      Math.floor(
        total /
        60
      );

    const mins =
      total %
      60;

    if (!hours) {
      return (
        total +
        " min"
      );
    }

    return (
      hours +
      ":" +
      String(mins)
        .padStart(
          2,
          "0"
        ) +
      " h"
    );
  }

  function formatDate(activity) {
    try {
      return new Intl.DateTimeFormat(
        "ca-ES",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      )
        .format(
          activityDate(
            activity
          )
        );
    }
    catch (_) {
      return clean(
        activity.date
      );
    }
  }

  function formatDistance(activity) {
    const distance =
      num(
        activity.distanceKm
      );

    if (!distance) {
      return "--";
    }

    return (
      distance
        .toFixed(
          1
        )
        .replace(
          ".",
          ","
        ) +
      " km"
    );
  }

  function formatAscent(activity) {
    const ascent =
      num(
        activity.ascentM
      );

    return Number.isFinite(
      ascent
    )
      ? (
          Math.round(
            ascent
          ) +
          " m+"
        )
      : "--";
  }

  function feelingLabel(activity) {
    const feeling =
      num(
        activity.feeling
      );

    const labels = {
      5: "Molt b\u00e9",
      4: "B\u00e9",
      3: "Exigent",
      2: "Massa dura",
      1: "Molt dura"
    };

    return labels[feeling] ||
      "--";
  }

  function comparison(latest, previous) {
    const latestMinutes =
      parseDurationMinutes(
        latest.duration
      );

    const previousMinutes =
      parseDurationMinutes(
        previous.duration
      );

    const latestDistance =
      num(
        latest.distanceKm
      );

    const previousDistance =
      num(
        previous.distanceKm
      );

    const distanceBase =
      Math.max(
        latestDistance,
        previousDistance,
        1
      );

    const distanceDifference =
      Math.abs(
        latestDistance -
        previousDistance
      ) /
      distanceBase;

    const timeComparable =
      latestMinutes > 0 &&
      previousMinutes > 0 &&
      distanceDifference <=
      .15;

    const timeDelta =
      timeComparable
        ? latestMinutes -
          previousMinutes
        : null;

    const feelingDelta =
      (
        num(
          latest.feeling
        ) &&
        num(
          previous.feeling
        )
      )
        ? num(
            latest.feeling
          ) -
          num(
            previous.feeling
          )
        : null;

    const matchDelta =
      (
        num(
          latest.matchScore
        ) &&
        num(
          previous.matchScore
        )
      )
        ? num(
            latest.matchScore
          ) -
          num(
            previous.matchScore
          )
        : null;

    const estimated =
      latest.durationEstimated ===
        true ||
      previous.durationEstimated ===
        true ||
      clean(
        latest.duration
      ).startsWith(
        "~"
      ) ||
      clean(
        previous.duration
      ).startsWith(
        "~"
      );

    return {
      latestMinutes,
      previousMinutes,
      timeComparable,
      timeDelta,
      feelingDelta,
      matchDelta,
      estimated
    };
  }

  function metricDeltaText(
    value,
    positiveText,
    negativeText,
    neutralText
  ) {
    if (
      value == null ||
      !Number.isFinite(
        Number(value)
      )
    ) {
      return neutralText;
    }

    if (value > 0) {
      return positiveText(
        value
      );
    }

    if (value < 0) {
      return negativeText(
        value
      );
    }

    return neutralText;
  }

  function findActionsHost() {
    const main =
      document.getElementById(
        MAIN_BUTTON_ID
      );

    return main
      ? main.parentElement
      : null;
  }

  function ensureManageButton() {
    const host =
      findActionsHost();

    if (!host) {
      return null;
    }

    let button =
      document.getElementById(
        MANAGE_BUTTON_ID
      );

    if (!button) {
      button =
        document.createElement(
          "button"
        );

      button.id =
        MANAGE_BUTTON_ID;

      button.type =
        "button";

      button.className =
        "bp-route-manage-button";

      button.addEventListener(
        "click",
        openManageModal
      );

      host.appendChild(
        button
      );
    }

    return button;
  }

  function renderButtons() {
    const activities =
      routeActivities();

    const count =
      activities.length;

    const freeCount =
      activities.filter(
        isFreeActivity
      ).length;

    const main =
      document.getElementById(
        MAIN_BUTTON_ID
      );

    if (main) {
      const desired =
        count === 0
          ? '<span aria-hidden="true">\u25cb</span> Registrar ruta'
          : count === 1
            ? '<span aria-hidden="true">\u2713</span> Ruta registrada'
            : '<span aria-hidden="true">\u2713</span> Ruta registrada \u00b7 ' +
              count +
              " sortides";

      if (
        main.innerHTML !==
        desired
      ) {
        main.innerHTML =
          desired;
      }

      main.classList.toggle(
        "is-done",
        count > 0
      );

      main.classList.toggle(
        "is-pending",
        count === 0
      );

      main.title =
        count > 0
          ? "Prem per registrar una nova sortida d aquesta mateixa ruta."
          : "Registra aquesta ruta al teu Historial.";
    }

    const manage =
      ensureManageButton();

    if (!manage) {
      return;
    }

    if (count === 0) {
      manage.hidden =
        true;

      return;
    }

    manage.hidden =
      false;

    if (
      count === 1 &&
      freeCount === 1
    ) {
      manage.textContent =
        "Desfer registre";
    }
    else {
      manage.textContent =
        "Gestionar " +
        count +
        " sortides";
    }
  }

  function createManageModal() {
    if (
      document.getElementById(
        "bp-route-manage-modal"
      )
    ) {
      return;
    }

    const backdrop =
      document.createElement(
        "div"
      );

    backdrop.id =
      "bp-route-manage-backdrop";

    backdrop.className =
      "bp-route-manage-backdrop";

    const modal =
      document.createElement(
        "section"
      );

    modal.id =
      "bp-route-manage-modal";

    modal.className =
      "bp-route-manage-modal";

    modal.innerHTML =
      '<div class="bp-route-manage-head">' +
        "<div>" +
          "<span>Historial de la ruta</span>" +
          "<h3>Gestionar sortides registrades</h3>" +
          "<p>Pots eliminar registres lliures creats des de la fitxa. Les sessions vinculades al pla queden protegides.</p>" +
        "</div>" +
        '<button type="button" class="bp-route-manage-close" aria-label="Tancar">\u00d7</button>' +
      "</div>" +
      '<div id="bp-route-manage-list" class="bp-route-manage-list"></div>' +
      '<div class="bp-route-manage-foot">' +
        '<button type="button" class="bp-route-manage-done">Tancar</button>' +
      "</div>";

    document.body.appendChild(
      backdrop
    );

    document.body.appendChild(
      modal
    );

    backdrop.addEventListener(
      "click",
      closeManageModal
    );

    modal
      .querySelector(
        ".bp-route-manage-close"
      )
      .addEventListener(
        "click",
        closeManageModal
      );

    modal
      .querySelector(
        ".bp-route-manage-done"
      )
      .addEventListener(
        "click",
        closeManageModal
      );
  }

  function renderManageList() {
    createManageModal();

    const list =
      document.getElementById(
        "bp-route-manage-list"
      );

    const activities =
      routeActivities();

    list.innerHTML =
      "";

    activities.forEach(
      activity => {
        const free =
          isFreeActivity(
            activity
          );

        const row =
          document.createElement(
            "article"
          );

        row.className =
          "bp-route-manage-row";

        row.innerHTML =
          '<div class="bp-route-manage-row-main">' +
            "<strong>" +
              formatDate(
                activity
              ) +
            "</strong>" +
            "<span>" +
              [
                formatDistance(
                  activity
                ),
                clean(
                  activity.duration
                ) ||
                "--",
                feelingLabel(
                  activity
                )
              ]
                .join(
                  " \u00b7 "
                ) +
            "</span>" +
          "</div>" +
          '<div class="bp-route-manage-row-state">' +
            (
              free
                ? '<span class="is-free">Activitat lliure</span>'
                : '<span class="is-plan">Vinculada al pla</span>'
            ) +
          "</div>";

        if (free) {
          const remove =
            document.createElement(
              "button"
            );

          remove.type =
            "button";

          remove.className =
            "bp-route-manage-remove";

          remove.textContent =
            "Eliminar";

          remove.addEventListener(
            "click",
            () =>
              removeActivity(
                activity
              )
          );

          row.appendChild(
            remove
          );
        }
        else {
          const locked =
            document.createElement(
              "span"
            );

          locked.className =
            "bp-route-manage-locked";

          locked.textContent =
            "Protegida";

          row.appendChild(
            locked
          );
        }

        list.appendChild(
          row
        );
      }
    );
  }

  function openManageModal() {
    const activities =
      routeActivities();

    const free =
      activities.filter(
        isFreeActivity
      );

    if (
      activities.length ===
      1 &&
      free.length ===
      1
    ) {
      removeActivity(
        free[0]
      );

      return;
    }

    renderManageList();

    document
      .getElementById(
        "bp-route-manage-backdrop"
      )
      .classList.add(
        "is-visible"
      );

    document
      .getElementById(
        "bp-route-manage-modal"
      )
      .classList.add(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "hidden";
  }

  function closeManageModal() {
    document
      .getElementById(
        "bp-route-manage-backdrop"
      )
      ?.classList
      .remove(
        "is-visible"
      );

    document
      .getElementById(
        "bp-route-manage-modal"
      )
      ?.classList
      .remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function removeActivity(activity) {
    const date =
      formatDate(
        activity
      );

    const confirmed =
      window.confirm(
        "Vols eliminar el registre del " +
        date +
        "? Aquesta accio no es pot desfer."
      );

    if (!confirmed) {
      return;
    }

    const all =
      readActivities();

    const next =
      all.filter(
        item => {
          if (
            activity.id &&
            item.id
          ) {
            return (
              item.id !==
              activity.id
            );
          }

          return !(
            normalized(
              item.routeId
            ) ===
              normalized(
                activity.routeId
              ) &&
            clean(
              item.date
            ) ===
              clean(
                activity.date
              ) &&
            clean(
              item.time
            ) ===
              clean(
                activity.time
              )
          );
        }
      );

    writeActivities(
      next
    );

    closeManageModal();
    queueRender();
  }

  function findProgressAnchor() {
    const map =
      document.querySelector(
        ".leaflet-container"
      );

    if (map) {
      return (
        map.closest(
          ".bp-map-card, .route-map-card, .map-card, section, article"
        ) ||
        map.parentElement
      );
    }

    const mainButton =
      document.getElementById(
        MAIN_BUTTON_ID
      );

    return (
      mainButton
        ?.parentElement
        ?.parentElement ||
      null
    );
  }

  function ensureProgressCard() {
    let card =
      document.getElementById(
        PROGRESS_ID
      );

    if (card) {
      return card;
    }

    const anchor =
      findProgressAnchor();

    if (!anchor) {
      return null;
    }

    card =
      document.createElement(
        "section"
      );

    card.id =
      PROGRESS_ID;

    card.className =
      "bp-route-repeat-progress";

    anchor.insertAdjacentElement(
      "beforebegin",
      card
    );

    return card;
  }

  function renderProgress() {
    const activities =
      routeActivities();

    const existing =
      document.getElementById(
        PROGRESS_ID
      );

    if (
      activities.length <
      2
    ) {
      if (existing) {
        existing.remove();
      }

      return;
    }

    const card =
      ensureProgressCard();

    if (!card) {
      return;
    }

    const latest =
      activities[0];

    const previous =
      activities[1];

    const result =
      comparison(
        latest,
        previous
      );

    let timeStatus =
      "No comparable";

    let timeClass =
      "is-neutral";

    if (
      result.timeComparable
    ) {
      if (
        result.timeDelta <
        0
      ) {
        timeStatus =
          Math.abs(
            Math.round(
              result.timeDelta
            )
          ) +
          " min m\u00e9s r\u00e0pid";

        timeClass =
          "is-positive";
      }
      else if (
        result.timeDelta >
        0
      ) {
        timeStatus =
          Math.round(
            result.timeDelta
          ) +
          " min m\u00e9s lent";

        timeClass =
          "is-warning";
      }
      else {
        timeStatus =
          "Mateix temps";
      }
    }
    else if (
      result.latestMinutes &&
      result.previousMinutes
    ) {
      timeStatus =
        "Dist\u00e0ncies diferents";
    }

    const feelingStatus =
      metricDeltaText(
        result.feelingDelta,
        value =>
          "+" +
          Math.round(value) +
          " punt",
        value =>
          Math.round(value) +
          " punt",
        "Sense canvi"
      );

    const matchStatus =
      metricDeltaText(
        result.matchDelta,
        value =>
          "+" +
          Math.round(value) +
          " punts",
        value =>
          Math.round(value) +
          " punts",
        "Sense canvi"
      );

    const latestFeeling =
      num(
        latest.feeling
      )
        ? (
            num(
              latest.feeling
            ) +
            "/5"
          )
        : "--";

    const previousFeeling =
      num(
        previous.feeling
      )
        ? (
            num(
              previous.feeling
            ) +
            "/5"
          )
        : "--";

    const latestMatch =
      num(
        latest.matchScore
      )
        ? (
            Math.round(
              num(
                latest.matchScore
              )
            ) +
            "%"
          )
        : "--";

    const previousMatch =
      num(
        previous.matchScore
      )
        ? (
            Math.round(
              num(
                previous.matchScore
              )
            ) +
            "%"
          )
        : "--";

    card.innerHTML =
      '<div class="bp-route-repeat-head">' +
        "<div>" +
          "<span>Progressi\u00f3 de la ruta</span>" +
          "<h3>La teva evoluci\u00f3 en aquesta ruta</h3>" +
          "<p>" +
            activities.length +
            " sortides registrades \u00b7 comparem les dues m\u00e9s recents" +
          "</p>" +
        "</div>" +
        '<div class="bp-route-repeat-dates">' +
          "<strong>" +
            formatDate(
              latest
            ) +
          "</strong>" +
          "<span>vs " +
            formatDate(
              previous
            ) +
          "</span>" +
        "</div>" +
      "</div>" +

      '<div class="bp-route-repeat-grid">' +

        '<article class="bp-route-repeat-metric">' +
          "<small>Temps</small>" +
          "<strong>" +
            (
              result.latestMinutes
                ? formatMinutes(
                    result.latestMinutes
                  )
                : "--"
            ) +
            " <span>\u2190</span> " +
            (
              result.previousMinutes
                ? formatMinutes(
                    result.previousMinutes
                  )
                : "--"
            ) +
          "</strong>" +
          '<em class="' +
            timeClass +
          '">' +
            timeStatus +
          "</em>" +
        "</article>" +

        '<article class="bp-route-repeat-metric">' +
          "<small>Sensaci\u00f3</small>" +
          "<strong>" +
            latestFeeling +
            " <span>\u2190</span> " +
            previousFeeling +
          "</strong>" +
          '<em class="' +
            (
              result.feelingDelta >
              0
                ? "is-positive"
                : result.feelingDelta <
                  0
                  ? "is-warning"
                  : "is-neutral"
            ) +
          '">' +
            feelingStatus +
          "</em>" +
        "</article>" +

        '<article class="bp-route-repeat-metric">' +
          "<small>Route Match</small>" +
          "<strong>" +
            latestMatch +
            " <span>\u2190</span> " +
            previousMatch +
          "</strong>" +
          '<em class="' +
            (
              result.matchDelta >
              0
                ? "is-positive"
                : result.matchDelta <
                  0
                  ? "is-warning"
                  : "is-neutral"
            ) +
          '">' +
            matchStatus +
          "</em>" +
        "</article>" +

        '<article class="bp-route-repeat-metric is-route">' +
          "<small>Tra\u00e7at registrat</small>" +
          "<strong>" +
            formatDistance(
              latest
            ) +
            " \u00b7 " +
            formatAscent(
              latest
            ) +
          "</strong>" +
          "<em class=\"is-neutral\">" +
            (
              result.estimated
                ? "Comparaci\u00f3 temporal orientativa"
                : "Dades de l\u2019\u00faltima sortida"
            ) +
          "</em>" +
        "</article>" +

      "</div>";

    card.classList.toggle(
      "is-estimated",
      result.estimated
    );
  }

  function queueRender() {
    if (renderQueued) {
      return;
    }

    renderQueued =
      true;

    window.requestAnimationFrame(
      () => {
        renderQueued =
          false;

        renderButtons();
        renderProgress();
      }
    );
  }

  function wrapHistoryMethod(name) {
    const original =
      window.history[name];

    if (
      typeof original !==
      "function" ||
      original
        .__biciparkRepeatProgressWrapped
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
          "bicipark:repeat-progress:url-change"
        )
      );

      return result;
    }

    wrapped
      .__biciparkRepeatProgressWrapped =
      true;

    window.history[name] =
      wrapped;
  }

  function boot() {
    createManageModal();

    wrapHistoryMethod(
      "pushState"
    );

    wrapHistoryMethod(
      "replaceState"
    );

    window.addEventListener(
      "bicipark:repeat-progress:url-change",
      queueRender
    );

    window.addEventListener(
      "popstate",
      queueRender
    );

    window.addEventListener(
      "bicipark:activity-history:updated",
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
        () => {
          if (
            document.getElementById(
              MAIN_BUTTON_ID
            )
          ) {
            queueRender();
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
      100,
      300,
      700,
      1400
    ]
      .forEach(
        delay =>
          window.setTimeout(
            queueRender,
            delay
          )
      );

    console.info(
      "[BiciPark] Route repeat progress v1 loaded"
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