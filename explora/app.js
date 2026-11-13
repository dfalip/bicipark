import {
  biciparkModules,
  moduleCategories
} from "./data/modules.js";

const elements = {
  categoryNavigation:
    document.getElementById("categoryNavigation"),
  moduleGrid:
    document.getElementById("moduleGrid"),
  emptyMessage:
    document.getElementById("emptyMessage"),
  moduleSearch: document.getElementById("moduleSearch"),
  moduleResults: document.getElementById("moduleResults")
};

const parameters = new URLSearchParams(window.location.search);
const requestedCategory = parameters.get("category");
let activeCategory = moduleCategories.some(category => category.id === requestedCategory)
  ? requestedCategory : "all";
let searchTerm = parameters.get("q") || "";

function normalizeSearch(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca").trim();
}

function syncUrl() {
  const url = new URL(window.location.href);
  if (activeCategory === "all") url.searchParams.delete("category");
  else url.searchParams.set("category", activeCategory);
  if (searchTerm.trim()) url.searchParams.set("q", searchTerm.trim());
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", url);
}

function createCategoryButton(category) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "hub-category-button";
  button.textContent = category.label;
  button.dataset.category = category.id;

  const isActive = category.id === activeCategory;

  button.classList.toggle("is-active", isActive);
  button.setAttribute(
    "aria-pressed",
    isActive ? "true" : "false"
  );

  button.addEventListener("click", () => {
    activeCategory = category.id;
    renderCategories();
    renderModules();
    syncUrl();
  });

  return button;
}

function renderCategories() {
  elements.categoryNavigation.replaceChildren(
    ...moduleCategories.map(createCategoryButton)
  );
}

function createStatusBadge(module) {
  const badge = document.createElement("span");

  badge.className = "hub-module-status";
  badge.textContent = module.status;

  if (module.statusType === "new") {
    badge.classList.add("is-new");
  }

  if (module.statusType === "development") {
    badge.classList.add("is-development");
  }

  return badge;
}

function createTags(tags) {
  const list = document.createElement("ul");
  list.className = "hub-module-tags";

  for (const tag of tags) {
    const item = document.createElement("li");
    item.textContent = tag;
    list.appendChild(item);
  }

  return list;
}

function createModuleAction(module) {
  if (!module.enabled) {
    const unavailable = document.createElement("span");
    unavailable.className = "hub-module-unavailable";
    unavailable.textContent = "Properament";
    return unavailable;
  }

  const link = document.createElement("a");
  link.className = "hub-module-link";
  link.href = module.href;
  link.textContent = "Obrir mòdul";
  link.setAttribute(
    "aria-label",
    `Obrir ${module.title}`
  );

  return link;
}

function createModuleCard(module) {
  const article = document.createElement("article");
  article.className = "hub-module-card";

  if (!module.enabled) {
    article.classList.add("is-disabled");
  }

  const header = document.createElement("div");
  header.className = "hub-module-card-header";

  const icon = document.createElement("span");
  icon.className = "hub-module-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = module.icon;

  header.append(
    icon,
    createStatusBadge(module)
  );

  const title = document.createElement("h2");
  title.textContent = module.title;

  const description = document.createElement("p");
  description.textContent = module.description;

  article.append(
    header,
    title,
    description,
    createTags(module.tags),
    createModuleAction(module)
  );

  return article;
}

function getVisibleModules() {
  const terms = normalizeSearch(searchTerm);
  return biciparkModules.filter(module => {
    if (activeCategory !== "all" && module.category !== activeCategory) return false;
    if (!terms) return true;
    const content = normalizeSearch([
      module.title, module.description, module.status, ...module.tags
    ].join(" "));
    return content.includes(terms);
  });
}

function renderModules() {
  const visibleModules = getVisibleModules();

  elements.moduleGrid.replaceChildren(
    ...visibleModules.map(createModuleCard)
  );

  elements.emptyMessage.hidden = visibleModules.length !== 0;
  elements.emptyMessage.textContent = searchTerm.trim()
    ? "Cap resultat. Prova una altra paraula o selecciona Tot."
    : "No hi ha cap mòdul disponible en aquesta categoria.";
  elements.moduleResults.textContent = `${visibleModules.length} opcions disponibles`;
}

elements.moduleSearch.value = searchTerm;
elements.moduleSearch.addEventListener("input", event => {
  searchTerm = event.target.value;
  renderModules();
  syncUrl();
});

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  activeCategory = moduleCategories.some(item => item.id === category)
    ? category : "all";
  searchTerm = params.get("q") || "";
  elements.moduleSearch.value = searchTerm;
  renderCategories();
  renderModules();
});

renderCategories();
renderModules();
