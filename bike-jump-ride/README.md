# BikeJump Ride — prototip jugable de circuit continu

Nou joc independent del BikeJump clàssic, accessible a `/bike-jump-ride/`. No modifica els rècords ni les fórmules del BikeJump de salts individuals.

## Mecànica

- **Circuit continu de 5.600 unitats** (equivalència visual aproximada a 1,2 km), amb 4 rampes grans, 4 barrancs i traçat que s'ha de recórrer fins a la meta.
- Acceleració i frenada amb → / D i ← / A; inclinar la bicicleta en vol amb ↑ / W i ↓ / S.
- Mantén Espai (o el botó SALT) per carregar l'impuls; deixa anar per fer un salt manual. També hi ha llançament automàtic al final de cada rampa.
- Càmera de seguiment suau, tres capes de muntanyes amb paral·laxi, rampes diferenciades, ombra de la bicicleta, anelles col·leccionables i indicadors de velocitat, distància, temps i progrés.
- **4 punts de control**: en cas d'accident, la bicicleta es veu caure i torna a l'últim checkpoint, amb penalització moderada de punts i sense reiniciar tota la cursa.
- Meta amb puntuació, temps, estrelles, resum i opció de tornar a jugar.
- Controls tàctils explícits, teclat i `aria-live` per informar d'incidències importants. Rècord local al navegador sense compte.
- No hi ha dependències noves, imatges de tercers, permisos especials, telemetria ni anuncis.

## Arquitectura

- `engine.js`: motor de física arcade determinista separat de Canvas. Geometria de rampes i buit, gravetat, aterratges, puntuació, checkpoints, salts i meta.
- `app.js`: estat de tecles i punters, bucle d'animació, càmera, escenari, HUD i pantalla de finalització.
- `styles.css`: aparença responsiva amb botons grans i compatibilitat amb preferència de moviment reduït.
- `tests/bike-jump-ride.test.cjs`: conducció, salts, quatre buits, recorregut complet accessible, checkpoint i puntuació.
- `tests/bike-jump-ride-interactions.test.cjs`: integració JSDOM amb el motor per comprovar controls i recorregut UI.

## Validació i limitacions

```bash
npm ci
npm test
python -m http.server 8000
```

Obre `http://localhost:8000/bike-jump-ride/`. El motor de col·lisions és arcade, no una simulació física d'una bicicleta real. La prova automàtica assegura que el recorregut es pot completar amb l'accelerador mantingut, però **no** demostra que el joc sigui divertit, que funcioni perfecte a 30 FPS o que el disseny visual sigui òptim. Cal provar-lo manualment en mòbil i escriptori i afinar dificultat, control, càmera i música. Primera versió: un circuit original, no els nous nivells promesos per a fases posteriors.
