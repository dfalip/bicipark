import { findNearbyRoutes } from "../modules/route-proximity.js";

const details = document.getElementById("routeDetails");
if (!details) throw new Error("Route details container not found");

let routes = [];
let rendering = false;

function allEnabled(items) {
  return Array.isArray(items) ? items.filter(route => route && route.enabled !== false) : [];
}

function findSelectedRoute() {
  const title = details.querySelector("h2")?.textContent?.trim();
  return title ? routes.find(route => route.name === title) : null;
}

function recommendationButton(item, meta) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "route-explorer-recommendation";
  const name = document.createElement("strong");
  name.textContent = item.name;
  const note = document.createElement("small");
  note.textContent = meta;
  button.append(name, note);
  button.addEventListener("click", () => {
    const cards = [...document.querySelectorAll(".route-explorer-route-card")];
    const card = cards.find(candidate => candidate.querySelector("h2")?.textContent?.trim() === item.name);
    const action = card?.querySelector(".route-explorer-route-action");
    if (action) action.click();
  });
  return button;
}

function section(title, explanation, items) {
  if (!items.length) return null;
  const wrapper = document.createElement("section");
  wrapper.className = "route-explorer-recommendations";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const help = document.createElement("p");
  help.className = "route-explorer-recommendations-help";
  help.textContent = explanation;
  const list = document.createElement("div");
  list.className = "route-explorer-recommendations-list";
  items.forEach(item => list.append(item));
  wrapper.append(heading, help, list);
  return wrapper;
}

function render() {
  if (rendering || details.querySelector(".route-explorer-recommendations-host")) return;
  const route = findSelectedRoute();
  if (!route) return;
  rendering = true;
  const host = document.createElement("div");
  host.className = "route-explorer-recommendations-host";

  const nearby = findNearbyRoutes(route, routes, { limit: 3, maxDistanceKm: 100 }).map(result =>
    recommendationButton(result.route, `${result.distanceKm.toLocaleString("ca-ES", { maximumFractionDigits: 1 })} km en línia recta entre punts de referència`)
  );

  const similarityApi = window.BiciParkRouteSimilarity;
  const similar = similarityApi?.findSimilarRoutes
    ? similarityApi.findSimilarRoutes(route, routes, { limit: 3, minScore: 45 }).map(result =>
        recommendationButton(result.route, result.reasons.length ? result.reasons.join(" · ") : `similitud ${result.score}%`)
      )
    : [];

  const nearbySection = section(
    "Rutes properes",
    "Proximitat geodèsica derivada de la metadata espacial disponible; no és distància per carretera ni entre tracks.",
    nearby
  );
  const similarSection = section(
    "Rutes semblants",
    "Similitud calculada amb metadata existent (modalitat, regió, distància, desnivell i dificultat).",
    similar
  );
  if (nearbySection) host.append(nearbySection);
  if (similarSection) host.append(similarSection);
  if (host.childElementCount) details.append(host);
  rendering = false;
}

fetch("./data/routes.json", { cache: "no-store" })
  .then(response => response.ok ? response.json() : [])
  .then(data => { routes = allEnabled(data); render(); })
  .catch(error => console.warn("No s'han pogut preparar les recomanacions de rutes", error));

new MutationObserver(() => queueMicrotask(render)).observe(details, { childList: true, subtree: true });
