// Browser-level smoke checks for the real Route Explorer (no synthetic routes).
// Run with: BICIPARK_BASE_URL=http://127.0.0.1:8765 node tests/browser/route-explorer-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const base = (process.env.BICIPARK_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        const response = await page.goto(base + '/route-explorer/', { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, 'Route Explorer should load');
        await page.waitForFunction(() => !!window.L && !!document.querySelector('#routeMap.leaflet-container') && !!window.__BICIPARK_ROUTE_EXPLORER_MAP__, { timeout: 25000 });
        await page.locator('#regionFilter').selectOption('barcelona');
        assert.equal(await page.locator('#regionFilter').inputValue(), 'barcelona');
        await page.locator('#regionFilter').selectOption('all');
        await page.locator('#modalityFilter').selectOption('road');
        assert.equal(await page.locator('#modalityFilter').inputValue(), 'road');
        await page.locator('#modalityFilter').selectOption('all');

        const pick = page.locator('#passagePick');
        const lat = page.locator('#passageLat');
        const lng = page.locator('#passageLng');
        const submit = page.locator('#passageSubmit');
        await pick.waitFor({ state: 'visible' });
        assert.equal(await pick.getAttribute('aria-pressed'), 'false');
        await pick.click();
        assert.equal(await pick.getAttribute('aria-pressed'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await pick.getAttribute('aria-pressed'), 'false');
        assert.equal(await pick.evaluate(el => document.activeElement === el), true, 'Escape should restore picker focus');

        await pick.click();
        // Dispatch a genuine Leaflet map event at its current geographic center.
        // This is a UI integration check, not a fabricated route or location claim.
        await page.evaluate(() => {
          const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
          map.fire('click', { latlng: map.getCenter() });
        });
        assert.equal(await pick.getAttribute('aria-pressed'), 'false');
        assert.equal(await submit.evaluate(el => document.activeElement === el), true, 'Selection should focus Search');
        assert.equal(Number.isFinite(Number(await lat.inputValue())), true);
        assert.equal(Number.isFinite(Number(await lng.inputValue())), true);
        assert.equal((await lat.inputValue()).length > 0, true);
        assert.equal((await lng.inputValue()).length > 0, true);

        // A map click outside picker mode must not silently overwrite the selected point.
        const selectedLat = await lat.inputValue();
        const selectedLng = await lng.inputValue();
        await page.evaluate(() => {
          const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
          map.fire('click', { latlng: map.getBounds().getNorthEast() });
        });
        assert.equal(await lat.inputValue(), selectedLat, 'Inactive picker must preserve latitude');
        assert.equal(await lng.inputValue(), selectedLng, 'Inactive picker must preserve longitude');

        // Invalid coordinates must not be reported as zero verified matches.
        await lat.fill('91');
        await submit.click();
        assert.equal((await page.locator('#passageStatus').textContent() || '').trim().length > 0, true);
        assert.equal(await page.locator('#passageResults li').count(), 0);
        assert.equal(errors.length, 0, 'Unexpected browser errors: ' + errors.join(' | '));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
