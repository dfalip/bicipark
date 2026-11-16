# SnowBike Downhill — descens alpí

Joc arcade original de BiciPark Play. El protagonista condueix una **bicicleta equipada amb esquís** per pistes de neu; l'objectiu és completar un descens contrarellotge sense sortir de la traçada, passar per les portes d'eslàlom i esquivar animals que travessen la pista.

## Funcionalitats V1

- 4 circuits diferents (Pirineus, Alps, Dolomites, Cim del Món) amb distància, dificultat, nombre de portes, animals i par de temps progressius.
- Vista superior en Canvas amb pista sinuosa, decoració alpina, banderes vermelles/blaves, bicicleta d'esquí i animals amb moviment lateral.
- Controls: ← → dirigir, ↓ posició aerodinàmica més ràpida però amb menys capacitat de gir, ↑ frenar, espai turbo. Botons tàctils equivalents i botó de pausa.
- Tres vides. Col·lisió amb animal: penalització +5s, una vida menys i frenada; animal il·lès. Porta fallada: +3s. Porta perfecta: puntuació +250 i energia turbo.
- Cronòmetre amb penalitzacions, velocitat, distància recorreguda, portes, energia turbo, punts, estrelles i millors temps guardats només al navegador.
- Possibilitat de repetir o avançar de pista; les pistes són obertes des del principi per no frustrar.

## Verificació

- Motor de joc pur a `engine.js`: generació determinista de quatre pistes, moviment lateral de fauna, controls, col·lisions, turbo, rellotge i resultats de cursa.
- `tests/snowbike-downhill.test.cjs`: integritat de pistes, control, obstacles, penalitzacions i capacitat d'acabar.
- `tests/snowbike-downhill-interactions.test.cjs`: JSDOM amb Canvas simulat per als controls, canvi de fase, record i finalització.
- Executar `npm test` a l'arrel del repositori i provar localment amb `python -m http.server 8000` a `/snowbike-downhill/`.

## Abast honest

És una experiència **arcade**, no una simulació de baixada real amb GPS ni una pista basada en dades topogràfiques. La fauna és animada i no es pot ferir. La dificultat física i la resposta dels controls tàctils requereixen proves manuals en mòbils reals. Les pistes no són trajectes geogràfics verificats.

No s'han afegit dependències externes ni dades personals.
