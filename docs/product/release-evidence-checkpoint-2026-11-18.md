# BiciPark release evidence checkpoint — 2026-11-18

This is a repository audit checkpoint, **not** a claim of browser validation or a release.

## Baseline verified via GitHub

- Default-branch latest commit returned by GitHub commit search: `ab64a5a94d48220c5f765bd35a3e57d50f34c5fb` (PR #78, SnowBike tricks and ZombiePedal dash/shuffle).
- Previously merged gameplay: #74 `a5809925bea9b4a96d4055003b93324183622aca` (SnowBike jump/yeti), #76 `9c2da7722c6b78b481c7599ad547f100016ef8b7` (sprite atlases).
- These commit references are repository evidence only. A commit on main **does not** prove that Vercel serves that exact SHA or that a game works on touch devices.
- The 2026-11-14 product scorecard predates those merges and contains historical PR statuses. Treat its “BiciPark avui” section as a dated snapshot, not current release state.

## Unverified release gates — keep fail-closed

| Area | Required independent evidence | State at this checkpoint |
|---|---|---|
| World Bike #46 | Real Overpass responses from browser in 3 regions; explicit 0-results vs errors; source/license; global rate limit and shared cache | Not verified here. Do not merge on mock tests alone |
| Elevation UI #43 | Exact preview SHA, legal route provenance, complete/partial/missing elevation, mobile/keyboard/zoom, four languages | Not verified here. No duplicate UI implementation |
| Public games | Exact production deployment SHA, mobile 320–430 px, keyboard/touch, focus, pause/restart and no regressions | Not verified here; commits alone are insufficient |
| Routes/GPX | Real routing geometry, valid GPX, metadata provenance, honest missing altitude/surface/traffic | Not verified here |
| Performance | Real network waterfall for Barcelona parking payload, LCP/INP/CLS measured | Not measured here |

## Next high-value engineering increments

1. **WORLD-01:** Introduce a shared server-side quota/cache provider only after selecting an appropriate service and reviewing cost, privacy, and OSM provider terms. A per-instance in-memory counter is not a global quota.
2. **UX-01:** Run a reproducible Playwright browser smoke matrix (320, 390, 768, 1440 px) against an exact-SHA preview, capturing failures in navigation, touch controls and i18n. Do not equate jsdom tests with real-device validation.
3. **ROUTE-01:** Validate a representative set of actual GPX/GeoJSON inputs and their provenance before adding new route cards, POIs, surface estimates or “safe route” labels.
4. **PLAY-01:** Audit gameplay in SnowBike, ZombiePedal and Puzzle on the production SHA, and fix the first reproducible control/feedback defect rather than making unmeasured speed changes.

## Release policy

Only merge a functional PR when required CI is green, preview matches head SHA, browser tests and external data gates pass, and there are no unresolved conflicts or material privacy/data risks. Verify the production SHA after merging. If a gate is unavailable, leave the functional PR draft. No invented routes, POIs, traffic, surfaces, availability, or game performance statistics.
