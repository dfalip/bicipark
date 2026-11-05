# Route Explorer passage search — browser release gate

This checklist is a **manual browser verification**, not a claim that the flow has been tested. Complete it against the exact Vercel preview commit before merging PR #35.

## Preconditions
- Record the PR head SHA, preview URL, browser/version, viewport, date and tester.
- Confirm the preview serves the PR head SHA. Verify the route catalog and selected route geometry load successfully; do not substitute fabricated GPX/GeoJSON.
- Select a route with existing loadable geometry and a known point on its track. Record the route ID and point source. If none is available, mark the gate **blocked**, not passed.

## Required checks
1. Desktop: open Route Explorer; select **Pick point on map**; click the recorded point; verify coordinates populate, picker exits and focus moves to Search.
2. Search within an appropriate radius; verify the expected route appears, distance is plausible relative to the actual geometry, and the checked-geometry coverage message is shown. Do not infer completeness of the whole catalog.
3. Activate the result; verify the correct route is visible, the map fits the **real** route bounds, the detail panel opens, and active filters cannot hide the selected route.
4. Repeat when the route begins outside the initial viewport. Pan/zoom manually and repeat; verify Leaflet `fitBounds` and `moveend` do not trigger a conflicting selection or jump.
5. Change latitude, longitude, and radius independently after results appear. Verify old matches disappear immediately. Start a slow search, change the target, then verify stale responses never reappear.
6. Test missing/invalid coordinates, invalid radius, catalog/geometry request failure, and no-match results separately. Failures must not be represented as verified zero matches.
7. Keyboard: Tab to picker and Search; Enter/Space activate; Escape cancels map-pick mode; focus remains visible. Verify live status is announced by a screen reader where available.
8. Mobile: repeat selection, search, opening a result, map pan/zoom and details at 375×812 (or comparable). Check no horizontal overflow or controls blocked by the map.
9. Switch CA/ES/EN/FR and verify labels, errors, result actions and details. Check console for uncaught errors.

## Evidence / decision
Capture screenshots or recordings for desktop and mobile, console errors, route ID/geometry provenance, and pass/fail per step. Also record `npm test`, `npm run build:connected`, required GitHub checks, and the Vercel preview deployment status for the **same SHA**.

**Merge gate:** do not merge if any step fails or is unverified, if CI/preview is not green, or if route provenance is uncertain. After merge, confirm production deployment and rerun the critical open-route flow. This checklist itself does **not** satisfy the browser gate.
