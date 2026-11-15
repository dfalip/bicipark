# BikeJump 3 — comparativa competitiva i full de ruta
Data: 2026-11-15. Aquest document és un pla de producte, **no** una afirmació que BikeJump sigui el millor joc del món.

## Referències revisades
- [Bike Jump, BoomBit / CrazyGames](https://www.crazygames.com/game/bike-jump): interacció d'un sol botó, partida breu i progressió. Oportunitat: entrada immediata sense repetir tutorials; evitar la monotonia d'una sola acció.
- [Touchgrind BMX 2 / Illusion Labs](https://play.google.com/store/apps/details?id=se.illusionlabs.touchgrindbmx2): control avançat, combinacions d'acrobàcies, reptes, personalització i duels. Oportunitat: profunditat opcional després d'un primer salt intuïtiu.
- [Mad Skills BMX 2](https://eonevolve.com/blog/best-bmx-games-for-mobile): curses laterals, nous circuits, equipament i competició. Oportunitat: progressió amb circuits i proves curtes.
- Les opinions d'una ressenya poden ser subjectives o interessades. La comparativa és qualitativa; no és un benchmark independent de satisfacció.

## Diagnòstic del BikeJump original
1. El botó de sortida quedava sota el canvas i es podia perdre de vista al mòbil.
2. Un toc ràpid, natural en pantalles tàctils, iniciava i acabava el gest massa aviat.
3. El pilot i la bicicleta eren poc visibles; hi havia poques pistes sobre quan saltar.
4. Els resultats quedaven separats de l'escenari i faltava una progressió sostinguda.
5. La dificultat dels primers salts no tenia una alternativa d'entrada senzilla.

## V3 (PR #51) — primer increment publicable
- Dos tocs per defecte i opció experta de mantenir premut, funcionant també amb teclat.
- Gran botó a tocar del canvas, indicador de fase i senyal lluminós de la zona òptima.
- Controls d'equilibri sempre accessibles durant el vol, també al mòbil.
- Pantalla de resultat amb puntuació i un sol botó de continuació. Rècord local, sense anuncis ni rastrejadors.
- Nova ambientació alpina, paleta d'alt contrast i compatibilitat amb preferències de moviment reduït.
- Regressions automàtiques de controls i física. **Encara cal una sessió real tàctil i visual**.

## Full de ruta ordenat per valor, no per quantitat
### P1 — Qualitat jugable (abans de noves mecàniques)
- Prova real Chrome Android i Safari iPhone, amb 320–430 px: primer salt, dos tocs, gest de mantenir, reinici, resultat i retorn al salt.
- 30 sessions d'usuari (voluntàries, anonimitzades) amb objectius: primer salt entès sense ajuda, controls no enganxats, navegació sense zoom ni desplaçament lateral.
- Mesurar amb proves locals: canvas render a 60 fps quan el dispositiu ho permet; cap error JS ni salt accidental per tocar.
- Polir microanimacions, HUD i llegibilitat en pantalles petites.

### P2 — Progressió i retenció
- 3 circuits originals (muntanya, ciutat, canyó), cadascun amb dificultat i condicions específiques.
- Mode pràctica separat dels rècords i mode repte de 3 salts.
- Missions de precisió, aterratges i distància, amb medalles i desbloqueigs cosmètics, sense compres.
- Rècord per circuit i desament local amb degradació segura si l'emmagatzematge falla.

### P3 — Profunditat opcional
- Trucs avançats desbloquejables (barspin, backflip) i física previsiblement controlable; tutorial interactiu en 20 segons.
- Replay local curt i fantasma del millor salt amb dades derivades, sense enregistrar vídeo de l'usuari.
- Àudio original opcional, amb botó mut inicialment i respecte a reducció de moviment.
- Classificació entre amics només amb consentiment i identitat voluntària. Res de dades personals per defecte.

## Gates de publicació
- CI del HEAD de PR verda.
- Cap regressió de rutes, mapes o puntuació v2 importada.
- Preview visual i tàctil revisada; si no es pot automatitzar, explicitar el límit i obrir feedback per als usuaris.
- Backout per commit de desplegament Vercel.
