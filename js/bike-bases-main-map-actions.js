(() => {
  "use strict";

  const INSTALL_MARKER = "BICIPARK_MAIN_MAP_BIKE_BASE_ACTIONS_V1";

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

  function setButtonState(button, state) {
    if (!button) return;

    if (state === "loading") {
      button.classList.add("is-loading");
      button.innerHTML = "…";
      button.title = "Buscant la teva ubicació";
      return;
    }

    if (state === "error") {
      button.classList.remove("is-loading");
      button.classList.add("has-error");
      button.innerHTML = "!";
      button.title = "No s'ha pogut obtenir la ubicació";

      window.setTimeout(() => {
        button.classList.remove("has-error");
        button.innerHTML = "⌖";
        button.title = "Bike Base més propera";
      }, 1800);

      return;
    }

    button.classList.remove("is-loading", "has-error");
    button.innerHTML = "⌖";
    button.title = "Bike Base més propera";
  }

  function ensureLayerVisible(map, store) {
    if (
      store &&
      store.layer &&
      !map.hasLayer(store.layer)
    ) {
      store.layer.addTo(map);

      const eye =
        document.querySelector(
          ".bicipark-bikebase-eye"
        );

      if (eye) {
        eye.classList.add("is-active");
        eye.setAttribute("aria-pressed", "true");
        eye.innerHTML = "&#128065;";
      }
    }
  }

  function goToNearest(button) {
    const map =
      window.BICIPARK_MAIN_MAP;

    const store =
      window.BICIPARK_BIKE_BASES_LAYER;

    if (
      !map ||
      !store ||
      !Array.isArray(store.markers) ||
      !store.markers.length
    ) {
      setButtonState(button, "error");
      return;
    }

    if (!navigator.geolocation) {
      setButtonState(button, "error");
      return;
    }

    setButtonState(button, "loading");

    navigator.geolocation.getCurrentPosition(
      position => {
        const user = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        let nearest = null;
        let nearestKm = Infinity;

        store.markers.forEach(item => {
          const base =
            item && item.base
              ? item.base
              : null;

          if (!base) return;

          const lat = Number(base.lat);
          const lng = Number(base.lng);

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return;
          }

          const km = haversineKm(
            user,
            { lat, lng }
          );

          if (km < nearestKm) {
            nearestKm = km;
            nearest = item;
          }
        });

        if (!nearest) {
          setButtonState(button, "error");
          return;
        }

        ensureLayerVisible(map, store);

        const lat =
          Number(nearest.base.lat);

        const lng =
          Number(nearest.base.lng);

        map.flyTo(
          [lat, lng],
          12,
          {
            animate: true,
            duration: 1.15
          }
        );

        window.setTimeout(() => {
          if (
            nearest.marker &&
            nearest.marker.openPopup
          ) {
            nearest.marker.openPopup();
          }
        }, 1200);

        setButtonState(button, "ready");

        button.classList.add("is-success");
        button.title =
          "Més propera: " +
          nearest.base.name +
          " · " +
          (
            nearestKm < 10
              ? nearestKm.toFixed(1).replace(".", ",")
              : Math.round(nearestKm)
          ) +
          " km";

        window.setTimeout(() => {
          button.classList.remove("is-success");
        }, 1800);
      },

      () => {
        setButtonState(button, "error");
      },

      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 120000
      }
    );
  }

  function install() {
    if (
      window[INSTALL_MARKER]
    ) {
      return true;
    }

    const map =
      window.BICIPARK_MAIN_MAP;

    const store =
      window.BICIPARK_BIKE_BASES_LAYER;

    const container =
      document.querySelector(
        ".bicipark-bikebase-control-v3"
      );

    if (
      !map ||
      !store ||
      !container
    ) {
      return false;
    }

    if (
      container.querySelector(
        ".bicipark-bikebase-nearby"
      )
    ) {
      window[INSTALL_MARKER] = true;
      return true;
    }

    const eye =
      container.querySelector(
        ".bicipark-bikebase-eye"
      );

    const nearby =
      document.createElement("button");

    nearby.type = "button";
    nearby.className =
      "bicipark-bikebase-mini-action bicipark-bikebase-nearby";

    nearby.title =
      "Bike Base més propera";

    nearby.setAttribute(
      "aria-label",
      "Trobar la Bike Base més propera"
    );

    nearby.innerHTML = "⌖";

    nearby.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        goToNearest(nearby);
      }
    );

    const explore =
      document.createElement("button");

    explore.type = "button";
    explore.className =
      "bicipark-bikebase-mini-action bicipark-bikebase-explore";

    explore.title =
      "Explora i filtra totes les Bike Bases";

    explore.setAttribute(
      "aria-label",
      "Explora totes les Bike Bases"
    );

    explore.innerHTML = "≡";

    explore.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        window.location.href =
          "./bike-bases/explore.html";
      }
    );

    /*
     * Ordre:
     * [Bike Bases] [A prop meu] [Explora] [Ull]
     */
    if (eye) {
      container.insertBefore(
        nearby,
        eye
      );

      container.insertBefore(
        explore,
        eye
      );
    } else {
      container.append(
        nearby,
        explore
      );
    }

    window[INSTALL_MARKER] = true;

    return true;
  }

  let attempts = 0;

  const timer =
    window.setInterval(
      () => {
        attempts += 1;

        if (install()) {
          window.clearInterval(timer);
          return;
        }

        if (attempts >= 60) {
          window.clearInterval(timer);

          console.warn(
            "Bicipark: no s'han pogut instal·lar les accions Bike Bases."
          );
        }
      },
      150
    );
})();