"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {audit} = require("../tools/audit-route-base-provenance.cjs");

test("provenance audit reports legacy catalog gaps without changing data", () => {
  const routePath = path.resolve(__dirname, "../data/rutes.json");
  const basePath = path.resolve(__dirname, "../bike-bases/data/bike-bases.json");
  const before = [fs.readFileSync(routePath), fs.readFileSync(basePath)];
  const result = audit();
  assert.equal(result.routeCount, JSON.parse(before[0]).length);
  assert.equal(result.baseCount, JSON.parse(before[1]).bases.length);
  assert.ok(Array.isArray(result.findings));
  for (const finding of result.findings) {
    assert.equal(typeof finding.kind, "string");
    assert.equal(typeof finding.id, "string");
  }
  assert.ok(result.findings.some(f => f.kind === "route-provenance-incomplete"),
    "legacy routes must not silently become verified");
  assert.deepEqual(fs.readFileSync(routePath), before[0]);
  assert.deepEqual(fs.readFileSync(basePath), before[1]);
});

test("audit flags invalid geometries, duplicate IDs and unsupported metadata in isolated fixtures", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bicipark-audit-"));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.mkdirSync(path.join(root, "data/rutes"), {recursive:true});
  fs.mkdirSync(path.join(root, "bike-bases/data"), {recursive:true});
  fs.writeFileSync(path.join(root, "data/rutes/bad.geojson"), JSON.stringify({
    type:"LineString", coordinates:[[2.1,41.3],[181,41.4]]
  }));
  fs.writeFileSync(path.join(root, "data/rutes.json"), JSON.stringify([
    {id:"test-route",fitxer:"data/rutes/bad.geojson",seguretat:95,qualitat:90},
    {id:"test-route",fitxer:"../outside.geojson"}
  ]));
  fs.writeFileSync(path.join(root, "bike-bases/data/bike-bases.json"), JSON.stringify({
    bases:[
      {id:"test-base",lat:91,lng:2,verified:true,status:"public-unverified"},
      {id:"test-base",lat:41,lng:2}
    ]
  }));
  const result = audit(root);
  const kinds = new Set(result.findings.map(f => f.kind));
  for (const kind of [
    "duplicate-route-id", "route-provenance-incomplete",
    "route-safety-score-unsubstantiated", "route-quality-score-unsubstantiated",
    "route-geometry-invalid-or-not-line", "route-geometry-file-missing-or-unsafe",
    "duplicate-base-id", "invalid-base-coordinates",
    "base-provenance-incomplete", "base-verification-contradiction"
  ]) assert.ok(kinds.has(kind), "expected finding: " + kind);
  assert.equal(result.routeCount, 2);
  assert.equal(result.baseCount, 2);
});
