# BiciPark Route Detail 360

Modul independent per mostrar la fitxa completa d'una ruta.

## URL

- `/modules/route-detail/?route=carretera-aigues`
- `/modules/route-detail/?route=front-maritim`
- `/modules/route-detail/?route=riu-besos`
- `/modules/route-detail/?route=volta-integral-collserola`

## Fitxers

- `index.html`
- `route-detail.css`
- `route-detail.js`
- `data/routes.js`

## Connexions

La fitxa enllaca amb:

- Route Match
- Weather Route
- Live Conditions
- Highlights
- Bike Bases
- Popularity
- Missions

No duplica el codi d'aquests moduls.

## Geometria

El carregador prova fitxers GeoJSON, GPX i KML locals.
Si una ruta no te geometria disponible, la fitxa continua funcionant i ho indica.