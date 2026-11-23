// Bike Battle: deterministic duel regression checks, no browser dependencies.
const assert=require('node:assert/strict');
const test=require('node:test');
const E=require('../bike-battle/engine.js');
test('both riders start with 100 HP and movement is bounded',()=>{
 const s=E.create();assert.deepEqual(s.riders.map(r=>r.hp),[100,100]);
 E.move(s,10000);assert.equal(s.riders[0].x,165);assert.equal(s.move,0);
 E.move(s,10);assert.equal(s.riders[0].x,165);
});
test('invalid aim inputs cannot launch a projectile',()=>{
 const s=E.create();assert.equal(E.fire(s,NaN,50),false);
 assert.equal(E.fire(s,45,Infinity),false);assert.equal(s.shot,null);
});
test('turn switches only after shot settles; shooting twice is blocked',()=>{
 const s=E.create();assert.equal(E.fire(s,45,75),true);
 assert.equal(E.fire(s,45,75),false);
 for(let i=0;i<3000&&s.shot;i++)E.tick(s,1/120);
 assert.equal(s.shot,null);assert.equal(s.turn,1);
 assert.equal(s.move,65);
});
test('enemy targeting is finite and produces a valid shot',()=>{
 const s=E.create();s.turn=1;const a=E.aim(s);
 assert.ok(a.angle>=10&&a.angle<=85);assert.ok(a.power>=10&&a.power<=100);
 assert.equal(E.fire(s,a.angle,a.power),true);
});
test('zero and negative frame durations do not mutate state',()=>{
 const s=E.create();E.fire(s,50,70);
 const before=JSON.stringify(s);E.tick(s,0);E.tick(s,-1);E.tick(s,NaN);
 assert.equal(JSON.stringify(s),before);
});
