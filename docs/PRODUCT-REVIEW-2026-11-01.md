# BiciPark: estat, mercat i proposta de millores

Revisió: 1 de novembre de 2026. Base: `main` a `332d6f1` i web pública `https://www.bicipark.com/`. Aquest document separa allò publicat, allò preparat en aquesta branca i allò que encara necessita dades, serveis o proves. Substitueix la priorització del backlog del 20 d’octubre, que es conserva com a historial.

## Diagnòstic

BiciPark ja té una base àmplia. El següent increment de valor hauria de connectar **descobrir una ruta → preparar la sortida → aparcar → registrar l’activitat**, amb dades fiables i menys fricció. Afegir més pantalles abans de validar aquesta cadena augmentaria el manteniment sense demostrar ús recurrent.

### Estat contrastat

| Àrea | Evidència actual | Què falta |
| --- | --- | --- |
| Evolució anterior | PR #11 integrada a main el 21 d’octubre; cerca i compte són enllaços reals a la portada | Revisió completa de navegació i textos de totes les pantalles |
| PWA | Manifest, service worker i shell parcial; proves d’exclusió d’APIs privades i mapes externs | Instal·lació i actualització en iOS/Android físics; no implica mapes o navegació completament offline |
| Aparcaments | Mapa, dades per ciutat, favorits i proximitat; proves de flux | Dades de cobertura, manteniment i ocupació; no hi ha disponibilitat en directe verificada |
| Planificador/GPX | Planificació, importació, exportació i guardat local | Validar qualitat de trajectes sobre terreny; no prometre percentatge de carril bici ni ferm sense font |
| Catàleg | 25 entrades publicades: 12 tracks locals i 13 seleccions externes | Modalitats, desnivells i variants pendents de revisió; 25 entrades no equivalen a 25 tracks validats |
| Bike Bases | 12 fitxes: 5 amb coordenades i 7 amb fonts externes pendents de geolocalitzar/revisar | Verificar coordenades i serveis amb cada establiment; cap puntuació inventada |
| Today/Route Match/My Bike/Passport | Codi i proves de recomanació, perfil, bicicleta, prova criptogràfica i transferència | Validació de camp, UX transversal i sincronització real |
| Route Watch | Consulta manual de previsió sobre rutes guardades | No hi ha vigilància en segon pla, push ni detecció d’obres; aquesta proposta millora l’estimació temporal |
| Comptes, comunitat, QR públic | Base tècnica i SQL amb proves RLS | `supabaseUrl` i `supabaseAnonKey` buits en configuració pública: serveis connectats **no activats** |
| Analytics | Instrumentació existent; `analyticsEnabled: false` en producció | Escollir servei, política i consentiment; encara no hi ha KPIs d’ús demostrats |
| Ride | PR #10 oberta; correcció de sensors absents a PR #12, sobre la branca de Ride | Integrar correcció, reconciliar main, provar GPS real, pantalla bloquejada, pausa/reprendre, tall d’aplicació, duplicats i consum de bateria |
| Verified/blockchain | Preparació tècnica i hash local | No hi ha certificació externa operativa ni ancoratge on-chain verificat |

Una prova SHA-256 ajuda a detectar canvis respecte d’una prova guardada. Per si sola no acredita identitat, propietat legal, data certa ni veracitat de les dades originals. Verified requereix un emissor real, identificable i revocable.

La portada encara anunciava «Masia El Pedal» amb 9,3 sense suport en el catàleg. Aquesta branca ho substitueix per un accés descriptiu al directori, sense establiment ni puntuació ficticis.

## Competència i serveis complementaris

Consulta de fonts oficials l’1 de novembre de 2026. Es descriuen funcions anunciades pels proveïdors; no s’han provat subscripcions ni APIs de tercers. No es pressuposen acords comercials, drets de reutilització ni gratuïtat.

