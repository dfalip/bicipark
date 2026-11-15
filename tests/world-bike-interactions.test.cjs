'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {readFileSync} = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'world-bike');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = readFileSync(path.join(root, 'app.js'), 'utf8');
const servicesSource = readFileSync(path.join(root, 'services.js'), 'utf8');
const translationsSource = readFileSync(path.join(root, 'i18n.js'), 'utf8');
const services = import('data:text/javascript;base64,' + Buffer.from(servicesSource).toString('base64'));
const sampleData = {
  osm3s: {timestamp_osm_base:'2026-11-14T09:00:00Z'},
  elements: [
    {type:'node', id:22, lat:41.39, lon:2.17, tags:{amenity:'bicycle_parking',name:'Aparcament de prova'}},
    {type:'node', id:23, lat:41.391, lon:2.171, tags:{amenity:'drinking_water'}}
  ]
};

async function setup({withGPS=false,denyGPS=false,failedFetch=false,primaryFails=false}={}) {
  const dom = new JSDOM(html, {
    url:'https://example.org/world-bike/',
    runScripts:'outside-only',
    pretendToBeVisual:true
  });
  const {window}=dom;
  let location={lat:20,lng:0};
  let zoom=2;
  let fetchCount=0;
  const requestUrls=[];
  const geoQueries=[];
  const listeners = new Map();
  const emit=(key,payload)=>{for(const fn of listeners.get(key)||[])fn(payload);};
  const markerLayer={addTo(){return this;},clearLayers(){},addLayer(){}};
  const circle={addTo(){return this;},setStyle(){}};
  const map={
    getCenter(){return {...location};},
    getZoom(){return zoom;},
    setView(point,newZoom){
      location=Array.isArray(point)?{lat:point[0],lng:point[1]}:{lat:point.lat,lng:point.lng};
      if(typeof newZoom==='number')zoom=newZoom;
      emit('moveend');emit('zoomend');
      return this;
    },
    on(name,callback){listeners.set(name,[...(listeners.get(name)||[]),callback]);return this;},
    removeLayer(){},invalidateSize(){},addLayer(){}
  };
  const tile={addTo(){return this;}};
  const marker={bindPopup(){return this;}};
  window.L={
    map(){return map;},
    tileLayer(){return tile;},
    layerGroup(){return markerLayer;},
    circle(){return circle;},
    circleMarker(){return marker;}
  };
  window.fetch=async url=>{
    fetchCount+=1;
    requestUrls.push(String(url));
    assert.match(String(url),/^\/api\/world-bike\?/,'Browser must use its own gateway, not third-party CORS');
    const provider=new URL(String(url),'https://example.org').searchParams.get('provider');
    if(failedFetch)return {ok:false,status:503,json:async()=>({
      ok:false,code:'UPSTREAM_HTTP',upstreamStatus:429,provider:'Private.coffee'
    })};
    if(primaryFails&&provider==='primary')return {ok:false,status:503,json:async()=>({
      ok:false,code:'UPSTREAM_HTTP',upstreamStatus:503,provider:'Private.coffee'
    })};
    return {ok:true,status:200,json:async()=>({...sampleData,ok:true})};
  };
  const gps=withGPS?{
    getCurrentPosition(success,failure){
      if(denyGPS)failure({code:1});
      else success({coords:{latitude:41.39,longitude:2.17}});
    }
  }:undefined;
  Object.defineProperty(window.navigator,'geolocation',{configurable:true,value:gps});
  window.BiciParkGeocoder={
    search:async q=>{
      geoQueries.push(q);
      return [
        {lat:52.3676,lng:4.9041,label:"Amsterdam, Nederland"},
        {lat:35.6762,lng:139.6503,label:"Tòquio, Japó"}
      ];
    }
  };
  window.eval(translationsSource);
  window.__worldServices=await services;
  const importLine=/^import \{[^\n]+\} from "\.\/services\.js";\s*/;
  assert.match(appSource,importLine);
  window.eval(appSource.replace(importLine,
    'const {SEARCH_RADIUS_METERS,SERVICE_TYPES,buildOverpassQuery,normalizeOverpassResponse,validateCoords}=window.__worldServices;\n'
  ));
  const flush=async()=>{await new Promise(resolve=>setTimeout(resolve,12));};
  return {window,dom,map,flush,requestUrls,geoQueries,get fetchCount(){return fetchCount;},get zoom(){return zoom;},get location(){return location;}};
}

