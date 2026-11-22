'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'..','roda-rumble');
const read=name=>readFileSync(path.join(dir,name),'utf8');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(read('engine.js')).toString('base64'));
test('Hammer, pulse and drill wheels cycle in a fixed, clearly explained order',async()=>{
  const e=await engine(),g=e.newGame(0);
  assert.deepEqual(e.SHOT_TYPES.map(x=>x.id),['impact','pulse','drill','blast','split','spring']);
  for(const expected of ['impact','pulse','drill','impact']){
    assert.equal(e.upcomingShot(g).id,expected);
    assert.equal(e.fire(g),true);
    assert.equal(g.projectile.type,expected);
    g.phase='between';
    assert.equal(e.nextShot(g),true);
  }
});
test('Pulse ability produces a physical blast, changes target state, and cannot repeat',async()=>{
  const e=await engine(),g=e.newGame(2);
  g.shotCount=1;
  assert.equal(e.fire(g),true);
  assert.equal(g.projectile.type,'pulse');
  const close=g.robots.find(t=>Math.abs(t.x-610)<3);
  g.projectile.x=close.x+12;g.projectile.y=close.y+10;
  assert.equal(e.turbo(g),true);
  assert.equal(e.turbo(g),false);
  assert.equal(close.dead,true);
  assert.ok(g.pulses.length>0,'Visual shockwave is emitted');
  assert.ok(g.debris.length>0,'Blast has visible particles');
  assert.ok(g.score>=650,'Direct pulse kill scores points');
  for(let i=0;i<80;i++)e.step(g,1/60);
  assert.equal(g.pulses.length,0,'Wave effect expires without leaking memory');
});
test('Drill bonus applies to steel on contact; direct hammer has more knockback',async()=>{
  const e=await engine();
  function strike(type,turbo){
    const g=e.newGame(0);
    g.phase='flying';g.shotCount=1;g.shotTime=.3;g.shotsLeft--;
    const b=g.blocks[0];
    for(const other of g.blocks){if(other!==b)other.dead=true;}
    // Isolate contact before ground friction, which can damp an intact block.
    b.y=400;b.material='steel';b.hp=145;b.mass=2.5;
    g.projectile={x:b.x-b.w/2-17,y:b.y,r:17,vx:380,vy:0,
      angle:0,spin:0,type,turbo,active:true,lowSpeed:0};
    e.step(g,1/120);
    return {hp:b.hp,vx:b.vx};
  }
  const plain=strike('impact',false),drill=strike('drill',true);
  assert.ok(drill.hp<plain.hp,'Drill takes more HP from steel when activated');
  assert.ok(Math.abs(plain.vx)>Math.abs(drill.vx),`Hammer knockback ${plain.vx}, drill ${drill.vx}; must be stronger`);
});
test('Predicted initial projectile trajectory and first target are finite and non-mutating',async()=>{
  const e=await engine(),g=e.newGame(0);
  const before=JSON.stringify({robots:g.robots,blocks:g.blocks,score:g.score});
  const result=e.predictShot(g);
  assert.ok(result.points.length>5);
  assert.deepEqual(result.points[0],e.WORLD.anchor);
  for(const p of result.points){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  }
  if(result.hit){
    assert.ok(['block','robot','bomb'].includes(result.hit.kind));
    assert.ok(Number.isFinite(result.hit.x));
  }
  assert.equal(JSON.stringify({robots:g.robots,blocks:g.blocks,score:g.score}),before);
  e.setAim(g,75,30);
  const another=e.predictShot(g);
  assert.notDeepEqual(result.points,another.points,'Trajectory reacts to aim and power');
  e.fire(g);
  assert.deepEqual(e.predictShot(g),{points:[],hit:null},'No aim guide during flight');
});
test('Additional levels have finite geometry and the shot simulation can advance',async()=>{
  const e=await engine();
  for(let index=4;index<e.LEVELS.length;index++){
    const g=e.newGame(index);
    assert.ok(g.robots.length>=3);
    assert.ok(g.blocks.length>=(index===10?7:8));
    assert.ok(g.shotsLeft>=5);
    e.setAim(g,39,88);
    e.fire(g);
    for(let frame=0;frame<340;frame++)e.step(g,1/60);
    assert.ok(['flying','between','won','lost'].includes(g.phase));
    for(const b of g.blocks){
      assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));
    }
    assert.ok(g.debris.length<=170);
  }
});

test('Pulse used too early is armed and detonates automatically near the first tower',async()=>{
  const e=await engine(),g=e.newGame(0);
  g.shotCount=1;
  e.fire(g);
  assert.equal(g.projectile.type,'pulse');
  assert.equal(e.turbo(g),true);
  assert.equal(g.projectile.pulseArmed,true);
  assert.equal(g.pulses.length,0,'An early press is not wasted off-screen');
  for(let frame=0;frame<200 && g.projectile.pulseArmed;frame++)e.step(g,1/60);
  assert.equal(g.projectile.pulseArmed,false);
  assert.ok(g.pulses.length>0,'The blast appears once the projectile reaches the scrapyard');
  assert.equal(e.turbo(g),false,'Only one special action per shot');
});

test('New scrapyard levels use their explicit wheel queues without consuming a shot on preview',async()=>{
  const e=await engine();
  for(let i=10;i<13;i++){
    const g=e.newGame(i), queue=e.LEVELS[i].queue;
    assert.equal(queue.length,g.shotsTotal);
    for(let j=0;j<queue.length;j++){
      assert.equal(e.upcomingShot(g,j).id,queue[j]);
      assert.equal(g.shotCount,0);
    }
    assert.equal(e.fire(g),true);
    assert.equal(g.projectile.type,queue[0]);
  }
});
