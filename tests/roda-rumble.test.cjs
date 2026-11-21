'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=p=>readFileSync(path.join(root,p),'utf8');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(src('roda-rumble/engine.js')).toString('base64'));

test('RodaRumble provides thirteen original finite levels with distinct targets and materials',async()=>{
  const e=await engine();
  assert.equal(e.LEVELS.length,13);
  assert.equal(new Set(e.LEVELS.map(x=>x.name)).size,13);
  for(let i=0;i<e.LEVELS.length;i++){
    const g=e.newGame(i);
    assert.equal(g.levelIndex,i);
    assert.ok(g.robots.length>=2);
    assert.ok(g.blocks.length>=4);
    assert.ok(g.shotsLeft>=4);
    assert.equal(e.aliveTargets(g),g.robots.length);
    for(const b of g.blocks)assert.ok(['wood','glass','steel'].includes(b.material));
  }
  assert.ok(e.LEVELS.some(l=>l.bombs.length>0));
});
test('Aim values are clamped and cannot be changed after firing',async()=>{
  const e=await engine(),g=e.newGame(0);
  assert.equal(e.setAim(g,1000,-99),true);
  assert.equal(g.angle,78);
  assert.equal(g.power,15);
  e.aimFromPointer(g,e.WORLD.anchor.x-75,e.WORLD.anchor.y+75);
  assert.ok(g.angle>=43&&g.angle<=47);
  assert.ok(g.power>75);
  assert.equal(e.fire(g),true);
  assert.equal(e.fire(g),false,'Cannot fire the same shot twice');
  assert.equal(e.setAim(g,70,100),false);
  assert.equal(g.shotsLeft,3);
  assert.ok(g.projectile.vx>0&&g.projectile.vy<0);
});
test('Sling projectile follows gravity and collides with the material tower',async()=>{
  const e=await engine(),g=e.newGame(0);
  e.setAim(g,40,85);
  assert.equal(e.fire(g),true);
  for(let t=0;t<6.9;t+=1/60)e.step(g,1/60);
  assert.ok(g.score>0||g.blocks.some(b=>b.hp<50)||g.robots.some(r=>r.dead),
    'A standard shot should interact with the first tower, not pass straight through');
  assert.ok(['between','won','lost'].includes(g.phase));
  assert.ok(g.debris.length<=170);
});
test('Turbo is a once-per-shot meaningful action',async()=>{
  const e=await engine(),g=e.newGame(0);
  e.fire(g);e.step(g,.1);
  assert.equal(e.turbo(g),true);
  assert.equal(g.projectile.turbo,true);
  assert.equal(e.turbo(g),false);
  assert.ok(g.projectile.vx>300);
  e.step(g,1/60);
  assert.ok(Number.isFinite(g.projectile.x)&&Number.isFinite(g.projectile.y));
});
test('Bombs can trigger chain damage and remove nearby robots',async()=>{
  const e=await engine(),g=e.newGame(2),bomb=g.bombs[0];
  g.phase='flying';g.shotTime=.4;g.shotsLeft-=1;
  g.projectile={x:bomb.x-10,y:bomb.y-10,r:18,
    vx:180,vy:100,angle:0,spin:0,active:true,turbo:false,lowSpeed:0};
  e.step(g,1/60);
  assert.equal(bomb.dead,true);
  assert.ok(g.score>=350,'Explosion awards score');
  assert.ok(g.robots.some(t=>t.dead),'Nearby robot is affected by blast');
  assert.ok(g.debris.length>0,'Explosion generates visible debris');
});
test('Robots fall if the platform supporting them is destroyed',async()=>{
  const e=await engine(),g=e.newGame(0);
  for(const b of g.blocks){if(Math.abs(b.x-682)<65)b.dead=true;}
  g.phase='flying';g.shotsLeft-=1;g.shotTime=0;
  g.projectile={x:320,y:170,r:18,vx:0,vy:0,angle:0,
    spin:0,active:true,turbo:false,lowSpeed:0};
  for(let i=0;i<60;i++)e.step(g,1/60);
  assert.ok(g.robots[0].dead||g.robots[0].y>400,
    'Target must fall after support collapses instead of floating');
});
test('Shot transitions, retry and win stars are deterministic and bounded',async()=>{
  const e=await engine(),g=e.newGame(0);
  assert.equal(e.nextShot(g),false);
  e.fire(g);
  for(let i=0;i<500;i++)e.step(g,1/60);
  if(g.phase==='between'){
    assert.equal(e.nextShot(g),true);
    assert.equal(g.phase,'aim');
    assert.equal(g.projectile,null);
  }
  const fresh=e.newGame(0);
  fresh.phase='won';fresh.shotCount=1;fresh.score=2000;
  assert.equal(e.starsFor(fresh),3);
  fresh.shotCount=4;
  assert.equal(e.starsFor(fresh),1);
  assert.equal(e.starsFor(e.newGame(0)),0);
});
test('Playable site is completely local, keyboard-accessible and linked in Explora',()=>{
  for(const file of ['roda-rumble/engine.js','roda-rumble/app.js']){
    execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
  }
  const html=src('roda-rumble/index.html'),css=src('roda-rumble/styles.css'),
    js=src('roda-rumble/app.js'),registry=src('explora/data/modules.js');
  for(const id of ['gameCanvas','fireButton','turboButton','angleInput','powerInput',
    'retryButton','nextButton','levelSelect','gameStatus','resultPanel']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/aria-describedby="gameInstructions gameStatus"/);
  assert.match(js,/keydown/);
  assert.match(css,/max-width:760px/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(registry,/roda-rumble/);
  assert.doesNotMatch(js,/fetch\(|localStorage\.setItem\([^,]*https/);
});

test('A platform with its left pillar removed tips under an eccentric stacked load',async()=>{
 const e=await engine(),g=e.newGame(1);
 const [base,beam,upper]=g.blocks;
 g.blocks=[base,beam,upper];
 Object.assign(base,{x:874,y:480,w:52,h:60,material:"glass"});
 Object.assign(beam,{x:844,y:434,w:119,h:22,material:"wood"});
 Object.assign(upper,{x:844,y:392,w:46,h:63,material:"glass"});
 g.robots=[g.robots[0]];Object.assign(g.robots[0],{x:844,y:342});g.bombs=[];
 e.fire(g);g.projectile.active=false;g.physicsActive=true;
 for(let i=0;i<600&&g.phase==="flying";i++)e.step(g,1/120);
 assert.ok(beam.dead||Math.abs(beam.angle)>.1||beam.y>=450,"Unsupported platform must not stay suspended");
 assert.ok(g.robots[0].dead||g.robots[0].y>360,"Robot must respond to the collapse");
});

test('Missed shots cannot move or damage untouched structures before actual contact',async()=>{
 const e=await engine();
 for(let i=0;i<e.LEVELS.length;i++){
  const g=e.newGame(i);const snapshot=()=>JSON.stringify([g.blocks.map(b=>[b.x,b.y,b.angle,b.hp,b.dead]),g.robots.map(t=>[t.x,t.y,t.dead]),g.score]);
  const initial=snapshot();e.setAim(g,78,15);e.fire(g);
  for(let j=0;j<1500&&g.phase==="flying";j++){e.step(g,1/120);assert.equal(snapshot(),initial,"Uncontacted level "+(i+1)+" moved");}
  assert.equal(g.physicsActive,false);
 }
});
