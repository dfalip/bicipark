const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../modules/ride/engine.js');
const Store=require('../modules/ride/store.js');

function memoryStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}

test('haversine distance is realistic for nearby GPS points',()=>{
  const d=Engine.haversineMeters({lat:41,lng:2},{lat:41.001,lng:2});
  assert.ok(d>110&&d<112);
});

test('Ride rejects poor accuracy and impossible jumps',()=>{
  const tracker=new Engine.RideTracker({maxAccuracyM:50,maxPlausibleSpeedKmh:100});
  tracker.start(0);
  let r=tracker.ingest({lat:41,lng:2,accuracy:80,timestamp:1000});
  assert.equal(r.accepted,false);
  assert.equal(r.reason,'accuracy');

  r=tracker.ingest({lat:41,lng:2,accuracy:5,timestamp:2000});
  assert.equal(r.accepted,true);
  r=tracker.ingest({lat:42,lng:3,accuracy:5,timestamp:3000});
  assert.equal(r.accepted,false);
  assert.equal(r.reason,'jump');
});

test('Ride calculates moving distance, average speed and stopped time',()=>{
  const tracker=new Engine.RideTracker({movingThresholdKmh:2.5,smoothingSamples:3});
  tracker.start(1000);
  tracker.ingest({lat:41,lng:2,accuracy:5,timestamp:1000});
  tracker.ingest({lat:41.00009,lng:2,accuracy:5,timestamp:2000});
  tracker.ingest({lat:41.00018,lng:2,accuracy:5,timestamp:3000});
  tracker.ingest({lat:41.00018,lng:2,accuracy:5,timestamp:4000});
  const s=tracker.snapshot(4000);
  assert.ok(s.distanceM>19&&s.distanceM<21);
  assert.ok(s.avgSpeedKmh>30&&s.avgSpeedKmh<40);
  assert.equal(s.movingMs,2000);
  assert.equal(s.stoppedMs,1000);
  assert.ok(s.maxSpeedKmh>30);
});

test('manual pause prevents a GPS gap from adding distance',()=>{
  const tracker=new Engine.RideTracker();
  tracker.start(1000);
  tracker.ingest({lat:41,lng:2,accuracy:5,timestamp:1000});
  tracker.pause(1500);
  tracker.ingest({lat:41.01,lng:2,accuracy:5,timestamp:5000});
  tracker.resume(6000);
  tracker.ingest({lat:41.01,lng:2,accuracy:5,timestamp:6000});
  assert.equal(tracker.snapshot(6000).distanceM,0);
});

test('saving a Ride removes demo activities and produces History-compatible fields',()=>{
  const storage=memoryStorage({[Store.ACTIVITY_KEY]:JSON.stringify([{id:'demo',demo:true,distanceKm:10}])});
  const activity=Store.buildActivity({startedAt:1000,endedAt:61000,distanceKm:1.25,ascentM:10,movingMs:60000,elapsedMs:60000,stoppedMs:0,avgSpeedKmh:75,maxSpeedKmh:80,points:[]},null,'Prova');
  Store.appendActivity(storage,activity);
  const list=Store.readActivities(storage);
  assert.equal(list.length,1);
  assert.equal(list[0].demo,false);
  assert.equal(list[0].distanceKm,1.25);
  assert.equal(list[0].duration,'1 min');
  assert.equal(list[0].source,'bicipark-ride');
});

test('bike mileage is applied once per Ride activity',()=>{
  const storage=memoryStorage({[Store.BIKE_KEY]:JSON.stringify({version:1,activeBikeId:'B1',bikes:[{id:'B1',odometerKm:100}]})});
  const first=Store.applyMileage(storage,'B1',12.5,'ride-1');
  assert.equal(first.updated,true);
  assert.equal(first.bike.odometerKm,112.5);
  const second=Store.applyMileage(storage,'B1',12.5,'ride-1');
  assert.equal(second.updated,false);
  assert.equal(Store.activeBike(storage).odometerKm,112.5);
});

test('track compression keeps endpoints while reducing dense samples',()=>{
  const points=[];
  for(let i=0;i<20;i++)points.push({lat:41+i*0.000001,lng:2,timestamp:i*1000});
  const compact=Store.compressTrack(points);
  assert.ok(compact.length<points.length);
  assert.equal(compact[0].t,0);
  assert.equal(compact.at(-1).t,19000);
});
