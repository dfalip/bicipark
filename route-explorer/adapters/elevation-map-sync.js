(() => {
  "use strict";

  if (!document.getElementById("routeMap") || !window.L) return;

  let marker = null;
  let hideTimer = null;

  function clearMarker() {
    if (!marker) return;
    const map = marker._map;
    if (map) map.removeLayer(marker);
    marker = null;
  }

  window.addEventListener("bicipark:elevation-point", event => {
    const detail = event.detail || {};
    const lat = Number(detail.lat);
    const lng = Number(detail.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
    if (!map) return;

    if (!marker) {
      marker = L.circleMarker([lat, lng], {
        radius: 7,
        weight: 3,
        color: "#ffffff",
        fillColor: "#176b45",
        fillOpacity: 1,
        interactive: false,
        pane: "markerPane"
      }).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
    }

    marker.bindTooltip(`${Number(detail.distanceKm || 0).toLocaleString("ca-ES", { maximumFractionDigits: 1 })} km · ${Math.round(Number(detail.elevation || 0))} m`, {
      permanent: false,
      direction: "top",
      offset: [0, -8]
    }).openTooltip();

    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => marker?.closeTooltip(), 1800);
  });

  window.addEventListener("pagehide", clearMarker);
})();
