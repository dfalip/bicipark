(() => {
  "use strict";

  if (window.__BICIPARK_ADAPTIVE_POLISH_111__) {
    return;
  }

  window.__BICIPARK_ADAPTIVE_POLISH_111__ = true;

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function fixText(node) {
    if (!node) {
      return;
    }

    const replacements = [
      [
        "BiciPark esta aprenent de tu",
        "BiciPark est\u00e0 aprenent de tu"
      ],
      [
        "Confianca Baixa",
        "Confian\u00e7a baixa"
      ],
      [
        "Confianca baixa",
        "Confian\u00e7a baixa"
      ],
      [
        "Confianca Mitjana",
        "Confian\u00e7a mitjana"
      ],
      [
        "Confianca Alta",
        "Confian\u00e7a alta"
      ],
      [
        "Primer periode registrat",
        "Primer per\u00edode registrat"
      ],
      [
        "Seguent pas",
        "Seg\u00fcent pas"
      ],
      [
        "Distancia observada",
        "Dist\u00e0ncia observada"
      ],
      [
        "Sensacio mitjana",
        "Sensaci\u00f3 mitjana"
      ],
      [
        "progressio",
        "progressi\u00f3"
      ],
      [
        "Progressio",
        "Progressi\u00f3"
      ],
      [
        "opcio",
        "opci\u00f3"
      ],
      [
        "Opcio",
        "Opci\u00f3"
      ],
      [
        "mes activitats",
        "m\u00e9s activitats"
      ],
      [
        "mes historial",
        "m\u00e9s historial"
      ],
      [
        "esta aprenent",
        "est\u00e0 aprenent"
      ],
      [
        "mantindra",
        "mantindr\u00e0"
      ],
      [
        "apren del teu historial",
        "apr\u00e8n del teu historial"
      ]
    ];

    const walker =
      document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT
      );

    const textNodes = [];

    while (
      walker.nextNode()
    ) {
      textNodes.push(
        walker.currentNode
      );
    }

    textNodes.forEach(
      textNode => {
        let value =
          textNode.nodeValue;

        replacements.forEach(
          pair => {
            value =
              value.split(
                pair[0]
              )
              .join(
                pair[1]
              );
          }
        );

        textNode.nodeValue =
          value;
      }
    );
  }

  function engine() {
    return window
      .BiciParkAdaptiveRouteMatch;
  }

  function findRouteForCard(card) {
    const href =
      card.getAttribute(
        "href"
      ) ||
      "";

    let id = "";

    try {
      const url =
        new URL(
          href,
          window.location.href
        );

      id =
        url.searchParams.get(
          "route"
        ) ||
        "";
    }
    catch (_) {}

    const catalog =
      engine()
        ?.routeCatalog?.() ||
      [];

    return (
      catalog.find(
        route =>
          String(
            route.id
          ) ===
          id
      ) ||
      catalog.find(
        route =>
          clean(
            card.querySelector(
              ".bp-adaptive-route-top strong"
            )
              ?.textContent
          )
            .toLowerCase() ===
          clean(
            route.name
          )
            .toLowerCase()
      ) ||
      null
    );
  }

  function classifyRoute(route) {
    const observed =
      engine()
        ?.observedMetrics?.();

    if (
      !observed ||
      !route
    ) {
      return {
        code: "balanced",
        label: "Alternativa"
      };
    }

    const base =
      Math.max(
        Number(
          observed.avgDistanceKm
        ) ||
        1,
        1
      );

    const ratio =
      Number(
        route.distanceKm
      ) /
      base;

    if (
      ratio <=
      .92
    ) {
      return {
        code: "recovery",
        label: "Sortida suau"
      };
    }

    if (
      ratio >=
      1.05 &&
      ratio <=
      1.30
    ) {
      return {
        code: "progression",
        label: "Progressi\u00f3 suau"
      };
    }

    if (
      ratio >
      1.55
    ) {
      return {
        code: "future",
        label: "Repte futur"
      };
    }

    return {
      code: "balanced",
      label: "Alternativa"
    };
  }

  function ensurePurposeBadges() {
    const section =
      document.getElementById(
        "bp-adaptive-section"
      );

    if (!section) {
      return;
    }

    section
      .querySelectorAll(
        ".bp-adaptive-route-card"
      )
      .forEach(
        card => {
          const route =
            findRouteForCard(
              card
            );

          const purpose =
            classifyRoute(
              route
            );

          let badge =
            card.querySelector(
              ".bp-adaptive-purpose"
            );

          if (!badge) {
            badge =
              document.createElement(
                "div"
              );

            card.insertAdjacentElement(
              "afterbegin",
              badge
            );
          }

          badge.className =
            "bp-adaptive-purpose is-" +
            purpose.code;

          badge.textContent =
            purpose.label;
        }
      );
  }

  function fixKpiAccents() {
    [
      "bp-kpi-rides-delta",
      "bp-kpi-time-delta",
      "bp-kpi-ascent-delta",
      "bp-kpi-distance-delta",
      "bp-kpi-level-delta"
    ]
      .forEach(
        id => {
          const node =
            document.getElementById(
              id
            );

          if (
            node &&
            clean(
              node.textContent
            ) ===
            "Primer periode registrat"
          ) {
            node.textContent =
              "Primer per\u00edode registrat";
          }
        }
      );
  }

  function polish() {
    const section =
      document.getElementById(
        "bp-adaptive-section"
      );

    fixText(section);
    ensurePurposeBadges();
    fixKpiAccents();
  }

  function finiteRetries() {
    [
      0,
      120,
      300,
      700,
      1300
    ]
      .forEach(
        delay =>
          window.setTimeout(
            polish,
            delay
          )
      );
  }

  function boot() {
    finiteRetries();

    window.addEventListener(
      "bicipark:activity-history:updated",
      finiteRetries
    );

    window.addEventListener(
      "bicipark:adaptive-route-match:updated",
      finiteRetries
    );

    console.info(
      "[BiciPark] Adaptive visual polish v1.1.1 loaded"
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