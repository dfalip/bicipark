'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

test('real selection displays only fully sourced altitudes; stale route is cleared',async()=>{
 const dom=new JSDOM('<html lang="ca"><div id="routeDetails"></div></html>',
   {url:'https://example.org/route-explorer/'});
 const saved={
  window:globalThis.window,document:globalThis.document,
  CustomEvent:globalThis.CustomEvent,DOMParser:globalThis.DOMParser,fetch:globalThis.fetch
 };
 const maps={
  '/route-one.gpx': '<gpx><trk><trkseg><trkpt lat="41" lon="2"><ele>0</ele></trkpt><trkpt lat="41.01" lon="2.01"><ele>10</ele></trkpt></trkseg></trk></gpx>',
  '/route-two.gpx': '<gpx><trk><trkseg><trkpt lat="41" lon="2"><ele>0</ele></trkpt><trkpt lat="41.01" lon="2.01"></trkpt></trkseg></trk></gpx>',
  '/route-bad.gpx': '<gpx><trk><trkseg><trkpt lat="41" lon="2"><ele>0</ele></trkpt><trkpt lon="2.01"><ele>10</ele></trkpt></trkseg></trk></gpx>'
 };
 try {
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  globalThis.CustomEvent=dom.window.CustomEvent;
  globalThis.DOMParser=dom.window.DOMParser;
  globalThis.fetch=async url=>({ok:true,text:async()=>maps[url]});
  dom.window.HTMLCanvasElement.prototype.getContext=()=>({
   setTransform(){},clearRect(){},beginPath(){},moveTo(){},
   lineTo(){},stroke(){},arc(){},fill(){}
  });
  const url=pathToFileURL(path.resolve(__dirname,'../route-explorer/adapters/elevation-profile-ui.js')).href;
  await import(url);
  const route=(id,geometryFile)=>new dom.window.CustomEvent('bicipark:route-selected',
   {detail:{route:{id,name:id,geometryFile}}});
  dom.window.dispatchEvent(route('one','/route-one.gpx'));
  await new Promise(resolve=>setImmediate(resolve));
  let details=dom.window.document.getElementById('routeDetails');
  assert.equal(details.querySelector('.route-elevation-profile')?.dataset.routeId,'one');
  assert.equal(details.querySelector('.route-elevation-profile-chart'),null,'profile is opt-in');
  details.querySelector('.route-elevation-profile-toggle').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(details.querySelector('.route-elevation-profile-chart'));
  assert.match(details.textContent,/0–10 m/);
  details.querySelector('.route-elevation-profile-toggle').click();
  assert.equal(details.querySelector('.route-elevation-profile-chart'),null,'closing removes chart');
  details.querySelector('.route-elevation-profile-toggle').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(details.querySelector('.route-elevation-profile-chart'),'reopening restores chart');
  dom.window.dispatchEvent(route('two','/route-two.gpx'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(details.querySelector('.route-elevation-profile')?.dataset.routeId,'two');
  details.querySelector('.route-elevation-profile-toggle').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(details.querySelector('.route-elevation-profile-chart'),null);
  assert.match(details.textContent,/No es dibuixa un perfil incomplet/);
  dom.window.dispatchEvent(route('bad','/route-bad.gpx'));
  await new Promise(resolve=>setImmediate(resolve));
  details.querySelector('.route-elevation-profile-toggle').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(details.querySelector('.route-elevation-profile-chart'),null);
  assert.match(details.textContent,/No s'ha pogut carregar/);
  dom.window.dispatchEvent(new dom.window.CustomEvent('bicipark:route-selected',{detail:{route:null}}));
  assert.equal(details.querySelector('.route-elevation-profile'),null);
 } finally {
  Object.assign(globalThis,saved);
  dom.window.close();
 }
});
