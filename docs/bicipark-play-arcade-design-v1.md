# BiciPark Play Arcade — estàndard de producte i disseny de RodaRumble
Data: 20 de novembre de 2026 · Especificació v1.0 · Estat: proposta de desenvolupament, NO funcionalitats publicades.

## 1. Model de referència i criteris obligatoris

ZombiePedal Arcade City (versió de producció a /zombiepedal/) és la referència d'identitat gràfica, densitat dels gràfics, controls visibles, resposta immediata, ritme i progressió. No és una plantilla de gameplay per copiar. Volem jocs originals amb personalitat pròpia, no un filtre de pixelació sobre prototips.

### Identitat de la col·lecció
- Escena principal en proporció 16:9 quan escaigui; pixel-art original amb una capa de fons, una capa de joc, primer pla i ombres. Els objectes interactius han de destacar del paisatge i de la decoració. Nit industrial, neu, ciutat i muntanya amb paletes pròpies.
- Interfície comuna: base #172126, panell #27363C, vores #758780, text #F2EBD7, or #F3CD78 i verd #93D4B3. Color temàtic per joc. Marcadors numèrics monoespaiats; text HTML llegible i no pixelat.
- HUD que respongui a l'estat real del motor, botons tàctils inequívocs, pantalles de pausa, resultat i reinici coherents, controls de volum i moviment reduït. No bloquejar el zoom del navegador.
- Controls de referència: ↑/W i ↓/S (direcció vertical o inclinació), →/D i ←/A (acceleració/potència), Espai (acció principal/salt), X/F (acció secundària), C (turbo/habilitat especial), P (pausa). Adaptar significat al gènere i mostrar-lo a la pantalla. Ratolí, teclat i tacte; evitar duplicar clicks o deixar una tecla premuda quan es perd el focus.
- Cada acció significativa ha de produir una conseqüència real i una resposta visual, i opcionalment sonora, coherent: salt, col·lisió, aterratge, encert, error, recompensa. No donar punts per animacions sense esdeveniment del motor.
- Progrés: rècord local per mode i versió, reptes, objectius i medalles comprensibles; una partida nova ha d'aportar una decisió nova. No barrejar puntuacions de motors diferents.
- Disseny llegible a 390 px i 1280 px; controls tàctils objectiu 44 px mínim; senyals no només de color; reduir partícules i sacsejada amb prefers-reduced-motion. No aplicar filtres a fotografies documentals ni mapes Leaflet.
- Art local i original; fotos geogràfiques reals amb autor, llicència, font i lloc verificat; cap recurs gràfic copiat. Funcions que ho permetin jugables sense connexió.
- Objectius de rendiment (a mesurar, no certificats): 60 FPS en escriptori de referència, únicament si el dispositiu ho permet, i 30 FPS mínim sostinguts al dispositiu mòbil de proves que es documenti. Fallback de partícules, cap bucle sense límits; simulació determinista de pas fix.

### Matriu de jocs i criteris específics
| Joc | Evolució arcade prevista | Es conserva | Prioritat |
|---|---|---|---|
| ZombiePedal | Districtes, nous enemics amb avisos, varietat, combos, animacions i ajust de dificultat | 3 carrils, salts, pintura, turbo, modes i medalles | Manteniment de referència |
| RodaRumble | Scrapyard Arena: llançament expressiu, reaccions en cadena, rebot, modes ràpids, objectius i medalles | Motor, tres rodes, 10 nivells i controls alternatius | P1 |
| BikeJump | Circuit lateral continu, rampes, salts, 360° endavant/enrere, acrobàcies, caigudes i turbo | Llançaments i reptes existents; edició nova separada fins a la validació | P1 |
| SnowBike Downhill | Bosc, glacera, muntanya, animals/yetis amb comportaments, acceleració, salts i esquiva | Pistes, controls i reptes | P2 |
| BikeJump Ride | Fantasma personal, sectors amb temps, salts i trucs millorats, rècords | Circuit, checkpoints, puntuació actual | P2 |
| Puzzle City | Ciutat pixel-art vista superior, animacions contínues pels carrers, barris i nous trencaclosques | Regles, solver i moviments comptats | P3 |
| Bike Cannon | Llançament amb feedback, objectius, monedes i aterratges visuals | Física, destinacions reals i modes | P3 |
| GeoSprint | Reptes amb temps i dificultat, més llocs, mapa real | Veracitat de dades i sistema de distància | P3 |
| On és això? | Fotos reals, nivells progressius, punts de referència, fallada de foto sense penalització | Coordenades, fonts i autoria | P3 |
| Drag Map Game | Reptes amb feedback, pistes graduals i puntuació clara | Mapes i coordenades reals | P3 |
| Joc 3 clics | Progressió ràpida, feedback per intent i repte diari | Tres intents, zoom i mapa real | P3 |

