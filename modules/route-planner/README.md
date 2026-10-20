# Planificador i GPX

Entrada: `/modules/route-planner/`. Destí preomplert opcional `?to=lat,lng` des d'aparcaments. Origen/destí per mapa, coordenades o geolocalització d'origen. No hi ha geocodificació textual en aquesta versió.

`planner.js` és el controlador de pantalla. `gpx.js` analitza, valida i serialitza GPX 1.1 (trkseg i rte), preservant segments. Els mòduls es registren a BiciParkCore; l'esdeveniment route-planner:displayed només inclou km i font, no coordenades. No hi ha analytics externs.

BRouter públic: `https://brouter.de/brouter` amb lonlats, profile trekking/fastbike, alternativeidx=0, format=geojson. Timeout 30 s, petició només després de prémer Calcula, sense recàlcul automàtic. Servei de millor esforç: errors visibles, no ruta recta simulada. Cal decidir proveïdor amb SLA abans d'escalar. Les coordenades es transmeten al proveïdor en calcular.

Distància geodèsica del traçat; desnivell positiu estimat a partir de les elevacions sense suavitzat, susceptible de soroll GPS. Si falten elevacions, es mostra desconegut. No s'infereixen asfalt, carrils bici, dificultat ni seguretat. Límit 10 MB, 100.000 punts, 30 rutes en localStorage `bicipark.planner.routes.v1`. Gestió de manca d'espai i dades malmeses; exportar GPX és la còpia portable, no una sincronització.

Leaflet 1.9.4 i MarkerCluster 1.5.3 distribuïts a vendor amb llicència. Mapes OSM en línia: no descàrrega massiva ni cache offline de tessel·les.

Referències: https://github.com/abrensch/brouter ; https://brouter.de/brouter/online.html ; https://operations.osmfoundation.org/policies/tiles/ ; https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
