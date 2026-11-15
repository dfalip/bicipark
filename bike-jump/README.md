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

## Cinemàtica 3.1: vol, distància i impactes visibles

- **Càmera**: seguiment horitzontal i vertical interpolat, obertura de camp durant el vol i decoració llunyana amb parallax. El zoom només afecta el dibuix; les dades de distància continuen sortint de la física original (`distanceScale`).
- **Vol**: línies de velocitat, rodes animades, ombra projectada sobre la pendent amb traç guia, metres de distància i separació **aproximada** en el HUD, i un breu alentiment al punt més alt.
- **Caigudes**: `landingStory` classifica l'angle real del contacte (morro/enrere); `landingPose` anima rebot/suspensió, bicicleta que gira, pilot separat i partícules. La modal de resultat no es mostra fins que acaba la seqüència d'impacte.
- **Precisió**: el score i els metres oficials es congelen al primer contacte físic. L'animació posterior, el zoom, l'ombra i el pilot que surt projectat **no** alteren puntuació, física de col·lisió ni rècords.
- **Usabilitat**: avís «massa aviat / massa tard / sortida perfecta» derivat del mateix `idealTakeoffProgress`, i reinici que neteja tot l'estat de l'animació. `prefers-reduced-motion` elimina el sotrac de càmera i les animacions CSS repetitives.

Arquitectura: `cinematics.js` és un mòdul pur i determinista per als estats visuals; `app.js` integra el dibuix sense modificar les fórmules de punts; `tests/bike-jump-cinematics.test.cjs` i les proves d'interacció cobreixen caigudes, distància i transicions de resultats.

**Limitació explícita:** les escales, la suspensió i els efectes són arcade; no constitueixen un model de dinàmica de bicicletes real. Cal comprovar visualment Chrome Android, Safari iPhone, qualitat del dibuix de les tres pistes, 30–60 fps en dispositius modestos, controls tàctils i llegibilitat abans de considerar el joc visualment acabat.


## BikeJump — impuls aeri en mantenir premut (iteració següent)
Ara, després de fer el salt, pots **mantenir premut el ratolí sobre el canvas, l'espai, o el botó tàctil ✦** per prolongar breument el vol. En mode «dos tocs», també es pot **mantenir premut el segon toc de salt** perquè l'impuls s'activi de seguida quan la bici entra en vol. Deixar anar el botó conserva la reserva per utilitzar-la després del mateix salt. La reserva només dura **1,45 segons acumulats**, no es recarrega en vol i torna al 100% al proper intent.

- La gravetat efectiva baixa un 40% només mentre es consumeix energia; la resistència horitzontal baixa un 28% mentre està activa. No hi ha un impuls vertical infinit ni una teletransportació.
- La pista mostra el botó i la barra de reserva, amb percentatge i avís d'esgotament. Es veu el ciclista més recollit i un flux d'aire al voltant de la bici.
- Ratolí, tacte, tecles i controls de direcció es gestionen de forma independent. `pointerup`, `pointercancel`, pèrdua de focus i reinici alliberen l'acció. Les preferències de moviment reduït es respecten.
- La distància i la puntuació continuen calculant-se a partir de la trajectòria real del motor del joc. Aquest és un **impuls arcade deliberadament limitat**, no una simulació aerodinàmica realista.
- Proves: `tests/bike-jump-air-hold.test.cjs` i casos d'interacció a `tests/bike-jump-interactions.test.cjs`, cobrint benefici finit, gestos continuats, energia, solapament d'inputs i reinici.

Validació de qualitat pendent: provar sensació de control al mòbil i escriptori. Les proves automàtiques no garanteixen que el nou botó sigui prou còmode o que el joc sigui divertit per a tots els jugadors.
