# BiciPark Popularity v1

Objectiu:
- Mesurar interaccions reals dins del propi BiciPark.
- Construir un heatmap local sense inventar dades.
- Preparar l'arquitectura per a un backend comunitari futur.

Puntuacio v1:
- Veure ruta: 3 punts
- Obrir Meteorologia: 2 punts
- Altres interaccions preparades: 1 punt

Storage:
- localStorage
- clau: bicipark.popularity.events.v1

Integracio:
- Route Explorer carrega adapters/route-explorer-tracker.js
- El mapa principal encara NO es modifica.
- La futura capa Map Tools es fara amb adapters/main-map-adapter.js