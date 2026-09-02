(() => {
  "use strict";

  function walkText(root, callback) {
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    var nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(callback);
  }

  function replaceExactText(root, from, to) {
    walkText(root, function(node) {
      if (node.nodeValue.trim() === from) {
        node.nodeValue = node.nodeValue.replace(from, to);
      }
    });
  }

  function findHeadingByText(text) {
    var headings = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,strong")
    );

    return headings.find(function(el) {
      return el.textContent.trim() === text;
    });
  }

  function nearestSection(el) {
    if (!el) return null;

    return (
      el.closest("section,article,.card,.panel,.box") ||
      el.parentElement
    );
  }

  function fixBase(baseId) {
    var groups = window.BICIPARK_BASE_ROUTES || {};
    var data = groups[baseId];

    if (!data) return;

    var modalityHeading = findHeadingByText("Modalitats");

    if (modalityHeading) {
      modalityHeading.textContent = data.contextLabel;
    } else {
      replaceExactText(
        document.body,
        "Modalitats",
        data.contextLabel
      );
    }

    var fromBaseHeading =
      findHeadingByText("Des d'aquesta Bike Base");

    if (!fromBaseHeading) {
      fromBaseHeading =
        findHeadingByText("Des d\u2019aquesta Bike Base");
    }

    var section = nearestSection(fromBaseHeading);

    if (section) {
      var paragraphs =
        section.querySelectorAll("p");

      if (paragraphs.length) {
        paragraphs[0].textContent = data.intro;
      }

      var oldAction =
        Array.from(
          section.querySelectorAll("a,button,div,span")
        ).find(function(el) {
          return /proper pas/i.test(el.textContent || "");
        });

      if (oldAction) {
        var a = document.createElement("a");

        a.href = "#bicipark-curated-routes";
        a.className = oldAction.className || "";
        a.textContent = "Veure les 3 rutes \u2193";

        oldAction.replaceWith(a);
      }
    }

    walkText(document.body, function(node) {
      var t = node.nodeValue || "";

      if (
        /Bicipark les pot incorporar m[e\u00e9]s endavant/i.test(t)
      ) {
        node.nodeValue =
          "Bicipark ja ha integrat 3 rutes reals per descobrir l\u2019entorn.";
      }
    });
  }

  function boot() {
    var id =
      new URLSearchParams(window.location.search)
        .get("id");

    if (!id) return;

    var tries = 0;

    var timer = window.setInterval(function() {
      tries += 1;

      if (
        document.getElementById("bicipark-curated-routes")
      ) {
        fixBase(id);
        window.clearInterval(timer);
        return;
      }

      if (tries >= 40) {
        fixBase(id);
        window.clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();