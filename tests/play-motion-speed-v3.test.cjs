'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>readFileSync(path.join(root,p),'utf8');
const importEngine=p=>import('data:text/javascript;base64,'+Buffer.from(load(p)).toString('base64'));

test('SnowBike has a faster start, meaningful tuck and turbo, and a usable brake',async()=>{
 const e=await importEngine('snowbike-downhill/engine.js'),g=e.makeGame(0);
 assert.equal(g.velocity,24);
 e.start(g);g.course.gates=[];g.course.animals=[];
 for(let i=0;i<350;i++)e.step(g,{tuck:true},1/60);
 const target=73*e.terrainPace(g.distance,0);
 assert.ok(g.velocity>64&&g.velocity<82&&Math.abs(g.velocity-target)<7,'Tuck remains fast within the measured variable-slope speed envelope');
 const speed=g.velocity;
 assert.equal(e.boost(g),true);
 for(let i=0;i<48;i++)e.step(g,{tuck:true},1/60);
 assert.ok(g.velocity>speed+13,'Turbo adds meaningful speed');
 for(let i=0;i<90;i++)e.step(g,{brake:true},1/60);
 assert.ok(g.velocity<15,'Brake still allows strategic slalom approach');
});

test('High-speed wildlife begins crossing early enough to plan a manoeuvre',async()=>{
 const e=await importEngine('snowbike-downhill/engine.js'),g=e.makeGame(0);
 e.start(g);
 const animal=g.course.animals[3];
 g.distance=animal.at-235;g.velocity=90;
 assert.equal(animal.phase,'waiting');
 e.step(g,{},1/120);
 assert.equal(animal.phase,'crossing');
 assert.equal(animal.seen,true);
 assert.equal(g.hearts,3);
});

test('ZombiePedal bike accelerates more quickly and the rider can still brake and jump',async()=>{
 const e=await importEngine('zombiepedal/engine.js'),g=e.makeGame();
 assert.equal(g.speed,26);
 e.start(g);g.enemies=[];
 for(let i=0;i<240;i++)e.step(g,{accelerate:true},1/60);
 assert.ok(g.speed>73.9 && g.speed<74.1);
 const fast=g.speed;
 for(let i=0;i<75;i++)e.step(g,{brake:true},1/60);
 assert.ok(g.speed<fast*.4);
 assert.equal(e.jump(g),true);
 e.step(g,{},.1);
 assert.ok(g.altitude>0);
});

test('Animation projection matches the new speed and remains state-driven and syntactically valid',()=>{
 const snow=load('snowbike-downhill/app.js');
 const zombie=load('zombiepedal/app.js');
 assert.match(snow,/TRACK_PROJECTION=\.58/);
 assert.match(snow,/game\.distance\+\(427-y\)\/TRACK_PROJECTION/);
 assert.match(snow,/Math\.sin\(game\.time/);
 assert.match(zombie,/CHASE_PROJECTION=1\.16/);
 assert.match(zombie,/worldX-game\.distance\)\*CHASE_PROJECTION/);
 assert.match(zombie,/function drawCityRush/);
 for(const file of ['snowbike-downhill/app.js','snowbike-downhill/engine.js','zombiepedal/app.js','zombiepedal/engine.js']){
  execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
 }
});
