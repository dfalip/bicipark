import {SEARCH_RADIUS_METERS, SERVICE_TYPES, buildOverpassQuery, normalizeOverpassResponse, validateCoords} from "./services.js";

// Public, shared Overpass is for deliberately small manual pilot requests only.
// DO NOT use this as the production backend at scale. A quota-limited service
// with global application-level caching and throttling must replace it.
const PROVIDER = "https://overpass-api.de/api/interpreter";
const COOLDOWN_MS = 20000;
const CACHE_MAX_ENTRIES = 12;
const ui = Object.fromEntries([
  "worldMap","coordinates","locateButton","searchButton","status",
  "resultCount","sourceStamp","resultList"
].map(id=>[id,document.getElementById(id)]));
const filters=[...document.querySelectorAll(".wb-filters button")];
let activeType="all";
let records=[];
let sourceTimestamp=null;
let mayBeTruncated=false;
let searchedCentre=null;
let lastRequestAt=0;
let pending=false;
const cache=new Map();
let map=null;
let markers=null;
let searchCircle=null;
const message=text=>{ui.status.textContent=text;};
const num=value=>Number(value).toLocaleString("ca-ES",{maximumFractionDigits:3});
const coords=centre=>`${num(centre.lat)}°, ${num(centre.lng)}°`;

function updateView() {
  if(!map)return;
  const centre=map.getCenter();
  ui.coordinates.textContent=`${coords(centre)} · zoom ${map.getZoom()}`;
  ui.searchButton.disabled=map.getZoom()<12||pending;
  if(map.getZoom()<12){
    message("Acosta el mapa fins a zoom 12 o superior per consultar una àrea concreta.");
  }else if(!pending){
    message("Pots consultar ara un radi de 900 m al centre del mapa.");
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
  if(records.length===0)message("No hi ha registres en aquesta consulta. Les dades OSM poden ser incompletes.");
  else message(`Consulta completada: ${records.length} registres OSM dins de 900 m. No verificats in situ.`);
}
async function fetchAroundCenter(){
  if(!map||pending)return;
  if(map.getZoom()<12){message("Acosta el mapa a zoom 12 o més abans de consultar.");return;}
  const centre=map.getCenter();
  if(!validateCoords(centre.lat,centre.lng))return;
  const key=`${centre.lat.toFixed(3)}:${centre.lng.toFixed(3)}`;
  if(cache.has(key)){applyData(cache.get(key),centre);return;}
  const now=Date.now();
  if(now-lastRequestAt<COOLDOWN_MS){
    message("Per respectar el servei públic, espera uns segons abans de fer una nova consulta.");
    return;
  }
  lastRequestAt=now;
  pending=true;
  ui.searchButton.disabled=true;
  message("Consultant un radi reduït... Sense consultes automàtiques ni reintents.");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),16000);
  try{
    const query=buildOverpassQuery(centre.lat,centre.lng);
    const response=await fetch(PROVIDER,{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body:new URLSearchParams({data:query}).toString(),
      signal:controller.signal,
      cache:"default"
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const parsed=normalizeOverpassResponse(await response.json());
    cache.set(key,parsed);
    if(cache.size>CACHE_MAX_ENTRIES)cache.delete(cache.keys().next().value);
    applyData(parsed,centre);
  }catch(error){
    if(error?.name==="AbortError")message("La consulta ha trigat massa. Prova més tard; no la repetim automàticament.");
    else if(/HTTP (429|504|503|502)/.test(error?.message||"")){
      message("Servei públic saturat o limitat. No es faran reintents automàtics.");
    }else message("No s'han pogut recuperar dades d'aquesta zona. Comprova la connexió o prova més tard.");
  }finally{
    clearTimeout(timeout);
    pending=false;
    ui.searchButton.disabled=map.getZoom()<12;
  }
}
filters.forEach(button=>button.addEventListener("click",()=>{
  activeType=button.dataset.type;
  filters.forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
  renderResults();
}));
ui.searchButton.addEventListener("click",fetchAroundCenter);
ui.locateButton.addEventListener("click",()=>{
  if(!navigator.geolocation){message("La geolocalització no està disponible en aquest navegador.");return;}
  message("Sol·licitant permís de localització al navegador...");
  navigator.geolocation.getCurrentPosition(position=>{
    map?.setView([position.coords.latitude,position.coords.longitude],15);
  },()=>message("No s'ha pogut accedir a la localització. També pots moure el mapa manualment."),{
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
  updateView();
}
