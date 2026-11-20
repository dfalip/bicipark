'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','zombiepedal');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
function setup(href="https://www.bicipark.com/zombiepedal/"){
 const dom=new JSDOM(read('legacy.html'),{url:href,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frames=[];
 const grad={addColorStop(){}};
 const ctx=new Proxy({},{get(o,k){if(k==='createLinearGradient')return ()=>grad;if(k in o)return o[k];o[k]=()=>{};return o[k];},set(o,k,v){o[k]=v;return true;}});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 w.eval(read('engine.js').replace(/^export /gm,'')+'\nwindow.__engine={WORLD,ZONES,clamp,makeGame,start,togglePause,jump,fire,dash,step};');
 const app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,'const {WORLD,ZONES,clamp,makeGame,start,togglePause,jump,fire,dash,step}=window.__engine;');
 assert.doesNotMatch(app,/^import\s/m);
 w.eval(app+'\nwindow.__state=()=>({game,keys,pointers});');
 const $=id=>w.document.getElementById(id);
 const frame=t=>{const f=frames.shift();assert.ok(f);f(t);};
 const key=(type,code)=>w.document.dispatchEvent(new w.KeyboardEvent(type,{bubbles:true,cancelable:true,code}));
 const pointer=(id,type,pid=7)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(e,'button',{value:0});Object.defineProperty(e,'pointerId',{value:pid});$(id).dispatchEvent(e);
 };
 return {w,dom,$,frame,key,pointer};
}
test('ZombiePedal launch renders playable arcade and four regions without login',()=>{
 const h=setup();try{
  assert.equal(h.w.__state().game.phase,'ready');
  assert.equal(h.$('readyPanel').hidden,false);
  assert.equal(h.$('zoneList').children.length,4);
  h.$('playButton').click();
  assert.equal(h.w.__state().game.phase,'running');
  assert.equal(h.$('readyPanel').hidden,true);
  h.key('keydown','ArrowRight');
  for(let i=0;i<120;i++)h.frame(i*16);
  assert.ok(h.w.__state().game.distance>30);
  assert.ok(h.w.__state().game.score>0);
  h.key('keyup','ArrowRight');
  assert.equal(h.w.__state().keys.has('ArrowRight'),false);
 }finally{h.dom.window.close();}
});
test('Touch jump and paint operate independently of held pedaling button',()=>{
 const h=setup();try{
  h.pointer('pedalButton','pointerdown',1);
  assert.equal(h.w.__state().game.phase,'running');
  h.pointer('jumpButton','pointerdown',2);
  assert.equal(h.w.__state().game.jumps,1);
  h.pointer('jumpButton','pointerup',2);
  h.pointer('paintButton','pointerdown',3);
  assert.equal(h.w.__state().game.ammo,7);
  h.pointer('paintButton','pointerup',3);
  h.frame(0);h.frame(35);
  assert.ok(h.w.__state().game.altitude>0);
  h.pointer('pedalButton','pointerup',1);
  assert.equal(h.w.__state().pointers.size,0);
 }finally{h.dom.window.close();}
});
test('Pause, resume and restart preserve controls and show correct overlays',()=>{
 const h=setup();try{
  h.$('playButton').click();
  h.$('pauseButton').click();
  assert.equal(h.w.__state().game.phase,'paused');
  assert.equal(h.$('pausePanel').hidden,false);
  h.$('resumeButton').click();
  assert.equal(h.w.__state().game.phase,'running');
  h.$('resetButton').click();
  assert.equal(h.w.__state().game.phase,'ready');
  assert.equal(h.$('readyPanel').hidden,false);
  assert.equal(h.$('scoreValue').textContent,'0');
 }finally{h.dom.window.close();}
});
test('Successful escape reaches finish and stores personal record locally',()=>{
 const h=setup();try{
  h.$('playButton').click();
  const g=h.w.__state().game;
  g.enemies=[];g.distance=h.w.__engine.WORLD.length-1;g.speed=54;
  h.frame(10);h.frame(70);
  assert.equal(g.phase,'finished');
  assert.equal(h.$('finishPanel').hidden,false);
  assert.match(h.$('finishSummary').textContent,/punts/);
  const best=JSON.parse(h.w.localStorage.getItem('bicipark-zombiepedal-best-v1'));
  assert.ok(best.finished&&best.score>0);
  h.$('playAgainButton').click();
  assert.equal(h.w.__state().game.phase,'ready');
 }finally{h.dom.window.close();}
});
test('Losing all hearts stops the arcade and offers accessible replay',()=>{
 const h=setup();try{
  h.$('playButton').click();const g=h.w.__state().game;
  const enemy=g.enemies.find(x=>x.type==='walker');g.enemies=[enemy];
  g.distance=enemy.x-18;g.hearts=1;g.altitude=0;
  h.frame(0);h.frame(30);
  assert.equal(g.phase,'lost');
  assert.equal(h.$('lostPanel').hidden,false);
  assert.match(h.$('lostReason').textContent,/HORDA/);
  h.$('retryButton').click();
  assert.equal(h.w.__state().game.phase,'ready');
 }finally{h.dom.window.close();}
});

