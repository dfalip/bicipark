const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){const d=new JSDOM('',{runScripts:'outside-only'});d.window.eval(read('modules/route-planner/gpx.js'));return d}
test('GPX round trip preserves segments and does not measure gaps between tracks',()=>{
 const d=setup(),g=d.window.BiciParkGPX;
 try{
 const r=g.parse('<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><name>A &amp; B</name><trkseg><trkpt lat="41" lon="2"><ele>10</ele></trkpt><trkpt lat="41.001" lon="2"><ele>15</ele></trkpt></trkseg><trkseg><trkpt lat="42" lon="3"><ele>100</ele></trkpt><trkpt lat="42.001" lon="3"><ele>98</ele></trkpt></trkseg></trk></gpx>');
 assert.ok(g.stats(r).km>0.22&&g.stats(r).km<0.23);assert.equal(g.stats(r).ascent,5);
 const restored=g.parse(g.serialize(r));assert.equal(restored.geometry.coordinates.length,2);assert.equal(restored.properties.name,'A & B');
 }finally{d.window.close()}
});
test('GPX rejects malformed XML, invalid coordinates, entities and oversized input; missing elevation is unknown',()=>{
 const d=setup(),g=d.window.BiciParkGPX;
 try{
 for(const bad of ['<gpx>','<xml/>','<!DOCTYPE gpx><gpx/>','<gpx><rte><rtept lat="91" lon="2"/><rtept lat="41" lon="2"/></rte></gpx>','<gpx><rte><rtept lat="41"/><rtept lat="41" lon="2"/></rte></gpx>','x'.repeat(10*1024*1024+1)])assert.throws(()=>g.parse(bad));
 const r=g.parse('<gpx><rte><rtept lat="41" lon="2"/><rtept lat="41.01" lon="2"/></rte></gpx>');assert.equal(g.stats(r).ascent,null);
 }finally{d.window.close()}
});
test('parking facts preserve unknown values and directions use the real coordinates',()=>{
 const d=new JSDOM('',{runScripts:'outside-only',url:'https://bicipark.test'});
 try{d.window.eval(read('modules/parking/details.js'));const card=d.window.document.createElement('div');d.window.BiciParkParkingDetails.append(card,{lat:41.1,lng:2.1,raw:{covered:false},source:'<script>bad</script>'});assert.match(card.textContent,/Cobert: No/);assert.match(card.textContent,/Vigilància: Sense dades/);assert.equal(card.querySelector('script'),null);assert.match(card.querySelector('a').href,/to=41.1%2C2.1/)}finally{d.window.close()}
});
test('service worker does not intercept external maps, private APIs or writes, and shell paths exist',()=>{
 const handlers={};const ctx={self:{location:{origin:'https://bicipark.test'},addEventListener:(n,f)=>handlers[n]=f},URL};vm.runInNewContext(read('sw.js'),ctx);
 for(const [url,method] of [['https://tile.openstreetmap.org/1/1/1.png','GET'],['https://bicipark.test/api/private.html','GET'],['https://bicipark.test/data/save','POST']]){
 let handled=false;handlers.fetch({request:{url,method,headers:{has:()=>false}},respondWith(){handled=true}});assert.equal(handled,false);
 }
 const files=vm.runInNewContext(read('sw.js')+';FILES', {self:{addEventListener(){}}});for(const file of files){const local=file.split('?')[0];assert.ok(fs.existsSync(path.join(root,local.endsWith('/')?local+'index.html':local)),file)}
 const manifest=JSON.parse(read('manifest.webmanifest'));for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src)));
});
