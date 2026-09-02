(() => {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function modeIcon(mode) {
    if (mode === "road") return "\ud83d\udeb4";
    if (mode === "gravel") return "\ud83d\udeb2";
    if (mode === "mtb") return "\ud83d\udeb5";
    return "\ud83d\udeb2";
  }

  function formatDistance(value) {
    return String(value).replace(".", ",") + " km";
  }

  function formatAscent(value) {
    return "+" + Number(value).toLocaleString("ca-ES") + " m";
  }

  function routeCard(route) {
    var duration = route.duration
      ? '<span>\u23f1 ' + escapeHtml(route.duration) + '</span>'
      : "";

    var startNote = route.startNote
      ? '<p class="bb-curated-note">' +
          escapeHtml(route.startNote) +
        '</p>'
      : "";

    return (
      '<article class="bb-curated-route-card">' +
        '<div class="bb-curated-route-top">' +
          '<span class="bb-curated-mode">' +
            modeIcon(route.mode) + " " +
            escapeHtml(route.modeLabel) +
          '</span>' +
          '<span class="bb-curated-difficulty">' +
            escapeHtml(route.difficulty) +
          '</span>' +
        '</div>' +

        '<div class="bb-curated-origin">' +
          escapeHtml(route.classification) +
        '</div>' +

        '<h3>' + escapeHtml(route.name) + '</h3>' +

        '<div class="bb-curated-stats">' +
          '<span>\u2194 ' + formatDistance(route.distanceKm) + '</span>' +
          '<span>\u2197 ' + formatAscent(route.ascentM) + '</span>' +
          duration +
        '</div>' +

        '<p class="bb-curated-summary">' +
          escapeHtml(route.summary) +
        '</p>' +

        startNote +

        '<div class="bb-curated-actions">' +
          '<a class="bb-curated-primary" href="./base-route.html?id=' +
            encodeURIComponent(route.id) +
            '">' +
            'Veure ruta a Bicipark \u2192' +
          '</a>' +
          '<a class="bb-curated-secondary" href="' +
            escapeHtml(route.sourceUrl) +
            '" target="_blank" rel="noopener">' +
            'Font original \u2197' +
          '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function install() {
    if (document.getElementById("bicipark-curated-routes")) {
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var baseId = params.get("id");

    if (!baseId) return;

    var allData = window.BICIPARK_BASE_ROUTES || {};
    var data = allData[baseId];

    if (!data || !Array.isArray(data.routes) || !data.routes.length) {
      return;
    }

    var section = document.createElement("section");
    section.id = "bicipark-curated-routes";
    section.className = "bb-curated-routes-section";

    section.innerHTML =
      '<div class="bb-curated-heading">' +
        '<div>' +
          '<div class="bb-curated-eyebrow">RUTES EN BICI</div>' +
          '<h2>' + escapeHtml(data.title) + '</h2>' +
          '<p>' + escapeHtml(data.intro) + '</p>' +
        '</div>' +
        '<span class="bb-curated-badge">' +
          escapeHtml(data.badge) +
        '</span>' +
      '</div>' +

      '<div class="bb-curated-grid">' +
        data.routes.map(routeCard).join("") +
      '</div>' +

      '<div class="bb-curated-disclaimer">' +
        '<strong>Sobre aquestes rutes:</strong> ' +
        escapeHtml(data.disclaimer) +
      '</div>';

    var main = document.querySelector("main");

    if (main) {
      main.appendChild(section);
    } else {
      document.body.appendChild(section);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();