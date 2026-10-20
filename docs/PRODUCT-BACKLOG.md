# BiciPark: backlog de producte i revisió funcional

Data: 20/10/2026. Base revisada: main c5e82df (PR 1 i correcció OSM integrades).

## Decisió de producte

Consolidar el recorregut **trobar aparcament → planificar → guardar/exportar → tornar-hi al mòbil** abans d'obrir funcions multiusuari. Aquesta proposta és un increment revisable, no la implementació completa dels deu projectes. Cap compte, infraestructura de pagament ni servei de notificacions s'ha creat. No s'han publicat dades personals.

Esforç relatiu: S = 1–2 dies, M = 3–5 dies, L = 1–2 setmanes, XL = més de 2 setmanes. Són estimacions de desenvolupament i validació, no terminis compromesos. Risc: dades, privacitat, dependències o regressions.

| ID | Prioritat | Pantalla / millora | Valor | Esforç | Risc | Estat / acceptació |
|---|---|---|---|---|---|---|
| PARK-01 | P0 | Aparcaments: mapa fiable | Alt | S | Mitjà | Implementat: OSM directament, sense substituir una segona capa; Leaflet/cluster locals. Validar tiles en dispositiu real. |
| PARK-02 | P0 | Font i seguretat honestes | Alt | S | Mitjà | Implementat: desconegut si manca seguretat explícita; «parking» no equival a segur; dades manuals provisionals; font oficial no equival a verificació física. |
| HIST-01 | P0 | Historial sense activitats inventades | Alt | S | Baix | Implementat: primer ús buit. No s'esborren registres existents. |
| PWA-01 | P1 | Instal·lació i ús sense connexió | Alt | M | Mitjà | Implementat: manifest, icones, worker, fallback, GPX i aparcaments visitats. Validar instal·lació física iOS/Android. No mapes offline. |
| PLAN-01 | P1 | Origen → destí ciclista | Molt alt | M | Mitjà | Implementat: mapa/coordenades, geolocalització, perfils trekking/fastbike, BRouter, errors i timeout. Servei públic sense SLA. |
| PLAN-02 | P1 | Cerca d'adreces al planificador | Alt | M | Mitjà | Pendent: proveïdor configurable amb cerca explícita, resultats per escollir, quotes i política d'ús. No s'ha ampliat l'ús de Nominatim existent. |
| PLAN-03 | P2 | Seguretat, carril bici, desnivell com a criteris | Alt | L | Alt | Pendent: motor que realment suporti cada preferència, cobertura mesurada i etiquetes verificables; no inventar percentatges. |
| GPX-01 | P1 | Importar, analitzar, guardar, compartir, exportar | Alt | M | Mitjà | Implementat: segments preservats, distància, desnivell només amb elevacions, límits 10 MB/100.000 punts/30 rutes. Asfalt i dificultat no inferits. |
| PARK-03 | P1 | Fitxa útil i acció d'arribada | Alt | S | Baix | Implementat: font, cobert/vigilància/actualització o sense dades, guardar i destí al planificador. |
| PARK-04 | P1 | Cerca d'aparcaments geocodificada robusta | Alt | M | Mitjà | Pendent: substituir l'accés directe existent per proveïdor configurable/proxy amb memòria cau, límit global i revisió de política. |
| PARK-05 | P2 | Ocupació, valoracions i fotos | Mitjà | L | Alt | Pendent: font real d'ocupació, timestamps i cobertura; backend/moderació per valoracions. Sense xifres simulades. |
| AUTH-01 | P1 | Compte email i sincronització | Molt alt | XL | Alt | Requereix projecte Supabase o equivalent, domini/redirects, RLS i recuperació de compte. Provar aïllament entre dos usuaris, restauració i conflictes entre dispositius. |
| AUTH-02 | P2 | Google / Apple | Mitjà | M | Mitjà | Després d'AUTH-01: configurar credencials OAuth i comptes de desenvolupador que corresponguin. No posar secrets al navegador. |
| WATCH-01 | P1 | Route Watch meteorològic | Alt | L | Mitjà | Després de rutes guardades estables: proveïdor amb ús adequat, franja horària i geografia de la ruta, hora d'actualització i errors. Consultar manualment abans de push. |
| WATCH-02 | P2 | Alertes en segon pla / obres / alternatives | Alt | XL | Alt | Backend programat, fonts fiables geolocalitzades, push amb consentiment, deduplicació i caducitat. Una PWA oberta no és un servei de vigilància. |
| COM-01 | P2 | Incidències compartides i confirmacions | Mitjà-alt | XL | Alt | El mòdul Live Conditions actual és demo/local. Requereix auth, moderació, antiabús, caducitat i política de localització. No presentar-lo com a comunitat operativa. |
| BIKE-01 | P2 | BiciPark ID + QR públic | Diferenciador | XL | Alt | Backend necessari: fitxa privada, fotos/factura en bucket privat, identificador públic aleatori, contacte mediat, estat de robatori i canvi de titular. No publicar factures, sèrie completa ni contacte directe. |
| BIKE-02 | P2 | NFC / certificació | Mitjà | L | Alt | NFC pot apuntar al mateix URL del QR. El registre és una declaració documentada, no una prova automàtica de propietat. Blockchain ajornada sense benefici validat. |
| DATA-01 | P1 | Analytics de producte | Alt | M | Mitjà | Definir proveïdor/configuració i política abans d'enviar dades. Taxonomia sota aquestes línies. Cap seguiment afegit en aquesta proposta. |
| OPS-01 | P1 | Errors i disponibilitat | Alt | M | Mitjà | Monitorització amb destinació privada, mostreig i eliminació de coordenades/PII. Alertes sobre errors de routing i fallades de dades, no sobre console.log. |
| TECH-01 | P1 | Mòduls i proves | Alt | M | Mitjà | Implementat: planner/GPX/parking-details, BiciParkCore, tests; extracció progressiva de la resta d'app.js pendent. |
| UX-01 | P1 | Navegació coherent | Alt | M | Mitjà | Accés «Planifica» afegit; revisar si jocs/missions/temporades han de quedar en un segon nivell. No eliminar seccions sense dades d'ús. |

