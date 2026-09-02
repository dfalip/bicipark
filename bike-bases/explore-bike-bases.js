(() => {
  "use strict";

  const els = {
    search: document.getElementById("searchInput"),
    type: document.getElementById("typeFilter"),
    mode: document.getElementById("modeFilter"),
    score: document.getElementById("scoreFilter"),
    nearby: document.getElementById("nearbyBtn"),
    clear: document.getElementById("clearFiltersBtn"),
    locationStatus: document.getElementById("locationStatus"),
    sort: document.getElementById("sortFilter"),
    list: document.getElementById("bikeBaseList"),
    count: document.getElementById("resultCount"),
    empty: document.getElementById("emptyState"),
    serviceFilters: Array.from(
      document.querySelectorAll(".serviceFilter")
    )
  };

  const state = {
    items: [],
    filtered: [],
    userLocation: null,
    markers: [],
    markerLayer: null
  };

  const map = L.map(
    "bikeBaseExploreMap",
    { preferCanvas: true }
  ).setView([42.15, 1.5], 7);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  state.markerLayer = L.layerGroup().addTo(map);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function visualForType(type) {
    switch (String(type || "").toLowerCase()) {
      case "camping":
        return { icon: "⛺", label: "Càmping" };
      case "hotel":
        return { icon: "🏨", label: "Hotel" };
      case "hostel":
        return { icon: "🛏️", label: "Hostel" };
      case "apartment":
      case "apartament":
      case "house":
      case "casa-rural":
        return { icon: "🏠", label: "Casa / apartament" };
      default:
        return { icon: "📍", label: "Allotjament" };
    }
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad = value => value * Math.PI / 180;

    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);

    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(
      Math.sqrt(aa),
      Math.sqrt(1 - aa)
    );
  }

  function distanceLabel(km) {
    if (!Number.isFinite(km)) return "";
    if (km < 10) return km.toFixed(1).replace(".", ",") + " km";
    return Math.round(km) + " km";
  }

  function typeProfileUrl(item) {
    return item.summary.profileUrlFromBikeBases || "./";
  }

  function createMarkerIcon(item) {
    const visual = visualForType(item.summary.type);

    return L.divIcon({
      className: "bb-explore-marker-wrap",
      html:
        '<div class="bb-explore-marker">' +
          '<span class="type">' + visual.icon + '</span>' +
          '<span class="bike">🚲</span>' +
        '</div>',
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -28]
    });
  }

  function renderMap() {
    state.markerLayer.clearLayers();
    state.markers = [];

    const positions = [];

    state.filtered.forEach(item => {
      const lat = Number(item.summary.lat);
      const lng = Number(item.summary.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker(
        [lat, lng],
        {
          icon: createMarkerIcon(item),
          title: item.summary.name
        }
      );

      const modes = (item.summary.modeLabels || []).join(" · ");

      marker.bindPopup(
        '<div class="bb-explore-popup">' +
          '<strong>' + item.summary.name + '</strong>' +
          '<span>Bike Friendly ' + item.rating.score + '/100</span>' +
          '<span>' + modes + '</span>' +
          '<a href="' + typeProfileUrl(item) + '">Veure Bike Base →</a>' +
        '</div>'
      );

      marker.addTo(state.markerLayer);

      state.markers.push({ item, marker });
      positions.push([lat, lng]);
    });

    if (positions.length === 1) {
      map.setView(positions[0], 11);
    } else if (positions.length > 1) {
      map.fitBounds(
        L.latLngBounds(positions).pad(0.2),
        { maxZoom: 9 }
      );
    }
  }

  function serviceBadges(item) {
    const labels = {
      bikeStorage: "🔒 Guarda-bicis",
      repair: "🔧 Taller",
      bikeWash: "🚿 Rentat",
      rental: "🚲 Lloguer"
    };

    return Object.entries(labels)
      .filter(([key]) =>
        item.detail.services &&
        item.detail.services[key]
      )
      .map(([, label]) =>
        '<span>' + label + '</span>'
      )
      .join("");
  }

  function renderList() {
    els.count.textContent = String(state.filtered.length);
    els.empty.classList.toggle("hidden", state.filtered.length !== 0);

    els.list.innerHTML = state.filtered
      .map(item => {
        const s = item.summary;
        const visual = visualForType(s.type);
        const modes = (s.modeLabels || []).join(" · ");
        const distance =
          Number.isFinite(item.distanceKm)
            ? '<span class="bb-distance">◎ ' +
              distanceLabel(item.distanceKm) +
              '</span>'
            : "";

        return `
          <article class="bb-result-card">
            <div class="bb-result-type">
              <span class="bb-type-icon">${visual.icon}</span>
              <span>${visual.label}</span>
            </div>

            <div class="bb-result-head">
              <div>
                <h3>${s.name}</h3>
                <p>${s.locality || ""} · ${s.region || ""}</p>
              </div>

              <div class="bb-result-score">
                <strong>${item.rating.score}</strong>
                <span>/100</span>
              </div>
            </div>

            <div class="bb-result-meta">
              <span>🚲 ${Number(s.routesCount || 0)} rutes</span>
              <span>${modes}</span>
              ${distance}
            </div>

            <div class="bb-result-services">
              ${serviceBadges(item)}
            </div>

            <div class="bb-result-footer">
              <span class="bb-result-status">
                ${s.statusLabel || "Informació pública"}
              </span>

              <a href="${typeProfileUrl(item)}">
                Veure Bike Base →
              </a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function selectedServices() {
    return els.serviceFilters
      .filter(input => input.checked)
      .map(input => input.value);
  }

  function applyFilters() {
    const text = normalize(els.search.value);
    const type = els.type.value;
    const mode = els.mode.value;
    const minimumScore = Number(els.score.value || 0);
    const requiredServices = selectedServices();

    let result = state.items.filter(item => {
      const s = item.summary;
      const d = item.detail;

      const haystack = normalize(
        [
          s.name,
          s.locality,
          s.region,
          s.categoryLabel,
          ...(s.modeLabels || [])
        ].join(" ")
      );

      if (text && !haystack.includes(text)) {
        return false;
      }

      if (type && s.type !== type) {
        return false;
      }

      if (
        mode &&
        !(Array.isArray(s.modes) && s.modes.includes(mode))
      ) {
        return false;
      }

      if (item.rating.score < minimumScore) {
        return false;
      }

      if (
        requiredServices.some(
          key => !(d.services && d.services[key])
        )
      ) {
        return false;
      }

      return true;
    });

    const sort = els.sort.value;

    result.sort((a, b) => {
      if (sort === "name") {
        return a.summary.name.localeCompare(b.summary.name);
      }

      if (sort === "routes") {
        return Number(b.summary.routesCount || 0) -
               Number(a.summary.routesCount || 0);
      }

      if (sort === "distance") {
        const ad = Number.isFinite(a.distanceKm)
          ? a.distanceKm
          : Infinity;
        const bd = Number.isFinite(b.distanceKm)
          ? b.distanceKm
          : Infinity;
        return ad - bd;
      }

      return b.rating.score - a.rating.score;
    });

    state.filtered = result;
    renderList();
    renderMap();
  }

  function clearFilters() {
    els.search.value = "";
    els.type.value = "";
    els.mode.value = "";
    els.score.value = "0";
    els.sort.value = "score";

    els.serviceFilters.forEach(input => {
      input.checked = false;
    });

    applyFilters();
  }

  function locateUser() {
    if (!navigator.geolocation) {
      els.locationStatus.textContent =
        "Aquest navegador no permet geolocalització.";
      return;
    }

    els.nearby.disabled = true;
    els.nearby.textContent = "Buscant...";

    navigator.geolocation.getCurrentPosition(
      position => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        state.items.forEach(item => {
          item.distanceKm = haversineKm(
            state.userLocation,
            {
              lat: Number(item.summary.lat),
              lng: Number(item.summary.lng)
            }
          );
        });

        els.sort.value = "distance";
        els.locationStatus.textContent =
          "Ordenat per distància des de la teva ubicació.";

        els.nearby.disabled = false;
        els.nearby.textContent = "✓ A prop meu";

        applyFilters();
      },
      () => {
        els.locationStatus.textContent =
          "No s'ha pogut obtenir la teva ubicació.";

        els.nearby.disabled = false;
        els.nearby.textContent = "◎ A prop meu";
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 120000
      }
    );
  }

  async function boot() {
    try {
      const catalog =
        await window.BiciparkBikeBases.loadCatalog();

      const summaries =
        Array.isArray(catalog.bases)
          ? catalog.bases
          : [];

      const items = await Promise.all(
        summaries.map(async summary => {
          const detail =
            await window.BiciparkBikeBases.loadBase(summary.id);

          const rating =
            window.BiciparkBikeFriendly.calculate(detail);

          return {
            summary,
            detail,
            rating,
            distanceKm: null
          };
        })
      );

      state.items = items;
      applyFilters();
    } catch (error) {
      console.error(error);

      els.list.innerHTML =
        '<div class="bb-empty">' +
          '<strong>No s\'han pogut carregar les Bike Bases</strong>' +
          '<span>Revisa el catàleg de dades.</span>' +
        '</div>';
    }
  }

  [
    els.search,
    els.type,
    els.mode,
    els.score,
    els.sort
  ].forEach(element => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

  els.serviceFilters.forEach(input => {
    input.addEventListener("change", applyFilters);
  });

  els.clear.addEventListener("click", clearFilters);
  els.nearby.addEventListener("click", locateUser);

  boot();
})();