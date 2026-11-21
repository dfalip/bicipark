'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(read('snowbike-downhill/engine.js')).toString('base64'));
test('Wildlife no longer waits visibly in a row; placement varies with seed and crossing is simulated',async()=>{
 const e=await engine();
 for(let course=0;course<4;course++){
  const g=e.makeGame(course),animals=g.course.animals;
  assert.ok(animals.every(a=>!e.animalVisible(a)));
  const gaps=animals.slice(1).map((a,i)=>a.at-animals[i].at);
  assert.ok(Math.max(...gaps)-Math.min(...gaps)>30);
  assert.ok(gaps.every(x=>x>=40));
  assert.deepEqual(e.makeCourse(course),g.course);
  e.start(g);g.hearts=100;
  let max=0;
  for(let k=0;k<10000&&g.phase==='playing';k++){
   e.step(g,{tuck:true},1/60);
   max=Math.max(max,animals.filter(e.animalVisible).length);
  }
  assert.equal(g.phase,'finished');
  assert.ok(max>=1&&max<=4,'Only local, actively moving encounters can display');
 }
});
test('Alpine camera keeps ground, rider, slalom and collision coordinates coherent',async()=>{
 const e=await engine(),g=e.makeGame();
 const sandbox={window:{}};vm.createContext(sandbox);
 vm.runInContext(read('js/play-freeride-art.js'),sandbox);
 vm.runInContext(read('snowbike-downhill/alpine-scene.js'),sandbox);
 const sc=sandbox.window.SnowBikeAlpine;
 const p=sc.project(g,g.distance,0);
 assert.ok(sc.project(g,g.distance+100,0).x>p.x+200);
 assert.ok(sc.project(g,g.distance,1).y>p.y+60);
 assert.ok(sc.project(g,g.distance,-1).y<p.y-60);
 for(const a of g.course.animals)assert.equal(sc.animalVisible(a),e.animalVisible(a));
 let n=0,depth=0;
 const grad={addColorStop(){}};
 const fake=new Proxy({canvas:null,createLinearGradient:()=>grad,createRadialGradient:()=>grad,save(){depth++},restore(){depth--},fill(){n++},fillRect(){n++}},{
  get(t,k){return k in t?t[k]:(t[k]=()=>{});},set(t,k,v){t[k]=v;return true;}
 });
 const a=g.course.animals[0];a.phase='crossing';a.seen=true;a.x=.15;g.distance=a.at-36;e.start(g);
 assert.equal(sc.animalVisible(a),true);sc.draw(fake,g,{});assert.ok(n>300);assert.equal(depth,0);
 g.airHeight=.8;g.grounded=false;sc.draw(fake,g,{reduced:true});assert.equal(depth,0);
});

test('Species have different locomotion and longitudinal movement; exited wildlife never re-enters the track',async()=>{
 const e=await engine();
 const profiles=['Conill','Guineu','Cérvol','Cabra','Ieti'].map(label=>e.wildlifePace({label,age:1,stride:0}));
 assert.equal(new Set(profiles.map(x=>x.cycle)).size,5);
 assert.ok(profiles[1].along>profiles[2].along&&profiles[3].along<0);
 const g=e.makeGame();e.start(g);g.hearts=100;
 const a=g.course.animals[0];g.course.gates=[];g.course.animals=[a];
 g.distance=a.at-100;
 const at=a.at;
 for(let k=0;k<120;k++)e.step(g,{brake:true},1/120);
 assert.ok(a.travel>0);assert.notEqual(a.at,at);
 assert.ok(Math.abs(a.at-a.originAt)<=19);
 g.lane=a.x;g.distance=a.at-30;
 e.step(g,{brake:true},.1);assert.ok(a.alert>0);
 for(let k=0;k<1200&&!a.passed;k++)e.step(g,{brake:true},1/120);
 assert.ok(a.passed||a.phase==='exited');assert.equal(e.animalVisible(a),false);
 const v=a.x;e.step(g,{},.12);assert.equal(a.x,v);
});
test('Downhill changes target pace without unbounded acceleration',async()=>{
 const e=await engine();
 const factors=Array.from({length:150},(_,i)=>e.terrainPace(i*20,0));
 assert.ok(Math.max(...factors)>1.07&&Math.min(...factors)<.94);
 assert.ok(factors.every(x=>x>=.89&&x<=1.11));
});
