'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {readFileSync}=require('node:fs');
const path=require('node:path');

const dir=path.resolve(__dirname,'..','bike-jump');
const text=file=>readFileSync(path.join(dir,file),'utf8');
const sourceApp=text('app.js');
const modules=Promise.all(['levels.js','physics.js'].map(file=>
  import('data:text/javascript;base64,'+Buffer.from(text(file)).toString('base64'))
));

async function setup(){
  const dom=new JSDOM(text('index.html'),{url:'https://bicipark.com/bike-jump/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  const fakeGradient={addColorStop(){}};
  const ctx=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>fakeGradient;
      if(!Object.hasOwn(target,key))target[key]=()=>{};
      return target[key];
    },
    set(target,key,value){target[key]=value;return true;}
  });
  window.HTMLCanvasElement.prototype.getContext=()=>ctx;
  const callbacks=[];
  window.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};
  window.cancelAnimationFrame=()=>{};
  const [levels,physics]=await modules;
  window.__levels=levels;
  window.__physics=physics;
  // Evaluate only local code after replacing the two known static imports.
  let js=sourceApp.replace(/^\uFEFF?import\s*\{[\s\S]*?\}\s*from\s*"\.\/levels\.js";/,'const {levels}=window.__levels;');
  js=js.replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/physics\.js";/,'const {clamp,getInrunPosition,getLandingY,getLandingAngle,launchBike,integrateFlight,evaluateLanding}=window.__physics;');
  assert.doesNotMatch(js,/\bimport\s*\{/);
  window.eval(js);
  const $=id=>window.document.getElementById(id);
  function pointer(el,type){
    const event=new window.Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'pointerId',{value:1});
    Object.defineProperty(event,'button',{value:0});
    el.dispatchEvent(event);
  }
  function frame(at){
    const callback=callbacks.shift();
    assert.ok(callback,'Expected animation frame');
    callback(at);
  }
  return {window,dom,$,pointer,frame};
}

