'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','map-game');
const read=n=>readFileSync(path.join(dir,n),'utf8');
function createGame(reduced=false){
 const dom=new JSDOM(read('index.html'),{url:'https://www.bicipark.com/map-game/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.matchMedia=()=>({matches:reduced});
 const point=(lat,lng)=>({lat,lng,distanceTo(other){return Math.hypot(lat-other.lat,lng-other.lng)*111000;}});
 const map={center:point(41.3874,2.1686),revealType:'',on(){return this;},setView(a){this.center=point(a[0],a[1]);return this;},
  getCenter(){return this.center;},invalidateSize(){},removeLayer(){},
  fitBounds(){this.revealType='instant';},flyToBounds(){this.revealType='animated';}};
 const marker=position=>({position,on(){return this;},setLatLng(p){this.position=p;return this;},
  addTo(){return this;},bindPopup(){return this;},openPopup(){return this;},getLatLng(){return this.position;}});
 w.L={map:()=>map,tileLayer:()=>({addTo(){}}),marker,polyline:()=>({addTo(){}}),
  latLng:point,latLngBounds:points=>points};
 const source=read('app.js').replace(/^\uFEFF?import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";/,
  'const gameLocations=[{id:"cat",title:"Plaça de Catalunya",lat:41.3874,lng:2.1686,image:"/img/test.jpg",description:"Centre de la ciutat",difficulty:"Fàcil",photoAuthor:"Fota",photoSource:"https://commons.wikimedia.org/wiki/File:Test.jpg",photoLicense:"CC BY 4.0",photoLicenseUrl:"https://creativecommons.org/licenses/by/4.0/"}];');
 assert.doesNotMatch(source,/^\uFEFF?import\s/m);
 w.eval(source+';window.__game={map,state,elements};');
 const $=id=>w.document.getElementById(id);
 return {w,dom,map,$};
}
test('Map game provides keyboard focus and real center selection without guessing before action',()=>{
 const h=createGame();try{
  assert.equal(h.$('centerButton').disabled,false);
  assert.equal(h.$('confirmButton').disabled,true);
  assert.match(h.$('gameMap').getAttribute('aria-label'),/fletxes/);
  assert.equal(h.$('gameMap').getAttribute('tabindex'),'0');
  h.map.center={lat:41.391,lng:2.186,distanceTo(other){return 2200;}};
  h.$('centerButton').click();
  assert.equal(h.$('confirmButton').disabled,false);
  assert.match(h.$('selectionStatus').textContent,/Punt escollit/);
  h.$('confirmButton').click();
  assert.equal(h.$('centerButton').disabled,true);
  assert.equal(h.map.revealType,'animated');
  assert.match(h.$('resultPoints').textContent,/punts/);
  assert.equal(h.$('nextButton').hidden,false);
  assert.equal(h.$('confirmButton').hidden,true);
 }finally{h.dom.window.close();}
});
test('Map game reveal respects reduced motion accessibility setting',()=>{
 const h=createGame(true);try{
  h.$('centerButton').click();h.$('confirmButton').click();
  assert.equal(h.map.revealType,'instant');
 }finally{h.dom.window.close();}
});

test('Photo credits are accessible with original file source and license',()=>{
 const h=createGame();try{
  assert.equal(h.$('photoAuthor').textContent,'Fota');
  assert.equal(h.$('photoLicenseLink').textContent,'CC BY 4.0');
  assert.match(h.$('photoSourceLink').href,/commons\.wikimedia\.org/);
  assert.equal(h.$('photoCredit').hidden,false);
  assert.equal(h.$('photoError').hidden,true);
 }finally{h.dom.window.close();}
});
test('Missing photo cannot be scored, and skipping it does not penalize or show an invented demo',()=>{
 const h=createGame();try{
  h.$('centerButton').click();
  assert.equal(h.$('confirmButton').disabled,false);
  h.$('gameImage').dispatchEvent(new h.w.Event('error'));
  assert.equal(h.$('photoError').hidden,false);
  assert.equal(h.$('gameImage').hidden,true);
  assert.equal(h.$('confirmButton').disabled,true);
  assert.equal(h.$('centerButton').disabled,true);
  assert.equal(h.$('nextButton').hidden,false);
  h.$('confirmButton').click();
  assert.equal(h.w.__game.state.totalScore,0);
  h.$('nextButton').click();
  assert.equal(h.$('finalScreen').hidden,false);
  assert.equal(h.w.__game.state.questions.length,0);
  assert.match(h.$('finalScore').textContent,/Cap fotografia disponible/);
 }finally{h.dom.window.close();}
});
