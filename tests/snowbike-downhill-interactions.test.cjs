'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','snowbike-downhill');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
function setup(href="https://www.bicipark.com/snowbike-downhill/"){
 const dom=new JSDOM(read('index.html'),{url:href,
   runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,queue=[];
 const gradient={addColorStop(){}};
 const ctx=new Proxy({},{get(obj,k){if(k==='createLinearGradient')return ()=>gradient;if(k in obj)return obj[k];obj[k]=()=>{};return obj[k];},set(obj,k,v){obj[k]=v;return true;}});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.requestAnimationFrame=fn=>{queue.push(fn);return queue.length;};
 w.eval(read('engine.js').replace(/^export /gm,'')+'\nwindow.__engine={COURSES,clamp,skiTrackCenter,makeGame,start,pause,resume,boost,jump,trick,step,scoreFinish};');
 const app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,
  'const {COURSES,clamp,skiTrackCenter,makeGame,start,pause,resume,boost,jump,trick,step,scoreFinish}=window.__engine;');
 assert.doesNotMatch(app,/^import\s/m);
 w.eval(app+'\nwindow.__state=()=>({game,keys,pointers});');
 const $=id=>w.document.getElementById(id);
 const frame=t=>{const f=queue.shift();assert.ok(f);f(t);};
 const key=(type,code)=>w.document.dispatchEvent(new w.KeyboardEvent(type,{bubbles:true,cancelable:true,code}));
 const pointer=(id,type,pid=5)=>{
  const event=new w.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(event,'pointerId',{value:pid});
  Object.defineProperty(event,'button',{value:0});
  $(id).dispatchEvent(event);
 };
 return {w,dom,$,frame,key,pointer};
}
test('SnowBike UI initializes with four playable pistes and no network login',()=>{
 const h=setup();try{
  assert.equal(h.$('courseSelect').options.length,4);
  assert.equal(h.$('startPanel').hidden,false);
  assert.equal(h.$('courseRecords').children.length,4);
  assert.equal(h.$('progressValue').textContent,'0%');
  assert.equal(h.w.__state().game.phase,'ready');
 }finally{h.dom.window.close();}
});
test('Starting, steering, aerodynamic tuck and turbo advance the live downhill',()=>{
 const h=setup();try{
  h.$('startButton').click();
  const g=h.w.__state().game;assert.equal(g.phase,'playing');
  h.key('keydown','ArrowRight');h.key('keydown','ArrowDown');
  for(let i=0;i<75;i++)h.frame(i*16);
  assert.ok(g.distance>10);
  assert.ok(g.lane>.1);
  assert.match(h.$('speedValue').textContent,/km\/h/);
  h.key('keyup','ArrowRight');h.key('keyup','ArrowDown');
  h.key('keydown','KeyT');h.frame(1300);
  assert.equal(g.boostUsed,1);assert.ok(g.boostTime>0);
  h.key('keyup','KeyT');
 }finally{h.dom.window.close();}
});
test('Touch controls press and release, pause and restart function',()=>{
 const h=setup();try{
  h.pointer('rightButton','pointerdown',7);
  h.pointer('tuckButton','pointerdown',8);
  assert.equal(h.w.__state().game.phase,'playing');
  assert.equal(h.w.__state().pointers.size,2);
  for(let i=0;i<15;i++)h.frame(i*16);
  h.pointer('rightButton','pointerup',7);h.pointer('tuckButton','pointerup',8);
  assert.equal(h.w.__state().pointers.size,0);
  h.$('pauseButton').click();
  assert.equal(h.w.__state().game.phase,'paused');
  assert.equal(h.$('pausePanel').hidden,false);
  h.$('resumeButton').click();
  assert.equal(h.w.__state().game.phase,'playing');
  h.$('restartButton').click();
  assert.equal(h.w.__state().game.phase,'ready');
  assert.equal(h.$('startPanel').hidden,false);
 }finally{h.dom.window.close();}
});
test('Completing a downhill race displays honest penalized result and remembers best',()=>{
 const h=setup();try{
  h.$('startButton').click();
  const g=h.w.__state().game;
  g.distance=g.course.length-.1;g.velocity=44;g.hearts=3;g.time=43;
  h.frame(0);h.frame(33);
  assert.equal(g.phase,'finished');
  assert.equal(h.$('finishPanel').hidden,false);
  assert.match(h.$('finishSummary').textContent,/penalització/);
  const saved=JSON.parse(h.w.localStorage.getItem('bicipark-snowbike-downhill-times-v1'));
  assert.ok(saved[0].time>0);
  h.$('nextButton').click();
  assert.equal(h.w.__state().game.course.id,1);
  assert.equal(h.$('finishPanel').hidden,true);
 }finally{h.dom.window.close();}
});

test('A real animal collision shakes and flashes the track, wobbles the skier and costs a heart',()=>{
 const h=setup();try{
  h.$('startButton').click();const g=h.w.__state().game;
  const animal=g.course.animals[0];g.course.animals=[animal];
  g.distance=animal.at-.2;g.lane=animal.x;g.velocity=40;
  h.frame(0);h.frame(33);
  assert.equal(g.hits,1);
  assert.equal(g.hearts,2);
  assert.ok(g.stumble>0&&g.invulnerability>0);
  assert.equal(h.$('impactFlash').style.opacity!=='0',true);
  assert.equal(h.w.document.querySelector('.game-stage').classList.contains('is-hit'),true);
  assert.match(h.$('statusText').textContent,/XOC/);
 }finally{h.dom.window.close();}
});
test('A perfect gate creates on-screen reward feedback and an improved turbo meter',()=>{
 const h=setup();try{
  h.$('startButton').click();const g=h.w.__state().game;
  const gate=g.course.gates[0];g.distance=gate.at-.2;g.lane=gate.lane;g.velocity=44;
  h.frame(0);h.frame(40);
  assert.equal(gate.quality,'perfect');
  assert.equal(g.perfectGates,1);
  assert.ok(g.boost>35);
  assert.equal(h.$('notice').classList.contains('notice--win'),true);
  assert.match(h.$('statusText').textContent,/PORTA PERFECTA/);
 }finally{h.dom.window.close();}
});

test('Space and touch controls launch a visible jump, land and restore availability',()=>{
 const h=setup();try{
  assert.ok(h.$('jumpButton'),'Mobile jump button exists');
  h.$('startButton').click();
  const g=h.w.__state().game;
  h.key('keydown','Space');
  assert.equal(g.jumps,1);
  assert.equal(g.grounded,false);
  assert.equal(g.airVelocity>0,true);
  h.frame(0);h.frame(150);h.frame(300);
  assert.ok(g.airHeight>.35,'The skibike must visibly rise over the piste');
  assert.equal(h.$('jumpButton').getAttribute('aria-disabled'),'true');
  h.key('keyup','Space');
  for(let i=5;i<100&&(!g.grounded||g.jumpCooldown>0);i++)h.frame(i*16);
  assert.equal(g.grounded,true);
  assert.equal(g.jumpCooldown,0);
  h.pointer('jumpButton','pointerdown',24);
  assert.equal(g.jumps,2);
  assert.equal(g.grounded,false);
  h.pointer('jumpButton','pointerup',24);
  assert.equal(h.w.__state().pointers.size,0);
 }finally{h.dom.window.close();}
});
test('Touch jump cleanly resets after switching courses',()=>{
 const h=setup();try{
  h.pointer('jumpButton','pointerdown',31);
  assert.equal(h.w.__state().game.jumps,1);
  assert.equal(h.w.__state().game.phase,'playing');
  h.pointer('jumpButton','pointercancel',31);
  h.$('courseSelect').value='2';
  h.$('courseSelect').dispatchEvent(new h.w.Event('change',{bubbles:true}));
  const g=h.w.__state().game;
  assert.equal(g.phase,'ready');
  assert.equal(g.course.id,2);
  assert.equal(g.jumps,0);
  assert.equal(g.airHeight,0);
  assert.equal(h.w.__state().pointers.size,0);
 }finally{h.dom.window.close();}
});

test('360 trick timing works with touch and updates the visible skill hint',()=>{
 const h=setup();try{
  assert.ok(h.$('trickButton'));
  h.$('startButton').click();
  const g=h.w.__state().game;
  h.key('keydown','Space');
  h.frame(0);
  for(let i=1;i<=26;i++)h.frame(i*16);
  h.key('keyup','Space');
  assert.ok(g.airHeight>.35);
  assert.match(h.$('styleValue').textContent,/K|360/);
  h.pointer('trickButton','pointerdown',17);
  assert.equal(g.trickUsed,true);
  h.frame(27*16);
  assert.equal(h.$('trickButton').getAttribute('aria-disabled'),'true');
  h.pointer('trickButton','pointerup',17);
  for(let i=27;i<90;i++)h.frame(i*16);
  assert.equal(g.tricks,1);
  assert.ok(g.score>=260);
  assert.match(h.$('statusText').textContent,/360|TRUC/);
 }finally{h.dom.window.close();}
});

test('An authentic dated SnowBike mission records completion only after finishing the chosen course',async()=>{
 const mod=await import('data:text/javascript;base64,'+Buffer.from(
  require('node:fs').readFileSync(require('node:path').join(__dirname,'..','explora','play-progress.js'),'utf8')).toString('base64'));
 const day=mod.localDay(),mission=mod.missionForDay(day);
 if(mission.game!=='snowbike')return; // ZombiePedal has the alternating day.
 const h=setup('https://www.bicipark.com/snowbike-downhill/?challenge='+day+'&course='+mission.course);
 try{
  const g=h.w.__state().game;
  assert.equal(g.course.id,mission.course);
  assert.equal(h.w.localStorage.getItem(mod.DAILY_STORE),null,'opening a challenge is not completion');
  h.$('startButton').click();g.course.animals=[];
  g.distance=g.course.length-.1;g.velocity=44;g.hearts=3;g.time=38;
  h.frame(0);h.frame(50);
  assert.equal(g.phase,'finished');
  const records=JSON.parse(h.w.localStorage.getItem(mod.DAILY_STORE));
  assert.equal(records[day].game,'snowbike');
  assert.ok(records[day].score>=0);
  assert.equal(records[day].time,Number(g.finalTime.toFixed(2)));
  assert.match(h.$('finishSummary').textContent,/REPTE DIARI COMPLETAT/);
 }finally{h.dom.window.close();}
});
