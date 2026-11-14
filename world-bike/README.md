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

- **No és una infraestructura de producció mundial.** El prototip consulta primer `overpass.private.coffee`; si falla, pot consultar `overpass-api.de` només després que l'usuari premi explícitament el botó alternatiu. Tots dos són servidors públics compartits, sense SLA ni garantia de capacitat. Un portal mundial amb audiència significativa requereix un proveïdor adequat o una infraestructura pròpia.
- Límits locals: radi màxim 1,2 km, consulta per acció explícita (botó de cerca, categoria o GPS), 12 s de temps al servidor, 16 s de timeout client, màxim 150 registres, pausa de 20 s entre peticions noves i almenys 30 s després d'un 406/429, memòria de 12 consultes en sessió, sense reintents automàtics.
- La pausa al navegador és **per client**, i el gateway afegeix cache CDN de resposta i control de concurrència per instància. Això continua sent insuficient per a producció mundial: cal proveïdor contractat o backend amb quotes agregades, mètriques i cache compartida.
- La capa de mapa utilitza tesel·les d'OSM amb atribució. Política: https://operations.osmfoundation.org/policies/tiles/
- Els POIs OSM són ODbL i requereixen atribució i, segons la reutilització, condicions de compartició. https://www.openstreetmap.org/copyright
- No inclou geocodificació per nom ni cerca automàtica. Nominatim públic no és adequat per a cerca global escala sense respecte als límits d'1 req/s agregada i prohibició d'autocompletar: https://operations.osmfoundation.org/policies/nominatim/
- El mapa pot mostrar al proveïdor el fragment que visites. El GPS només es demana per acció explícita del navegador. La cerca envia el centre consultat al servei Overpass escollit. L'operador de `Private.coffee` publica les seves condicions i política de privacitat a https://overpass.private.coffee/.
- No es consulten dades si l'usuari no fa la cerca. Les coordenades aproximades sí travessen el gateway i poden quedar en registres tècnics de l'allotjament; no es guarden en una base de dades de l'aplicació.

## Provar localment

Des de l'arrel del projecte:

```bash
python -m http.server 8000
```

Obre `http://localhost:8000/world-bike/` (amb connexió a Internet).

```bash
npm test
```


## Capa API pròpia (increment del 14/11/2026)

Per evitar peticions directes entre el navegador i Overpass, s'ha creat el **gateway del mateix origen** `/api/world-bike` (Vercel Functions, `api/world-bike.js`). La vista web fa un GET només en resposta a una acció explícita. El gateway:
- valida latitud/longitud, arrodoneix a 3 decimals i limita a un radi de 900 m i 150 registres;
- envia la consulta a una de dues fonts Overpass allowlisted, escollides per clau; **mai** admet URLs arbitraris;
- limita el temps, descarta respostes mal formades o excessivament grans i retorna errors estructurats, sense convertir-los en una llista buida;
- serveix respostes correctes amb cache HTTP de 10 minuts per a CDN i evita consultes simultànies idèntiques a la mateixa instància;
- manté les fallades recents per zona i proveïdor 30 s en memòria d'instància. La caché i limitació **no** són agregades entre instàncies ni són una garantia de disponibilitat.
- no reintenta consultes automàticament. L'usuari pot provar manualment l'altra font.

**Privacitat:** el navegador arrodoneix la ubicació a tres decimals abans d'enviar-la a BiciPark (aprox. 100 m en latitud). BiciPark envia aquestes coordenades arrodonides al proveïdor Overpass. No hi ha una base de dades de localitzacions del joc, però el GET pot constar als registres tècnics del proveïdor d'allotjament/CDN. No se'n pot afirmar retenció nul·la sense revisar els controls reals de Vercel. L'ús de GPS requereix consentiment del navegador.

**Gate imprescindible:** abans de producció, prova real del gateway en navegador i des de la regió desplegada, amb proves de dades per diverses ciutats, model de quotes compartides, protecció contra abús, cache agregada i política de privacitat. La CI amb mocks **no** ho demostra.

## Release gates obligatoris

1. Proves en navegador real: consulta de zona sense dades, zona amb dades, errors 400/406/429/503/504/CORS, GPS denegat, canvi manual a servidor alternatiu, missatge persistent en moure el mapa, retorn de dades mal formades, mobile/touch i teclat.
2. Proveïdor Overpass adequat per producció, cache compartida, control d'ús global i cost sota control. **Sense això, no integrar al catàleg públic.**
3. Política de privacitat, procedència i termes ODbL/atribució visibles en quatre idiomes.
4. Comprovació amb rutes i mapes existents per evitar solapament/confusió.

Aquest pilot té utilitat potencial a qualsevol lloc però **no promet cobertura completa enlloc**; només mostra dades que OSM hagi registrat en la petita zona consultada.
