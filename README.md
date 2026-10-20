# BiciPark

Web modular de rutes, aparcaments, Bike Bases, missions i plans ciclistes.

## Execució local

Des de l'arrel del projecte:

```sh
python -m http.server 8000
```

Obre `http://localhost:8000/`. No cal compilar el web. Els mapes requereixen connexió per carregar Leaflet i les tessel·les.

## Fluxos principals

- `aparcaments.html`: cerca, ciutats, proximitat, favorits i carrils bici; reutilitza `app.js` i `cities.json`.
- `mapa-ciclista.html` → `modules/route-detail/?route=carretera-aigues`: mapa i detall de ruta.
- `modules/route-match/`: perfil, recomanacions calculades i proposta setmanal.
- `modules/my-plan/` i `modules/activity-history/`: pla i activitats registrades.

Perfil, pla, favorits i historial es desen en el navegador amb les claus existents de `localStorage`. No se sincronitzen entre dispositius. Les condicions de demostració i el tag simulat no equivalen a un servei comunitari ni a detecció Bluetooth real.

## Validació

```sh
npm ci
npm test
```

Les proves Node + jsdom comproven estabilitat del botó de registre, identificació de rutes, càrrega de ciutats, favorits, proximitat, recomanacions i persistència del pla. Leaflet i la geolocalització estan simulats en aquestes proves; no substitueixen una comprovació visual en navegador.

Abans de publicar, comprova també en escriptori i mòbil: mapa, cerca, registre d'una sortida, historial, canvi de perfil i navegació. GitHub Actions executa les proves en pushes i pull requests.

## Desenvolupament i publicació

Segueix les regles de `modules/README.md`: mòduls independents i integracions explícites. Treballa en una branca i revisa la pull request abans d'integrar a `main`. La configuració del desplegament de bicipark.com es gestiona fora d'aquest repositori; un merge pot activar el desplegament segons la configuració del proveïdor.
