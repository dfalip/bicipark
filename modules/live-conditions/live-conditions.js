(() => {
  "use strict";

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /live-conditions\.js/.test(script.src)
      );

  const baseUrl =
    new URL("./", selfScript.src);

  const state = {
    map: null,
    layer: null,
    items: [],
    filtered: [],
    markers: new Map(),
    selectedId: null,
    status: "all",
    type: "all",
    search: ""
  };

  const typeInfo = {
    ok: {
      label: "Sense incidencia",
      icon: "\u2713"
    },
    works: {
      label: "Obres",
      icon: "\ud83d\udea7"
    },
    closed: {
      label: "Tancament",
      icon: "\u26d4"
    },
    mud: {
      label: "Fang",
      icon: "\ud83c\udf27\ufe0f"
    },
    obstacle: {
      label: "Obstacle",
      icon: "\ud83c\udf33"
    },
    traffic: {
      label: "Transit",
      icon: "\ud83d\ude97"
    },
    danger: {
      label: "Perill",
      icon: "\u26a0\ufe0f"
    },
    maintenance: {
      label: "Manteniment",
      icon: "\ud83d\udd27"
    },
    other: {
      label: "Altres",
      icon: "\ud83d\udccd"
    }
  };

  const statusInfo = {
    open: {
      label: "Transitable",
      icon: "\ud83d\udfe2"
    },
    caution: {
      label: "Precaucio",
      icon: "\ud83d\udfe0"
    },
    closed: {
      label: "Tancat",
      icon: "\ud83d\udd34"
    }
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function localItems() {
    try {
      const raw =
        localStorage.getItem(
          "bicipark.liveConditions.reports"
        );

      const parsed =
        raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalItems(items) {
    localStorage.setItem(
      "bicipark.liveConditions.reports",
      JSON.stringify(items)
    );
  }

  async function loadData() {
    const response =
      await fetch(
        new URL(
          "./data/conditions-demo.json",
          baseUrl
        ).href,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status
      );
    }

    const demo =
      await response.json();

    state.items = [
      ...(Array.isArray(demo) ? demo : []),
      ...localItems()
    ];
  }

  function infoForType(type) {
    return (
      typeInfo[type] ||
      typeInfo.other
    );
  }

  function infoForStatus(status) {
    return (
      statusInfo[status] ||
      statusInfo.caution
    );
  }

  function initMap() {
    state.map =
      L.map(
        "liveConditionsMap"
      ).setView(
        [41.82, 2.25],
        8
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    ).addTo(state.map);

    state.layer =
      L.layerGroup().addTo(
        state.map
      );
  }

  function markerIcon(item) {
    const status =
      ["open","caution","closed"]
        .includes(item.status)
          ? item.status
          : "caution";

    const type =
      infoForType(item.type);

    return L.divIcon({
      className: "",
      html:
        '<div class="lc-marker lc-marker-' +
          status +
          '">' +
          type.icon +
        "</div>",
      iconSize: [31,31],
      iconAnchor: [15,15],
      popupAnchor: [0,-14]
    });
  }

  function popupHtml(item) {
    const type =
      infoForType(item.type);

    const status =
      infoForStatus(item.status);

    return (
      '<div class="lc-popup">' +
        '<div class="lc-popup-kicker">' +
          status.icon + " " +
          escapeHtml(status.label) +
          " · " +
          type.icon + " " +
          escapeHtml(type.label) +
        "</div>" +
        "<h3>" +
          escapeHtml(item.title) +
        "</h3>" +
        "<p>" +
          escapeHtml(item.description || "") +
        "</p>" +
        '<div class="lc-meta">' +
          (
            item.region
              ? "<span>\ud83d\udccd " +
                escapeHtml(item.region) +
                "</span>"
              : ""
          ) +
          (
            item.sourceType === "demo"
              ? '<span class="lc-demo">Dada de demostracio</span>'
              : "<span>Reportat per usuari</span>"
          ) +
        "</div>" +
      "</div>"
    );
  }

  function renderMarkers() {
    state.layer.clearLayers();
    state.markers.clear();

    state.filtered.forEach(item => {
      const marker =
        L.marker(
          [
            Number(item.lat),
            Number(item.lng)
          ],
          {
            icon: markerIcon(item)
          }
        );

      marker.bindPopup(
        popupHtml(item),
        {
          maxWidth: 300
        }
      );

      marker.on(
        "click",
        () => {
          state.selectedId =
            item.id;
          renderList();
        }
      );

      marker.addTo(
        state.layer
      );

      state.markers.set(
        item.id,
        marker
      );
    });
  }

  function relativeTime(item) {
    try {
      const date =
        new Date(item.updatedAt);

      const diffMs =
        Date.now() - date.getTime();

      const hours =
        Math.max(
          0,
          Math.round(
            diffMs / 3600000
          )
        );

      if (hours < 1) {
        return "fa menys d'1 h";
      }

      if (hours < 24) {
        return "fa " + hours + " h";
      }

      const days =
        Math.round(hours / 24);

      return "fa " + days + " dies";
    } catch (_) {
      return "";
    }
  }

  function cardHtml(item) {
    const type =
      infoForType(item.type);

    const status =
      infoForStatus(item.status);

    return (
      '<article class="lc-card ' +
        (
          item.id === state.selectedId
            ? "is-selected"
            : ""
        ) +
        '" data-id="' +
        escapeHtml(item.id) +
        '">' +
        '<div class="lc-card-top">' +
          "<div>" +
            "<h3>" +
              escapeHtml(item.title) +
            "</h3>" +
            '<span class="lc-status lc-status-' +
              escapeHtml(item.status) +
              '">' +
              status.icon +
              " " +
              escapeHtml(status.label) +
            "</span>" +
          "</div>" +
          "<span>" +
            type.icon +
          "</span>" +
        "</div>" +
        "<p>" +
          escapeHtml(
            item.description || ""
          ) +
        "</p>" +
        '<div class="lc-meta">' +
          (
            item.region
              ? "<span>\ud83d\udccd " +
                escapeHtml(item.region) +
                "</span>"
              : ""
          ) +
          "<span>" +
            escapeHtml(relativeTime(item)) +
          "</span>" +
          (
            item.sourceType === "demo"
              ? '<span class="lc-demo">Demo</span>'
              : "<span>Usuari</span>"
          ) +
        "</div>" +
      "</article>"
    );
  }

  function renderList() {
    const root =
      document.getElementById(
        "conditionList"
      );

    root.innerHTML =
      state.filtered.length
        ? state.filtered
            .map(cardHtml)
            .join("")
        : (
          '<div class="lc-note">' +
            "No hi ha avisos que coincideixin amb aquests filtres." +
          "</div>"
        );

    root
      .querySelectorAll(
        ".lc-card"
      )
      .forEach(card => {
        card.addEventListener(
          "click",
          () => {
            selectItem(
              card.dataset.id
            );
          }
        );
      });

    document.getElementById(
      "conditionCount"
    ).textContent =
      state.filtered.length +
      " avisos";
  }

  function selectItem(id) {
    const item =
      state.items.find(
        current =>
          current.id === id
      );

    if (!item) return;

    state.selectedId = id;
    renderList();

    state.map.flyTo(
      [
        Number(item.lat),
        Number(item.lng)
      ],
      14,
      {
        duration: .6
      }
    );

    setTimeout(
      () =>
        state.markers
          .get(id)
          ?.openPopup(),
      450
    );
  }

  function applyFilters() {
    const q =
      state.search
        .trim()
        .toLowerCase();

    state.filtered =
      state.items.filter(item => {
        const statusOk =
          state.status === "all" ||
          item.status === state.status;

        const typeOk =
          state.type === "all" ||
          item.type === state.type;

        const haystack =
          (
            item.title + " " +
            (item.description || "") + " " +
            (item.region || "")
          ).toLowerCase();

        const searchOk =
          !q ||
          haystack.includes(q);

        return (
          statusOk &&
          typeOk &&
          searchOk
        );
      });

    renderMarkers();
    renderList();
  }

  function fitAll() {
    if (!state.filtered.length) {
      return;
    }

    const bounds =
      L.latLngBounds(
        state.filtered.map(
          item => [
            Number(item.lat),
            Number(item.lng)
          ]
        )
      );

    state.map.fitBounds(
      bounds,
      {
        padding: [35,35],
        maxZoom: 11
      }
    );
  }

  function locateUser(callback) {
    if (!navigator.geolocation) {
      alert(
        "Aquest navegador no permet geolocalitzacio."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        callback(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        alert(
          "No s'ha pogut obtenir la ubicacio."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  function openDialog() {
    document
      .getElementById(
        "reportModal"
      )
      .classList.add(
        "is-open"
      );
  }

  function closeDialog() {
    document
      .getElementById(
        "reportModal"
      )
      .classList.remove(
        "is-open"
      );
  }

  function saveReport(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const lat =
      Number(
        formData.get("lat")
      );

    const lng =
      Number(
        formData.get("lng")
      );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      alert(
        "Cal indicar una ubicacio valida."
      );
      return;
    }

    const report = {
      id:
        "user-" +
        Date.now(),
      title:
        String(
          formData.get("title") ||
          "Incidencia"
        ),
      type:
        String(
          formData.get("type") ||
          "other"
        ),
      status:
        String(
          formData.get("status") ||
          "caution"
        ),
      lat,
      lng,
      region:
        String(
          formData.get("region") || ""
        ),
      description:
        String(
          formData.get("description") || ""
        ),
      updatedAt:
        new Date().toISOString(),
      sourceType: "user",
      verified: false
    };

    const current =
      localItems();

    current.unshift(report);
    saveLocalItems(current);

    state.items.unshift(report);
    closeDialog();
    form.reset();
    applyFilters();
    selectItem(report.id);

    window.BiciParkCore?.emit(
      "live-conditions:report-created",
      report
    );
  }

  function bindUi() {
    const search =
      document.getElementById(
        "conditionSearch"
      );

    search.addEventListener(
      "input",
      () => {
        state.search =
          search.value;
        applyFilters();
      }
    );

    const typeSelect =
      document.getElementById(
        "conditionType"
      );

    typeSelect.addEventListener(
      "change",
      () => {
        state.type =
          typeSelect.value;
        applyFilters();
      }
    );

    document
      .querySelectorAll(
        "[data-status-filter]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            state.status =
              button.dataset
                .statusFilter;

            document
              .querySelectorAll(
                "[data-status-filter]"
              )
              .forEach(current => {
                current.classList.toggle(
                  "is-active",
                  current === button
                );
              });

            applyFilters();
          }
        );
      });

    document
      .getElementById(
        "fitConditionsButton"
      )
      .addEventListener(
        "click",
        fitAll
      );

    document
      .getElementById(
        "reportButton"
      )
      .addEventListener(
        "click",
        openDialog
      );

    document
      .getElementById(
        "closeReportModal"
      )
      .addEventListener(
        "click",
        closeDialog
      );

    document
      .getElementById(
        "cancelReportButton"
      )
      .addEventListener(
        "click",
        closeDialog
      );

    document
      .getElementById(
        "useLocationButton"
      )
      .addEventListener(
        "click",
        () => {
          locateUser(
            (lat,lng) => {
              document.getElementById(
                "reportLat"
              ).value =
                lat.toFixed(6);

              document.getElementById(
                "reportLng"
              ).value =
                lng.toFixed(6);
            }
          );
        }
      );

    document
      .getElementById(
        "useMapCenterButton"
      )
      .addEventListener(
        "click",
        () => {
          const center =
            state.map.getCenter();

          document.getElementById(
            "reportLat"
          ).value =
            center.lat.toFixed(6);

          document.getElementById(
            "reportLng"
          ).value =
            center.lng.toFixed(6);
        }
      );

    document
      .getElementById(
        "reportForm"
      )
      .addEventListener(
        "submit",
        saveReport
      );

    document
      .getElementById(
        "reportModal"
      )
      .addEventListener(
        "click",
        event => {
          if (
            event.target.id ===
            "reportModal"
          ) {
            closeDialog();
          }
        }
      );
  }

  async function boot() {
    initMap();
    bindUi();

    try {
      await loadData();
      applyFilters();
      fitAll();

      window.BiciParkCore?.registerModule({
        id:
          "live-conditions",
        version:
          "1.0.0",
        api: {
          getAll: () =>
            [...state.items],
          getFiltered: () =>
            [...state.filtered],
          openReportForm:
            openDialog
        }
      });

      window.BiciParkCore?.emit(
        "live-conditions:ready",
        {
          count:
            state.items.length
        }
      );
    } catch (error) {
      console.error(
        "[Live Conditions]",
        error
      );

      document.getElementById(
        "conditionList"
      ).innerHTML =
        '<div class="lc-note">' +
          "No s'han pogut carregar els avisos." +
        "</div>";
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();