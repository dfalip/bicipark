(() => {
  "use strict";

  if (window.BiciParkActivitySync) {
    return;
  }

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const EVENT_NAME =
    "bicipark:activity-history:updated";

  const state = {
    pendingResolve: null,
    selectedFeeling: 4
  };

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

  function pad(value) {
    return String(value)
      .padStart(2, "0");
  }

  function uid() {
    return (
      "act-real-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(16)
        .slice(2, 8)
    );
  }

  function nowDate() {
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

  function nowTime() {
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

  function getActivities(options = {}) {
    let data = [];

    try {
      const raw =
        localStorage.getItem(
          ACTIVITY_KEY
        );

      data =
        raw
          ? JSON.parse(raw)
          : [];
    }
    catch (_) {
      data = [];
    }

    if (
      !Array.isArray(data)
    ) {
      data = [];
    }

    if (
      options.includeDemo ===
      false
    ) {
      return data.filter(
        activity =>
          !activity.demo
      );
    }

    return data;
  }

  function writeActivities(list) {
    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(list)
    );

    window.dispatchEvent(
      new CustomEvent(
        EVENT_NAME,
        {
          detail: {
            activities: list
          }
        }
      )
    );

    return list;
  }

  function hasDemo() {
    return getActivities({
      includeDemo: true
    })
      .some(
        activity =>
          activity.demo
      );
  }

  function hasReal() {
    return getActivities({
      includeDemo: false
    })
      .length > 0;
  }

  function removeDemoActivities() {
    const list =
      getActivities({
        includeDemo: true
      })
        .filter(
          activity =>
            !activity.demo
        );

    writeActivities(list);

    return list;
  }

  function findBySessionKey(sessionKey) {
    return getActivities({
      includeDemo: false
    })
      .find(
        activity =>
          activity.sourceSessionKey ===
          sessionKey
      ) ||
      null;
  }

  function parseDurationMidpoint(text) {
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

    const range =
      value.match(
        /(\d+)\s*-\s*(\d+)\s*min/
      );

    if (range) {
      return Math.round(
        (
          Number(range[1]) +
          Number(range[2])
        ) /
        2
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

  function durationFromMinutes(minutes) {
    const value =
      Math.max(
        0,
        Math.round(
          num(minutes)
        )
      );

    const h =
      Math.floor(
        value /
        60
      );

    const m =
      value %
      60;

    if (!h) {
      return (
        value +
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

  function feelingAdjustment(feeling) {
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

  function inferredMatchScore(
    baseScore,
    feeling
  ) {
    return clamp(
      Math.round(
        num(
          baseScore,
          75
        ) +
        feelingAdjustment(
          feeling
        )
      ),
      1,
      99
    );
  }

  function sessionRelation(session) {
    const id =
      clean(
        session?.id
      );

    if (id === "target") {
      return "Ruta objectiu";
    }

    if (id === "base") {
      return "Base aerobica";
    }

    if (id === "specific") {
      return "Treball tecnic";
    }

    if (id === "recovery") {
      return "Recuperacio";
    }

    return "Sessio del pla";
  }

  function modalityFor(session, route) {
    if (
      session?.id ===
      "recovery"
    ) {
      return "Urbana";
    }

    return (
      clean(
        route?.modality
      ) ||
      "Carretera"
    );
  }

  function difficultyFor(
    session,
    baseScore
  ) {
    if (
      session?.intensity ===
      "easy"
    ) {
      return "Facil";
    }

    if (
      session?.intensity ===
      "target"
    ) {
      return (
        num(baseScore) >=
        80
          ? "Mitjana"
          : "Exigent"
      );
    }

    return "Mitjana";
  }

  function createModal() {
    if (
      document.querySelector(
        ".bp-sync-modal"
      )
    ) {
      return;
    }

    const backdrop =
      document.createElement(
        "div"
      );

    backdrop.className =
      "bp-sync-backdrop";

    const modal =
      document.createElement(
        "section"
      );

    modal.className =
      "bp-sync-modal";

    modal.setAttribute(
      "role",
      "dialog"
    );

    modal.setAttribute(
      "aria-modal",
      "true"
    );

    modal.innerHTML =
      '<div class="bp-sync-head">' +
        "<div>" +
          "<h3>Registra l'activitat real</h3>" +
          "<p>La sessio ja esta marcada com a feta. Afegeix les dades reals per actualitzar el teu progres.</p>" +
        "</div>" +
        '<button class="bp-sync-close" type="button" aria-label="Tancar">\u00d7</button>' +
      "</div>" +

      '<form class="bp-sync-body" id="bp-sync-form">' +
        '<div class="bp-sync-session">' +
          '<span class="bp-sync-session-icon">\ud83d\udeb2</span>' +
          "<div>" +
            '<strong id="bp-sync-session-title">Sessio</strong>' +
            '<small id="bp-sync-session-subtitle"></small>' +
          "</div>" +
        "</div>" +

        '<div class="bp-sync-grid">' +
          '<div class="bp-sync-field">' +
            "<label>Data</label>" +
            '<input name="date" type="date" required>' +
          "</div>" +

          '<div class="bp-sync-field">' +
            "<label>Hora</label>" +
            '<input name="time" type="time">' +
          "</div>" +

          '<div class="bp-sync-field is-wide">' +
            "<label>Ruta / activitat</label>" +
            '<input name="name" type="text" required>' +
          "</div>" +

          '<div class="bp-sync-field">' +
            "<label>Distancia real (km)</label>" +
            '<input name="distanceKm" type="number" min="0" step="0.1" placeholder="Ex. 18,4">' +
          "</div>" +

          '<div class="bp-sync-field">' +
            "<label>Desnivell real (m+)</label>" +
            '<input name="ascentM" type="number" min="0" step="1" placeholder="Ex. 270">' +
          "</div>" +

          '<div class="bp-sync-field">' +
            "<label>Temps real</label>" +
            '<input name="duration" type="text" placeholder="Ex. 2:15 h">' +
          "</div>" +

          '<div class="bp-sync-field">' +
            "<label>Modalitat</label>" +
            '<select name="type">' +
              "<option>Carretera</option>" +
              "<option>Gravel</option>" +
              "<option>MTB</option>" +
              "<option>Urbana</option>" +
            "</select>" +
          "</div>" +

          '<div class="bp-sync-field is-wide">' +
            "<label>Com t'has sentit?</label>" +
            '<div class="bp-sync-feeling">' +
              '<button type="button" data-feeling="5"><span>\u263a</span>Facil</button>' +
              '<button type="button" data-feeling="4"><span>\ud83d\udc4d</span>Be</button>' +
              '<button type="button" data-feeling="3"><span>\ud83d\udeb2</span>Exigent</button>' +
              '<button type="button" data-feeling="2"><span>!</span>Massa dura</button>' +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="bp-sync-note">' +
          "Aquesta activitat alimentara les estadistiques reals d'El meu pla i Historial. Desmarcar la sessio mes endavant no esborrara aquesta activitat." +
        "</div>" +

        '<div class="bp-sync-actions">' +
          '<button class="bp-sync-secondary" type="button" data-sync-action="later">Ara no</button>' +
          '<button class="bp-sync-primary" type="submit">Guardar activitat</button>' +
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
      () => {
        finishModal({
          saved: false,
          deferred: true
        });
      }
    );

    modal
      .querySelector(
        ".bp-sync-close"
      )
      .addEventListener(
        "click",
        () => {
          finishModal({
            saved: false,
            deferred: true
          });
        }
      );

    modal
      .querySelector(
        '[data-sync-action="later"]'
      )
      .addEventListener(
        "click",
        () => {
          finishModal({
            saved: false,
            deferred: true
          });
        }
      );

    modal
      .querySelectorAll(
        "[data-feeling]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            selectFeeling(
              Number(
                button.dataset.feeling
              )
            );
          }
        );
      });

    modal
      .querySelector(
        "#bp-sync-form"
      )
      .addEventListener(
        "submit",
        submitModal
      );
  }

  function selectFeeling(value) {
    state.selectedFeeling =
      value;

    document
      .querySelectorAll(
        ".bp-sync-feeling [data-feeling]"
      )
      .forEach(button => {
        button.classList.toggle(
          "is-selected",
          Number(
            button.dataset.feeling
          ) ===
          value
        );
      });
  }

  function closeModalVisual() {
    document
      .querySelector(
        ".bp-sync-backdrop"
      )
      ?.classList.remove(
        "is-visible"
      );

    document
      .querySelector(
        ".bp-sync-modal"
      )
      ?.classList.remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function finishModal(result) {
    closeModalVisual();

    const resolve =
      state.pendingResolve;

    state.pendingResolve =
      null;

    if (resolve) {
      resolve(result);
    }
  }

  function submitModal(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const data =
      new FormData(form);

    const context =
      form.__bpContext;

    if (!context) {
      finishModal({
        saved: false
      });

      return;
    }

    const existing =
      findBySessionKey(
        context.sessionKey
      );

    const baseScore =
      num(
        context.route
          ?.compatibilityScore,
        75
      );

    const feeling =
      state.selectedFeeling;

    const activity = {
      id:
        existing?.id ||
        uid(),

      demo:
        false,

      source:
        "my-plan",

      sourceSessionKey:
        context.sessionKey,

      planWeek:
        context.week,

      planSessionId:
        context.session?.id,

      planSessionActive:
        true,

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
          data.get(
            "name"
          )
        ),

      location:
        clean(
          context.route
            ?.location ||
          context.route
            ?.area ||
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
        difficultyFor(
          context.session,
          baseScore
        ),

      feeling:
        feeling,

      matchScore:
        inferredMatchScore(
          baseScore,
          feeling
        ),

      planRelation:
        sessionRelation(
          context.session
        ),

      planSession:
        "Sessio " +
        context.week +
        " \u00b7 " +
        clean(
          context.session?.day
        ),

      createdAt:
        existing
          ?.createdAt ||
        new Date()
          .toISOString(),

      updatedAt:
        new Date()
          .toISOString()
    };

    let list =
      getActivities({
        includeDemo: true
      });

    /*
     * First real activity: remove the demonstration rows
     * automatically so KPIs immediately become real.
     */
    if (
      list.some(
        item =>
          item.demo
      )
    ) {
      list =
        list.filter(
          item =>
            !item.demo
        );
    }

    list =
      list.filter(
        item =>
          item.id !==
          activity.id &&
          item.sourceSessionKey !==
          activity.sourceSessionKey
      );

    list.push(
      activity
    );

    writeActivities(
      list
    );

    finishModal({
      saved: true,
      activity
    });
  }

  function capturePlanSession(context) {
    createModal();

    const modal =
      document.querySelector(
        ".bp-sync-modal"
      );

    const backdrop =
      document.querySelector(
        ".bp-sync-backdrop"
      );

    const form =
      modal.querySelector(
        "#bp-sync-form"
      );

    const session =
      context.session ||
      {};

    const route =
      context.route ||
      {};

    const sessionKey =
      context.sessionKey ||
      (
        "w" +
        context.week +
        ":" +
        clean(
          session.id
        )
      );

    const existing =
      findBySessionKey(
        sessionKey
      );

    const defaultDistance =
      existing
        ? existing.distanceKm
        : (
            session.id ===
            "target"
              ? num(
                  session.targetDistance,
                  route.distanceKm
                )
              : 0
          );

    const defaultAscent =
      existing
        ? existing.ascentM
        : (
            session.id ===
            "target"
              ? num(
                  session.targetAscent,
                  route.ascentM
                )
              : 0
          );

    const durationMinutes =
      parseDurationMidpoint(
        session.duration
      );

    form.__bpContext = {
      ...context,
      sessionKey
    };

    form.elements.date.value =
      existing?.date ||
      nowDate();

    form.elements.time.value =
      existing?.time ||
      nowTime();

    form.elements.name.value =
      existing?.name ||
      (
        session.id ===
        "target"
          ? clean(
              route.name
            )
          : (
              clean(
                session.type
              ) +
              " \u00b7 " +
              clean(
                route.name
              )
            )
      );

    form.elements.distanceKm.value =
      defaultDistance
        ? Number(
            defaultDistance
          )
            .toFixed(1)
        : "";

    form.elements.ascentM.value =
      defaultAscent
        ? Math.round(
            defaultAscent
          )
        : "";

    form.elements.duration.value =
      existing?.duration ||
      (
        durationMinutes
          ? durationFromMinutes(
              durationMinutes
            )
          : clean(
              session.duration
            )
      );

    form.elements.type.value =
      existing?.type ||
      modalityFor(
        session,
        route
      );

    modal.querySelector(
      "#bp-sync-session-title"
    ).textContent =
      clean(
        session.type
      ) ||
      "Sessio completada";

    modal.querySelector(
      "#bp-sync-session-subtitle"
    ).textContent =
      "Setmana " +
      context.week +
      " \u00b7 " +
      clean(
        session.day
      ) +
      " \u00b7 " +
      clean(
        session.duration
      );

    selectFeeling(
      existing?.feeling ||
      4
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

    return new Promise(
      resolve => {
        state.pendingResolve =
          resolve;
      }
    );
  }

  function unlinkPlanSession(sessionKey) {
    const list =
      getActivities({
        includeDemo: true
      });

    let changed = false;

    list.forEach(
      activity => {
        if (
          activity.sourceSessionKey ===
          sessionKey &&
          activity.planSessionActive !==
          false
        ) {
          activity.planSessionActive =
            false;

          activity.updatedAt =
            new Date()
              .toISOString();

          changed = true;
        }
      }
    );

    if (changed) {
      writeActivities(list);
    }
  }

  function linkPlanSession(sessionKey) {
    const list =
      getActivities({
        includeDemo: true
      });

    let changed = false;

    list.forEach(
      activity => {
        if (
          activity.sourceSessionKey ===
          sessionKey &&
          activity.planSessionActive !==
          true
        ) {
          activity.planSessionActive =
            true;

          activity.updatedAt =
            new Date()
              .toISOString();

          changed = true;
        }
      }
    );

    if (changed) {
      writeActivities(list);
    }
  }

  function recentRealMetrics(days = 7) {
    const now =
      new Date();

    const list =
      getActivities({
        includeDemo: false
      })
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
        );

    let minutes = 0;
    let ascent = 0;
    let distance = 0;

    list.forEach(
      activity => {
        minutes +=
          parseDurationMidpoint(
            activity.duration
          );

        ascent +=
          num(
            activity.ascentM
          );

        distance +=
          num(
            activity.distanceKm
          );
      }
    );

    return {
      realCount:
        list.length,

      rides:
        list.length,

      minutes:
        Math.round(
          minutes
        ),

      ascent:
        Math.round(
          ascent
        ),

      distanceKm:
        distance
    };
  }

  function renderDemoCleanup() {
    if (
      !document.body ||
      !window.location.pathname
        .includes(
          "/activity-history/"
        )
    ) {
      return;
    }

    const existing =
      document.querySelector(
        ".bp-demo-banner"
      );

    if (!hasDemo()) {
      existing?.remove();
      return;
    }

    if (existing) {
      return;
    }

    const head =
      document.querySelector(
        ".bp-main-head"
      );

    if (!head) {
      return;
    }

    const banner =
      document.createElement(
        "div"
      );

    banner.className =
      "bp-demo-banner";

    banner.innerHTML =
      "<div><strong>Dades de demostracio actives</strong><br>" +
      "Aquestes activitats serveixen nomes per validar la pantalla. La primera activitat real les eliminara automaticament.</div>" +
      '<button type="button">Eliminar dades de demostracio</button>';

    head.insertAdjacentElement(
      "afterend",
      banner
    );

    banner
      .querySelector(
        "button"
      )
      .addEventListener(
        "click",
        () => {
          removeDemoActivities();
          banner.remove();

          if (
            typeof window
              .BiciParkActivityHistoryRefresh ===
            "function"
          ) {
            window
              .BiciParkActivityHistoryRefresh();
          }
          else {
            window.location.reload();
          }
        }
      );
  }

  window.addEventListener(
    EVENT_NAME,
    renderDemoCleanup
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      renderDemoCleanup
    );
  }
  else {
    renderDemoCleanup();
  }

  window.BiciParkActivitySync = {
    ACTIVITY_KEY,
    getActivities,
    writeActivities,
    hasDemo,
    hasReal,
    removeDemoActivities,
    findBySessionKey,
    capturePlanSession,
    unlinkPlanSession,
    linkPlanSession,
    recentRealMetrics,
    inferredMatchScore,
    renderDemoCleanup
  };
})();