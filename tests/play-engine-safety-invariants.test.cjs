'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');

const load=(relative)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(path.join(__dirname,'..',relative))).toString('base64'));

test('SnowBike levels reproduce identical obstacles and do not share mutable state',async()=>{
 const engine=await load('snowbike-downhill/engine.js');
 for(let id=0;id<engine.COURSES.length;id++){
  const first=engine.makeGame(id),second=engine.makeGame(id);
  assert.deepEqual(first.course.gates,second.course.gates);
  assert.deepEqual(first.course.animals,second.course.animals);
  first.course.gates[0].passed=true;
  first.course.animals[0].passed=true;
  assert.equal(second.course.gates[0].passed,false);
  assert.equal(second.course.animals[0].passed,false);
 }
});

test('SnowBike ignores invalid time steps and pauses without progressing',async()=>{
 const engine=await load('snowbike-downhill/engine.js');
 const game=engine.makeGame(0);
 assert.equal(engine.jump(game),false,'cannot jump before starting');
 assert.equal(engine.start(game),true);
 engine.step(game,{tuck:true},1/60);
 assert.equal(engine.pause(game),true);
 const snapshot=structuredClone(game);
 for(const dt of [1/60,0,-1,NaN,Infinity])engine.step(game,{tuck:true,steer:1},dt);
 assert.deepEqual(game,snapshot);
 assert.equal(engine.jump(game),false,'cannot jump while paused');
 assert.equal(engine.resume(game),true);
 engine.step(game,{tuck:true},1/60);
 assert.ok(game.distance>snapshot.distance);
});

test('ZombiePedal seeded routes are reproducible and independent',async()=>{
 const engine=await load('zombiepedal/engine.js');
 const first=engine.makeGame(77),second=engine.makeGame(77);
 assert.deepEqual(first.enemies,second.enemies);
 assert.deepEqual(first.pickups,second.pickups);
 first.enemies[0].passed=true;
 first.pickups[0].collected=true;
 assert.equal(second.enemies[0].passed,false);
 assert.equal(second.pickups[0].collected,false);
});

test('ZombiePedal pause and invalid deltas cannot advance simulation or spend resources',async()=>{
 const engine=await load('zombiepedal/engine.js');
 const game=engine.makeGame(77);
 assert.equal(engine.dash(game),false,'cannot dash before start');
 assert.equal(engine.start(game),true);
 engine.step(game,{accelerate:true},1/60);
 assert.equal(engine.togglePause(game),true);
 const snapshot=structuredClone(game);
 for(const dt of [1/60,0,-1,NaN,Infinity])engine.step(game,{accelerate:true},dt);
 assert.deepEqual(game,snapshot);
 assert.equal(engine.fire(game),false);
 assert.equal(engine.dash(game),false);
 assert.equal(engine.togglePause(game),true);
 engine.step(game,{accelerate:true},1/60);
 assert.ok(game.distance>snapshot.distance);
});
