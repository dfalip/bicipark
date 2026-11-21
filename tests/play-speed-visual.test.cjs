'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>readFileSync(path.join(root,p),'utf8');
const engine=p=>import('data:text/javascript;base64,'+Buffer.from(file(p)).toString('base64'));

test('ZombiePedal has a faster but brakeable chase, with earlier spaced enemies',async()=>{
 const e=await engine('zombiepedal/engine.js'),g=e.makeGame(77);
 assert.ok(g.speed>=22);
 assert.ok(g.enemies[0].x<=300);
 assert.ok(g.enemies[1].x-g.enemies[0].x<=230);
 e.start(g);
 // Isolate acceleration from collisions to check speed-envelope tuning.
 g.enemies=[];
 for(let i=0;i<240;i++)e.step(g,{accelerate:true},1/60);
 assert.ok(g.speed>73&&g.speed<75,'Pedaling must reach the faster tuned top speed');
 assert.ok(g.distance>220);
 const fast=g.speed;
 for(let i=0;i<75;i++)e.step(g,{brake:true},1/60);
 assert.ok(g.speed<fast*.5,'Braking must remain responsive at the new speed');
});

test('SnowBike gains speed downhill, while tucking and turbo remain controllable',async()=>{
 const e=await engine('snowbike-downhill/engine.js');
 const g=e.makeGame(0);assert.ok(g.velocity>=19);
 e.start(g);
 g.course.animals=[];g.course.gates=[];
 for(let i=0;i<270;i++)e.step(g,{tuck:true},1/60);
 assert.ok(g.velocity>64&&g.velocity<82&&Math.abs(g.velocity-73*e.terrainPace(g.distance,0))<7);
 assert.ok(g.distance>225);
 const normal=g.velocity;
 assert.ok(e.boost(g));
 for(let i=0;i<28;i++)e.step(g,{tuck:true},1/60);
 assert.ok(g.velocity>normal);
 const prior=g.velocity;
 for(let i=0;i<95;i++)e.step(g,{brake:true},1/60);
 assert.ok(g.velocity<prior*.45,'Braking can still prepare an obstacle at high speed');
});

test('Visuals are rendered from game state, not static bicycle emoji assets',()=>{
 const zombie=file('zombiepedal/app.js'),snow=file('snowbike-downhill/app.js');
 for(const p of ['zombiepedal/app.js','snowbike-downhill/app.js'])
  execFileSync(process.execPath,['--check',path.join(root,p)],{stdio:'pipe'});
 assert.match(zombie,/function drawCyclist\(/);
 assert.match(zombie,/function drawCityRush\(/);
 assert.match(zombie,/Math\.sin\(cadence\)/);
 assert.match(zombie,/createLinearGradient/);
 assert.match(zombie,/ctx\.arc\(dx,-29/);
 assert.match(snow,/function drawSkiBike\(/);
 assert.match(snow,/function drawSnowRush\(/);
 assert.match(snow,/function drawAlpineAnimal\(/);
 assert.match(snow,/const species=a\.emoji/);
 assert.match(snow,/ctx\.roundRect\(-6,-61/);
 assert.doesNotMatch(snow,/ctx\.fillText\(a\.emoji,/,
  'Use illustrated wildlife, not a static font emoji drawn on the piste');
});
