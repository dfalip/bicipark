"use strict";
// Isolated World pilot translations. Never uses HTML injection, remote services
// or persistent browser storage. The selected language is shareable via ?lang=.
(function(){
  const locales=["ca","es","en","fr"];
  const dict={
    ca:{
      pageTitle:"BiciPark World · Serveis ciclistes cartografiats",
      language:"Idioma",
      pilot:"BiciPark World · pilot experimental",hero:"El planeta, a dues rodes.",
      source:"Font: OpenStreetMap",sourceNote:"Registres comunitaris · no verificats in situ",
      map:"Mapa mundial",moveMap:"Mou el mapa fins a una ciutat",
      mapAria:"Mapa mundial amb navegació per teclat",
      services:"Serveis per a ciclistes",
      servicesIntro:"Busca primer una ciutat del món, o utilitza la teva zona, i després consulta els serveis cartografiats.",
      cityLabel:"Troba una ciutat o una adreça",cityPlaceholder:"Amsterdam, Tòquio, París...",
      cityButton:"Cerca ciutat",near:"📍 Cerca serveis a prop meu",
      center:"🔎 Buscar al centre del mapa (900 m)",
      initial:"Selecciona una categoria, prem «Buscar al centre» o cerca a prop teu.",
      retry:"🔄 Prova un altre servidor de dades",
      all:"Tots",parking:"🅿️ Aparcament",repair:"🛠️ Reparació",
      water:"💧 Aigua",shop:"🏪 Botigues",rental:"🚲 Lloguer",
      none:"Cap consulta encara",sourceNoteShort:"Font: OSM · dades variables segons la zona",
      legal:"La manca de resultats no vol dir que no hi hagi serveis. Les dades OSM poden ser incompletes, antigues o imprecises. Sense resultats inventats.",
      footer:"Prototip de descoberta, no navegador ni garantia de seguretat. Verifica sempre la disponibilitat dels serveis abans de sortir.",
      categoryParking:"Aparcaments",categoryRepair:"Punts de reparació",categoryWater:"Aigua potable",
      categoryRental:"Lloguer de bicicletes",categoryShop:"Botigues de bicicletes",
      recordCount:"{count} registres cartografiats{limited}",limited:" (llista limitada)",
      noResults:"No hi ha registres d'aquesta categoria en la consulta. Això no vol dir que no hi hagi serveis reals.",
      noZone:"Cap consulta en aquesta zona",viewMap:"Veure al mapa",
      planner:"Planifica fins aquí ↗",plannerTitle:"Obre el planificador de BiciPark en una pestanya nova",
      sourceLink:"Fitxa OSM ↗",community:"registre comunitari",notVerified:"OSM (no verificat)",
      newArea:"La consulta ha acabat per la zona anterior. El mapa és en una zona nova: prem «Buscar al centre» o tria una categoria per consultar-la."
    },
    es:{
      pageTitle:"BiciPark World · Servicios ciclistas cartografiados",language:"Idioma",
      pilot:"BiciPark World · piloto experimental",hero:"El planeta, sobre dos ruedas.",
      source:"Fuente: OpenStreetMap",sourceNote:"Registros comunitarios · no verificados in situ",
      map:"Mapa mundial",moveMap:"Mueve el mapa hasta una ciudad",
      mapAria:"Mapa mundial navegable con teclado",services:"Servicios para ciclistas",
      servicesIntro:"Busca una ciudad del mundo o usa tu ubicación y consulta los servicios cartografiados.",
      cityLabel:"Busca una ciudad o dirección",cityPlaceholder:"Ámsterdam, Tokio, París...",
      cityButton:"Buscar ciudad",near:"📍 Buscar servicios cerca de mí",
      center:"🔎 Buscar en el centro del mapa (900 m)",
      initial:"Selecciona una categoría, pulsa «Buscar en el centro» o busca cerca de ti.",
      retry:"🔄 Probar otro servidor de datos",all:"Todos",parking:"🅿️ Aparcamiento",
      repair:"🛠️ Reparación",water:"💧 Agua",shop:"🏪 Tiendas",rental:"🚲 Alquiler",
      none:"Todavía no hay consultas",sourceNoteShort:"Fuente: OSM · los datos dependen de la zona",
      legal:"La falta de resultados no significa que no haya servicios. Los datos de OSM pueden ser incompletos, antiguos o imprecisos. No se inventan resultados.",
      footer:"Prototipo de descubrimiento, no de navegación ni garantía de seguridad. Comprueba la disponibilidad de los servicios antes de salir.",
      categoryParking:"Aparcamientos",categoryRepair:"Puntos de reparación",categoryWater:"Agua potable",
      categoryRental:"Alquiler de bicicletas",categoryShop:"Tiendas de bicicletas",
      recordCount:"{count} registros cartografiados{limited}",limited:" (lista limitada)",
      noResults:"No hay registros de esta categoría en la consulta. Esto no significa que no existan servicios reales.",
      noZone:"Todavía no hay consultas en esta zona",viewMap:"Ver en el mapa",
      planner:"Planificar hasta aquí ↗",plannerTitle:"Abre el planificador de BiciPark en otra pestaña",
      sourceLink:"Ficha OSM ↗",community:"registro comunitario",notVerified:"OSM (sin verificar)",
      newArea:"La consulta ha terminado para la zona anterior. El mapa muestra otra zona: pulsa «Buscar en el centro» o elige una categoría para consultarla."
    },
    en:{
      pageTitle:"BiciPark World · Mapped cycling services",language:"Language",
      pilot:"BiciPark World · experimental pilot",hero:"The planet on two wheels.",
      source:"Source: OpenStreetMap",sourceNote:"Community records · not verified on site",
      map:"World map",moveMap:"Move the map to a city",
      mapAria:"Keyboard-accessible world map",services:"Cycling services",
      servicesIntro:"Find a city worldwide or use your location, then search for mapped cycling services.",
      cityLabel:"Find a city or address",cityPlaceholder:"Amsterdam, Tokyo, Paris...",
      cityButton:"Find city",near:"📍 Find services near me",
      center:"🔎 Search map centre (900 m)",
      initial:"Select a category, choose «Search map centre», or search near you.",
      retry:"🔄 Try another data server",all:"All",parking:"🅿️ Parking",
      repair:"🛠️ Repair",water:"💧 Water",shop:"🏪 Shops",rental:"🚲 Rental",
      none:"No searches yet",sourceNoteShort:"Source: OSM · coverage varies by area",
      legal:"No results does not mean there are no services. OSM records may be incomplete, outdated or inaccurate. No invented results.",
      footer:"Discovery prototype, not a navigation tool or safety guarantee. Check service availability before travelling.",
      categoryParking:"Bike parking",categoryRepair:"Bike repair stations",categoryWater:"Drinking water",
      categoryRental:"Bike rentals",categoryShop:"Bike shops",
      recordCount:"{count} mapped records{limited}",limited:" (limited list)",
      noResults:"No records for this category in the query. Real services may still exist.",
      noZone:"No query for this area yet",viewMap:"View on map",
      planner:"Plan route here ↗",plannerTitle:"Open BiciPark route planner in a new tab",
      sourceLink:"OSM record ↗",community:"community record",notVerified:"OSM (unverified)",
      newArea:"The query finished for the previous area. The map now shows a different area: search the map centre or choose a category to refresh."
    },
    fr:{
      pageTitle:"BiciPark World · Services cyclistes cartographiés",language:"Langue",
      pilot:"BiciPark World · pilote expérimental",hero:"La planète à deux roues.",
      source:"Source : OpenStreetMap",sourceNote:"Données communautaires · non vérifiées sur place",
      map:"Carte du monde",moveMap:"Déplacez la carte vers une ville",
      mapAria:"Carte du monde accessible au clavier",services:"Services pour cyclistes",
      servicesIntro:"Recherchez une ville dans le monde ou utilisez votre position, puis consultez les services cyclistes cartographiés.",
      cityLabel:"Chercher une ville ou une adresse",cityPlaceholder:"Amsterdam, Tokyo, Paris...",
      cityButton:"Chercher une ville",near:"📍 Trouver des services près de moi",
      center:"🔎 Chercher au centre de la carte (900 m)",
      initial:"Choisissez une catégorie, cliquez sur « Chercher au centre » ou cherchez près de vous.",
      retry:"🔄 Essayer un autre serveur de données",all:"Tous",parking:"🅿️ Stationnement",
      repair:"🛠️ Réparation",water:"💧 Eau",shop:"🏪 Magasins",rental:"🚲 Location",
      none:"Aucune recherche pour l'instant",sourceNoteShort:"Source : OSM · couverture variable selon la zone",
      legal:"L'absence de résultats ne signifie pas l'absence de services. Les données OSM peuvent être incomplètes, anciennes ou imprécises. Aucun résultat inventé.",
      footer:"Prototype de découverte, pas un outil de navigation ni une garantie de sécurité. Vérifiez la disponibilité des services avant de partir.",
      categoryParking:"Stationnements vélo",categoryRepair:"Stations de réparation",categoryWater:"Eau potable",
      categoryRental:"Locations de vélos",categoryShop:"Magasins de vélos",
      recordCount:"{count} points cartographiés{limited}",limited:" (liste limitée)",
      noResults:"Aucun point de cette catégorie dans la recherche. Des services réels peuvent néanmoins exister.",
      noZone:"Aucune recherche dans cette zone",viewMap:"Voir sur la carte",
      planner:"Planifier jusqu'ici ↗",plannerTitle:"Ouvrir le planificateur BiciPark dans un nouvel onglet",
      sourceLink:"Fiche OSM ↗",community:"donnée communautaire",notVerified:"OSM (non vérifié)",
      newArea:"La recherche concerne la zone précédente. La carte montre maintenant une autre zone : cherchez au centre ou choisissez une catégorie."
    }
  };
  Object.assign(dict.ca, {"mapChanged":"El mapa mostra una zona nova. Els punts visibles són de l'última consulta; prem «Buscar al centre» per actualitzar-los.","choose":"Tria un tipus de servei o prem «Buscar al centre» per consultar aquesta zona.","sourcePending":"Dades pendents · prem «Buscar al centre» o una categoria","min3":"Escriu almenys tres caràcters.","waitServices":"Espera que acabi la consulta de serveis abans de canviar de zona.","geocoderUnavailable":"El cercador de ciutats no està disponible. Pots moure el mapa manualment.","searchingPlaces":"Buscant llocs...","searchChanged":"La cerca ha canviat. Prem «Cerca ciutat» per actualitzar els resultats.","noPlace":"No s'ha trobat cap lloc. Prova una localitat més concreta.","foundPlaces":"{count} llocs trobats. Selecciona'n un per centrar el mapa.","waitSelect":"Espera que acabi la consulta abans de canviar de zona.","centred":"Mapa centrat a {name}. Tria una categoria per consultar serveis.","placeSelected":"Lloc seleccionat. Prem «Buscar al centre» o tria una categoria per carregar dades.","searchTimeout":"La cerca de ciutats ha trigat massa. Prova-ho de nou.","searchFailed":"No s'ha pogut cercar aquesta localitat. Pots moure el mapa manualment.","emptySuccess":"Consulta completada, però sense registres per aquesta zona. Les dades OSM poden ser incompletes.","loaded":"Consulta completada: {count} registres OSM dins de 900 m (no verificats in situ).","reused":"Resultats reutilitzats de la consulta anterior en aquesta zona.","providerPause":"{provider}: cal esperar abans de tornar a consultar aquest servidor.","providerCooldown":"{provider}: espera uns segons abans de repetir la consulta.","loading":"Buscant serveis cartografiats...","requesting":"Consultant {provider} per a un radi de 900 m...","failedResults":"No s'han pogut carregar els resultats","previousArea":"Mostrant punts de la consulta anterior ({area}), no de la zona nova.","timeout":"La consulta ha superat el temps màxim de 16 segons.","limitedProvider":"El proveïdor ha limitat la petició (HTTP {status}).","upstreamUnavailable":"La font de dades no està disponible ({reason}).","recentFailure":"Aquest servidor continua en pausa després d'un error recent.","missingGateway":"El servei intermedi de BiciPark no està disponible (HTTP 404).","malformedGateway":"El servei intermedi no ha retornat dades JSON vàlides (HTTP {status}).","disconnected":"No s'ha pogut connectar amb el servidor de BiciPark.","invalidResponse":"La resposta del servei no és vàlida o la connexió ha fallat.","errorAlternative":"Error de {provider}: {explanation} Pots provar l'altre servidor una sola vegada, manualment.","retryNamed":"🔄 Provar {provider}","gpsNotAvailable":"Aquest navegador no permet accedir al GPS. Mou el mapa i prem «Buscar aquí».","gpsAwait":"Esperant permís del GPS... En confirmar-lo, cercarem serveis a prop teu.","gpsInvalid":"La ubicació GPS no és vàlida. Mou el mapa manualment.","gpsDenied":"Permís de localització denegat. Pots moure el mapa i prémer «Buscar aquí».","gpsTimeout":"No s'ha pogut obtenir la ubicació a temps. Mou el mapa o torna-ho a provar.","gpsFailed":"No s'ha pogut obtenir la ubicació. Pots cercar directament al centre del mapa.","mapUnavailable":"No s'ha pogut carregar el mapa. Revisa la connexió.","areaSelected":"Zona seleccionada. Tria una categoria o prem «Buscar aquí».","sourceArea":"OpenStreetMap · {provider} · zona {area}{date}","sourceDate":" · dades del {date}","sourceNoDate":" · actualització no indicada","sourceDefault":"Font: OpenStreetMap · cobertura variable"});
  Object.assign(dict.es, {"mapChanged":"El mapa muestra otra zona. Los puntos visibles son de la última consulta; pulsa «Buscar en el centro» para actualizarlos.","choose":"Elige un servicio o pulsa «Buscar en el centro» para consultar esta zona.","sourcePending":"Datos pendientes · pulsa «Buscar en el centro» o elige una categoría","min3":"Escribe al menos tres caracteres.","waitServices":"Espera a que termine la consulta de servicios antes de cambiar de zona.","geocoderUnavailable":"No está disponible el buscador de ciudades. Puedes mover el mapa manualmente.","searchingPlaces":"Buscando lugares...","searchChanged":"La búsqueda ha cambiado. Pulsa «Buscar ciudad» para actualizarla.","noPlace":"No se encontró ningún lugar. Prueba una localidad más concreta.","foundPlaces":"Se encontraron {count} lugares. Selecciona uno para centrar el mapa.","waitSelect":"Espera a que termine la consulta antes de cambiar de zona.","centred":"Mapa centrado en {name}. Elige una categoría para buscar servicios.","placeSelected":"Lugar seleccionado. Pulsa «Buscar en el centro» o una categoría para cargar datos.","searchTimeout":"La búsqueda de ciudades tardó demasiado. Inténtalo de nuevo.","searchFailed":"No se pudo buscar esa localidad. Puedes mover el mapa manualmente.","emptySuccess":"Consulta completada, sin registros en esta zona. Los datos de OSM pueden estar incompletos.","loaded":"Consulta completada: {count} registros OSM en un radio de 900 m (sin verificar sobre el terreno).","reused":"Se reutilizaron los resultados de la consulta anterior en esta zona.","providerPause":"{provider}: debes esperar antes de consultar de nuevo este servidor.","providerCooldown":"{provider}: espera unos segundos antes de repetir la consulta.","loading":"Buscando servicios cartografiados...","requesting":"Consultando {provider} en un radio de 900 m...","failedResults":"No se pudieron cargar los resultados","previousArea":"Mostrando puntos de la consulta anterior ({area}), no de la zona nueva.","timeout":"La consulta superó el tiempo máximo de 16 segundos.","limitedProvider":"El proveedor ha limitado la petición (HTTP {status}).","upstreamUnavailable":"La fuente de datos no está disponible ({reason}).","recentFailure":"El servidor sigue en pausa tras un error reciente.","missingGateway":"El servicio intermediario de BiciPark no está disponible (HTTP 404).","malformedGateway":"El intermediario no devolvió datos JSON válidos (HTTP {status}).","disconnected":"No se pudo conectar con el servidor de BiciPark.","invalidResponse":"La respuesta del servicio no es válida o falló la conexión.","errorAlternative":"Error de {provider}: {explanation} Puedes probar manualmente el otro servidor una vez.","retryNamed":"🔄 Probar {provider}","gpsNotAvailable":"Este navegador no permite usar el GPS. Mueve el mapa y pulsa «Buscar aquí».","gpsAwait":"Esperando permiso del GPS... Al confirmarlo buscaremos servicios cercanos.","gpsInvalid":"La ubicación GPS no es válida. Mueve el mapa manualmente.","gpsDenied":"Permiso de ubicación denegado. Puedes mover el mapa y pulsar «Buscar aquí».","gpsTimeout":"No se pudo obtener la ubicación a tiempo. Mueve el mapa o vuelve a intentarlo.","gpsFailed":"No se pudo obtener tu ubicación. Puedes buscar en el centro del mapa.","mapUnavailable":"No se pudo cargar el mapa. Comprueba la conexión.","areaSelected":"Zona seleccionada. Elige una categoría o pulsa «Buscar aquí».","sourceArea":"OpenStreetMap · {provider} · zona {area}{date}","sourceDate":" · datos del {date}","sourceNoDate":" · fecha de actualización desconocida","sourceDefault":"Fuente: OpenStreetMap · cobertura variable"});
  Object.assign(dict.en, {"mapChanged":"The map now shows a different area. Visible points are from the last search; choose «Search map centre» to update.","choose":"Choose a service category or search the map centre for this area.","sourcePending":"Data not loaded · search the map centre or choose a category","min3":"Enter at least three characters.","waitServices":"Wait for the current service query to finish before changing area.","geocoderUnavailable":"City search is unavailable. You can move the map manually.","searchingPlaces":"Searching for places...","searchChanged":"The search text changed. Search again for updated results.","noPlace":"No place found. Try a more specific city or address.","foundPlaces":"Found {count} places. Select one to centre the map.","waitSelect":"Wait for the current query to finish before changing area.","centred":"Map centred on {name}. Choose a category to find services.","placeSelected":"Place selected. Search the map centre or choose a category to load records.","searchTimeout":"The city search timed out. Please try again.","searchFailed":"Could not search for this place. You can move the map manually.","emptySuccess":"Query complete, but no mapped records were returned. OSM coverage may be incomplete.","loaded":"Query complete: {count} OSM records within 900 m (not independently verified).","reused":"Reused results from an earlier query in this area.","providerPause":"{provider}: wait before querying this server again.","providerCooldown":"{provider}: wait a few seconds before repeating the query.","loading":"Searching mapped cycling services...","requesting":"Querying {provider} within a 900 m radius...","failedResults":"Could not load results","previousArea":"Showing points from the previous query ({area}), not the new area.","timeout":"The query exceeded the 16-second time limit.","limitedProvider":"The provider rate-limited the request (HTTP {status}).","upstreamUnavailable":"The upstream data service is unavailable ({reason}).","recentFailure":"This server remains paused after a recent error.","missingGateway":"The BiciPark gateway is unavailable (HTTP 404).","malformedGateway":"The gateway did not return valid JSON (HTTP {status}).","disconnected":"Could not connect to BiciPark's server.","invalidResponse":"The service returned invalid data or the connection failed.","errorAlternative":"{provider} error: {explanation} You can manually try the alternate server once.","retryNamed":"🔄 Try {provider}","gpsNotAvailable":"This browser cannot access GPS. Move the map and search here.","gpsAwait":"Waiting for GPS permission... We will search nearby after you approve.","gpsInvalid":"GPS location is invalid. Move the map manually.","gpsDenied":"Location permission denied. You can move the map and search here.","gpsTimeout":"Could not obtain your location in time. Move the map or try again.","gpsFailed":"Could not obtain your location. You can search at the map centre.","mapUnavailable":"The map could not load. Check your connection.","areaSelected":"Area selected. Choose a category or search here.","sourceArea":"OpenStreetMap · {provider} · area {area}{date}","sourceDate":" · data from {date}","sourceNoDate":" · update date unknown","sourceDefault":"Source: OpenStreetMap · coverage varies"});
  Object.assign(dict.fr, {"mapChanged":"La carte affiche une autre zone. Les points visibles viennent de la dernière recherche ; recherchez au centre pour actualiser.","choose":"Choisissez une catégorie ou recherchez au centre de la carte pour cette zone.","sourcePending":"Données non chargées · recherchez au centre ou choisissez une catégorie","min3":"Saisissez au moins trois caractères.","waitServices":"Attendez la fin de la recherche de services avant de changer de zone.","geocoderUnavailable":"La recherche de villes est indisponible. Vous pouvez déplacer la carte.","searchingPlaces":"Recherche de lieux...","searchChanged":"Le texte a changé. Relancez la recherche pour actualiser les résultats.","noPlace":"Aucun lieu trouvé. Essayez une ville ou une adresse plus précise.","foundPlaces":"{count} lieux trouvés. Choisissez-en un pour centrer la carte.","waitSelect":"Attendez la fin de la recherche avant de changer de zone.","centred":"Carte centrée sur {name}. Choisissez une catégorie pour voir les services.","placeSelected":"Lieu sélectionné. Recherchez au centre ou choisissez une catégorie pour charger les données.","searchTimeout":"La recherche de villes a expiré. Réessayez.","searchFailed":"Impossible de rechercher ce lieu. Vous pouvez déplacer la carte.","emptySuccess":"Recherche terminée, aucun point cartographié dans cette zone. Les données OSM peuvent être incomplètes.","loaded":"Recherche terminée : {count} points OSM dans un rayon de 900 m (non vérifiés sur place).","reused":"Résultats réutilisés d'une recherche précédente dans cette zone.","providerPause":"{provider} : attendez avant d'interroger à nouveau ce serveur.","providerCooldown":"{provider} : attendez quelques secondes avant de recommencer.","loading":"Recherche de services cyclistes...","requesting":"Interrogation de {provider} dans un rayon de 900 m...","failedResults":"Impossible de charger les résultats","previousArea":"Affichage des points de la recherche précédente ({area}), pas de la nouvelle zone.","timeout":"La recherche a dépassé la limite de 16 secondes.","limitedProvider":"Le fournisseur a limité la requête (HTTP {status}).","upstreamUnavailable":"Le service de données est indisponible ({reason}).","recentFailure":"Ce serveur reste en pause après une erreur récente.","missingGateway":"La passerelle BiciPark est indisponible (HTTP 404).","malformedGateway":"La passerelle n'a pas renvoyé de JSON valide (HTTP {status}).","disconnected":"Connexion au serveur BiciPark impossible.","invalidResponse":"La réponse du service est invalide ou la connexion a échoué.","errorAlternative":"Erreur {provider} : {explanation} Vous pouvez essayer manuellement l'autre serveur une fois.","retryNamed":"🔄 Essayer {provider}","gpsNotAvailable":"Ce navigateur n'a pas accès au GPS. Déplacez la carte et recherchez ici.","gpsAwait":"En attente de l'autorisation GPS... Nous chercherons à proximité après confirmation.","gpsInvalid":"Position GPS invalide. Déplacez la carte manuellement.","gpsDenied":"Accès à la position refusé. Vous pouvez déplacer la carte et rechercher ici.","gpsTimeout":"Impossible d'obtenir votre position à temps. Déplacez la carte ou réessayez.","gpsFailed":"Position introuvable. Vous pouvez rechercher au centre de la carte.","mapUnavailable":"La carte n'a pas pu se charger. Vérifiez votre connexion.","areaSelected":"Zone sélectionnée. Choisissez une catégorie ou recherchez ici.","sourceArea":"OpenStreetMap · {provider} · zone {area}{date}","sourceDate":" · données du {date}","sourceNoDate":" · date de mise à jour inconnue","sourceDefault":"Source : OpenStreetMap · couverture variable"});
  let lang="ca";
  function translate(key,values={}){
    const template=dict[lang][key]??dict.ca[key]??key;
    return template.replace(/\{([a-zA-Z]+)\}/g,(_,name)=>String(values[name]??""));
  }
  function apply(){
    document.documentElement.lang=lang;
    document.title=translate("pageTitle");
    document.querySelectorAll("[data-world-i18n]").forEach(el=>{
      el.textContent=translate(el.dataset.worldI18n);
    });
    document.querySelectorAll("[data-world-i18n-placeholder]").forEach(el=>{
      el.setAttribute("placeholder",translate(el.dataset.worldI18nPlaceholder));
    });
    document.querySelectorAll("[data-world-i18n-aria]").forEach(el=>{
      el.setAttribute("aria-label",translate(el.dataset.worldI18nAria));
    });
    const select=document.getElementById("worldLanguage");
    if(select)select.value=lang;
  }
  function setLanguage(value,writeUrl=true){
    if(!locales.includes(value))return false;
    lang=value;
    apply();
    if(writeUrl&&history.replaceState){
      const url=new URL(location.href);
      url.searchParams.set("lang",lang);
      history.replaceState(null,"",url.pathname+url.search+url.hash);
    }
    window.dispatchEvent(new Event("biciparkworldlanguagechange"));
    return true;
  }
  const requested=new URLSearchParams(location.search).get("lang");
  setLanguage(locales.includes(requested)?requested:"ca",false);
  const select=document.getElementById("worldLanguage");
  if(select)select.addEventListener("change",()=>setLanguage(select.value));
  window.BiciParkWorldI18n=Object.freeze({t:translate,setLanguage,get language(){return lang;}});
})();