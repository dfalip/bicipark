'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const all=JSON.parse(read('route-explorer/data/catalog.json'));
const verified=JSON.parse(read('route-explorer/data/verified-routes.json'));
const known=new Set(all.map(x=>x.id));
const originalIds=new Set(["vv-girona-pla-girones-sud","vv-girona-masies","vv-girona-termal","vv-girona-tren-pinxo","vv-girona-muga","vv-girona-vall-bianya","vv-girona-circular-sud-37","vv-girona-circular-sud-25"]);
const batch=verified.filter(x=>originalIds.has(x.id));
test('the official Girona batch has eight independently identified, link-only cycling itineraries',()=>{
 assert.equal(batch.length,8);
 assert.equal(new Set([...all,...verified].map(x=>x.id)).size,all.length+verified.length,
  'there must be no duplicate route IDs across catalog and verified sources');
 for(const route of batch){
  assert.ok(route.id&&route.name&&route.region&&route.start);
  assert.equal(route.kind,'external');
  assert.equal(route.modality,'greenway');
  assert.equal(route.verified,true);
  assert.equal(route.source,'Consorci de les Vies Verdes de Girona');
  assert.equal(route.verifiedAt,'2026-11-19');
  assert.equal(route.url,route.sourceUrl);
  assert.match(route.url,/^https:\/\/www\.viesverdes\.cat\/rutes_vies_verdes\/[a-z0-9-]+\/$/);
  assert.equal(route.elevationGain,null,'do not infer cumulative gain from gradient');
  assert.ok(Number.isFinite(route.distanceKm)&&route.distanceKm>0);
  assert.equal(route.geometryFile,undefined,'link-only route does not contain a locally validated geometry');
  assert.ok(!known.has(route.id));
  assert.match(route.metricNote,/sense geometria GPX allotjada/);
 }
});
test('the greenway modality can be selected from the user-facing route catalog',()=>{
 assert.match(read('route-explorer/catalog.html'),/<option value="greenway">Via verda \/ ruta pedalable<\/option>/);
 assert.match(read('route-explorer/catalog.js'),/route\.modality|r\.modality/);
});
test('the eight official candidates have the specifically documented source distances',()=>{
 const distances=Object.fromEntries(batch.map(r=>[r.id,r.distanceKm]));
 assert.deepEqual(distances,{
  'vv-girona-pla-girones-sud':35,
  'vv-girona-masies':7.5,
  'vv-girona-termal':13.8,
  'vv-girona-tren-pinxo':37,
  'vv-girona-muga':41,
  'vv-girona-vall-bianya':5,
  'vv-girona-circular-sud-37':37.5,
  'vv-girona-circular-sud-25':25
 });
});
