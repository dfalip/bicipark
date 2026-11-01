(() => {
  "use strict";
  if (window.__BICIPARK_DYNAMIC_WEATHER_BRIDGE_V5__) return;
  window.__BICIPARK_DYNAMIC_WEATHER_BRIDGE_V5__ = true;

  const params = new URLSearchParams(location.search);
  if (params.get("dynamic") !== "1") return;
  const requestedId = params.get("route") || "";
  const isResolved = params.get("resolved") === "1";
  const originalFetch = window.fetch.bind(window);

  function readJson(key) { try { const raw=sessionStorage.getItem(key); return raw?JSON.parse(raw):null; } catch(_){ return null; } }
  function writeJson(key,value){ try{sessionStorage.setItem(key,JSON.stringify(value));}catch(_){} }
  function removeKey(key){ try{sessionStorage.removeItem(key);}catch(_){} }
  function readMeta(){ return readJson("bicipark.weather.dynamicRoute"); }
  function readResolved(){ const route=readJson("bicipark.weather.dynamicResolved"); if(!route)return null; if(requestedId&&route.id!==requestedId)return null; return route; }

  function routeShell(meta, points, geoMode) {
    return {
      id: meta?.id || requestedId || ("dynamic-"+Date.now()),
      name: meta?.title || "Ruta Route Explorer",
      distanceKm: Number.isFinite(Number(meta?.distanceKm)) ? Number(meta.distanceKm) : 0,
      elevationM: Number.isFinite(Number(meta?.elevationM)) ? Number(meta.elevationM) : 0,
      difficulty: meta?.difficulty || "Sense classificar",
      mode: meta?.mode || "Ruta",
      points,
      dynamicEstimated: geoMode !== "catalog-bounds",
      geoMode
    };
  }

  function pointsFromCatalog(meta) {
    const b=meta?.bounds;
    const c=meta?.center;
    if (b && [b.south,b.west,b.north,b.east].every(v=>Number.isFinite(Number(v)))) {
      const south=Number(b.south), west=Number(b.west), north=Number(b.north), east=Number(b.east);
      const midLat=(south+north)/2, midLng=(west+east)/2;
      return [[south,west],[midLat,west+(east-west)*.35],[Number(c?.lat)||midLat,Number(c?.lng)||midLng],[midLat,west+(east-west)*.65],[north,east]];
    }
    if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
      const lat=Number(c.lat),lng=Number(c.lng);
      return [[lat-.012,lng-.012],[lat-.006,lng],[lat,lng+.009],[lat+.006,lng],[lat+.012,lng-.012]];
    }
    return [];
  }

  function placeholderRoute(meta) {
    const points=pointsFromCatalog(meta);
    return routeShell(meta,points.length?points:[[0,0]],points.length?"catalog-bounds":"unresolved");
  }

  window.fetch=async function(input,init){
    const url=typeof input==="string"?input:(input?.url||"");
    if(/weather-routes\.json(?:\?|$)/.test(url)){
      const meta=readMeta(); const route=readResolved()||placeholderRoute(meta);
      return new Response(JSON.stringify([route]),{status:200,headers:{"Content-Type":"application/json"}});
    }
    return originalFetch(input,init);
  };

  function installFitBoundsGuard(){
    if(!window.L||!L.Map||!L.Map.prototype.fitBounds||L.Map.prototype.__biciparkWeatherDynamicFitV5)return;
    const original=L.Map.prototype.fitBounds;
    L.Map.prototype.fitBounds=function(bounds,options){let safe=bounds;try{const parsed=L.latLngBounds(bounds);if(parsed?.isValid())safe=parsed.pad(.20);}catch(_){}
      const result=original.call(this,safe,Object.assign({},options||{},{padding:[45,45],maxZoom:10}));
      setTimeout(()=>{try{this.invalidateSize(false);}catch(_){}},100); return result;};
    L.Map.prototype.__biciparkWeatherDynamicFitV5=true;
  }
  installFitBoundsGuard();

  async function pointsFromGpx(meta){
    if(!meta?.geometryFile || !/\.gpx(?:\?|$)/i.test(meta.geometryFile)) return [];
    try{
      const url=new URL(meta.geometryFile,location.origin).href;
      const response=await originalFetch(url,{cache:"no-store"}); if(!response.ok)return [];
      const xml=await response.text(); const doc=new DOMParser().parseFromString(xml,"application/xml");
      const nodes=Array.from(doc.getElementsByTagNameNS("*","trkpt"));
      const all=nodes.map(n=>[Number(n.getAttribute("lat")),Number(n.getAttribute("lon"))]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
      if(!all.length)return [];
      const count=Math.min(7,all.length); const sampled=[];
      for(let i=0;i<count;i++)sampled.push(all[Math.round(i*(all.length-1)/(count-1||1))]);
      return sampled;
    }catch(_){return [];}
  }

  async function resolveDynamicRoute(meta){
    if(!meta)return placeholderRoute(meta);
    const gpx=await pointsFromGpx(meta);
    if(gpx.length){const route=routeShell(meta,gpx,"gpx-sampled");route.dynamicEstimated=false;route.geometryFile=meta.geometryFile;return route;}
    return placeholderRoute(meta);
  }

  function addWarning(route){
    const attempt=()=>{if(document.querySelector(".wr-dynamic-warning"))return true;const status=document.getElementById("weatherStatus");if(!status)return false;
      const box=document.createElement("div");box.className="wr-dynamic-warning";
      if(route?.geoMode==="gpx-sampled") box.innerHTML="<strong>Ruta real:</strong> la meteorologia es calcula sobre punts mostrejats del tracat GPX de la ruta.";
      else if(route?.geoMode==="catalog-bounds") box.innerHTML="<strong>Referencia territorial:</strong> no s'ha pogut llegir el tracat complet. La meteorologia es calcula dins la zona registrada de la ruta, no des de la ubicacio de l'usuari.";
      else box.innerHTML="<strong>Ruta sense referencia geografica suficient:</strong> no es mostra una ubicacio substitutiva per evitar dades meteorologiques enganyoses.";
      status.insertAdjacentElement("afterend",box);return true;};
    if(attempt())return;let tries=0;const timer=setInterval(()=>{tries++;if(attempt()||tries>80)clearInterval(timer);},100);
  }

  async function prepare(){
    const meta=readMeta(); if(!meta)return;
    const existing=readJson("bicipark.weather.dynamicResolved");
    if(existing&&existing.id!==(meta.id||requestedId))removeKey("bicipark.weather.dynamicResolved");
    if(isResolved){addWarning(readResolved()||placeholderRoute(meta));return;}
    removeKey("bicipark.weather.dynamicResolved");
    const resolved=await resolveDynamicRoute(meta);writeJson("bicipark.weather.dynamicResolved",resolved);
    const next=new URL(location.href);next.searchParams.set("resolved","1");location.replace(next.href);
  }

  prepare().catch(error=>{console.warn("[Weather Dynamic v5]",error);const fallback=placeholderRoute(readMeta());writeJson("bicipark.weather.dynamicResolved",fallback);const next=new URL(location.href);next.searchParams.set("resolved","1");location.replace(next.href);});
})();