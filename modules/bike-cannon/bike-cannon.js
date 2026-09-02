(() => {
  "use strict";

  const selfScript =
    document.currentScript ||
    Array.from(document.scripts)
      .find(script =>
        /bike-cannon\.js/.test(
          script.src
        )
      );

  const baseUrl =
    new URL(
      "./",
      selfScript.src
    );

  const STORAGE_KEY =
    "bicipark.bikeCannon.history.v1";

  const state = {
    canvas: null,
    ctx: null,
    destinations: [],
    target: null,
    mode: "discovery",
    angle: 45,
    power: 65,
    wind: 0,
    flight: null,
    animating: false,
    animationStart: 0,
    currentPoint: null,
    history: [],
    collectibles: [],
    collectedCoins: 0,
    landingFxUntil: 0
  };

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function readHistory() {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          state.history.slice(-20)
        )
      );
    } catch (_) {}
  }

  function randomWind() {
    const direction =
      Math.random() < .5
        ? -1
        : 1;

    return (
      direction *
      (
        4 +
        Math.round(
          Math.random() * 20
        )
      )
    );
  }

  function formatKm(value) {
    const number =
      Number(value) || 0;

    return (
      number < 10
        ? number.toFixed(1)
        : Math.round(number)
    ) + " km";
  }

  function canvasSize() {
    const rect =
      state.canvas
        .getBoundingClientRect();

    return {
      width:
        rect.width,
      height:
        rect.height
    };
  }

  function worldScale() {
    const size =
      canvasSize();

    const worldMaxX = 6000;
    const worldMaxY = 2700;

    const availableWidth =
      Math.max(
        1,
        size.width - 145
      );

    const availableHeight =
      Math.max(
        1,
        size.height * .57
      );

    return {
      x:
        availableWidth /
        worldMaxX,

      y:
        availableHeight /
        worldMaxY,

      worldMaxX,
      worldMaxY
    };
  }

  function cannonGeometry() {
    const size =
      canvasSize();

    const baseX = 80;

    const groundY =
      size.height * .77;

    const pivotY =
      groundY - 33;

    const barrelLength = 80;

    const angleRad =
      state.angle *
      Math.PI / 180;

    const muzzleX =
      baseX +
      Math.cos(
        angleRad
      ) *
      barrelLength;

    const muzzleY =
      pivotY -
      Math.sin(
        angleRad
      ) *
      barrelLength;

    return {
      baseX,
      groundY,
      pivotY,
      barrelLength,
      angleRad,
      muzzleX,
      muzzleY,
      launchRisePx:
        groundY -
        muzzleY
    };
  }

  function visualPoint(point) {
    const scale =
      worldScale();

    const cannon =
      cannonGeometry();

    const progress =
      state.flight
        ? clamp(
            point.t /
            state.flight.totalTime,
            0,
            1
          )
        : 0;

    /*
     * The physics engine starts at y=0.
     * Visually we lift the first frame to the cannon muzzle and
     * progressively blend that offset back to ground level,
     * so the flight starts in the barrel and lands on the ground.
     */
    const launchOffset =
      cannon.launchRisePx *
      (1 - progress);

    return {
      x:
        cannon.muzzleX +
        point.x *
        scale.x,

      y:
        cannon.groundY -
        point.y *
        scale.y -
        launchOffset
    };
  }

  function updateLabels() {
    document.getElementById(
      "angleValue"
    ).textContent =
      state.angle +
      "\u00b0";

    document.getElementById(
      "powerValue"
    ).textContent =
      state.power +
      "%";

    const wind =
      document.getElementById(
        "windValue"
      );

    wind.textContent =
      (
        state.wind >= 0
          ? "\u2192 "
          : "\u2190 "
      ) +
      Math.abs(
        state.wind
      ) +
      " km/h";

    document.getElementById(
      "hudAngle"
    ).textContent =
      "Angle " +
      state.angle +
      "\u00b0";

    document.getElementById(
      "hudPower"
    ).textContent =
      "Potencia " +
      state.power +
      "%";

    document.getElementById(
      "hudWind"
    ).textContent =
      (
        state.wind >= 0
          ? "\u2192 "
          : "\u2190 "
      ) +
      Math.abs(
        state.wind
      ) +
      " km/h";

    const preview =
      window
        .BiciParkBikeCannonPhysics
        ?.simulate({
          angle:
            state.angle,
          power:
            state.power,
          wind:
            state.wind
        });

    const hudDistance =
      document.getElementById(
        "hudDistance"
      );

    if (
      hudDistance &&
      preview
    ) {
      hudDistance.textContent =
        "Previsio " +
        formatKm(
          preview.distanceKm
        );
    }

    updateCoinHud();
  }

  function updateCoinHud() {
    const hudCoins =
      document.getElementById(
        "hudCoins"
      );

    if (!hudCoins) {
      return;
    }

    hudCoins.textContent =
      "BiciCoins " +
      state.collectedCoins +
      "/" +
      state.collectibles.length;
  }

  function chooseTarget() {
    if (!state.destinations.length) {
      return;
    }

    if (
      state.mode ===
      "target"
    ) {
      state.target =
        window
          .BiciParkBikeCannonDestinations
          .random(
            state.destinations
          );
    } else {
      state.target =
        null;
    }

    renderTarget();
  }

  function renderTarget() {
    const root =
      document.getElementById(
        "targetCard"
      );

    if (
      state.mode ===
      "target" &&
      state.target
    ) {
      root.innerHTML =
        "<small>OBJECTIU</small>" +
        "<strong>" +
          state.target.emoji +
          " " +
          state.target.name +
        "</strong>" +
        "<span>" +
          state.target.region +
          " \u00b7 " +
          formatKm(
            state.target.distanceKm
          ) +
        "</span>";
    } else {
      root.innerHTML =
        "<small>MODE DESCOBERTA</small>" +
        "<strong>\ud83c\udfb2 Destinacio sorpresa</strong>" +
        "<span>La distancia del vol decidira quin lloc de BiciPark descobreixes.</span>";
    }
  }

  function resizeCanvas() {
    const rect =
      state.canvas
        .getBoundingClientRect();

    const ratio =
      Math.min(
        2,
        window.devicePixelRatio || 1
      );

    const width =
      Math.max(
        400,
        Math.floor(
          rect.width
        )
      );

    const height =
      Math.max(
        320,
        Math.floor(
          rect.height
        )
      );

    state.canvas.width =
      width * ratio;

    state.canvas.height =
      height * ratio;

    state.ctx.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    drawScene();
  }

  function drawSkyDetails(
    ctx,
    width,
    height
  ) {
    ctx.save();

    ctx.globalAlpha = .6;
    ctx.fillStyle =
      "#ffffff";

    [
      [width * .24, 90, 48],
      [width * .55, 65, 36],
      [width * .80, 125, 55]
    ].forEach(cloud => {
      const [x, y, r] =
        cloud;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        r * .45,
        0,
        Math.PI * 2
      );

      ctx.arc(
        x + r * .35,
        y - r * .1,
        r * .33,
        0,
        Math.PI * 2
      );

      ctx.arc(
        x + r * .65,
        y,
        r * .40,
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    ctx.restore();

    ctx.save();

    ctx.strokeStyle =
      "rgba(31,101,67,.16)";

    ctx.lineWidth = 2;

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const x =
        width *
        (
          .35 +
          i * .085
        );

      const base =
        height * .68;

      const mountainHeight =
        45 +
        (
          i % 3
        ) * 22;

      ctx.beginPath();

      ctx.moveTo(
        x - 60,
        base
      );

      ctx.lineTo(
        x,
        base -
        mountainHeight
      );

      ctx.lineTo(
        x + 70,
        base
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCannon(ctx) {
    const cannon =
      cannonGeometry();

    /*
     * Base / carriage
     */
    ctx.save();

    ctx.fillStyle =
      "#36584a";

    ctx.fillRect(
      cannon.baseX - 26,
      cannon.groundY - 32,
      52,
      18
    );

    ctx.fillStyle =
      "#183328";

    ctx.beginPath();

    ctx.arc(
      cannon.baseX - 18,
      cannon.groundY - 7,
      12,
      0,
      Math.PI * 2
    );

    ctx.arc(
      cannon.baseX + 18,
      cannon.groundY - 7,
      12,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    /*
     * Loaded bicycle:
     * draw it BEFORE the cannon barrel so the barrel masks the
     * part that is supposed to be inside.
     *
     * The bike centre is slightly beyond the muzzle. The back
     * half therefore remains hidden by the barrel while only
     * the front portion is visible.
     */
    if (!state.flight) {
      ctx.save();

      ctx.translate(
        cannon.baseX,
        cannon.pivotY
      );

      ctx.rotate(
        -cannon.angleRad
      );

      ctx.font =
        "30px sans-serif";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        "\ud83d\udeb2",
        76,
        0
      );

      ctx.restore();
    }

    /*
     * Barrel is drawn AFTER the loaded bike, masking the part
     * that sits inside the cannon.
     */
    ctx.save();

    ctx.translate(
      cannon.baseX,
      cannon.pivotY
    );

    ctx.rotate(
      -cannon.angleRad
    );

    ctx.fillStyle =
      "#117446";

    ctx.fillRect(
      0,
      -9,
      72,
      18
    );

    /*
     * Thicker muzzle section.
     */
    ctx.fillStyle =
      "#0b5735";

    ctx.fillRect(
      58,
      -12,
      22,
      24
    );

    /*
     * Dark muzzle lip to create depth.
     */
    ctx.fillStyle =
      "#163d2d";

    ctx.fillRect(
      76,
      -13,
      5,
      26
    );

    /*
     * Small highlight on top of the barrel.
     */
    ctx.fillStyle =
      "rgba(255,255,255,.18)";

    ctx.fillRect(
      8,
      -7,
      57,
      3
    );

    ctx.restore();
  }

  function drawLaunchFlash(ctx) {
    if (
      !state.animating ||
      !state.currentPoint ||
      !state.flight
    ) {
      return;
    }

    const progress =
      state.currentPoint.t /
      state.flight.totalTime;

    if (progress > .13) {
      return;
    }

    const cannon =
      cannonGeometry();

    const alpha =
      1 -
      progress / .13;

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      "#ffb11b";

    ctx.beginPath();

    ctx.arc(
      cannon.muzzleX,
      cannon.muzzleY,
      16 +
      progress * 18,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
      "#ffffff";

    ctx.beginPath();

    ctx.arc(
      cannon.muzzleX,
      cannon.muzzleY,
      7,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  function drawTrajectory(ctx) {
    if (!state.flight) {
      return;
    }

    ctx.save();

    ctx.strokeStyle =
      "rgba(17,116,70,.34)";

    ctx.lineWidth = 2;

    ctx.setLineDash(
      [7, 7]
    );

    ctx.beginPath();

    state.flight.points
      .forEach((point, index) => {
        const visual =
          visualPoint(point);

        if (index === 0) {
          ctx.moveTo(
            visual.x,
            visual.y
          );
        } else {
          ctx.lineTo(
            visual.x,
            visual.y
          );
        }
      });

    ctx.stroke();
    ctx.restore();
  }

  function createCollectibles() {
    state.collectibles = [];
    state.collectedCoins = 0;

    if (!state.flight) {
      updateCoinHud();
      return;
    }

    const positions =
      [.28, .52, .73];

    positions.forEach(
      (progress, index) => {
        const point =
          pointAtProgress(
            state.flight,
            progress
          );

        state.collectibles.push({
          id:
            "coin-" +
            index,

          x:
            point.x +
            (
              Math.random() *
              120 -
              60
            ),

          y:
            Math.max(
              0,
              point.y +
              (
                Math.random() *
                130 -
                45
              )
            ),

          t:
            point.t,

          collected:
            false
        });
      }
    );

    updateCoinHud();
  }

  function drawCollectibles(ctx) {
    if (
      !state.flight ||
      !state.collectibles.length
    ) {
      return;
    }

    state.collectibles
      .forEach(coin => {
        if (coin.collected) {
          return;
        }

        const visual =
          visualPoint(coin);

        ctx.save();

        ctx.translate(
          visual.x,
          visual.y
        );

        ctx.fillStyle =
          "#f5b72d";

        ctx.strokeStyle =
          "#ffffff";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
          0,
          0,
          11,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          "#ffffff";

        ctx.font =
          "700 12px sans-serif";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "\u2605",
          0,
          1
        );

        ctx.restore();
      });
  }

  function checkCollectibles(point) {
    if (
      !point ||
      !state.collectibles.length
    ) {
      return;
    }

    let changed = false;

    state.collectibles
      .forEach(coin => {
        if (coin.collected) {
          return;
        }

        const dx =
          point.x -
          coin.x;

        const dy =
          point.y -
          coin.y;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        if (distance <= 180) {
          coin.collected =
            true;

          state.collectedCoins++;
          changed = true;
        }
      });

    if (changed) {
      updateCoinHud();
    }
  }

  function bikeRotation(point) {
    if (!state.flight) {
      return 0;
    }

    const progress =
      clamp(
        point.t /
        state.flight.totalTime,
        0,
        1
      );

    const index =
      clamp(
        Math.round(
          progress *
          (
            state.flight.points.length - 1
          )
        ),
        0,
        state.flight.points.length - 1
      );

    const previous =
      state.flight.points[
        Math.max(
          0,
          index - 1
        )
      ];

    const next =
      state.flight.points[
        Math.min(
          state.flight.points.length - 1,
          index + 1
        )
      ];

    const a =
      visualPoint(previous);

    const b =
      visualPoint(next);

    const tangent =
      Math.atan2(
        b.y - a.y,
        b.x - a.x
      );

    /*
     * Small arcade spin, but the bike primarily follows
     * the tangent of the flight.
     */
    return (
      tangent +
      progress *
      Math.PI *
      .55
    );
  }

  function drawBike(
    ctx,
    point
  ) {
    if (!point) {
      return;
    }

    const visual =
      visualPoint(point);

    ctx.save();

    ctx.translate(
      visual.x,
      visual.y
    );

    ctx.rotate(
      bikeRotation(point)
    );

    ctx.font =
      "30px sans-serif";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      "\ud83d\udeb2",
      0,
      0
    );

    ctx.restore();
  }

  function targetScreenX() {
    if (
      state.mode !==
      "target" ||
      !state.target
    ) {
      return null;
    }

    const cannon =
      cannonGeometry();

    const scale =
      worldScale();

    const worldX =
      Number(
        state.target.distanceKm
      ) /
      .075;

    return (
      cannon.muzzleX +
      worldX *
      scale.x
    );
  }

  function drawTargetFlag(ctx) {
    const rawX =
      targetScreenX();

    if (rawX == null) {
      return;
    }

    const size =
      canvasSize();

    const cannon =
      cannonGeometry();

    const x =
      clamp(
        rawX,
        55,
        size.width - 42
      );

    ctx.save();

    ctx.strokeStyle =
      "#9a6108";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
      x,
      cannon.groundY - 86
    );

    ctx.lineTo(
      x,
      cannon.groundY
    );

    ctx.stroke();

    ctx.fillStyle =
      "#f5b72d";

    ctx.beginPath();

    ctx.moveTo(
      x,
      cannon.groundY - 86
    );

    ctx.lineTo(
      x + 42,
      cannon.groundY - 70
    );

    ctx.lineTo(
      x,
      cannon.groundY - 55
    );

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle =
      "#6e4b0d";

    ctx.font =
      "700 10px sans-serif";

    ctx.textAlign =
      rawX >
      size.width - 100
        ? "right"
        : "left";

    const textX =
      rawX >
      size.width - 100
        ? x - 7
        : x + 7;

    ctx.fillText(
      state.target.emoji +
      " " +
      formatKm(
        state.target.distanceKm
      ),
      textX,
      cannon.groundY - 94
    );

    ctx.restore();
  }

  function landingScreenX() {
    if (!state.flight) {
      return null;
    }

    const lastPoint =
      state.flight.points[
        state.flight.points.length - 1
      ];

    return visualPoint(
      lastPoint
    ).x;
  }

  function drawLandingFlag(
    ctx,
    distanceKm
  ) {
    if (
      !distanceKm ||
      !state.flight
    ) {
      return;
    }

    const size =
      canvasSize();

    const cannon =
      cannonGeometry();

    const rawX =
      landingScreenX();

    const x =
      clamp(
        rawX,
        55,
        size.width - 45
      );

    ctx.save();

    ctx.strokeStyle =
      "#183328";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
      x,
      cannon.groundY - 62
    );

    ctx.lineTo(
      x,
      cannon.groundY
    );

    ctx.stroke();

    ctx.fillStyle =
      "#d48213";

    ctx.beginPath();

    ctx.moveTo(
      x,
      cannon.groundY - 62
    );

    ctx.lineTo(
      x + 35,
      cannon.groundY - 50
    );

    ctx.lineTo(
      x,
      cannon.groundY - 38
    );

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle =
      "#183328";

    ctx.font =
      "700 11px sans-serif";

    ctx.textAlign =
      rawX >
      size.width - 110
        ? "right"
        : "left";

    ctx.fillText(
      formatKm(
        distanceKm
      ),
      rawX >
      size.width - 110
        ? x - 8
        : x + 8,
      cannon.groundY - 45
    );

    ctx.restore();
  }

  function drawLandingDust(ctx) {
    if (
      !state.flight ||
      state.animating
    ) {
      return;
    }

    const x =
      landingScreenX();

    if (x == null) {
      return;
    }

    const cannon =
      cannonGeometry();

    ctx.save();

    ctx.fillStyle =
      "rgba(143,119,82,.22)";

    [
      [-18, -2, 10],
      [-5, -8, 13],
      [11, -5, 9],
      [24, -1, 7]
    ].forEach(puff => {
      ctx.beginPath();

      ctx.arc(
        x + puff[0],
        cannon.groundY + puff[1],
        puff[2],
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    ctx.restore();
  }

  function drawScene() {
    if (!state.ctx) {
      return;
    }

    const ctx =
      state.ctx;

    const size =
      canvasSize();

    ctx.clearRect(
      0,
      0,
      size.width,
      size.height
    );

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        size.height
      );

    gradient.addColorStop(
      0,
      "#dff4fb"
    );

    gradient.addColorStop(
      .68,
      "#eff9fb"
    );

    gradient.addColorStop(
      .681,
      "#dbe8d6"
    );

    gradient.addColorStop(
      1,
      "#c9dbc1"
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      size.width,
      size.height
    );

    drawSkyDetails(
      ctx,
      size.width,
      size.height
    );

    const cannon =
      cannonGeometry();

    ctx.strokeStyle =
      "#8aa780";

    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(
      0,
      cannon.groundY
    );

    ctx.lineTo(
      size.width,
      cannon.groundY
    );

    ctx.stroke();

    drawTargetFlag(ctx);
    drawCannon(ctx);
    drawTrajectory(ctx);
    drawCollectibles(ctx);
    drawLaunchFlash(ctx);

    if (
      state.flight &&
      state.currentPoint
    ) {
      drawBike(
        ctx,
        state.currentPoint
      );
    }

    if (
      state.flight &&
      !state.animating
    ) {
      drawLandingDust(ctx);

      drawLandingFlag(
        ctx,
        state.flight.distanceKm
      );
    }
  }

  function pointAtProgress(
    flight,
    progress
  ) {
    const index =
      clamp(
        Math.floor(
          progress *
          (
            flight.points.length - 1
          )
        ),
        0,
        flight.points.length - 1
      );

    return flight.points[
      index
    ];
  }

  function animateFlight(timestamp) {
    if (!state.animating) {
      return;
    }

    if (!state.animationStart) {
      state.animationStart =
        timestamp;
    }

    const elapsed =
      timestamp -
      state.animationStart;

    const duration =
      2100;

    const progress =
      clamp(
        elapsed / duration,
        0,
        1
      );

    state.currentPoint =
      pointAtProgress(
        state.flight,
        progress
      );

    checkCollectibles(
      state.currentPoint
    );

    drawScene();

    if (progress < 1) {
      requestAnimationFrame(
        animateFlight
      );
    } else {
      state.animating =
        false;

      state.currentPoint =
        state.flight.points[
          state.flight.points.length - 1
        ];

      state.landingFxUntil =
        performance.now() +
        700;

      drawScene();
      finishFlight();
    }
  }

  function resultDestination() {
    if (
      state.mode ===
      "target" &&
      state.target
    ) {
      return state.target;
    }

    return window
      .BiciParkBikeCannonDestinations
      .closestByDistance(
        state.destinations,
        state.flight.distanceKm
      );
  }

  function finishFlight() {
    const destination =
      resultDestination();

    if (!destination) {
      return;
    }

    const targetDistance =
      Number(
        destination.distanceKm
      ) || 1;

    const result =
      window
        .BiciParkBikeCannonScoring
        .scoreLanding(
          state.flight.distanceKm,
          targetDistance
        );

    const allCoins =
      state.collectibles.length > 0 &&
      state.collectedCoins ===
      state.collectibles.length;

    const coinBonus =
      state.collectedCoins *
      250 +
      (
        allCoins
          ? 500
          : 0
      );

    result.coinBonus =
      coinBonus;

    result.coins =
      state.collectedCoins;

    result.totalCoins =
      state.collectibles.length;

    result.score +=
      coinBonus;

    renderResult(
      destination,
      result
    );

    state.history.push({
      name:
        destination.name,
      score:
        result.score,
      distanceKm:
        state.flight.distanceKm,
      label:
        result.label,
      coins:
        state.collectedCoins,
      at:
        new Date().toISOString()
    });

    saveHistory();
    renderHistory();

    document.getElementById(
      "launchButton"
    ).disabled =
      false;
  }

  function renderResult(
    destination,
    result
  ) {
    const root =
      document.getElementById(
        "resultPanel"
      );

    root.innerHTML =
      '<div class="bc-result-card">' +
        '<div class="bc-result-emoji">' +
          destination.emoji +
        "</div>" +
        "<h3>" +
          result.label +
        "</h3>" +
        "<p>Has aterrat prop de <strong>" +
          destination.name +
          "</strong> \u00b7 " +
          destination.region +
          ".</p>" +
        "<p>\u2605 BiciCoins: <strong>" +
          result.coins +
          "/" +
          result.totalCoins +
          "</strong> \u00b7 +" +
          result.coinBonus +
          " punts" +
          (
            result.coins ===
            result.totalCoins &&
            result.totalCoins > 0
              ? " \u00b7 COMBO COMPLET!"
              : ""
          ) +
        "</p>" +
        '<div class="bc-score">' +
          "<div>" +
            "<small>DISTANCIA VOL</small>" +
            "<strong>" +
              formatKm(
                state.flight.distanceKm
              ) +
            "</strong>" +
          "</div>" +
          "<div>" +
            "<small>PRECISIO</small>" +
            "<strong>" +
              result.accuracy +
              "%</strong>" +
          "</div>" +
          "<div>" +
            "<small>ERROR</small>" +
            "<strong>" +
              formatKm(
                result.errorKm
              ) +
            "</strong>" +
          "</div>" +
          "<div>" +
            "<small>PUNTS</small>" +
            "<strong>" +
              result.score +
            "</strong>" +
          "</div>" +
        "</div>" +
        '<a class="bc-link" href="' +
          destination.url +
          '">' +
          "Descobrir aquest lloc" +
        "</a>" +
      "</div>";
  }

  function renderHistory() {
    const root =
      document.getElementById(
        "historyList"
      );

    const recent =
      [...state.history]
        .reverse()
        .slice(0, 6);

    if (!recent.length) {
      root.innerHTML =
        '<div class="bc-result-empty">' +
          "Encara no has fet cap llançament." +
        "</div>";

      return;
    }

    root.innerHTML =
      recent
        .map(item =>
          '<div class="bc-history-item">' +
            "<strong>" +
              item.name +
            "</strong>" +
            " \u00b7 " +
            item.score +
            " punts \u00b7 " +
            formatKm(
              item.distanceKm
            ) +
            (
              Number.isFinite(
                Number(item.coins)
              )
                ? " \u00b7 \u2605 " +
                  item.coins
                : ""
            ) +
          "</div>"
        )
        .join("");
  }

  function resetRound() {
    state.flight =
      null;

    state.currentPoint =
      null;

    state.animating =
      false;

    state.animationStart =
      0;

    state.collectibles =
      [];

    state.collectedCoins =
      0;

    state.wind =
      randomWind();

    chooseTarget();
    updateLabels();

    document.getElementById(
      "resultPanel"
    ).innerHTML =
      '<div class="bc-result-empty">' +
        "Ajusta angle i potencia, mira el vent i dispara. Durant el vol intenta recollir les BiciCoins." +
      "</div>";

    drawScene();
  }

  function launch() {
    if (state.animating) {
      return;
    }

    state.flight =
      window
        .BiciParkBikeCannonPhysics
        .simulate({
          angle:
            state.angle,
          power:
            state.power,
          wind:
            state.wind
        });

    createCollectibles();

    state.animating =
      true;

    state.animationStart =
      0;

    state.currentPoint =
      state.flight.points[0];

    document.getElementById(
      "launchButton"
    ).disabled =
      true;

    requestAnimationFrame(
      animateFlight
    );
  }

  function bindUi() {
    const angle =
      document.getElementById(
        "angleInput"
      );

    const power =
      document.getElementById(
        "powerInput"
      );

    const mode =
      document.getElementById(
        "modeSelect"
      );

    angle.addEventListener(
      "input",
      () => {
        state.angle =
          Number(
            angle.value
          );

        updateLabels();
        drawScene();
      }
    );

    power.addEventListener(
      "input",
      () => {
        state.power =
          Number(
            power.value
          );

        updateLabels();
        drawScene();
      }
    );

    mode.addEventListener(
      "change",
      () => {
        state.mode =
          mode.value;

        resetRound();
      }
    );

    document.getElementById(
      "launchButton"
    ).addEventListener(
      "click",
      launch
    );

    document.getElementById(
      "resetButton"
    ).addEventListener(
      "click",
      resetRound
    );

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(
          window.__bcResizeTimer
        );

        window.__bcResizeTimer =
          window.setTimeout(
            resizeCanvas,
            120
          );
      }
    );
  }

  async function boot() {
    state.canvas =
      document.getElementById(
        "bikeCannonCanvas"
      );

    state.ctx =
      state.canvas.getContext(
        "2d"
      );

    state.history =
      readHistory();

    bindUi();

    try {
      state.destinations =
        await window
          .BiciParkBikeCannonDestinations
          .load(
            baseUrl
          );

      state.wind =
        randomWind();

      chooseTarget();
      updateLabels();
      renderHistory();
      resizeCanvas();

      window.BiciParkBikeCannon = {
        reset:
          resetRound,

        getHistory: () =>
          [...state.history],

        getDestinations: () =>
          [...state.destinations]
      };

      console.info(
        "[Bike Cannon] gameplay v3 ready."
      );
    } catch (error) {
      console.error(
        "[Bike Cannon]",
        error
      );

      document.getElementById(
        "resultPanel"
      ).innerHTML =
        '<div class="bc-result-empty">' +
          "No s'han pogut carregar les destinacions del joc. Revisa la consola del navegador si el problema continua." +
        "</div>";
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();