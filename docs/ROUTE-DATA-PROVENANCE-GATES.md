# Route data provenance and publication gates

This document defines a conservative contract for future Route Explorer enrichments. It does not claim that any new route, elevation, POI, or surface dataset is available.

## Data confidence

Every displayed fact must carry a source and status:

- **verified**: authoritative source or individually reviewed primary record, with source identifier, retrieval date and license.
- **derived**: deterministic calculation from identified source geometry/measurements; preserve source reference and algorithm/version.
- **estimated**: modelled result with explicit assumptions and uncertainty; never present as measured.
- **unavailable**: hide the metric or display a clear unknown state; do not replace missing values with zero.

Do not infer a service's opening hours, availability, accessibility, safety or traffic from the mere presence of a map feature. OSM tags are mapped observations, not independent verification of operational status.

## Proposed optional record fields

```json
{
  "source": {"provider": "example", "recordId": "example-id", "retrievedAt": "YYYY-MM-DD", "license": "source license"},
  "geometry": {"format": "GeoJSON LineString or GPX track", "status": "verified"},
  "distance": {"valueKm": null, "status": "unavailable", "method": null},
  "elevation": {"samples": null, "status": "unavailable", "verticalDatum": null},
  "surface": {"segments": null, "status": "unavailable"},
  "pois": []
}
```

The JSON above is **illustrative schema only**, not a real route. Existing catalog entries remain unchanged. Implement validation in a separate module before consuming this shape.

## Required checks before enabling features

1. **Geometry**: parse actual GPX/GeoJSON; reject non-finite/out-of-range coordinates, fewer than two distinct points, broken tracks and ambiguous coordinate order. Record track gaps and avoid joining unrelated segments.
2. **Distance / nearby / passage**: compute geodesic distance along actual segments; measure proximity to polyline segments (not just endpoints); define and test radius and boundary conditions. Avoid ranking routes without comparable coverage.
3. **Elevation profile**: require real altitude samples with documented source and units; preserve gaps and do not convert missing altitude to zero. Synchronize map marker and chart by cumulative distance, with keyboard/touch support. Do not infer reliable climbing totals from sparse/noisy samples without filtering and disclosure.
4. **POIs**: require source, coordinates and timestamp; project each point to a route segment to calculate route-km and lateral offset. Display cartographic/unverified POIs distinctly; no invented opening hours or live availability.
5. **Surface**: label only segments with documented surface evidence; report unknown coverage explicitly. Never extrapolate percentages from incomplete segment tags.
6. **Slope / traffic / safety**: expose a segment layer only when supporting segment-level observations exist. A lack of incidents does not establish safety.
7. **Alternative comparison**: compare safer/flatter/faster only when both alternatives have equivalent, trustworthy metrics; otherwise mark the comparison unavailable.
8. **Circular route generation**: keep behind a non-public module/feature flag until a real routing engine returns valid geometry and routing restrictions are checked. Never interpolate a fictional loop.

## Release acceptance

- Unit tests for malformed GPX/GeoJSON, null elevation, disconnected segments, dateline/coordinate edge cases, missing provenance, POI projection, language fallbacks.
- Browser regression tests for desktop/mobile, keyboard, CA/ES/EN/FR, map-chart synchronization and graceful offline/network failure.
- Verify source licenses and attribution before distributing derived geometry or POI records.
- Require CI green, deployment SHA attestation and browser smoke against the exact preview before merge; check production after deployment.
- Record each new dataset's source, date, licensing, coverage, uncertainty and validation evidence in its PR.

This contract is documentation only; no existing production behavior changes.
