# BiciPark Today

Recomanador contextual de rutes. Combina el perfil de `Route Match`, la bici activa de `My Bike`, l'historial local dels últims 7 dies i previsió d'Open-Meteo.

- El score 0–100 és un índex d'encaix de producte, no una probabilitat ni una garantia de seguretat.
- Factors sense dades fiables (per exemple desnivell pendent de revisar) s'exclouen i els pesos restants es reescalen.
- Es dedupliquen rutes importades equivalents.
- La geolocalització només es demana després d'una acció explícita de l'usuari.
- L'últim resultat es desa localment per poder mostrar una recomanació anterior si falla la xarxa.
- Open-Meteo és el proveïdor v1 i no requereix API key.

Claus locals: `bicipark.today.last.v1`, `bicipark.routeMatch.profile.v1`, `bicipark.activityHistory.v1`, `bicipark.myBike.v1`.
