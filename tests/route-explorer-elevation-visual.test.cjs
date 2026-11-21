'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {deriveElevationProfile}=require('../lib/elevation-profile.cjs');
const modulePromise=import('../route-explorer/modules/elevation-profile-v2.mjs');

test('browser elevation model agrees with canonical GeoJSON calculator', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const geo={type:'MultiLineString',coordinates:[
   [[2,41,10],[2.01,41.01,20]],
   [[2.01,41.01,20],[2.02,41.02,25]],
   [[10,50,30],[10.01,50,35]]
 ]};
 const b=build({kind:'geojson',data:geo}),c=deriveElevationProfile(geo);
 assert.equal(b.status,'complete');
 assert.equal(b.hasDiscontinuities,true);
 assert.equal(b.distanceMeters,c.distanceMeters);
 assert.equal(b.pointCount,c.pointCount);
 assert.deepEqual(b.samples.map(p=>p.startsDiscontinuity),
   c.samples.map(p=>p.startsDiscontinuity));
 assert.deepEqual(b.samples.map(p=>p.elevationMeters),
   c.samples.map(p=>p.elevationMeters));
});

test('missing elevation is missing, not zero', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const b=build({kind:'geojson',data:{type:'LineString',coordinates:[[2,41],[2.01,41]]}});
 assert.equal(b.status,'missing');
 assert.equal(b.elevationPointCount,0);
 assert.equal(b.minimumElevation,null);
 assert.equal(b.hasCompleteElevation,false);
});

test('partial elevation never produces a complete chart, including at disconnected segments', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const b=build({kind:'polylines',profileSegments:[
  [{lat:41,lng:2,elevation:0},{lat:41.01,lng:2.01,elevation:null}],
  [{lat:50,lng:10,elevation:100},{lat:50.01,lng:10.01,elevation:110}]
 ]});
 assert.equal(b.status,'partial');
 assert.equal(b.elevationPointCount,3);
 assert.equal(b.samples[1].elevationMeters,null);
 assert.equal(b.samples[2].startsDiscontinuity,true);
 assert.equal(b.samples[2].distanceMeters,b.samples[1].distanceMeters);
});

test('invalid and sparse track points rejected instead of silently bridging missing samples', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const inputs=[
  [[2,41,10],[181,41,11]], [[2,41,10],[null,41,11]],
  [[2,41,10],[,41,11]],[[2,41,10],[2,41,Number.NaN]],
 ];
 for(const coordinates of inputs){
  const b=build({kind:'geojson',data:{type:'LineString',coordinates}});
  assert.equal(b.status,'invalid');
  assert.deepEqual(b.samples,[]);
 }
});

test('GPX source segments preserve numeric zero and reject missing source samples', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const b=build({kind:'polylines',profileSegments:[[
  {lat:41,lng:2,elevation:0},{lat:41.01,lng:2.01,elevation:15}
 ]]});
 assert.equal(b.status,'complete');
 assert.equal(b.minimumElevation,0);
 assert.ok(b.distanceMeters>0);
});

test('feature collection with multiple independent routes is not combined', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const feature=coordinates=>({type:'Feature',geometry:{type:'LineString',coordinates},properties:{}});
 const b=build({kind:'geojson',data:{type:'FeatureCollection',features:[
  feature([[2,41,1],[2.01,41,2]]),feature([[3,42,4],[3.01,42,5]])
 ]}});
 assert.equal(b.status,'invalid');
});

test('zero-length complete elevation cannot create an invented distance profile', async()=>{
 const {deriveRouteElevationDisplay:build}=await modulePromise;
 const b=build({kind:'geojson',data:{type:'LineString',coordinates:[[2,41,0],[2,41,15]]}});
 assert.equal(b.status,'stationary');
 assert.equal(b.distanceMeters,0);
});

test('UI binds real route ID, never guesses the route title or links gap segments',()=>{
 const root=path.resolve(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'route-explorer/adapters/elevation-profile-ui.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'route-explorer/app.js'),'utf8');
 const sync=fs.readFileSync(path.join(root,'route-explorer/adapters/elevation-map-sync.js'),'utf8');
 assert.match(app,/bicipark:route-selected/);
 assert.match(source,/bicipark:route-selected/);
 assert.match(source,/if\(i===0\|\|p\.pointIndex===0\|\|p\.startsDiscontinuity\)/);
 assert.doesNotMatch(source,/querySelector\(["']h2["']\)/);
 assert.match(source,/profile\.status!=='complete'/);
 assert.match(sync,/p\.routeId !== selectedRouteId/);
});
