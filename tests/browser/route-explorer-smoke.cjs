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

        // Exercise Leaflet viewport changes in a real browser, without fabricating route data.
        // The test observes map events rather than treating them as proof of route navigation.
        const viewportEvents = await page.evaluate(() => {
          const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
          let moves = 0;
          const onMove = () => { moves += 1; };
          map.on('moveend', onMove);
          try {
            const original = map.getCenter();
            const target = window.L.latLng(original.lat + 0.01, original.lng + 0.01);
            map.setView(target, map.getZoom(), { animate: false });
            const afterPan = map.getCenter();
            const bounds = window.L.latLngBounds(
              [original.lat - 0.02, original.lng - 0.02],
              [original.lat + 0.02, original.lng + 0.02]
            );
            map.fitBounds(bounds, { animate: false });
            return {
              moves,
              moved: afterPan.distanceTo(original) > 100,
              boundsVisible: map.getBounds().contains(bounds)
            };
          } finally {
            map.off('moveend', onMove);
          }
        });
        assert.equal(viewportEvents.moved, true, 'Leaflet setView must move the map');
        assert.equal(viewportEvents.moves >= 1, true, 'Leaflet must emit moveend');
        assert.equal(viewportEvents.boundsVisible, true, 'Leaflet fitBounds must contain the requested bounds');

        // End-to-end passage search using an existing GPX track from the published catalog.
        // Run on desktop and mobile against existing catalog geometry; no synthetic route fixtures.
        {
          const fixture = await page.evaluate(async () => {
            const response = await fetch('./data/routes.json');
            if (!response.ok) throw new Error('Cannot read the real route catalog');
            const routes = await response.json();
            const route = routes.find(item => item.enabled !== false && item.geometryFile?.endsWith('.gpx'));
            if (!route) throw new Error('No GPX-backed route in catalog');
            const trackResponse = await fetch(route.geometryFile);
            if (!trackResponse.ok) throw new Error('Real GPX unavailable: ' + route.geometryFile);
            const xml = new DOMParser().parseFromString(await trackResponse.text(), 'application/xml');
            const points = [...xml.querySelectorAll('trkpt[lat][lon], rtept[lat][lon]')]
              .map(el => [Number(el.getAttribute('lat')), Number(el.getAttribute('lon'))])
              .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)
                && Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
            if (!points.length) throw new Error('Real GPX has no valid track point');
            const [firstLat, firstLng] = points[0];
            return {
              id: route.id, name: route.name, lat: String(firstLat), lng: String(firstLng),
              extent: {
                south: Math.min(...points.map(p => p[0])),
                west: Math.min(...points.map(p => p[1])),
                north: Math.max(...points.map(p => p[0])),
                east: Math.max(...points.map(p => p[1]))
              }
            };
          });
          await lat.fill(fixture.lat);
          await lng.fill(fixture.lng);
          await page.locator('#passageRadius').selectOption('0.5');
          await submit.click();
          await page.waitForFunction(() => {
            const status = document.querySelector('#passageStatus')?.textContent || '';
            return !/Comprovant|Comprobando|Checking|Vérification/.test(status);
          }, { timeout: 120000 });
          const matchingResult = page.locator('#passageResults li button').filter({ hasText: fixture.name }).first();
          await matchingResult.waitFor({ state: 'visible', timeout: 120000 });
          await matchingResult.click();
          await page.waitForFunction(name => document.querySelector('#routeDetails h2')?.textContent === name, fixture.name, { timeout: 30000 });
          assert.equal(await page.locator('#regionFilter').inputValue(), 'all', 'Opening passage result resets restrictive region filter');
          assert.equal(await page.locator('#modalityFilter').inputValue(), 'all', 'Opening passage result resets restrictive modality filter');
          const routeMapContainsPoint = await page.evaluate(({ lat, lng }) => {
            const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
            return map.getBounds().contains(window.L.latLng(Number(lat), Number(lng)));
          }, fixture);
          assert.equal(routeMapContainsPoint, true, 'Opening an existing route should show its GPX point on the map');
          // Check the full recorded GPX extent, not just the passage search point.
          // This intentionally fails if route selection leaves part of the track outside the map.
          const fullTrackVisible = await page.evaluate(({ extent }) => {
            const map = window.__BICIPARK_ROUTE_EXPLORER_MAP__;
            const trackBounds = window.L.latLngBounds(
              [extent.south, extent.west], [extent.north, extent.east]
            );
            return map.getBounds().contains(trackBounds);
          }, fixture);
          assert.equal(fullTrackVisible, true, 'Opening an existing route must frame the complete real GPX track');
        }

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
