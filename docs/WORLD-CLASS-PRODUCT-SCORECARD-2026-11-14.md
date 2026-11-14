# BiciPark · competència i qualitat del producte (14/11/2026)

**Missió:** construir una eina ciclista que ajudi a **trobar, planificar, pedalar i divertir-se** a qualsevol lloc del món. Això és un objectiu de producte, no una afirmació de cobertura o superioritat actual.

**Base revisada:** repositori `main` i PR obertes el 14/11/2026. No es confon codi existent, proves automatitzades, desplegaments preview, i experiència validada amb dades reals. La revisió anterior continua a `COMPETITOR-REVIEW-2026-11-01.md`.

## Referents competitius verificats

| Plataforma | Avantatges documentats | Resposta diferencial viable de BiciPark |
|---|---|---|
| Komoot | Rutes per activitat i dificultat; superfície, desnivell, waypoints, offline, navegació, compartir. | Cercar fonts, aparcaments, tallers i serveis amb procedència visible i accés ràpid a planificar-hi; eines globals honestes; GPX transparent. |
| Bikemap | Rutes ciclistes mundials, perfils road/MTB/e-bike, preferències per vies ciclistes, navegació i offline. | Millorar fiabilitat dels POIs ciclistes i consistència dels perfils; no proclamar cobertura universal sense dades. |
| Strava | Descoberta millorada, recerca natural de POIs, inventari de rutes, targetes amb fotos/comunitat, mapes offline (22/10/2026). | Cerca fàcil amb prioritat a aparcament/serveis, informació verificable per planificar i microjocs que no exigeixin xarxa social. |
| Cyclers | Baiker beta (25/09/2026): peticions de rutes en llenguatge natural, fins a 3 opcions, revisió de trànsit, superfície i pendent; edició de rutes. | Planificador amb preferències implementades de veritat i alternatives comparables; assistent conversacional només després de validar el motor. |
| Ride with GPS | Planificador centrat en ciclisme, perfil d'elevació, tipus de superfície, heatmaps i integració de dispositius. | Rutes/GPX fiables i properes a necessitats quotidianes, assistència a la sortida i serveis d'última milla. |

**Fonts directes:**
- https://www.komoot.com/features (consultat 14/11/2026)
- https://www.bikemap.net/en/apps/ (consultat 14/11/2026)
- https://press.strava.com/en-gb/articles/strava-makes-route-discovery-easier-with-improved-intuitive-search-expanded-route-inventory-turn-by-turn-audio-coming-soon (22/10/2026)
- https://support.cyclers.app/en/articles/16780948-what-is-the-baiker-beta-feature-and-how-does-it-work (25/09/2026)
- https://support.cyclers.app/en/articles/14634278-how-to-check-the-details-of-the-route (14/07/2026)
- https://ridewithgps.com/route-planner (referència anterior; revalidar abans d'afirmar novetats)

## BiciPark avui: evidència, no màrqueting

**Existència de codi a main:** planificador de rutes BRouter, importació i exportació GPX, aparcaments, PWA parcial, perfil personal i joc BikeJump. La cobertura mundial completa, mapes offline exhaustius, qualitat de rutes i navegació real a tots els dispositius **no estan certificades**.

