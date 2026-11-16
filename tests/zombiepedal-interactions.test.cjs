'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','zombiepedal');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
function setup(){
 const dom=new JSDOM(read('index.html'),{url:'https://www.bicipark.com/zombiepedal/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frames=[];
 const grad={addColorStop(){}};
 const ctx=new Proxy({},{get(o,k){if(k==='createLinearGradient')return ()=>grad;if(k in o)return o[k];o[k]=()=>{};return o[k];},set(o,k,v){o[k]=v;return true;}});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 w.eval(read('engine.js').replace(/^export /gm,'')+'\nwindow.__engine={WORLD,ZONES,clamp,makeGame,start,togglePause,jump,fire,step};');
 const app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,'const {WORLD,ZONES,clamp,makeGame,start,togglePause,jump,fire,step}=window.__engine;');
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
