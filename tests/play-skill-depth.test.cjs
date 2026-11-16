'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const load=file=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,file))).toString('base64'));
const tick=(e,g,input={},count=1)=>{for(let i=0;i<count;i++)e.step(g,input,1/120);};

test('SnowBike 360 has a real apex timing window, scores a clean landing, and recharges turbo',async()=>{
 const e=await load('snowbike-downhill/engine.js'),g=e.makeGame();
 assert.equal(e.trick(g),false,'no trick while ready');
 e.start(g);g.course.gates=[];g.course.animals=[];
 assert.equal(e.jump(g),true);
 tick(e,g,{},49);
 assert.ok(g.airHeight>.7&&Math.abs(g.airVelocity)<1.1,'reachable apex');
 assert.equal(e.trick(g),true);
 assert.equal(e.trick(g),false,'one trick per jump');
 tick(e,g,{},90);
 assert.equal(g.grounded,true);
 assert.equal(g.tricks,1);
 assert.equal(g.perfectTricks,1);
 assert.ok(g.score>=460);
 assert.ok(g.boost>=59);
 assert.equal(g.penalty,0);
 assert.ok(g.events.some(x=>x.type==='land'));
 assert.ok(g.events.some(x=>x.type==='trick-land'&&x.perfect));
 assert.equal(e.trick(g),false,'cannot trick on the ground');
});

test('SnowBike too-late 360 costs time and resets a streak without taking a life',async()=>{
 const e=await load('snowbike-downhill/engine.js'),g=e.makeGame();
 e.start(g);g.course.gates=[];g.course.animals=[];
 g.streak=3;e.jump(g);tick(e,g,{},66);
 assert.ok(g.airHeight>.35&&g.airVelocity>=-1.15);
 assert.equal(e.trick(g),true);
 tick(e,g,{},70);
 assert.equal(g.grounded,true);
 assert.equal(g.tricks,0);
 assert.equal(g.trickFailures,1);
 assert.equal(g.penalty,2);
 assert.equal(g.streak,0);
 assert.equal(g.hearts,3);
 assert.ok(g.events.some(x=>x.type==='trick-fail'));
});

test('SnowBike consecutive accurate slalom gates reward escalating streak, then reset on a miss',async()=>{
 const e=await load('snowbike-downhill/engine.js'),g=e.makeGame();
 e.start(g);g.course.animals=[];
 for(const gate of g.course.gates.slice(0,3)){
  g.distance=gate.at-.25;g.velocity=40;g.lane=gate.lane;
  e.step(g,{},.03);
 }
 assert.equal(g.streak,3);assert.equal(g.bestStreak,3);
 assert.equal(g.perfectGates,3);
 assert.ok(g.score>=250*3+65*3);
 const missed=g.course.gates[3];
 g.distance=missed.at-.25;g.velocity=40;
 g.lane=missed.lane>0?-.99:.99;
 e.step(g,{},.03);
 assert.equal(missed.quality,'missed');
 assert.equal(g.streak,0);assert.equal(g.bestStreak,3);
});

test('ZombiePedal tactical dash protects during the short active window and consumes its charge',async()=>{
 const e=await load('zombiepedal/engine.js'),g=e.makeGame();
 e.start(g);const enemy=g.enemies.find(x=>x.type==='walker');
 g.enemies=[enemy];g.distance=enemy.x-18;g.speed=40;
 const oldHorde=g.horde;
 assert.equal(e.dash(g),true);
 assert.equal(g.dashCharges,0);
 assert.equal(e.dash(g),false,'no repeated dash without charge');
 assert.ok(g.speed>=79&&g.horde<oldHorde);
 e.step(g,{},.035);
 assert.equal(g.hearts,3);
 assert.equal(g.dashDodges,1);
 assert.equal(g.dodges,1);
 assert.equal(enemy.passed,true);
 assert.ok(g.score>=155);
 assert.ok(g.events.some(x=>x.type==='dash-dodge'));
});

test('ZombiePedal charges recharge from stars and zone progression but respect the maximum',async()=>{
 const e=await load('zombiepedal/engine.js'),g=e.makeGame();
 e.start(g);g.enemies=[];
 e.dash(g);g.dashTime=0;g.dashCharges=0;
 const star=g.pickups.find(x=>x.kind==='star');
 assert.ok(star);g.distance=star.x;g.zone=Math.min(3,Math.floor(star.x/1450));e.step(g,{},.016);
 assert.equal(star.collected,true);
 assert.equal(g.dashCharges,1);
 g.distance=1449;g.speed=74;e.step(g,{accelerate:true},.12);
 assert.equal(g.zone,1);assert.equal(g.dashCharges,2);
 g.distance=2899;e.step(g,{accelerate:true},.12);
 assert.equal(g.zone,2);assert.equal(g.dashCharges,2,'rewards cannot exceed cap');
});

test('ZombiePedal dash pauses with the game, then expires and ordinary collisions still hurt',async()=>{
 const e=await load('zombiepedal/engine.js'),g=e.makeGame();
 e.start(g);e.dash(g);
 const timer=g.dashTime;
 e.togglePause(g);e.step(g,{},5);
 assert.equal(g.dashTime,timer);
 e.togglePause(g);g.enemies=[];
 tick(e,g,{},140);
 assert.equal(g.dashTime,0);
 const enemy=e.makeEnemies().find(x=>x.type==='walker');
 enemy.x=g.distance+18;g.enemies=[enemy];g.invulnerable=0;g.grounded=true;g.altitude=0;
 e.step(g,{},.016);
 assert.equal(g.hits,1);
 assert.equal(g.hearts,2);
});
