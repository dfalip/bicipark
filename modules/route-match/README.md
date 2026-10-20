# Route Match

Pantalla HTML adaptable amb perfil editable, objectius, recomanacions calculades i proposta setmanal. Reutilitza els motors de perfil, encaix i entrenament existents.

`data/routes.json` conté el petit catàleg de recomanació. Els valors de distància i desnivell s'han alineat amb les fitxes de detall de les tres rutes incloses. Cal mantenir-los coherents quan canviï el catàleg; l'encaix és orientatiu i no és una probabilitat ni una garantia de seguretat.

Les preferències conserven `bicipark.routeMatch.profile.v1`. L'activació conserva el marcador antic i actualitza `bicipark.routeMatch.trainingPlan.v2`, respectant les rutes ja afegides al pla. Les dades viuen al navegador.

URL local: `http://localhost:8000/modules/route-match/`.

La imatge de maqueta anterior es conserva com a referència visual, però ja no forma part de la interfície.
