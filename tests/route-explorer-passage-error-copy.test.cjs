const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");
const start = source.indexOf("const COPY = {");
const end = source.indexOf("\nfunction language()", start);
assert.ok(start >= 0 && end > start, "localized passage copy exists");
const copy = vm.runInNewContext(source.slice(start, end) + "\nCOPY;", {});

test("all supported locales distinguish failed searches from no matches", () => {
  for (const locale of ["ca", "es", "en", "fr"]) {
    assert.equal(typeof copy[locale]?.error, "string", locale);
    assert.ok(copy[locale].error.trim().length > 0, locale);
    assert.notEqual(copy[locale].error, copy[locale].empty, locale);
    assert.notEqual(copy[locale].error, copy[locale].invalid, locale);
  }
});
