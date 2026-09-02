# BiciPark Route Match / Pla ciclista personal

## Objectiu

Implementar el mockup aprovat sense perdre fidelitat visual.

## Estrategia visual

La pantalla utilitza exactament el PNG del mockup aprovat com a capa visual.
Per sobre s'afegeix una capa transparent d'interaccio.

Aixo permet:
- conservar el disseny al 100%
- canviar la logica sense tocar la imatge
- evolucionar posteriorment cap a components HTML reals sense perdre la referencia

## Arquitectura

modules/route-match/
  index.html
  route-match.css
  route-match.js
  manifest.json
  assets/
    route-match-approved-mockup.png
  data/
    routes.json
  engine/
    profile-store.js
    match-engine.js
    training-plan-engine.js

## Funcions v1

- Perfil ciclista persistent en localStorage
- Objectius:
  - Millorar
  - Incrementar dificultat
  - Passejar
  - Preparar repte
- Match engine inicial
- Pla basic d'exercicis
- Activar pla
- Ajustar perfil / objectius
- Acces a Mapa, Rutes, Bike Bases i Missions
- Hotspots transparents sobre el mockup aprovat

## URL

http://localhost:8000/modules/route-match/

## Important

Aquesta v1 es "visual-first".
La imatge aprovada es considera la font visual de veritat.
La logica ja esta separada per moduls per poder-la ampliar sense afectar la presentacio.