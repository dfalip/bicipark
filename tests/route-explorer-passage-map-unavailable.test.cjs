const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

for (const lang of ["ca", "es", "en", "fr"]) {
  test(`passage picker explains unavailable map in ${lang} without entering pick mode`, () => {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><div class="route-explorer-controls"></div></body></html>`, { url: "https://example.test/" });
    const { window } = dom;
    const source = fs.readFileSync(path.join(__dirname, "../route-explorer/adapters/passage-search-ui.js"), "utf8").replace(/^import .*;\s*$/gm, "");
    vm.runInNewContext(source, { window, document: window.document, localStorage: window.localStorage, console, Number, String });
    const button = window.document.querySelector("#passagePick");
    button.click();
    const status = window.document.querySelector("#passageStatus");
    assert.ok(status.textContent.trim().length > 10);
    assert.notEqual(status.textContent, button.textContent);
    assert.equal(button.getAttribute("aria-pressed"), "false");
    assert.equal(window.document.querySelector("#passageSearch").classList.contains("is-picking"), false);
    dom.window.close();
  });
}
