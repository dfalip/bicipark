const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../bike-jump/app.js"), "utf8");
const start = source.indexOf("const heldRotationKeys = new Set();");
const end = source.indexOf('document.addEventListener("keydown"', start);
assert.ok(start >= 0 && end > start, "Keyboard input state helpers must exist");

function controller() {
  const sandbox = { input: null };
  vm.runInNewContext(
    'function setRotationInput(value) { input = value; }\n' +
      source.slice(start, end) +
      '\nthis.press = code => { heldRotationKeys.add(code); syncKeyboardRotation(); };' +
      '\nthis.release = code => { heldRotationKeys.delete(code); syncKeyboardRotation(); };' +
      '\nthis.clear = clearKeyboardRotation;',
    sandbox
  );
  return sandbox;
}

test("holding one arrow keeps its direction after the other is released", () => {
  const keys = controller();
  keys.press("ArrowLeft");
  assert.equal(keys.input, -1);
  keys.press("ArrowRight");
  assert.equal(keys.input, 0);
  keys.release("ArrowRight");
  assert.equal(keys.input, -1);
  keys.release("ArrowLeft");
  assert.equal(keys.input, 0);
});

test("right arrow resumes after releasing left, and focus loss clears keys", () => {
  const keys = controller();
  keys.press("ArrowRight");
  keys.press("ArrowLeft");
  keys.release("ArrowLeft");
  assert.equal(keys.input, 1);
  keys.clear();
  assert.equal(keys.input, 0);
  keys.release("ArrowRight");
  assert.equal(keys.input, 0);
});
