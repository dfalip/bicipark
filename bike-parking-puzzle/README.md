# BiciPark Puzzle — Aparca-les!

Joc original de lògica sobre aparcament de bicicletes. **12 nivells en 4 capítols**: Inici, Cruïlles, Colls d'ampolla i Mestres del pàrquing.

## Com jugar
1. Selecciona una bicicleta identificada per una lletra i un color.
2. Mou-la una casella ortogonal amb un toc en una casella lliure contigua, un gest de lliscar o les fletxes. No es pot travessar una altra bicicleta ni un obstacle.
3. Aparca totes les bicicletes a les places amb la mateixa lletra i color abans d'esgotar els moviments.
4. El nombre mínim de moviments es calcula amb A* i heurística Manhattan. Sense pistes i amb el mínim guanyes tres estrelles.
5. El botó Pista proposa un moviment real que forma part d'una solució. Desfés torna una jugada enrere, i Ctrl+Z també funciona.

Sense cronòmetre ni compte. Les estrelles es guarden només al navegador amb localStorage (l'aplicació continua operativa si no és accessible). Sense imatges alienes ni dades de tercers.

## Arquitectura
- engine.js: motor pur de tauler, col·lisions, moviments, desfer, estrelles, desordenament determinista des d'un estat solucionat i solver A* òptim.
- app.js: tauler DOM accessible amb clic, touch swipe i teclat, etiquetes de colors i lletres.
- styles.css: experiència responsiva.
- tests/bike-parking-puzzle.test.cjs: comprova els dotze nivells resolent-los amb A* fins a la victòria i valida límits i pistes.
- tests/bike-parking-puzzle-interactions.test.cjs: interacció del navegador simulada amb JSDOM.

Proves: npm ci && npm test

Prova local: python -m http.server 8000 i obre http://localhost:8000/bike-parking-puzzle/

## Limitacions
La dificultat es comprova matemàticament, però cal provar-la amb persones reals. Les bicicletes de càrrega de dues caselles, editor de nivells i repte diari són futures fases, no funcionalitats ja disponibles.

Inspiració general en mecàniques de puzle: Rush Hour, Parking Jam 3D i Parking Order!, sense copiar els seus nivells, marques ni gràfics. Seguiment: https://github.com/dfalip/bicipark/issues/64
