(() => {
  "use strict";

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const boardNav = document.getElementById("boardNav");
  const moreMenuBtn = document.getElementById("moreMenuBtn");
  const navMore = moreMenuBtn ? moreMenuBtn.closest(".nav-more") : null;

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
    if (navMore && !navMore.contains(e.target)) {
      closeMoreMenu();
    }
  });

  document.querySelectorAll(".board-nav a, .more-menu a").forEach(link => {
    link.addEventListener("click", () => {
      closeMoreMenu();
      if (window.matchMedia("(max-width: 760px)").matches) {
        closeMobileMenu();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 760px)").matches) {
      closeMobileMenu();
    }
  });
})();