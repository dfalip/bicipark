import {SEARCH_RADIUS_METERS, SERVICE_TYPES, buildOverpassQuery, normalizeOverpassResponse, validateCoords} from "./services.js";

// Public, shared Overpass is for deliberately small manual pilot requests only.
// DO NOT use this as the production backend at scale. A quota-limited service
// with global application-level caching and throttling must replace it.
// Two independently operated public Overpass services; the second is used
// ONLY after the visitor explicitly requests an alternative. No blind retries.
const PROVIDERS = Object.freeze([
  {label:"Private.coffee",url:"https://overpass.private.coffee/api/interpreter"},
  {label:"FOSSGIS / overpass-api.de",url:"https://overpass-api.de/api/interpreter"}
]);
const COOLDOWN_MS = 20000;
const PROVIDER_LIMIT_PAUSE_MS = 30000;
const CACHE_MAX_ENTRIES = 12;
const ui = Object.fromEntries([
  "worldMap","coordinates","locateButton","searchButton","status",
  "resultCount","sourceStamp","resultList","alternateProviderButton"
].map(id=>[id,document.getElementById(id)]));
const filters=[...document.querySelectorAll(".wb-filters button")];
let activeType="all";
let records=[];
let sourceTimestamp=null;
let mayBeTruncated=false;
let searchedCentre=null;
const lastRequestAt=[0,0];
const limitedUntil=[0,0];
let activeProviderIndex=0;
let lastErrorProvider=null;
let pending=false;
let locating=false;
const cache=new Map();
let map=null;
let markers=null;
let searchCircle=null;
const message=(text,kind="info")=>{
  ui.status.textContent=text;
  ui.status.dataset.kind=kind;
};
function hideAlternative(){
  ui.alternateProviderButton.hidden=true;
  lastErrorProvider=null;
}
const num=value=>Number(value).toLocaleString("ca-ES",{maximumFractionDigits:3});
const coords=centre=>`${num(centre.lat)}°, ${num(centre.lng)}°`;

