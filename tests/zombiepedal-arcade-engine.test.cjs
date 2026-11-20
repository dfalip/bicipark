'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..','zombiepedal');
const src=fs.readFileSync(path.join(dir,'arcade-engine.js'),'utf8');
const e=()=>import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function isolated(m){
 const g=m.makeArcade(77);m.beginArcade(g);g.enemies=[];g.pickups=[];g.nextSpawn=Infinity;g.events=[];return g;
}
function advance(m,g,seconds,input={}){for(let i=0;i<Math.ceil(seconds*120)&&g.phase==='running';i++)m.stepArcade(g,input,1/120);}
function drive(m,g,frames,check=()=>{}){
 for(let i=0;i<frames&&g.phase==='running';i++){
  if(i%6===0){
   const hazards=g.enemies.filter(x=>!x.passed&&!x.stunned&&x.x>g.distance-30&&x.x<g.distance+245);
   const costs=[0,1,2].map(l=>hazards.filter(x=>x.lane===l).reduce((s,x)=>s+1/Math.max(18,x.x-g.distance),0)+Math.abs(l-g.lane)*.0002);
   const lane=costs.indexOf(Math.min(...costs));if(lane!==g.laneTarget)m.moveLane(g,Math.sign(lane-g.laneTarget));
   const close=hazards.find(x=>x.lane===g.laneTarget&&x.x-g.distance<75);
   if(close&&['van','giant'].includes(close.type))m.turboArcade(g);
   else if(close)m.jumpArcade(g);
  }
  m.stepArcade(g,{accelerate:true,fire:true},1/60);
  check(g);
 }
}
test('Arcade City starts deterministic, does not simulate in ready or paused states',async()=>{
 const m=await e(),a=m.makeArcade(123),b=m.makeArcade(123);
 assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.pickups,b.pickups);
 assert.notDeepEqual(m.makeArcade(777).enemies,a.enemies);
 m.stepArcade(a,{accelerate:true},.1);assert.equal(a.distance,0);
 assert.equal(m.beginArcade(a),true);assert.equal(m.beginArcade(a),false);
 advance(m,a,.25);assert.ok(a.distance>0);
 m.pauseArcade(a);const before=a.distance,clock=a.time;
 m.stepArcade(a,{accelerate:true,fire:true},.12);
 assert.equal(a.distance,before);assert.equal(a.time,clock);
 assert.equal(m.pauseArcade(a),true);assert.equal(a.phase,'running');
});
test('Steering has continuous lane changes, clamps boundaries and prevents cross-lane damage',async()=>{
 const m=await e(),g=isolated(m);
 assert.equal(m.moveLane(g,-1),true);assert.equal(m.moveLane(g,-1),false);
 assert.equal(g.lane,1);advance(m,g,.05);assert.ok(g.lane>0&&g.lane<1);
 advance(m,g,.3);assert.equal(g.lane,0);
 const e1=m.addEnemy(g,'car',g.distance+60,2);advance(m,g,.9);
 assert.equal(g.hearts,3);assert.equal(e1.passed,true);assert.equal(g.dodges,1);
});
test('Actual paint projectiles deplete ammo and hit only same lane; helmets and giants take multiple hits',async()=>{
 const m=await e(),g=isolated(m);
 const wrong=m.addEnemy(g,'walker',115,0),helmet=m.addEnemy(g,'helmet',140,1);
 assert.equal(m.shootArcade(g),true);assert.equal(g.ammo,5);assert.equal(m.shootArcade(g),false);
 advance(m,g,.32);assert.equal(helmet.hp,1);assert.equal(wrong.hp,1);
 assert.equal(m.shootArcade(g),true);advance(m,g,.32);assert.equal(helmet.stunned,true);
 assert.equal(g.stuns,1);assert.equal(g.combo,1);
 const giant=m.addEnemy(g,'giant',g.distance+230,1);g.ammo=9;
 advance(m,g,1.1,{fire:true});assert.equal(giant.stunned,true);assert.equal(g.stuns,2);
 assert.ok(g.score>=720);assert.ok(g.ammo<9);
});
test('Jump has visible arc and clearance; height matters and shield absorbs one collision',async()=>{
 const m=await e(),g=isolated(m);
 m.addEnemy(g,'car',88,1);assert.equal(m.jumpArcade(g),true);assert.equal(m.jumpArcade(g),false);
 advance(m,g,.43);assert.ok(g.altitude>50);assert.equal(g.hearts,3);
 advance(m,g,.55);assert.equal(g.altitude,0);assert.equal(g.jumps,1);
 g.shield=5;m.addEnemy(g,'van',g.distance+46,1);
 advance(m,g,.12);assert.equal(g.hearts,3);assert.equal(g.shield,0);
 m.addEnemy(g,'van',g.distance+46,1);
 advance(m,g,.12);assert.equal(g.hearts,2);assert.equal(g.hits,1);assert.equal(g.combo,0);
});
test('Turbo is charge-limited, protects on real contact and combo rewards reflect play',async()=>{
 const m=await e(),g=isolated(m);
 const van=m.addEnemy(g,'van',80,1);assert.equal(m.turboArcade(g),true);
 assert.equal(g.turboCharges,0);assert.equal(m.turboArcade(g),false);
 advance(m,g,.45);assert.equal(van.passed,true);assert.equal(g.hearts,3);assert.ok(g.dodges>=1);
 advance(m,g,1);assert.equal(g.turbo,0);assert.equal(m.turboArcade(g),false);
 advance(m,g,4);assert.equal(g.combo,0);assert.ok(g.maxCombo>=1);
});
test('A player ignoring obstacles can lose; a basic tactical driver finishes four districts on six seeds',async()=>{
 const m=await e(),bad=m.makeArcade(77);m.beginArcade(bad);
 advance(m,bad,90,{accelerate:true});assert.equal(bad.phase,'lost');
 for(const seed of [1,7,77,123,999,20261120]){
  const g=m.makeArcade(seed);m.beginArcade(g);
  drive(m,g,6000);
  assert.equal(g.phase,'won','seed '+seed);assert.equal(g.wave,4);
  assert.ok(g.distance>=m.DISTRICT_LENGTH*4&&g.time<70&&g.score>0);
  assert.equal(m.achievements(g).find(x=>x.id==='finish').earned,true);
 }
});
test('Endless sectors progress without unbounded active entities or boss bookkeeping',async()=>{
 const m=await e(),g=m.makeArcade(77,'endless');m.beginArcade(g);
 drive(m,g,22000,g=>{
  assert.ok(g.enemies.length<24);assert.ok(g.pickups.length<16);assert.ok(g.shots.length<8);assert.ok(g.events.length<=80);assert.ok(g.bossWaves.size<=3);
  assert.ok(Number.isFinite(g.distance)&&Number.isFinite(g.score)&&g.lane>=0&&g.lane<=2);
 });
 assert.ok(g.wave>=10,'survival should keep generating new waves');
 assert.notEqual(g.phase,'won');assert.equal(m.achievements(g).find(x=>x.id==='survive').earned,true);
});
