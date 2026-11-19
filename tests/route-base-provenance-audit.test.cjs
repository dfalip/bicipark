"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {audit} = require("../tools/audit-route-base-provenance.cjs");
test("provenance audit is read-only and reports legacy catalog gaps", () => {
  const result = audit();
  assert.ok(result.routeCount >= 0);
  assert.ok(result.baseCount >= 0);
  assert.ok(Array.isArray(result.findings));
  for (const finding of result.findings) {
    assert.equal(typeof finding.kind, "string");
    assert.equal(typeof finding.id, "string");
  }
  assert.ok(result.findings.some(f => f.kind === "route-provenance-incomplete"),
    "legacy routes must not silently become verified");
});
