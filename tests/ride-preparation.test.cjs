const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const E=require('../modules/route-watch/engine.js'),M=require('../route-explorer/catalog-model.js');
const start=Date.UTC(2026,9,25,0),hour=3600000;
function forecast(){return {hourly:{time:Array.from({length:12},(_,i)=>(start+i*hour)/1000),weather_code:Array(12).fill(0),temperature_2m:Array(12).fill(18),precipitation_probability:Array(12).fill(10),wind_speed_10m:Array(12).fill(20),wind_gusts_10m:Array(12).fill(25),wind_direction_10m:Array(12).fill(90),is_day:Array(12).fill(1)}};}
test('Watch samples distance rather than GPX point index and includes proportional stops',()=>{
 const a=E.sampleRoute([[[0,0],[.001,0],[.002,0],[.1,0]]],10,60);
 assert.equal(a.length,5);assert.ok(Math.abs(a[2].point[0]-.05)<1e-8);assert.ok(Math.abs(a[2].offsetMs-(a[4].km/10*hour+hour)/2)<.01);assert.equal(a[0].offsetMs,0);
 assert.throws(()=>E.sampleRoute([[[0,0],[.1,0]],[[1,0],[2,0]]],18),/disconnected/);
 assert.throws(()=>E.sampleRoute([[[null,0],[1,0]]],18),/invalidTrack/);assert.throws(()=>E.sampleRoute([[[0,0],[1,0]]],'',0),/invalidPace/);
});
test('Watch uses epoch hours across clock changes and refuses out-of-range or missing weather',()=>{
 const f=forecast();assert.equal(E.rowAt(f,start+1.4*hour).time,start+hour);assert.equal(E.rowAt(f,start-hour),null);assert.equal(E.rowAt(f,start+12*hour),null);
 f.hourly.weather_code[1]=null;assert.equal(E.rowAt(f,start+hour).complete,false);f.hourly.temperature_2m[2]=null;assert.equal(E.rowAt(f,start+2*hour).temp,null);assert.equal(E.rowAt(f,start+2*hour).complete,false);
 const samples=E.sampleRoute([[[0,0],[.1,0]]],10);const result=E.evaluate(samples,[{data:forecast()},null,{data:forecast()},{data:forecast()},{data:forecast()}],start);assert.equal(result.complete,false);assert.equal(result.points[1].row,null);
});
test('Watch handles meteorological wind-from bearings and severe weather independently of rain probability',()=>{
 const row=E.rowAt(forecast(),start);assert.equal(E.assess(row,90).headwind,20);assert.equal(E.assess(row,270).headwind,-20);assert.ok(Math.abs(E.assess(row,0).crosswind-20)<1e-8);
 assert.deepEqual(E.assess({...row,code:95,rain:0,isDay:0},90).alerts,['storm','dark']);assert.equal(E.assess({...row,direction:null},90).headwind,null);
});
test('Catalogue filters accents, modality, known distances, local tracks and saved favourites',()=>{
 const routes=[{id:'a',name:'Riu Besòs',modality:'road',kind:'local',distanceKm:20},{id:'b',name:'Aigües',modality:'gravel',kind:'external',distanceKm:null},{id:'c',name:'Costa',modality:'road',kind:'local',distanceKm:10}];
 assert.deepEqual(M.filter(routes,{q:'besos'}).map(r=>r.id),['a']);assert.equal(M.filter(routes,{max:0}).length,0);assert.deepEqual(M.filter(routes,{max:15}).map(r=>r.id),['c']);assert.deepEqual(M.filter(routes,{sort:'distance'}).map(r=>r.id),['c','a','b']);assert.deepEqual(M.filter(routes,{local:true,favorites:true},['a','b']).map(r=>r.id),['a']);assert.deepEqual(M.filter(routes,{modality:'gravel'}).map(r=>r.id),['b']);
});
test('New catalogue favourites round-trip through account backups',()=>{
 const dom=new JSDOM('',{url:'https://bicipark.test',runScripts:'outside-only'});dom.window.eval(fs.readFileSync('modules/account/state.js','utf8'));const w=dom.window,key='bicipark.catalog.favorites.v1';w.localStorage.setItem(key,'["carretera-aigues"]');const data=w.BiciParkState.snapshot();w.localStorage.removeItem(key);w.BiciParkState.restore(data);assert.equal(w.localStorage.getItem(key),'["carretera-aigues"]');dom.window.close();
});
test('Weather icons translate accessible labels and unknown weather never becomes sunshine',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync('modules/weather-shared/icons.js','utf8'));for(const [language,label] of [['ca','Tempesta'],['es','Tormenta'],['en','Thunderstorm'],['fr','Orage']]){w.BiciParkI18n={getLanguage:()=>language};assert.equal(w.BiciParkWeatherIcons.condition(95).label,label);assert.match(w.BiciParkWeatherIcons.html(95,40),new RegExp('aria-label="'+label+'"'));assert.equal(w.BiciParkWeatherIcons.condition(null).key,'unknown');}dom.window.close();
});
