# Route geometry & elevation foundations (non-user-facing)

This integration contains only independent data-quality libraries and Node regression tests from experimental PRs #39 / #40. **No Route Explorer code, route catalog, GPX files, user-facing charts, API, map interactions, or deployment configuration changes.**

- `validateRouteGeometry` rejects unsupported and malformed GeoJSON, sparse coordinates, invalid point limits, and non-finite/out-of-range values, without inferring missing data.
- `deriveElevationProfile` calculates **straight-line horizontal segment distances**, with no invented connection across disconnected segments; elevation is read only from supplied third coordinate and may be unavailable.
- No third-party altitude service, proprietary GPX, private tracks or derived traffic/slope data are included.
- CI runs the repository's Node test suite including these new regression tests.

**Release gate remains separate:** a public interactive elevation chart must independently verify geometry provenance/licensing, visual/accessibility/multilingual quality, map synchronization, preview deployment SHA, remote smoke tests and missing-elevation labeling. This merge does **not** authorize user-facing visualization or assert production deployment functionality.

Original development branches #39/#40 documented more ambitious browser/publication gates; extracting the **library/test-only** subset here isolates it from those gates. No production behavior is changed until a separate UI PR passes them.
