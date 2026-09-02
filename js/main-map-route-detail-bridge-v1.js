(() => {
  "use strict";

  if (
    window.__BICIPARK_ROUTE_DETAIL_BRIDGE_V1__
  ) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_BRIDGE_V1__ =
    true;

  const ROUTES = [
    {
      match:
        /carretera de les aigues/i,
      id:
        "carretera-aigues"
    },
    {
      match:
        /front maritim/i,
      id:
        "front-maritim"
    },
    {
      match:
        /riu besos|riu bes[o\u00f2]s/i,
      id:
        "riu-besos"
    },
    {
      match:
        /volta integral de collserola|collserola classica/i,
      id:
        "volta-integral-collserola"
    }
  ];

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalized(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function repairString(value) {
    const text =
      String(
        value == null ? "" : value
      );

    if (
      !/[\u00c3\u00c2\u00e2]/.test(
        text
      )
    ) {
      return text;
    }

    try {
      const bytes =
        Uint8Array.from(
          Array.from(text)
            .map(char =>
              char.charCodeAt(0)
            )
            .filter(code =>
              code <= 255
            )
        );

      const decoded =
        new TextDecoder(
          "utf-8",
          {
            fatal:
              false
          }
        )
          .decode(
            bytes
          );

      if (
        decoded &&
        !/\uFFFD/.test(
          decoded
        )
      ) {
        return decoded;
      }
    }
    catch (_) {}

    return text;
  }

  function repairTextNodes(root) {
    if (!root) {
      return;
    }

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
      );

    const nodes = [];

    while (
      walker.nextNode()
    ) {
      nodes.push(
        walker.currentNode
      );
    }

    nodes.forEach(node => {
      const fixed =
        repairString(
          node.nodeValue
        );

      if (
        fixed !==
        node.nodeValue
      ) {
        node.nodeValue =
          fixed;
      }
    });
  }

  function routeIdForCard(card) {
    const title =
      clean(
        card.querySelector(
          ".bp-featured-card-title"
        )?.textContent ||
        card.textContent
      );

    const value =
      normalized(title);

    const found =
      ROUTES.find(item =>
        item.match.test(
          value
        )
      );

    return (
      found?.id ||
      null
    );
  }

  function makeCardsOpenDetails() {
    document.querySelectorAll(
      ".bp-proposal-a-sidebar .bp-featured-card"
    )
      .forEach(card => {
        const routeId =
          routeIdForCard(
            card
          );

        if (!routeId) {
          return;
        }

        card.dataset.bpRouteDetail =
          routeId;

        card.title =
          "Obrir Fitxa de Ruta 360";

        if (
          card.dataset.bpRouteDetailBound ===
          "1"
        ) {
          return;
        }

        card.dataset.bpRouteDetailBound =
          "1";

        card.addEventListener(
          "click",
          event => {
            if (
              event.target.closest(
                "a[href]"
              )
            ) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            window.location.href =
              "./modules/route-detail/?route=" +
              encodeURIComponent(
                routeId
              );
          },
          true
        );
      });
  }

  function reconcile() {
    repairTextNodes(
      document.querySelector(
        ".bp-proposal-a-sidebar"
      )
    );

    repairTextNodes(
      document.querySelector(
        ".bp-route-difficulty-legend"
      )
    );

    makeCardsOpenDetails();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      reconcile
    );
  }
  else {
    reconcile();
  }

  const observer =
    new MutationObserver(
      () => {
        reconcile();
      }
    );

  observer.observe(
    document.documentElement,
    {
      childList:
        true,
      subtree:
        true,
      characterData:
        true
    }
  );

  console.info(
    "[BiciPark] Route Detail bridge v1 ready."
  );
})();