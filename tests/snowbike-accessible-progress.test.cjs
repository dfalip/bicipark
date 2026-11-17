'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=readFileSync(path.join(root,'snowbike-downhill/index.html'),'utf8');
const app=readFileSync(path.join(root,'snowbike-downhill/app.js'),'utf8');
const {JSDOM}=require('jsdom');

test('SnowBike exposes accessible, labelled and bounded progress indicators',()=>{
 const doc=new JSDOM(html).window.document;
 const progress=doc.querySelector('.progress[role="progressbar"]');
 const energy=doc.querySelector('.energy-track[role="progressbar"]');
 assert.ok(progress&&energy);
 assert.equal(progress.getAttribute('aria-label'),'Progrés del descens');
 assert.equal(energy.getAttribute('aria-labelledby'),'boostLabel');
 for(const [node,value] of [[progress,'0'],[energy,'35']]){
  assert.equal(node.getAttribute('aria-valuemin'),'0');
  assert.equal(node.getAttribute('aria-valuemax'),'100');
  assert.equal(node.getAttribute('aria-valuenow'),value);
 }
 assert.equal(doc.getElementById('boostLabel').textContent,'ENERGIA TURBO');
 assert.equal(doc.getElementById('progressFill').getAttribute('aria-hidden'),'true');
 assert.equal(doc.getElementById('boostFill').getAttribute('aria-hidden'),'true');
});

test('SnowBike synchronizes ARIA values with the same real game state as visual bars',()=>{
 execFileSync(process.execPath,['--check',path.join(root,'snowbike-downhill/app.js')],{stdio:'pipe'});
 assert.match(app,/ui\.progress\.parentElement\.setAttribute\("aria-valuenow",String\(progress\)\)/);
 assert.match(app,/ui\.boost\.parentElement\.setAttribute\("aria-valuenow",String\(Math\.round\(game\.boost\)\)\)/);
 assert.match(app,/const progress=Math\.round\(game\.distance\/game\.course\.length\*100\)/);
});
