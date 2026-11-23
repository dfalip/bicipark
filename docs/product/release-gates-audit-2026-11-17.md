# BiciPark release gates — revisió 2026-11-17

Base de revisió: `main` SHA `ab64a5a94d48220c5f765bd35a3e57d50f34c5fb` (consulta GitHub 17/11/2026). Aquesta nota és una auditoria de codi i estat; **no és una prova en navegador ni un desplegament**.

## WORLD-01 — PR #46, bloqueig de producció

Fitxer inspeccionat: `api/world-bike.js` a `feature/world-cycling-osm-pilot-20261114` (blob `563c27e37df572bc9583eeedda94a0ee758be5f6`).

- Implementat en codi: consulta GET sota demanda, centre GPS arrodonit a 0,001°, radi Overpass de 900 m, dos proveïdors seleccionables, timeout, límit de resposta, error explícit, deduplicació d'inflight per instància i capçalera de cache HTTP.
- **No implementat:** quota global distribuïda i cache d'origen compartida garantida entre instàncies. `MAX_INFLIGHT=4`, `failures` i `inflight` són memòria local del procés, no un límit global de trànsit al proveïdor. `s-maxage` depèn del comportament efectiu de la CDN i no substitueix una quota global.
- **No acreditat en aquesta revisió:** resposta LIVE d'Overpass en navegador amb el SHA exacte del preview; qualitat, llicència i cobertura en tres zones; experiència mòbil i els quatre idiomes en la versió desplegada.
- **Decisió:** PR #46 continua sense autorització de merge. No confondre tests amb mocks ni Vercel READY amb dades reals.

### Criteris de desbloqueig verificables

1. Configurar un control agregat de quota i cache compartida o un proveïdor amb contracte/capacitat explícits; documentar costos, política d'ús, TTL i comportament en saturació. Fail-closed quan la quota no es pugui comprovar.
2. Provar el preview amb SHA servit idèntic al HEAD, consulta real i resposta/latència HTTP a Barcelona, París i una zona fora d'Europa. Distingir 0 resultats de 429, 5xx, timeout i dades truncades.
3. Validar atribució OSM/ODbL, font, recència, precisió, privacitat, CA/ES/EN/FR, accessibilitat, i navegació 320–430 px.
4. Només després: CI obligatòria verda, PR mergeable, absència de regressions i desplegament de producció verificat.

## ROUTE-01 i UX — feina no duplicable

- PR #43: continuar les comprovacions d'elevació amb dades completes, parcials i absents, procedència/llicència, sincronització mapa/cursor, teclat i zoom; no publicar sense preview verificat.
- Evitar afirmar percentatges de superfície, trànsit o seguretat si la geometria i les metadades reals no els sustenten.
- El scorecard principal del 14/11 conté estats històrics de PR (#45 i #47–49) que **no s'han d'interpretar com a estat actual**: #45 i BikeJump v3 van ser integrats posteriorment segons el registre de releases; cal contrastar sempre HEAD/PR/CI actuals.

## PLAY-01 — estat i següent prova

`main` incorpora #78, amb trucs de SnowBike i mecànica dash de ZombiePedal. Aquesta revisió **no certifica** el funcionament tàctil en Safari/Chrome ni la versió de producció servida. La prova següent ha de recórrer una partida completa en 320/390/430 px, amb salt, impacte, reinici, focus i moviment reduït, anotant regressions observables.

## Evidència i límits

- GitHub: https://github.com/dfalip/bicipark/commit/ab64a5a94d48220c5f765bd35a3e57d50f34c5fb
- Codi gateway: https://github.com/dfalip/bicipark/blob/feature/world-cycling-osm-pilot-20261114/api/world-bike.js
- PRs: https://github.com/dfalip/bicipark/pull/46 i https://github.com/dfalip/bicipark/pull/43

No s'han executat tests locals, proves reals de proveïdor ni navegador en aquesta revisió. No s'ha modificat codi de producció.
