'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const dir=path.join(__dirname,'..','bike-jump-ride');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(dir,'engine.js'))).toString('base64'));
test('Track contains four distinct big gaps with run-up, landing and finish',async()=>{
  const e=await load();
  assert.equal(e.TRACK.length,9);
  const gapCoords=[[721,929],[1661,1929],[2861,3179],[4061,4429]];
  for(const [a,b] of gapCoords){
    assert.equal(e.trackAt(a),null);
    assert.equal(e.trackAt(b),null);
  }
  assert.ok(e.trackAt(100)&&e.trackAt(5400)&&e.WORLD.finish<e.WORLD.width);
  assert.ok(e.CHECKPOINTS.length>=3);
  assert.ok(e.RINGS.length>=8);
});
test('Bike starts stationary, accelerates, brakes and cannot go backwards',async()=>{
  const e=await load(),g=e.makeGame();
  assert.equal(g.phase,'ready');
  e.step(g,{accelerate:true},.08);
  assert.equal(g.vx,0,'ready state must not advance without the player pressing Play');
  assert.equal(e.begin(g),true);
  for(let i=0;i<90;i++)e.step(g,{accelerate:true},1/60);
  assert.ok(g.vx>350&&g.x>300);
  const speed=g.vx;
  for(let i=0;i<45;i++)e.step(g,{brake:true},1/60);
  assert.ok(g.vx<speed);
  assert.ok(g.vx>=0);
});
test('Ramps launch automatically into the air; pressing jump builds and releases an impulse',async()=>{
  const e=await load(),g=e.makeGame();e.begin(g);
  let inAir=false;
  for(let i=0;i<180;i++){
    e.step(g,{accelerate:true},1/60);
    if(!g.grounded){inAir=true;break;}
  }
  assert.equal(inAir,true);
  assert.ok(g.vy<0,'ramp should launch bike upwards');
  assert.ok(g.jumpCount>=1);
  const fresh=e.makeGame();e.begin(fresh);
  for(let i=0;i<25;i++)e.step(fresh,{accelerate:true,jumpHeld:true},1/60);
  assert.ok(fresh.charge>.5);
  e.step(fresh,{accelerate:true,jumpReleased:true},1/60);
  assert.equal(fresh.grounded,false);
  assert.ok(fresh.vy<0);
  assert.equal(fresh.charge,0);
});
test('A long downhill course can be completed with acceleration and no pixel teleports',async()=>{
  const e=await load(),g=e.makeGame();e.begin(g);
  let maxStep=0,prevX=g.x,seenGap=false;
  for(let i=0;i<6000&&g.phase!=='finish';i++){
    e.step(g,{accelerate:true},1/60);
    maxStep=Math.max(maxStep,Math.abs(g.x-prevX));prevX=g.x;
    if(!g.grounded)seenGap=true;
    assert.ok(Number.isFinite(g.x)&&Number.isFinite(g.y)&&Number.isFinite(g.angle));
    assert.ok(g.x>=0&&g.x<=e.WORLD.width+40);
  }
  assert.equal(seenGap,true);
  assert.ok(maxStep<50,'Do not teleport between terrain pieces or checkpoints in normal play');
  assert.equal(g.phase,'finish','A simple accelerate run must have at least a feasible route to the finish');
  assert.ok(g.jumpCount>=3);
  assert.ok(g.landings>=1);
  assert.equal(g.progress,1);
  assert.ok(g.score>0);
});
test('Crash animation and restart preserve earned score and checkpoint progress',async()=>{
  const e=await load(),g=e.makeGame();
  e.begin(g);g.checkpoint=1;g.checkpointX=2050;
  // Simulate falling below a genuine gap, rather than landing on a hill.
  g.grounded=false;g.x=1780;g.y=745;g.vy=550;
  g.score=1200;
  e.step(g,{accelerate:false},1/60);
  assert.equal(g.phase,'crash');
  assert.equal(g.crashes,1);
  assert.equal(g.score,1050);
  for(let i=0;i<90;i++)e.step(g,{},1/60);
  assert.equal(g.phase,'riding');
  assert.equal(g.x,2050);
  assert.ok(g.grounded);
  assert.equal(g.score,1050);
});
test('Collectible rings and deterministic stars persist within a run',async()=>{
  const e=await load(),g=e.makeGame();e.begin(g);
  const ring=g.rings[0];
  g.x=ring.x-1;g.y=ring.y;g.vx=20;g.grounded=false;g.vy=0;
  e.step(g,{},1/60);
  assert.equal(ring.collected,true);
  assert.equal(g.score,250);
  e.step(g,{},1/60);
  assert.equal(g.score,250,'Rings cannot be farmed by oscillating');
});
test('Ride UI, touch, keyboard and accessibility hooks exist and compile',()=>{
  for(const file of ['engine.js','app.js'])execFileSync(process.execPath,
    ['--check',path.join(dir,file)],{stdio:'pipe'});
  const html=readFileSync(path.join(dir,'index.html'),'utf8');
  const css=readFileSync(path.join(dir,'styles.css'),'utf8');
  const js=readFileSync(path.join(dir,'app.js'),'utf8');
  for(const id of ['gameCanvas','playButton','accelerateButton','brakeButton','jumpButton',
    'leanBackButton','leanForwardButton','progressBar','statusText','finishPanel',
    'playAgainButton','restartButton']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/aria-describedby="instructions statusText"/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(js,/pointercancel/);
  assert.match(js,/keydown/);
  assert.match(js,/requestAnimationFrame/);
});
