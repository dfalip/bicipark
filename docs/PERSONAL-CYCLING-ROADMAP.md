# BiciPark · Personal Cycling roadmap

Objectiu: evolucionar BiciPark de catàleg/mapa a assistent personal de ciclisme sense barrejar dades no verificades, secrets ni dades personals públiques.

## Increment actual

### TODAY-01 · BiciPark Today — implementat en aquesta branca
- Perfil Route Match + bici activa + historial 7 dies + Open-Meteo.
- Selector de tipus de sortida (suau, entrenar, natura, pujar, cafè, ràpida).
- Top 3 rutes amb score d'encaix 0–100 i explicacions.
- Factors sense dades fiables s'exclouen i es reponderen.
- Geolocalització només amb acció explícita.
- Última recomanació local com a fallback.

### BIKE-00 · My Bike local — implementat en aquesta branca
- Fitxa multi-bici i bici activa.
- Marca/model/modalitat, pes, rodes i pneumàtics.
- Registre de pressió habitual (no recomanació automàtica).
- Quilometratge i punts de manteniment sense intervals inventats.
- BiciPark ID local i exportació de passaport JSON mínim.

## Següents increments

### TODAY-02 · Recomanació més rica
- Integrar directament el Weather Route per mostrejar diversos punts del recorregut i efecte del vent per sentit.
- Enriquir el catàleg amb superfície, desnivell validat, ombra i punts d'interès abans de puntuar aquests factors.
- Aprendre de “m'agrada / no m'agrada” i rutes completades, amb control per restablir preferències.

### PRESS-01 · Pressure Advisor
Inspiració funcional: calculadores de setup com SILCA, però sense copiar fórmules propietàries.
- Validar una metodologia pública o una taula pròpia documentada.
- Entrades: pes total, amplada real, carcassa/tipus, roda, tubeless/cambra i superfície.
- Resultat com a punt de partida configurable, sempre dins dels límits de pneumàtic/llanta aportats per l'usuari.
- No activar fins tenir tests de rang i avisos mecànics.

### WATCH-01 · Route Watch
- Rutes guardades + franja horària + meteorologia per recorregut.
- Primer: consulta manual i indicador de canvi.
- Després: backend programat + Web Push amb consentiment per alertes reals en segon pla.
- Obres/incidències només amb fonts geolocalitzades i caducitat.

### AUTH-01 · Compte i sincronització
- Supabase o equivalent: auth, RLS, recuperació i esborrat de compte.
- Migració explícita de localStorage: perfil, bicis, rutes, favorits, activitats i pla.
- Versions i conflictes visibles; mai sobreescriptura silenciosa.

### PASSPORT-01 · Bike Passport verificable
- Dades privades separades de vista pública mínima.
- Fotos/factures en storage privat.
- QR amb identificador públic aleatori i contacte mediat.
- Transferència de titular amb doble confirmació.
- NFC només com a suport del mateix URL; blockchain fora fins que hi hagi un benefici concret.

### FIT-01 · Bike Fit Assistant
- Captura lateral guiada i càlcul d'angles amb processament preferentment local.
- Resultats com a orientació de posició, no diagnòstic mèdic.
- Calibració de càmera, control de qualitat i comparativa abans/després.

### COMMUNITY-01 · Incidències comunitàries
- Auth + moderació + antiabús + caducitat.
- Categories: obres, carril tallat, ferm, font, taller, aparcament.
- Confirmacions d'altres usuaris; cap “temps real” si no hi ha actualització recent.

### MARKET-01 · Valor i compravenda
- Primer: historial de manteniment i propietat dins Bike Passport.
- Valor estimat només quan hi hagi dades de mercat amb procedència i rang d'incertesa.
- Marketplace, pagaments i protecció de compra són un producte separat i requereixen backend, moderació, antifrau i operativa.

## Dependències recomanades

1. Today + My Bike local.
2. Enriquiment de rutes + Pressure Advisor validat.
3. Auth/sync.
4. Route Watch amb backend i push.
5. Bike Passport públic/privat.
6. Community.
7. Bike Fit.
8. Valoració / marketplace si les dades i l'ús ho justifiquen.
