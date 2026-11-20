'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','zombiepedal');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
function setup(){
 const dom=new JSDOM(read('arcade.html'),{url:'https://bicipark.com/zombiepedal/arcade.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,queue=[];
 w.requestAnimationFrame=fn=>{queue.push(fn);return queue.length};
 w.matchMedia=()=>({matches:false});
 const counts={rects:0,images:0};
 w.HTMLCanvasElement.prototype.getContext=function(){
  return new Proxy({canvas:this,fillRect(){counts.rects++},drawImage(){counts.images++}},
   {get(o,k){if(k in o)return o[k];return o[k]=()=>{}},set(o,k,v){o[k]=v;return true}});
 };
 const engine=read('arcade-engine.js').replace(/^export /gm,'');
 w.eval('(function(){'+engine+';window.__arcadeEngine={VIEW,DISTRICTS,DISTRICT_LENGTH,clamp,makeArcade,beginArcade,pauseArcade,moveLane,jumpArcade,shootArcade,turboArcade,stepArcade,achievements};})()');
 const art=read('arcade-art.js').replace(/^import[^;]+;/m,'const {VIEW,DISTRICTS,clamp,DISTRICT_LENGTH}=window.__arcadeEngine;').replace(/^export /gm,'');
 w.eval('(function(){'+art+';window.__arcadeArt={drawArcade,makeEffects,pushEffects,advanceEffects};})()');
 const app=read('arcade-app.js').replace(/^import \{([^}]+)\} from "\.\/arcade-engine\.js";/m,'const {$1}=window.__arcadeEngine;').replace(/^import \{([^}]+)\} from "\.\/arcade-art\.js";/m,'const {$1}=window.__arcadeArt;');
 w.eval(app+';window.__arcade=()=>({g,fx,settings,keys,pointers,seed});');
 const $=id=>w.document.getElementById(id),btn=a=>w.document.querySelector('[data-action="'+a+'"]');
 const frame=t=>{const f=queue.shift();assert.ok(f);f(t)};
 const key=(type,code)=>w.document.dispatchEvent(new w.KeyboardEvent(type,{bubbles:true,cancelable:true,code}));
 return {dom,w,$,btn,frame,key,counts};
}
test('Arcade City renders a populated canvas, starts controls and supports smooth steering and pause',()=>{
 const h=setup();try{
  assert.ok(h.counts.rects>100);assert.ok(h.counts.images>3);
  assert.equal(h.$('overlay').hidden,false);
  h.$('play').click();assert.equal(h.$('overlay').hidden,true);
  h.key('keydown','ArrowUp');h.frame(0);h.frame(80);
  const {g}=h.w.__arcade();assert.equal(g.laneTarget,0);assert.ok(g.lane<1&&g.lane>0);
  h.key('keyup','ArrowUp');h.key('keydown','KeyX');h.frame(160);h.frame(240);
  assert.ok(g.ammo<6);
  h.key('keyup','KeyX');
  h.$('pause').click();const d=g.distance;
  h.frame(400);h.frame(470);assert.equal(g.distance,d);assert.equal(h.$('overlay').hidden,false);
  h.$('play').click();assert.equal(g.phase,'running');
  h.w.dispatchEvent(new h.w.Event('blur'));assert.equal(g.phase,'paused');assert.equal(h.w.__arcade().keys.size,0);
 }finally{h.dom.window.close();}
});
test('Touch-style buttons trigger lane changes and release held fire; exclusive mode-specific record',()=>{
 const h=setup();try{
  h.$('mode').value='endless';h.$('mode').dispatchEvent(new h.w.Event('change'));
  assert.equal(h.w.__arcade().g.mode,'endless');
  h.$('play').click();
  h.btn('down').click();
  assert.equal(h.w.__arcade().g.laneTarget,2);
  const b=h.btn('fire'),event=(type)=>{const ev=new h.w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(ev,'pointerId',{value:9});Object.defineProperty(ev,'button',{value:0});b.dispatchEvent(ev);};
  event('pointerdown');assert.equal(h.w.__arcade().pointers.size,1);event('pointercancel');assert.equal(h.w.__arcade().pointers.size,0);
  const {g}=h.w.__arcade();g.score=1234;g.wave=5;g.phase='lost';
  h.frame(0);assert.equal(h.$('overlay').hidden,false);
  assert.match(h.$('resultStats').textContent,/1234 punts/);
  const saved=JSON.parse(h.w.localStorage.getItem('bicipark-zombiepedal-arcade-v1'));assert.equal(saved.endless,1234);assert.equal(saved.story,0);assert.ok(saved.medals.includes('survive'));
  h.$('mode').value='story';h.$('mode').dispatchEvent(new h.w.Event('change'));
  assert.equal(h.w.__arcade().g.mode,'story');assert.match(h.$('best').textContent,/—/);
 }finally{h.dom.window.close();}
});
