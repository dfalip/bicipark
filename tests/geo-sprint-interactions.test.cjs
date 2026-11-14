'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {readFileSync}=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..','geo-sprint');
const source=name=>readFileSync(path.join(root,name),'utf8');
function load(name){
  return import('data:text/javascript;base64,'+Buffer.from(source(name)).toString('base64'));
}

async function gameHarness(){
  const [data,rules]=await Promise.all([load('data/cities.js'),load('engine.js')]);
  const dom=new JSDOM(source('index.html'),{
    url:'https://example.org/geo-sprint/?lang=ca',
    runScripts:'outside-only',pretendToBeVisual:true
  });
  const {window}=dom,events={};
  const feedbackLayer={addTo(){return this;},clearLayers(){},addLayer(){}};
  const map={
    setView(){return this;},
    on(name,callback){events[name]=callback;return this;},
    invalidateSize(){},
    fitBounds(){},
    getCenter(){return {lat:10,lng:10};}
  };
  window.L={
    map:()=>map,
    tileLayer:()=>({addTo(){return this;}}),
    layerGroup:()=>feedbackLayer,
    circleMarker:()=>({bindTooltip(){return this;}}),
    polyline:()=>({}),
    latLngBounds:()=>({pad(){return this;}})
  };
  window.__cities=data.cities;
  window.__rules=rules;
  const src=source('app.js');
  const importHeader=/^import \{cities\} from "\.\/data\/cities\.js";\s*import \{chooseRoundCities, haversineKm, scoreForGuess, ROUNDS\} from "\.\/engine\.js";\s*/;
  assert.match(src,importHeader);
  window.eval(src.replace(importHeader,
    'const cities=window.__cities;const {chooseRoundCities,haversineKm,scoreForGuess,ROUNDS}=window.__rules;\n'));
  return {window,events,dom};
}
test('GeoSprint re-renders every answer field after switching language',async()=>{
  const {window,events,dom}=await gameHarness();
  try{
    const $=id=>window.document.getElementById(id);
    assert.ok($('cityName').textContent.length>0);
    events.click({latlng:{lat:0,lng:0}});
    assert.equal($('resultCard').hidden,false);
    assert.match($('correctPlaceText').textContent,/^Era /);
    assert.match($('distanceText').textContent,/^Has quedat/);
    assert.match($('pointsAwarded').textContent,/punts/);
    assert.match($('resultLabel').textContent,/!|🌍|🙌|🎯|🚀/);
    const scoreBefore=$('scoreValue').textContent;
    $('languageSelect').value='en';
    $('languageSelect').dispatchEvent(new window.Event('change',{bubbles:true}));
    assert.match($('correctPlaceText').textContent,/^It was /);
    assert.match($('distanceText').textContent,/^You were /);
    assert.match($('pointsAwarded').textContent,/points/);
    assert.match($('resultLabel').textContent,/(Bullseye|So close|Nice try|Keep exploring)/);
    assert.equal($('scoreValue').textContent,scoreBefore,'Language must not change earned score');
    assert.equal($('nextButton').textContent,'Next city →');
    $('nextButton').click();
    assert.equal($('resultCard').hidden,true,'The next round clears previous answer');
    assert.equal($('roundValue').textContent,'2 / 5');
    assert.equal($('hintButton').disabled,false);
  }finally{dom.window.close();}
});
