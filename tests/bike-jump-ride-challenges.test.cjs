'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..'),dir=path.join(root,'bike-jump-ride');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(dir,'engine.js'))).toString('base64'));
test('Five original ride challenges report live progress without awarding early',async()=>{
  const e=await load(),g=e.makeGame();
  assert.equal(e.CHALLENGES.length,5);
  assert.deepEqual(e.CHALLENGES.map(c=>c.id),['finish','rings','landing','clean','speed']);
  const initial=e.challengeProgress(g);
  assert.equal(initial.length,5);
  assert.ok(initial.every(x=>!x.achieved));
  g.rings.slice(0,3).forEach(r=>{r.collected=true;});
  g.perfectLandings=2;
  g.runTime=20;
  assert.ok(e.challengeProgress(g).every(x=>!x.achieved),'No medals are awarded before the finish');
  g.phase='finish';
  assert.ok(e.challengeProgress(g).every(x=>x.achieved),'All conditions verified on a clean, fast finish');
});
test('Crashes, time and missing rings disqualify only their corresponding medals',async()=>{
  const e=await load(),g=e.makeGame();
  g.phase='finish';g.runTime=42;g.crashes=1;
  g.rings[0].collected=true;g.perfectLandings=1;
  const awarded=e.challengeProgress(g).filter(x=>x.achieved).map(x=>x.id);
  assert.deepEqual(awarded,['finish']);
  assert.match(e.challengeProgress(g).find(x=>x.id==='clean').progress,/1 caigudes/);
  assert.match(e.challengeProgress(g).find(x=>x.id==='rings').progress,/1\/3/);
});
test('Perfect-landing counter increments only for genuinely aligned safe landings',async()=>{
  const e=await load(),g=e.makeGame();e.begin(g);
  const surface=e.trackAt(1070);
  assert.ok(surface);
  g.x=1070;g.y=surface.y-e.WORLD.radius-2;
  g.vx=0;g.vy=160;g.grounded=false;g.airTime=.2;
  g.angle=Math.atan(surface.slope);
  for(let i=0;i<10&&g.landings===0;i++)e.step(g,{},1/120);
  assert.equal(g.landings,1);
  assert.equal(g.perfectLandings,1);
  assert.equal(g.crashes,0);
  assert.match(g.lastEvent,/ATERRATGE PERFECTE/);
});
test('Challenge markup is accessible and offers a real saved medal summary',()=>{
  const html=readFileSync(path.join(dir,'index.html'),'utf8');
  const css=readFileSync(path.join(dir,'styles.css'),'utf8');
  const app=readFileSync(path.join(dir,'app.js'),'utf8');
  for(const id of ['challengeSummary','challengeList','finishChallengeSummary'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/aria-label="Reptes de BikeJump Ride"/);
  assert.match(css,/challenge-list/);
  assert.match(app,/AWARDS_KEY/);
  assert.match(app,/localStorage.setItem\(AWARDS_KEY/);
  for(const name of ['engine.js','app.js'])
    execFileSync(process.execPath,['--check',path.join(dir,name)],{stdio:'pipe'});
});
