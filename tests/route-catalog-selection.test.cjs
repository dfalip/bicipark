'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync('route-explorer/'+p,'utf8');
const fixtures=[
 {id:'flat',name:'Ruta de l’Aigües',region:'Barcelona',kind:'local',modality:'road',distanceKm:12,elevationGain:0,url:'./map.html'},
 {id:'hill',name:'Ruta de muntanya',region:'Barcelona',kind:'local',modality:'mtb',distanceKm:48,elevationGain:720,url:'./map.html'},
 {id:'unknown',name:'Via sense desnivell publicat',region:'Girona',kind:'external',verified:true,modality:'greenway',distanceKm:9,elevationGain:null,url:'https://example.test/route'}
];
async function setup(saved=null){
 const dom=new JSDOM(read('catalog.html'),{url:'https://bicipark.test/route-explorer/catalog.html',runScripts:'outside-only'});
 const w=dom.window,key='bicipark.routeCatalog.saved.v1';
 if(saved)w.localStorage.setItem(key,JSON.stringify(saved));
 w.fetch=async p=>({ok:true,json:async()=>p.endsWith('catalog.json')?fixtures:p.endsWith('verified-metadata.json')?{}:[]});
 await w.eval(read('catalog.js'));
 const $=id=>w.document.getElementById(id),names=()=>[...w.document.querySelectorAll('.route-card h2')].map(x=>x.textContent);
 const change=(id,v)=>{$(id).value=v;$(id).dispatchEvent(new w.Event(['maxDistance','maxElevation','search'].includes(id)?'input':'change'))};
 return {dom,w,key,$,names,change};
}
test('Catalogue supports accent-insensitive search and planning limits, without treating unknown ascent as zero',async()=>{
 const h=await setup();try{
  assert.equal(h.names().length,3);
  h.change('search','aigues');assert.deepEqual(h.names(),['Ruta de l’Aigües']);
  h.$('clearFilters').click();h.change('maxDistance','15');assert.equal(h.names().length,2);
  h.change('maxElevation','100');assert.deepEqual(h.names(),['Ruta de l’Aigües']);
  h.$('clearFilters').click();h.change('sort','elevation');assert.deepEqual(h.names(),['Ruta de l’Aigües','Ruta de muntanya','Via sense desnivell publicat']);
 }finally{h.dom.window.close();}
});
test('Saved route choice persists locally, combines with filters and can be removed',async()=>{
 const h=await setup();try{
  h.w.document.querySelector('[data-route-id="hill"]').click();
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem(h.key)),['hill']);
  assert.equal(h.w.document.activeElement.dataset.routeId,'hill');
  h.change('savedFilter','saved');assert.deepEqual(h.names(),['Ruta de muntanya']);
  h.change('maxDistance','20');assert.equal(h.names().length,0);
  h.$('clearFilters').click();assert.equal(h.names().length,3);
 }finally{h.dom.window.close();}
 const restored=await setup(['hill']);try{
  restored.change('savedFilter','saved');assert.deepEqual(restored.names(),['Ruta de muntanya']);
  restored.w.document.querySelector('[data-route-id="hill"]').click();
  assert.equal(restored.names().length,0);
  assert.deepEqual(JSON.parse(restored.w.localStorage.getItem(restored.key)),[]);
 }finally{restored.dom.window.close();}
});
