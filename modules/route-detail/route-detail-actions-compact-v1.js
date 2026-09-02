(() => {
  "use strict";

  if (
    window.__BICIPARK_ROUTE_DETAIL_ACTIONS_COMPACT_V1__
  ) {
    return;
  }

  window.__BICIPARK_ROUTE_DETAIL_ACTIONS_COMPACT_V1__ =
    true;

  let queued =
    false;

  let decorating =
    false;

  function clean(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }

  function svgHeart(filled) {
    if (filled) {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M12 20.4 4.3 13A5 5 0 0 1 11.4 6L12 6.7l.6-.7a5 5 0 0 1 7.1 7Z" fill="currentColor"></path>' +
        "</svg>"
      );
    }

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 20.4 4.3 13A5 5 0 0 1 11.4 6L12 6.7l.6-.7a5 5 0 0 1 7.1 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>' +
      "</svg>"
    );
  }

  function svgTarget() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.7"></circle>' +
        '<circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"></circle>' +
        '<circle cx="12" cy="12" r="1.15" fill="currentColor"></circle>' +
      "</svg>"
    );
  }

  function svgHistory() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7 7.5h10M7 12h10M7 16.5h10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>' +
      "</svg>"
    );
  }

  function svgUndo() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M8.3 8.2H4.8V4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>' +
        '<path d="M5.2 8.1A8 8 0 1 1 4.5 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>' +
      "</svg>"
    );
  }

  function svgManage() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>' +
        '<circle cx="9" cy="7" r="1.6" fill="#fff" stroke="currentColor" stroke-width="1.5"></circle>' +
        '<circle cx="15" cy="12" r="1.6" fill="#fff" stroke="currentColor" stroke-width="1.5"></circle>' +
        '<circle cx="11" cy="17" r="1.6" fill="#fff" stroke="currentColor" stroke-width="1.5"></circle>' +
      "</svg>"
    );
  }

  function svgDownload() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 4.5v10M8.4 11l3.6 3.7 3.6-3.7M5.5 19h13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>' +
      "</svg>"
    );
  }

  function svgExternal() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M13 5h6v6M18.5 5.5 11 13M18 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>' +
      "</svg>"
    );
  }

  function markup(icon, label) {
    return (
      '<span class="bp360-compact-icon">' +
        icon +
      "</span>" +
      '<span class="bp360-compact-label">' +
        label +
      "</span>"
    );
  }

  function decorate(
    button,
    icon,
    label,
    stateClass
  ) {
    if (!button) {
      return;
    }

    const currentLabel =
      button.dataset
        .bpCompactLabel ||
      "";

    const hasIcon =
      !!button.querySelector(
        ".bp360-compact-icon"
      );

    const className =
      stateClass ||
      "";

    if (
      currentLabel ===
        label &&
      hasIcon &&
      button.dataset
        .bpCompactState ===
        className
    ) {
      return;
    }

    button.dataset
      .bpCompactLabel =
      label;

    button.dataset
      .bpCompactState =
      className;

    button.classList.add(
      "bp360-compact-action"
    );

    button.classList.toggle(
      "is-compact-danger",
      className ===
      "danger"
    );

    button.classList.toggle(
      "is-compact-active",
      className ===
      "active"
    );

    button.innerHTML =
      markup(
        icon,
        label
      );

    button.setAttribute(
      "aria-label",
      label
    );

    button.title =
      label;
  }

  function refresh() {
    if (decorating) {
      return;
    }

    decorating =
      true;

    try {
      const favorite =
        document.getElementById(
          "bp360-favorite"
        );

      if (favorite) {
        const active =
          favorite.dataset
            .active ===
          "1";

        decorate(
          favorite,
          svgHeart(active),
          active
            ? "A favorits"
            : "Afegir a favorits",
          active
            ? "active"
            : ""
        );
      }

      const plan =
        document.getElementById(
          "bp360-plan"
        );

      if (plan) {
        const text =
          norm(
            plan.textContent
          );

        const active =
          (
            text.includes(
              "al meu pla"
            ) &&
            !text.includes(
              "afegeix"
            )
          ) ||
          text.includes(
            "afegida"
          );

        decorate(
          plan,
          svgTarget(),
          active
            ? "Al meu pla"
            : "Afegir al meu pla",
          active
            ? "active"
            : ""
        );
      }

      const history =
        document.getElementById(
          "bp360-history"
        );

      if (history) {
        decorate(
          history,
          svgHistory(),
          "Veure registre",
          ""
        );
      }

      const manage =
        document.getElementById(
          "bp-route-registration-manage-v11"
        );

      if (manage) {
        const text =
          clean(
            manage.textContent
          );

        const lower =
          norm(text);

        if (
          lower.includes(
            "desfer"
          )
        ) {
          decorate(
            manage,
            svgUndo(),
            "Desfer registre",
            "danger"
          );
        }
        else if (
          lower.includes(
            "gestionar"
          )
        ) {
          decorate(
            manage,
            svgManage(),
            text,
            ""
          );
        }
      }

      const download =
        document.getElementById(
          "bp360-download"
        );

      if (download) {
        const text =
          norm(
            download.textContent
          );

        decorate(
          download,
          svgDownload(),
          text.includes(
            "no disponible"
          )
            ? "Tra\u00e7at no disponible"
            : "Descarregar tra\u00e7at",
          ""
        );
      }

      const share =
        document.getElementById(
          "bp360-share"
        );

      if (share) {
        const hasIcon =
          !!share.querySelector(
            ".bp360-compact-icon"
          );

        if (!hasIcon) {
          share.classList.add(
            "bp360-compact-action",
            "bp360-compact-share"
          );

          share.innerHTML =
            '<span class="bp360-compact-icon">' +
              svgExternal() +
            "</span>";

          share.setAttribute(
            "aria-label",
            "Obrir o compartir"
          );

          share.title =
            "Obrir o compartir";
        }
      }
    }
    finally {
      decorating =
        false;
    }
  }

  function queueRefresh() {
    if (queued) {
      return;
    }

    queued =
      true;

    window.setTimeout(
      () => {
        queued =
          false;

        window.requestAnimationFrame(
          refresh
        );
      },
      20
    );
  }

  function boot() {
    [
      0,
      80,
      180,
      400,
      800,
      1400
    ]
      .forEach(
        delay =>
          window.setTimeout(
            queueRefresh,
            delay
          )
      );

    const actions =
      document.querySelector(
        ".bp360-actions"
      );

    if (actions) {
      const observer =
        new MutationObserver(
          queueRefresh
        );

      observer.observe(
        actions,
        {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            "hidden",
            "data-active",
            "disabled"
          ]
        }
      );
    }

    window.addEventListener(
      "bicipark:activity-history:updated",
      queueRefresh
    );

    window.addEventListener(
      "bicipark:training-plan:updated",
      queueRefresh
    );

    window.addEventListener(
      "storage",
      queueRefresh
    );

    console.info(
      "[BiciPark] Compact Route Detail actions v1 loaded"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  }
  else {
    boot();
  }
})();