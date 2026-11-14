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
  window.fetch=async (url)=>{
    fetchCount+=1;
    if(failedFetch)return {ok:false,status:429};
    if(primaryFails&&String(url).includes("private.coffee"))return {ok:false,status:503};
    return {ok:true,json:async()=>sampleData};
  };
  const gps=withGPS?{
    getCurrentPosition(success,failure){
      if(denyGPS)failure({code:1});
      else success({coords:{latitude:41.39,longitude:2.17}});
    }
  }:undefined;
  Object.defineProperty(window.navigator,'geolocation',{configurable:true,value:gps});
  window.__worldServices=await services;
  const importLine=/^import \{[^\n]+\} from "\.\/services\.js";\s*/;
  assert.match(appSource,importLine);
  window.eval(appSource.replace(importLine,
    'const {SEARCH_RADIUS_METERS,SERVICE_TYPES,buildOverpassQuery,normalizeOverpassResponse,validateCoords}=window.__worldServices;\n'
  ));
  const flush=async()=>{await new Promise(resolve=>setTimeout(resolve,12));};
  return {window,dom,map,flush,get fetchCount(){return fetchCount;},get zoom(){return zoom;},get location(){return location;}};
}

test('Initial search works at world zoom; category button loads OSM data then filters locally',async()=>{
  const h=await setup();
  try{
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
    assert.match(h.window.document.getElementById('status').textContent,/limitat o rebutjat/);
    assert.match(h.window.document.getElementById('resultCount').textContent,/No s'han pogut carregar/);
    h.map.setView([41.4,2.2],15);
    h.window.document.querySelector('[data-type="drinking_water"]').click();
    await h.flush();
    assert.equal(h.fetchCount,1,'429 must impose a local pause without automatic retry');
  }finally{h.dom.window.close();}
});

test('Cache reuses only the exact centre, never a shifted 900m search circle',async()=>{
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
    assert.equal(h.fetchCount,1,'Cooldown still prevents another provider call');
    assert.match(h.window.document.getElementById('status').textContent,/espera uns segons/,'Shifted centre must not reuse the previous circle');
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
