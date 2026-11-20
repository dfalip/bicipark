# RodaRumble — BiciPark Play

**RodaRumble** és un joc de demolició original, sense llibreries externes de física ni recursos de tercers. S'inspira només en el gènere de puzles de llançament; **no** fa servir ocells, porcs, música, personatges, imatges ni noms comercials d'altres jocs.

## Com jugar
- Arrossega la roda cap enrere de la llançadora, apunta i deixa-la anar; en mòbil és igual amb el dit.
- Alternativa de teclat: les fletxes amunt/avall ajusten l'angle, esquerra/dreta ajusten la potència i **Espai** dispara. També hi ha sliders visibles i el botó **Llança**.
- Una vegada en vol, **Turbo** o **Espai** activa un impuls únic i limitat per trajectòria; no es pot encadenar.
- La fusta, el vidre i l'acer tenen resistències diferents. Els bidons vermells esclaten i poden fer caure altres blocs o objectius.
- Cal eliminar els robots de ferralla amb un nombre limitat de rodes. Els robots cauen si perden els suports.
- Hi ha deu circuits fets a mà i puntuació amb fins a tres estrelles. Les millors marques es guarden localment i el joc funciona sense connexió.

## Arquitectura
- `engine.js`: simulació determinista amb integració a passos `1/120`, col·lisions cercle/rectangle i rectangle/rectangle, blocs que es desplacen, dany per impacte, gravetat, reacció dels objectius, explosions, punts i estrelles.
- `app.js`: canvas de 1000×560, elements visuals originals, transformació del punter al món, controls de teclat, score, resultats, reinici, navegació, efectes i animació.
- `styles.css`: interfície responsiva i suport `prefers-reduced-motion`.
- `tests/roda-rumble.test.cjs` i `tests/roda-rumble-interactions.test.cjs`: física, nivells, puntuació, puntuació segura sense localStorage, controls reals amb JSDOM i accés al catàleg `explora`.

## Límits i properes millores
Aquesta és una física arcade aproximada (els rectangles xoquen sense rotació física completa; l'angle és sobretot visual), **no** un motor de sòlids rígids de precisió. Cal fer proves manuals en mòbil i escriptori de la sensació de punteria, dificultat real dels deu nivells, frame-rate i detalls gràfics abans d'afirmar que està acabat o és comparable a un joc comercial. Propera línia: més nivells, habilitats diferenciades, missions, sons generats localment i tuning de dificultat basat en partides reals.

## Proves

```bash
npm ci
npm test
```

Obre `/roda-rumble/` en un servidor HTTP estàtic.

## RodaRumble v2 · Punteria i habilitats

- **Deu nivells originals**, incloent-hi «Pont de ferralla» i «Gran demolició».
- **Tres rodes que alternen automàticament:** martell, pols i trepant. El martell colpeja més fort; la roda de pols genera una ona expansiva que mou blocs, pot afectar robots i activar bidons; el trepant, amb habilitat activa, transmet millor l'impacte a l'acer.
- **Punteria fidel a les fórmules de la roda**, fins al primer obstacle (sense simular el turbo). Mostra on es preveu la col·lisió, tant si apuntes amb arrossegament com amb sliders o teclat.
- **Indicador de roda següent** amb habilitat, color i instruccions; explosions radials dibuixades sobre l'escenari, col·lisions amb més resposta i partícules.
- La física és arcade de rectangles axis-aligned, no un motor 2D complet de cossos rígids, i es validarà en un navegador físic.

## Rebots per material (novembre 2026)

- Els impactes de les rodes respecten la **normal de contacte**: en cops frontals canvia la direcció, mentre que en cops oblics es conserva part del moviment tangent. El material modifica la restitució (acer més elàstic, vidre més dissipatiu i fusta entremig).
- Les col·lisions amb terra reboten només quan la roda cau amb prou velocitat; quan ja roda lentament, la velocitat vertical es cancel·la per evitar salts espuris.
- Efecte de contacte breu en color diferent segons material, vinculat a una col·lisió real de la simulació; no s'anima quan el sistema demana moviment reduït.
- Les diferències de força entre martell i trepant i les regles de dany, punts i bombes es mantenen. És física arcade determinista, no simulació rígida completa ni garantia d'igual dificultat sense playtesting real.
- Proves de normal, rebot per material, cop oblic, sòl i absència de vibració artificial a `tests/roda-rumble-rebounds.test.cjs`.
