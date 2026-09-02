(() => {
  "use strict";

  const bases = Array.isArray(window.BICIPARK_BIKE_BASES)
    ? window.BICIPARK_BIKE_BASES
    : [];

  if (!bases.length) {
    document.body.innerHTML =
      "<p>No hi ha Bike Bases carregades.</p>";
    return;
  }

  const base = bases[0];

  const els = {
    baseName: document.getElementById("baseName"),
    baseType: document.getElementById("baseType"),
    baseAddress: document.getElementById("baseAddress"),
    officialLink: document.getElementById("officialLink"),
    cyclingLink: document.getElementById("cyclingLink"),
    services: document.getElementById("services"),
    routes: document.getElementById("routes")
  };

  const modeLabels = {
    road: "Carretera",
    gravel: "Gravel",
    mtb: "MTB"
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  els.baseName.textContent = base.name;
  els.baseType.textContent = base.type;
  els.baseAddress.textContent =
    "\uD83D\uDCCD " + base.location.address;

  els.officialLink.href = base.links.official;
  els.cyclingLink.href = base.links.cycling;

  els.services.innerHTML = base.services
    .map(service => `
      <div class="service">
        <span class="service-icon">${service.icon}</span>
        <div>${escapeHtml(service.label)}</div>
      </div>
    `)
    .join("");

  function renderRoutes(mode = "all") {
    const routes =
      mode === "all"
        ? base.routes
        : base.routes.filter(route => route.mode === mode);

    els.routes.innerHTML = routes
      .map(route => `
        <article class="route-card">
          <div class="route-num">${route.number}</div>
          <div class="mode">${modeLabels[route.mode]}</div>
          <h3>${escapeHtml(route.name)}</h3>

          <div class="route-actions">
            <a class="route-button main" href="${route.biciparkUrl}">
              Veure a Bicipark
            </a>
          </div>
        </article>
      `)
      .join("");
  }

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");
      renderRoutes(button.dataset.mode);
    });
  });

  renderRoutes();

  const map = L.map("map").setView(
    [base.location.lat, base.location.lng],
    11
  );
  // BICIPARK_BIKE_BASE_PROFILE_MAP_EXPORT_V1
  window.BICIPARK_BIKE_BASE_PROFILE_MAP = map;

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  const bikeIcon = L.divIcon({
    className: "",
    html:
      '<div style="' +
      'width:52px;height:52px;border-radius:50%;' +
      'display:grid;place-items:center;' +
      'background:#14834f;color:#fff;' +
      'border:4px solid #fff;' +
      'box-shadow:0 6px 18px rgba(0,0,0,.24);' +
      'font-size:25px;">&#128690;</div>',
    iconSize: [52, 52],
    iconAnchor: [26, 26]
  });

  L.marker(
    [base.location.lat, base.location.lng],
    { icon: bikeIcon }
  )
    .addTo(map)
    .bindPopup(
      "<strong>" + escapeHtml(base.name) + "</strong><br>" +
      escapeHtml(base.type)
    )
    .openPopup();
})();
