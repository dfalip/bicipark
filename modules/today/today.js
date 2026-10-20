(() => {
  "use strict";

  const ROUTES_URL = "/route-explorer/data/routes.json";
  const CACHE_KEY = "bicipark.today.last.v1";
  const ACTIVITY_KEY = "bicipark.activityHistory.v1";
  const BIKE_KEY = "bicipark.myBike.v1";
  const DEFAULT_LOCATION = { lat: 41.3874, lng: 2.1686, label: "Barcelona" };

  const state = {
    location: { ...DEFAULT_LOCATION },
    mood: "normal",
    routes: [],
    forecasts: new Map(),
    loading: false
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function riderProfile() {
    if (window.BiciParkRiderProfile?.get) return window.BiciParkRiderProfile.get();
    return {
      level: "Intermedi", daysPerWeek: 3, terrain: "Carretera + Gravel",
      usualDistanceMin: 30, usualDistanceMax: 50,
      usualElevationMin: 400, usualElevationMax: 800
    };
  }

  function activeBike() {
    const store = readJson(BIKE_KEY, null);
    if (!store || !Array.isArray(store.bikes)) return null;
    return store.bikes.find(bike => bike.id === store.activeBikeId) || store.bikes[0] || null;
  }

  function activityDate(item) {
    return item?.date || item?.startedAt || item?.startDate || item?.createdAt || item?.timestamp || null;
  }

  function activityDistance(item) {
    const candidates = [item?.distanceKm, item?.km, item?.stats?.distanceKm, item?.metrics?.distanceKm];
    const value = candidates.map(Number).find(Number.isFinite);
    return value == null ? 0 : value;
  }

  function historySummary() {
    const raw = readJson(ACTIVITY_KEY, []);
    const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.activities) ? raw.activities : (Array.isArray(raw?.items) ? raw.items : []));
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = items.filter(item => {
      const date = new Date(activityDate(item));
      return Number.isFinite(date.getTime()) && date.getTime() >= cutoff;
    });
    return {
      count7d: recent.length,
      recentDistanceKm: Math.round(recent.reduce((sum, item) => sum + activityDistance(item), 0) * 10) / 10
    };
  }

  function distanceMeters(a, b) {
    const toRad = value => value * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  async function loadRoutes() {
    const response = await fetch(ROUTES_URL);
    if (!response.ok) throw new Error("No s'ha pogut carregar el catàleg de rutes");
    const data = await response.json();
    state.routes = window.BiciParkTodayEngine.dedupeRoutes(data);
  }

  function nearbyRoutes() {
    const withDistance = state.routes.map(route => ({
      ...route,
      distanceFromUserKm: route.center ? distanceMeters(state.location, route.center) / 1000 : Infinity
    }));
    const nearby = withDistance.filter(route => route.distanceFromUserKm <= 120);
    return nearby.length ? nearby : (state.location.label === "Barcelona" ? withDistance : []);
  }

  async function ensureForecasts(routes) {
    await Promise.all(routes.map(async route => {
      if (!route.center || state.forecasts.has(route.id)) return;
      try {
        const forecast = await window.BiciParkOpenMeteo.fetchForecast(route.center.lat, route.center.lng);
        state.forecasts.set(route.id, forecast);
      } catch (error) {
        console.warn("[BiciPark Today] meteorologia", route.id, error);
        state.forecasts.set(route.id, null);
      }
    }));
  }

  function profileText(profile) {
    return `${profile.level || "Nivell no definit"} · ${profile.terrain || "Terreny no definit"} · ${profile.usualDistanceMin || "?"}–${profile.usualDistanceMax || "?"} km`;
  }

  function renderContext(profile, bike, history) {
    document.getElementById("profileSummary").textContent = profileText(profile);
    document.getElementById("bikeSummary").textContent = bike
      ? `${bike.nickname || bike.model || "Bici"}${bike.modality ? ` · ${bike.modality}` : ""}`
      : "Encara no has configurat cap bicicleta";
    document.getElementById("historySummary").textContent = history.count7d
      ? `${history.recentDistanceKm} km en ${history.count7d} activitats els últims 7 dies`
      : "Sense activitats recents registrades";
    document.getElementById("locationLabel").textContent = state.location.label;
  }

  function routeCard(route, index) {
    const weather = route.weather;
    const reasons = route.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("");
    const warnings = route.warnings.map(warning => `<p class="today-warning">⚠️ ${escapeHtml(warning)}</p>`).join("");
    const meta = [
      `${Number(route.distanceKm || 0).toFixed(1).replace(".0", "")} km`,
      route.elevationGain > 0 && !route.needsReview ? `+${Math.round(route.elevationGain)} m` : "desnivell per validar",
      route.difficulty || "dificultat no indicada"
    ];
    return `
      <article class="today-card ${index === 0 ? "is-best" : ""}">
        <div class="today-card-top">
          <div>
            <span class="today-kicker">${index === 0 ? "RECOMANADA AVUI" : "ALTERNATIVA"}</span>
            <h2>${escapeHtml(route.name)}</h2>
            <p class="today-meta">${meta.map(escapeHtml).join(" · ")}</p>
          </div>
          <div class="today-score" aria-label="Encaix ${route.recommendationScore} sobre 100">
            <strong>${route.recommendationScore}</strong><span>/100</span><small>encaix</small>
          </div>
        </div>
        ${weather ? `
          <div class="today-weather">
            <span class="today-weather-icon">${weather.icon}</span>
            <div><strong>${escapeHtml(weather.label)}</strong><small>${weather.bestWindow ? `Millor franja ${escapeHtml(weather.bestWindow.label)} · ${Math.round(weather.bestWindow.temp)} °C · pluja ${Math.round(weather.bestWindow.rain)}% · vent ${Math.round(weather.bestWindow.wind)} km/h` : ""}</small></div>
          </div>` : `<div class="today-weather is-offline">Meteorologia no disponible ara mateix.</div>`}
        <ul class="today-reasons">${reasons || "<li>Proposta ordenada segons les dades disponibles.</li>"}</ul>
        ${warnings}
        <div class="today-actions">
          <a class="today-primary" href="/modules/route-detail/?route=${encodeURIComponent(route.id)}">Veure ruta</a>
          <a class="today-secondary" href="/modules/route-planner/">Planifica una altra</a>
        </div>
      </article>`;
  }

  function cacheResult(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (_) {}
  }

  function renderCached() {
    const cached = readJson(CACHE_KEY, null);
    if (!cached?.recommendations?.length) return false;
    document.getElementById("recommendations").innerHTML = cached.recommendations.map(routeCard).join("");
    document.getElementById("status").textContent = "Mostrant l'última recomanació desada. Actualitza quan tornis a tenir connexió.";
    return true;
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    document.getElementById("refreshBtn").disabled = true;
    document.getElementById("status").textContent = "Analitzant perfil, historial, rutes i meteorologia...";
    try {
      if (!state.routes.length) await loadRoutes();
      const routes = nearbyRoutes();
      if (!routes.length) {
        document.getElementById("recommendations").innerHTML = `
          <div class="today-empty"><h2>Encara no tenim rutes catalogades prop teu</h2><p>Pots crear un recorregut ara mateix amb el planificador.</p><a class="today-primary" href="/modules/route-planner/">Obrir Planifica</a></div>`;
        document.getElementById("status").textContent = "Catàleg local no disponible en aquesta zona.";
        return;
      }
      await ensureForecasts(routes);
      const profile = riderProfile();
      const bike = activeBike();
      const history = historySummary();
      renderContext(profile, bike, history);
      const enriched = routes.map(route => ({ ...route, weather: state.forecasts.get(route.id) || null }));
      const recommendations = window.BiciParkTodayEngine.rankRoutes(enriched, {
        profile, bike, history, mood: state.mood
      }).slice(0, 3);
      document.getElementById("recommendations").innerHTML = recommendations.map(routeCard).join("");
      const weatherCount = recommendations.filter(route => route.weather).length;
      document.getElementById("status").textContent = weatherCount
        ? `Recomanació actualitzada amb meteorologia d'Open-Meteo · ${new Date().toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" })}`
        : "Recomanació actualitzada sense meteorologia; es reintentarà en la propera actualització.";
      cacheResult({ recommendations, mood: state.mood, updatedAt: new Date().toISOString() });
      window.BiciParkCore?.emit("today:recommendations", { count: recommendations.length, mood: state.mood, region: recommendations[0]?.region || null });
    } catch (error) {
      console.error("[BiciPark Today]", error);
      if (!renderCached()) {
        document.getElementById("status").textContent = "No s'ha pogut generar la recomanació. Comprova la connexió i torna-ho a provar.";
      }
    } finally {
      state.loading = false;
      document.getElementById("refreshBtn").disabled = false;
    }
  }

  function useLocation() {
    if (!navigator.geolocation) return;
    const button = document.getElementById("locationBtn");
    button.disabled = true;
    button.textContent = "Localitzant...";
    navigator.geolocation.getCurrentPosition(position => {
      state.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: "A prop teu"
      };
      state.forecasts.clear();
      button.disabled = false;
      button.textContent = "Actualitza ubicació";
      refresh();
    }, () => {
      button.disabled = false;
      button.textContent = "Utilitza la meva ubicació";
      document.getElementById("status").textContent = "No s'ha pogut obtenir la ubicació. Continuem amb Barcelona.";
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  }

  function bindMood() {
    document.querySelectorAll("[data-mood]").forEach(button => {
      button.addEventListener("click", () => {
        state.mood = button.dataset.mood;
        document.querySelectorAll("[data-mood]").forEach(item => item.classList.toggle("is-active", item === button));
        refresh();
      });
    });
  }

  document.getElementById("locationBtn").addEventListener("click", useLocation);
  document.getElementById("refreshBtn").addEventListener("click", () => { state.forecasts.clear(); refresh(); });
  bindMood();
  refresh();
})();
