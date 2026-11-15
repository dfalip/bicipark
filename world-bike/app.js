import {SEARCH_RADIUS_METERS, SERVICE_TYPES, normalizeOverpassResponse, validateCoords} from "./services.js";
// The translation helper stays optional in non-browser tests; the official page loads i18n.js.
const t=(key,vars)=>window.BiciParkWorldI18n?.t(key,vars)??key;
const categoryKey={bicycle_parking:"categoryParking",bicycle_repair_station:"categoryRepair",drinking_water:"categoryWater",bicycle_rental:"categoryRental",bicycle_shop:"categoryShop"};

// Public, shared Overpass is for deliberately small manual pilot requests only.
// DO NOT use this as the production backend at scale. A quota-limited service
// with global application-level caching and throttling must replace it.
// Same-origin Vercel endpoint handles outbound Overpass requests and CDN caching.
// The second data source remains a deliberate user-initiated recovery action.
const API_ENDPOINT = "/api/world-bike";
const PROVIDERS = Object.freeze([
  {label:"Private.coffee",key:"primary"},
  {label:"FOSSGIS",key:"secondary"}
]);
const COOLDOWN_MS = 20000;
const PROVIDER_LIMIT_PAUSE_MS = 30000;
const CACHE_MAX_ENTRIES = 12;
const ui = Object.fromEntries([
  "worldMap","coordinates","locateButton","searchButton","status",
  "resultCount","sourceStamp","resultList","alternateProviderButton",
  "placeSearchForm","placeSearchInput","placeSearchButton",
  "placeSearchStatus","placeSearchResults"
].map(id=>[id,document.getElementById(id)]));
const filters=[...document.querySelectorAll(".wb-filters button")];
let activeType="all";
let records=[];
let sourceTimestamp=null;
let sourceProvider=null;
let mayBeTruncated=false;
let searchedCentre=null;
const lastRequestAt=[0,0];
const limitedUntil=[0,0];
let activeProviderIndex=0;
let lastErrorProvider=null;
let pending=false;
let locating=false;
let placeSearchGeneration=0;
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
// Display coordinates in the selected language; API queries remain numeric and unchanged.
const num=value=>Number(value).toLocaleString(({ca:"ca-ES",es:"es-ES",en:"en-US",fr:"fr-FR"})[window.BiciParkWorldI18n?.language]||"ca-ES",{maximumFractionDigits:3});
const coords=centre=>`${num(centre.lat)}°, ${num(centre.lng)}°`;
// The browser and gateway both use a 0.001-degree cell (~111m latitude).
// Repeated searches inside the same cell must reuse the same documented area.
function queryCentre(position){
  return {
    lat:Math.round(position.lat*1000)/1000,
    lng:Math.round(position.lng*1000)/1000
  };
}
function isNewArea() {
  if(!map||!searchedCentre)return true;
  const centre=queryCentre(map.getCenter());
  return centre.lat!==searchedCentre.lat || centre.lng!==searchedCentre.lng;
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
  if(!pending&&!locating&&isNewArea()&&ui.status.dataset.kind!=="error"&&ui.status.dataset.kind!=="loading"){
    message(searchedCentre
      ? t("mapChanged")
      : t("choose"));
  }
}
function clearVisibleServices(){
  records=[];
  sourceTimestamp=null;
  sourceProvider=null;
  mayBeTruncated=false;
  searchedCentre=null;
  if(markers)markers.clearLayers();
  if(searchCircle&&map)map.removeLayer(searchCircle);
  searchCircle=null;
  ui.resultList.replaceChildren();
  ui.resultCount.textContent=t("noZone");
  ui.sourceStamp.textContent=t("sourcePending");
  hideAlternative();
}
async function searchPlace(event){
  event.preventDefault();
  // Only the latest submitted geocoding request may update suggestions or controls.
  const generation=++placeSearchGeneration;
  const name=ui.placeSearchInput.value.trim();
  if(name.length<3){
    ui.placeSearchStatus.textContent=t("min3");
    return;
  }
  if(pending){
    ui.placeSearchStatus.textContent=t("waitServices");
    return;
  }
  if(!map||typeof window.BiciParkGeocoder?.search!=="function"){
    ui.placeSearchStatus.textContent=t("geocoderUnavailable");
    return;
  }
  ui.placeSearchButton.disabled=true;
  ui.placeSearchResults.replaceChildren();
  ui.placeSearchStatus.textContent=t("searchingPlaces");
  try{
    const suggestions=await window.BiciParkGeocoder.search(name);
    // A slow geocoder must never show suggestions for text the user has since changed.
    if(generation!==placeSearchGeneration)return;
    if(ui.placeSearchInput.value.trim()!==name){
      ui.placeSearchStatus.textContent=t("searchChanged");
      return;
    }
    const places=Array.isArray(suggestions)?suggestions
      .filter(p=>validateCoords(p?.lat,p?.lng)&&typeof p.label==="string"&&p.label.trim())
      .slice(0,5):[];
    if(!places.length){
      ui.placeSearchStatus.textContent=t("noPlace");
      return;
    }
    ui.placeSearchStatus.textContent=t("foundPlaces",{count:places.length});
    for(const place of places){
      const li=document.createElement("li");
      const button=document.createElement("button");
      button.type="button";
      button.textContent=place.label;
      button.addEventListener("click",()=>{
        if(pending){
          ui.placeSearchStatus.textContent=t("waitSelect");
          return;
        }
        // Selecting an earlier suggestion invalidates any newer in-flight geocoder
        // response, so it cannot repopulate choices for a different city.
        placeSearchGeneration++;
        ui.placeSearchButton.disabled=false;
        clearVisibleServices();
        map.setView([place.lat,place.lng],14,{animate:false});
        ui.placeSearchStatus.textContent=t("centred",{name:place.label});
        ui.placeSearchResults.replaceChildren();
        message(t("placeSelected"));
      });
      li.appendChild(button);
      ui.placeSearchResults.appendChild(li);
    }
  }catch(error){
    if(generation!==placeSearchGeneration)return;
    ui.placeSearchStatus.textContent=error?.name==="AbortError"?
      t("searchTimeout"):
      t("searchFailed");
  }finally{
    if(generation===placeSearchGeneration)ui.placeSearchButton.disabled=false;
  }
}
// Suggestions are tied to the exact submitted text. Invalidate them immediately
// when the input changes, including while a geocoder request is still in flight.
ui.placeSearchInput.addEventListener("input",()=>{
  placeSearchGeneration++;
  ui.placeSearchResults.replaceChildren();
  ui.placeSearchButton.disabled=false;
  ui.placeSearchStatus.textContent=t("searchChanged");
});
ui.placeSearchForm.addEventListener("submit",searchPlace);
function createPlannerLink(item){
  const link=document.createElement("a");
  link.href="/modules/route-planner/?" + new URLSearchParams({
    to:`${item.lat},${item.lng}`
  }).toString();
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.title=t("plannerTitle");
  link.textContent=t("planner");
  return link;
}
function createOsmLink(item){
  const link=document.createElement("a");
  link.href=item.sourceUrl;
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.textContent=t("sourceLink");
  return link;
}
function renderResults(){
  const visible=activeType==="all" ? records : records.filter(item=>item.type===activeType);
  ui.resultList.replaceChildren();
  ui.resultCount.textContent=searchedCentre?
    t("recordCount",{count:visible.length,limited:mayBeTruncated?t("limited"):""}) : t("none");
  ui.sourceStamp.textContent=searchedCentre?
    t("sourceArea",{provider:sourceProvider||"font no indicada",area:coords(searchedCentre),
      date:sourceTimestamp?t("sourceDate",{date:sourceTimestamp.slice(0,10)}):t("sourceNoDate")}) :
    t("sourceDefault");
  if(markers)markers.clearLayers();
  if(visible.length===0&&searchedCentre){
    const item=document.createElement("li");
    item.className="wb-no-results";
    item.textContent=t("noResults");
    ui.resultList.appendChild(item);
  }
  for(const place of visible){
    const category=SERVICE_TYPES[place.type];
    const li=document.createElement("li");
    const heading=document.createElement("strong");
    // Translate only synthetic category fallbacks. Preserve real OSM names verbatim.
    const displayName=place.name===category.label?t(categoryKey[place.type]):place.name;
    heading.textContent=`${category.icon} ${displayName}`;
    const meta=document.createElement("span");
    meta.textContent=t(categoryKey[place.type])+" · "+t("community");
    const actions=document.createElement("div");
    const focus=document.createElement("button");
    focus.type="button";
    focus.textContent=t("viewMap");
    focus.addEventListener("click",()=>{if(map)map.setView([place.lat,place.lng],17);});
    actions.append(focus,createPlannerLink(place),createOsmLink(place));
    li.append(heading,meta,actions);
    ui.resultList.appendChild(li);
    const marker=L.circleMarker([place.lat,place.lng],{
      radius:8,color:"#0b5c46",weight:2,fillColor:"#39bc8f",fillOpacity:.9
    });
    const popup=document.createElement("div");
    const title=document.createElement("strong");title.textContent=displayName;
    const type=document.createElement("p");type.textContent=t(categoryKey[place.type])+" · "+t("notVerified");
    popup.append(title,type,createPlannerLink(place),createOsmLink(place));
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
  sourceProvider=data.provider||null;
  mayBeTruncated=data.truncated;
  searchedCentre={lat:location.lat,lng:location.lng};
  if(searchCircle)map.removeLayer(searchCircle);
  searchCircle=L.circle([location.lat,location.lng],{radius:SEARCH_RADIUS_METERS,
    color:"#0b7055",weight:2,fillOpacity:.04}).addTo(map);
  renderResults();
  // The user can pan while the request is in flight. Never imply that an old
  // query describes the newly displayed map area after its response arrives.
  if(isNewArea())message(t("newArea"),"info");
  else if(records.length===0)message(t("emptySuccess"),"success");
  else message(t("loaded",{count:records.length}),"success");
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
  const centre=queryCentre(map.getCenter());
  if(!validateCoords(centre.lat,centre.lng))return;
  // The request, cache and 900m circle all refer to the same snapped centre.
  const key=`${centre.lat}:${centre.lng}`;
  if(!alternative&&cache.has(key)){
    const saved=cache.get(key);
    applyData(saved.data,saved.centre);
    message(t("reused"));
    return;
  }
  const now=Date.now();
  if(now<limitedUntil[providerIndex]){
    // The cooldown isn't the original failure; don't overwrite its diagnosis.
    if(lastErrorProvider===null)message(t("providerPause",{provider:provider.label}),"error");
    return;
  }
  if(now-lastRequestAt[providerIndex]<COOLDOWN_MS){
    // Preserve the actual upstream reason and the alternative-provider action.
    if(lastErrorProvider===null)message(t("providerCooldown",{provider:provider.label}),"error");
    return;
  }
  lastRequestAt[providerIndex]=now;
  pending=true;
  ui.searchButton.disabled=true;
  ui.resultCount.textContent=t("loading");
  message(t("requesting",{provider:provider.label}),"loading");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),16000);
  try{
    // Approximate coordinates BEFORE sending them to the backend, so
    // exact GPS coordinates do not enter request URLs, CDN or access logs.
    const approximateCentre=centre;
    const query=new URLSearchParams({
      lat:String(approximateCentre.lat),lng:String(approximateCentre.lng),provider:provider.key
    });
    const response=await fetch(`${API_ENDPOINT}?${query.toString()}`,{
      method:"GET",
      headers:{"Accept":"application/json"},
      signal:controller.signal
    });
    let payload;
    try{payload=await response.json();}
    catch{
      const failure=new Error("Gateway returned non-JSON");
      failure.httpStatus=response.status;
      failure.code="INVALID_GATEWAY_RESPONSE";
      throw failure;
    }
    if(!response.ok){
      const upstreamStatus=Number(payload?.upstreamStatus);
      const code=typeof payload?.code==="string"?payload.code:"GATEWAY_ERROR";
      const error=new Error(`BiciPark gateway ${code}`);
      error.code=code;
      error.upstreamStatus=Number.isFinite(upstreamStatus)?upstreamStatus:null;
      error.httpStatus=response.status;
      throw error;
    }
    if(payload?.ok!==true)throw new Error("Invalid gateway envelope");
    const queriedCenter=payload.queriedCenter&&
      validateCoords(payload.queriedCenter.lat,payload.queriedCenter.lng)
        ? payload.queriedCenter : approximateCentre;
    const parsed=normalizeOverpassResponse(payload,queriedCenter);
    parsed.provider=typeof payload.provider==="string"?payload.provider:provider.label;
    activeProviderIndex=providerIndex;
    cache.set(key,{data:parsed,centre:queriedCenter});
    if(cache.size>CACHE_MAX_ENTRIES)cache.delete(cache.keys().next().value);
    applyData(parsed,queriedCenter);
  }catch(error){
    ui.resultCount.textContent=t("failedResults");
    if(searchedCentre){
      ui.sourceStamp.textContent=t("previousArea",{area:coords(searchedCentre)});
    }
    const msg=String(error?.message||"");
    let explanation;
    if(error?.name==="AbortError"){
      explanation=t("timeout");
    }else if(error?.upstreamStatus===406||error?.upstreamStatus===429){
      limitedUntil[providerIndex]=Date.now()+PROVIDER_LIMIT_PAUSE_MS;
      explanation=t("limitedProvider",{status:error.upstreamStatus});
    }else if(["UPSTREAM_HTTP","UPSTREAM_TIMEOUT","UPSTREAM_NETWORK","UPSTREAM_INVALID_DATA","UPSTREAM_TOO_LARGE"].includes(error?.code)){
      explanation=t("upstreamUnavailable",{reason:error.code+(error.upstreamStatus?"/ HTTP "+error.upstreamStatus:"")});
    }else if(error?.code==="RECENT_FAILURE"){
      explanation=t("recentFailure");
    }else if(error?.httpStatus===404){
      explanation=t("missingGateway");
    }else if(error?.code==="INVALID_GATEWAY_RESPONSE"){
      explanation=t("malformedGateway",{status:error.httpStatus||"desconegut"});
    }else if(error?.name==="TypeError"){
      explanation=t("disconnected");
    }else{
      explanation=t("invalidResponse");
    }
    message(t("errorAlternative",{provider:provider.label,explanation}),"error");
    lastErrorProvider=providerIndex;
    ui.alternateProviderButton.hidden=false;
    ui.alternateProviderButton.textContent=t("retryNamed",{provider:PROVIDERS[1-providerIndex].label});
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
  // Keep the loading state visible; the latest selected category will be
  // applied when this in-flight response is rendered. Do not erase spinner
  // or display a false "no results" state while waiting for real data.
  if(pending)return;
  if(map&&isNewArea())fetchAroundCenter();
  else renderResults();
}));
window.addEventListener("biciparkworldlanguagechange",()=>{
  // Re-render only local data, without another provider or GPS request.
  if(searchedCentre)renderResults();
  else if(!pending){ui.resultCount.textContent=t("none");ui.sourceStamp.textContent=t("sourceNoteShort");}
});
ui.searchButton.addEventListener("click",()=>fetchAroundCenter());
ui.alternateProviderButton.addEventListener("click",()=>{
  if(!pending&&lastErrorProvider!==null)fetchAroundCenter({alternative:true});
});
ui.locateButton.addEventListener("click",()=>{
  if(!map)return;
  if(!navigator.geolocation){
    message(t("gpsNotAvailable"));
    return;
  }
  locating=true;
  ui.locateButton.disabled=true;
  message(t("gpsAwait"));
  navigator.geolocation.getCurrentPosition(position=>{
    locating=false;
    ui.locateButton.disabled=false;
    const lat=position.coords.latitude,lng=position.coords.longitude;
    if(!validateCoords(lat,lng)){
      message(t("gpsInvalid"));
      return;
    }
    map.setView([lat,lng],15,{animate:false});
    // The button explicitly requests a nearby service search, not just centering.
    fetchAroundCenter();
  },error=>{
    locating=false;
    ui.locateButton.disabled=false;
    if(error?.code===1)message(t("gpsDenied"));
    else if(error?.code===3)message(t("gpsTimeout"));
    else message(t("gpsFailed"));
  },{
    enableHighAccuracy:false,maximumAge:60000,timeout:12000
  });
});
if(typeof window.L==="undefined"){
  message(t("mapUnavailable"));
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
      message(t("areaSelected"));
    }
  });
  updateView();
}
