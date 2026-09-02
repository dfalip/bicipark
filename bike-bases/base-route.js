(() => {
  "use strict";

  function text(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function href(id, value) {
    var el = document.getElementById(id);
    if (el) el.href = value;
  }

  function formatKm(value) {
    return Number(value).toLocaleString("ca-ES", {
      maximumFractionDigits: 2
    }) + " km";
  }

  function formatM(value) {
    return "+" + Number(value).toLocaleString("ca-ES") + " m";
  }

  function modeIcon(mode) {
    if (mode === "road") return "\ud83d\udeb4";
    if (mode === "gravel") return "\ud83d\udeb2";
    if (mode === "mtb") return "\ud83d\udeb5";
    return "\ud83d\udeb2";
  }

  function wikilocEmbed(id) {
    return (
      "https://www.wikiloc.com/wikiloc/spatialArtifacts.do" +
      "?event=view&id=" + encodeURIComponent(id) +
      "&measures=on" +
      "&title=off" +
      "&near=off" +
      "&images=off" +
      "&maptype=H"
    );
  }

  function renderError() {
    text("routeName", "Ruta no trobada");
    text(
      "routeSummary",
      "Aquest identificador de ruta no existeix al cat\u00e0leg Bike Bases."
    );
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");

    var index = window.BICIPARK_ROUTE_INDEX || {};
    var route = index[id];

    if (!route) {
      renderError();
      return;
    }

    document.title = route.name + " \u00b7 Bicipark";

    text("routeOrigin", route.classification);
    text("routeMode", modeIcon(route.mode) + " " + route.modeLabel);
    text("routeName", route.name);
    text("routeSummary", route.summary);
    text("routeBaseName", route.baseName);

    href("routeBaseLink", route.baseUrl);
    href("backToBase", route.baseUrl);

    text("trackStatus", route.trackStatus);

    var frame = document.getElementById("wikilocFrame");
    frame.src = wikilocEmbed(route.wikilocId);

    href("openTrackLink", route.trackUrl);
    href("downloadTrackLink", route.downloadUrl);
    href("sourceLink", route.sourceUrl);

    text("statDistance", formatKm(route.distanceKm));
    text("statAscent", formatM(route.ascentM));
    text("statDifficulty", route.difficulty);
    text("statDuration", route.duration || "No indicada");
    text("statType", route.routeType || "Ruta");
    text("statMode", route.modeLabel);

    text("sourceClassification", route.classification);
    text("sourceLabel", route.sourceLabel);
    text("trackAuthor", route.trackAuthor);

    var note = document.getElementById("measurementNote");

    if (route.measurementNote) {
      note.textContent = route.measurementNote;
      note.classList.remove("hidden");
    }

    var poiList = document.getElementById("poiList");
    poiList.innerHTML = "";

    (route.pois || []).forEach(function(poi) {
      var span = document.createElement("span");
      span.textContent = poi;
      poiList.appendChild(span);
    });

    var advice = document.getElementById("recommendationList");
    advice.innerHTML = "";

    (route.recommendations || []).forEach(function(item) {
      var li = document.createElement("li");
      li.textContent = item;
      advice.appendChild(li);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();