function isNewArea() {
  if(!map||!searchedCentre)return true;
  const centre=map.getCenter();
  return Math.abs(centre.lat-searchedCentre.lat)>0.004 ||
    Math.abs(centre.lng-searchedCentre.lng)>0.005;
}
function updateView() {
  if(!map)return;
  const centre=map.getCenter();
  ui.coordinates.textContent=`${coords(centre)} · zoom ${map.getZoom()}`;
  // The query radius is fixed at 900m regardless of the current map zoom.
  // Never trap first-time visitors behind an unexplained disabled button.
  ui.searchButton.disabled=pending;
  // Never silently overwrite an error or the status of an in-flight request
  // when the user pans/zooms the map.
  if(!pending&&!locating&&isNewArea()&&ui.status.dataset.kind==="info"){
    message("Tria un tipus de servei o prem «Buscar al centre» per consultar aquesta zona.");
  }
}
function createOsmLink(item){
  const link=document.createElement("a");
  link.href=item.sourceUrl;
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.textContent="Fitxa OSM ↗";
  return link;
}
function renderResults(){
  const visible=activeType==="all" ? records : records.filter(item=>item.type===activeType);
  ui.resultList.replaceChildren();
  ui.resultCount.textContent=searchedCentre?
    `${visible.length} registres cartografiats${mayBeTruncated?" (llista limitada)":""}` :
    "Cap consulta encara";
  ui.sourceStamp.textContent=searchedCentre?
    `OSM · zona ${coords(searchedCentre)}${sourceTimestamp?" · dades del "+sourceTimestamp.slice(0,10):" · actualització no indicada"}` :
    "Font: OpenStreetMap · cobertura variable";
  if(markers)markers.clearLayers();
  if(visible.length===0&&searchedCentre){
    const item=document.createElement("li");
    item.className="wb-no-results";
    item.textContent="No hi ha registres d'aquesta categoria en la consulta. Això no vol dir que no hi hagi serveis reals.";
    ui.resultList.appendChild(item);
  }
  for(const place of visible){
    const category=SERVICE_TYPES[place.type];
    const li=document.createElement("li");
    const heading=document.createElement("strong");
    heading.textContent=`${category.icon} ${place.name}`;
    const meta=document.createElement("span");
    meta.textContent=category.label+" · registre comunitari";
    const actions=document.createElement("div");
    const focus=document.createElement("button");
    focus.type="button";
    focus.textContent="Veure al mapa";
    focus.addEventListener("click",()=>{if(map)map.setView([place.lat,place.lng],17);});
    actions.append(focus,createOsmLink(place));
    li.append(heading,meta,actions);
    ui.resultList.appendChild(li);
    const marker=L.circleMarker([place.lat,place.lng],{
      radius:8,color:"#0b5c46",weight:2,fillColor:"#39bc8f",fillOpacity:.9
    });
    const popup=document.createElement("div");
    const title=document.createElement("strong");title.textContent=place.name;
    const type=document.createElement("p");type.textContent=category.label+" · OSM (no verificat)";
    popup.append(title,type,createOsmLink(place));
    marker.bindPopup(popup);
    markers.addLayer(marker);
  }
  if(searchCircle){
    searchCircle.setStyle({opacity:.4,fillOpacity:.04});
  }
}
function applyData(data,location){
  records=data.places;
  sourceTimestamp=data.sourceTimestamp;
  mayBeTruncated=data.truncated;
  searchedCentre={lat:location.lat,lng:location.lng};
  if(searchCircle)map.removeLayer(searchCircle);
  searchCircle=L.circle([location.lat,location.lng],{radius:SEARCH_RADIUS_METERS,
    color:"#0b7055",weight:2,fillOpacity:.04}).addTo(map);
  renderResults();
  if(records.length===0)message("Consulta completada, però sense registres per aquesta zona. Les dades OSM poden ser incompletes.","success");
  else message(`Consulta completada: ${records.length} registres OSM dins de 900 m (no verificats in situ).`,"success");
  hideAlternative();
}
async function fetchAroundCenter({alternative=false}={}){
  // Search is always triggered by a user action (category, nearby, or button).
  if(alternative&&lastErrorProvider===null)return;
  const providerIndex=alternative ? 1-lastErrorProvider : activeProviderIndex;
  const provider=PROVIDERS[providerIndex];
  if(!map||pending)return;
  // A single deliberate click chooses a 900m area and zooms to show it.
  if(map.getZoom()<12)map.setView(map.getCenter(),14,{animate:false});
  const centre=map.getCenter();
  if(!validateCoords(centre.lat,centre.lng))return;
  // Cache only identical query centres: rounding could reuse a different 900m circle.
  const key=`${centre.lat}:${centre.lng}`;
  if(cache.has(key)){
    const saved=cache.get(key);
    applyData(saved.data,saved.centre);
    message("Resultats reutilitzats de la consulta anterior en aquesta zona.");
    return;
  }
  const now=Date.now();
  if(now<limitedUntil[providerIndex]){
    message(`${provider.label}: cal esperar abans de tornar a consultar aquest servidor.`,"error");
    return;
  }
  if(now-lastRequestAt[providerIndex]<COOLDOWN_MS){
    message(`${provider.label}: espera uns segons abans de repetir la consulta.`,"error");
    return;
  }
  lastRequestAt[providerIndex]=now;
  pending=true;
  ui.searchButton.disabled=true;
  ui.resultCount.textContent="Buscant serveis cartografiats...";
  message(`Consultant ${provider.label} per a un radi de 900 m...`,"loading");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),16000);
  try{
    const query=buildOverpassQuery(centre.lat,centre.lng);
    const response=await fetch(provider.url,{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body:new URLSearchParams({data:query}).toString(),
      signal:controller.signal,
      cache:"default"
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const parsed=normalizeOverpassResponse(await response.json());
    activeProviderIndex=providerIndex;
    cache.set(key,{data:parsed,centre:{lat:centre.lat,lng:centre.lng}});
    if(cache.size>CACHE_MAX_ENTRIES)cache.delete(cache.keys().next().value);
    applyData(parsed,centre);
  }catch(error){
    ui.resultCount.textContent="No s'han pogut carregar els resultats";
    const msg=String(error?.message||"");
    let explanation;
    if(error?.name==="AbortError"){
      explanation="La consulta ha superat el temps màxim de 16 segons.";
    }else if(/HTTP (406|429)/.test(msg)){
      limitedUntil[providerIndex]=Date.now()+PROVIDER_LIMIT_PAUSE_MS;
      explanation=`El servidor ha limitat o rebutjat la petició (${msg}).`;
    }else if(/HTTP (502|503|504)/.test(msg)){
      explanation=`El servidor està saturat o temporalment indisponible (${msg}).`;
    }else if(/HTTP 400/.test(msg)){
      explanation="La consulta ha estat rebutjada per format incorrecte (HTTP 400).";
    }else if(/^HTTP \d{3}$/.test(msg)){
      explanation=`El servidor ha respost amb ${msg}.`;
    }else if(error?.name==="TypeError"){
      explanation="No s'ha pogut connectar amb el servei des del navegador (possible xarxa o CORS).";
    }else{
      explanation="La resposta del servei no és vàlida o la connexió ha fallat.";
    }
    message(`Error de ${provider.label}: ${explanation} Pots provar l'altre servidor una sola vegada, manualment.`,"error");
    lastErrorProvider=providerIndex;
    ui.alternateProviderButton.hidden=false;
    ui.alternateProviderButton.textContent=`🔄 Provar ${PROVIDERS[1-providerIndex].label}`;
  }finally{
    clearTimeout(timeout);
    pending=false;
    ui.searchButton.disabled=false;
  }
}
filters.forEach(button=>button.addEventListener("click",()=>{
  activeType=button.dataset.type;
  filters.forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
  // A category tap is a user-initiated search if no results exist for this zone.
  // Otherwise it filters the already fetched results without a network call.
  if(map&&!pending&&isNewArea())fetchAroundCenter();
  else renderResults();
}));
ui.searchButton.addEventListener("click",()=>fetchAroundCenter());
ui.alternateProviderButton.addEventListener("click",()=>{
  if(!pending&&lastErrorProvider!==null)fetchAroundCenter({alternative:true});
});
ui.locateButton.addEventListener("click",()=>{
  if(!map)return;
  if(!navigator.geolocation){
    message("Aquest navegador no permet accedir al GPS. Mou el mapa i prem «Buscar aquí».");
    return;
  }
  locating=true;
  ui.locateButton.disabled=true;
  message("Esperant permís del GPS... En confirmar-lo, cercarem serveis a prop teu.");
  navigator.geolocation.getCurrentPosition(position=>{
    locating=false;
    ui.locateButton.disabled=false;
    const lat=position.coords.latitude,lng=position.coords.longitude;
    if(!validateCoords(lat,lng)){
      message("La ubicació GPS no és vàlida. Mou el mapa manualment.");
      return;
    }
    map.setView([lat,lng],15,{animate:false});
    // The button explicitly requests a nearby service search, not just centering.
    fetchAroundCenter();
  },error=>{
    locating=false;
    ui.locateButton.disabled=false;
    if(error?.code===1)message("Permís de localització denegat. Pots moure el mapa i prémer «Buscar aquí».");
    else if(error?.code===3)message("No s'ha pogut obtenir la ubicació a temps. Mou el mapa o torna-ho a provar.");
    else message("No s'ha pogut obtenir la ubicació. Pots cercar directament al centre del mapa.");
  },{
    enableHighAccuracy:false,maximumAge:60000,timeout:12000
  });
});
if(typeof window.L==="undefined"){
  message("No s'ha pogut carregar el mapa. Revisa la connexió.");
  ui.searchButton.disabled=true;
  ui.locateButton.disabled=true;
}else{
  const params=new URLSearchParams(window.location.search);
  const lat=Number(params.get("lat")),lng=Number(params.get("lng"));
  const initial=validateCoords(lat,lng)&&params.has("lat")&&params.has("lng")?[lat,lng]:[20,0];
  map=L.map("worldMap",{minZoom:2,maxZoom:19,worldCopyJump:true,keyboard:true})
    .setView(initial,initial[0]===20&&initial[1]===0?2:13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  markers=L.layerGroup().addTo(map);
  map.on("moveend",updateView);
  map.on("zoomend",updateView);
  map.on("click",event=>{
    if(map.getZoom()<12){
      map.setView(event.latlng,14,{animate:false});
      message("Zona seleccionada. Tria una categoria o prem «Buscar aquí».");
    }
  });
  updateView();
}