test('Initial search works at world zoom; category button loads OSM data then filters locally',async()=>{
  const h=await setup();
  try{
    // Choose a region without zooming in: mocked POIs are in Barcelona.
    h.map.setView([41.39,2.17],2);
    assert.equal(h.window.document.getElementById('searchButton').disabled,false);
    const parking=h.window.document.querySelector('[data-type="bicycle_parking"]');
    parking.click();
    await h.flush();
    assert.equal(h.fetchCount,1,'Category tap must fetch the first data set');
    assert.equal(h.zoom,14,'Search must zoom in to explain its fixed 900m radius');
    assert.match(h.window.document.getElementById('resultCount').textContent,/1 registres/);
    const water=h.window.document.querySelector('[data-type="drinking_water"]');
    water.click();
    await h.flush();
    assert.equal(h.fetchCount,1,'Filtering cached results must not hit Overpass again');
    assert.match(h.window.document.getElementById('resultList').textContent,/Aigua potable/);
  }finally{h.dom.window.close();}
});

test('Changing a category during an in-flight query keeps loading and shows selected results',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.39,2.17],15);
    let finish;
    let calls=0;
    h.window.fetch=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
    const $=id=>h.window.document.getElementById(id);
    h.window.document.querySelector('[data-type="bicycle_parking"]').click();
    assert.equal(calls,1);
    assert.match($('resultCount').textContent,/Buscant serveis/);
    h.window.document.querySelector('[data-type="drinking_water"]').click();
    assert.equal(calls,1,'Switching filters must never duplicate a pending provider query');
    assert.match($('resultCount').textContent,/Buscant serveis/,'Do not replace loading with empty state');
    assert.equal($('status').dataset.kind,'loading');
    finish({ok:true,status:200,json:async()=>({...sampleData,ok:true})});
    await h.flush();
    assert.match($('resultCount').textContent,/1 registres/);
    assert.match($('resultList').textContent,/Aigua potable/);
    assert.equal(h.window.document.querySelector('[data-type="drinking_water"]').getAttribute('aria-pressed'),'true');
  }finally{h.dom.window.close();}
});

test('A late area response is clearly marked stale when the map moved before completion',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.39,2.17],15);
    let finish;
    h.window.fetch=()=>new Promise(resolve=>{finish=resolve;});
    const $=id=>h.window.document.getElementById(id);
    $('searchButton').click();
    assert.equal($('status').dataset.kind,'loading');
    h.map.setView([48.857,2.352],15);
    finish({ok:true,status:200,json:async()=>({...sampleData,ok:true})});
    await h.flush();
    assert.match($('status').textContent,/zona anterior/);
    assert.match($('status').textContent,/zona nova/);
    assert.doesNotMatch($('status').textContent,/Consulta completada: 2 registres/);
    assert.match($('sourceStamp').textContent,/41,39/,'Result source remains the actual queried centre');
  }finally{h.dom.window.close();}
});

test('World pilot switches core UI and local OSM record labels between four languages without refetching',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    const lang=$('worldLanguage');
    const samples=[
      ['es','Buscar ciudad','🅿️ Aparcamiento','es'],
      ['en','Find city','🅿️ Parking','en'],
      ['fr','Chercher une ville','🅿️ Stationnement','fr'],
      ['ca','Cerca ciutat','🅿️ Aparcament','ca']
    ];
    for(const [locale,city,parking,documentLang] of samples){
      lang.value=locale;
      lang.dispatchEvent(new h.window.Event('change',{bubbles:true}));
      assert.equal(h.window.document.documentElement.lang,documentLang);
      assert.equal($('placeSearchButton').textContent,city);
      assert.equal(h.window.document.querySelector('[data-type="bicycle_parking"]').textContent,parking);
      assert.equal(new URL(h.window.location.href).searchParams.get('lang'),locale);
    }
    h.map.setView([41.39,2.17],15);
    $('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    lang.value='en';
    lang.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.equal(h.fetchCount,1,'Language switch must not refetch services or GPS');
    assert.match($('resultCount').textContent,/2 mapped records/);
    assert.match($('resultList').textContent,/Bike parking/);
    assert.match($('resultList').textContent,/Drinking water/);
    assert.match($('resultList').textContent,/OSM record/);
    assert.match($('resultList').textContent,/Plan route here/);
  }finally{h.dom.window.close();}
});

