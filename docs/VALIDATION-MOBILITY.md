# Validació abans de publicar

## Comprovacions automatitzades realitzades

- `npm ci` i `npm test`: 8 proves Node/jsdom (4 fluxos existents, 2 GPX, fitxa d'aparcament, exclusions del service worker i integritat del shell).
- GPX: segments separats sense afegir distància entre ells, XML segur, coordenades fora de rang, límit de mida, desnivell desconegut sense elevacions i export/import.
- Consulta real a BRouter per Barcelona: resposta HTTP 200 amb LineString i aproximadament 7,4 km. És una comprovació puntual de servei, no un SLA.
- Chromium: resposta capturada d'aquesta consulta per provar UI sense reiterar crides al proveïdor; càlcul, importació GPX, guardat, descàrrega GPX, 390 px sense overflow, instal·lació/activació del service worker, recàrrega offline dels aparcaments de Girona i obertura offline del GPX guardat.
- Els tests automatitzats bloquegen tessel·les públiques OSM; no representen una validació del mapa de fons en producció. Geolocalització física i instal·lació real al telèfon encara pendents.

## Prova manual en preview (10–15 minuts)

1. Obrir Aparcaments a Girona i Barcelona: mapa de fons visible, marcadors i font, canviar ciutat. Desconeguts etiquetats; cap ocupació o valoració inventada.
2. Guardar un aparcament, recarregar, filtrar favorits i prémer Com arribar. El destí ha de quedar preomplert al planificador.
3. Seleccionar origen i destí al mapa o donar ubicació; calcular amb els dos perfils. Revisar geometria. Tallar connexió abans d'un nou càlcul: error clar, sense ruta recta de substitució.
4. Importar un GPX propi, comparar distància amb l'origen, guardar, exportar i tornar a importar. Provar fitxer invàlid. Cap percentatge d'asfalt o carril bici inventat.
5. Compartir GPX al telèfon; si el navegador no admet compartir fitxers, es descarrega el GPX.
6. Instal·lar en Android des de la invitació del navegador. A iPhone: Compartir → Afegir a pantalla d'inici. Obrir icona i comprovar mode standalone.
7. Amb el worker actiu, visitar aparcaments i guardar un GPX. Tancar/reobrir sense xarxa: dades consultades/GPX disponibles, avís offline i absència prevista del mapa de fons.
8. Perfil Route Match → activar pla → registrar sortida → historial. En un navegador net, historial inicial buit.
9. Desplegar una versió següent amb VERSION de sw.js incrementada; tancar pestanyes de l'anterior i reobrir. Verificar que les dades personals locals persisteixen.

## Dependències que no s'han activat

No s'han creat compte/sync, push de Route Watch, comunitat compartida, registre públic QR/NFC ni analytics externs. Veure PRODUCT-BACKLOG.md per condicions d'entrada i acceptació. Aquesta branca no modifica producció fins a la integració/desplegament.
