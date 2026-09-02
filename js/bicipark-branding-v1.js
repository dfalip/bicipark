(() => {
  "use strict";

  if (window.__BICIPARK_SHARED_BRANDING_V1__) {
    return;
  }

  window.__BICIPARK_SHARED_BRANDING_V1__ = true;

  function projectRoot() {
    const script =
      document.currentScript ||
      Array.from(document.scripts)
        .find(item =>
          /\/js\/bicipark-branding-v1\.js(?:[?#].*)?$/.test(
            item.src
          )
        );

    if (!script?.src) {
      return new URL("./", location.href);
    }

    return new URL("../", script.src);
  }

  const root =
    projectRoot();

  const routeMatchUrl =
    new URL(
      "modules/route-match/",
      root
    ).href;

  function prepareHomepageAvatar() {
    const avatar =
      document.querySelector(
        ".topbar .avatar-pill"
      );

    if (!avatar) {
      return;
    }

    const actions =
      avatar.closest(
        ".topbar-actions"
      );

    if (actions) {
      actions.removeAttribute(
        "aria-hidden"
      );
    }

    avatar.setAttribute(
      "role",
      "link"
    );

    avatar.setAttribute(
      "tabindex",
      "0"
    );

    avatar.setAttribute(
      "aria-label",
      "Obrir el teu perfil ciclista"
    );

    avatar.setAttribute(
      "title",
      "El teu perfil ciclista"
    );

    const openProfile =
      () => {
        location.href =
          routeMatchUrl;
      };

    avatar.addEventListener(
      "click",
      openProfile
    );

    avatar.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openProfile();
        }
      }
    );
  }

  function boot() {
    prepareHomepageAvatar();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();