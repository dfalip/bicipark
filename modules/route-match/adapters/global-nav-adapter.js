(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_MATCH_GLOBAL_NAV_ADAPTER__) return;
  window.__BICIPARK_ROUTE_MATCH_GLOBAL_NAV_ADAPTER__ = true;

  const current =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /route-match\/adapters\/global-nav-adapter\.js/.test(script.src)
    );

  if (!current?.src) return;

  const moduleUrl =
    new URL("../", current.src).href;

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/[⌄⌃▾▴▼▲]/g, "")
      .trim()
      .toLowerCase();
  }

  function alreadyExists() {
    return Array.from(
      document.querySelectorAll("a")
    ).some(link =>
      /route-match\/?$/i.test(
        new URL(
          link.href,
          location.href
        ).pathname
      )
    );
  }

  function makeLink(asTopLevel) {
    const link =
      document.createElement("a");

    link.href =
      moduleUrl;

    link.className =
      "bp-rm-global-nav-link" +
      (
        asTopLevel
          ? " bp-rm-global-nav-top"
          : ""
      );

    link.innerHTML =
      '<span class="bp-rm-global-nav-icon">🎯</span>' +
      '<span>Pla ciclista</span>';

    return link;
  }

  function findMoreControl() {
    return Array.from(
      document.querySelectorAll(
        "button,a,[role='button']"
      )
    ).find(node => {
      const text =
        cleanText(
          node.textContent
        );

      return (
        text === "més" ||
        text === "mes"
      );
    }) || null;
  }

  function findDropdown(more) {
    if (!more) return null;

    const parent =
      more.parentElement;

    const local =
      parent?.querySelector(
        "[role='menu'], [class*='dropdown'], [class*='menu']"
      );

    if (
      local &&
      local !== parent &&
      !local.contains(more)
    ) {
      return local;
    }

    const candidates =
      Array.from(
        document.querySelectorAll(
          "[role='menu'], [class*='dropdown-menu'], [class*='nav-dropdown'], [class*='more-menu']"
        )
      );

    return candidates.find(node => {
      const text =
        cleanText(
          node.textContent
        );

      return (
        /aparcaments/.test(text) ||
        /allotjaments/.test(text) ||
        /tour de france/.test(text) ||
        /jocs/.test(text)
      );
    }) || null;
  }

  function insert() {
    if (alreadyExists()) {
      return true;
    }

    const more =
      findMoreControl();

    if (!more) {
      return false;
    }

    const dropdown =
      findDropdown(more);

    if (dropdown) {
      const link =
        makeLink(false);

      const lodging =
        Array.from(
          dropdown.querySelectorAll("a")
        ).find(a =>
          /allotjament/i.test(
            a.textContent || ""
          )
        );

      if (lodging) {
        lodging.insertAdjacentElement(
          "beforebegin",
          link
        );
      } else {
        dropdown.appendChild(link);
      }

      return true;
    }

    const parent =
      more.parentElement;

    if (parent) {
      parent.insertBefore(
        makeLink(true),
        more
      );

      return true;
    }

    return false;
  }

  function boot() {
    if (insert()) return;

    let tries = 0;

    const timer =
      setInterval(
        () => {
          tries++;

          if (
            insert() ||
            tries > 60
          ) {
            clearInterval(timer);
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