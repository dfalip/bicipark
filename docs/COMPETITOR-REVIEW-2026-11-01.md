# BiciPark competitor review — 2026-11-01

## Fresh signals

- Strava (2026-10-22) announced more intuitive route/POI search, expanded curated route inventory, redesigned route cards with photos/activity context, offline maps, and upcoming community tags/descriptions and turn-by-turn audio.
- Strava route search supports sport type, distance and elevation filters; Community Routes use location, distance, elevation and surface preferences.
- Ride with GPS emphasizes cycling-specific route planning, elevation profiles, surface types, bike-lane priority, heatmaps, POIs/Highlights, nearby route discovery and GPS-device sync.

## BiciPark response

### Ship now

1. Make catalog discovery usable before increasing inventory: keyword search plus modality, local/external/review state, distance/elevation ordering.
2. Expose data confidence in the UI. A large inventory is harmful if estimated, externally sourced and locally tracked routes look equally authoritative.
3. Keep missing elevation/surface data explicit rather than infer it.

### Next high-value blocks

1. Add verified region/start-area fields and filter by them.
2. Derive route metrics from local GPX/GeoJSON geometry where possible and record provenance/date.
3. Add surface mix only from auditable OSM/official sources; never infer from route name.
4. Add route similarity/nearby discovery using geometry once catalog coverage is sufficient.
5. Add route cards with verified highlights/POIs and later photos with explicit licensing/provenance.
6. Explore offline saved-route support using the existing PWA/service worker before turn-by-turn navigation.

## Sources

- https://press.strava.com/zi/articles/strava-makes-route-discovery-easier-with-improved-intuitive-search-expanded-route-inventory-turn-by-turn-audio-coming-soon (2026-10-22)
- https://support.strava.com/en-us/articles/15401678-how-do-i-find-my-saved-routes-on-the-strava-website (2026-09-15)
- https://support.strava.com/en-us/articles/15401756-how-do-community-routes-on-strava-work (2026-09-15)
- https://ridewithgps.com/route-planner (checked 2026-11-01)
- https://support.ridewithgps.com/hc/en-us/articles/4419004026395-Global-Heatmaps (updated 2026-04-14)
