'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const base = path.join(__dirname,'..','geo-sprint');
function src(p){return readFileSync(path.join(base,p),'utf8');}
function importSource(p){
  const value=Buffer.from(src(p)).toString('base64');
  return import('data:text/javascript;base64,'+value);
}
const rules=importSource('engine.js');
const data=importSource('data/cities.js');

test('GeoSprint pure engine and browser entry have valid syntax',()=>{
  for(const f of ['engine.js','app.js','data/cities.js']){
    execFileSync(process.execPath,['--check',path.join(base,f)],{stdio:'pipe'});
  }
});
test('GeoSprint data is worldwide, unique and always valid WGS84',async()=>{
  const {cities}=await data;
  assert.ok(cities.length>=30);
  assert.ok(new Set(cities.map(city=>city.id)).size===cities.length);
  assert.ok(new Set(cities.map(city=>city.continent)).size>=6);
  for(const city of cities){
    assert.ok(city.name.length>=3 && /^[A-Z]{2}$/.test(city.country));
    assert.ok(Number.isFinite(city.lat)&&Math.abs(city.lat)<=90);
    assert.ok(Number.isFinite(city.lng)&&Math.abs(city.lng)<=180);
  }
});
test('Five rounds cover five different continents without duplicate cities',async()=>{
  const {chooseRoundCities}=await rules;
  const {cities}=await data;
  for(const fixedRandom of [.02,.31,.5,.95]){
    const rounds=chooseRoundCities(cities,5,()=>fixedRandom);
    assert.equal(rounds.length,5);
    assert.equal(new Set(rounds.map(city=>city.id)).size,5);
    assert.equal(new Set(rounds.map(city=>city.continent)).size,5);
  }
  assert.throws(()=>chooseRoundCities([],5),RangeError);
});
test('Real-world distances and scoring preserve proximity',async()=>{
  const {haversineKm,scoreForGuess}=await rules;
  assert.equal(haversineKm({lat:10,lng:20},{lat:10,lng:20}),0);
  const equatorKm=haversineKm({lat:0,lng:0},{lat:0,lng:1});
  assert.ok(equatorKm>110 && equatorKm<112);
  assert.equal(scoreForGuess(0),1000);
  assert.equal(scoreForGuess(0,true),800);
  assert.ok(scoreForGuess(50)>scoreForGuess(500));
  assert.ok(scoreForGuess(500)>scoreForGuess(3000));
  assert.ok(scoreForGuess(600,true)<scoreForGuess(600,false));
  assert.throws(()=>scoreForGuess(-1),RangeError);
  assert.throws(()=>haversineKm({lat:100,lng:0},{lat:0,lng:0}),RangeError);
});
test('GeoSprint page includes keyboard alternatives, language switch and OSM attribution',()=>{
  const html=src('index.html'),js=src('app.js'),css=src('styles.css');
  for(const id of ['gameMap','languageSelect','hintButton','centerButton','resultCard','nextButton','againButton','mapFailure']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/OpenStreetMap contributors/);
  assert.match(js,/chooseRoundCities\(cities\)/);
  assert.match(js,/map\.on\("click",event=>guessAt/);
  assert.match(js,/ui\.centerButton\.addEventListener/);
  assert.match(js,/scoreForGuess\(km,usedHint\)/);
  assert.match(css,/prefers-reduced-motion/);
});
