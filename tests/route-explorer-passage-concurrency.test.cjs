const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8");
const start = source.indexOf('section.querySelector("#passageSubmit").addEventListener("click", async () => {');
const end = source.indexOf("\n  });", start);
assert.ok(start >= 0 && end > start, "passage search handler exists");
const handler = source.slice(start, end + 5).replace('section.querySelector("#passageSubmit").addEventListener("click", ', "register(");

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup() {
  const requests = [];
  let click;
  const results = {
    children: [], textContent: "",
    replaceChildren() { this.children = []; this.textContent = ""; },
    appendChild(node) { this.children.push(node); }
  };
  const status = { textContent: "" };
  const latInput = { value: "41.4" };
  const lngInput = { value: "2.1" };
  const section = { querySelector: () => ({ value: "2" }) };
  const context = {
    register: fn => { click = fn; },
    stopPicking: () => {},
    searchRevision: 0,
    latInput, lngInput, section, status, results,
    t: { invalid: "invalid", searching: "searching", empty: "empty", error: "error", coverage: n => "checked " + n, near: n => n, open: "Open" },
    loadRoutes: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
    findRoutesPassingNear: async ({ routes }) => routes,
    loadRouteGeometry: async () => ({}),
    formatDistance: n => String(n),
    document: { createElement: tag => ({
      tag, children: [], textContent: "",
      append(...nodes) { this.children.push(...nodes); },
      appendChild(node) { this.children.push(node); },
      setAttribute() {}, addEventListener() {}
    }) },
    window: { dispatchEvent() {} },
    CustomEvent: class {},
    console: { warn() {} }
  };
  vm.runInNewContext(handler, context);
  return { click: () => click(), requests, results, status, latInput };
}

test("an older successful search cannot replace newer results", async () => {
  const s = setup();
  const older = s.click();
  const newer = s.click();
  s.requests[1].resolve([{ route: { id: "new", name: "New" }, distanceKm: 1 }]);
  await newer;
  s.requests[0].resolve([{ route: { id: "old", name: "Old" }, distanceKm: 1 }]);
  await older;
  assert.equal(s.results.children.length, 1);
  assert.equal(s.results.children[0].children[0].children[0].textContent, "New");
  assert.equal(s.status.textContent, "checked 0");
});

test("an older failed search cannot overwrite a newer successful search", async () => {
  const s = setup();
  const older = s.click();
  const newer = s.click();
  s.requests[1].resolve([]);
  await newer;
  s.requests[0].reject(new Error("stale"));
  await older;
  assert.equal(s.status.textContent, "checked 0");
  assert.equal(s.results.textContent, "empty");
});

test("invalid new coordinates invalidate a pending older search", async () => {
  const s = setup();
  const older = s.click();
  s.latInput.value = "";
  await s.click();
  s.requests[0].resolve([{ route: { id: "old" }, distanceKm: 1 }]);
  await older;
  assert.equal(s.status.textContent, "invalid");
  assert.equal(s.results.children.length, 0);
});


test("a failed current search reports an error rather than a false no-match result", async () => {
  const s = setup();
  const request = s.click();
  s.requests[0].reject(new Error("network unavailable"));
  await request;
  assert.equal(s.status.textContent, "error");
  assert.equal(s.results.children.length, 0);
  assert.notEqual(s.results.textContent, "empty");
});
