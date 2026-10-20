(() => {
  "use strict";
  if (window.__BICIPARK_MARKETPLACE_NAV__) return;
  window.__BICIPARK_MARKETPLACE_NAV__ = true;

  const labels = {
    ca: { title: "Mercat", desc: "Compra, ven o intercanvia material." },
    es: { title: "Mercado", desc: "Compra, vende o intercambia material." },
    en: { title: "Market", desc: "Buy, sell or swap cycling gear." },
    fr: { title: "Marché", desc: "Achetez, vendez ou échangez du matériel." }
  };

  function language() {
    return window.BiciParkI18n?.getLanguage?.() || localStorage.getItem("bicipark.language.v1") || "ca";
  }

  function text() {
    return labels[language()] || labels.ca;
  }

  function install() {
    const menu = document.querySelector("#bp-global-nav .bp-nav-menu");
    if (!menu) return false;
    let link = menu.querySelector('[data-bicipark-entry="market"]');
    if (!link) {
      link = document.createElement("a");
      link.href = "/modules/marketplace/";
      link.dataset.biciparkEntry = "market";
      link.innerHTML = `
        <span class="bp-nav-menu-icon" aria-hidden="true">↔</span>
        <span class="bp-nav-menu-copy"><strong></strong><small></small></span>`;
      menu.insertBefore(link, menu.firstElementChild);
    }
    const copy = text();
    link.querySelector("strong").textContent = copy.title;
    link.querySelector("small").textContent = copy.desc;
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (install() || tries > 40) clearInterval(timer);
  }, 100);

  window.addEventListener("bicipark:language-changed", install);
})();
