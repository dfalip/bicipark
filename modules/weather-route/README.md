# BiciPark Weather Route

Modul independent de meteorologia per ruta.

V1:
- Seleccio de ruta.
- Data i hora.
- Open-Meteo sense API key.
- Temperatura mitjana.
- Probabilitat de pluja.
- Vent mitja i maxim.
- Efecte del vent segons el sentit de cada tram.
- Weather Score.
- Millors hores del dia.

Arquitectura:
- El modul no modifica mapa-ciclista.js.
- El modul no modifica Route Explorer.
- La integracio futura es fara a adapters/.
- Els punts de weather-routes.json son punts de mostreig meteorologic,
  no substitueixen la geometria oficial de les rutes.