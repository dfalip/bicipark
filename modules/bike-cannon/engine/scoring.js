(() => {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function scoreLanding(
    flightDistance,
    targetDistance
  ) {
    const flight =
      Number(flightDistance) || 0;

    const target =
      Math.max(
        1,
        Number(targetDistance) || 1
      );

    const error =
      Math.abs(
        flight - target
      );

    const accuracy =
      clamp(
        1 - error / target,
        0,
        1
      );

    const accuracyPoints =
      Math.round(
        accuracy * 2000
      );

    const distancePoints =
      Math.round(
        Math.min(
          1000,
          flight * 2
        )
      );

    let bonus = 0;
    let label =
      "Aterratge salvatge";

    const ratio =
      error / target;

    if (ratio <= .03) {
      bonus = 2500;
      label = "BULLSEYE!";
    } else if (ratio <= .08) {
      bonus = 1400;
      label = "Aterratge perfecte";
    } else if (ratio <= .18) {
      bonus = 700;
      label = "Molt a prop";
    } else if (ratio <= .35) {
      bonus = 250;
      label = "Bona aproximacio";
    }

    return {
      score:
        accuracyPoints +
        distancePoints +
        bonus,
      errorKm:
        error,
      accuracy:
        Math.round(
          accuracy * 100
        ),
      bonus,
      label
    };
  }

  window.BiciParkBikeCannonScoring = {
    scoreLanding
  };
})();