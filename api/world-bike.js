"use strict";

// Read-only, same-origin Vercel function for small user-initiated world map queries.
// Provider failure is NOT equivalent to "no places in this area".
const PROVIDERS = Object.freeze({
  primary:{name:"Private.coffee",endpoint:"https://overpass.private.coffee/api/interpreter"},
  secondary:{name:"FOSSGIS",endpoint:"https://overpass-api.de/api/interpreter"}
});
const WAIT_MS=30_000;
const MAX_ELEMENTS=150;
const MAX_BODY_BYTES=850_000;
const MAX_COORD_CACHE=90;
const failures=new Map();
const inflight=new Map();
function json(res,status,body,cache=false) {
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Cache-Control",cache?
    "public, max-age=60, s-maxage=600, stale-while-revalidate=300" : "no-store");
  res.end(JSON.stringify(body));
}
function fail(res,status,code,message,provider) {
  json(res,status,{ok:false,code,message,provider:provider||null});
}
function valid(lat,lng){
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
}
function snapped(value){return Math.round(value*1000)/1000;}
function query(lat,lng){
  const near=`900,${lat.toFixed(3)},${lng.toFixed(3)}`;
  return `[out:json][timeout:10][maxsize:16000000];(nwr(around:${near})["amenity"~"^(bicycle_parking|bicycle_repair_station|drinking_water|bicycle_rental)$"];nwr(around:${near})["shop"="bicycle"];);out center ${MAX_ELEMENTS};`;
}
function prune(map){
  while(map.size>MAX_COORD_CACHE)map.delete(map.keys().next().value);
}
// Diagnostic metadata only: no IP, request URL, location, headers or GPS.
function logQuery(provider,answer,elapsedMs){
  console.info(JSON.stringify({
    event:"world-bike.provider",
    provider,
    outcome:answer.ok?"success":answer.code,
    upstreamStatus:answer.status||null,
    durationMs:Math.max(0,Math.round(elapsedMs)),
    records:answer.ok?answer.elements.length:null
  }));
}
async function requestOverpass(provider,lat,lng){
  let response;
  try{
    response=await fetch(provider.endpoint,{
      method:"POST",
      headers:{
        "Accept":"application/json",
        "Content-Type":"application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent":"BiciParkWorld/0.2 (+https://bicipark.com)"
      },
      body:new URLSearchParams({data:query(lat,lng)}),
      signal:AbortSignal.timeout(13_000)
    });
  }catch(error){
    return {ok:false,code:error?.name==="TimeoutError"?"UPSTREAM_TIMEOUT":"UPSTREAM_NETWORK",status:503};
  }
  if(!response.ok){
    return {ok:false,code:"UPSTREAM_HTTP",status:response.status};
  }
  try{
    const claimed=Number(response.headers.get("content-length"));
    if(claimed>MAX_BODY_BYTES)return {ok:false,code:"UPSTREAM_TOO_LARGE",status:502};
    const raw=await response.text();
    if(raw.length>MAX_BODY_BYTES)return {ok:false,code:"UPSTREAM_TOO_LARGE",status:502};
    const body=JSON.parse(raw);
    if(!Array.isArray(body.elements))return {ok:false,code:"UPSTREAM_INVALID_DATA",status:502};
    return {ok:true,elements:body.elements.slice(0,MAX_ELEMENTS),
      osm3s:body.osm3s&&typeof body.osm3s==="object"?
        {timestamp_osm_base:body.osm3s.timestamp_osm_base}:null,
      truncated:body.elements.length>=MAX_ELEMENTS};
  }catch{
    return {ok:false,code:"UPSTREAM_INVALID_DATA",status:502};
  }
}
module.exports=async function handler(req,res){
  if(req.method!=="GET"){
    res.setHeader("Allow","GET");
    return fail(res,405,"METHOD_NOT_ALLOWED","Només s'admet GET.");
  }
  const url=new URL(req.url||"/", "https://bicipark.com");
  const latText=url.searchParams.get("lat");
  const lngText=url.searchParams.get("lng");
  const lat=Number(latText),lng=Number(lngText);
  if(latText===null||lngText===null||!valid(lat,lng)){
    return fail(res,400,"INVALID_COORDS","Coordenades fora dels límits.");
  }
  const providerKey=url.searchParams.get("provider")||"primary";
  if(!Object.hasOwn(PROVIDERS,providerKey)){
    return fail(res,400,"INVALID_PROVIDER","Proveïdor no permès.");
  }
  const provider=PROVIDERS[providerKey];
  const startTime=Date.now();
  const centre={lat:snapped(lat),lng:snapped(lng)};
  const key=`${providerKey}/${centre.lat}/${centre.lng}`;
  const now=Date.now();
  if((failures.get(key)||0)>now){
    return fail(res,429,"RECENT_FAILURE","Zona temporalment pausada després d'un error.",provider.name);
  }
  let task=inflight.get(key);
  if(!task){
    task=requestOverpass(provider,centre.lat,centre.lng);
    inflight.set(key,task);
  }
  let answer;
  try{answer=await task;}
  finally{if(inflight.get(key)===task)inflight.delete(key);}
  logQuery(provider.name,answer,Date.now()-startTime);
  if(!answer.ok){
    failures.set(key,Date.now()+WAIT_MS);
    prune(failures);
    // Preserve remote status as structured metadata but do not turn upstream
    // 429 into a successful empty map.
    return json(res,503,{ok:false,code:answer.code,
      upstreamStatus:answer.status,provider:provider.name,
      message:"No s'han pogut obtenir registres d'OpenStreetMap."});
  }
  failures.delete(key);
  return json(res,200,{
    ok:true,provider:provider.name,
    queriedCenter:centre,elements:answer.elements,osm3s:answer.osm3s,
    truncated:answer.truncated
  },true);
};
module.exports._test={query,valid,snapped,requestOverpass};
