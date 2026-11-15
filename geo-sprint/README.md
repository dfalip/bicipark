# GeoSprint · BiciPark Games

Joc educatiu de cinc rondes. Busca ciutats de cinc continents diferents en un mapa mundial; com més a prop del centre aproximat, més punts.

## Què inclou

- 37 ciutats reals, repartides entre sis continents habitats, sense generar noms ni coordenades fictícies.
- Cinc rondes, sense límit de temps; pista de continent + país amb penalització del 20 %.
- Puntuació proporcional a la distància geodèsica calculada amb Haversine, fins a 1.000 punts per ronda.
- Dues maneres de respondre: tocar el mapa o moure'l i marcar el centre (alternativa per teclat).
- Rècord local del navegador; no hi ha classificació en línia ni dades personals al servidor.
- CA/ES/EN/FR; nom de país localitzat mitjançant `Intl.DisplayNames`.
- Mapa de tesel·les OpenStreetMap, amb atribució visible. Coordenades de centres urbans **aproximades**, no adreces ni POIs ciclistes.
- Vincle a OpenStreetMap per explorar la ciutat després de la resposta.

## Provar en local

Des de l'arrel de BiciPark:

```powershell
python -m http.server 8000
```

Obre `http://localhost:8000/geo-sprint/`.

## Validacions

```bash
npm test
```

La CI comprova dades geogràfiques, diversitat de continents, puntuació, sintaxi JS i contracte mínim de la UI. Abans de publicar cal revisar una partida completa en escriptori i en mòbil, els quatre idiomes, navegació amb teclat, permisos/atribució del mapa i degradació en cas de fallida de la xarxa. Les proves de codi no són prova de jugabilitat.

## Llicències i límits

- Les coordenades de ciutat són un conjunt manual petit i aproximat només per jugar; no afirmen cobertura de rutes, carrils o serveis.
- Les tesel·les de `tile.openstreetmap.org` són d'ús compartit; respectar-ne política d'ús i cache, sense descarregar-les massivament: https://operations.osmfoundation.org/policies/tiles/
- No utilitza l'API de cerca Nominatim ni Overpass.
- Si BiciPark creix substancialment, cal un proveïdor de mapes amb capacitat adequada o infraestructura pròpia.

## Línia de producte

GeoSprint és un primer joc global, no substitueix BikeJump ni les missions amb GPS. Propera iteració: proves reals d'UX, modes curts i classificacions locals opt-in, amb més varietat geogràfica documentada.