test('GPS action explicitly searches nearby after user permits geolocation',async()=>{
  const h=await setup({withGPS:true});
  try{
    h.window.document.getElementById('locateButton').click();
    await h.flush();
    assert.equal(h.zoom,15);
    assert.deepEqual(h.location,{lat:41.39,lng:2.17});
    assert.equal(h.fetchCount,1);
    assert.match(h.window.document.getElementById('status').textContent,/2 registres/);
  }finally{h.dom.window.close();}
});

test('Denied GPS produces an understandable fallback and never sends coordinates',async()=>{
  const h=await setup({withGPS:true,denyGPS:true});
  try{
    h.window.document.getElementById('locateButton').click();
    await h.flush();
    assert.equal(h.fetchCount,0);
    assert.match(h.window.document.getElementById('status').textContent,/Permís de localització denegat/);
    assert.equal(h.window.document.getElementById('searchButton').disabled,false);
  }finally{h.dom.window.close();}
});

test('Provider 429 is visible and is not shown as an empty successful response',async()=>{
  const h=await setup({failedFetch:true});
  try{
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    assert.match(h.window.document.getElementById('status').textContent,/limitat la petició/);
    assert.match(h.window.document.getElementById('resultCount').textContent,/No s'han pogut carregar/);
    h.map.setView([41.4,2.2],15);
    h.window.document.querySelector('[data-type="drinking_water"]').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'429 must impose a local pause without automatic retry');
    assert.match(h.window.document.getElementById('status').textContent,/limitat la petició/,
      'Cooldown cannot replace the original upstream error or its recovery action');
  }finally{h.dom.window.close();}
});

test('Cache reuses the same approximate 100m cell but never a different search circle',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.39,2.17],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'Same centre should reuse results');
    assert.match(h.window.document.getElementById('status').textContent,/reutilitzats/);
    h.map.setView([41.3904,2.1704],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'A new GPS fix inside the same rounded cell must reuse results');
    assert.match(h.window.document.getElementById('status').textContent,/reutilitzats/);
    h.map.setView([41.3914,2.1714],15);
    assert.match(h.window.document.getElementById('status').textContent,/zona nova/);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'Cooldown still prevents a call for a distinct area');
    assert.match(h.window.document.getElementById('status').textContent,/espera uns segons/);
  }finally{h.dom.window.close();}
});

test('A failed server query keeps its cause visible after zoom/pan and never retries automatically',async()=>{
  const h=await setup({primaryFails:true});
  try{
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    const status=h.window.document.getElementById('status');
    assert.match(status.textContent,/Private.coffee/);
    assert.match(status.textContent,/503/);
    assert.equal(status.dataset.kind,'error');
    const alternative=h.window.document.getElementById('alternateProviderButton');
    assert.equal(alternative.hidden,false);
    h.map.setView([42.0,2.0],10);
    assert.match(status.textContent,/503/,'Map pan cannot hide the error');
    assert.equal(h.fetchCount,1,'Map movement cannot trigger a blind second request');
  }finally{h.dom.window.close();}
});

