const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

test("invalid radius is rejected without fetching routes", async () => {
  const dom = new JSDOM('<!doctype html><html lang="ca"><body><div class="route-explorer-controls"></div></body></html>', { url: "https://example.test/" });
  const { window } = dom;
  let fetchCount = 0;
  const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
  vm.runInNewContext(source, {
    window, document: window.document, localStorage: window.localStorage,
    fetch: () => { fetchCount++; throw new Error("Unexpected fetch"); },
    console, Number, String, CustomEvent: window.CustomEvent
  });
  window.document.querySelector("#passageLat").value = "41.387";
  window.document.querySelector("#passageLng").value = "2.170";
  const radius = window.document.querySelector("#passageRadius");
  const option = window.document.createElement("option");
  option.value = "999"; option.textContent = "999 km";
  radius.appendChild(option);
  radius.value = "999";
  window.document.querySelector("#passageSubmit").click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCount, 0);
  assert.equal(window.document.querySelector("#passageStatus").textContent, "Introdueix coordenades vàlides.");
  dom.window.close();
});
