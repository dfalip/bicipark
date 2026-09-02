(() => {
  "use strict";

  const ACTIVITY_KEY =
    "bicipark.activityHistory.v1";

  const PROFILE_KEY =
    "bicipark.routeMatch.profile.v1";

  const PLAN_KEY =
    "bicipark.routeMatch.trainingPlan.v2";

  const MY_PLAN_STATE_KEY =
    "bicipark.myPlan.state.v1";

  const TIPS = [
    "Dormir b\u00e9 \u00e9s tan important com entrenar. Intenta descansar prou per recuperar millor.",
    "Hidrata't abans de tenir set i menja alguna cosa en sortides de m\u00e9s d'una hora.",
    "Una sessi\u00f3 suau tamb\u00e9 \u00e9s entrenament. La const\u00e0ncia pesa m\u00e9s que un dia molt intens.",
    "Despr\u00e9s d'una sortida exigent, prioritza descans, hidrataci\u00f3 i menjar suficient."
  ];

  const state = {
    activities: [],
    profile: null,
    plan: null,
    myPlan: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function uid() {
    return (
      "act-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(16)
        .slice(2, 8)
    );
  }

  function isoDateDaysAgo(days) {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(
      date.getDate() - days
    );

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate())
    );
  }

  function demoActivities() {
    return [
      {
        id: "demo-1",
        demo: true,
        date: isoDateDaysAgo(2),
        time: "09:15",
        name: "Carretera de les Aig\u00fces",
        location: "Barcelona",
        type: "Carretera",
        distanceKm: 18.4,
        ascentM: 270,
        duration: "2:15 h",
        difficulty: "Mitjana",
        feeling: 4,
        matchScore: 88,
        planRelation: "Ruta objectiu",
        planSession: "Sessi\u00f3 3 \u00b7 Setmana 1"
      },
      {
        id: "demo-2",
        demo: true,
        date: isoDateDaysAgo(5),
        time: "08:20",
        name: "Coll de la Batalla",
        location: "Montserrat",
        type: "Carretera",
        distanceKm: 24.7,
        ascentM: 780,
        duration: "2:48 h",
        difficulty: "Exigent",
        feeling: 3,
        matchScore: 71,
        planRelation: "Treball t\u00e8cnic",
        planSession: "Sessi\u00f3 2 \u00b7 Setmana 1"
      },
      {
        id: "demo-3",
        demo: true,
        date: isoDateDaysAgo(8),
        time: "07:45",
        name: "Front Mar\u00edtim",
        location: "Barcelona",
        type: "Carretera",
        distanceKm: 15.2,
        ascentM: 120,
        duration: "1:18 h",
        difficulty: "F\u00e0cil",
        feeling: 5,
        matchScore: 92,
        planRelation: "Base aer\u00f2bica",
        planSession: "Sessi\u00f3 1 \u00b7 Setmana 1"
      },
      {
        id: "demo-4",
        demo: true,
        date: isoDateDaysAgo(12),
        time: "09:05",
        name: "Vall de Ribes",
        location: "Ribes de Freser",
        type: "MTB",
        distanceKm: 32.1,
        ascentM: 920,
        duration: "3:32 h",
        difficulty: "Exigent",
        feeling: 2,
        matchScore: 54,
        planRelation: "",
        planSession: ""
      },
      {
        id: "demo-5",
        demo: true,
        date: isoDateDaysAgo(15),
        time: "08:10",
        name: "Passeig de Gr\u00e0cia",
        location: "Barcelona",
        type: "Urbana",
        distanceKm: 8.6,
        ascentM: 45,
        duration: "0:38 h",
        difficulty: "Molt f\u00e0cil",
        feeling: 5,
        matchScore: 96,
        planRelation: "Recuperaci\u00f3",
        planSession: ""
      }
    ];
  }

  function readActivities() {
    /*
     * Activity Sync owns the data store when available.
     * Existing demo rows are preserved until the user cleans them or
     * records the first real activity.
     */
    if (
      window.BiciParkActivitySync
    ) {
      const stored =
        window
          .BiciParkActivitySync
          .getActivities({
            includeDemo: true
          });

      /*
       * Keep first-install demo behaviour only while the store has
       * never been created. Once [] is explicitly stored, do not seed
       * demo rows again.
       */
      if (
        stored.length === 0 &&
        localStorage.getItem(
          ACTIVITY_KEY
        ) === null
      ) {
        const demo =
          demoActivities();

        window
          .BiciParkActivitySync
          .writeActivities(
            demo
          );

        return demo;
      }

      return stored;
    }

    try {
      const raw =
        localStorage.getItem(
          ACTIVITY_KEY
        );

      if (!raw) {
        const demo = demoActivities();

        localStorage.setItem(
          ACTIVITY_KEY,
          JSON.stringify(demo)
        );

        return demo;
      }

      const data = JSON.parse(raw);

      return Array.isArray(data)
        ? data
        : [];
    }
    catch (_) {
      return [];
    }
  }

  function saveActivities() {
    if (
      window.BiciParkActivitySync
    ) {
      window
        .BiciParkActivitySync
        .writeActivities(
          state.activities
        );

      return;
    }

    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(
        state.activities
      )
    );
  }

  function readProfile() {
    if (
      window.BiciParkRiderProfile
        ?.get
    ) {
      return (
        window.BiciParkRiderProfile
          .get()
      );
    }

    try {
      const raw =
        localStorage.getItem(
          PROFILE_KEY
        );

      return raw
        ? JSON.parse(raw)
        : {
            level: "Intermedi",
            daysPerWeek: 3,
            goal: "millorar"
          };
    }
    catch (_) {
      return {
        level: "Intermedi",
        daysPerWeek: 3,
        goal: "millorar"
      };
    }
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

  function dateObj(activity) {
    return new Date(
      activity.date +
      "T" +
      (
        activity.time ||
        "12:00"
      )
    );
  }

  function parseDurationMinutes(text) {
    const value = clean(text);

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

  function formatDuration(minutes) {
    const total =
      Math.round(minutes);

    const h =
      Math.floor(
        total / 60
      );

    const m =
      total % 60;

    if (!h) {
      return m + " min";
    }

    return (
      h +
      "h " +
      pad(m) +
      "m"
    );
  }

  function formatKm(value) {
    return num(value)
      .toFixed(1)
      .replace(".", ",") +
      " km";
  }

  function formatDate(dateText) {
    const d =
      new Date(
        dateText +
        "T12:00:00"
      );

    return d.toLocaleDateString(
      "ca-ES",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  function difficultyClass(value) {
    const text =
      clean(value)
        .toLowerCase();

    if (
      text.includes("exigent") ||
      text.includes("dif")
    ) {
      return "hard";
    }

    if (
      text.includes("mitj")
    ) {
      return "medium";
    }

    return "easy";
  }

  function feelingMeta(value) {
    const score =
      Math.max(
        1,
        Math.min(
          5,
          num(value, 3)
        )
      );

    if (score >= 5) {
      return {
        label: "F\u00e0cil",
        tone: "good"
      };
    }

    if (score >= 4) {
      return {
        label: "B\u00e9",
        tone: "good"
      };
    }

    if (score >= 3) {
      return {
        label: "Exigent",
        tone: "warn"
      };
    }

    return {
      label: "Massa dura",
      tone: "bad"
    };
  }

  function filterActivities() {
    const type =
      byId("bp-filter-type")
        .value;

    const plan =
      byId("bp-filter-plan")
        .value;

    const period =
      byId("bp-filter-period")
        .value;

    const sort =
      byId("bp-sort")
        .value;

    const now = new Date();

    let list =
      state.activities
        .filter(activity => {
          if (
            type !== "all" &&
            activity.type !== type
          ) {
            return false;
          }

          if (
            plan === "plan" &&
            !activity.planRelation
          ) {
            return false;
          }

          if (
            plan === "outside" &&
            activity.planRelation
          ) {
            return false;
          }

          if (period !== "all") {
            const days =
              num(period);

            const age =
              (
                now -
                dateObj(activity)
              ) /
              86400000;

            if (age > days) {
              return false;
            }
          }

          return true;
        });

    if (sort === "distance") {
      list.sort(
        (a, b) =>
          num(b.distanceKm) -
          num(a.distanceKm)
      );
    }
    else if (sort === "ascent") {
      list.sort(
        (a, b) =>
          num(b.ascentM) -
          num(a.ascentM)
      );
    }
    else if (sort === "duration") {
      list.sort(
        (a, b) =>
          parseDurationMinutes(
            b.duration
          ) -
          parseDurationMinutes(
            a.duration
          )
      );
    }
    else {
      list.sort(
        (a, b) =>
          dateObj(b) -
          dateObj(a)
      );
    }

    return list;
  }

  function recentActivities(days) {
    const now = new Date();

    return state.activities
      .filter(activity => {
        const age =
          (
            now -
            dateObj(activity)
          ) /
          86400000;

        return (
          age >= 0 &&
          age <= days
        );
      });
  }

  function previousActivities(days) {
    const now = new Date();

    return state.activities
      .filter(activity => {
        const age =
          (
            now -
            dateObj(activity)
          ) /
          86400000;

        return (
          age > days &&
          age <= days * 2
        );
      });
  }

  function sum(list, accessor) {
    return list.reduce(
      (total, item) =>
        total +
        num(
          accessor(item)
        ),
      0
    );
  }

  function average(list, accessor) {
    if (!list.length) {
      return 0;
    }

    return (
      sum(list, accessor) /
      list.length
    );
  }

  function statsFor(list) {
    return {
      rides: list.length,
      distance:
        sum(
          list,
          item =>
            item.distanceKm
        ),
      ascent:
        sum(
          list,
          item =>
            item.ascentM
        ),
      minutes:
        sum(
          list,
          item =>
            parseDurationMinutes(
              item.duration
            )
        ),
      feeling:
        average(
          list.slice(0, 10),
          item =>
            item.feeling
        ),
      match:
        average(
          list.filter(item =>
            Number.isFinite(
              Number(
                item.matchScore
              )
            )
          ),
          item =>
            item.matchScore
        )
    };
  }

  function levelFromProfile() {
    return (
      clean(
        state.profile
          ?.level
      ) ||
      "Intermedi"
    );
  }

  function renderKpis() {
    const current =
      statsFor(
        recentActivities(28)
      );

    const previous =
      statsFor(
        previousActivities(28)
      );

    byId("bp-kpi-rides")
      .textContent =
      current.rides;

    byId("bp-kpi-time")
      .textContent =
      formatDuration(
        current.minutes
      );

    byId("bp-kpi-ascent")
      .textContent =
      Math.round(
        current.ascent
      )
        .toLocaleString(
          "ca-ES"
        ) +
      " m+";

    byId("bp-kpi-distance")
      .textContent =
      formatKm(
        current.distance
      );

    const level =
      levelFromProfile();

    byId("bp-kpi-level")
      .textContent =
      level;

    byId("bp-level-side")
      .textContent =
      level;

    byId("bp-kpi-match")
      .textContent =
      "Route Match mitj\u00e0: " +
      (
        current.match
          ? Math.round(
              current.match
            ) +
            "%"
          : "--"
      );

    byId("bp-kpi-rides-delta")
      .textContent =
      deltaText(
        current.rides -
        previous.rides,
        "",
        " vs per\u00edode anterior"
      );

    byId("bp-kpi-time-delta")
      .textContent =
      deltaText(
        current.minutes -
        previous.minutes,
        " min",
        ""
      );

    byId("bp-kpi-ascent-delta")
      .textContent =
      deltaText(
        Math.round(
          current.ascent -
          previous.ascent
        ),
        " m+",
        ""
      );

    byId("bp-kpi-distance-delta")
      .textContent =
      deltaText(
        current.distance -
        previous.distance,
        " km",
        ""
      );

    byId("bp-kpi-level-delta")
      .textContent =
      current.match >=
      previous.match
        ? "\u2197 En millora"
        : "\u2198 Revisar c\u00e0rrega";

    renderFeeling(
      current.feeling
    );
  }

  function deltaText(
    value,
    suffix,
    tail
  ) {
    const sign =
      value >= 0
        ? "+"
        : "";

    const display =
      Math.abs(value) < 10 &&
      !Number.isInteger(value)
        ? value
            .toFixed(1)
            .replace(".", ",")
        : Math.round(value);

    return (
      (
        value >= 0
          ? "\u2197 "
          : "\u2198 "
      ) +
      sign +
      display +
      suffix +
      tail
    );
  }

  function renderFeeling(score) {
    const node =
      byId(
        "bp-feeling-score"
      );

    node.textContent =
      score
        ? score
            .toFixed(1)
            .replace(".", ",") +
          " / 5"
        : "-- / 5";

    const dots =
      byId(
        "bp-feeling-dots"
      );

    dots.innerHTML =
      "";

    const rounded =
      Math.round(score);

    for (
      let i = 1;
      i <= 5;
      i++
    ) {
      const dot =
        document.createElement(
          "i"
        );

      if (i <= rounded) {
        dot.className =
          "is-on";
      }

      dots.appendChild(
        dot
      );
    }
  }

  function renderPlanProgress() {
    const progress =
      state.myPlan ||
      {
        currentWeek: 1,
        sessions: {},
        completedWeeks: []
      };

    const week =
      Math.max(
        1,
        Math.min(
          4,
          num(
            progress.currentWeek,
            1
          )
        )
      );

    const labels = [
      "Adaptaci\u00f3",
      "Construcci\u00f3",
      "Consolidaci\u00f3",
      "Objectiu"
    ];

    const completed =
      Object.values(
        progress.sessions ||
        {}
      )
        .filter(Boolean)
        .length;

    const days =
      Math.max(
        1,
        num(
          state.profile
            ?.daysPerWeek,
          3
        )
      );

    const total =
      days *
      4;

    const percent =
      Math.min(
        100,
        Math.round(
          (
            completed /
            total
          ) *
          100
        )
      );

    byId("bp-plan-week")
      .textContent =
      "Setmana " +
      week +
      " de 4 \u00b7 " +
      labels[
        week - 1
      ];

    byId("bp-plan-percent")
      .textContent =
      percent +
      "%";

    byId("bp-plan-bar")
      .style.width =
      percent +
      "%";

    byId("bp-plan-caption")
      .textContent =
      completed +
      " de " +
      total +
      " sessions completades";
  }

  function weeklyBuckets() {
    const now = new Date();

    const buckets =
      [0, 1, 2, 3]
        .map(index => {
          const start =
            new Date(now);

          start.setHours(
            0, 0, 0, 0
          );

          start.setDate(
            start.getDate() -
            (
              27 -
              index *
              7
            )
          );

          const end =
            new Date(start);

          end.setDate(
            end.getDate() +
            6
          );

          const activities =
            state.activities
              .filter(activity => {
                const d =
                  dateObj(activity);

                return (
                  d >= start &&
                  d <= end
                );
              });

          return statsFor(
            activities
          );
        });

    return buckets;
  }

  function renderChart() {
    const buckets =
      weeklyBuckets();

    let values =
      buckets.map(
        bucket =>
          bucket.match
      );

    const fallback =
      average(
        recentActivities(28),
        item =>
          item.matchScore
      ) ||
      70;

    values =
      values.map(
        value =>
          value ||
          fallback
      );

    const points =
      values.map(
        (
          value,
          index
        ) => {
          const x =
            60 +
            index *
            85;

          const y =
            108 -
            (
              Math.max(
                25,
                Math.min(
                  100,
                  value
                )
              ) -
              25
            ) *
            1.2;

          return [
            x,
            y
          ];
        }
      );

    byId("bp-chart-line")
      .setAttribute(
        "points",
        points
          .map(point =>
            point.join(",")
          )
          .join(" ")
      );

    const group =
      byId(
        "bp-chart-points"
      );

    group.innerHTML =
      "";

    points.forEach(
      (
        point,
        index
      ) => {
        const circle =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );

        circle.setAttribute(
          "cx",
          point[0]
        );

        circle.setAttribute(
          "cy",
          point[1]
        );

        circle.setAttribute(
          "r",
          index ===
          points.length - 1
            ? 4
            : 3
        );

        if (
          index ===
          points.length - 1
        ) {
          circle.setAttribute(
            "class",
            "is-last"
          );
        }

        group.appendChild(
          circle
        );
      });

    const current =
      Math.round(
        values[
          values.length - 1
        ]
      );

    const first =
      Math.round(
        values[0]
      );

    byId("bp-chart-current")
      .textContent =
      current +
      "%";

    byId("bp-chart-delta")
      .textContent =
      (
        current >= first
          ? "\u2197 +"
          : "\u2198 "
      ) +
      (
        current -
        first
      ) +
      "%";
  }

  function renderTable() {
    const list =
      filterActivities();

    const body =
      byId(
        "bp-activity-body"
      );

    body.innerHTML =
      "";

    byId("bp-empty")
      .hidden =
      list.length > 0;

    list.forEach(
      activity => {
        const tr =
          document.createElement(
            "tr"
          );

        const diffClass =
          difficultyClass(
            activity.difficulty
          );

        const feeling =
          feelingMeta(
            activity.feeling
          );

        const dots =
          Array.from(
            {
              length: 5
            },
            (_, index) =>
              '<i class="' +
              (
                index <
                num(
                  activity.feeling
                )
                  ? "is-on"
                  : ""
              ) +
              '"></i>'
          )
            .join("");

        const relation =
          activity.planRelation
            ? (
                '<div class="bp-plan-relation">' +
                  "<span>\u2713</span>" +
                  "<div><strong>" +
                    (
                      activity.planSession ||
                      "Relacionada amb el pla"
                    ) +
                  "</strong><small>" +
                    activity.planRelation +
                  "</small></div>" +
                "</div>"
              )
            : (
                '<div class="bp-plan-relation is-outside">' +
                  "<span>i</span>" +
                  "<div><strong>Fora del pla</strong><small>Activitat lliure</small></div>" +
                "</div>"
              );

        tr.innerHTML =
          '<td><div class="bp-date"><strong>' +
            formatDate(
              activity.date
            ) +
          "</strong><small>" +
            (
              activity.time ||
              ""
            ) +
          "</small></div></td>" +

          '<td><div class="bp-route-cell"><span class="bp-thumb"></span><div><strong>' +
            clean(
              activity.name
            ) +
          "</strong><small>" +
            clean(
              activity.location
            ) +
          "</small></div></div></td>" +

          "<td>" +
            formatKm(
              activity.distanceKm
            ) +
          "</td>" +

          "<td>" +
            Math.round(
              num(
                activity.ascentM
              )
            ) +
            " m+" +
          "</td>" +

          "<td>" +
            clean(
              activity.duration
            ) +
          "</td>" +

          '<td><span class="bp-pill ' +
            diffClass +
          '">' +
            clean(
              activity.difficulty
            ) +
          "</span></td>" +

          '<td><div class="bp-feeling ' +
            feeling.tone +
          '"><div class="bp-feeling-head"><span>\u263a</span><span>' +
            feeling.label +
          '</span></div><div class="bp-feeling-dots">' +
            dots +
          "</div></div></td>" +

          "<td>" +
            relation +
          "</td>" +

          '<td><button class="bp-row-menu" type="button" data-action="delete" data-id="' +
            activity.id +
          '">\u22ee</button></td>';

        body.appendChild(
          tr
        );
      });

    body
      .querySelectorAll(
        '[data-action="delete"]'
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const id =
              button.dataset.id;

            const activity =
              state.activities
                .find(
                  item =>
                    item.id === id
                );

            if (!activity) {
              return;
            }

            const confirmed =
              window.confirm(
                "Vols eliminar l'activitat '" +
                activity.name +
                "'?"
              );

            if (!confirmed) {
              return;
            }

            state.activities =
              state.activities
                .filter(
                  item =>
                    item.id !== id
                );

            saveActivities();
            renderAll();

            showToast(
              "Activitat eliminada."
            );
          }
        );
      });
  }

  function renderNextCard() {
    const current =
      statsFor(
        recentActivities(28)
      );

    const previous =
      statsFor(
        previousActivities(28)
      );

    const node =
      byId(
        "bp-next-copy"
      );

    if (
      current.match >
      previous.match +
      3
    ) {
      node.textContent =
        "El teu nivell est\u00e0 millorant. Continua aix\u00ed i aviat podr\u00e0s afrontar rutes m\u00e9s exigents.";
    }
    else if (
      current.rides >= 3
    ) {
      node.textContent =
        "La const\u00e0ncia \u00e9s bona. Mant\u00e9 el ritme i deixa que BiciPark ajusti les properes rutes.";
    }
    else {
      node.textContent =
        "Continua registrant activitats perqu\u00e8 BiciPark pugui ajustar millor les properes recomanacions.";
    }
  }

  function renderTip() {
    const index =
      (
        new Date()
          .getDate() -
        1
      ) %
      TIPS.length;

    byId("bp-tip-text")
      .textContent =
      TIPS[index];
  }

  function renderAll() {
    state.profile =
      readProfile();

    state.plan =
      readJson(
        PLAN_KEY,
        {
          routes: []
        }
      );

    state.myPlan =
      readJson(
        MY_PLAN_STATE_KEY,
        {
          currentWeek: 1,
          sessions: {},
          completedWeeks: []
        }
      );

    renderKpis();
    renderPlanProgress();
    renderChart();
    renderTable();
    renderNextCard();
    renderTip();
  }

  function showToast(text) {
    const toast =
      byId(
        "bp-toast"
      );

    toast.textContent =
      text;

    toast.classList
      .add(
        "is-visible"
      );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          toast.classList
            .remove(
              "is-visible"
            );
        },
        2500
      );
  }

  function openModal() {
    const form =
      byId(
        "bp-activity-form"
      );

    const dateInput =
      form.elements.date;

    if (!dateInput.value) {
      dateInput.value =
        new Date()
          .toISOString()
          .slice(0, 10);
    }

    byId("bp-modal-backdrop")
      .classList
      .add(
        "is-visible"
      );

    byId("bp-activity-modal")
      .classList
      .add(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "hidden";
  }

  function closeModal() {
    byId("bp-modal-backdrop")
      .classList
      .remove(
        "is-visible"
      );

    byId("bp-activity-modal")
      .classList
      .remove(
        "is-visible"
      );

    document.documentElement
      .style.overflow =
      "";
  }

  function submitManual(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const data =
      new FormData(form);

    const relation =
      clean(
        data.get(
          "planRelation"
        )
      );

    state.activities.push({
      id: uid(),
      date: clean(
        data.get("date")
      ),
      time: clean(
        data.get("time")
      ),
      name: clean(
        data.get("name")
      ),
      location: clean(
        data.get("location")
      ),
      type: clean(
        data.get("type")
      ),
      distanceKm: num(
        data.get(
          "distanceKm"
        )
      ),
      ascentM: num(
        data.get(
          "ascentM"
        )
      ),
      duration: clean(
        data.get("duration")
      ),
      difficulty: clean(
        data.get(
          "difficulty"
        )
      ),
      feeling: num(
        data.get(
          "feeling"
        ),
        4
      ),
      matchScore: num(
        data.get(
          "matchScore"
        ),
        75
      ),
      planRelation: relation,
      planSession:
        relation
          ? "Relacionada amb el pla"
          : ""
    });

    saveActivities();
    form.reset();
    closeModal();
    renderAll();

    showToast(
      "Activitat guardada."
    );
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad =
      deg =>
        deg *
        Math.PI /
        180;

    const dLat =
      rad(
        b.lat -
        a.lat
      );

    const dLng =
      rad(
        b.lng -
        a.lng
      );

    const x =
      Math.sin(
        dLat / 2
      ) ** 2 +
      Math.cos(
        rad(a.lat)
      ) *
      Math.cos(
        rad(b.lat)
      ) *
      Math.sin(
        dLng / 2
      ) ** 2;

    return (
      2 *
      R *
      Math.atan2(
        Math.sqrt(x),
        Math.sqrt(
          1 - x
        )
      )
    );
  }

  function parseGpx(text) {
    const doc =
      new DOMParser()
        .parseFromString(
          text,
          "application/xml"
        );

    const points =
      Array.from(
        doc.querySelectorAll(
          "trkpt"
        )
      )
        .map(node => {
          const lat =
            num(
              node.getAttribute(
                "lat"
              )
            );

          const lng =
            num(
              node.getAttribute(
                "lon"
              )
            );

          const eleNode =
            node.querySelector(
              "ele"
            );

          return {
            lat,
            lng,
            ele:
              eleNode
                ? num(
                    eleNode.textContent
                  )
                : null
          };
        })
        .filter(
          point =>
            Number.isFinite(
              point.lat
            ) &&
            Number.isFinite(
              point.lng
            )
        );

    let distance = 0;
    let ascent = 0;

    for (
      let i = 1;
      i < points.length;
      i++
    ) {
      distance +=
        haversineKm(
          points[
            i - 1
          ],
          points[i]
        );

      if (
        Number.isFinite(
          points[i].ele
        ) &&
        Number.isFinite(
          points[
            i - 1
          ].ele
        )
      ) {
        const gain =
          points[i].ele -
          points[
            i - 1
          ].ele;

        if (gain > 0) {
          ascent += gain;
        }
      }
    }

    const name =
      clean(
        doc.querySelector(
          "trk > name"
        )?.textContent
      ) ||
      "Activitat importada";

    return {
      name,
      distanceKm:
        distance,
      ascentM:
        ascent
    };
  }

  function parseGeoJson(text) {
    const data =
      JSON.parse(text);

    const segments = [];

    function addGeometry(geometry) {
      if (!geometry) {
        return;
      }

      if (
        geometry.type ===
        "LineString"
      ) {
        segments.push(
          geometry.coordinates
        );
      }
      else if (
        geometry.type ===
        "MultiLineString"
      ) {
        geometry.coordinates
          .forEach(
            segment =>
              segments.push(
                segment
              )
          );
      }
    }

    if (
      data.type ===
      "FeatureCollection"
    ) {
      data.features
        .forEach(
          feature =>
            addGeometry(
              feature.geometry
            )
        );
    }
    else if (
      data.type ===
      "Feature"
    ) {
      addGeometry(
        data.geometry
      );
    }
    else {
      addGeometry(data);
    }

    let distance = 0;

    segments.forEach(
      segment => {
        for (
          let i = 1;
          i < segment.length;
          i++
        ) {
          distance +=
            haversineKm(
              {
                lng:
                  num(
                    segment[
                      i - 1
                    ][0]
                  ),
                lat:
                  num(
                    segment[
                      i - 1
                    ][1]
                  )
              },
              {
                lng:
                  num(
                    segment[i][0]
                  ),
                lat:
                  num(
                    segment[i][1]
                  )
              }
            );
        }
      }
    );

    return {
      name:
        clean(
          data.name ||
          data.features?.[0]
            ?.properties
            ?.name
        ) ||
        "Activitat importada",

      distanceKm:
        distance,

      ascentM:
        0
    };
  }

  async function importFile(file) {
    const text =
      await file.text();

    let parsed;

    if (
      file.name
        .toLowerCase()
        .endsWith(
          ".gpx"
        )
    ) {
      parsed =
        parseGpx(text);
    }
    else {
      parsed =
        parseGeoJson(text);
    }

    const form =
      byId(
        "bp-activity-form"
      );

    form.elements.date.value =
      new Date()
        .toISOString()
        .slice(0, 10);

    form.elements.name.value =
      parsed.name;

    form.elements.distanceKm.value =
      parsed.distanceKm
        .toFixed(1);

    form.elements.ascentM.value =
      Math.round(
        parsed.ascentM
      );

    form.elements.duration.value =
      "";

    openModal();

    showToast(
      "Tra\u00e7at importat. Completa les dades abans de guardar."
    );
  }

  function bindUi() {
    [
      "bp-filter-type",
      "bp-filter-plan",
      "bp-filter-period",
      "bp-sort"
    ]
      .forEach(id => {
        byId(id)
          .addEventListener(
            "change",
            renderTable
          );
      });

    byId("bp-add-activity")
      .addEventListener(
        "click",
        openModal
      );

    byId("bp-close-modal")
      .addEventListener(
        "click",
        closeModal
      );

    byId("bp-cancel-modal")
      .addEventListener(
        "click",
        closeModal
      );

    byId("bp-modal-backdrop")
      .addEventListener(
        "click",
        closeModal
      );

    byId("bp-activity-form")
      .addEventListener(
        "submit",
        submitManual
      );

    byId("bp-import-file")
      .addEventListener(
        "change",
        async event => {
          const file =
            event.target
              .files?.[0];

          if (!file) {
            return;
          }

          try {
            await importFile(file);
          }
          catch (error) {
            console.error(error);

            showToast(
              "No s'ha pogut llegir aquest fitxer."
            );
          }

          event.target.value =
            "";
        }
      );

    document
      .querySelectorAll(
        "[data-placeholder]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            showToast(
              button.dataset
                .placeholder +
              " quedar\u00e0 connectat en una fase posterior."
            );
          }
        );
      });

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeModal();
        }
      }
    );

    window.addEventListener(
      "storage",
      event => {
        if (
          [
            ACTIVITY_KEY,
            PROFILE_KEY,
            PLAN_KEY,
            MY_PLAN_STATE_KEY
          ]
            .includes(
              event.key
            )
        ) {
          state.activities =
            readActivities();

          renderAll();
        }
      }
    );
  }

  function boot() {
    state.activities =
      readActivities();

    state.profile =
      readProfile();

    state.plan =
      readJson(
        PLAN_KEY,
        {
          routes: []
        }
      );

    state.myPlan =
      readJson(
        MY_PLAN_STATE_KEY,
        {
          currentWeek: 1,
          sessions: {},
          completedWeeks: []
        }
      );

    bindUi();
    renderAll();

    window.BiciParkActivityHistoryRefresh =
      () => {
        state.activities =
          readActivities();

        renderAll();
      };

    window.addEventListener(
      "bicipark:activity-history:updated",
      () => {
        state.activities =
          readActivities();

        renderAll();
      }
    );

    console.info(
      "[BiciPark] Activity History v1 loaded",
      {
        activities:
          state.activities.length
      }
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