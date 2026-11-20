# BiciPark Puzzle — Aparca-les!

Joc original de lògica sobre aparcament de bicicletes. **12 nivells en 4 capítols**: Inici, Cruïlles, Colls d'ampolla i Mestres del pàrquing.

## Com jugar
1. Selecciona una bicicleta identificada per una lletra i un color.
2. Toca una casella lliure connectada pels carrers: la bicicleta seguirà el camí més curt en una successió de moviments animats. També pots moure una sola casella amb lliscament, fletxes o controls tàctils. No es pot travessar cap edifici ni una altra bicicleta, i **cada casella recorreguda compta com un moviment**.
3. Aparca totes les bicicletes a les places amb la mateixa lletra i color abans d'esgotar els moviments.
4. El nombre mínim de moviments es calcula amb A* i heurística Manhattan. Sense pistes i amb el mínim guanyes tres estrelles.
5. El botó Pista proposa un moviment real que forma part d'una solució. Desfés torna una jugada enrere, i Ctrl+Z també funciona.

Sense cronòmetre ni compte. Les estrelles es guarden només al navegador amb localStorage (l'aplicació continua operativa si no és accessible). Sense imatges alienes ni dades de tercers.

## Arquitectura
- engine.js: motor pur de tauler, col·lisions, moviments, desfer, estrelles, desordenament determinista, cerca BFS de camí urbà i solver A* òptim.
- app.js: tauler DOM accessible amb clic, touch swipe i teclat, etiquetes de colors i lletres.
- styles.css: experiència responsiva.
- tests/bike-parking-puzzle.test.cjs: comprova els dotze nivells resolent-los amb A* fins a la victòria i valida límits i pistes.
- tests/bike-parking-puzzle-interactions.test.cjs: interacció del navegador simulada amb JSDOM.

Proves: npm ci && npm test

Prova local: python -m http.server 8000 i obre http://localhost:8000/bike-parking-puzzle/

## Limitacions
La dificultat es comprova matemàticament, però cal provar-la amb persones reals. Les bicicletes de càrrega de dues caselles, editor de nivells i repte diari són futures fases, no funcionalitats ja disponibles.

Inspiració general en mecàniques de puzle: Rush Hour, Parking Jam 3D i Parking Order!, sense copiar els seus nivells, marques ni gràfics. Seguiment: https://github.com/dfalip/bicipark/issues/64

## Puzzle City · Recorreguts fluids (novembre 2026)

- Toca una bicicleta i després qualsevol carrer connectat: el sistema calcula el recorregut mínim disponible, en respecta els obstacles i el fa avançar sense teletransportar-se.
- Les caselles es compten una a una; la cerca de camí no regala moviments ni permet passar el límit del nivell. Si el destí no és accessible, el joc ho comunica.
- Cada bicicleta s'orienta segons el carrer on circula; l'animació accelera i frena suaument sense rebot artificial. En mòbil i teclat es mantenen els controls originals.
- Pots interrompre el trajecte amb Escape o reiniciar el nivell amb seguretat; Ctrl+Z cancel·la el trajecte i desfà una casella. S'adapta a `prefers-reduced-motion`.
- Falta validar la sensació amb dispositius físics i usuàries reals. Són trajectes per caselles connectades, no conducció amb volant lliure ni mapes cartogràfics reals.
