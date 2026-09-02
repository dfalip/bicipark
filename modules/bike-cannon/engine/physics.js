(() => {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function radians(degrees) {
    return degrees * Math.PI / 180;
  }

  function simulate(options) {
    const angle =
      clamp(
        Number(options.angle) || 45,
        10,
        80
      );

    const power =
      clamp(
        Number(options.power) || 60,
        20,
        100
      );

    const wind =
      clamp(
        Number(options.wind) || 0,
        -35,
        35
      );

    const gravity = 9.81;

    /*
     * Game units. The multiplier deliberately produces
     * long, arcade-style flights instead of real-world ballistics.
     */
    const speed =
      power * 2.25;

    const vx =
      Math.cos(
        radians(angle)
      ) *
      speed +
      wind * .75;

    const vy =
      Math.sin(
        radians(angle)
      ) *
      speed;

    const totalTime =
      Math.max(
        .5,
        2 * vy / gravity
      );

    const points = [];
    const samples = 90;

    let maxHeight = 0;

    for (
      let i = 0;
      i <= samples;
      i++
    ) {
      const t =
        totalTime *
        i /
        samples;

      const x =
        Math.max(
          0,
          vx * t
        );

      const y =
        Math.max(
          0,
          vy * t -
          .5 *
          gravity *
          t *
          t
        );

      maxHeight =
        Math.max(
          maxHeight,
          y
        );

      points.push({
        t,
        x,
        y
      });
    }

    const rawDistance =
      points[
        points.length - 1
      ].x;

    /*
     * Convert arcade physics units into kilometres.
     */
    const distanceKm =
      Math.max(
        0,
        rawDistance * .075
      );

    return {
      angle,
      power,
      wind,
      totalTime,
      maxHeight:
        maxHeight * .018,
      distanceKm,
      points
    };
  }

  window.BiciParkBikeCannonPhysics = {
    simulate
  };
})();