**En desenvolupament:** `#43` elevació amb procedència (draft), `#45` GeoSprint/Explora (draft), `#46` BiciPark World (draft, incidència real en captura d'usuari: cap dada de serveis retornada). `#47–49` BikeJump accessibilitat/estabilitat (draft). No marcar cap d'aquestes funcionalitats com a publicada.

**Risc de rendiment per investigar:** `data/barcelona/parkings.json` ocupa ~7,9 MB al repositori. Mesurar si es descarrega tot durant la primera càrrega; no afirmar que sí fins a inspeccionar xarxa en navegador. Prefereix paginació/retalls espacials i cache al client sense perdre POIs.

## Prioritats ordenades per valor i fiabilitat

| Prioritat | Èxit esperat | Gates mínims |
|---|---|---|
| P0 — WORLD-01 | «A prop meu» retorna aparcaments/fonts/tallers reals quan la font en té, o error exacte amb recuperació. | Consulta REAL en navegador a 3 regions, cap resultat inventat, OSM source/atribució, endpoint backend amb quotes agregades/cache, privacitat, 4 idiomes. PR #46, NO merge fins superar gates. |
| P0 — ROUTE-01 | Planificar origen → destí i exportar GPX amb geometria real i informació de confiança. | Comparar ruta amb geometria retornada, casos de fallada/timeout, desnivell absent explicitat, camps revisats, prova mòbil. |
| P0 — UX-01 | Trobar aparcament/planificar en menys passos i sense confusió entre mode mapa i resultat. | Prova de navegació real a 320/390/768/1440 px, teclat i lector de pantalla; sense botons inerts ni errors amagats. |
| P1 — PLAY-01 | BikeJump v3 com a arcade curt, senzill, divertit i responsive; GeoSprint rejugable. | Partida completa en dispositiu real, feedback de salt/aterratge entenedor, reinici sense regressions, controls tàctils visibles, no falsejar rècords. |
| P1 — PERF-01 | Càrrega progressiva i àgil de mapes/POIs, sense descarregar dades innecessàries. | Mesurar bytes i peticions de xarxa, reduir transferència inicial i dibuix redundant, mantenir atributs OSM i errors. |
| P1 — OFFLINE-01 | Ruta guardada i GPX accessibles sense xarxa quan realment estan desats. | Prova desconnectat a mòbil; no prometre offline de tiles/navegació no descarregats. |
| P1 — GLOBAL-01 | Qualsevol zona es pot consultar amb informació de font i cobertura coneguda. | Proveïdor escalable, quota global, cache compartida, validesa de dades, llicència/ODbL, temps de resposta i fallback mesurats. |
| P2 — SMART-01 | Seleccionar alternativa més plana/tranquil·la/sobre carril bici. | Motor que implementa preferències verificables; mai etiquetar «segura» sense font. |
| P2 — SOCIAL-01 | Comunitat útil i segura, alertes caduques/moderades. | Backend, moderació, privacitat, consentiment i controls antiabús abans de llançament. |

## Criteris de qualitat mesurables (objectius, NO resultats assolits)

- **Disponibilitat funcional:** èxit en consultes validades a Barcelona, París i una ciutat d'un altre continent; diferenciar «0 resultats» de fallada de proveïdor.
- **UX de tasca:** un usuari nou ha de poder trobar un aparcament, planificar una ruta i iniciar un joc sense haver d'interpretar tecnicismes. Registrar on es bloqueja; no inventar taxes d'èxit.
- **Rendiment:** objectiu LCP p75 ≤2,5 s, INP p75 ≤200 ms i CLS p75 ≤0,1; monitoritzar abans d'afirmar-los.
- **Accessibilitat:** WCAG 2.2 AA com a objectiu; proves amb teclat, focus, lector de pantalla i `prefers-reduced-motion`.
- **Dades:** cada POI i ruta mostrats han de tenir estat, font i límit de precisió; absència de dades = desconegut, no zero ni «segur».
- **Jocs:** 3-5 passos per començar, resultat comprensible, partida curta/repetible, mòbil i teclat funcionals; provar amb persones, no sols tests sintètics.
- **Internacional:** CA/ES/EN/FR a pantalles noves i espai per més idiomes; rutes i serveis depenen de qualitat geogràfica real, no d'un catàleg de ciutats fixes.

## Procés autònom per cada iteració

1. Inspeccionar `main`, PRs, CI i incidències reals; evitar duplicar tasques ja obertes.
2. Prioritzar per impacte i urgència: fiabilitat/dades (35%), valor ciclista (25%), simplicitat mòbil (20%), avantatge competitiva (10%) i risc de publicació (10%). L'escala és de decisió, no una mesura estadística.
3. Implementar **una millora auditable** amb commit, tests i PR petita; els canvis de backend que afecten privacitat/quotes no es fusionen automàticament.
4. Validar codi, navegador real, dades externes, llicències, accessibilitat, idiomes i previsualització amb SHA exacte.
5. Si hi ha bloqueig real (proveïdor/API/autorització), registrar-lo i treballar en un altre front. No substituir una fallada per dades d'exemple.
6. Publicar només canvis reversibles i de baix risc amb proves completes. La CI verda **no equival** a consulta real funcional.

## Cadència

- **Cada hora:** revisió d'estat i petites millores quan hi hagi treball útil.
- **Cada setmana:** revisió del backlog, incidències, UX, regressions i canvis de competidors.
- **Cada mes:** revisar cobertura geogràfica/fiabilitat, proveïdors, rendiment i els objectius de producte.
- L'automatització de ChatGPT és l'orquestrador; no implica monitorització telemètrica real ni accés il·limitat a plataformes externes.

**Regla essencial:** abans de prometre «la millor web ciclista del món», construir un sistema que fa bé, a qualsevol lloc amb dades, els casos d'ús reals i que diu clarament quan alguna cosa no se sap.
