(() => {
  "use strict";

  if (
    window.__BICIPARK_ROUTE_COMPLETION_V1__
  ) {
    return;
  }

  window.__BICIPARK_ROUTE_COMPLETION_V1__ =
    true;

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

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

  function pad(value) {
    return String(value)
      .padStart(
        2,
        "0"
      );
  }

  function today() {
    const d =
      new Date();

    return (
      d.getFullYear() +
      "-" +
      pad(
        d.getMonth() +
        1
      ) +
      "-" +
      pad(
        d.getDate()
      )
    );
  }

  function currentTime() {
    const d =
      new Date();

    return (
      pad(
        d.getHours()
      ) +
      ":" +
      pad(
        d.getMinutes()
      )
    );
  }

  function uid() {
    return (
      "act-route-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(16)
        .slice(
          2,
          8
        )
    );
  }

  function currentRoute() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const routeId =
      params.get(
        "route"
      ) ||
      params.get(
        "id"
      ) ||
      "";

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

    const title =
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
            clean(
              route.name
            )
              .toLowerCase() ===
            title.toLowerCase()
        );

    if (found) {
      return found;
    }

    return {
      id:
        routeId ||
        title
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          ),
      name:
        title ||
        "Ruta",
      distanceKm:
        0,
      ascentM:
        0,
      modality:
        "Ciclisme",
      estimatedTime:
        ""
    };
  }

  function parseDuration(text) {
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
            .replace(
              ",",
              "."
            )
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

  function formatMinutes(minutes) {
    const total =
      Math.max(
        0,
        Math.round(
          num(
            minutes
          )
        )
      );

    const h =
      Math.floor(
        total /
        60
      );

    const m =
      total %
      60;

    if (!h) {
      return (
        total +
        " min"
      );
    }

    return (
      h +
      ":" +
      pad(m) +
      " h"
    );
  }

  function storeActivities(list) {
    if (
      window.BiciParkActivitySync
    ) {
      window
        .BiciParkActivitySync
        .writeActivities(
          list
        );

      return;
    }

    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(
        list
      )
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

  function readActivities() {
    if (
      window.BiciParkActivitySync
    ) {
      return window
        .BiciParkActivitySync
        .getActivities({
          includeDemo: true
        });
    }

    try {
      const data =
        JSON.parse(
          localStorage.getItem(
            ACTIVITY_KEY
          ) ||
          "[]"
        );

      return Array.isArray(
        data
      )
        ? data
        : [];
    }
    catch (_) {
      return [];
    }
  }

  function adaptiveScore(route) {
    const result =
      window
        .BiciParkAdaptiveRouteMatch
        ?.adaptiveScore?.(
          route
        );

    return num(
      result?.score,
      num(
        route.compatibilityScore ??
        route.compatibility,
        80
      )
    );
  }

  function feelingAdjustment(feeling) {
    if (
      window.BiciParkActivitySync
        ?.inferredMatchScore
    ) {
      return null;
    }

    const score =
      num(
        feeling,
        4
      );

    if (score >= 5) {
      return 4;
    }

    if (score >= 4) {
      return 1;
    }

    if (score >= 3) {
      return -2;
    }

    if (score >= 2) {
      return -5;
    }

    return -8;
  }

  function finalMatchScore(
    route,
    feeling
  ) {
    const base =
      adaptiveScore(
        route
      );

    if (
      window.BiciParkActivitySync
        ?.inferredMatchScore
    ) {
      return window
        .BiciParkActivitySync
        .inferredMatchScore(
          base,
          feeling
        );
    }

    return Math.max(
      1,
      Math.min(
        99,
        Math.round(
          base +
          feelingAdjustment(
            feeling
          )
        )
      )
    );
  }

  function createUi() {
    if (
      document.getElementById(
        "bp-route-done-modal"
      )
    ) {
      return;
    }

    const backdrop =
      document.createElement(
        "div"
      );

    backdrop.id =
      "bp-route-done-backdrop";

    backdrop.className =
      "bp-route-done-backdrop";

    const modal =
      document.createElement(
        "section"
      );

    modal.id =
      "bp-route-done-modal";

    modal.className =
      "bp-route-done-modal";

    modal.innerHTML =
      '<div class="bp-route-done-head">' +
        "<div>" +
          "<span>Activitat real</span>" +
          "<h3>He fet aquesta ruta</h3>" +
          "<p>Registra com ha anat la sortida. Aquestes dades alimentaran el teu Historial i l'Adaptive Route Match.</p>" +
        "</div>" +
        '<button type="button" class="bp-route-done-close" aria-label="Tancar">\u00d7</button>' +
      "</div>" +

      '<form id="bp-route-done-form" class="bp-route-done-body">' +
        '<div class="bp-route-done-route">' +
          '<span>\ud83d\udeb2</span>' +
          "<div>" +
            '<strong id="bp-route-done-name"></strong>' +
            '<small id="bp-route-done-meta"></small>' +
          "</div>" +
        "</div>" +

        '<div class="bp-route-done-grid">' +
          '<label><span>Data</span><input name="date" type="date" required></label>' +
          '<label><span>Hora</span><input name="time" type="time"></label>' +
          '<label><span>Dist\u00e0ncia real (km)</span><input name="distanceKm" type="number" min="0" step="0.1"></label>' +
          '<label><span>Desnivell real (m+)</span><input name="ascentM" type="number" min="0" step="1"></label>' +
          '<label class="is-wide"><span>Temps real</span><input name="duration" type="text" placeholder="Ex. 2:15 h"></label>' +
          '<label class="is-wide"><span>Modalitat</span><select name="type">' +
            "<option>Carretera</option>" +
            "<option>Gravel</option>" +
            "<option>MTB</option>" +
            "<option>Urbana</option>" +
            "<option>Ciclisme</option>" +
          "</select></label>" +
        "</div>" +

        '<div class="bp-route-done-feeling-block">' +
          "<strong>Com t'has sentit?</strong>" +
          '<div class="bp-route-done-feelings">' +
            '<button type="button" data-feeling="5"><span>\u263a</span>Molt b\u00e9</button>' +
            '<button type="button" data-feeling="4"><span>\ud83d\udc4d</span>B\u00e9</button>' +
            '<button type="button" data-feeling="3"><span>\ud83d\udeb2</span>Exigent</button>' +
            '<button type="button" data-feeling="2"><span>!</span>Massa dura</button>' +
          "</div>" +
        "</div>" +

        '<div class="bp-route-done-actions">' +
          '<button type="button" class="bp-route-done-secondary">Cancel\u00b7lar</button>' +
          '<button type="submit" class="bp-route-done-primary">Guardar activitat</button>' +
        "</div>" +
      "</form>";

    document.body.appendChild(
      backdrop
    );

    document.body.appendChild(
      modal
    );

    backdrop.addEventListener(
      "click",
      closeModal
    );

    modal
      .querySelector(
        ".bp-route-done-close"
      )
      .addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelector(
        ".bp-route-done-secondary"
      )
      .addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelectorAll(
        "[data-feeling]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            () => {
              modal
                .querySelectorAll(
                  "[data-feeling]"
                )
                .forEach(
                  item =>
                    item.classList
                      .remove(
                        "is-selected"
                      )
                );

              button.classList.add(
                "is-selected"
              );

              modal.dataset.feeling =
                button.dataset.feeling;
            }
          );
        }
      );

    modal
      .querySelector(
        "#bp-route-done-form"
      )
      .addEventListener(
        "submit",
        saveActivity
      );
  }

  function openModal() {
    createUi();

    const route =
      currentRoute();

    const modal =
      document.getElementById(
        "bp-route-done-modal"
      );

    const backdrop =
      document.getElementById(
        "bp-route-done-backdrop"
      );

    const form =
      document.getElementById(
        "bp-route-done-form"
      );

    modal.__route =
      route;

    document.getElementById(
      "bp-route-done-name"
    ).textContent =
      clean(
        route.name
      );

    document.getElementById(
      "bp-route-done-meta"
    ).textContent =
      [
        num(
          route.distanceKm ??
          route.distance
        )
          ? (
              num(
                route.distanceKm ??
                route.distance
              )
                .toFixed(1)
                .replace(
                  ".",
                  ","
                ) +
              " km"
            )
          : "",
        num(
          route.ascentM ??
          route.ascent
        )
          ? (
              Math.round(
                num(
                  route.ascentM ??
                  route.ascent
                )
              ) +
              " m+"
            )
          : "",
        clean(
          route.modality ||
          route.type
        )
      ]
        .filter(Boolean)
        .join(
          " \u00b7 "
        );

    form.elements.date.value =
      today();

    form.elements.time.value =
      currentTime();

    const distance =
      num(
        route.distanceKm ??
        route.distance
      );

    form.elements.distanceKm.value =
      distance
        ? distance
            .toFixed(1)
        : "";

    const ascent =
      num(
        route.ascentM ??
        route.ascent
      );

    form.elements.ascentM.value =
      ascent
        ? Math.round(
            ascent
          )
        : "";

    const estimatedMinutes =
      parseDuration(
        route.estimatedTime ||
        route.duration
      );

    form.elements.duration.value =
      estimatedMinutes
        ? formatMinutes(
            estimatedMinutes
          )
        : "";

    const mode =
      clean(
        route.modality ||
        route.type ||
        "Ciclisme"
      );

    const option =
      Array.from(
        form.elements.type.options
      )
        .find(
          item =>
            mode
              .toLowerCase()
              .includes(
                item.value
                  .toLowerCase()
              )
        );

    form.elements.type.value =
      option
        ? option.value
        : "Ciclisme";

    modal.dataset.feeling =
      "4";

    modal
      .querySelectorAll(
        "[data-feeling]"
      )
      .forEach(
        item => {
          item.classList.toggle(
            "is-selected",
            item.dataset.feeling ===
            "4"
          );
        }
      );

    backdrop.classList.add(
      "is-visible"
    );

    modal.classList.add(
      "is-visible"
    );

    document.documentElement
      .style.overflow =
      "hidden";
  }

  function closeModal() {
    document.getElementById(
      "bp-route-done-backdrop"
    )
      ?.classList
      .remove(
        "is-visible"
      );

    document.getElementById(
      "bp-route-done-modal"
    )
      ?.classList
      .remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function saveActivity(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const modal =
      document.getElementById(
        "bp-route-done-modal"
      );

    const route =
      modal.__route ||
      currentRoute();

    const data =
      new FormData(
        form
      );

    const feeling =
      num(
        modal.dataset.feeling,
        4
      );

    const activity = {
      id:
        uid(),
      demo:
        false,
      source:
        "route-detail",
      routeId:
        clean(
          route.id
        ),
      date:
        clean(
          data.get(
            "date"
          )
        ),
      time:
        clean(
          data.get(
            "time"
          )
        ),
      name:
        clean(
          route.name
        ),
      location:
        clean(
          route.location ||
          route.area ||
          ""
        ),
      type:
        clean(
          data.get(
            "type"
          )
        ),
      distanceKm:
        num(
          data.get(
            "distanceKm"
          )
        ),
      ascentM:
        num(
          data.get(
            "ascentM"
          )
        ),
      duration:
        clean(
          data.get(
            "duration"
          )
        ),
      difficulty:
        clean(
          route.difficultyLabel ||
          route.difficulty ||
          ""
        ),
      feeling:
        feeling,
      matchScore:
        finalMatchScore(
          route,
          feeling
        ),
      planRelation:
        "Activitat lliure",
      planSession:
        "Fora del pla",
      planSessionActive:
        false,
      createdAt:
        new Date()
          .toISOString(),
      updatedAt:
        new Date()
          .toISOString()
    };

    let list =
      readActivities()
        .filter(
          item =>
            !item.demo
        );

    list.push(
      activity
    );

    storeActivities(
      list
    );

    closeModal();
    markButtonDone();
    showToast(
      "Activitat guardada a l'Historial"
    );
  }

  function findActionsHost() {
    const buttons =
      Array.from(
        document.querySelectorAll(
          "button, a"
        )
      );

    const planButton =
      buttons.find(
        node =>
          clean(
            node.textContent
          )
            .toLowerCase()
            .includes(
              "afegeix al meu pla"
            )
      );

    if (
      planButton
        ?.parentElement
    ) {
      return {
        host:
          planButton.parentElement,
        after:
          planButton
      };
    }

    const downloadButton =
      buttons.find(
        node =>
          clean(
            node.textContent
          )
            .toLowerCase()
            .includes(
              "descarregar"
            )
      );

    if (
      downloadButton
        ?.parentElement
    ) {
      return {
        host:
          downloadButton.parentElement,
        after:
          null
      };
    }

    return null;
  }

  function installButton() {
    if (
      document.getElementById(
        "bp-route-done-button"
      )
    ) {
      return true;
    }

    const target =
      findActionsHost();

    if (!target) {
      return false;
    }

    const button =
      document.createElement(
        "button"
      );

    button.id =
      "bp-route-done-button";

    button.type =
      "button";

    button.className =
      "bp-route-done-button";

    button.innerHTML =
      '<span>\u2713</span> He fet aquesta ruta';

    button.addEventListener(
      "click",
      openModal
    );

    if (
      target.after
        ?.nextSibling
    ) {
      target.host.insertBefore(
        button,
        target.after.nextSibling
      );
    }
    else {
      target.host.appendChild(
        button
      );
    }

    return true;
  }

  function markButtonDone() {
    const button =
      document.getElementById(
        "bp-route-done-button"
      );

    if (!button) {
      return;
    }

    button.classList.add(
      "is-done"
    );

    button.innerHTML =
      '<span>\u2713</span> Ruta registrada';
  }

  function showToast(message) {
    let toast =
      document.getElementById(
        "bp-route-done-toast"
      );

    if (!toast) {
      toast =
        document.createElement(
          "div"
        );

      toast.id =
        "bp-route-done-toast";

      toast.className =
        "bp-route-done-toast";

      document.body.appendChild(
        toast
      );
    }

    toast.textContent =
      message;

    toast.classList.add(
      "is-visible"
    );

    window.setTimeout(
      () => {
        toast.classList.remove(
          "is-visible"
        );
      },
      2600
    );
  }

  function boot() {
    createUi();

    [
      0,
      150,
      400,
      900,
      1600
    ]
      .forEach(
        delay =>
          window.setTimeout(
            installButton,
            delay
          )
      );

    console.info(
      "[BiciPark] Route Completion v1 loaded"
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