test('Alternative public provider requires a direct click and can recover from primary outage',async()=>{
  const h=await setup({primaryFails:true});
  try{
    // Mocked success response contains POIs in Barcelona, not the world-map default.
    h.map.setView([41.39,2.17],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    h.window.document.getElementById('alternateProviderButton').click();
    await h.flush();
    assert.equal(h.fetchCount,2,'The second provider is only contacted after clicking retry');
    assert.equal(h.window.document.getElementById('alternateProviderButton').hidden,true);
    assert.equal(h.window.document.getElementById('status').dataset.kind,'success');
    assert.match(h.window.document.getElementById('resultCount').textContent,/2 registres/);
  }finally{h.dom.window.close();}
});

test('Only approximate GPS coordinates reach the gateway URL and returned provenance is shown',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.38942,2.16987],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1);
    const request=new URL(h.requestUrls[0],'https://example.org');
    assert.equal(request.searchParams.get('lat'),'41.389');
    assert.equal(request.searchParams.get('lng'),'2.17');
    assert.doesNotMatch(h.requestUrls[0],/41\\.38942|2\\.16987/);
    assert.match(h.window.document.getElementById('sourceStamp').textContent,/Private.coffee/);
  }finally{h.dom.window.close();}
});

test('A changed map cell keeps previous results visibly marked as from the old query',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.39,2.17],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    assert.match(h.window.document.getElementById('resultCount').textContent,/2 registres/);
    h.map.setView([41.398,2.18],15);
    assert.match(h.window.document.getElementById('status').textContent,/zona nova/);
    assert.match(h.window.document.getElementById('status').textContent,/última consulta/);
    assert.equal(h.fetchCount,1,'Moving the map must never trigger an automatic provider call');
  }finally{h.dom.window.close();}
});

test('Mapped OSM POIs can be opened in BiciPark route planner with a verified destination',async()=>{
  const h=await setup();
  try{
    h.map.setView([41.39,2.17],15);
    h.window.document.getElementById('searchButton').click();
    await h.flush();
    const links=[...h.window.document.querySelectorAll('#resultList a')]
      .filter(link=>link.textContent.includes('Planifica'));
    assert.equal(links.length,2,'One planner link per sourced POI');
    const target=new URL(links[0].href);
    assert.equal(target.pathname,'/modules/route-planner/');
    assert.equal(target.searchParams.get('to'),'41.39,2.17');
    assert.equal(links[0].target,'_blank','Keep the discovered POI list available');
    assert.match(h.window.document.getElementById('resultList').textContent,/Fitxa OSM/);
    assert.equal(h.fetchCount,1,'Opening a link must not issue a second provider request');
  }finally{h.dom.window.close();}
});

test('World Bike searches a city, displays accessible choices and never fetches OSM services until selected',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    $('placeSearchInput').value="Amsterdam";
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));
    await h.flush();
    assert.deepEqual(h.geoQueries,['Amsterdam']);
    const results=[...$('placeSearchResults').querySelectorAll('button')];
    assert.equal(results.length,2);
    assert.equal(h.fetchCount,0,'Geocoding must not initiate an Overpass request');
    assert.match(results[0].textContent,/Amsterdam/);
    results[0].click();
    assert.deepEqual(h.location,{lat:52.3676,lng:4.9041});
    assert.equal(h.zoom,14);
    assert.equal(h.fetchCount,0,'Selecting a place must not initiate an Overpass request');
    assert.match($('placeSearchStatus').textContent,/Mapa centrat a Amsterdam/);
    assert.match($('resultCount').textContent,/Cap consulta en aquesta zona/);
    $('searchButton').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'Only the explicit services button initiates an Overpass request');
    const url=new URL(h.requestUrls[0],'https://example.org');
    assert.equal(url.searchParams.get('lat'),'52.368');
    assert.equal(url.searchParams.get('lng'),'4.904');
  }finally{h.dom.window.close();}
});

test('World Bike clears stale nearby POIs when the user switches cities',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    h.map.setView([41.39,2.17],15);
    $('searchButton').click();
    await h.flush();
    assert.match($('resultCount').textContent,/2 registres/);
    $('placeSearchInput').value='Tokyo';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    await h.flush();
    $('placeSearchResults').querySelectorAll('button')[1].click();
    assert.match($('resultCount').textContent,/Cap consulta en aquesta zona/);
    assert.equal($('resultList').children.length,0);
    assert.equal(h.fetchCount,1,'Switching the city must never silently refetch provider data');
  }finally{h.dom.window.close();}
});

