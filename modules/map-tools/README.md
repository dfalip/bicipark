# BiciPark Map Tools

Gestor visual de capes modulars del mapa principal.

Objectiu:
- Evitar un control flotant independent per cada modul.
- Mantenir cada funcionalitat completament separada.
- Permetre afegir Weather, Heatmap i altres capes sense saturar el mapa.

V1:
- Highlights
- Live Conditions
- Bike Bases com a referencia (manté el seu control propi)
- Placeholders Weather i Popularitat

Map Tools NO conté la logica de Highlights ni Live Conditions.
Només crida les APIs publiques dels adapters.