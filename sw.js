'use strict';
const VERSION='bicipark-v6';
const SHELL=VERSION+'-shell',RUNTIME=VERSION+'-runtime',DATA=VERSION+'-data';
const FILES=['/modules/weather-shared/icons.js','/modules/route-planner/address-search.js','/modules/geocoding/geocoding.js','/aparcaments.html','/styles.css','/css/aparcaments.css','/app.js?v=mobility-1','/modules/parking/details.js','/vendor/markercluster/leaflet.markercluster.js','/vendor/markercluster/MarkerCluster.css','/vendor/markercluster/MarkerCluster.Default.css','/offline.html','/manifest.webmanifest','/modules/route-planner/','/modules/route-planner/planner.css','/modules/route-planner/planner.js','/modules/route-planner/gpx.js','/modules/today/','/modules/today/today.css','/modules/today/today.js','/modules/today/engine/recommendation-engine.js','/modules/today/providers/open-meteo.js','/modules/my-bike/','/modules/my-bike/my-bike.css','/modules/my-bike/my-bike.js','/modules/my-bike/pressure-advisor.js','/modules/bike-passport/','/modules/bike-passport/passport.css','/modules/bike-passport/passport.js','/modules/bike-passport/proof-model.js','/modules/marketplace/','/modules/marketplace/marketplace.css','/modules/marketplace/store.js','/modules/marketplace/marketplace.js','/modules/marketplace/passport-integration.js','/modules/route-match/engine/profile-store.js','/route-explorer/data/routes.json','/vendor/leaflet/leaflet.css','/vendor/leaflet/leaflet.js','/vendor/leaflet/images/marker-icon.png','/vendor/leaflet/images/marker-shadow.png','/js/core/bicipark-core.js','/js/pwa.js','/js/home.js','/js/home-market.js','/css/home-market.css','/css/bicipark-nav.css','/js/bicipark-global-nav.js','/css/i18n.css','/js/i18n.js','/js/i18n-fr.js','/js/i18n-bindings.js','/js/marketplace-nav.js','/assets/pwa/icon-192.png','/assets/pwa/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('bicipark-')&&![SHELL,RUNTIME,DATA].includes(key))await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||req.headers.has('authorization'))return;
 const isData=/^\/data\/[^/]+\/(parkings|bike-lanes)\.json$/.test(url.pathname)||url.pathname==='/cities.json'||url.pathname==='/route-explorer/data/routes.json';
 const isAsset=/\.(?:html|css|js|png|svg|webmanifest)$/.test(url.pathname)||url.pathname==='/modules/route-planner/'||url.pathname==='/modules/today/'||url.pathname==='/modules/my-bike/'||url.pathname==='/modules/bike-passport/'||url.pathname==='/modules/marketplace/';
 if(!isData&&!isAsset&&req.mode!=='navigate')return;
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
 event.respondWith((async()=>{
  try{
   const res=await fetch(req);
   if(res.ok&&res.type==='basic'&&!/no-store|private/i.test(res.headers.get('cache-control')||'')){
    try {const cache=await caches.open(isData?DATA:RUNTIME);await cache.put(req,res.clone());const keys=await cache.keys(),limit=isData?12:200;for(const key of keys.slice(0,Math.max(0,keys.length-limit)))await cache.delete(key)} catch (_) {}
   }
   return res;
  }catch{
   const cached=await caches.match(req);if(cached)return cached;
   if(req.mode==='navigate')return caches.match('/offline.html');
   return new Response('No disponible sense connexió',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 })());
});
