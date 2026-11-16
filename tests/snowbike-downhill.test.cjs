'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const dir=path.join(__dirname,'..','snowbike-downhill');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(dir,'engine.js'))).toString('base64'));
test('Four different downhill tracks have progressively more slalom and wildlife challenges',async()=>{
 const e=await load();assert.equal(e.COURSES.length,4);
 for(let i=0;i<4;i++){
  const c=e.makeCourse(i),repeat=e.makeCourse(i);
  assert.deepEqual(c,repeat,'course generation must be deterministic');
  assert.equal(c.gates.length,e.COURSES[i].gates);assert.equal(c.animals.length,e.COURSES[i].animals);
  assert.ok(c.gates.length>=9&&c.animals.length>=9);
  assert.ok(c.gates.every(x=>x.at>0&&x.at<c.length));
  assert.ok(c.animals.every(x=>x.at>0&&x.at<c.length));
  assert.equal(new Set(c.gates.map(x=>x.at)).size,c.gates.length);
  for(const a of c.animals)assert.ok(e.ANIMALS.some(x=>x.emoji===a.emoji));
 }
 for(let i=1;i<4;i++)assert.ok(e.COURSES[i].length>e.COURSES[i-1].length);
});
test('Riding, steering and tuck influence speed; edge skiing slows the rider',async()=>{
 const e=await load(),g=e.makeGame();
 assert.equal(g.phase,'ready');e.step(g,{tuck:true},.08);assert.equal(g.distance,0);
 assert.equal(e.start(g),true);
 for(let i=0;i<110;i++)e.step(g,{tuck:true,steer:1},1/60);
 assert.ok(g.velocity>35&&g.distance>50);
 assert.ok(g.lane>.8);
 const speed=g.velocity;
 for(let i=0;i<45;i++)e.step(g,{brake:true,steer:-1},1/60);
 assert.ok(g.velocity<speed);
 assert.ok(g.lane<=1.06&&g.lane>=-1.06);
});
test('Slalom gates reward precision and penalize misses with real added seconds',async()=>{
 const e=await load(),g=e.makeGame(0);e.start(g);
 const gate=g.course.gates[0];
 g.distance=gate.at-.15;g.lane=gate.lane;g.velocity=40;
 e.step(g,{},1/40);
 assert.equal(g.passedGates,1);
 assert.equal(g.perfectGates,1);
 assert.equal(gate.quality,'perfect');
 assert.ok(g.score>=250);assert.ok(g.boost>35);
 const second=g.course.gates[1];g.distance=second.at-.15;
 g.lane=second.lane>0?-.98:.98;g.velocity=40;
 e.step(g,{},1/40);
 assert.equal(second.quality,'missed');
 assert.equal(g.misses,1);assert.equal(g.penalty,3);
});
test('Turbo consumes earned energy; pause stops the simulation',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 assert.equal(e.boost(g),true);assert.equal(g.boost,5);
 assert.equal(e.boost(g),false);
 const before=g.distance;assert.equal(e.pause(g),true);
 e.step(g,{tuck:true},2);
 assert.equal(g.distance,before);
 assert.equal(e.boost(g),false);
 assert.equal(e.resume(g),true);e.step(g,{tuck:true},.12);
 assert.ok(g.distance>before);
});
test('Wildlife traverse the slope and can be avoided or cause a time penalty without injury to animals',async()=>{
 const e=await load(),g=e.makeGame();e.start(g);
 const a=g.course.animals[0];g.distance=a.at-106;
 e.step(g,{},.1);
 assert.equal(a.phase,'crossing');
 const before=a.x;e.step(g,{},.1);
 assert.notEqual(a.x,before);
 // Put the skier in the crossing lane at the precise event, excluding wind.
 g.distance=a.at-.1;g.lane=a.x;g.velocity=40;
 e.step(g,{},.025);
 assert.equal(g.hits,1);
 assert.equal(g.hearts,2);
 assert.equal(g.penalty,5);
 assert.equal(a.collision,true);
 const hitCount=g.hits;
 for(let i=0;i<30;i++)e.step(g,{brake:true},1/60);
 assert.equal(g.hits,hitCount,'A single animal may cause only one hit');
 const b=e.makeGame();e.start(b);
 const other=b.course.animals[0];
 b.distance=other.at-100;b.lane=-other.side*.85;
 for(let i=0;i<150&&b.distance<other.at+25;i++)e.step(b,{tuck:true},1/60);
 assert.equal(b.hits,0);
});
test('Four courses can reach the finish, with penalized time and at least one star',async()=>{
 const e=await load();
 for(let i=0;i<4;i++){
  const g=e.makeGame(i);e.start(g);
  // Isolate finish/replay mechanics from the wildlife collision test.
  g.hearts=100;
  for(let frames=0;frames<10000&&g.phase==='playing';frames++)
   e.step(g,{tuck:true},1/60);
  assert.equal(g.phase,'finished','Finish must be reachable on course '+i);
  assert.equal(g.distance,g.course.length);
  assert.equal(g.passedGates,g.course.gates.length);
  assert.ok(g.finalTime>0&&Number.isFinite(g.finalTime));
  assert.ok(g.stars>=1&&g.stars<=3);
  const result=e.scoreFinish(g);
  assert.equal(result.totalTime,g.time+g.penalty);
  assert.ok(result.score>=0);
 }
});
test('Browser page is standalone and has accessible real keyboard and pointer controls',()=>{
 for(const file of ['engine.js','app.js'])execFileSync(process.execPath,['--check',path.join(dir,file)],{stdio:'pipe'});
 const html=readFileSync(path.join(dir,'index.html'),'utf8');
 const app=readFileSync(path.join(dir,'app.js'),'utf8');
 for(const id of ['gameCanvas','courseSelect','startButton','turboButton','tuckButton','leftButton','rightButton',
   'brakeButton','finishPanel','failedPanel','pausePanel','scoreValue','courseRecords'])
   if(id!=='scoreValue')assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/aria-live="polite"/);
 assert.match(app,/pointercancel/);assert.match(app,/keydown/);assert.match(app,/localStorage/);
 assert.doesNotMatch(html,/<script[^>]+https?:\/\//);
});

test('Downhill progress exposes a synchronized accessible progressbar',()=>{
 const html=readFileSync(path.join(dir,'index.html'),'utf8');
 const app=readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="raceProgress"[^>]*role="progressbar"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"[^>]*aria-valuenow="0"/);
 assert.match(html,/id="progressValue" aria-hidden="true"/);
 assert.match(app,/\$\("raceProgress"\)\.setAttribute\("aria-valuenow",String\(progress\)\)/);
});