test('BikeJump v3 renders a game-first accessible stage with mobile action',()=>{
  const html=text('index.html');
  const css=text('styles.css');
  for(const id of ['launchButtonLabel','stageHint','phasePill','modeTapButton','modeHoldButton','controlHelp'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/aria-label="Zona de joc"/);
  assert.match(css,/\.bike-jump-stage-dock/);
  assert.match(css,/\.bike-jump-in-flight \.bike-jump-rotation-controls/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('Default two-tap action never launches on the first touch release',async()=>{
  const h=await setup();
  try{
    const launch=h.$('launchButton');
    assert.equal(h.$('modeTapButton').getAttribute('aria-pressed'),'true');
    assert.match(h.$('launchButtonLabel').textContent,/TOCA PER COMENÇAR/);
    const base=h.window.performance.now();
    h.pointer(launch,'pointerdown');
    assert.match(h.$('phasePill').textContent,/DESCENS/);
    assert.match(h.$('launchButtonLabel').textContent,/TOCA PER SALTAR/);
    h.pointer(launch,'pointerup');
    h.frame(base+350);
    assert.match(h.$('phasePill').textContent,/DESCENS/,
      'Quick release must not immediately launch the bike');
    h.pointer(launch,'pointerdown');
    h.pointer(launch,'pointerup');
    h.frame(base+470);
    assert.match(h.$('phasePill').textContent,/EN VOL/);
    assert.equal(h.window.document.body.classList.contains('bike-jump-in-flight'),true);
    assert.equal(launch.disabled,true);
  }finally{h.dom.window.close();}
});

test('Hold mode remains optional and releasing it launches the bike',async()=>{
  const h=await setup();
  try{
    h.$('modeHoldButton').click();
    assert.equal(h.$('modeHoldButton').getAttribute('aria-pressed'),'true');
    assert.match(h.$('launchButtonLabel').textContent,/MANTÉN/);
    const base=h.window.performance.now();
    h.pointer(h.$('launchButton'),'pointerdown');
    h.frame(base+240);
    assert.match(h.$('phasePill').textContent,/DESCENS/);
    h.pointer(h.$('launchButton'),'pointerup');
    h.frame(base+360);
    assert.match(h.$('phasePill').textContent,/EN VOL/);
    assert.equal(h.$('modeTapButton').disabled,true);
  }finally{h.dom.window.close();}
});

test('A visible timing cue is announced near the ideal takeoff',async()=>{
  const h=await setup();
  try{
    const base=h.window.performance.now();
    h.pointer(h.$('launchButton'),'pointerdown');
    h.frame(base+2570);
    assert.equal(h.window.document.body.classList.contains('bike-jump-in-sweetspot'),true);
    assert.match(h.$('stageHint').textContent,/ARA!/);
    assert.match(h.$('statusText').textContent,/salta ara/i);
    h.pointer(h.$('launchButton'),'pointerdown');
    h.frame(base+2620);
    assert.equal(h.window.document.body.classList.contains('bike-jump-in-sweetspot'),false);
  }finally{h.dom.window.close();}
});

test('Switching control mode is rejected while a run is active',async()=>{
  const h=await setup();
  try{
    h.pointer(h.$('launchButton'),'pointerdown');
    assert.equal(h.$('modeHoldButton').disabled,true);
    h.$('modeHoldButton').click();
    assert.equal(h.$('modeTapButton').getAttribute('aria-pressed'),'true');
  }finally{h.dom.window.close();}
});


function playFullJump(h){
  const start=h.window.performance.now();
  const launch=h.$('launchButton');
  h.pointer(launch,'pointerdown');
  h.frame(start+2490);
  h.pointer(launch,'pointerdown');
  h.frame(start+2530);
  for(let i=1;i<=500;i++){
    if(h.$('phasePill').textContent.includes('RESULTAT'))break;
    h.frame(start+2530+i*32);
  }
  assert.match(h.$('phasePill').textContent,/RESULTAT/,'The physics simulation should reach landing');
  assert.equal(h.$('resultPanel').hidden,false);
}

test('Unlimited practice keeps record and official three-jump score untouched',async()=>{
  const h=await setup();
  try{
    const key='bicipark-bike-jump-high-score-v1';
    assert.equal(h.window.localStorage.getItem(key),null);
    h.$('practiceModeButton').click();
    assert.equal(h.$('practiceModeButton').getAttribute('aria-pressed'),'true');
    assert.equal(h.$('attemptValue').textContent,'1 / ∞');
    assert.equal(h.$('scoreLabel').textContent,'Últim salt');
    assert.match(h.$('gameModeNote').textContent,/ni modifiquen el rècord/);
    playFullJump(h);
    assert.equal(h.$('totalScoreValue').textContent,h.$('jumpScoreResult').textContent);
    assert.match(h.$('nextAttemptButton').textContent,/PRACTICAR/);
    assert.equal(h.window.localStorage.getItem(key),null,'Practice must never persist high scores');
    assert.equal(h.$('highScoreValue').textContent,'0');
    h.$('nextAttemptButton').click();
    assert.equal(h.$('attemptValue').textContent,'2 / ∞');
    playFullJump(h);
    assert.match(h.$('nextAttemptButton').textContent,/PRACTICAR/);
    assert.equal(h.window.localStorage.getItem(key),null);
    h.$('nextAttemptButton').click();
    assert.equal(h.$('attemptValue').textContent,'3 / ∞');
    h.$('restartButton').click();
    assert.equal(h.$('attemptValue').textContent,'1 / ∞','Practice reset should restart practice counter');
    assert.equal(h.$('totalScoreValue').textContent,'0','Reset clears the last practice score');
    assert.equal(h.$('highScoreValue').textContent,'0');
  }finally{h.dom.window.close();}
});

test('Switching out of practice creates a clean three-jump challenge',async()=>{
  const h=await setup();
  try{
    h.$('practiceModeButton').click();
    playFullJump(h);
    h.$('challengeModeButton').click();
    assert.equal(h.$('challengeModeButton').getAttribute('aria-pressed'),'true');
    assert.equal(h.$('attemptValue').textContent,'1 / 3');
    assert.equal(h.$('scoreLabel').textContent,'Punts');
    assert.equal(h.$('totalScoreValue').textContent,'0');
    assert.equal(h.$('resultPanel').hidden,true);
    assert.equal(h.window.document.body.classList.contains('bike-jump-practice-mode'),false);
    playFullJump(h);
    assert.equal(h.$('attemptValue').textContent,'1 / 3');
    assert.equal(h.$('totalScoreValue').textContent,h.$('jumpScoreResult').textContent,
      'Challenge scores, unlike practice scores, count towards the total');
    assert.equal(h.$('nextAttemptButton').textContent,'Següent salt');
    h.$('nextAttemptButton').click();
    assert.equal(h.$('attemptValue').textContent,'2 / 3');
  }finally{h.dom.window.close();}
});

test('Game mode cannot change in mid-flight or during launch',async()=>{
  const h=await setup();
  try{
    h.$('practiceModeButton').click();
    h.pointer(h.$('launchButton'),'pointerdown');
    assert.equal(h.$('challengeModeButton').disabled,true);
    h.$('challengeModeButton').click();
    assert.equal(h.$('practiceModeButton').getAttribute('aria-pressed'),'true');
    h.pointer(h.$('launchButton'),'pointerdown');
    const at=h.window.performance.now();
    h.frame(at+50);
    assert.equal(h.$('challengeModeButton').disabled,true);
    assert.equal(h.$('totalScoreValue').textContent,'0');
  }finally{h.dom.window.close();}
});
