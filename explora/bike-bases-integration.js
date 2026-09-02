(() => {
  "use strict";

  const MARKER = "BICIPARK_BIKE_BASES_INTEGRATION_V1";

  function makeCard() {
    const card = document.createElement("a");

    card.id = "bicipark-bike-bases-card";
    card.className = "bicipark-bike-bases-card";
    card.href = "../bike-bases/";
    card.setAttribute("data-bicipark-feature", "bike-bases");

    card.innerHTML = `
      <div class="bb-card-icon" aria-hidden="true">
        <span class="bb-tent">&#9978;</span>
        <span class="bb-bike">&#128690;</span>
      </div>

      <div class="bb-card-copy">
        <div class="bb-card-kicker">NOU &middot; BIKE BASES</div>
        <h2>Bike Bases</h2>
        <p>
          C&agrave;mpings, hotels i allotjaments que poden ser
          una bona base per descobrir el territori en bicicleta.
        </p>

        <div class="bb-card-meta">
          <span>1 Bike Base</span>
          <span>9 rutes</span>
          <span>Carretera &middot; Gravel &middot; MTB</span>
        </div>

        <div class="bb-card-cta">
          Explora Bike Bases <span>&rarr;</span>
        </div>
      </div>
    `;

    return card;
  }

  function looksLikeCardGrid(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    const children = Array.from(element.children || []);

    return (
      style.display === "grid" ||
      style.display === "flex" ||
      children.length >= 2
    );
  }

  function findTarget() {
    const selectors = [
      "#modules-grid",
      ".modules-grid",
      "[data-modules-grid]",
      "#modules",
      ".modules",
      ".cards-grid",
      ".explora-grid",
      ".module-grid",
      ".module-list"
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && looksLikeCardGrid(el)) {
        return el;
      }
    }

    const moduleLike = Array.from(
      document.querySelectorAll("main section, main div")
    ).find(el => {
      const links = el.querySelectorAll(":scope > a");
      return links.length >= 2 && looksLikeCardGrid(el);
    });

    return moduleLike || null;
  }

  function installCard() {
    if (document.getElementById("bicipark-bike-bases-card")) {
      return true;
    }

    const target = findTarget();

    if (target) {
      target.appendChild(makeCard());
      target.classList.add("has-bicipark-bike-bases");
      return true;
    }

    const main = document.querySelector("main");

    if (!main) {
      return false;
    }

    const section = document.createElement("section");
    section.className = "bicipark-bike-bases-fallback";
    section.innerHTML = `
      <div class="bb-fallback-title">Descobreix tamb&eacute;</div>
    `;

    section.appendChild(makeCard());
    main.appendChild(section);

    return true;
  }

  function boot() {
    if (installCard()) return;

    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      if (installCard() || attempts >= 25) {
        window.clearInterval(timer);
      }
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.BICIPARK_BIKE_BASES_EXPLORA = MARKER;
})();
