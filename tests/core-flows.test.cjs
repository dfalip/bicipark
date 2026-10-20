const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function trackObservers(w) {
 const Original = w.MutationObserver, observers=[];
 w.MutationObserver = class extends Original { constructor(fn){ super(fn); observers.push(this); } };
 const close=w.close.bind(w);w.close=()=>{observers.forEach(o=>o.disconnect());close()};
}
const tick = ms => new Promise(r => setTimeout(r,ms));
function dom(file, pathname) {
  return new JSDOM(read(file), {url:'https://bicipark.test/'+pathname,runScripts:'outside-only',pretendToBeVisual:true});
}
function run(w,file){w.eval(read(file))}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick(10)}assert.fail('Timed out waiting for UI')}
function leaflet(w){
  const map={setView(){return this},hasLayer(){return false},addLayer(){return this},removeLayer(){},removeControl(){},invalidateSize(){}};
  const layer=()=>({addTo(){return this},bindPopup(){return this},openPopup(){return this},setLatLng(){return this},setContent(){return this},openOn(){return this},clearLayers(){},addLayer(){}});
  return {map:()=>map,tileLayer:layer,markerClusterGroup:layer,divIcon:x=>x,marker:layer,popup:layer,geoJSON:layer,
    control:()=>({addTo(){const el=this.onAdd();w.document.body.append(el);return this}}),DomUtil:{create(tag,cls){const el=w.document.createElement(tag);el.className=cls;return el}}};
}
test('registration settles, updates after activity changes and URL navigation',async()=>{
 const d=new JSDOM('<body><h1>Route A</h1><button id="bp-route-done-button"></button></body>',{url:'https://bicipark.test/?route=a',runScripts:'outside-only',pretendToBeVisual:true});const w=d.window;
 try{
  trackObservers(w);
  run(w,'modules/shared/bicipark-route-registration-state-v1.js');
  await until(()=>w.document.querySelector('button').dataset.routeRegistrationState==='pending');
  let mutations=0;const ob=new w.MutationObserver(r=>mutations+=r.length);ob.observe(w.document.body,{childList:true,subtree:true});
  await tick(120);assert.equal(mutations,0,'idle button must not rewrite itself');
  w.localStorage.setItem('bicipark.activityHistory.v1',JSON.stringify([{routeId:'a',name:'Route A'}]));w.dispatchEvent(new w.Event('bicipark:activity-history:updated'));
  await until(()=>w.document.querySelector('button').dataset.routeRegistrationState==='registered');
  // Same display name must not match a different stable route ID.
  w.history.pushState({},'', '?route=b');
  await until(()=>w.document.querySelector('button').dataset.routeRegistrationState==='pending');
  const before=mutations;await tick(120);assert.equal(mutations,before);
 }finally{w.close()}
});
test('parking restores city data, favorites, proximity and one request per city change',async()=>{
 const d=dom('aparcaments.html','aparcaments.html?city=girona'),w=d.window;const calls=[];
 try{
 w.L=leaflet(w);w.alert=()=>{};w.localStorage.setItem('biciparkFavorites','{damaged');
 w.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>url.startsWith('https:')?[{lat:'41.9794',lon:'2.8214',display_name:'Girona'}]:JSON.parse(read(url.replace(/^\.\//,'')))}};
 Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(ok){ok({coords:{latitude:41.9794,longitude:2.8214}})}}});
 run(w,'app.js');await until(()=>!w.document.getElementById('citySelect').disabled);
 assert.match(w.document.getElementById('citySubtitle').textContent,/Girona/);
 assert.ok(w.document.querySelectorAll('.parkingCard').length>0);
 w.document.querySelector('.favoriteIcon').click();assert.equal(JSON.parse(w.localStorage.getItem('biciparkFavorites')).length,1);
 w.document.querySelector('[data-filter="favorites"]').click();assert.equal(w.document.querySelectorAll('.parkingCard').length,1);
 w.document.querySelector('[data-filter="favorites"]').click();w.document.getElementById('nearBtn').click();assert.equal(w.document.getElementById('radiusSelect').value,'1000');
 const select=w.document.getElementById('citySelect');select.value='paris';select.dispatchEvent(new w.Event('change'));
 await until(()=>!select.disabled);assert.equal(calls.filter(x=>x==='./data/paris/parkings.json').length,1);
 assert.equal(select.querySelector('option[value="amsterdam"]'),null);
 assert.equal(w.document.querySelectorAll('.parkingCard').length,100);
 const sample={nom:'<img src=x onerror=alert(1)>',address:'<b>address</b>',places:2,type:'rack',source:'test',lat:48.85,lng:2.35,seguretat:'mitjana'};
 const card=w.createParkingCard(sample);assert.equal(card.querySelector('img'),null);assert.match(card.textContent,/<img/);
 }finally{w.close()}
});
test('Route Match renders computed values, validates profile, persists and activates shared plan',async()=>{
 const d=dom('modules/route-match/index.html','modules/route-match/'),w=d.window;
 try{
 w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('modules/route-match/data/routes.json'))});
 for(const f of ['engine/profile-store.js','engine/match-engine.js','engine/training-plan-engine.js','route-match.js'])run(w,'modules/route-match/'+f);
 await until(()=>w.BiciParkRouteMatch);
 assert.equal(w.document.querySelectorAll('.rm-route-card').length,3);assert.equal(w.document.querySelector('.rm-stage-image'),null);
 w.document.querySelector('[data-goal="passejar"]').click();assert.equal(w.BiciParkRiderProfile.get().goal,'passejar');assert.equal(w.document.querySelector('[data-goal="passejar"]').getAttribute('aria-pressed'),'true');
 w.document.querySelector('[data-action="profile"]').click();
 w.document.getElementById('rmDistanceMin').value=70;w.document.getElementById('rmDistanceMax').value=20;
 w.document.getElementById('rmProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.notEqual(w.BiciParkRiderProfile.get().usualDistanceMin,70);
 w.document.getElementById('rmDistanceMin').value=10;w.document.getElementById('rmDistanceMax').value=25;
 w.document.getElementById('rmProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.match(w.document.getElementById('rmProfileSummary').textContent,/10–25 km/);
 w.document.querySelector('[data-action="activate-plan"]').click();assert.equal(JSON.parse(w.localStorage.getItem('bicipark.routeMatch.trainingPlan.v2')).active,true);
 assert.equal(w.document.querySelector('[data-action="activate-plan"]').disabled,true);
 }finally{w.close()}
});
test('compact action styling settles without rewriting button children',async()=>{
 const d=new JSDOM('<body><div class="bp360-actions"><button id="bp360-favorite">Favorit</button><button id="bp360-download">Descarregar</button><button id="bp-route-registration-action-v11">○ Registrar ruta</button></div></body>',{url:'https://bicipark.test/',runScripts:'outside-only',pretendToBeVisual:true});const w=d.window;
 try{
 run(w,'modules/route-detail/route-detail-actions-compact-polish-v1-3.js');await tick(100);
 let count=0;const ob=new w.MutationObserver(r=>count+=r.length);ob.observe(w.document.body,{childList:true,subtree:true});await tick(300);
 assert.equal(count,0);assert.equal(w.document.getElementById('bp-route-registration-action-v11').textContent,'○ Registrar ruta');
 }finally{w.close()}
});
