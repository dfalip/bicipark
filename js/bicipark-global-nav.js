(() => {
  "use strict";

  if (window.__BICIPARK_GLOBAL_NAV__) return;
  window.__BICIPARK_GLOBAL_NAV__ = true;

  const scripts = Array.from(document.scripts);

  const selfScript =
    scripts.find(script =>
      /\/js\/bicipark-global-nav\.js(?:[?#].*)?$/.test(script.src)
    ) || document.currentScript;

  if (!selfScript || !selfScript.src) return;

  const rootUrl = new URL("../", selfScript.src);

  function url(path) {
    return new URL(path, rootUrl).href;
  }

  function normalizedPath() {
    return window.location.pathname.toLowerCase();
  }

  function currentSection() {
    const path = normalizedPath();

    if (
      path.includes("/bike-bases/") ||
      path.endsWith("/bike-bases")
    ) {
      return "bike-bases";
    }

    if (path.includes("/route-explorer/")) {
      return "routes";
    }

    if (
      path.endsWith("/mapa-ciclista.html") ||
      path.includes("/explora/")
    ) {
      return "map";
    }

    if (
      path.endsWith("/missions.html") ||
      path.includes("/mission-plazaola")
    ) {
      return "missions";
    }

    if (path.includes("missions-sorpresa")) {
      return "surprise";
    }

    if (path.includes("/drag-map-game/")) {
      return "games";
    }

    if (path.includes("/tour-2026/")) {
      return "tour";
    }

    if (path.includes("/bike-jump/")) {
      return "bike-jump";
    }

    return "";
  }

  function findLegacyHeader() {
    const knownWords = [
      "mapa",
      "missions",
      "bike bases",
      "rutes",
      "aparcaments",
      "tour"
    ];

    const candidates = Array.from(
      document.querySelectorAll("body > header, body > nav, header, nav")
    );

    return candidates.find(el => {
      if (el.id === "bp-global-nav") return false;

      const text =
        (el.textContent || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      if (!text.includes("bicipark")) return false;

      const hits =
        knownWords.filter(word => text.includes(word)).length;

      return hits >= 2;
    });
  }

  const section = currentSection();

  const nav = document.createElement("header");
  nav.id = "bp-global-nav";

  const activeMore =
    ["surprise", "games", "tour", "bike-jump"].includes(section);

  nav.innerHTML = `
    <div class="bp-nav-inner">
      <a class="bp-nav-brand" href="${url("index.html")}">
        <span class="bp-nav-brand-mark" aria-hidden="true">\uD83D\uDEB2</span>
        <span class="bp-nav-brand-copy">
          <strong>BiciPark</strong>
          <small>Ride \u00B7 Explore \u00B7 Discover</small>
        </span>
      </a>

      <button
        class="bp-nav-mobile-btn"
        type="button"
        aria-expanded="false"
        aria-label="Obrir navegaci\u00F3"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav class="bp-nav-links" aria-label="Navegaci\u00F3 principal">
        <a
          class="bp-nav-link ${section === "map" ? "is-active" : ""}"
          href="${url("mapa-ciclista.html")}"
          ${section === "map" ? 'aria-current="page"' : ""}
        >
          Mapa
        </a>

        <a
          class="bp-nav-link ${section === "routes" ? "is-active" : ""}"
          href="${url("route-explorer/")}"
          ${section === "routes" ? 'aria-current="page"' : ""}
        >
          Rutes
        </a>

        <a
          class="bp-nav-link ${section === "bike-bases" ? "is-active" : ""}"
          href="${url("bike-bases/explore.html")}"
          ${section === "bike-bases" ? 'aria-current="page"' : ""}
        >
          Bike Bases
        </a>

        <a
          class="bp-nav-link ${section === "missions" ? "is-active" : ""}"
          href="${url("missions.html")}"
          ${section === "missions" ? 'aria-current="page"' : ""}
        >
          Missions
        </a>

        <div class="bp-nav-more ${activeMore ? "is-active" : ""}">
          <button
            class="bp-nav-more-btn"
            type="button"
            aria-expanded="false"
          >
            M\u00E9s

            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M5 7.5 10 12.5 15 7.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="bp-nav-menu">
            <a href="${url("mapa-ciclista.html")}">
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83C\uDD7F\uFE0F</span>
              <span class="bp-nav-menu-copy">
                <strong>Aparcaments</strong>
                <small>Troba on deixar la bicicleta.</small>
              </span>
            </a>

            <a
              class="${section === "surprise" ? "is-active" : ""}"
              href="${url("missions-sorpresa.html")}"
            >
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83C\uDF81</span>
              <span class="bp-nav-menu-copy">
                <strong>Missions sorpresa</strong>
                <small>Reptes ocults i descobriments.</small>
              </span>
            </a>

            <a
              class="${section === "games" ? "is-active" : ""}"
              href="${url("drag-map-game/")}"
            >
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83D\uDCCD</span>
              <span class="bp-nav-menu-copy">
                <strong>Jocs / Descobreix</strong>
                <small>Arrossega el lloc i altres jocs.</small>
              </span>
            </a>

            <a
              class="${section === "tour" ? "is-active" : ""}"
              href="${url("tour-2026/")}"
            >
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83C\uDDEB\uD83C\uDDF7</span>
              <span class="bp-nav-menu-copy">
                <strong>Tour de France 2026</strong>
                <small>Etapes, recorreguts i mapes.</small>
              </span>
            </a>

            <a
              class="${section === "bike-jump" ? "is-active" : ""}"
              href="${url("bike-jump/")}"
            >
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83D\uDEB5</span>
              <span class="bp-nav-menu-copy">
                <strong>Bike Jump</strong>
                <small>Joc de salts i reptes.</small>
              </span>
            </a>

            <a href="${url("index.html#allotjaments")}">
              <span class="bp-nav-menu-icon" aria-hidden="true">\uD83C\uDFE1</span>
              <span class="bp-nav-menu-copy">
                <strong>Per a allotjaments</strong>
                <small>Descobreix Bike Bases BiciPark.</small>
              </span>
            </a>
          </div>
        </div>
      </nav>
    </div>
  `;

  const legacyHeader = findLegacyHeader();

  if (legacyHeader) {
    legacyHeader.classList.add("bicipark-legacy-site-header");
  }

  document.body.insertBefore(nav, document.body.firstChild);
  document.body.classList.add("bp-global-nav-mounted");

  const mobileButton =
    nav.querySelector(".bp-nav-mobile-btn");

  const links =
    nav.querySelector(".bp-nav-links");

  const more =
    nav.querySelector(".bp-nav-more");

  const moreButton =
    nav.querySelector(".bp-nav-more-btn");

  function closeMobile() {
    if (!mobileButton || !links) return;

    links.classList.remove("is-open");
    mobileButton.setAttribute("aria-expanded", "false");
  }

  function closeMore() {
    if (!more || !moreButton) return;

    more.classList.remove("is-open");
    moreButton.setAttribute("aria-expanded", "false");
  }

  if (mobileButton && links) {
    mobileButton.addEventListener("click", event => {
      event.stopPropagation();

      const open =
        !links.classList.contains("is-open");

      links.classList.toggle("is-open", open);
      mobileButton.setAttribute(
        "aria-expanded",
        String(open)
      );
    });
  }

  if (more && moreButton) {
    moreButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const open =
        !more.classList.contains("is-open");

      more.classList.toggle("is-open", open);
      moreButton.setAttribute(
        "aria-expanded",
        String(open)
      );
    });
  }

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      closeMore();

      if (
        window.matchMedia("(max-width: 920px)").matches
      ) {
        closeMobile();
      }
    });
  });

  document.addEventListener("click", event => {
    if (more && !more.contains(event.target)) {
      closeMore();
    }

    if (
      links &&
      mobileButton &&
      window.matchMedia("(max-width: 920px)").matches &&
      !nav.contains(event.target)
    ) {
      closeMobile();
    }
  });

  window.addEventListener("resize", () => {
    if (
      !window.matchMedia("(max-width: 920px)").matches
    ) {
      closeMobile();
    }
  });
})();

