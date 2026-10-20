# Auditoria i evolució de BiciPark — 20/10/2026

Base revisada: `main` 580d7ee. Ride: PR #10, f2f18d0. La presència de codi a main no acredita per si mateixa una prova en producció o en moviment real.

## Validació del resum

- Home, quatre idiomes, PWA, mapa/aparcaments, planificador GPX, Route Match, Today, My Bike, historial, Passport i Mercat existeixen al repositori. Les proves automàtiques cobreixen fluxos crítics, no tots els dispositius ni totes les pantalles.
- PWA: shell i dades locals disponibles parcialment offline. No descarrega ni precacheja rajoles públiques d’OSM.
- Today: perfil/bici/historial/meteorologia participen en la recomanació. Corregits els codis meteorològics absents i la conversió errònia de ruixats a sol. La selecció horària ara respecta el fus de la previsió i no reutilitza hores passades.
- Passport: SHA-256 detecta canvis respecte del hash guardat. Afegida comprovació de tots els enllaços de la cadena; bloqueig d’afegir proves o exportar una transferència sobre una cadena trencada. No acredita identitat, propietat ni data externa: un titular amb control de les dades pot recalcular tota la cadena.
- Verified: abans, un rol local `workshop` o una transferència autodeclarada podia activar el badge. Eliminat: ni els rols locals ni els anuncis importats concedeixen verificació externa. No hi ha un emissor extern autenticat connectat.
- Blockchain: no hi ha ancoratge real. No s’ha publicat informació personal ni executat cap transacció.
- Ride: la PR #10 continua separada de main. Correcció complementària del tractament de sensors GPS nuls (velocitat i altitud). Validació física pendent; no afirmar fiabilitat amb pantalla bloquejada.

## Millores incorporades en aquesta proposta

- Catàleg central de 25 entrades úniques: 12 tracks locals (3 Barcelona + 9 Izarpe) i 13 seleccions externes (9 ja documentades a Bike Bases + 4 vies verdes). No equival a 25 tracks auditats. Aliases dels tres duplicats conservats per a la selecció de rutes. Desnivell desconegut = `null`, no zero. S’obren els tracks al planificador i es poden guardar per consultar Route Watch.
- Quatre vies verdes noves amb fonts del Consorci: Ferro i Carbó, Carrilet I, Carrilet II i Tren Petit. La variació de distància del Carrilet I i la discrepància 6/6,5 km del Tren Petit es mostren explícitament; no s’ha inventat un desnivell.
- 12 Bike Bases amb fitxa (5 existents + 7). Fonts oficials i data de revisió a cada nova fitxa; sense afiliació ni verificació de BiciPark. Les 7 noves encara no tenen coordenades contrastades ni tracks associats: no es posicionen al mapa ni reben puntuació artificial. Els serveis no documentats es deixen desconeguts.
- Route Watch: consulta manual de temps a inici/punt intermedi/final a l’hora seleccionada, icones WMO, pluja, vent, ratxes, font i hora; cache de 15 minuts. No calcula l’hora de pas, obres o desviaments, ni envia push. Els punts mostrejats s’envien al proveïdor en prémer consultar.
- Adreces al planificador amb cerca explícita Photon, cache i interval entre peticions. Es mantenen coordenades i selecció al mapa.
- Compte: enllaç d’accés per email i OAuth opcional, còpia local, sincronització manual amb revisió optimista i detecció de conflictes. Inclou My Bike, Passport, mercat, perfil, plans, favorits, historial, rutes i Watch. No combina còpies automàticament. Restaurar afecta totes les dades incloses; abans es descarrega una còpia.
- Comunitat: mapa, aportacions pendents de moderació, caducitat, confirmacions i retirada pel titular. Sense backend activat es mostra l’estat pendent, sense dades simulades.
- QR/NFC: fitxa de contacte opcional vinculada a una bici existent de My Bike, publicació voluntària només de marca/model/estat, QR descarregable i mateix URL per a NFC. Documents privats i bústia de trobada; no s’envia email automàtic. No transfereix propietat ni duplica el model de manteniment de My Bike. Els canvis a la fitxa My Bike no modifiquen automàticament la còpia pública.
- Analytics: només esdeveniments de planificador/GPX/Watch, amb consentiment i activació del servei, sense coordenades ni text lliure. No representa tots els usuaris o totes les visites. No s’ha activat cap recopilació.
- Icònica compartida: sol/nit/núvols/boira/pluja/neu/tempesta/vent/desconegut en mapa i detall/previsió de ruta. Les noves pantalles de compte/comunitat/Watch són en català; traducció completa als altres tres idiomes pendent.

## Validació reproduïble

`npm ci`, `npm run build:connected`, `npm test`.

Proves PostgreSQL locals amb PGlite: aïllament entre dos usuaris, revisions en conflicte, moderació, publicació mínima, missatges privats, bucket privat encara que existís públic i permisos dels camins de documents. No substitueixen la prova final en un projecte Supabase real.

Prova de navegador mòbil: catàleg → track → guardar → Watch amb resposta meteorològica controlada; còpia local; cerca de catàleg; llistat i fitxa de bases; estats de servei sense configurar; Passport. No s’han usat comptes reals, enviat correus o publicat fitxes personals.

## Backlog prioritzat

| Prioritat | Feina pendent | Valor | Esforç | Risc / dependència |
|---|---|---|---|---|
| P0 | Prova física Ride i pausa/reprendre, GPS nul, bloqueig de pantalla | Alt | Petit | Mòbil real i recorregut conegut |
| P0 | Activar Supabase i validar email/2 comptes/2 dispositius | Alt | Mitjà | Projecte, URL, clau pública, migracions |
| P0 | Moderació operativa i procediment d’esborrat de compte/documents | Alt | Mitjà | Responsable i operació del backend |
| P1 | Contrastar desnivells/modalitats dels tracks; obtenir geometries de les 13 fonts externes | Alt | Mitjà | Fonts i variants traçables |
| P1 | Coordenades exactes i rutes per a les 7 bases noves | Alt | Mitjà | Contrast amb establiments/fonts |
| P1 | Traduir pantalles noves ca/es/en/fr | Mitjà | Mitjà | Revisió de textos |
| P1 | Watch segons hora de pas + subscripcions push | Alt | Alt | Backend programat, consentiment i fonts fiables |
| P1 | Sincronització incremental automàtica i resolució per registre | Alt | Alt | Migració de models i conflictes |
| P2 | Emissors externs Verified i revocació de credencials | Alt | Alt | Acords amb tallers, signatures i identitat |
| P2 | Ancoratge blockchain d’un compromís opac | Condicional | Alt | Model de confiança útil i xarxa/costos acordats |

## Prova física de Ride

1. Mòbil real amb HTTPS i permís d’ubicació; comprovar bici activa i km inicials.
2. Registrar un recorregut conegut amb aturada, pausa i represa; comparar distància amb una referència independent.
3. Provar falta de senyal, GPS imprecís, canvi de pestanya i pantalla bloquejada. Registrar què fa el navegador; no prometre seguiment en segon pla.
4. Desar i comprovar una sola activitat a Historial i una sola suma de km a My Bike. Recarregar i verificar que no torna a sumar.
5. Denegar permisos i simular quota de memòria plena: s’ha de poder entendre l’error sense perdre silenciosament el registre.
