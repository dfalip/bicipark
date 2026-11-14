# Route Explorer — visual elevation integration (staged)
Source: existing versioned GPX/GeoJSON route geometry, not a generated altitude model.
The previous chart skipped missing elevation and could connect disconnected GPX segments.
This change instead:
- detects a selected route by its exact route ID (also works for segmented routes);
- checks all raw track coordinates before map/profile usage; invalid GPX coordinates fail closed instead of disappearing;
- uses supplied elevation only; no elevation interpolation, synthetic uphill metres or distance across separate source track segments;
- shows a chart only when every source point has elevation and the track has nonzero distance;
- labels partial/missing/invalid track elevation instead of manufacturing a chart;
- draws separate profile lines for each original segment, with the gap described;
- connects pointer and keyboard navigation to a marker that is cleared on route change;
- exposes Catalan, Spanish, English and French copy for the profile when the page language matches;
- keeps real-world source provenance separate from structural validity. The presence of GPX <ele> is NOT independent proof of measurement quality or reuse rights.

## Tests and release gate
Run npm test; Core flow CI must pass on the exact final SHA.
For visual publication separately confirm: Vercel preview truly serves the intended SHA, interactive browser smoke on real licensed track geometries including no elevation/partial elevation/discontinuous tracks, keyboard/mouse/mobile experience, CA/ES/EN/FR and map synchronization.
A successful CI/preview build alone is not the complete production release gate.
No original route files, title/description, catalog counts, external POIs or route sources are modified.

## TradeRank
TradeRank's v2 React redesign is a separate PR #92 and should not be merged solely because the frontend build tests pass; real v69 verified ranking parity remains mandatory.