## Revisió de pantalles i evidència

- **Inici i navegació:** moltes portes d'entrada a mòduls diferents. La nova entrada Planifica connecta la necessitat quotidiana amb aparcaments. Revisió del codi; falta estudi d'ús.
- **Aparcaments:** PR anterior de mapa integrada. Dades de Girona inclouen «Manual provisional» tot i que la ciutat es defineix com a parcial oficial: preval ara l'etiqueta de cada registre. Mapa, llista, favorits i mobile comprovats; tiles externes bloquejades als tests automatitzats.
- **Mapa/rutes i detall:** continuen el catàleg existent i les correccions de registre de PR 1. No s'ha tornat a certificar exhaustivament cada ruta o cada GPX del catàleg.
- **Route Match:** ja calcula recomanacions sobre un catàleg petit. Mantenir qualificació heurística; no presentar-lo com a entrenador validat. Tests de regressió del perfil/activació.
- **Pla personal:** depèn de localStorage compartit amb Route Match. Migració a núvol requerirà IDs, versions i resolució de conflictes.
- **Historial:** detectada càrrega inicial de demos; retirada en aquesta proposta. Dades existents preservades.
- **Favorits:** per dispositiu; els d'aparcament tenen claus que inclouen nom/coordenades, sensibles a canvis del catàleg. Futur ID estable de la font i migració.
- **Live Conditions:** README i pàgina indiquen demo/local. No és encara Route Watch ni comunitat compartida.
- **Nou planificador:** prova de càlcul amb resposta real de BRouter, importació/exportació/guardat, mòbil i reobertura sense connexió. La selecció al mapa/coordenades és el primer lliurament; cerca textual pendent.

## Disseny següent: compte i dades

Taules proposades: profiles(user_id), saved_routes(id, user_id, geometry, updated_at, version), parking_favorites(user_id, source_id), activities(id, user_id, payload, version), training_plans(user_id, payload, version). RLS: cada usuari només llegeix/escriu les seves files. Importació local explícita, previsualització de recompte i exportació de seguretat. Sincronització amb versió i conflictes visibles; no sobrescriure cegament el dispositiu amb el núvol. Esborrat de compte i dades provat. El registre públic de bicicletes ha de tenir una vista pública mínima separada de les dades privades.

## Taxonomia d'analytics proposada

Esdeveniments: parking_search, near_me_requested/succeeded/failed, parking_saved/removed, route_calculation_started/succeeded/failed, gpx_imported/exported, route_saved, match_profile_completed, plan_activated, activity_saved.

Propietats permeses: ciutat de catàleg, perfil de ruta, origen de funció i codi d'error categoritzat. Excloure adreces, coordenades, nom de rutes, número de sèrie i text lliure. Usuaris/dia i retorn a 7 dies requereixen un criteri d'identificació/consentiment concret; no es poden deduir d'un comptador local. Especificar denominadors (p. ex. ús de proximitat / sessions d'aparcaments), deduplicació i bots.

## Ordre de lliurament

1. Validar aquesta PR en preview, incloent instal·lació en telèfon, mapa real i offline.
2. Cerca textual i robustesa del proveïdor; decidir backend/auth i analytics.
3. Compte + migració/sync, després Watch meteorològic.
4. Comunitat moderada i registre QR públic. NFC com a suport físic opcional; blockchain fora del roadmap immediat.
