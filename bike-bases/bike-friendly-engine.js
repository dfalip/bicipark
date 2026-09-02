(() => {
  "use strict";

  const ICONS = {
    storage: "&#128274;",
    repair: "&#128295;",
    wash: "&#128703;",
    rental: "&#9889;",
    routes: "&#128690;",
    diversity: "&#128506;",
    services: "&#127869;",
    verified: "&#10003;"
  };

  function calculate(base) {
    const source =
      base &&
      base.bikeFriendly &&
      base.bikeFriendly.criteria
        ? base.bikeFriendly.criteria
        : {};

    const criteria =
      Object.entries(source).map(
        ([key, item]) => {
          const maxPoints =
            Number(item.weight) || 0;

          const points =
            item.available
              ? maxPoints
              : 0;

          return {
            key,
            icon:
              ICONS[key] || "&#8226;",
            label:
              item.label || key,
            points,
            maxPoints,
            evidence:
              item.evidence || ""
          };
        }
      );

    const score =
      criteria.reduce(
        (sum, item) =>
          sum + item.points,
        0
      );

    const maxScore =
      criteria.reduce(
        (sum, item) =>
          sum + item.maxPoints,
        0
      );

    let level =
      "Base ciclista limitada";

    if (score >= 80) {
      level =
        "Excel\u00b7lent base ciclista";
    } else if (score >= 60) {
      level =
        "Bona base ciclista";
    } else if (score >= 40) {
      level =
        "Base ciclista funcional";
    }

    return {
      baseId: base.id,
      score,
      maxScore,
      level,
      status:
        base.status.code,
      statusLabel:
        base.status.label,
      methodologyVersion:
        base.bikeFriendly.methodologyVersion ||
        "1.0",
      criteria
    };
  }

  window.BiciparkBikeFriendly = {
    calculate
  };
})();