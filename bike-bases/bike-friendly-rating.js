(() => {
  "use strict";

  function scoreClass(score) {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "basic";
    return "limited";
  }

  function statusClass(status) {
    if (status === "partner") return "partner";
    if (status === "verified") return "verified";
    return "public";
  }

  function createRatingCard(rating) {
    const section =
      document.createElement("section");

    section.className =
      "bike-friendly-score-card";

    section.innerHTML = `
      <div class="bf-score-top">
        <div>
          <div class="bf-kicker">
            BICIPARK BIKE FRIENDLY INDEX
          </div>

          <h3>
            Com de preparada est\u00e0 aquesta Bike Base?
          </h3>
        </div>

        <div
          class="bf-score-circle ${scoreClass(rating.score)}"
          aria-label="${rating.score} sobre ${rating.maxScore}"
        >
          <strong>${rating.score}</strong>
          <span>/ ${rating.maxScore}</span>
        </div>
      </div>

      <div class="bf-level-row">
        <span class="bf-level">
          ${rating.level}
        </span>

        <span
          class="bf-status ${statusClass(rating.status)}"
        >
          ${rating.statusLabel}
        </span>
      </div>

      <div class="bf-progress">
        <div
          class="bf-progress-fill"
          style="width:${rating.score}%"
        ></div>
      </div>

      <button
        class="bf-details-button"
        id="bikeFriendlyDetailsBtn"
        type="button"
      >
        Veure com es calcula
      </button>
    `;

    return section;
  }

  function createDetailsSection(rating) {
    const section =
      document.createElement("section");

    section.className =
      "bike-friendly-methodology";

    section.id =
      "bikeFriendlyMethodology";

    section.hidden = true;

    const rows = rating.criteria
      .map(item => `
        <div class="bf-criterion">
          <div class="bf-criterion-icon">
            ${item.icon}
          </div>

          <div class="bf-criterion-copy">
            <strong>${item.label}</strong>
            <span>${item.evidence}</span>
          </div>

          <div
            class="bf-criterion-points ${
              item.points === item.maxPoints
                ? "full"
                : item.points === 0
                  ? "zero"
                  : ""
            }"
          >
            ${item.points}/${item.maxPoints}
          </div>
        </div>
      `)
      .join("");

    section.innerHTML = `
      <div class="bf-methodology-head">
        <div>
          <div class="bf-kicker">
            METODOLOGIA ${rating.methodologyVersion}
          </div>
          <h3>Com es calcula el Bike Friendly Index</h3>
        </div>

        <button
          type="button"
          class="bf-close-button"
          id="bikeFriendlyCloseBtn"
          aria-label="Tancar"
        >
          &times;
        </button>
      </div>

      <p class="bf-methodology-intro">
        L'\u00edndex valora serveis objectius que fan una estada
        m\u00e9s \u00fatil per a una persona que viatja amb bicicleta.
        La verificaci\u00f3 de l'establiment es puntua separadament
        dels serveis publicats.
      </p>

      <div class="bf-criteria-list">
        ${rows}
      </div>

      <div class="bf-methodology-note">
        Una puntuaci\u00f3 alta no implica cap relaci\u00f3 comercial
        amb Bicipark. Les dades poden provenir de fonts p\u00fabliques
        fins que l'establiment les verifiqui.
      </div>
    `;

    return section;
  }

  async function insertUi() {
    if (
      document.querySelector(
        ".bike-friendly-score-card"
      )
    ) {
      return;
    }

    if (
      !window.BiciparkBikeBases ||
      !window.BiciparkBikeFriendly
    ) {
      console.warn(
        "Bike Friendly: motor de dades no disponible."
      );
      return;
    }

    try {
      const base =
        await window.BiciparkBikeBases.loadBase(
          "camping-izarpe"
        );

      const rating =
        window.BiciparkBikeFriendly.calculate(
          base
        );

      const servicesSection =
        Array.from(
          document.querySelectorAll(
            ".sidebar section"
          )
        ).find(section => {
          const text =
            section.textContent || "";

          return text.includes(
            "Serveis per al ciclista"
          );
        });

      const introCard =
        document.querySelector(
          ".intro-card"
        );

      const sidebar =
        document.querySelector(
          ".sidebar"
        );

      if (!sidebar) {
        return;
      }

      const scoreCard =
        createRatingCard(rating);

      if (introCard) {
        introCard.insertAdjacentElement(
          "afterend",
          scoreCard
        );
      } else {
        sidebar.prepend(scoreCard);
      }

      const methodology =
        createDetailsSection(rating);

      if (servicesSection) {
        servicesSection.insertAdjacentElement(
          "afterend",
          methodology
        );
      } else {
        sidebar.appendChild(
          methodology
        );
      }

      const openBtn =
        document.getElementById(
          "bikeFriendlyDetailsBtn"
        );

      const closeBtn =
        document.getElementById(
          "bikeFriendlyCloseBtn"
        );

      if (openBtn) {
        openBtn.addEventListener(
          "click",
          () => {
            methodology.hidden =
              !methodology.hidden;

            openBtn.textContent =
              methodology.hidden
                ? "Veure com es calcula"
                : "Amagar metodologia";
          }
        );
      }

      if (closeBtn) {
        closeBtn.addEventListener(
          "click",
          () => {
            methodology.hidden = true;

            if (openBtn) {
              openBtn.textContent =
                "Veure com es calcula";
            }
          }
        );
      }
    } catch (error) {
      console.error(
        "Bike Friendly:",
        error
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      insertUi
    );
  } else {
    insertUi();
  }
})();