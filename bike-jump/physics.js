export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

export function easeInCubic(progress) {
  return progress * progress * progress;
}

export function normalizeAngle(angle) {
  let result = angle;

  while (result > Math.PI) {
    result -= Math.PI * 2;
  }

  while (result < -Math.PI) {
    result += Math.PI * 2;
  }

  return result;
}

export function getInrunPosition(level, progress) {
  const eased = easeInCubic(clamp(progress, 0, 1));

  const x = lerp(
    level.startPoint.x,
    level.takeoffPoint.x,
    eased
  );

  const y =
    lerp(
      level.startPoint.y,
      level.takeoffPoint.y,
      eased
    ) +
    Math.sin(progress * Math.PI) * 22;

  return {
    x,
    y
  };
}

export function getLandingY(level, x) {
  const deltaX = Math.max(0, x - level.landingStartX);

  return (
    level.landingStartY +
    deltaX * level.landingSlope +
    deltaX * deltaX * level.landingCurve
  );
}

export function getLandingAngle(level, x) {
  const deltaX = Math.max(0, x - level.landingStartX);
  const derivative =
    level.landingSlope +
    2 * level.landingCurve * deltaX;

  return Math.atan(derivative);
}

export function calculateTakeoffAccuracy(level, progress) {
  const difference = Math.abs(
    progress - level.idealTakeoffProgress
  );

  return clamp(
    1 - difference / level.takeoffTolerance,
    0.18,
    1
  );
}

export function launchBike({
  level,
  progress,
  power,
  wind
}) {
  const takeoffAccuracy =
    calculateTakeoffAccuracy(level, progress);

  const effectivePower =
    (0.72 + power * 0.38) *
    (0.48 + takeoffAccuracy * 0.52);

  const baseSpeed = 315 * effectivePower;
  const launchAngle = -0.47;

  return {
    takeoffAccuracy,
    velocityX:
      Math.cos(launchAngle) * baseSpeed +
      wind * 2.4,
    velocityY:
      Math.sin(launchAngle) * baseSpeed,
    rotation: 0.34,
    angularVelocity: 0
  };
}

export function integrateFlight({
  bike,
  level,
  deltaSeconds,
  rotationInput,
  wind
}) {
  const rotationAcceleration = 2.85;
  const damping = 0.975;

  bike.angularVelocity +=
    rotationInput *
    rotationAcceleration *
    deltaSeconds;

  bike.angularVelocity *= Math.pow(
    damping,
    deltaSeconds * 60
  );

  bike.rotation += bike.angularVelocity * deltaSeconds;

  const dragX =
    bike.velocityX *
    level.airResistance *
    deltaSeconds;

  bike.velocityX +=
    wind * 0.42 * deltaSeconds -
    dragX;

  bike.velocityY +=
    level.gravity * deltaSeconds;

  bike.x += bike.velocityX * deltaSeconds;
  bike.y += bike.velocityY * deltaSeconds;

  bike.controlEffort +=
    Math.abs(rotationInput) *
    deltaSeconds;

  bike.flightTime += deltaSeconds;
}

export function evaluateLanding({
  bike,
  level
}) {
  const slopeAngle = getLandingAngle(level, bike.x);
  const normalizedBikeAngle = normalizeAngle(bike.rotation);
  const angleDifference = Math.abs(
    normalizeAngle(normalizedBikeAngle - slopeAngle)
  );

  let label;
  let score;
  let crashed;

  if (angleDifference < 0.10) {
    label = "Aterratge perfecte";
    score = 2000;
    crashed = false;
  } else if (angleDifference < 0.23) {
    label = "Bon aterratge";
    score = 1450;
    crashed = false;
  } else if (angleDifference < 0.42) {
    label = "Aterratge inestable";
    score = 650;
    crashed = false;
  } else {
    label = "Caiguda";
    score = 0;
    crashed = true;
  }

  return {
    slopeAngle,
    angleDifference,
    label,
    score,
    crashed
  };
}
