'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../bike-jump-ride/engine.js'))).toString('base64'));
test('Ground wheelie only awards points after riding and completing the balance manoeuvre',async()=>{
 const e=await load(),g=e.makeGame();e.begin(g);g.vx=130;
 for(let k=0;k<100;k++)e.step(g,{lean:-1},1/120);
 assert.ok(g.grounded&&g.wheelie>.24);assert.equal(g.trickScore,0);
 e.step(g,{},1/120);
 assert.equal(g.wheelies,1);assert.ok(g.trickScore>0);
});
for(const direction of [-1,1])test('A controlled '+(direction<0?'backflip':'frontflip')+' is rewarded only on a safe landing',async()=>{
 const e=await load(),g=e.makeGame();e.begin(g);
 g.x=1100;g.y=e.trackAt(g.x).y-e.WORLD.radius;g.angle=Math.atan(e.trackAt(g.x).slope);g.charge=1;g.vx=100;
 assert.ok(e.chargeJump(g,false));
 let k=0;
 for(;k<240&&!g.grounded&&g.phase==='riding';k++){
  const lean=Math.abs(g.airRotation)<Math.PI*2?direction:0;
  e.step(g,{lean},1/120);
  if(!g.grounded&&g.phase==='riding')assert.equal(g.trickScore,0);
 }
 assert.equal(g.phase,'riding');assert.ok(g.grounded);assert.equal(g.crashes,0);
 assert.equal(direction<0?g.backFlips:g.frontFlips,1);assert.ok(g.trickScore>=600);
});
test('Unlanded spin is discarded on crash; boost draws energy',async()=>{
 const e=await load(),g=e.makeGame();e.begin(g);
 const energy=g.boost;e.step(g,{boost:true},1/60);assert.ok(g.boost<energy&&g.boostTime>0);
 g.grounded=false;g.x=1780;g.y=745;g.vy=550;g.airRotation=6.4;e.step(g,{},1/60);
 assert.equal(g.phase,'crash');assert.equal(g.trickScore,0);assert.equal(g.frontFlips+g.backFlips,0);assert.equal(g.airRotation,0);
});