## 2. RodaRumble Arcade — Scrapyard Arena

### 2.1 Punt de partida verificat al repositori
Motor actual: roda-rumble/engine.js, 10 nivells artesanals; posició de llançadora x158/y389 en món virtual 1000×560; 4–6 tirs segons nivell; rodes martell, pols i trepant; fusta, vidre i acer amb HP, massa i restitució del rebot; robots-objectiu; bidons amb reacció en cadena; partícules, anells d'impacte, ona expansiva, predicció del primer cop; estrelles segons rodes sobrants. El motor fa subpassos de 1/120 s, limita la durada de tir a 5,15 s i encara té una transició manual entre rodes. El combo incrementa alguns punts de destrucció, però es reinicia a cada tir. La puntuació actual es conserva com a modalitat clàssica; cap comparació directa amb la puntuació del mode arcade.

### 2.2 Direcció visual exacta
- Nom de treball: **RODARUMBLE · SCRAPYARD ARENA**. Escenari de joc lateral, llançadora visible a l'esquerra, torres de ferralla i robots a la dreta, espai central de trajectòria. Conservar càmera estable i evitar que la decoració amagui la geometria de col·lisió.
- Pixel art a resolució lògica 500×280 (factor 2 respecte al món intern) amb ampliació nearest-neighbor. Sprites originals d'acer, fusta, vidre, pneumàtics, robots, bidons i llançadora; no només downsampling. Fons industrial amb finestres, pilars, grues, canonades i cadena de muntatge; tres capes de profunditat i animació ambiental lenta. Paleta base #172126 / #34454A / #706F61; accents or #F3CD78, taronja #D98750, blau #85C9DF. Robot objectiu amb ulls grocs i contorn fosc; bidó amb senyal gràfic d'energia; acer amb rivets, vidre amb reflexos geomètrics, fusta amb vetes.
- Animacions: roda girant segons velocitat real i deformació breu visual en impacte (no modifica hitbox), robots amb parpelleig i reacció quan el seu suport cau, pols quan aterra una peça, fragmentació per material quan es trenca. Impacte de 80–150 ms de resposta, text flotant de 0,6–1 s, anell d'ona de 0,4–0,65 s. Shake curt limitat a 5 px lògics; desactivar-lo en moviment reduït; efectes mai han de tapar objectius.
- Predicció amb punts i marcador del primer impacte, sense prometre rebot exacte quan hi ha estructures mòbils. Feedback de força i angle mentre s'apunta.
- So opcional sense música copiada: metall, vidre, fusta, turbo, combo i jingle d'èxit diferenciats. Sense parpelleig intens.

### 2.3 HUD i controls
Capçalera: nom d'arena, nivell, mode i rellotge (només modes amb temps). Sis marcadors compactes: RODES 4/4, ROBOTS 0/3, PUNTS 00000, COMBO ×0, REBOTS 0, MILLOR MARCA. Al vol, barra de combo amb compte enrere, icona de roda seleccionada i càrrega especial DISPONIBLE/UTILITZADA. Etiqueta del material tocant i punts reals. A sota de l'escena: avís breu del motor, controls tàctils grans amb tecla de drecera. Resultat: robots, precisió, rebots útils, cadena màxima, puntuació desglossada, estrelles/medalles, repetir o avançar.

