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
