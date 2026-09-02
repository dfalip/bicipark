(() => {
  "use strict";

  if (
    window.__BICIPARK_POPULARITY_ROUTE_TRACKER_V2__
  ) {
    return;
  }

  window.__BICIPARK_POPULARITY_ROUTE_TRACKER_V2__ = true;

  const STORAGE_KEY =
    "bicipark.popularity.events.v1";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function cleanRouteName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function canonicalId(name, explicitId) {
    const text =
      normalize(
        explicitId || name
      );

    if (
      /carretera.*aigues/.test(text)
    ) {
      return "carretera-aigues";
    }

    if (
      /front.*maritim/.test(text)
    ) {
      return "front-maritim";
    }

    if (
      /\bbesos\b/.test(text)
    ) {
      return "riu-besos";
    }

    return text
      .replace(/^dynamic\s+/, "")
      .replace(/\s+/g, "-")
      .slice(0, 110);
  }

  function readEvents() {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveEvent(event) {
    try {
      const events =
        readEvents();

      events.push(event);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          events.slice(-1000)
        )
      );
    } catch (_) {}
  }

  function cardFor(node) {
    let current =
      node;

    for (
      let depth = 0;
      depth < 8 &&
      current;
      depth++
    ) {
      const text =
        cleanRouteName(
          current.textContent
        );

      if (
        text.length > 18 &&
        (
          /\bkm\b/i.test(text) ||
          /etapa\s+\d+/i.test(text)
        )
      ) {
        return current;
      }

      current =
        current.parentElement;
    }

    return null;
  }

  function routeName(card) {
    const heading =
      card.querySelector(
        "h1,h2,h3,h4,strong,b"
      );

    if (heading) {
      return cleanRouteName(
        heading.textContent
      );
    }

    const text =
      cleanRouteName(
        card.textContent
      );

    return (
      text.split(
        /\b(?:Carretera|Gravel|MTB|BTT|Facil|Moderada|Dificil|Experta)\b/i
      )[0]
        .trim()
        .slice(0, 140) ||
      text.slice(0, 140)
    );
  }

  function eventType(target) {
    const text =
      target.textContent || "";

    if (
      target.matches(
        "[data-bp-weather-all-routes], .bp-wr-route-btn"
      ) ||
      /meteorologia/i.test(text)
    ) {
      return "weather-open";
    }

    if (
      /veure ruta/i.test(text)
    ) {
      return "route-open";
    }

    return null;
  }

  document.addEventListener(
    "click",
    event => {
      const target =
        event.target.closest(
          "a,button"
        );

      if (!target) {
        return;
      }

      const type =
        eventType(target);

      if (!type) {
        return;
      }

      const card =
        cardFor(target);

      if (!card) {
        return;
      }

      const name =
        routeName(card);

      saveEvent({
        type,
        routeName:
          name,
        routeId:
          canonicalId(
            name,
            card.dataset.routeId ||
            card.dataset.id ||
            ""
          ),
        timestamp:
          new Date().toISOString(),
        source:
          "route-explorer"
      });
    },
    true
  );

  console.info(
    "[Popularity Tracker] v2 ready."
  );
})();