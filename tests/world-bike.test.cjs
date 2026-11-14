'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const base=path.resolve(__dirname,'..','world-bike');
const source=name=>readFileSync(path.join(base,name),'utf8');
const services=import('data:text/javascript;base64,'+Buffer.from(source('services.js')).toString('base64'));

test('World Bike modules have valid syntax and on-demand UI contract',()=>{
  for(const file of ['services.js','app.js'])execFileSync(process.execPath,['--check',path.join(base,file)],{stdio:'pipe'});
  const html=source('index.html'),js=source('app.js');
  for(const id of ['worldMap','locateButton','searchButton','resultList','status','sourceStamp']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/OpenStreetMap contributors/);
  assert.match(js,/ui\.searchButton\.addEventListener\("click",\s*\(\)\s*=>\s*fetchAroundCenter\(\)\)/);
  assert.match(js,/ui\.locateButton\.addEventListener\("click"/);
  assert.match(js,/\.textContent/);
  assert.doesNotMatch(js,/\.innerHTML\s*=/);
});
test('World Bike only generates narrow Overpass queries from validated coordinates',async()=>{
  const {buildOverpassQuery}=await services;
  const q=buildOverpassQuery(41.39,2.17);
  assert.match(q,/around:900,41\.39000,2\.17000/);
  assert.match(q,/timeout:12/);
  assert.match(q,/out center 150/);
  assert.match(q,/bicycle_parking/);
  assert.match(q,/drinking_water/);
  assert.match(q,/shop/);
  assert.throws(()=>buildOverpassQuery(200,2),RangeError);
  assert.throws(()=>buildOverpassQuery(41,2,10000),RangeError);
  assert.throws(()=>buildOverpassQuery(NaN,2),RangeError);
});
test('World Bike parses OSM nodes and ways with provenance without inventing missing data',async()=>{
  const {normalizeOverpassResponse}=await services;
  const input={osm3s:{timestamp_osm_base:'2026-11-13T21:01:00Z'},elements:[
    {type:'node',id:101,lat:41.4,lon:2.1,tags:{amenity:'bicycle_parking',name:'Bike racks'}},
    {type:'way',id:102,center:{lat:41.41,lon:2.11},tags:{shop:'bicycle'}},
    {type:'way',id:102,center:{lat:41.41,lon:2.11},tags:{shop:'bicycle'}},
    {type:'node',id:103,lat:41.42,lon:2.12,tags:{amenity:'restaurant'}},
    {type:'way',id:104,tags:{amenity:'bicycle_parking'}},
    {type:'node',id:105,lat:91,lon:0,tags:{amenity:'drinking_water'}}
  ]};
  const data=normalizeOverpassResponse(input);
  assert.equal(data.places.length,2);
  assert.equal(data.places[0].name,'Bike racks');
  assert.equal(data.places[0].sourceUrl,'https://www.openstreetmap.org/node/101');
  assert.equal(data.places[1].type,'bicycle_shop');
  assert.equal(data.sourceTimestamp,'2026-11-13T21:01:00Z');
  assert.equal(data.truncated,false);
});
test('World Bike handles absent timestamps and caps displayed provider entries',async()=>{
  const {normalizeOverpassResponse,MAX_RESULTS}=await services;
  const samples=Array.from({length:MAX_RESULTS+12},(_,i)=>({
    type:'node',id:i+1,lat:0,lon:0,tags:{amenity:'bicycle_parking'}
  }));
  const data=normalizeOverpassResponse({elements:samples});
  assert.equal(data.places.length,MAX_RESULTS);
  assert.equal(data.truncated,true);
  assert.equal(data.sourceTimestamp,null);
  assert.throws(()=>normalizeOverpassResponse({}),TypeError);
});
