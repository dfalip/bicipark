(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_DETAIL_COMPACT_POLISH_V13__) {
    return;
  }
  window.__BICIPARK_ROUTE_DETAIL_COMPACT_POLISH_V13__ = true;

  let queued = false;
  let applying = false;

  const ICONS = {
    favorite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"></path></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M20 20a8 8 0 0 0-8-8H4"></path></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v7h-7"></path><path d="M3 10V3h7"></path></svg>'
  };

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseCount(status) {
    if (!status) {
      return 0;
    }
    const match = clean(status.textContent).match(/(\d+)/);
    if (!match) {
      return 0;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : 0;
  }

  function findAction(actions, id) {
    return actions ? actions.querySelector("#" + id) : null;
  }

  function ensureWrapper(button, label, iconMarkup) {
    if (!button) {
      return null;
    }

    button.classList.add("bp360-compact-action");

    const currentLabel = button.querySelector(".bp360-compact-label");
    const currentIcon = button.querySelector(".bp360-compact-icon");

    if (!currentLabel || !currentIcon) {
      button.innerHTML =
        '<span class="bp360-compact-icon" aria-hidden="true">' + iconMarkup + '</span>' +
        '<span class="bp360-compact-label"></span>';
    }

    const nextIcon = button.querySelector(".bp360-compact-icon");
    const nextLabel = button.querySelector(".bp360-compact-label");

    if (nextIcon) {
      nextIcon.innerHTML = iconMarkup;
    }
    if (nextLabel) {
      nextLabel.textContent = label;
    }

    return button;
  }

  function ensureManageAction(actions) {
    if (!actions) {
      return null;
    }

    let manage = findAction(actions, "bp-route-registration-manage-v11");
    const download = findAction(actions, "bp360-download");

    if (!manage) {
      manage = document.createElement("button");
      manage.type = "button";
      manage.id = "bp-route-registration-manage-v11";
      manage.className = "bp360-compact-action bp360-placeholder-action";

      if (download && download.parentNode === actions) {
        actions.insertBefore(manage, download);
      } else {
        actions.appendChild(manage);
      }
    }

    ensureWrapper(manage, "Desfer registre", ICONS.undo);
    return manage;
  }

  function setStatusCopy(status) {
    if (!status || status.hidden) {
      return 0;
    }

    const count = parseCount(status);
    if (!count) {
      return 0;
    }

    const next = count === 1 ? "\u2713 1 sortida registrada" : "\u2713 " + count + " sortides registrades";
    if (clean(status.textContent) !== next) {
      status.textContent = next;
    }

    status.setAttribute("aria-label", next);
    return count;
  }

  function setPrimaryCopy(primary) {
    if (!primary || primary.hidden) {
      return;
    }

    const text = norm(primary.textContent);
    if (text.includes("registrar")) {
      primary.textContent = "+ Registrar nova sortida";
      primary.setAttribute("aria-label", "Registrar nova sortida");
    }
  }

  function setDownloadState(download) {
    if (!download) {
      return;
    }

    const unavailable = norm(download.textContent).includes("no disponible");
    ensureWrapper(download, unavailable ? "Tracat no disponible" : "Descarregar tracat", ICONS.download);

    download.classList.toggle("bp360-is-unavailable", unavailable);
    download.classList.toggle("is-compact-disabled", unavailable);

    if (unavailable) {
      download.setAttribute("aria-disabled", "true");
      download.setAttribute("tabindex", "-1");
      download.title = "Aquest tracat no esta disponible per descarregar.";
      if ("disabled" in download) {
        download.disabled = true;
      }
    } else {
      download.removeAttribute("aria-disabled");
      download.removeAttribute("tabindex");
      download.removeAttribute("title");
      if ("disabled" in download) {
        download.disabled = false;
      }
    }
  }

  function syncHistory(history) {
    if (!history) {
      return;
    }
    history.classList.remove("is-compact-disabled");
    if (history.hidden) {
      history.setAttribute("aria-hidden", "true");
    } else {
      history.removeAttribute("aria-hidden");
    }
  }

  function syncManageAction(actions, manage) {
    if (!actions || !manage) {
      return;
    }

    const originallyVisible = !manage.hidden && getComputedStyle(manage).display !== "none";
    const activeUndo = originallyVisible && norm(manage.textContent).includes("desfer");

    manage.hidden = false;
    manage.style.display = "";
    manage.classList.add("bp360-compact-action");
    manage.classList.remove("bp360-placeholder-action", "bp360-is-manage-action", "bp360-is-undo-action", "is-compact-disabled");

    ensureWrapper(manage, "Desfer registre", ICONS.undo);

    if (activeUndo) {
      manage.classList.add("bp360-is-undo-action");
      manage.removeAttribute("aria-disabled");
      manage.removeAttribute("tabindex");
      manage.removeAttribute("title");
      if ("disabled" in manage) {
        manage.disabled = false;
      }
    } else {
      manage.classList.add("bp360-placeholder-action", "is-compact-disabled");
      manage.setAttribute("aria-disabled", "true");
      manage.setAttribute("tabindex", "-1");
      manage.title = "No hi ha cap registre a desfer en aquesta ruta.";
      if ("disabled" in manage) {
        manage.disabled = true;
      }
    }

    actions.classList.toggle("bp360-undo-active", activeUndo);
    actions.classList.toggle("bp360-undo-disabled", !activeUndo);
  }

  function apply() {
    if (applying) {
      return;
    }
    applying = true;

    try {
      const actions = document.querySelector(".bp360-actions");
      if (!actions) {
        return;
      }

      const status = document.getElementById("bp-route-registration-status-v11");
      const primary = document.getElementById("bp-route-registration-action-v11");
      const favorite = document.getElementById("bp360-favorite");
      const plan = document.getElementById("bp360-plan");
      const history = document.getElementById("bp360-history");
      const download = document.getElementById("bp360-download");
      const share = document.getElementById("bp360-share");
      const manage = ensureManageAction(actions);

      setStatusCopy(status);
      setPrimaryCopy(primary);

      ensureWrapper(favorite, "Afegir a favorits", ICONS.favorite);
      ensureWrapper(plan, "Al meu pla", ICONS.plan);
      ensureWrapper(history, "Veure registre", ICONS.history);
      ensureWrapper(share, "Compartir", ICONS.share);

      syncManageAction(actions, manage);
      setDownloadState(download);
      syncHistory(history);

      [favorite, plan, history, manage, download, share].forEach(node => {
        if (node) {
          node.classList.add("bp360-compact-action");
        }
      });

      actions.classList.add("bp360-compact-polish-v13");
    } finally {
      applying = false;
    }
  }

  function queueApply() {
    if (queued) {
      return;
    }
    queued = true;
    window.setTimeout(() => {
      queued = false;
      window.requestAnimationFrame(apply);
    }, 24);
  }

  function boot() {
    [0, 80, 180, 350, 700, 1200].forEach(delay => window.setTimeout(queueApply, delay));

    const root = document.body || document.documentElement;
    if (root) {
      const observer = new MutationObserver(queueApply);
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "class", "style"]
      });
    }

    window.addEventListener("bicipark:activity-history:updated", queueApply);
    window.addEventListener("storage", queueApply);
    console.info("[BiciPark] Compact actions polish v1.3 loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();