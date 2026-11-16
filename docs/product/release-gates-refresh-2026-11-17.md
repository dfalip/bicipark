# BiciPark release-gate evidence refresh — 2026-11-17

This is a dated supplement to `docs/WORLD-CLASS-PRODUCT-SCORECARD-2026-11-14.md`, not a claim of new functionality.

## Verified repository baseline

- Latest repository commit observed: `ab64a5a94d48220c5f765bd35a3e57d50f34c5fb` (PR #78, 2026-11-16 23:51 UTC), containing SnowBike aerial 360/streak mechanics and ZombiePedal limited dash/seeded course shuffle. This is **repository evidence**, not independent gameplay validation or deployment verification.
- Prior merged commits visible in repository history: #76 `9c2da7722c6b78b481c7599ad547f100016ef8b7` (animated sprite atlases); #75 `0b0ed766399715e06bdb56d5891b9750f2d99bc0` (rider/zombie art); #74 `a5809925bea9b4a96d4055003b93324183622aca` (SnowBike jump and yeti).
- The 14 November scorecard's statements describing GeoSprint #45 and BikeJump #47–49 as drafts are historical, **not current release status**. #45 and #51–55 were subsequently integrated according to release records. Avoid duplicating them.
- World Bike #46 and elevation #43 remain **release-gated** until exact-head preview, real-browser tests, source/license and live external-data evidence are recorded. A green mocked CI is insufficient.

## Next execution: decision gates

1. Read current `main` HEAD, open PRs, required checks and actual Vercel deployment SHA before selecting work. Do not assume this snapshot remains current.
2. For World Bike #46, demonstrate a live Overpass response via deployed same-origin gateway in a real browser in multiple regions, check global rate limits/shared cache, privacy, provider policy, ODbL attribution, CA/ES/EN/FR and failure states. No merge without this evidence.
3. For route elevation #43, use real legally attributable complete/partial/absent-altitude GPX or GeoJSON, test cursor/keyboard/zoom and mobile, avoid interpolated bridges, and verify exact preview SHA.
4. For Play, run a full real browser/touch session on production at 320/390/430 px and desktop; test jump/dash timing, pause, controls, focus, reduced motion and scoring. Only claim playability metrics that were measured.
5. For core cycling value, validate real route geometry, provenance, POI freshness, GPX and missing-data states. Distinguish searchable global geography from actual OSM coverage.

## Release record template

Record for each PR: `base SHA`, `head SHA`, changed files, unit/integration tests, browser/device evidence, external-data evidence (if applicable), CI required checks, Vercel preview ID and served SHA, mergeability, risk decision, merge SHA, production deployment ID and served SHA. Unknown is **not verified**.

This update intentionally contains no new POIs, routes, traffic/surface percentages, claims of live coverage, or invented browser results.
