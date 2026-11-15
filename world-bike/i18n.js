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