/* BICIPARK_ROUTE_MATCH_GLOBAL_NAV_LOADER_START */
(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_MATCH_NAV_LOADER__) return;
  window.__BICIPARK_ROUTE_MATCH_NAV_LOADER__ = true;

  const current =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /bicipark-global-nav\.js/.test(script.src)
    );

  if (!current?.src) return;

  const rootUrl =
    new URL("../", current.src);

  const cssHref =
    new URL(
      "modules/route-match/adapters/site-integration.css?v=1",
      rootUrl
    ).href;

  const jsSrc =
    new URL(
      "modules/route-match/adapters/global-nav-adapter.js?v=1",
      rootUrl
    ).href;

  if (
    !Array.from(
      document.styleSheets
    ).some(sheet =>
      sheet.href === cssHref
    )
  ) {
    const link =
      document.createElement("link");

    link.rel =
      "stylesheet";

    link.href =
      cssHref;

    document.head.appendChild(
      link
    );
  }

  if (
    !Array.from(
      document.scripts
    ).some(script =>
      script.src === jsSrc
    )
  ) {
    const script =
      document.createElement("script");

    script.src =
      jsSrc;

    script.defer =
      true;

    document.head.appendChild(
      script
    );
  }
})();
/* BICIPARK_ROUTE_MATCH_GLOBAL_NAV_LOADER_END */

/* BICIPARK_SHARED_BRANDING_LOADER_START */
(() => {
  "use strict";

  if (window.__BICIPARK_SHARED_BRANDING_LOADER__) {
    return;
  }

  window.__BICIPARK_SHARED_BRANDING_LOADER__ = true;

  const current =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /\/js\/bicipark-global-nav\.js(?:[?#].*)?$/.test(
          script.src
        )
      );

  if (!current?.src) {
    return;
  }

  const root =
    new URL("../", current.src);

  const cssUrl =
    new URL(
      "css/bicipark-branding-v1.css?v=1",
      root
    ).href;

  const jsUrl =
    new URL(
      "js/bicipark-branding-v1.js?v=1",
      root
    ).href;

  const hasCss =
    Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"]'
      )
    ).some(link =>
      new URL(
        link.href,
        location.href
      ).href === cssUrl
    );

  if (!hasCss) {
    const link =
      document.createElement(
        "link"
      );

    link.rel =
      "stylesheet";

    link.href =
      cssUrl;

    document.head.appendChild(
      link
    );
  }

  const hasJs =
    Array.from(
      document.scripts
    ).some(script =>
      new URL(
        script.src,
        location.href
      ).href === jsUrl
    );

  if (!hasJs) {
    const script =
      document.createElement(
        "script"
      );

    script.src =
      jsUrl;

    script.defer =
      true;

    document.head.appendChild(
      script
    );
  }
})();
/* BICIPARK_SHARED_BRANDING_LOADER_END */