Controls: ↑/W i ↓/S augmentar/disminuir angle; →/D i ←/A augmentar/disminuir potència; Espai llançar, o següent roda si no s'ha carregat; X/F canviar tipus de roda disponible abans del tir (futura edició) i activar l'habilitat alternativa quan sigui pertinent; C especial de la roda en vol; P/Escape pausa. Mantenir arrossegar/deixar anar, sliders accessibles i compatibilitat amb el comportament antic d'Espai en vol en mode clàssic. No disparar en pointercancel, no accelerar cap temps de simulació durant pausa. A l'arcade, càrrega automàtica següent roda després de ~0,5 s d'estabilització; a precisió i clàssic es pot controlar manualment.

### 2.4 Mecàniques i economia arcade (nous modes, no alterar clàssic)
1. Manté la llançadora i el rebot físic per angle/material. Nous elements en nivells nous: placa de cautxú de rebot alt amb direcció visible, plataforma mòbil amb trajecte i avís predictible, bidó de reacció, pont susceptible de perdre suports. Preparar materials i tests abans d'afegir elements al motor. No introduir rebot màgic il·limitat ni impuls durant contactes que ja se separen.
2. Més control durant vol: C activa un únic especial per roda (martell: cop; pols: ona; trepant: perforació). En mode arcade permet triar entre el parc de rodes abans de cada tir; no més rodes que les que corresponen al nivell.
3. Cadena basada en esdeveniments: comptar destrucció de bloc, robot, bidó i impacte significatiu contra peça distinta; cada entity ID s'atorga una sola vegada per tipus d'esdeveniment. Els contactes repetits amb terra o paret no generen puntuació. Reinici de combo després de 2,5 s sense acció qualificada, pausa congela el rellotge. Multiplicador proposat: ×1, ×1,5, ×2, ×2,5, ×3 a 1, 3, 5, 8 i 12 esdeveniments. Mostrar combo i multiplicador com a dades diferents.
4. Punts base nous modes: bloc 85/110/140 segons material, robot 650, bidó 350; rebot útil contra entitat distinta +40 (màxim 5 per tir), bonificació final 300 per roda restant. Aplicar multiplicador als esdeveniments qualificats, arrodonir cada recompensa i guardar desglossament. No donar punts per l'efecte visual dels mateixos impactes. Validar i ajustar després de simulacions i playtest.
5. Feedback real: missatge «REBOTS ×3», «CADENA ×5», «PRECISIÓ», «DEMOLICIÓ» només quan la condició real sigui satisfeta. Les caigudes i les reaccions en cadena han de continuar fins a l'estabilització segura de les peces, amb límit de simulació; evitar tallar un robot que cau al final del tir, o atorgar victoria abans d'acabar el nivell de precisió.
6. Ritme: objectiu de ronda 30–90 s (a calibrar) i retorn ràpid després de fallar. Botó reinicia, repetir el mateix nivell/seed, següent nivell. L'efecte de celebració no bloqueja el control innecessàriament.

### 2.5 Modes i nivells
- **Campanya arcade**: adaptar els 10 nivells existents, conservar geometria base i objectius quan sigui possible; 4 nivells addicionals només quan s'hagin verificat solucions: 11 Rebot de cautxú, 12 Plataformes mòbils, 13 Doble cadena, 14 Fortalesa de la grua. El nivell 10 ja existent és cap final de la secció original.
- **Atac ràpid**: 60 s, 8 rodes com a paràmetres inicials, petits escenaris validats que es renoven després d'esborrar tots els objectius; acabar en esgotar el temps o les rodes; cap puntuació artificial després de pausa.
- **Precisió**: 3 escenaris deterministes amb 1–3 rodes, objectiu real i rècord independent. Pensar l'angle abans de disparar, sense pressió de temps. No reutilitzar resultats entre modes.
- Nivells 1–3: tutorial progressiu (material fràgil, acer i bidons). 4–6: estructures i habilitats. 7–10: cadenes i fortaleses. 11–14: nous comportaments, introduïts un a un. Cada giny necessita més d'una solució raonable quan sigui possible.
- No anunciar mode/nivell com a fet abans de publicar-lo; requisit mínim: un recorregut solucionable amb recursos per cadascun, regressió de la resta, controls accessibles i càrrega funcional.

