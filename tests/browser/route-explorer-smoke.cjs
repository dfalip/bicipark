// Browser-level smoke checks for the real Route Explorer (no synthetic routes).
// Run with: BICIPARK_BASE_URL=http://127.0.0.1:8765 node tests/browser/route-explorer-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const base = process.env.BICIPARK_BASE_URL || 'http://127.0.0.1:8765';
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(base + '/route-explorer/', { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, 'Route Explorer should load');
      await page.waitForFunction(() => !!window.L && !!document.querySelector('#routeMap.leaflet-container'), { timeout: 25000 });
      await page.locator('#regionFilter').selectOption('barcelona');
      assert.equal(await page.locator('#regionFilter').inputValue(), 'barcelona');
      await page.locator('#regionFilter').selectOption('all');
      await page.locator('#modalityFilter').selectOption('road');
      assert.equal(await page.locator('#modalityFilter').inputValue(), 'road');
      await page.locator('#modalityFilter').selectOption('all');
      assert.equal(await page.locator('#routeMap').count(), 1);
      assert.equal(errors.length, 0, 'Unexpected browser errors: ' + errors.join(' | '));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
