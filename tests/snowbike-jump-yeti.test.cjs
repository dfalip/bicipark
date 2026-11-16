'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const base=path.join(root,'snowbike-downhill');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(read('engine.js')).toString('base64'));

test('Each of the four deterministic alpine courses includes a rare illustrated yeti',async()=>{
 const e=await load();
 assert.ok(e.ANIMALS.some(x=>x.kind==='yeti'&&x.label==='Ieti'));
 for(let i=0;i<4;i++){
  const course=e.makeCourse(i);
  const yetis=course.animals.filter(x=>x.kind==='yeti');
  assert.equal(yetis.length,i<2?1:2);
  assert.ok(yetis.every(x=>x.radius>.25&&x.speed>0&&x.label==='Ieti'));
  assert.deepEqual(course,e.makeCourse(i),'Seeded hazards must be stable');
 }
});

test('Jump is a physical arc with a single take-off, a clear landing and no double-jump',async()=>{
 const e=await load(),g=e.makeGame(0);
 assert.equal(e.jump(g),false,'Not before race begins');
 e.start(g);g.course.animals=[];g.course.gates=[];
 assert.equal(e.jump(g),true);
 assert.equal(e.jump(g),false,'No double jump');
 const snapshots=[];
 for(let i=0;i<160;i++){
  e.step(g,{},1/120);
  snapshots.push(g.airHeight);
 }
 assert.ok(Math.max(...snapshots)>.67);
 assert.equal(g.grounded,true);
 assert.equal(g.airHeight,0);
 assert.ok(g.jumpCooldown===0);
 assert.equal(g.jumps,1);
 assert.ok(g.events.some(x=>x.type==='jump'));
 assert.ok(g.events.some(x=>x.type==='land'));
 assert.equal(e.jump(g),true,'May jump again after recovery');
});

test('A well-timed ski jump clears a crossing animal, giving a visible bonus and no hit',async()=>{
 const e=await load(),g=e.makeGame(0),a=g.course.animals.find(x=>x.kind!=='yeti');
 g.course.animals=[a];g.course.gates=[];
 e.start(g);assert.equal(e.jump(g),true);
 // Allow enough air time to clear, while keeping the obstacle ahead.
 g.distance=0;
 for(let i=0;i<41;i++)e.step(g,{tuck:true},1/120);
 assert.ok(g.airHeight>.6);
 a.phase='crossing';a.side=1;a.x=0;a.progress=1.38;
 g.distance=a.at-1;g.lane=0;g.velocity=60;
 e.step(g,{},.035);
 assert.equal(g.hits,0);
 assert.equal(g.hearts,3);
 assert.equal(g.jumpDodges,1);
 assert.equal(a.jumped,true);
 assert.ok(g.score>=130);
 assert.ok(g.events.some(x=>x.type==='jump-dodge'&&x.points===130));
});

test('Yeti requires a higher jump; a successful aerial dodge earns 250 extra points',async()=>{
 const e=await load(),g=e.makeGame(0),a=g.course.animals.find(x=>x.kind==='yeti');
 assert.ok(a);
 g.course.animals=[a];g.course.gates=[];
 e.start(g);e.jump(g);
 for(let i=0;i<41;i++)e.step(g,{},1/120);
 a.phase='crossing';a.side=1;a.x=0;a.progress=1.38;
 g.distance=a.at-1;g.lane=0;g.velocity=65;
 e.step(g,{},.033);
 assert.equal(g.hits,0);
 assert.equal(g.jumpDodges,1);
 assert.equal(a.jumped,true);
 assert.ok(g.events.some(x=>x.type==='jump-dodge'&&x.kind==='yeti'&&x.points===250));
 assert.ok(g.score>=250);
});

test('Jumping too late in front of a yeti still produces a collision and penalty',async()=>{
 const e=await load(),g=e.makeGame(0),a=g.course.animals.find(x=>x.kind==='yeti');
 g.course.animals=[a];g.course.gates=[];
 e.start(g);e.jump(g);
 a.phase='crossing';a.side=1;a.x=0;a.progress=1.38;
 g.distance=a.at-1;g.lane=0;g.velocity=55;
 e.step(g,{},.025);
 assert.ok(g.airHeight<.57);
 assert.equal(g.hits,1);
 assert.equal(g.hearts,2);
 assert.equal(g.penalty,5);
 assert.ok(g.events.some(x=>x.type==='animal-hit'&&x.kind==='yeti'));
 assert.equal(e.jump(g),false,'Crash recovery blocks jumping');
});

test('Pause and finish remain valid without double-counted wildlife dodges',async()=>{
 const e=await load(),g=e.makeGame(0),a=g.course.animals.find(x=>x.kind==='yeti');
 g.course.animals=[a];g.course.gates=[];
 e.start(g);e.jump(g);
 const altitude=g.airHeight;
 e.pause(g);e.step(g,{},2);assert.equal(g.airHeight,altitude);
 assert.equal(e.jump(g),false);
 e.resume(g);
 for(let i=0;i<42;i++)e.step(g,{},1/120);
 a.phase='crossing';a.side=1;a.x=0;a.progress=1.38;
 g.distance=a.at-1;g.lane=0;g.velocity=70;
 e.step(g,{},.03);
 assert.equal(g.jumpDodges,1);
 g.distance=a.at+22; e.step(g,{},.03);
 assert.equal(g.animalsDodged,1);
 assert.equal(g.jumpDodges,1,'A jumped yeti has one aerial bonus and one normal dodge');
});

test('UI shows Yeti illustration, accessibility labels, jump key and coherent tactile controls',()=>{
 const html=read('index.html'),app=read('app.js'),css=read('styles.css');
 assert.match(html,/id="jumpButton"/);
 assert.match(html,/ESPAI saltar/);
 assert.match(html,/Ieti|ietis/);
 assert.match(app,/function drawYeti\(/);
 assert.match(app,/game\.airHeight\*145/);
 assert.match(app,/jump\(game\)/);
 assert.match(app,/event\.type==="jump-dodge"/);
 assert.match(css,/\.control\.jump/);
 for(const name of ['engine.js','app.js'])
  execFileSync(process.execPath,['--check',path.join(base,name)],{stdio:'pipe'});
});
