'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>readFileSync(path.join(root,f),'utf8');
test('BiciPark Play homepage and catalogue show bicycle parking strategy game',()=>{
  const home=read('index.html'),catalogue=read('explora/data/modules.js');
  assert.match(home,/href="\.\/bike-parking-puzzle\/"/);
  assert.match(home,/BiciPark Puzzle · Aparca-les!/);
  assert.match(catalogue,/id: "bike-parking-puzzle",[\s\S]*?href: "\.\.\/bike-parking-puzzle\/"/);
  for(const file of ['bike-parking-puzzle/index.html','bike-parking-puzzle/app.js','bike-parking-puzzle/engine.js','bike-parking-puzzle/styles.css'])
    assert.ok(existsSync(path.join(root,file)),file+' must exist');
});
test('RodaRumble now offers ten separately selectable levels and the existing wheel abilities',()=>{
  const rr=read('roda-rumble/index.html'),catalogue=read('explora/data/modules.js');
  for(let i=0;i<10;i++){
    assert.match(rr,new RegExp('<option value="'+i+'">'));
  }
  assert.match(catalogue,/10 nivells/);
  assert.match(read('roda-rumble/engine.js'),/RODA MARTELL/);
  assert.match(read('roda-rumble/engine.js'),/RODA POLS/);
  assert.match(read('roda-rumble/engine.js'),/RODA TREPANT/);
});
