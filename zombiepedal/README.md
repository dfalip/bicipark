# ZombiePedal — Escape de la ciutat

**Joc arcade original de BiciPark Play**, de persecució amb bicicleta: una horda de zombis s'acosta per darrere, i el ciclista ha de córrer, saltar obstacles i frenar temporalment els zombis amb boles de pintura. Acció estil dibuix animat **sense violència explícita**.

## Com jugar

- La bicicleta avança automàticament. Mantén **→ / D (PEDALAR)** per anar més ràpid i allunyar la horda; **← / A (FRENAR)** si necessites adaptar-te.
- Prem **ESPAI / ↑ / W (SALTAR)** per passar per sobre dels zombis i obstacles de trànsit.
- Prem **X / F (PINTURA)** per llançar una bola de pintura; els zombis queden aturats, no ferits. Alguns zombis amb casc necessiten dos impactes, el cap final tres.
- Recull cors, estrelles i munició. Les cadenes de bones accions donen combos.
- Les col·lisions resten cors i la horda s'acosta. Si et quedes sense cors o la horda arriba al màxim, has de tornar a provar.
- Escapa per quatre zones: carrers abandonats, parc, zona industrial i pont final. Al final, 1–3 estrelles segons la fugida. El rècord de punts i distància es guarda només al navegador.
- A mòbil: botons grans tàctils de pedal, fre, salt i pintura; pausa al perdre el focus.

## Disseny

- Joc modular a `zombiepedal/engine.js`, `app.js`, `styles.css`, `index.html`.
- Motor de simulació determinista amb pas temporal petit, obstacles de densitat progressiva i tipus diferents (normals, corredors, zombis amb casc, cap final i barreres).
- Canvas original, escenari lateral de ciutat amb paral·laxi, zombis dibuixats, bicicleta, munició, energia de persecució, punt de finalització i HUD.
- Sense serveis externs, comptes, anuncis ni dependències de runtime. Les dades personals no se sol·liciten.

## Proves i limitacions

`npm test` des de l'arrel del repo valida motor, obstacles, controls, final i interacció simulada DOM/Canvas. En desenvolupament local: `python -m http.server 8000`; obre `/zombiepedal/`.

La física és arcade i la ciutat és fictícia. Cal validar jugabilitat i dificultat en mòbils reals. Les boles de pintura són un recurs lúdic, no instruccions ni representació de violència real.
