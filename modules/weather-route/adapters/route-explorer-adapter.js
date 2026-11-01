(() => {
  "use strict";

  if (window.__BICIPARK_WEATHER_ROUTE_EXPLORER_ALL_V4__) return;
  window.__BICIPARK_WEATHER_ROUTE_EXPLORER_ALL_V4__ = true;

  const selfScript = document.currentScript || Array.from(document.scripts).find(script => /weather-route\/adapters\/route-explorer-adapter\.js/.test(script.src));
  if (!selfScript?.src) return;

  const adapterUrl = new URL("./", selfScript.src);
  const knownRoutesUrl = new URL("../data/weather-routes.json", adapterUrl).href;
  const explorerRoutesUrl = new URL("../../../route-explorer/data/routes.json", adapterUrl).href;
  const weatherPageUrl = new URL("../", adapterUrl).href;

  let knownRoutes = [];
  let explorerRoutes = [];
  let timer = null;

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function slug(value) {
    return normalize(value).replace(/\s+/g, "-").slice(0, 90);
  }

  async function loadJson(url) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return [];
      const raw = await response.json();
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  async function loadCatalogues() {
    [knownRoutes, explorerRoutes] = await Promise.all([
      loadJson(knownRoutesUrl),
      loadJson(explorerRoutesUrl)
    ]);
  }

  function routeForText(routes, text) {
    const haystack = normalize(text);
    return routes.find(route => {
      const name = normalize(route.name);
      return name && (haystack.includes(name) || name.includes(haystack));
    }) || null;
  }

  function looksLikeRouteCard(node) {
    if (!node) return false;
    const text = String(node.textContent || "");
    return text.length > 18 && (/\bkm\b/i.test(text) || /etapa\s+\d+/i.test(text));
  }

  function nearestCard(action) {
    let node = action;
    for (let depth = 0; depth < 8 && node; depth++) {
      if (looksLikeRouteCard(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function firstUsefulLine(card) {
    const candidates = Array.from(card.querySelectorAll("h1,h2,h3,h4,strong,b"))
      .map(node => String(node.textContent || "").trim())
      .filter(Boolean);
    if (candidates.length) return candidates[0];
    return String(card.textContent || "").split(/\n+/).map(line => line.trim()).filter(Boolean)[0] || "Ruta BiciPark";
  }

  function extractMeta(card) {
    const text = String(card.textContent || "").replace(/\s+/g, " ").trim();
    const title = firstUsefulLine(card);
    const distanceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
    const elevationMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m\+/i);
    let mode = "";
    if (/gravel/i.test(text)) mode = "Gravel";
    else if (/btt|mtb/i.test(text)) mode = "MTB";
    else if (/carretera/i.test(text)) mode = "Carretera";
    else if (/urbana/i.test(text)) mode = "Urbana";

    let difficulty = "";
    for (const label of ["Facil", "Moderada", "Mitjana", "Dificil", "Experta"]) {
      if (normalize(text).includes(normalize(label))) { difficulty = label; break; }
    }

    const arrowParts = title.replace(/^Etapa\s+\d+\s*[·.-]?\s*/i, "").split(/\s*(?:→|->|—>|➡)\s*/);
    return {
      id: "dynamic-" + slug(title), title,
      distanceKm: distanceMatch ? Number(distanceMatch[1].replace(",", ".")) : null,
      elevationM: elevationMatch ? Number(elevationMatch[1].replace(",", ".")) : null,
      mode, difficulty,
      origin: arrowParts.length >= 2 ? arrowParts[0].trim() : "",
      destination: arrowParts.length >= 2 ? arrowParts[arrowParts.length - 1].trim() : "",
      rawText: text.slice(0, 800), source: "route-explorer", createdAt: new Date().toISOString()
    };
  }

  function saveDynamicRoute(meta) {
    try { sessionStorage.setItem("bicipark.weather.dynamicRoute", JSON.stringify(meta)); return true; }
    catch (_) { return false; }
  }

  function openKnown(route) {
    location.href = weatherPageUrl + "?route=" + encodeURIComponent(route.id);
  }

  function openExplorerRoute(route, card) {
    const meta = extractMeta(card);
    meta.id = route.id;
    meta.title = route.name || meta.title;
    meta.distanceKm = Number.isFinite(Number(route.distanceKm)) ? Number(route.distanceKm) : meta.distanceKm;
    meta.elevationM = Number.isFinite(Number(route.elevationGain)) ? Number(route.elevationGain) : meta.elevationM;
    meta.mode = route.modality || meta.mode;
    meta.difficulty = route.difficulty || meta.difficulty;
    meta.center = route.center || null;
    meta.bounds = route.bounds || null;
    meta.geometryFile = route.geometryFile || "";
    meta.routeRegion = route.region || "";
    meta.source = "route-explorer-catalog";
    saveDynamicRoute(meta);
    location.href = weatherPageUrl + "?dynamic=1&route=" + encodeURIComponent(meta.id);
  }

  function openDynamic(meta) {
    saveDynamicRoute(meta);
    location.href = weatherPageUrl + "?dynamic=1&route=" + encodeURIComponent(meta.id);
  }

  function addButton(card, action) {
    if (card.querySelector("[data-bp-weather-all-routes]")) return;
    const known = routeForText(knownRoutes, card.textContent);
    const explorerRoute = routeForText(explorerRoutes, card.textContent);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.bpWeatherAllRoutes = "1";
    button.className = "bp-wr-route-btn";
    if (!known && !explorerRoute?.geometryFile) button.classList.add("is-estimated");
    button.textContent = "\u2600 Meteorologia";
    button.title = known || explorerRoute?.geometryFile
      ? "Analisi meteorologica de la zona real de la ruta"
      : "Meteorologia de la ruta. Sense geometria disponible, BiciPark utilitzara la millor referencia territorial de la ruta; mai la ubicacio de l'usuari.";

    button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      if (known) { openKnown(known); return; }
      if (explorerRoute) { openExplorerRoute(explorerRoute, card); return; }
      openDynamic(extractMeta(card));
    });
    action.insertAdjacentElement("afterend", button);
  }

  function scan() {
    Array.from(document.querySelectorAll("a, button"))
      .filter(node => !node.dataset?.bpWeatherAllRoutes && normalize(node.textContent).includes("veure ruta"))
      .forEach(action => {
        const card = nearestCard(action);
        if (card) addButton(card, action);
      });
  }

  async function boot() {
    await loadCatalogues();
    scan();
    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(scan, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.info("[Weather Route Explorer] v4 route-aware weather ready.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();