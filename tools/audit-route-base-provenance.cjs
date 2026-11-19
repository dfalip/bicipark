"use strict";
// Read-only quality gate: reports gaps; never treats missing provenance as verified.
const fs = require("node:fs");
const path = require("node:path");
function audit(root = path.resolve(__dirname, "..")) {
  const routes = JSON.parse(fs.readFileSync(path.join(root, "data/rutes.json"), "utf8"));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "bike-bases/data/bike-bases.json"), "utf8"));
  const findings = [];
  const seen = new Set();
  const baseCoordinates = new Map();
  for (const route of routes) {
    if (seen.has(route.id)) findings.push({kind:"duplicate-route-id", id:route.id});
    seen.add(route.id);
    if (!route.sourceUrl || !route.license || !route.checkedAt)
      findings.push({kind:"route-provenance-incomplete", id:route.id});
    if (route.seguretat != null && !route.safetyEvidence)
      findings.push({kind:"route-safety-score-unsubstantiated", id:route.id});
    if (route.qualitat != null && !route.qualityEvidence)
      findings.push({kind:"route-quality-score-unsubstantiated", id:route.id});
    const relative = route.fitxer;
    const geometryPath = typeof relative === "string" ? path.resolve(root, relative) : null;
    if (!geometryPath || !geometryPath.startsWith(root + path.sep) || !fs.existsSync(geometryPath))
      findings.push({kind:"route-geometry-file-missing-or-unsafe", id:route.id});
    else {
      try {
        const geo = JSON.parse(fs.readFileSync(geometryPath, "utf8"));
        const features = geo.type === "FeatureCollection" ? geo.features : [geo];
        const lines = [];
        for (const feature of features || []) {
          const geometry = feature.type === "Feature" ? feature.geometry : feature;
          if (geometry?.type === "LineString") lines.push(geometry.coordinates);
          else if (geometry?.type === "MultiLineString") lines.push(...geometry.coordinates);
        }
        if (!lines.length || lines.some(line => !Array.isArray(line) || line.length < 2 ||
          line.some(p => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) ||
            !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)))
          findings.push({kind:"route-geometry-invalid-or-not-line", id:route.id});
      } catch {
        findings.push({kind:"route-geometry-unreadable", id:route.id});
      }
    }
  }
  const bases = new Set();
  for (const base of catalog.bases) {
    if (bases.has(base.id)) findings.push({kind:"duplicate-base-id",id:base.id});
    bases.add(base.id);
    if (!Number.isFinite(base.lat) || Math.abs(base.lat)>90 || !Number.isFinite(base.lng) || Math.abs(base.lng)>180)
      findings.push({kind:"invalid-base-coordinates",id:base.id});
    if (Number.isFinite(base.lat) && Number.isFinite(base.lng)) {
      const key = base.lat.toFixed(6) + "," + base.lng.toFixed(6);
      const previous = baseCoordinates.get(key);
      if (previous && previous !== base.id)
        findings.push({kind:"base-coordinates-duplicate-review",id:base.id,otherId:previous});
      else baseCoordinates.set(key, base.id);
    }
    if (!base.sourceUrl || !base.license || !base.checkedAt)
      findings.push({kind:"base-provenance-incomplete",id:base.id});
    if (base.verified === true && base.status === "public-unverified")
      findings.push({kind:"base-verification-contradiction",id:base.id});
  }
  return {routeCount:routes.length,baseCount:catalog.bases.length,findings};
}
if (require.main === module) console.log(JSON.stringify(audit(),null,2));
module.exports = {audit};
