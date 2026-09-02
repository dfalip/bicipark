# BiciPark Live Conditions

MVP modular per avisos i estat de ruta.

Fitxers:
- manifest.json
- index.html
- live-conditions.css
- live-conditions.js
- data/conditions-demo.json
- adapters/

Regles:
1. No modifica mapa-ciclista.js.
2. Els avisos inicials son demo.
3. Els reports locals es guarden en localStorage.
4. La integracio amb el mapa principal es fara des d'adapters/.
5. Un backend futur podra substituir localStorage sense tocar el mapa principal.