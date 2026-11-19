"use strict";
// Read-only quality gate: reports gaps; never treats missing provenance as verified.
const fs = require("node:fs");
const path = require("node:path");
function audit(root = path.resolve(__dirname, "..")) {
  const routes = JSON.parse(fs.readFileSync(path.join(root, "data/rutes.json"), "utf8"));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "bike-bases/data/bike-bases.json"), "utf8"));
  const findings = [];
  const seen = new Set();
  for (const route of routes) {
    if (seen.has(route.id)) findings.push({kind:"duplicate-route-id", id:route.id});
    seen.add(route.id);
    if (!route.sourceUrl || !route.license || !route.checkedAt)
      findings.push({kind:"route-provenance-incomplete", id:route.id});
    if (route.seguretat != null && !route.safetyEvidence)
      findings.push({kind:"route-safety-score-unsubstantiated", id:route.id});
    if (route.qualitat != null && !route.qualityEvidence)
      findings.push({kind:"route-quality-score-unsubstantiated", id:route.id});
    if (typeof route.fitxer !== "string" || !fs.existsSync(path.join(root,route.fitxer)))
      findings.push({kind:"route-geometry-file-missing", id:route.id});
  }
  const bases = new Set();
  for (const base of catalog.bases) {
    if (bases.has(base.id)) findings.push({kind:"duplicate-base-id",id:base.id});
    bases.add(base.id);
    if (!Number.isFinite(base.lat) || Math.abs(base.lat)>90 || !Number.isFinite(base.lng) || Math.abs(base.lng)>180)
      findings.push({kind:"invalid-base-coordinates",id:base.id});
    if (!base.sourceUrl || !base.license || !base.checkedAt)
      findings.push({kind:"base-provenance-incomplete",id:base.id});
    if (base.verified === true && base.status === "public-unverified")
      findings.push({kind:"base-verification-contradiction",id:base.id});
  }
  return {routeCount:routes.length,baseCount:catalog.bases.length,findings};
}
if (require.main === module) console.log(JSON.stringify(audit(),null,2));
module.exports = {audit};
