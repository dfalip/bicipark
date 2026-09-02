# BiciPark Route Intelligence v1

Objectiu:
- Fer explicables els scores de ruta.
- Combinar només dades disponibles.
- No inventar cap senyal absent.

Pesos inicials:
- Seguretat: 24%
- Qualitat: 20%
- Meteorologia: 20%
- Incidencies: 14%
- Bike Bases: 10%
- Highlights: 7%
- Popularity local: 5%

Regla important:
- Els factors sense dades NO compten al denominador.
- El score es repondera entre els factors disponibles.

Fonts:
- known-routes.json: scores base de les 3 rutes principals.
- Open-Meteo: meteorologia actual.
- localStorage Popularity: activitat local.
- Bike Bases / Highlights / Live Conditions: es llegeixen si existeix un dataset compatible.

Integracio futura:
- adapter per Route Explorer
- adapter per fitxa de ruta
- resum Route Score al mapa principal

En aquesta v1 NO es modifica mapa-ciclista.html.