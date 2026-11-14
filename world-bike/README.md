# BiciPark World · pilot de serveis ciclistes mundials

Prototip independent, **no publicat ni enllaçat a la navegació principal**, per validar un nou camí de descoberta de serveis ciclistes en qualsevol punt del planeta amb dades comunitàries OpenStreetMap.

## Flux

1. L'usuari mou el mapa a qualsevol lloc del món, toca el mapa per seleccionar una zona, o demana explícitament una cerca GPS amb **Cerca serveis a prop meu**.
2. **Buscar al centre** consulta el radi de 900 m sense requerir cap zoom previ; si cal, el joc apropa el mapa automàticament.
3. Prémer un filtre de categoria (Aparcament, Aigua, Reparació...) **inicia la consulta** si encara no existeixen dades de l'àrea; si ja existeixen, només filtra les dades locals.
4. **Cerca serveis a prop meu** sol·licita GPS i, si l'usuari l'autoritza, centra el mapa i consulta un radi de 900 m a Overpass. L'acció i l'enviament de coordenades s'expliquen a la interfície.
5. Es mostren fins a 150 registres amb enllaços a la fitxa OSM, marca sobre el mapa, categoria i l'estat **no verificat in situ**. Sense consultes automàtiques per navegar, ni reintents silenciosos.

Categories OSM: `amenity=bicycle_parking`, `bicycle_repair_station`, `drinking_water`, `bicycle_rental` i `shop=bicycle`. Les categories i les etiquetes de nom poden ser incompletes o incorrectes. L'absència de resultats **no implica** absència de serveis reals. El sistema no inventa places, disponibilitat, horaris ni propietats.

## Restriccions del pilot

- **No és una infraestructura de producció mundial.** L'endpoint públic de `overpass-api.de` està compartit, sense SLA ni garantia de capacitat, i NO s'ha d'utilitzar com a backend de BiciPark quan hi hagi una audiència significativa.
- Límits locals: radi màxim 1,2 km, consulta per acció explícita (botó de cerca, categoria o GPS), 12 s de temps al servidor, 16 s de timeout client, màxim 150 registres, pausa de 20 s entre peticions noves i almenys 30 s després d'un 406/429, memòria de 12 consultes en sessió, sense reintents automàtics.
- La pausa és **per client**, no per conjunt de visitants. És insuficient per a producció a escala: cal un backend propi o proveïdor contractat amb quotas, límits globals, mètriques, política d'errors, cache compartida i respecte a la llicència.
- La capa de mapa utilitza tesel·les d'OSM amb atribució. Política: https://operations.osmfoundation.org/policies/tiles/
- Els POIs OSM són ODbL i requereixen atribució i, segons la reutilització, condicions de compartició. https://www.openstreetmap.org/copyright
- No inclou geocodificació per nom ni cerca automàtica. Nominatim públic no és adequat per a cerca global escala sense respecte als límits d'1 req/s agregada i prohibició d'autocompletar: https://operations.osmfoundation.org/policies/nominatim/
- El mapa pot mostrar al proveïdor el fragment que visites. El GPS només es demana per acció explícita del navegador. La cerca envia la coordenada al servei Overpass.
- No es carreguen dades si l'usuari no fa la cerca. Cap persistència de localització al servidor BiciPark.

## Provar localment

Des de l'arrel del projecte:

```bash
python -m http.server 8000
```

Obre `http://localhost:8000/world-bike/` (amb connexió a Internet).

```bash
npm test
```

## Release gates obligatoris

1. Proves en navegador real: consulta de zona sense dades, zona amb dades, error 429/504/CORS, GPS denegat, retorn de dades mal formades, mobile/touch i teclat.
2. Proveïdor Overpass adequat per producció, cache compartida, control d'ús global i cost sota control. **Sense això, no integrar al catàleg públic.**
3. Política de privacitat, procedència i termes ODbL/atribució visibles en quatre idiomes.
4. Comprovació amb rutes i mapes existents per evitar solapament/confusió.

Aquest pilot té utilitat potencial a qualsevol lloc però **no promet cobertura completa enlloc**; només mostra dades que OSM hagi registrat en la petita zona consultada.
