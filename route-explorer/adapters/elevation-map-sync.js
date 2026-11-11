(() => {
  "use strict";
  if (!document.getElementById("routeMap") || !window.L) return;
  let marker = null, timer = null, selectedRouteId = null;
  function clearMarker() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    if (marker?._map) marker._map.removeLayer(marker);
    marker = null;
  }
  window.addEventListener("bicipark:route-selected", event => {
    selectedRouteId = event.detail?.route?.id || null;
    clearMarker();
  });
  window.addEventListener("bicipark:elevation-point", event => {
    const p = event.detail || {};
    if (!selectedRouteId || p.routeId !== selectedRouteId) return;
    const {lat,lng,elevation,distanceKm} = p;
    if (![lat,lng,elevation,distanceKm].every(v => typeof v === "number" && Number.isFinite(v))) return;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
    if (!map) return;
    if (!marker) {
      marker = L.circleMarker([lat,lng], {
        radius: 7, weight: 3, color: "#fff", fillColor: "#176b45",
        fillOpacity: 1, interactive: false, pane: "markerPane"
      }).addTo(map);
    } else marker.setLatLng([lat,lng]);
    const message = Number(distanceKm).toLocaleString("ca-ES",{maximumFractionDigits:2})+
      " km · "+Math.round(elevation)+" m";
    marker.bindTooltip(message,{permanent:false,direction:"top",offset:[0,-8]}).openTooltip();
    if (timer) window.clearTimeout(timer);
    timer=window.setTimeout(()=>marker?.closeTooltip(),1800);
  });
  window.addEventListener("bicipark:elevation-point-clear",clearMarker);
  window.addEventListener("pagehide",clearMarker);
})();
