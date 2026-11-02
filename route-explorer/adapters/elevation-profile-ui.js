import { loadRouteGeometry } from "../modules/geometry-loader.js";
import { buildElevationProfile } from "../modules/elevation-profile.js";

const details = document.getElementById("routeDetails");

if (details && window.L) {
  let routes = [];
  let renderToken = 0;
  let lastRouteId = "";

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  async function loadRoutes() {
    try {
      const response = await fetch("./data/routes.json", { cache: "no-store" });
      routes = response.ok ? await response.json() : [];
    } catch (_) {
      routes = [];
    }
  }

  function selectedRoute() {
    const title = details.querySelector("h2")?.textContent;
    if (!title) return null;
    const wanted = normalize(title);
    return routes.find(route => normalize(route.name) === wanted) || null;
  }

  function format(value, digits = 0) {
    return Number(value).toLocaleString("ca-ES", { maximumFractionDigits: digits });
  }

  function drawProfile(route, profile) {
    details.querySelector(".route-elevation-profile")?.remove();
    const section = document.createElement("section");
    section.className = "route-elevation-profile";
    section.dataset.routeId = route.id;
    section.innerHTML = `<div class="route-elevation-profile-head"><div><strong>Perfil d'elevació</strong><span>Altitud derivada del GPX real</span></div><div><b>${format(profile.minimumElevation)} m</b> — <b>${format(profile.maximumElevation)} m</b></div></div>`;
    const canvas = document.createElement("canvas");
    canvas.className = "route-elevation-profile-chart";
    canvas.height = 150;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `Perfil d'elevació de ${route.name}. Altitud mínima ${format(profile.minimumElevation)} metres i màxima ${format(profile.maximumElevation)} metres.`);
    const readout = document.createElement("p");
    readout.className = "route-elevation-profile-readout";
    readout.setAttribute("aria-live", "polite");
    section.append(canvas, readout);
    details.append(section);

    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(280, Math.floor(section.clientWidth || 600));
    const height = 150;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    const pad = 14;
    const range = Math.max(1, profile.maximumElevation - profile.minimumElevation);
    const x = index => pad + index / (profile.points.length - 1) * (width - pad * 2);
    const y = point => height - pad - (point.elevation - profile.minimumElevation) / range * (height - pad * 2);
    ctx.beginPath();
    profile.points.forEach((point, index) => index ? ctx.lineTo(x(index), y(point)) : ctx.moveTo(x(index), y(point)));
    ctx.strokeStyle = "#176b45";
    ctx.lineWidth = 2;
    ctx.stroke();

    function show(index) {
      const point = profile.points[Math.max(0, Math.min(profile.points.length - 1, index))];
      canvas.dataset.index = String(index);
      readout.textContent = `${format(point.distanceKm, 1)} km · ${format(point.elevation)} m`;
      window.dispatchEvent(new CustomEvent("bicipark:elevation-point", { detail: { routeId: route.id, lat: point.lat, lng: point.lng, elevation: point.elevation, distanceKm: point.distanceKm } }));
    }
    function indexFromPointer(event) {
      const rect = canvas.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      return Math.round(fraction * (profile.points.length - 1));
    }
    canvas.addEventListener("pointermove", event => show(indexFromPointer(event)));
    canvas.addEventListener("pointerdown", event => show(indexFromPointer(event)));
    canvas.addEventListener("keydown", event => {
      const current = Number(canvas.dataset.index || 0);
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      show(Math.max(0, Math.min(profile.points.length - 1, current + (event.key === "ArrowRight" ? 1 : -1))));
    });
    show(0);
  }

  async function enhance() {
    const route = selectedRoute();
    if (!route || !route.geometryFile) {
      lastRouteId = "";
      details.querySelector(".route-elevation-profile")?.remove();
      return;
    }
    if (route.id === lastRouteId && details.querySelector(`.route-elevation-profile[data-route-id="${route.id}"]`)) return;
    const token = ++renderToken;
    try {
      const geometry = await loadRouteGeometry(route);
      if (token !== renderToken) return;
      const profile = buildElevationProfile(geometry);
      if (!profile) return;
      lastRouteId = route.id;
      drawProfile(route, profile);
    } catch (error) {
      console.warn("[Elevation profile]", error.message);
    }
  }

  await loadRoutes();
  new MutationObserver(() => window.setTimeout(enhance, 0)).observe(details, { childList: true, subtree: false });
  enhance();
}