| Producte | Què ja cobreix | Decisió per a BiciPark |
| --- | --- | --- |
| [Komoot](https://www.komoot.com/premium) i [meteorologia](https://www.komoot.com/premium/weather) | Planificació, col·leccions, rutes de diversos dies i temps al llarg del trajecte | La meteorologia de ruta ja existeix al mercat. Fer útil el context local: sortida, bicicleta i aparcament; no presentar-ho com una invenció única |
| [Ride with GPS](https://ridewithgps.com/help/using-basic/) i [rutes offline](https://support.ridewithgps.com/hc/en-us/articles/4419560659355-Offline-Routes) | Planificació, navegació, ús de rutes descarregades i eines d’activitat | Preservar interoperabilitat GPX i explicar exactament els límits offline de BiciPark |
| [Wikiloc](https://www.wikiloc.com/premium) i [previsió](https://help.wikiloc.com/article/797-premium-weather-forecast-app) | Gran oferta de descoberta, filtres, seguiment i meteorologia | Curar un catàleg local petit però fiable. Enllaçar fonts i permetre importar un GPX que l’usuari tingui dret a usar |
| [Strava Heatmaps](https://support.strava.com/en-us/articles/16046277-a-guide-to-strava-heatmaps) | Popularitat agregada de recorreguts i comunitat d’activitats | No deduir seguretat de la popularitat. Qualsevol integració futura requereix revisar API, permisos i consentiment |
| [Cyclers](https://cyclers.app/) i [documentació de rutes](https://cyclers.tech/docs/) | Planificació orientada a ciclisme urbà, preferències i alternatives | Benchmark de qualitat urbana: encreuaments, vies principals, discontinuïtats i sentit de circulació. Validar proveïdor abans de prometre «ruta segura» |
| [Rily](https://www.rilyapp.com/) | Anuncia importació GPX/Wikiloc, riscos, obres, túnels, meteorologia i alternatives amb fonts viàries | Competidor local especialment rellevant. Les alertes viàries requereixen fonts amb cobertura, llicència, hora i coordenades, no només marcar incidències al mapa |
| [Bicibox](https://www.bicibox.cat/) | Xarxa metropolitana d’aparcament amb condicions d’accés i serveis propis | Complement immediat mitjançant enllaç al servei oficial. No atribuir reserves o ocupació en directe a BiciPark sense API acordada |
| [Bike Index](https://bikeindex.org/), [ajuda](https://bikeindex.org/help), [API](https://bikeindex.org/documentation/api_v3) | Registre i recuperació de bicicletes; ecosistema de col·laboradors i API | Estudiar interoperabilitat voluntària abans de crear una infraestructura paral·lela de confiança. Cap transmissió de propietaris, sèries o factures activada |

**Posicionament proposat:** preparació pràctica de sortides i mobilitat ciclista local, amb aparcaments, rutes amb fonts clares i informació de la bicicleta. És una hipòtesi de producte que cal validar amb usuaris, no una conclusió de mercat demostrada.

## Canvis preparats en aquesta branca

1. **Route Watch segons l’hora de pas.** Cinc punts repartits per distància acumulada; estimació amb velocitat i parades; comparació de sortida una hora abans, a l’hora seleccionada i una hora després, descartant hores passades. Vent de cara/lateral aproximat segons orientació local del track, ratxes, pluja, temperatura, nit i iconografia. Mostra hora de la previsió i de consulta. Els GPX amb discontinuïtats de més de 100 m es rebutgen perquè no es poden estimar trasllats. No és routing meteorològic, radar ni avís oficial.
2. **Catàleg filtrable i compartible.** Cerca tolerant als accents, modalitat, distància màxima, tracks locals, favorits i ordenació. Els filtres es reflecteixen a l’URL. Les distàncies desconegudes s’exclouen quan hi ha un màxim. Favorits locals persistents i inclosos en còpies del compte; això no activa sincronització amb el núvol.
3. **Textos en quatre idiomes i icones accessibles.** Les dues pantalles segueixen la preferència existent ca/es/en/fr; les icones meteorològiques tradueixen etiquetes i noms accessibles. Noms de rutes i notes originals de les fonts es conserven.
4. **Portada més honesta i navegable.** Accés directe a Route Watch al menú Més i eliminació de la falsa puntuació de Bike Base.
5. **Complement d’aparcament.** Enllaç explícit al servei extern Bicibox amb aclariment que BiciPark no gestiona reserves ni ocupació en directe.
6. **PWA i regressions.** Nova versió de cache amb shell de Watch/catàleg; proves de càlcul, dades absents, filtres, còpies i traduccions.

La comparació meteorològica compta punts amb almenys un llindar orientatiu: tempesta, neu/pluja glaçada, probabilitat de pluja ≥60%, vent ≥30 km/h o ratxes ≥50 km/h, temperatura ≥32 °C o ≤3 °C. La nit apareix separadament i no altera el recompte meteorològic. «Menys punts amb avisos» no significa ruta segura ni recomanació clínica. Si qualsevol alternativa manca de dades, no s’assigna cap distintiu comparatiu. No s’interpolen hores fora de cobertura ni es converteix un valor absent en zero. Els resultats només mostregen cinc ubicacions; el terreny i les condicions entre punts poden ser diferents.

Dades [Open-Meteo](https://open-meteo.com/en/docs), hores Unix UTC i presentació en hora del dispositiu. Cinc coordenades s’envien al consultar, sense compte ni identificador de bicicleta. Cache de resposta en memòria durant 15 minuts; no push ni vigilància després de tancar la pàgina. Per ús comercial o creixement, revisar les condicions i capacitat del proveïdor abans d’activar desplegaments de gran volum.

## Backlog prioritzat

Esforç orientatiu: petit (1–2 dies), mitjà (3–7), gran (més d’una setmana); depèn de serveis i col·laboradors, no és un pressupost tancat.

| Prioritat | Millora / resultat esperat | Valor | Esforç | Risc / dependència | Criteri d’acceptació |
| --- | --- | --- | --- | --- | --- |
| P0 | Retirar contingut fictici i distingir funcions actives | Confiança alta | Petit | Traduccions i altres reclams per auditar | Cap puntuació/certificació sense font; estat connectat visible. Correcció de portada preparada |
| P0 | Tancar Ride #12 → #10 | Alt | Mitjà + camp | GPS, sistema operatiu, bateria, divergència amb main | Sortides reals amb pausa, pantalla bloquejada i pèrdua de senyal; una sola activitat i increment de km correcte; informar limitacions si el navegador no registra en segon pla |
| P0 | Activar i verificar comptes abans de prometre sincronització | Alt | Mitjà | Projecte Supabase, auth, redirects, email, backups | Dos dispositius i dos usuaris: sync, conflictes, documents privats, logout, exportació/esborrat; cap document públic ni secrets al client |
| P1 | Aprovar i publicar Watch/catàleg d’aquesta proposta | Alt | Petit de revisió | Acceptació UX i dades horàries | Proves automatitzades i navegador; prova amb GPX real; cap «millor hora» amb dades parcials |
| P1 | Validar el catàleg existent abans d’ampliar-lo | Alt | Mitjà + fonts | Drets GPX, modalitats, desnivell i geometria | Per track: origen, llicència, data de revisió, variant, distància calculada, modalitat contrastada; retirar duplicats per geometria i variant, no només pel nom |
| P1 | Completar les 7 bases sense coordenades | Alt | Mitjà | Confirmació establiments | Ubicació verificada, contacte, serveis específics amb font i data; cap etiqueta Verified automàtica |
| P1 | Ruta → aparcament a destí | Alt | Mitjà | Cobertura/qualitat de dades de cada ciutat | Aparcaments reals a l’entorn del punt final, distància ben definida, font i dades desconegudes visibles; conservar exportació de ruta |
| P1 | Prova de qualitat de routing urbà | Alt | Mitjà | Proveïdor i dades OSM | 10 trajectes de referència a Barcelona amb sentit, encreuaments, restriccions i alternatives revisats; no utilitzar «més segura» sense criteris |
| P1 | Mesura mínima amb consentiment adequat | Mitjà-alt | Petit-mitjà | Servei i decisió de privacitat | Embut ruta → guardat → Watch; sense coordenades, emails, números de sèrie ni text lliure als events |
| P2 | Route Watch amb incidències oficials | Alt potencial | Gran | Endpoint, llicència, ubicació, caducitat i cobertura | Corredor sobre el traçat, data i font visibles, expiració, distinció entre alerta oficial i comunitària |
| P2 | Push voluntari per rutes habituals | Mitjà | Gran | Backend, subscripcions, horaris, restriccions iOS | Opt-in, revocació, límit d’avisos, comprovació real en segon pla; no prometre-ho amb un temporitzador del navegador |
| P2 | Verified amb tallers pilot | Diferenciació alta | Gran | Acords, identitat emissor i responsabilitat | Emissor, abast, document, data, revocació i auditoria; hash no substitueix verificació |
| P2 | Interoperabilitat de registre | Mitjà | Mitjà-gran | API, condicions i consentiment | Consulta/transferència voluntària amb dades mínimes; mecanisme de correcció i disputa |
| Posterior | Ancoratge blockchain opcional | Incert avui | Gran | Cost, claus, privacitat i emissor | Només si un pilot de Verified demostra una necessitat que la prova convencional no cobreix |

## Seqüència de treball proposada

- **Setmana 1:** revisar aquesta PR en preview; provar 2–3 GPX reals i mòbil; retirar reclams sense dades; preparar i executar proves de camp de Ride. La prova física no es pot substituir amb simulació.
- **Setmana 2:** configurar l’entorn de comptes i executar la matriu de dos usuaris/dispositius; validar les bases amb coordenades pendents i una primera selecció de tracks.
- **Setmana 3:** prototipar aparcament a destí i provar-lo en cinc trajectes quotidians i cinc sortides de lleure; documentar errors de routing amb coordenades només en l’entorn de QA.
- **Setmana 4:** pilot amb 5–10 ciclistes; corregir bloquejos i decidir si el següent increment és confiança de dades, sincronització o alertes. No obrir blockchain com a dependència del llançament.

### Com saber si ha millorat

Mesurar, sense inventar xifres actuals: percentatge de rutes amb track revisat; percentatge de bases amb coordenades i serveis contrastats; èxit de consulta Watch i errors per cobertura; conversió catàleg → ruta guardada → consulta Watch; ús d’aparcament a destí; retorn setmanal si es pot mesurar amb consentiment; activitats Ride duplicades o amb distància anòmala. Registrar una línia base abans de fixar objectius quantitatius.

## Validació i límits

- La suite prèvia: 33 proves aprovades. Amb aquesta proposta: 39 proves aprovades, incloent RLS i privacitat d’emmagatzematge local de prova. Això no certifica una instància Supabase pública no configurada.
- Proves de navegador amb resposta meteorològica simulada: filtres, persistència de favorits, canvi d’idioma, mòbil, opcions de sortida, cache, resposta fallida i absència de rutes. La simulació verifica la UI; no la precisió d’una previsió real.
- Consulta real de contracte Open-Meteo: resposta de 168 hores amb timestamps Unix i les set variables esperades, amb vent en km/h i temperatura en °C. No valida la precisió meteorològica sobre terreny.
- El treball no fusiona les PR de Ride, no activa serveis de pagament, no publica dades personals, no crea un servei de verificació externa i no desplega automàticament a producció. La proposta es lliura en una PR separada per revisar-la.
- Revisió limitada al codi, dades públiques, configuració pública i fluxos esmentats; no s’ha fet una auditoria exhaustiva de totes les pantalles, seguretat de producció, accessibilitat WCAG ni prova física GPS.

## Guia curta de revisió

1. Obrir el catàleg: cercar «besos», fixar distància, limitar a tracks locals, guardar una ruta i recarregar; comprovar URL i filtre de favorits.
2. Importar/guardar un GPX continu al planificador. Obrir Route Watch, fixar velocitat i parades, comparar les sortides; revisar hora de pas, vent i icones. Canviar idioma.
3. Provar sense connexió: el shell i el catàleg poden estar disponibles després d’instal·lar cache; la previsió requereix xarxa i ha d’indicar manca de dades.
4. Revisar la portada i l’enllaç de Bicibox. Confirmar que les còpies locals inclouen els favorits de catàleg.
5. Acceptar la PR només després de revisar el preview; mantenir Ride i l’activació de comptes com a entregues amb els seus propis criteris.
