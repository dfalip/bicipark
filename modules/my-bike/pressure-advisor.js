(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiciParkPressureAdvisor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REQUIRED = [
    ["riderWeightKg", "riderWeight"],
    ["bikeWeightKg", "bikeWeight"],
    ["tireWidthMm", "tireWidth"],
    ["wheelSize", "wheelSize"],
    ["tireType", "tireType"],
    ["pressureSurface", "surface"],
    ["pressureSpeed", "speed"],
    ["frontWeightPct", "frontWeight"],
    ["rimType", "rimType"],
    ["manufacturerMaxBar", "manufacturerMax"]
  ];

  function numeric(value) {
    if (value == null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function present(value) {
    return value != null && String(value).trim() !== "";
  }

  function systemWeightKg(bike) {
    const rider = numeric(bike?.riderWeightKg);
    const bikeWeight = numeric(bike?.bikeWeightKg);
    const cargo = numeric(bike?.cargoKg) ?? 0;
    if (rider == null || bikeWeight == null) return null;
    return Math.round((rider + bikeWeight + cargo) * 10) / 10;
  }

  function analyze(bike) {
    const missing = REQUIRED.filter(([field]) => !present(bike?.[field])).map(([, label]) => label);
    const complete = REQUIRED.length - missing.length;
    const readiness = Math.round((complete / REQUIRED.length) * 100);
    const front = numeric(bike?.frontWeightPct);
    const maxBar = numeric(bike?.manufacturerMaxBar);
    const warnings = [];

    if (front != null && (front < 35 || front > 60)) warnings.push("frontWeightOutOfRange");
    if (maxBar != null && maxBar <= 0) warnings.push("manufacturerMaxInvalid");
    if (String(bike?.rimType || "").toLowerCase() === "hookless" && maxBar == null) warnings.push("hooklessNeedsMax");

    return {
      readiness,
      complete: missing.length === 0 && warnings.length === 0,
      missing,
      warnings,
      systemWeightKg: systemWeightKg(bike)
    };
  }

  function setupSummary(bike) {
    const result = analyze(bike);
    return {
      systemWeightKg: result.systemWeightKg,
      tireWidthMm: numeric(bike?.tireWidthMm),
      wheelSize: bike?.wheelSize || null,
      tireType: bike?.tireType || null,
      surface: bike?.pressureSurface || null,
      speed: bike?.pressureSpeed || null,
      frontWeightPct: numeric(bike?.frontWeightPct),
      rearWeightPct: numeric(bike?.frontWeightPct) == null ? null : Math.round((100 - numeric(bike.frontWeightPct)) * 10) / 10,
      rimType: bike?.rimType || null,
      manufacturerMaxBar: numeric(bike?.manufacturerMaxBar)
    };
  }

  return { analyze, setupSummary, systemWeightKg };
});