### 2.6 Progressió
Tots els nivells clàssics continuen accessibles; campanya arcade desbloqueja la següent fase en completar una arena, amb possibilitat de repetir les anteriors. Tres estrelles: completar amb ≥2 rodes sobrants; dues amb una; una amb cap. Medalles locals proposades (cadascuna condició provable): Primer robot; 3 rebots útils en un tir; 5 destruccions en cadena; 2 bidons en el mateix tir; perfecte (completar sense gastar més d'una roda, en un nivell validat per fer-ho); 10 arenes. Desbloqueigs cosmètics (colors de roda, llançadora) no alteren física. Guardar a localStorage versionat per modalitat; dades anteriors preservades; tolerar localStorage inaccessible.

## 3. Full de ruta executiu i portes de publicació

| Fase | Entrega | Condició de tancament |
|---|---|---|
| 0. Convergència | Resoldre PR #105 amb #106: no recuperar clàssic ZombiePedal; validar estils i rutes | CI i navegador verds al HEAD i producció verificada |
| 1. Scrapyard visual | Sprites originals, arena industrial, HUD, efectes, controls, pausa i so | Es veu i juga a Chromium desktop/mòbil, inputs actius i sense errors; motor clàssic intacte |
| 2. Game feel | Registre d'esdeveniments, cadenes, combo, efectes per material i recàrrega ràpida | Proves de rendiment i puntuació sense doble còmput; rebot sense jitter; totes les arenes originals solucionables |
| 3. Modes arcade | Atac ràpid, precisió, desbloqueigs, rècords versionats i nous nivells validats | Sessions deterministes, temps/punts/estrelles correctes i QA de modes |
| 4. BikeJump i SnowBike | BikeJump lateral amb salts i tombarelles, controls ZombiePedal; SnowBike arcade específic | Aterratges, col·lisions, combos, tacte i proves completes |
| 5. Catàleg sencer | BikeJump Ride, Puzzle, Cannon i Geo | Edicions reals per joc, no només CSS; fotos/mapes autèntics, feedback i progressió apropiats |

En cada entrega: branca específica, PR, CI del repositori, proves de motor i interaccions, navegador Chromium 390 i 1280, captures reals i comprovació visual pròpia quan possible, regles de moviment reduït i accessibilitat, preview Vercel al SHA final, merge només si gates satisfets, verificació d'àlies de producció i URL pública. Tests de col·lisions, límits, puntuació, pause/resume, repetició, clic/tacte/teclat, modes i persistència. Validar que no hi ha dependències de xarxa innecessàries. El playtest humà i les mesures sobre dispositius físics es declaren pendents quan no s'han fet, sense confondre smoke tests amb qualitat comercial.

## 4. Decisions i abast
Aquesta especificació proposa art, valors de puntuació i durades inicials; no són constants definitives ni resultats mesurats. La PR #105 encara està oberta i amb conflictes a la data de revisió; ZombiePedal modern és l'única edició pública a main (#106). No bloquejar la resta de treball de BiciPark: ampliació de rutes, Bike Bases i mapes reals continua de manera independent. Prioritzar el que es pugui publicar i provar; no recrear motors existents ni desactivar les versions anteriors fins que hi hagi un substitut validat (ZombiePedal clàssic roman ocult). No dependre de validació rutinària de l'usuari. Mantenir un registre de decisions, canvis reals, proves i desplegament verificat.
