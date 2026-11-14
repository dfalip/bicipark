const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../bike-jump/app.js"), "utf8");
const start = source.indexOf("const STORAGE_KEY = ");
const end = source.indexOf("const safeStoredRecord = readRecord();", start);
assert.ok(start >= 0 && end > start, "storage helpers must be present");
const helpers = source.slice(start, end);

function loadHelpers(localStorage) {
  const context = vm.createContext({window: {localStorage}});
  vm.runInContext(helpers, context);
  return context;
}

test("BikeJump restores a valid local record", () => {
  const context = loadHelpers({getItem: () => "123", setItem: () => {}});
  assert.equal(vm.runInContext("readRecord()", context), 123);
});

test("BikeJump ignores invalid or negative saved scores", () => {
  for (const value of ["NaN", "-5", "Infinity", ""]) {
    const context = loadHelpers({getItem: () => value, setItem: () => {}});
    assert.equal(vm.runInContext("readRecord()", context), 0);
  }
});

test("BikeJump survives denied storage reads and writes", () => {
  const context = loadHelpers({
    getItem() {throw new Error("SecurityError");},
    setItem() {throw new Error("QuotaExceededError");}
  });
  assert.equal(vm.runInContext("readRecord()", context), 0);
  assert.doesNotThrow(() => vm.runInContext("saveRecord(150)", context));
});

test("BikeJump saves high score when storage is available", () => {
  let stored;
  const context = loadHelpers({
    getItem: () => null,
    setItem(key, value) {stored = [key, value];}
  });
  vm.runInContext("saveRecord(150)", context);
  assert.deepEqual(stored, ["bicipark-bike-jump-high-score-v1", "150"]);
});
