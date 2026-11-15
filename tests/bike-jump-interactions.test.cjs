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

async function setup({storageDenied=false,initialRecord=null}={}){
  const dom=new JSDOM(text('index.html'),{url:'https://bicipark.com/bike-jump/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  if(storageDenied){
    Object.defineProperty(window,'localStorage',{
      configurable:true,get(){throw new Error('SecurityError: storage disabled');}
    });
  }else if(initialRecord!==null){
    window.localStorage.setItem('bicipark-bike-jump-high-score-v1',String(initialRecord));
  }
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
  // Browser ESM has native imports; the jsdom fixture executes the equivalent
  // local modules without network or a bundler.
  let cinema=text('cinematics.js')
    .replace(/import\s*\{[^}]*\}\s*from\s*"\.\/physics\.js";/,
      'const {clamp,getLandingY,normalizeAngle}=window.__physics;')
    .replace(/^export /gm,'');
  assert.doesNotMatch(cinema,/\bimport\s*\{/);
  window.eval(cinema+'\nwindow.__cinematics={landingStory,landingPose,flightReadout,cinematicCamera,easeCamera};');
  // Evaluate only local code after replacing the three known static imports.
  let js=sourceApp.replace(/^\uFEFF?import\s*\{[\s\S]*?\}\s*from\s*"\.\/levels\.js";/,'const {levels}=window.__levels;');
  js=js.replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/physics\.js";/,'const {clamp,getInrunPosition,getLandingY,getLandingAngle,launchBike,integrateFlight,evaluateLanding}=window.__physics;');
  js=js.replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/cinematics\.js";/,
    'const {landingStory,landingPose,flightReadout,cinematicCamera,easeCamera}=window.__cinematics;');
  assert.doesNotMatch(js,/\bimport\s*\{/);
  // Test-only accessor appended to the same evaluated module scope.
  window.eval(js + '\nwindow.__rotationInputForTest=()=>state.rotationInput;window.__bikeForTest=()=>state.bike;window.__phaseForTest=()=>state.phase;window.__impactForTest=()=>state.impact;');
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


function intoFlight(h){
  const start=h.window.performance.now();
  h.pointer(h.$('launchButton'),'pointerdown');
  h.frame(start+2350);
  h.pointer(h.$('launchButton'),'pointerdown');
  h.frame(start+2400);
  assert.match(h.$('phasePill').textContent,/EN VOL/);
}
function dispatchKey(h,code,type='keydown',target=h.window.document){
  target.dispatchEvent(new h.window.KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
}
function dispatchPointer(h,element,type,id){
  const ev=new h.window.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(ev,'pointerId',{value:id});
  Object.defineProperty(ev,'button',{value:0});
  element.dispatchEvent(ev);
}

test('Releasing one arrow preserves the remaining held rotation input',async()=>{
  const h=await setup();
  try{
    intoFlight(h);
    const input=h.window.__rotationInputForTest;
    dispatchKey(h,'ArrowLeft');
    assert.equal(input(),-1);
    dispatchKey(h,'ArrowRight');
    assert.equal(input(),0,'Opposite arrows held at the same time cancel neutrally');
    dispatchKey(h,'ArrowRight','keyup');
    assert.equal(input(),-1,'Left should still rotate when right is released');
    dispatchKey(h,'ArrowLeft','keyup');
    assert.equal(input(),0);
  }finally{h.dom.window.close();}
});

test('Touch and keyboard controls can overlap without sticking or cancelling one another',async()=>{
  const h=await setup();
  try{
    intoFlight(h);
    const input=h.window.__rotationInputForTest;
    const left=h.$('rotateLeftButton'),right=h.$('rotateRightButton');
    dispatchPointer(h,left,'pointerdown',41);
    assert.equal(input(),-1);
    dispatchPointer(h,right,'pointerdown',42);
    assert.equal(input(),0);
    dispatchPointer(h,left,'pointerup',41);
    assert.equal(input(),1,'Releasing one finger preserves the other direction');
    dispatchKey(h,'ArrowLeft');
    assert.equal(input(),0);
    dispatchPointer(h,right,'pointercancel',42);
    assert.equal(input(),-1,'Pointer cancel must not clear held keyboard input');
    h.window.dispatchEvent(new h.window.Event('blur'));
    assert.equal(input(),0,'Loss of focus clears every input');
    dispatchKey(h,'ArrowLeft','keyup');
    assert.equal(input(),0);
  }finally{h.dom.window.close();}
});

test('Space/Enter on focused steering buttons and blur are balanced',async()=>{
  const h=await setup();
  try{
    intoFlight(h);
    const input=h.window.__rotationInputForTest;
    const button=h.$('rotateRightButton');
    dispatchKey(h,'Space','keydown',button);
    assert.equal(input(),1);
    button.dispatchEvent(new h.window.Event('blur'));
    assert.equal(input(),0);
    dispatchKey(h,'Enter','keydown',button);
    assert.equal(input(),1);
    dispatchKey(h,'Enter','keyup',button);
    assert.equal(input(),0);
  }finally{h.dom.window.close();}
});


test('Canvas presents a meaningful accessible alternative without hiding game controls',()=>{
  const html=text('index.html');
  const m=html.match(/<canvas\b([^>]*)>([\s\S]*?)<\/canvas>/i);
  assert.ok(m,'Accessible canvas exists');
  assert.match(m[1],/role="img"/);
  assert.match(m[1],/aria-label="[^"]+"/);
  assert.match(m[1],/aria-describedby="statusText controlHelp"/);
  assert.match(m[2],/Utilitza el botó/);
  assert.match(html,/id="statusText" aria-live="polite"/);
  assert.match(html,/id="controlHelp"/);
  assert.match(html,/id="resultPanel"/);
});

test('Scores remain playable and visible when browser storage throws on every access',async()=>{
  const h=await setup({storageDenied:true});
  try{
    assert.equal(h.$('highScoreValue').textContent,'0');
    playFullJump(h);
    assert.equal(h.$('resultPanel').hidden,false);
    assert.equal(h.$('highScoreValue').textContent,h.$('totalScoreValue').textContent);
    h.$('nextAttemptButton').click();
    assert.equal(h.$('attemptValue').textContent,'2 / 3');
    h.$('restartButton').click();
    assert.equal(h.$('attemptValue').textContent,'1 / 3');
  }finally{h.dom.window.close();}
});

test('Invalid saved records do not corrupt displayed scores',async()=>{
  for(const value of ['NaN','-5','Infinity']){
    const h=await setup({initialRecord:value});
    try{
      assert.equal(h.$('highScoreValue').textContent,'0');
    }finally{h.dom.window.close();}
  }
  const valid=await setup({initialRecord:'777'});
  try{
    assert.equal(valid.$('highScoreValue').textContent,'777');
    valid.$('practiceModeButton').click();
    playFullJump(valid);
    assert.equal(valid.$('highScoreValue').textContent,'777',
      'Practice never overwrites an existing valid record');
    assert.equal(valid.window.localStorage.getItem('bicipark-bike-jump-high-score-v1'),'777');
  }finally{valid.dom.window.close();}
});


test('Course picker loads three genuinely distinct scenes and preserves per-course records',async()=>{
  const h=await setup({initialRecord:'777'});
  try{
    const picker=h.$('courseSelect');
    assert.equal(picker.options.length,3);
    assert.equal(picker.value,'alpine-k90');
    assert.equal(h.$('highScoreValue').textContent,'777');
    picker.value='city-skyline';
    picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.match(h.$('courseTag').textContent,/CITY RUN/);
    assert.match(h.$('courseHint').textContent,/precís/);
    assert.equal(h.$('highScoreValue').textContent,'0');
    assert.equal(h.$('attemptValue').textContent,'1 / 3');
    playFullJump(h);
    const cityScore=h.$('jumpScoreResult').textContent;
    assert.equal(h.$('totalScoreValue').textContent,cityScore);
    assert.equal(h.window.localStorage.getItem('bicipark-bike-jump-high-score-v1'),'777',
      'City records may never overwrite the original alpine high score');
    picker.value='red-canyon';
    picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.equal(h.$('resultPanel').hidden,true);
    assert.match(h.$('courseTag').textContent,/CANYON RUN/);
    assert.match(h.$('courseHint').textContent,/vent variable/);
    assert.equal(h.$('highScoreValue').textContent,'0');
    playFullJump(h);
    picker.value='alpine-k90';
    picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.equal(h.$('highScoreValue').textContent,'777');
    assert.equal(h.$('attemptValue').textContent,'1 / 3');
  }finally{h.dom.window.close();}
});

test('Course switching is disabled while starting or flying',async()=>{
  const h=await setup();
  try{
    const picker=h.$('courseSelect');
    const start=h.window.performance.now();
    h.pointer(h.$('launchButton'),'pointerdown');
    assert.equal(picker.disabled,true);
    picker.value='city-skyline';
    picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.equal(picker.value,'alpine-k90');
    h.frame(start+2350);
    h.pointer(h.$('launchButton'),'pointerdown');
    h.frame(start+2400);
    assert.match(h.$('phasePill').textContent,/EN VOL/);
    assert.equal(picker.disabled,true);
    picker.value='red-canyon';
    picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
    assert.equal(picker.value,'alpine-k90');
  }finally{h.dom.window.close();}
});

test('All three course definitions have valid geometry and distinct flight physics',async()=>{
  const [levelsModule, physics]=await modules;
  const {levels}=levelsModule;
  assert.deepEqual(levels.map(x=>x.id),['alpine-k90','city-skyline','red-canyon']);
  assert.equal(new Set(levels.map(x=>x.theme)).size,3);
  assert.equal(new Set(levels.map(x=>x.gravity)).size,3);
  for(const level of levels){
    assert.ok(level.takeoffPoint.x>level.startPoint.x);
    assert.ok(level.landingStartX>level.takeoffPoint.x);
    assert.ok(level.inrunDurationSeconds>2);
    const launch=physics.launchBike({level,progress:level.idealTakeoffProgress,power:1,wind:0});
    assert.ok(launch.velocityX>0);
    assert.ok(launch.velocityY<0);
    assert.ok(physics.getLandingY(level,level.landingStartX)>level.takeoffPoint.y);
    const flight={...level.takeoffPoint,...launch,angularVelocity:0,
      controlEffort:0,flightTime:0};
    assert.ok(Number.isFinite(flight.x)&&Number.isFinite(flight.y));
    for(let i=0;i<30;i++)physics.integrateFlight({bike:flight,level,deltaSeconds:1/60,rotationInput:0,wind:0});
    assert.ok(Number.isFinite(flight.x)&&Number.isFinite(flight.y));
  }
});
