'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','bike-jump-ride');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
function setup(){
  const dom=new JSDOM(read('index.html'),{url:'https://www.bicipark.com/bike-jump-ride/',
    runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, queue=[];
  w.requestAnimationFrame=fn=>{queue.push(fn);return queue.length;};
  const gradient={addColorStop(){}};
  const fakeCtx=new Proxy({},{
    get(obj,k){
      if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>gradient;
      if(k in obj)return obj[k];
      obj[k]=()=>{};return obj[k];
    },set(obj,k,val){obj[k]=val;return true;}
  });
  w.HTMLCanvasElement.prototype.getContext=()=>fakeCtx;
  w.matchMedia=()=>({matches:false});
  const engine=read('engine.js').replace(/^export /gm,'');
  w.eval(engine+'\nwindow.__engine={WORLD,TRACK,CHECKPOINTS,trackAt,makeGame,begin,step,clamp,CHALLENGES,challengeProgress};');
  const app=read('app.js').replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/engine\.js";/,
    'const {WORLD,TRACK,CHECKPOINTS,trackAt,makeGame,begin,step,clamp,CHALLENGES,challengeProgress}=window.__engine;');
  assert.doesNotMatch(app,/\bimport\s*\{/);
  w.eval(app+'\nwindow.__rideForTest=()=>({game,camera,keys,pointers});');
  const $=id=>w.document.getElementById(id);
  const frame=t=>{const f=queue.shift();assert.ok(f);f(t);};
  const key=(type,code)=>w.document.dispatchEvent(new w.KeyboardEvent(type,
    {bubbles:true,cancelable:true,code}));
  const pointer=(id,type,pointerId=5)=>{
    const ev=new w.Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(ev,'button',{value:0});
    Object.defineProperty(ev,'pointerId',{value:pointerId});
    $(id).dispatchEvent(ev);
  };
  return {w,dom,$,frame,key,pointer};
}
test('Ride can start, accelerate and scroll its camera as a continuous game',()=>{
  const h=setup();try{
    assert.equal(h.w.__rideForTest().game.phase,'ready');
    assert.equal(h.$('readyPanel').hidden,false);
    h.$('playButton').click();
    assert.equal(h.w.__rideForTest().game.phase,'riding');
    assert.equal(h.$('readyPanel').hidden,true);
    h.key('keydown','ArrowRight');
    for(let i=0;i<350;i++)h.frame(1000+i*16);
    assert.ok(h.w.__rideForTest().game.x>650);
    assert.ok(h.w.__rideForTest().camera>0);
    assert.ok(Number(h.$('progressLabel').textContent.replace('%',''))>=1);
    h.key('keyup','ArrowRight');
    assert.equal(h.w.__rideForTest().keys.has('ArrowRight'),false);
  }finally{h.dom.window.close();}
});
test('Touch controls press and release; jump charge is visible and resets',()=>{
  const h=setup();try{
    h.$('playButton').click();
    h.pointer('accelerateButton','pointerdown',1);
    h.pointer('jumpButton','pointerdown',2);
    for(let i=0;i<18;i++)h.frame(i*17);
    assert.ok(h.w.__rideForTest().game.charge>.25);
    assert.match(h.$('jumpMeterLabel').textContent,/%/);
    h.pointer('jumpButton','pointerup',2);
    h.frame(400);
    assert.equal(h.w.__rideForTest().game.grounded,false);
    assert.equal(h.w.__rideForTest().game.charge,0);
    h.pointer('accelerateButton','pointerup',1);
    assert.equal(h.w.__rideForTest().pointers.size,0);
  }finally{h.dom.window.close();}
});
test('Restart and blur release held input without losing screen accessibility',()=>{
  const h=setup();try{
    h.$('playButton').click();
    h.pointer('accelerateButton','pointerdown',1);
    h.frame(0);h.frame(100);
    h.w.dispatchEvent(new h.w.Event('blur'));
    assert.equal(h.w.__rideForTest().pointers.size,0);
    h.$('restartButton').click();
    assert.equal(h.w.__rideForTest().game.phase,'ready');
    assert.equal(h.$('readyPanel').hidden,false);
    assert.equal(h.$('finishPanel').hidden,true);
    assert.equal(h.$('scoreValue').textContent,'0');
  }finally{h.dom.window.close();}
});
test('Finishing a route updates the result overlay and never requires a login',()=>{
  const h=setup();try{
    h.$('playButton').click();
    const {game}=h.w.__rideForTest();
    game.x=h.w.__engine.WORLD.finish-1;
    game.y=h.w.__engine.trackAt(game.x).y-22;
    game.vx=100;game.grounded=true;
    h.frame(10);h.frame(55);
    assert.equal(game.phase,'finish');
    assert.equal(h.$('finishPanel').hidden,false);
    assert.match(h.$('finishSummary').textContent,/punts/);
    h.$('playAgainButton').click();
    assert.equal(h.w.__rideForTest().game.phase,'ready');
  }finally{h.dom.window.close();}
});

test('Five course challenges unlock only at the finish and persist after replay',()=>{
  const h=setup();try{
    assert.equal(h.$('challengeList').children.length,5);
    assert.match(h.$('challengeSummary').textContent,/0 \/ 5/);
    h.$('playButton').click();
    let g=h.w.__rideForTest().game;
    g.rings[0].collected=true;
    g.rings[1].collected=true;
    g.rings[2].collected=true;
    g.perfectLandings=2;
    h.frame(0);h.frame(30);
    assert.equal(h.w.localStorage.getItem('bicipark-bike-jump-ride-medals-v1'),null);
    g.x=h.w.__engine.WORLD.finish-1;
    g.y=h.w.__engine.trackAt(g.x).y-22;
    g.vx=100;g.grounded=true;
    h.frame(80);
    assert.equal(g.phase,'finish');
    assert.equal(h.$('finishPanel').hidden,false);
    assert.match(h.$('finishChallengeSummary').textContent,/reptes completats/);
    const medals=JSON.parse(h.w.localStorage.getItem('bicipark-bike-jump-ride-medals-v1'));
    for(const id of ['finish','rings','landing','clean','speed'])
      assert.ok(medals.includes(id),id+' must unlock');
    assert.match(h.$('challengeSummary').textContent,/5 \/ 5/);
    h.$('playAgainButton').click();
    assert.equal(h.w.__rideForTest().game.phase,'ready');
    assert.match(h.$('challengeSummary').textContent,/5 \/ 5/);
  }finally{h.dom.window.close();}
});
test('A crashed run cannot earn the clean-run challenge',()=>{
  const h=setup();try{
    h.$('playButton').click();
    const g=h.w.__rideForTest().game;g.crashes=2;
    g.x=h.w.__engine.WORLD.finish-1;
    g.y=h.w.__engine.trackAt(g.x).y-22;
    g.vx=100;g.grounded=true;
    h.frame(0);h.frame(45);
    assert.equal(g.phase,'finish');
    const medals=JSON.parse(h.w.localStorage.getItem('bicipark-bike-jump-ride-medals-v1'));
    assert.ok(!medals.includes('clean'));
    assert.ok(medals.includes('finish'));
  }finally{h.dom.window.close();}
});
