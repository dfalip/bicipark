(() => {
  "use strict";

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const boardNav = document.getElementById("boardNav");
  const moreMenuBtn = document.getElementById("moreMenuBtn");
  const navMore = moreMenuBtn ? moreMenuBtn.closest(".nav-more") : null;

  function installPersonalCyclingEntries() {
    if (boardNav && !boardNav.querySelector('[data-bicipark-entry="today"]')) {
      const todayLink = document.createElement("a");
      todayLink.href = "./modules/today/";
      todayLink.textContent = "Avui";
      todayLink.dataset.biciparkEntry = "today";
      boardNav.insertBefore(todayLink, boardNav.firstElementChild);
    }

    const moreMenu = document.getElementById("moreMenu");
    if (moreMenu && !moreMenu.querySelector('[data-bicipark-entry="my-bike"]')) {
      const myBike = document.createElement("a");
      myBike.href = "./modules/my-bike/";
      myBike.dataset.biciparkEntry = "my-bike";
      myBike.innerHTML = "<strong>La meva bici</strong><small>Setup, manteniment i passaport</small>";
      moreMenu.insertBefore(myBike, moreMenu.firstElementChild);

      const planner = document.createElement("a");
      planner.href = "./modules/route-planner/";
      planner.dataset.biciparkEntry = "planner";
      planner.innerHTML = "<strong>Planifica</strong><small>Origen, destí i GPX</small>";
      moreMenu.insertBefore(planner, myBike.nextSibling);

      const passport = document.createElement("a");
      passport.href = "./modules/bike-passport/";
      passport.dataset.biciparkEntry = "passport";
      passport.innerHTML = "<strong>Bike Passport</strong><small>Identitat, proves i transferència</small>";
      moreMenu.insertBefore(passport, planner.nextSibling);

      const market = document.createElement("a");
      market.href = "./modules/marketplace/";
      market.dataset.biciparkEntry = "market";
      market.innerHTML = "<strong>Mercat</strong><small>Compra, ven o intercanvia material</small>";
      moreMenu.insertBefore(market, passport.nextSibling);
    }

    const heroActions = document.querySelector(".hero-actions");
    if (heroActions && !heroActions.querySelector('[data-bicipark-entry="today"]')) {
      const existingPrimary = heroActions.querySelector(".btn-primary");
      if (existingPrimary) {
        existingPrimary.classList.remove("btn-primary");
        existingPrimary.classList.add("btn-secondary");
      }
      const todayButton = document.createElement("a");
      todayButton.className = "btn btn-primary";
      todayButton.href = "./modules/today/";
      todayButton.dataset.biciparkEntry = "today";
      todayButton.textContent = "Què faig avui?";
      heroActions.insertBefore(todayButton, heroActions.firstChild);
    }
  }

  function loadMarketShowcase() {
    if (document.querySelector('script[data-bicipark-home-market]')) return;
    const script = document.createElement("script");
    script.src = "/js/home-market.js?v=1";
    script.dataset.biciparkHomeMarket = "1";
    document.head.appendChild(script);
  }

  function closeMoreMenu() {
    if (!navMore || !moreMenuBtn) return;
    navMore.classList.remove("is-open");
    moreMenuBtn.setAttribute("aria-expanded", "false");
  }

  function closeMobileMenu() {
    if (!mobileMenuBtn || !boardNav) return;
    boardNav.classList.remove("is-open");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
  }

  installPersonalCyclingEntries();
  loadMarketShowcase();

  if (mobileMenuBtn && boardNav) {
    mobileMenuBtn.addEventListener("click", () => {
      const next = !boardNav.classList.contains("is-open");
      boardNav.classList.toggle("is-open", next);
      mobileMenuBtn.setAttribute("aria-expanded", String(next));
    });
  }

  if (moreMenuBtn && navMore) {
    moreMenuBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const next = !navMore.classList.contains("is-open");
      navMore.classList.toggle("is-open", next);
      moreMenuBtn.setAttribute("aria-expanded", String(next));
    });
  }

  document.addEventListener("click", e => {
    if (navMore && !navMore.contains(e.target)) closeMoreMenu();
  });

  document.querySelectorAll(".board-nav a, .more-menu a").forEach(link => {
    link.addEventListener("click", () => {
      closeMoreMenu();
      if (window.matchMedia("(max-width: 760px)").matches) closeMobileMenu();
    });
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 760px)").matches) closeMobileMenu();
  });
})();
