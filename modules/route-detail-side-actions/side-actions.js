(() => {
  "use strict";

  if (window.__bpSideActionsV1) return;
  window.__bpSideActionsV1 = true;

  const defs = [
    {
      id: "favorite",
      terms: ["afegir a favorits", "afegir als favorits"],
      label: "Favorits",
      icon: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>'
    },
    {
      id: "plan",
      terms: ["al meu pla"],
      label: "Al meu pla",
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>'
    },
    {
      id: "register",
      terms: ["veure registre"],
      label: "Registre",
      icon: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>'
    },
    {
      id: "undo",
      terms: ["desfer registre"],
      label: "Desfer",
      danger: true,
      icon: '<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg>'
    },
    {
      id: "download",
      terms: ["descarregar traçat", "descarregar tracat", "traçat no disponible", "tracat no disponible"],
      label: "GPX",
      icon: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'
    },
    {
      id: "share",
      terms: ["compartir"],
      label: "Compartir",
      icon: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>'
    }
  ];

  const norm = (s) => String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const containsAny = (text, terms) => {
    const value = norm(text);
    return terms.some(term => value.includes(norm(term)));
  };

  function isClickable(el) {
    return !!el && (
      el.matches("button,a,[role='button'],input[type='button'],input[type='submit']") ||
      el.hasAttribute("onclick") ||
      el.hasAttribute("data-action")
    );
  }

  function findAction(def) {
    const matches = [...document.body.querySelectorAll("*")]
      .filter(el => {
        if (el.closest("#bp-side-actions-card")) return false;
        const txt = el.textContent || "";
        return txt.length <= 180 && containsAny(txt, def.terms);
      })
      .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);

    for (const el of matches) {
      if (isClickable(el)) return { trigger: el, root: el };

      const clickable = el.closest("button,a,[role='button'],[onclick],[data-action]");
      if (clickable) return { trigger: clickable, root: clickable };

      let p = el.parentElement;
      for (let i = 0; p && i < 4; i++, p = p.parentElement) {
        const trigger = p.querySelector("button,a,[role='button'],[onclick],[data-action]");
        if (!trigger) continue;

        const r = p.getBoundingClientRect();
        const compact = r.width > 0 && r.height > 0 && r.width <= 320 && r.height <= 210;
        return { trigger, root: compact ? p : trigger };
      }
    }

    return null;
  }

  function isDisabled(el) {
    return !el ||
      el.disabled === true ||
      el.getAttribute("aria-disabled") === "true" ||
      el.classList.contains("disabled");
  }

  function isActive(el) {
    if (!el) return false;
    const txt = norm(el.textContent);
    return el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-current") === "true" ||
      ["active", "selected", "is-active", "checked"].some(c => el.classList.contains(c)) ||
      txt.includes("afegit") ||
      txt.includes("favorit");
  }

  function findSuitabilityCard() {
    const candidates = [...document.body.querySelectorAll("*")]
      .filter(el => {
        if (el.closest("#bp-side-actions-card")) return false;
        const txt = norm(el.textContent);
        return txt.includes("es adequada per a mi");
      })
      .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);

    for (const el of candidates) {
      let current = el;
      for (let i = 0; current && i < 6; i++, current = current.parentElement) {
        const rect = current.getBoundingClientRect();
        if (rect.width >= 260 && rect.height >= 100 && rect.height <= 600) {
          return current;
        }
      }
    }

    return null;
  }

  function init() {
    if (document.getElementById("bp-side-actions-card")) return;

    const suitabilityCard = findSuitabilityCard();
    if (!suitabilityCard || !suitabilityCard.parentElement) {
      console.warn("[BiciPark] No s'ha trobat el bloc 'És adequada per a mi?'.");
      return;
    }

    const card = document.createElement("section");
    card.id = "bp-side-actions-card";
    card.setAttribute("aria-label", "Accions de la ruta");

    const title = document.createElement("h2");
    title.className = "bp-sa-title";
    title.textContent = "Accions de la ruta";
    card.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "bp-sa-grid";
    card.appendChild(grid);

    const bindings = [];

    defs.forEach(def => {
      const found = findAction(def);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bp-sa-btn" + (def.danger ? " is-danger" : "");
      btn.innerHTML =
        `<span class="bp-sa-icon">${def.icon}</span>` +
        `<span class="bp-sa-label">${def.label}</span>`;

      if (!found) {
        btn.classList.add("bp-sa-missing");
        btn.disabled = true;
      } else {
        found.root.classList.add("bp-sa-original-hidden");

        btn.addEventListener("click", () => {
          if (!isDisabled(found.trigger)) {
            found.trigger.click();
          }
        });

        bindings.push({ def, btn, ...found });
      }

      grid.appendChild(btn);
    });

    suitabilityCard.parentElement.insertBefore(card, suitabilityCard);

    const sync = () => {
      bindings.forEach(binding => {
        binding.btn.disabled = isDisabled(binding.trigger);

        if (binding.def.id === "plan" || binding.def.id === "favorite") {
          binding.btn.classList.toggle(
            "is-active",
            isActive(binding.trigger) || isActive(binding.root)
          );
        }

        if (binding.def.id === "undo") {
          const hidden =
            binding.trigger.hidden ||
            binding.root.hidden ||
            binding.trigger.getAttribute("aria-hidden") === "true";

          binding.btn.classList.toggle("bp-sa-missing", hidden);
        }
      });
    };

    sync();
    window.setInterval(sync, 1000);

    console.info(
      `[BiciPark] Accions laterals actives: ${bindings.length}/${defs.length} accions detectades.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 300), { once: true });
  } else {
    setTimeout(init, 300);
  }
})();
