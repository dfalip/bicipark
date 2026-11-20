'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const read=file=>readFileSync(path.join(__dirname,'..','roda-rumble',file),'utf8');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(read('engine.js')).toString('base64'));
test('Bounce normal reverses velocity, conserves glancing tangent and never energizes separating contacts',async()=>{
 const e=await engine();
 const direct=e.bounceVector(300,0,-1,0,.5,.9);
 assert.equal(direct.vx,-150);
 assert.equal(direct.vy,0);
 assert.equal(direct.normalSpeed,300);
 const glancing=e.bounceVector(300,40,-1,0,.4,.9);
 assert.equal(glancing.vx,-120);
 assert.equal(glancing.vy,36);
 const leaving=e.bounceVector(-120,40,-1,0,.5,.9);
 assert.equal(leaving.vx,-120);
 assert.equal(leaving.vy,40);
 assert.equal(leaving.normalSpeed,0);
 const ground=e.bounceVector(150,240,0,-1,.45,.9);
 assert.equal(ground.vx,135);
 assert.equal(ground.vy,-108);
});
test('A wheel reacts with greater rebound against steel than wood/glass without changing score formula',async()=>{
 const e=await engine();
 function hit(material){
  const g=e.newGame(0),b=g.blocks[0];
  for(const other of g.blocks){if(other!==b)other.dead=true;}
  b.x=620;b.y=360;b.vx=0;b.vy=0;b.hp=5000;b.mass={steel:2.5,wood:1.3,glass:.85}[material];b.material=material;
  g.phase='flying';g.shotTime=.3;g.shotsLeft--;g.shotCount=1;
  g.projectile={x:b.x-b.w/2-17,y:b.y,r:17,vx:360,vy:0,angle:0,
   type:'impact',active:true,turbo:false,lowSpeed:0,bounces:0,lastBounce:null};
  e.step(g,1/120);
  return {x:g.projectile.vx,last:g.projectile.lastBounce,b,game:g};
 }
 const steel=hit('steel'),wood=hit('wood'),glass=hit('glass');
 for(const candidate of [steel,wood,glass]){
  assert.ok(candidate.x<0,'the wheel must rebound instead of continuing through the block');
  assert.equal(candidate.game.projectile.bounces,1);
  assert.ok(Number.isFinite(candidate.last.speed));
  assert.equal(candidate.game.score,0,'a bounce alone does not create score');
 }
 assert.ok(steel.x<wood.x,'steel should throw the wheel back more strongly');
 assert.ok(wood.x<glass.x,'glass dissipates more of the impact than wood');
});
test('Ground contact bounces only on downward impact, keeps lateral motion and settles safely',async()=>{
 const e=await engine(),g=e.newGame(0);
 g.phase='flying';g.shotTime=.2;g.shotsLeft--;g.shotCount=1;
 g.projectile={x:330,y:e.WORLD.ground-18-2,r:18,vx:180,vy:260,
  angle:0,type:'impact',active:true,turbo:false,lowSpeed:0,bounces:0,lastBounce:null};
 e.step(g,1/120);
 assert.ok(g.projectile.vy<0,'the wheel must lift after a solid ground impact');
 assert.ok(g.projectile.vx>0&&g.projectile.vx<180,'horizontal speed should decay gently');
 assert.equal(g.projectile.lastBounce.kind,'ground');
 assert.equal(g.projectile.bounces,1);
 for(let i=0;i<12;i++)e.step(g,1/120);
 assert.ok(g.projectile.bounces<5,'no jittery instant repeat bounces at the ground');
 assert.ok(Number.isFinite(g.projectile.x)&&Number.isFinite(g.projectile.y));
});
test('Visual hit ring is lightweight, follows simulated impact and respects reduced-motion setting',()=>{
 const code=read('app.js');
 assert.match(code,/function drawBounceHalo\(\)/);
 assert.match(code,/game\.projectile\?\.lastBounce/);
 assert.match(code,/if\(!hit\|\|reducedMotion\)return/);
 assert.match(code,/drawBounceHalo\(\);\s*drawDebris\(\)/);
});
