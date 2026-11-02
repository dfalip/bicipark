(() => {
  "use strict";
  if (!window.L || window.__BICIPARK_ROUTE_MAP_BRIDGE__) return;
  window.__BICIPARK_ROUTE_MAP_BRIDGE__ = true;
  const originalMap = L.map;
  L.map = function(...args) {
    const instance = originalMap.apply(this, args);
    const target = args[0];
    if (target === "routeMap" || target?.id === "routeMap") {
      window.__BICIPARK_ROUTE_EXPLORER_MAP__ = instance;
      window.dispatchEvent(new CustomEvent("bicipark:route-map-ready", { detail: { map: instance } }));
    }
    return instance;
  };
  Object.assign(L.map, originalMap);
})();