test('Real zombie crash triggers visible flash, horde pressure, wobble and damage HUD',()=>{
 const h=setup();try{
  h.$('playButton').click();const g=h.w.__state().game;
  const enemy=g.enemies.find(x=>x.type==='walker');g.enemies=[enemy];
  g.distance=enemy.x-18;g.hearts=3;g.altitude=0;
  h.frame(0);h.frame(33);
  assert.equal(g.hits,1);assert.equal(g.hearts,2);
  assert.ok(g.stagger>0&&g.invulnerable>0);
  assert.ok(Number(h.$('impactFlash').style.opacity)>.05);
  assert.equal(h.w.document.querySelector('.stage').classList.contains('is-hit'),true);
  assert.equal(h.$('notice').classList.contains('notice--damage'),true);
  assert.match(h.$('statusText').textContent,/XOC/);
 }finally{h.dom.window.close();}
});
test('Hitting a zombie with paint gives a visible reward event and a temporary stun',()=>{
 const h=setup();try{
  h.$('playButton').click();const g=h.w.__state().game;
  const target=g.enemies.find(x=>x.type==='walker');g.enemies=[target];
  g.distance=target.x-70;g.speed=28;
  h.key('keydown','KeyX');
  h.frame(0);
  for(let i=1;i<23;i++)h.frame(i*16);
  assert.equal(g.stuns,1);
  assert.ok(target.stunTime>0);
  assert.equal(h.$('notice').classList.contains('notice--reward'),true);
  assert.ok(g.score>0);
  h.key('keyup','KeyX');
 }finally{h.dom.window.close();}
});

test('Tactical dash is usable on a touch device and rescues a near collision',()=>{
 const h=setup();try{
  assert.ok(h.$('dashButton'));
  h.$('playButton').click();
  const g=h.w.__state().game;
  const enemy=g.enemies.find(x=>x.type==='walker');
  g.enemies=[enemy];g.distance=enemy.x-18;
  h.pointer('dashButton','pointerdown',25);
  assert.equal(g.dashCharges,0);
  assert.ok(g.dashTime>0);
  h.pointer('dashButton','pointerup',25);
  h.frame(0);h.frame(35);
  assert.equal(g.hearts,3);
  assert.equal(g.dashDodges,1);
  assert.match(h.$('dashValue').textContent,/0 \/ 2/);
  assert.equal(h.$('dashButton').disabled,true);
  assert.equal(h.w.__state().pointers.size,0);
 }finally{h.dom.window.close();}
});

test('New route changes seeded enemies and pickups while a manual restart keeps chosen layout',()=>{
 const h=setup();try{
  const before=h.w.__state().game;
  const original=before.enemies.map(e=>e.type+':'+e.x).join('|');
  const seedLabel=h.$('routeValue').textContent;
  h.$('newRouteButton').click();
  const changed=h.w.__state().game;
  assert.notEqual(changed.enemies.map(e=>e.type+':'+e.x).join('|'),original);
  assert.notEqual(h.$('routeValue').textContent,seedLabel);
  assert.equal(changed.phase,'ready');
  h.$('playButton').click();
  h.$('resetButton').click();
  assert.deepEqual(h.w.__state().game.enemies,changed.enemies);
 }finally{h.dom.window.close();}
});

test('A dated ZombiePedal mission follows the seed and only successful escape records completion',async()=>{
 const mod=await import('data:text/javascript;base64,'+Buffer.from(
  require('node:fs').readFileSync(require('node:path').join(__dirname,'..','explora','play-progress.js'),'utf8')).toString('base64'));
 const day=mod.localDay(),mission=mod.missionForDay(day);
 if(mission.game!=='zombiepedal')return; // SnowBike has the alternating day.
 const h=setup('https://www.bicipark.com/zombiepedal/?challenge='+day+'&seed='+mission.seed);
 try{
  const g=h.w.__state().game;
  assert.equal(g.seed,mission.seed);
  assert.equal(h.w.localStorage.getItem(mod.DAILY_STORE),null);
  h.$('playButton').click();g.enemies=[];
  g.distance=h.w.__engine.WORLD.length-1;g.speed=65;
  h.frame(0);h.frame(65);
  assert.equal(g.phase,'finished');
  const records=JSON.parse(h.w.localStorage.getItem(mod.DAILY_STORE));
  assert.equal(records[day].game,'zombiepedal');
  assert.ok(records[day].score>=0);
  assert.match(h.$('finishSummary').textContent,/REPTE DIARI COMPLETAT/);
 }finally{h.dom.window.close();}
});

test('Survival uses separate records and resumes a fresh run of the selected mode',()=>{
 const h=setup();try{
  const select=h.$('modeSelect');select.value='survival';
  select.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.equal(h.w.__state().game.mode,'survival');
  assert.match(h.$('playButton').textContent,/SUPERVIVÈNCIA/);
  h.$('playButton').click();
  const g=h.w.__state().game;
  assert.equal(select.disabled,true);
  g.distance=6000;g.horde=99.99;g.speed=12;
  h.frame(0);h.frame(70);
  assert.equal(g.phase,'lost');
  assert.match(h.$('lostReason').textContent,/Onada/);
  assert.ok(h.w.localStorage.getItem('bicipark-zombiepedal-survival-best-v1'));
  assert.equal(h.w.localStorage.getItem('bicipark-zombiepedal-best-v1'),null);
  h.$('retryButton').click();
  assert.equal(h.w.__state().game.mode,'survival');
  assert.equal(h.w.__state().game.distance,0);
  select.value='escape';select.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.equal(h.w.__state().game.mode,'escape');
  assert.equal(h.w.localStorage.getItem('bicipark-zombiepedal-best-v1'),null);
 }finally{h.dom.window.close();}
});
