(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiciParkTodayEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function routeKey(route) {
    const lat = number(route?.center?.lat).toFixed(3);
    const lng = number(route?.center?.lng).toFixed(3);
    const km = number(route?.distanceKm).toFixed(1);
    return `${normalize(route?.name)}|${lat}|${lng}|${km}`;
  }

  function dedupeRoutes(routes) {
    const seen = new Set();
    return (Array.isArray(routes) ? routes : []).filter(route => {
      if (!route || route.enabled === false) return false;
      const key = routeKey(route);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function acceptedModalities(profile, bike) {
    const text = normalize(`${profile?.terrain || ""} ${bike?.modality || ""}`);
    const values = new Set();
    if (/carretera|road|fastbike/.test(text)) values.add("road");
    if (/gravel/.test(text)) values.add("gravel");
    if (/mtb|btt|muntanya|mountain/.test(text)) values.add("mtb");
    if (/urba|urban|city/.test(text)) values.add("urban");
    return values;
  }

  function modalityScore(route, profile, bike) {
    const accepted = acceptedModalities(profile, bike);
    if (!accepted.size) return null;
    const modality = normalize(route?.modality);
    if (accepted.has(modality)) return 100;
    if (modality === "road" && accepted.has("gravel")) return 72;
    if (modality === "gravel" && accepted.has("road")) return 68;
    return 42;
  }

  function moodDistanceRange(profile, mood) {
    const min = Math.max(5, number(profile?.usualDistanceMin, 20));
    const max = Math.max(min, number(profile?.usualDistanceMax, Math.max(40, min)));
    switch (mood) {
      case "easy": return [Math.max(5, min * 0.45), Math.max(15, min * 0.9)];
      case "quick": return [Math.max(5, min * 0.4), Math.max(18, min * 0.8)];
      case "train": return [min * 0.9, max * 1.25];
      case "climb": return [min * 0.75, max * 1.1];
      case "nature": return [min * 0.75, max];
      case "coffee": return [min * 0.6, max * 0.9];
      default: return [min, max];
    }
  }

  function rangeScore(value, min, max) {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= min && value <= max) return 100;
    const span = Math.max(10, max - min);
    const distance = value < min ? min - value : value - max;
    return clamp(Math.round(100 - (distance / span) * 55), 20, 100);
  }

  function distanceScore(route, profile, mood) {
    const range = moodDistanceRange(profile, mood);
    return rangeScore(number(route?.distanceKm, NaN), range[0], range[1]);
  }

  function elevationScore(route, profile) {
    const elevation = number(route?.elevationGain, NaN);
    if (!Number.isFinite(elevation) || elevation <= 0 || route?.needsReview) return null;
    const min = Math.max(0, number(profile?.usualElevationMin, 0));
    const max = Math.max(min + 1, number(profile?.usualElevationMax, min + 600));
    return rangeScore(elevation, min, max);
  }

  function historyScore(route, profile, history, mood) {
    const recent = number(history?.recentDistanceKm, NaN);
    if (!Number.isFinite(recent) || recent < 0) return null;
    const mid = (number(profile?.usualDistanceMin, 20) + number(profile?.usualDistanceMax, 40)) / 2;
    const days = Math.max(1, number(profile?.daysPerWeek, 3));
    const expected = Math.max(20, mid * days);
    const loadRatio = recent / expected;
    const routeKm = number(route?.distanceKm, mid);

    if (mood === "easy") return routeKm <= mid ? 100 : 62;
    if (loadRatio >= 1.15) return routeKm <= mid ? 96 : clamp(90 - (routeKm - mid), 35, 90);
    if (loadRatio <= 0.35 && mood === "train") return routeKm >= mid * 0.8 ? 94 : 68;
    return 82;
  }

  function buildRecommendation(route, context) {
    const profile = context?.profile || {};
    const bike = context?.bike || null;
    const mood = context?.mood || "normal";
    const history = context?.history || null;
    const weather = route.weather || null;
    const components = [];

    function add(name, score, weight) {
      if (!Number.isFinite(score)) return;
      components.push({ name, score: clamp(score, 0, 100), weight });
    }

    const modality = modalityScore(route, profile, bike);
    const distance = distanceScore(route, profile, mood);
    const elevation = elevationScore(route, profile);
    const historyFit = historyScore(route, profile, history, mood);

    add("weather", Number(weather?.score), 35);
    add("profile", modality, 25);
    add("distance", distance, 25);
    add("history", historyFit, 10);
    add("elevation", elevation, 5);

    const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
    const score = totalWeight
      ? Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight)
      : 0;

    const reasons = [];
    const warnings = [];

    if (weather && Number.isFinite(weather.score)) {
      reasons.push(`${weather.icon || "🌤️"} ${weather.label || "Meteorologia analitzada"}${weather.bestWindow?.label ? ` · millor franja ${weather.bestWindow.label}` : ""}`);
    }
    if (distance >= 85) reasons.push("Distància ben alineada amb el teu perfil i el pla d'avui.");
    if (modality >= 85) reasons.push("Modalitat compatible amb el teu perfil i la bici activa.");
    if (historyFit >= 90 && history?.recentDistanceKm > 0) reasons.push("La càrrega recent encaixa amb la intensitat d'aquesta proposta.");
    if (mood === "climb" && elevation === null) warnings.push("El desnivell del catàleg no està prou validat per puntuar-lo.");
    if (route.needsReview) warnings.push("Algunes metadades de la ruta estan pendents de revisió editorial.");
    if (!weather) warnings.push("Sense meteorologia disponible: puntuació basada només en perfil i ruta.");

    return {
      ...route,
      recommendationScore: score,
      components,
      reasons: reasons.slice(0, 3),
      warnings: warnings.slice(0, 2)
    };
  }

  function rankRoutes(routes, context) {
    return dedupeRoutes(routes)
      .map(route => buildRecommendation(route, context))
      .sort((a, b) => b.recommendationScore - a.recommendationScore || number(a.priority, 999) - number(b.priority, 999));
  }

  return {
    clamp,
    dedupeRoutes,
    moodDistanceRange,
    distanceScore,
    modalityScore,
    elevationScore,
    historyScore,
    buildRecommendation,
    rankRoutes
  };
});
