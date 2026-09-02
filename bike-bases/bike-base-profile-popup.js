(() => {
  "use strict";

  let catalog = null;
  const processing = new WeakSet();

  async function getCatalog() {
    if (catalog) {
      return catalog;
    }

    if (
      window.BiciparkBikeBases &&
      window.BiciparkBikeBases.loadCatalog
    ) {
      catalog =
        await window.BiciparkBikeBases.loadCatalog();

      return catalog;
    }

    const response =
      await fetch(
        "./data/bike-bases.json",
        { cache: "no-store" }
      );

    if (!response.ok) {
      throw new Error(
        "No s'ha pogut carregar el cataleg Bike Bases."
      );
    }

    catalog =
      await response.json();

    return catalog;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function popupAlreadyEnhanced(popup) {
    return Boolean(
      popup &&
      popup.querySelector(
        ":scope > .bb-profile-popup-v2"
      )
    );
  }

  function findBaseForPopup(popup, bases) {
    const popupText =
      normalizeText(
        popup.textContent
      );

    return (
      bases.find(base => {
        const name =
          normalizeText(base.name);

        return (
          name &&
          popupText.includes(name)
        );
      }) || null
    );
  }

  function findRoutesTarget() {
    const candidates =
      Array.from(
        document.querySelectorAll(
          "h1,h2,h3,.section-title"
        )
      );

    const heading =
      candidates.find(element => {
        const text =
          normalizeText(
            element.textContent
          );

        return (
          text.includes("rutes ciclistes") ||
          text === "rutes"
        );
      });

    if (!heading) {
      return null;
    }

    return (
      heading.closest("section") ||
      heading.parentElement ||
      heading
    );
  }

  function statusClass(code) {
    if (code === "partner") {
      return "partner";
    }

    if (code === "verified") {
      return "verified";
    }

    return "public";
  }

  function modeText(base) {
    if (
      Array.isArray(base.modeLabels) &&
      base.modeLabels.length
    ) {
      return base.modeLabels.join(" · ");
    }

    return "Ciclisme";
  }

  function directionsUrl(base) {
    const lat =
      Number(base.lat);

    const lng =
      Number(base.lng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return (
        "https://www.google.com/maps/dir/" +
        "?api=1&destination=" +
        encodeURIComponent(
          lat + "," + lng
        )
      );
    }

    return (
      "https://www.google.com/maps/search/" +
      "?api=1&query=" +
      encodeURIComponent(base.name)
    );
  }

  async function getRating(base) {
    try {
      if (
        !window.BiciparkBikeBases ||
        !window.BiciparkBikeFriendly
      ) {
        return null;
      }

      const detail =
        await window.BiciparkBikeBases.loadBase(
          base.id
        );

      return (
        window.BiciparkBikeFriendly.calculate(
          detail
        )
      );
    } catch (error) {
      console.warn(
        "Bike Friendly popup:",
        error
      );

      return null;
    }
  }

  function createActions(base) {
    const actions =
      document.createElement("div");

    actions.className =
      "bb-profile-popup-actions";

    const routesButton =
      document.createElement("button");

    routesButton.type =
      "button";

    routesButton.className =
      "bb-profile-popup-button primary";

    routesButton.innerHTML =
      '<span>Veure rutes</span>' +
      '<strong>&darr;</strong>';

    routesButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        const target =
          findRoutesTarget();

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );

    const directionsLink =
      document.createElement("a");

    directionsLink.className =
      "bb-profile-popup-button secondary";

    directionsLink.href =
      directionsUrl(base);

    directionsLink.target =
      "_blank";

    directionsLink.rel =
      "noopener";

    directionsLink.innerHTML =
      '<span>Com arribar-hi</span>' +
      '<strong>&nearr;</strong>';

    actions.append(
      routesButton,
      directionsLink
    );

    return actions;
  }

  function positionPopupAndMap(
    popup,
    base
  ) {
    const shell =
      popup.closest(
        ".leaflet-popup"
      );

    const contentWrapper =
      popup.closest(
        ".leaflet-popup-content-wrapper"
      );

    if (shell) {
      shell.classList.add(
        "bicipark-bikebase-popup-shell"
      );

      /*
       * Leave enough room for the circular Bike Base marker.
       * The marker remains visible below the popup.
       */
      shell.style.marginBottom =
        "46px";
    }

    popup.style.width =
      "286px";

    popup.style.maxWidth =
      "calc(100vw - 90px)";

    if (contentWrapper) {
      contentWrapper.style.maxWidth =
        "calc(100vw - 60px)";
    }

    window.setTimeout(
      () => {
        const map =
          window.BICIPARK_BIKE_BASE_PROFILE_MAP;

        if (
          !map ||
          !window.L ||
          !shell
        ) {
          return;
        }

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

        /*
         * The enriched popup is taller than Leaflet's original
         * popup. Make space above the marker rather than covering
         * the geographic position.
         */
        const popupHeight =
          shell.offsetHeight || 210;

        const topPadding =
          Math.min(
            Math.max(
              popupHeight + 72,
              235
            ),
            330
          );

        try {
          map.panInside(
            L.latLng(lat, lng),
            {
              paddingTopLeft:
                L.point(
                  28,
                  topPadding
                ),

              paddingBottomRight:
                L.point(
                  28,
                  42
                ),

              animate: true,
              duration: 0.28
            }
          );
        } catch (error) {
          console.warn(
            "Bike Base popup pan:",
            error
          );
        }
      },
      35
    );
  }

  async function enhancePopup(popup) {
    if (
      !popup ||
      processing.has(popup) ||
      popupAlreadyEnhanced(popup)
    ) {
      return;
    }

    processing.add(popup);

    try {
      const data =
        await getCatalog();

      const bases =
        Array.isArray(data.bases)
          ? data.bases
          : [];

      const base =
        findBaseForPopup(
          popup,
          bases
        );

      if (!base) {
        return;
      }

      if (popupAlreadyEnhanced(popup)) {
        return;
      }

      const rating =
        await getRating(base);

      if (popupAlreadyEnhanced(popup)) {
        return;
      }

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "bb-profile-popup-v2";

      const scoreMarkup =
        rating
          ? `
            <div class="bb-profile-popup-score">
              <strong>${rating.score}</strong>
              <span>/ ${rating.maxScore}</span>
            </div>
          `
          : "";

      const scoreLabel =
        rating
          ? `
            <span class="bb-profile-popup-chip score">
              Bike Friendly ${rating.score}/${rating.maxScore}
            </span>
          `
          : "";

      wrapper.innerHTML = `
        <div class="bb-profile-popup-head">
          <div class="bb-profile-popup-title">
            <div class="bb-profile-popup-kicker">
              BICIPARK BIKE BASE
            </div>

            <h3>
              ${base.name}
            </h3>
          </div>

          ${scoreMarkup}
        </div>

        <div class="bb-profile-popup-chips">
          ${scoreLabel}

          <span class="bb-profile-popup-chip">
            ${Number(base.routesCount || 0)} rutes
          </span>

          <span class="bb-profile-popup-chip modes">
            ${modeText(base)}
          </span>
        </div>

        <div
          class="bb-profile-popup-status ${statusClass(base.status)}"
        >
          ${base.statusLabel || "Informacio publica"}
        </div>
      `;

      wrapper.appendChild(
        createActions(base)
      );

      popup.replaceChildren(
        wrapper
      );

      positionPopupAndMap(
        popup,
        base
      );

    } catch (error) {
      console.warn(
        "Bike Base popup:",
        error
      );
    } finally {
      processing.delete(popup);
    }
  }

  function boot() {
    document
      .querySelectorAll(
        ".leaflet-popup-content"
      )
      .forEach(
        enhancePopup
      );

    const observer =
      new MutationObserver(
        mutations => {
          const popupsToCheck =
            new Set();

          mutations.forEach(
            mutation => {
              const target =
                mutation.target;

              if (
                target &&
                target.nodeType === 1
              ) {
                if (
                  target.matches &&
                  target.matches(
                    ".leaflet-popup-content"
                  )
                ) {
                  popupsToCheck.add(
                    target
                  );
                } else if (
                  target.closest
                ) {
                  const popup =
                    target.closest(
                      ".leaflet-popup-content"
                    );

                  if (popup) {
                    popupsToCheck.add(
                      popup
                    );
                  }
                }
              }

              mutation.addedNodes.forEach(
                node => {
                  if (
                    node.nodeType !== 1
                  ) {
                    return;
                  }

                  if (
                    node.matches &&
                    node.matches(
                      ".leaflet-popup-content"
                    )
                  ) {
                    popupsToCheck.add(
                      node
                    );
                  }

                  if (
                    node.querySelectorAll
                  ) {
                    node
                      .querySelectorAll(
                        ".leaflet-popup-content"
                      )
                      .forEach(
                        popup => {
                          popupsToCheck.add(
                            popup
                          );
                        }
                      );
                  }
                }
              );
            }
          );

          popupsToCheck.forEach(
            popup => {
              if (
                !popupAlreadyEnhanced(
                  popup
                )
              ) {
                enhancePopup(
                  popup
                );
              }
            }
          );
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
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