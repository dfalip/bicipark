# BiciPark Modules

Principi: cada funcionalitat nova s'ha de poder modificar, substituir o eliminar sense afectar la resta de BiciPark.

Estructura:

modules/
  nom-modul/
    manifest.json
    index.html
    nom-modul.css
    nom-modul.js
    data/
    adapters/

Core compartit:
  js/core/bicipark-core.js

Regles:
1. Un modul no modifica directament el codi intern d'un altre modul.
2. La comunicacio es fa amb BiciParkCore.emit/on.
3. La integracio amb el mapa principal es fa amb adapters independents.
4. Les dades del modul viuen dins la seva carpeta.
5. Cada instal.lador crea backup.
6. Si un modul falla, la resta del site ha de continuar funcionant.