test('Changing the city query while geocoding is in flight discards obsolete suggestions',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    let complete;
    h.window.BiciParkGeocoder.search=()=>new Promise(resolve=>{complete=resolve;});
    $('placeSearchInput').value='Amsterdam';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    $('placeSearchInput').value='Paris';
    complete([{lat:52.3676,lng:4.9041,label:'Amsterdam'}]);
    await h.flush();
    assert.equal($('placeSearchResults').children.length,0,
      'Results for an obsolete query must not be offered as current');
    assert.match($('placeSearchStatus').textContent,/cerca ha canviat/);
    assert.equal(h.fetchCount,0,'Geocoding must never silently query Overpass');
  }finally{h.dom.window.close();}
});

test('Two overlapping place searches keep only the newest result and loading state',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    const pending=[];
    h.window.BiciParkGeocoder.search=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
    $('placeSearchInput').value='Amsterdam';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    $('placeSearchInput').value='Paris';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    assert.equal(pending.length,2);
    pending[0].resolve([{lat:52.3676,lng:4.9041,label:'Amsterdam'}]);
    await h.flush();
    assert.equal($('placeSearchResults').children.length,0,'Older request cannot publish suggestions');
    assert.equal($('placeSearchButton').disabled,true,'Older completion cannot enable button while newest request is pending');
    pending[1].resolve([{lat:48.8566,lng:2.3522,label:'Paris'}]);
    await h.flush();
    assert.equal($('placeSearchResults').querySelectorAll('button').length,1);
    assert.match($('placeSearchResults').textContent,/Paris/);
    assert.equal($('placeSearchButton').disabled,false);
    assert.equal(h.fetchCount,0);
  }finally{h.dom.window.close();}
});

test('Editing a city search clears existing choices and invalidates a pending response',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    $('placeSearchInput').value='Amsterdam';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    await h.flush();
    assert.equal($('placeSearchResults').querySelectorAll('button').length,2);
    $('placeSearchInput').value='Paris';
    $('placeSearchInput').dispatchEvent(new h.window.Event('input',{bubbles:true}));
    assert.equal($('placeSearchResults').children.length,0,'Stale city buttons must disappear immediately');
    assert.match($('placeSearchStatus').textContent,/cerca ha canviat/);
    assert.equal(h.fetchCount,0,'Editing search never requests OSM services');

    let finish;
    h.window.BiciParkGeocoder.search=()=>new Promise(resolve=>{finish=resolve;});
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    $('placeSearchInput').value='Berlin';
    $('placeSearchInput').dispatchEvent(new h.window.Event('input',{bubbles:true}));
    finish([{lat:48.8566,lng:2.3522,label:'Paris'}]);
    await h.flush();
    assert.equal($('placeSearchResults').children.length,0,'Late geocoder response cannot restore stale choices');
    assert.equal($('placeSearchButton').disabled,false);
  }finally{h.dom.window.close();}
});

test('Selecting a city invalidates an overlapping geocoder request',async()=>{
  const h=await setup();
  try{
    const $=id=>h.window.document.getElementById(id);
    $('placeSearchInput').value='Amsterdam';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    await h.flush();
    const original=$('placeSearchResults').querySelector('button');
    assert.ok(original);
    let finish;
    h.window.BiciParkGeocoder.search=()=>new Promise(resolve=>{finish=resolve;});
    $('placeSearchInput').value='Paris';
    $('placeSearchForm').dispatchEvent(new h.window.Event('submit',{cancelable:true}));
    original.click();
    assert.match($('placeSearchStatus').textContent,/Mapa centrat a Amsterdam/);
    finish([{lat:48.8566,lng:2.3522,label:'Paris'}]);
    await h.flush();
    assert.equal($('placeSearchResults').children.length,0,
      'Late Paris results cannot replace the selected Amsterdam city');
    assert.match($('placeSearchStatus').textContent,/Mapa centrat a Amsterdam/);
    assert.equal($('placeSearchButton').disabled,false);
    assert.equal(h.fetchCount,0,'No implicit Overpass requests');
  }finally{h.dom.window.close();}
});
