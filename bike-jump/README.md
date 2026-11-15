# BikeJump — BiciPark Play

Mini-joc arcade original de salts amb bicicleta. No fa servir serveis remots ni dades de localització; els rècords són locals al navegador.

## Com jugar (v3.2)
1. Selecciona un circuit: **Alpine K90**, **Skyline Sprint** o **Red Canyon**.
2. Tria el **Repte** (3 salts) o **Pràctica** (salts il·limitats que no modifiquen els rècords).
3. El control predeterminat és **dos tocs**: un per iniciar el descens i un altre per saltar a la zona daurada. Opcionalment, activa **Mantén**.
4. Durant el vol, utilitza **← →** o els botons tàctils d'equilibri; els controls simultanis es combinen sense enganxar-se.
5. Després de cada aterratge, consulta el resultat i continua.

## Circuits i física
Els tres circuits són **ficticis**, amb geometries i ambientacions originals diferents: alpí, ciutat i canyó. Cada circuit té configuració pròpia de gravetat, temps de descens, pendent, resistència i vent. El primer circuit preserva la clau de rècord històrica `bicipark-bike-jump-high-score-v1`. Els altres guarden un rècord separat, amb sufix de l'identificador de circuit. Si `localStorage` no està disponible, el joc continua sense fallar i el rècord de la sessió roman en memòria.

## Puntuació
- Distància: fins a 5.000 punts.
- Sortida: fins a 1.000.
- Control: fins a 1.000.
- Aterratge: fins a 2.000.
- Penalització per caiguda: 2.500.

El **Repte** suma tres intents; la **Pràctica** mostra el resultat de l'últim salt, però mai suma al repte ni guarda nous rècords.

## Arquitectura
- `index.html`: escenari, controls i elements accessibles.
- `app.js`: gestió de modes, circuits, inputs, feedback i il·lustració Canvas.
- `levels.js`: definicions dels tres circuits ficticis.
- `physics.js`: física i puntuació comunes.
- `styles.css`: presentació i controls responsive.
- `tests/bike-jump-interactions.test.cjs`: simulació de controls, vols, canvi de circuits, rècords i fallades d'emmagatzematge.

## Validació
Des de l'arrel del repositori executa `npm test`. El CI cobreix la física, transicions de mode, salts de tots els circuits, aïllament dels rècords, entrades simultànies, alternativa accessible i error de `localStorage`.

Abans d'aprovar la qualitat visual final, comprova en Android, Safari i ordinador:
- La selecció de circuits i la seva il·lustració sense retalls al canvas.
- Els dos tocs i el mode Mantén, inclosa la zona òptima.
- El control tàctil de dues mans, teclat Tab/Enter/Espai i pèrdua de focus.
- Pràctica il·limitada i rècord de repte independent per circuit.
- Lector de pantalla: alt textual del Canvas, informació de progrés i resultats.
- Formats 320–430 px, 760 px i escriptori; moviment reduït.

La CI no equival a una prova física en dispositiu. Les dades de rendiment i satisfacció reals encara no estan acreditades.
