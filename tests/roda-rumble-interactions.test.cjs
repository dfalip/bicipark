'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..','roda-rumble');
const read=name=>readFileSync(path.join(root,name),'utf8');
function createHarness(){
  const dom=new JSDOM(read('index.html'),{
    url:'https://www.bicipark.com/roda-rumble/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window;
  const callbacks=[];
  w.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({},{get(target,key){
    if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>gradient;
    if(key in target)return target[key];
    target[key]=()=>{};return target[key];
  },set(target,key,v){target[key]=v;return true;}});
  w.HTMLCanvasElement.prototype.getContext=()=>ctx;
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:560,
    right:1000,bottom:560});
  const rawEngine=read('engine.js').replace(/^export /gm,'');
  w.eval(rawEngine+'\nwindow.__engine={WORLD,LEVELS,newGame,setAim,aimFromPointer,fire,turbo,step,nextShot,aliveTargets,starsFor,clamp,SHOT_TYPES,upcomingShot,predictShot};');
  let app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,
    'const {WORLD,LEVELS,newGame,setAim,aimFromPointer,fire,turbo,step,nextShot,aliveTargets,starsFor,clamp,SHOT_TYPES,upcomingShot,predictShot}=window.__engine;');
  assert.doesNotMatch(app,/\bimport\s*\{/);
  w.eval(app+'\nwindow.__gameForTest=()=>game;');
  const $=id=>w.document.getElementById(id);
  const pointer=(id,type,x,y)=>{
    const ev=new w.Event(type,{bubbles:true,cancelable:true});
    for(const [key,value] of Object.entries({button:0,pointerId:id,clientX:x,clientY:y})){
      Object.defineProperty(ev,key,{value});
    }
    $('gameCanvas').dispatchEvent(ev);
  };
  const frame=now=>{const cb=callbacks.shift();assert.ok(cb,'Expected a new frame');cb(now);};
  return {dom,w,$,frame,pointer};
}
test('Accessible arcade initializes with level, score, target count and ready state',()=>{
  const h=createHarness();
  try{
    assert.equal(h.$('shotsValue').textContent,'4');
    assert.equal(h.$('targetsValue').textContent,'2');
    assert.equal(h.$('levelSelect').options.length,6);
    assert.equal(h.$('fireButton').disabled,false);
    assert.equal(h.$('turboButton').disabled,true);
    assert.equal(h.$('resultPanel').hidden,true);
    assert.equal(h.$('nextButton').hidden,true);
    assert.equal(h.w.__gameForTest().phase,'aim');
  }finally{h.dom.window.close();}
});
test('Drag and release aims then fires on desktop and touch pointer semantics',()=>{
  const h=createHarness();
  try{
    h.pointer(7,'pointerdown',140,399);
    h.pointer(7,'pointermove',60,459);
    assert.ok(Number(h.$('angleValue').textContent.replace('°',''))>35);
    h.pointer(7,'pointerup',60,459);
    assert.equal(h.w.__gameForTest().phase,'flying');
    assert.equal(h.$('shotsValue').textContent,'3');
    assert.equal(h.$('fireButton').disabled,true);
    assert.equal(h.$('turboButton').disabled,false);
    h.$('turboButton').click();
    assert.equal(h.w.__gameForTest().projectile.turbo,true,'Turbo must respond immediately to the player');
    h.frame(16);h.frame(180);
    assert.equal(h.w.__gameForTest().projectile.turbo,true);
  }finally{h.dom.window.close();}
});
test('Slider, fire button and level selector offer a complete non-drag alternative',()=>{
  const h=createHarness();
  try{
    h.$('levelSelect').value='2';
    h.$('levelSelect').dispatchEvent(new h.w.Event('change',{bubbles:true}));
    assert.equal(h.w.__gameForTest().levelIndex,2);
    assert.match(h.$('levelSubtitle').textContent,/bidons/);
    h.$('angleInput').value='60';
    h.$('angleInput').dispatchEvent(new h.w.Event('input',{bubbles:true}));
    h.$('powerInput').value='90';
    h.$('powerInput').dispatchEvent(new h.w.Event('input',{bubbles:true}));
    assert.equal(h.w.__gameForTest().angle,60);
    assert.equal(h.w.__gameForTest().power,90);
    h.$('fireButton').click();
    assert.equal(h.w.__gameForTest().phase,'flying');
    h.$('retryButton').click();
    assert.equal(h.w.__gameForTest().phase,'aim');
    assert.equal(h.$('shotsValue').textContent,'4');
    assert.equal(h.$('fireButton').disabled,false);
  }finally{h.dom.window.close();}
});
test('Pointer cancel is safe and never fires a shot',()=>{
  const h=createHarness();
  try{
    h.pointer(13,'pointerdown',150,388);
    h.pointer(13,'pointermove',60,466);
    h.pointer(13,'pointercancel',60,466);
    assert.equal(h.w.__gameForTest().phase,'aim');
    assert.equal(h.$('shotsValue').textContent,'4');
  }finally{h.dom.window.close();}
});
test('UI is playable without persistent storage (private browsing / blocked cookies)',()=>{
  const h=createHarness();
  try{
    Object.defineProperty(h.w,'localStorage',{
      configurable:true,get(){throw new Error('SecurityError');}
    });
    h.$('retryButton').click();
    assert.equal(h.$('bestValue').textContent,'0');
    h.$('fireButton').click();
    h.frame(16);h.frame(32);
    assert.equal(h.w.__gameForTest().phase,'flying');
  }finally{h.dom.window.close();}
});

test('Tactical HUD follows shot type and the correct skill without repeating',()=>{
  const h=createHarness();
  try{
    assert.equal(h.$('wheelName').textContent,'RODA MARTELL');
    assert.equal(h.$('levelSelect').options.length,6);
    assert.equal(h.$('trajectoryHint').hidden,false);
    h.$('fireButton').click();
    assert.equal(h.$('wheelName').textContent,'RODA MARTELL');
    assert.equal(h.$('trajectoryHint').hidden,true);
    assert.equal(h.$('turboButton').textContent.trim(),'● TURBO MARTELL');
    h.$('turboButton').click();
    assert.equal(h.$('turboButton').disabled,true);
    const g=h.w.__gameForTest();
    g.phase='between';
    h.$('nextButton').click();
    assert.equal(g.phase,'aim');
    assert.equal(h.$('wheelName').textContent,'RODA POLS');
    assert.equal(h.$('wheelIcon').textContent,'✦');
    assert.match(h.$('wheelHelp').textContent,/expansiva/);
    assert.equal(h.$('trajectoryHint').hidden,false);
    h.$('fireButton').click();
    assert.equal(h.$('turboButton').textContent.trim(),'✦ ONA EXPANSIVA');
  }finally{h.dom.window.close();}
});

test('Optional procedural sound can be toggled without needing AudioContext or networking',()=>{
  const h=createHarness();
  try{
    assert.equal(h.$('soundToggle').getAttribute('aria-pressed'),'false');
    h.$('soundToggle').click();
    assert.equal(h.$('soundToggle').getAttribute('aria-pressed'),'true');
    assert.match(h.$('soundToggle').textContent,/ACTIVAT/);
    h.$('fireButton').click();
    assert.equal(h.w.__gameForTest().phase,'flying');
    h.$('soundToggle').click();
    assert.equal(h.$('soundToggle').getAttribute('aria-pressed'),'false');
  }finally{h.dom.window.close();}
});
