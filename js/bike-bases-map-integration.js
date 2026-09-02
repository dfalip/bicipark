(() => {
  "use strict";

  const MARKER =
    "BICIPARK_BIKE_BASES_DATA_DRIVEN_V5";

  const CATALOG_URL =
    "./bike-bases/data/bike-bases.json";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadBikeBases() {
    const response = await fetch(
      CATALOG_URL,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "No s'ha pogut carregar Bike Bases."
      );
    }

    const catalog =
      await response.json();

    return Array.isArray(catalog.bases)
      ? catalog.bases
      : [];
  }

  function getTypeVisual(base) {
    const type =
      String(base && base.type || "")
        .toLowerCase()
        .trim();

    if (type === "camping") {
      return {
        icon: "⛺",
        label: "Càmping"
      };
    }

    if (type === "hotel") {
      return {
        icon: "🏨",
        label: "Hotel"
      };
    }

    if (
      type === "apartment" ||
      type === "apartament" ||
      type === "casa-rural" ||
      type === "house"
    ) {
      return {
        icon: "🏠",
        label: "Casa / apartament"
      };
    }

    if (type === "hostel") {
      return {
        icon: "🛏️",
        label: "Hostel"
      };
    }

    return {
      icon: "📍",
      label: "Allotjament"
    };
  }

  function makeIcon(base) {
    const visual =
      getTypeVisual(base);

    return L.divIcon({
      className:
        "bicipark-bikebase-leaflet-icon",

      html:
        '<div class="bicipark-bikebase-marker" title="' +
        escapeHtml(base.name) +
        '">' +
          '<span class="bb-marker-tent">' +
            escapeHtml(visual.icon) +
          '</span>' +
          '<span class="bb-marker-bike">&#128690;</span>' +
        '</div>',

      iconSize: [54, 54],
      iconAnchor: [27, 27],
      popupAnchor: [0, -28]
    });
  }

  function popupHtml(base) {
    const modes =
      Array.isArray(base.modeLabels)
        ? base.modeLabels.join(" / ")
        : "";

    const status =
      base.statusLabel ||
      "Informació pública";

    const visual =
      getTypeVisual(base);

    return (
      '<div class="bicipark-bikebase-popup">' +
        '<div class="bb-popup-kicker">' +
          'BICIPARK BIKE BASE' +
        '</div>' +
        '<h3>' +
          escapeHtml(base.name) +
        '</h3>' +
        '<div class="bb-popup-meta">' +
          '<span>' +
            escapeHtml(visual.icon + ' ' + visual.label) +
          '</span>' +
          '<span>' +
            Number(base.routesCount || 0) +
            ' rutes' +
          '</span>' +
        '</div>' +
        '<p class="bb-popup-note">' +
          escapeHtml(status) +
        '</p>' +
        '<p class="bb-popup-note">' +
          escapeHtml(modes) +
        '</p>' +
        '<a class="bb-popup-button" href="' +
          escapeHtml(base.profileUrl || "./bike-bases/") +
        '">' +
          'Veure Bike Base &rarr;' +
        '</a>' +
      '</div>'
    );
  }

  async function install(map) {
    if (!map || !window.L) {
      return false;
    }

    if (
      window.BICIPARK_BIKE_BASES_LAYER &&
      window.BICIPARK_BIKE_BASES_LAYER.marker === MARKER
    ) {
      return true;
    }

    const bikeBases =
      await loadBikeBases();

    if (!bikeBases.length) {
      console.warn(
        "Bicipark Bike Bases: catàleg buit."
      );
      return true;
    }

    if (
      window.BICIPARK_BIKE_BASES_LAYER &&
      window.BICIPARK_BIKE_BASES_LAYER.layer
    ) {
      try {
        map.removeLayer(
          window.BICIPARK_BIKE_BASES_LAYER.layer
        );
      } catch (error) {
        console.warn(error);
      }
    }

    const layer =
      L.layerGroup();

    const markers = [];

    bikeBases.forEach(base => {
      const lat =
        Number(base.lat);

      const lng =
        Number(base.lng);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return;
      }

      const marker =
        L.marker(
          [lat, lng],
          {
            icon: makeIcon(base),
            title: base.name,
            keyboard: true,
            zIndexOffset: 850
          }
        );

      marker.bindPopup(
        popupHtml(base),
        {
          maxWidth: 330,
          minWidth: 260
        }
      );

      marker.addTo(layer);

      markers.push({
        base,
        marker
      });
    });

    layer.addTo(map);

    const BikeBaseControl =
      L.Control.extend({
        options: {
          position: "bottomright"
        },

        onAdd(controlMap) {
          const container =
            L.DomUtil.create(
              "div",
              "bicipark-bikebase-control-v3"
            );

          const goButton =
            L.DomUtil.create(
              "button",
              "bicipark-bikebase-go",
              container
            );

          goButton.type =
            "button";

          goButton.title =
            "Anar a les Bike Bases";

          goButton.innerHTML =
            '<span class="bb-control-icon bb-control-icon-generic" aria-hidden="true">' +
  '<span class="bb-control-pin">' +
    '<span class="bb-control-pin-core">' +
      '<span class="bb-control-house">&#8962;</span>' +
    '</span>' +
  '</span>' +
  '<span class="bb-control-bike">&#128690;</span>' +
'</span>' +
            '<span class="bb-control-copy">' +
              '<strong>Bike Bases</strong>' +
              '<small>' +
                markers.length +
                (markers.length === 1
                  ? ' lloc'
                  : ' llocs') +
              '</small>' +
            '</span>' +
            '<span class="bb-control-arrow">&rarr;</span>';

          const toggleButton =
            L.DomUtil.create(
              "button",
              "bicipark-bikebase-eye is-active",
              container
            );

          toggleButton.type =
            "button";

          toggleButton.title =
            "Mostrar o amagar Bike Bases";

          toggleButton.setAttribute(
            "aria-pressed",
            "true"
          );

          toggleButton.innerHTML =
            "&#128065;";

          L.DomEvent.disableClickPropagation(
            container
          );

          L.DomEvent.disableScrollPropagation(
            container
          );

          L.DomEvent.on(
            goButton,
            "click",
            event => {
              L.DomEvent.stop(event);

              if (
                !controlMap.hasLayer(layer)
              ) {
                layer.addTo(controlMap);
                toggleButton.classList.add(
                  "is-active"
                );
                toggleButton.setAttribute(
                  "aria-pressed",
                  "true"
                );
              }

              if (markers.length === 1) {
                const item =
                  markers[0];

                controlMap.flyTo(
                  [
                    Number(item.base.lat),
                    Number(item.base.lng)
                  ],
                  12,
                  {
                    animate: true,
                    duration: 1.2
                  }
                );

                window.setTimeout(
                  () => {
                    item.marker.openPopup();
                  },
                  1250
                );

                return;
              }

              const bounds =
                L.latLngBounds(
                  markers.map(item => [
                    Number(item.base.lat),
                    Number(item.base.lng)
                  ])
                );

              controlMap.fitBounds(
                bounds.pad(0.18),
                {
                  maxZoom: 11,
                  animate: true
                }
              );
            }
          );

          L.DomEvent.on(
            toggleButton,
            "click",
            event => {
              L.DomEvent.stop(event);

              const active =
                controlMap.hasLayer(layer);

              if (active) {
                controlMap.removeLayer(layer);
              } else {
                layer.addTo(controlMap);
              }

              const nextActive =
                !active;

              toggleButton.classList.toggle(
                "is-active",
                nextActive
              );

              toggleButton.setAttribute(
                "aria-pressed",
                nextActive
                  ? "true"
                  : "false"
              );

              toggleButton.innerHTML =
                nextActive
                  ? "&#128065;"
                  : "&#128584;";
            }
          );

          return container;
        }
      });

    new BikeBaseControl().addTo(map);

    window.BICIPARK_BIKE_BASES_LAYER = {
      marker: MARKER,
      layer,
      data: bikeBases,
      markers
    };

    return true;
  }

  function boot() {
    let attempts = 0;
    let installing = false;

    const timer =
      window.setInterval(
        async () => {
          attempts += 1;

          if (installing) {
            return;
          }

          if (
            !window.BICIPARK_MAIN_MAP
          ) {
            if (attempts >= 40) {
              window.clearInterval(timer);
              console.warn(
                "Bicipark Bike Bases: no s'ha trobat el mapa principal."
              );
            }
            return;
          }

          installing = true;

          try {
            const done =
              await install(
                window.BICIPARK_MAIN_MAP
              );

            if (done) {
              window.clearInterval(timer);
            }
          } catch (error) {
            console.error(
              "Bicipark Bike Bases:",
              error
            );

            if (attempts >= 40) {
              window.clearInterval(timer);
            }
          } finally {
            installing = false;
          }
        },
        150
      );
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