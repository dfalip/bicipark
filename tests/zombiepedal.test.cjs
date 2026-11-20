'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const dir=path.join(__dirname,'..','zombiepedal');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(dir,'engine.js'))).toString('base64'));
test('ZombiePedal contains four growing zones, reproducible obstacles and pickups',async()=>{
 const e=await load(),a=e.makeGame(67),b=e.makeGame(67);
 assert.equal(e.ZONES.length,4);
 assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.pickups,b.pickups);
 assert.ok(a.enemies.length>20);assert.ok(a.pickups.length>=10);
 assert.ok(a.enemies.some(x=>x.type==='runner'));
 assert.ok(a.enemies.some(x=>x.type==='helmet'));
 assert.ok(a.enemies.some(x=>x.type==='barrier'));
 assert.equal(a.enemies.at(-1).type,'big');
 assert.equal(a.hearts,3);assert.equal(a.ammo,8);assert.equal(a.phase,'ready');
});
test('Player runs automatically and can pedal, brake and pause without time drift',async()=>{
 const e=await load(),g=e.makeGame();e.step(g,{accelerate:true},.1);
 assert.equal(g.distance,0);assert.equal(e.start(g),true);
 for(let i=0;i<100;i++)e.step(g,{accelerate:true},1/60);
 assert.ok(g.speed>48&&g.distance>40);
 const speed=g.speed;
 for(let i=0;i<40;i++)e.step(g,{brake:true},1/60);
 assert.ok(g.speed<speed);
 assert.equal(e.togglePause(g),true);
 const dist=g.distance,t=g.time;
 e.step(g,{accelerate:true},10);assert.equal(g.distance,dist);assert.equal(g.time,t);
 assert.equal(e.togglePause(g),true);
 e.step(g,{},.08);assert.ok(g.distance>dist);
});
test('Jump clears a zombie, but standing at the collision point costs one heart',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 const enemy=g.enemies.find(x=>x.type==='walker');
 g.enemies=[enemy];
 g.distance=enemy.x-18;g.altitude=82;g.grounded=false;g.vy=0;
 e.step(g,{},.008);
 assert.equal(enemy.passed,true);
 assert.equal(g.hearts,3);
 assert.equal(g.dodges,1);
 const h=e.makeGame();e.start(h);
 const obstacle=h.enemies.find(x=>x.type==='walker');
 h.enemies=[obstacle];
 h.distance=obstacle.x-18;h.altitude=0;h.grounded=true;
 e.step(h,{},.008);
 assert.equal(obstacle.hit,true);
 assert.equal(h.hearts,2);
 assert.equal(h.hits,1);
 assert.equal(h.invulnerable>0,true);
});
test('Paintball projectiles disable zombies without reducing player lives; ammo is limited',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 const target=g.enemies.find(x=>x.type==='walker');
 g.distance=target.x-70;g.speed=28;
 assert.equal(e.fire(g),true);
 assert.equal(g.ammo,7);
 assert.equal(e.fire(g),false,'Shot cooldown prevents a flood of projectiles');
 for(let i=0;i<40;i++)e.step(g,{},1/120);
 assert.equal(target.stunned,true);
 assert.equal(g.stuns,1);
 assert.equal(g.hearts,3);
 assert.ok(g.score>0);
 const barrier=e.makeGame();e.start(barrier);
 const obj=barrier.enemies.find(x=>x.type==='barrier');
 barrier.distance=obj.x-70;e.fire(barrier);
 for(let i=0;i<30;i++)e.step(barrier,{},1/120);
 assert.equal(obj.stunned,false,'Road barriers are not targets');
});
test('Pickups replenish paintball ammunition or hearts, while score combos grow',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 const p=g.pickups.find(x=>x.kind==='ammo');
 assert.ok(p);g.ammo=1;g.distance=p.x;
 e.step(g,{},.008);
 assert.equal(p.collected,true);
 assert.equal(g.ammo,4);
 assert.equal(g.collected,1);
 const h=e.makeGame();e.start(h);
 h.enemies=[]; // Isolate the pickup bonus from unrelated close-spaced zombie dodges.
 const star=h.pickups.find(x=>x.kind==='star');
 assert.ok(star);h.distance=star.x;
 e.step(h,{},.008);
 assert.equal(h.combo,1);assert.ok(h.score>=190);
});
test('The horde grows if rider brakes and can end the chase; lost state is final',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 g.horde=99.85;g.speed=13;
 for(let i=0;i<100&&g.phase==='running';i++)e.step(g,{brake:true},1/60);
 assert.equal(g.phase,'lost');
 assert.ok(g.gameOverReason.includes('HORDA'));
 const at=g.distance;
 e.step(g,{accelerate:true},1);
 assert.equal(g.distance,at);
 assert.equal(e.jump(g),false);
 assert.equal(e.fire(g),false);
});
test('Escape route reaches a complete ending with a score and progress',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 // Isolate race progression from collisions, covered separately above.
 g.enemies=[]; // Isolate distance-to-finish from timed-stun expiry and collisions.
 for(let i=0;i<11000&&g.phase==='running';i++)e.step(g,{accelerate:true},1/60);
 assert.equal(g.phase,'finished');
 assert.equal(g.distance,e.WORLD.length);
 assert.ok(g.score>2000);
 assert.ok(g.finishStars>=1&&g.finishStars<=3);
 assert.equal(g.zone,3);
 assert.equal(e.fire(g),false);
});
test('Game includes touch, keyboard, accessible status and no third-party script',()=>{
 const html=readFileSync(path.join(dir,'classic.html'),'utf8');
 const app=readFileSync(path.join(dir,'app.js'),'utf8');
 for(const file of ['engine.js','app.js'])
  execFileSync(process.execPath,['--check',path.join(dir,file)],{stdio:'pipe'});
 for(const id of ['gameCanvas','playButton','pedalButton','brakeButton','jumpButton','paintButton',
 'hordeFill','scoreValue','recordValue','finishPanel','lostPanel','pausePanel','statusText']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/aria-live="polite"/);
 assert.match(app,/pointercancel/);assert.match(app,/localStorage/);
 assert.doesNotMatch(html,/<script[^>]+https?:\/\//);
});

test('Survival sectors are deterministic, progress beyond the escape finish and discard distant entities',async()=>{
 const e=await load(),a=e.makeGame(42,'survival'),b=e.makeGame(42,'survival');
 assert.deepEqual(a.enemies,b.enemies);
 assert.deepEqual(a.pickups,b.pickups);
 assert.equal(a.wave,1);
 e.start(a);
 for(const distance of [1451,3000,5800,15000,45000]){
  a.distance=distance;a.invulnerable=1;a.hearts=3;a.horde=0;
  e.step(a,{accelerate:true},1/60);
  assert.equal(a.phase,'running');
  assert.equal(a.wave,Math.floor(a.distance/1450)+1);
  assert.equal(a.zone,(a.wave-1)%4);
  assert.ok(a.enemies.length<45 && a.pickups.length<12);
  assert.ok(a.enemies.every(x=>x.x>=a.distance-151));
  assert.ok(a.enemies.some(x=>x.x>a.distance));
 }
 assert.ok(a.distance>e.WORLD.length);
 assert.equal(a.finishStars,0);
});
