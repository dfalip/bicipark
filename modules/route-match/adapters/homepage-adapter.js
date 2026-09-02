(() => {
  "use strict";

  if (window.__BICIPARK_ROUTE_MATCH_HOME_ADAPTER__) return;
  window.__BICIPARK_ROUTE_MATCH_HOME_ADAPTER__ = true;

  const current =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /route-match\/adapters\/homepage-adapter\.js/.test(script.src)
    );

  if (!current?.src) return;

  const moduleUrl =
    new URL("../", current.src).href;

  const mockupUrl =
    new URL(
      "../assets/route-match-approved-mockup.png",
      current.src
    ).href;

  function createCard() {
    const section =
      document.createElement("section");

    section.id =
      "bp-route-match-home-card";

    section.className =
      "bp-rm-home-card";

    section.innerHTML =
      '<div class="bp-rm-home-copy">' +
        '<span class="bp-rm-home-eyebrow">🎯 Pla ciclista personal</span>' +
        '<h2>Troba la ruta que millor s’adapta a tu</h2>' +
        '<p>BiciPark combina el teu nivell, objectius i temps disponible per recomanar-te rutes i, si vols millorar, preparar-te un pla bàsic d’exercicis compatible amb les teves sortides.</p>' +
        '<div class="bp-rm-home-actions">' +
          '<a class="bp-rm-home-primary" href="' +
            moduleUrl +
            '">Crea el meu pla ciclista →</a>' +
          '<a class="bp-rm-home-secondary" href="' +
            moduleUrl +
            '">Veure com funciona</a>' +
        '</div>' +
      '</div>' +
      '<a class="bp-rm-home-media" href="' +
        moduleUrl +
        '" aria-label="Obrir Pla ciclista personal">' +
        '<img src="' +
          mockupUrl +
          '" alt="Vista del Pla ciclista personal BiciPark">' +
      '</a>';

    return section;
  }

  function insert() {
    if (
      document.getElementById(
        "bp-route-match-home-card"
      )
    ) {
      return;
    }

    const card =
      createCard();

    const target =
      document.querySelector(
        "#allotjaments, [id*='allotjament'], footer"
      );

    if (target) {
      target.insertAdjacentElement(
        "beforebegin",
        card
      );

      return;
    }

    const main =
      document.querySelector("main");

    if (main) {
      main.appendChild(card);
    } else {
      document.body.appendChild(card);
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      insert
    );
  } else {
    insert();
  }
})();