'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>readFileSync(path.join(root,file),'utf8');

function canvasSpy(){
 const calls=[];
 const gradient={addColorStop(){}};
 const ctx=new Proxy({},{
  get(o,k){
   if(k==='createLinearGradient')return()=>gradient;
   if(k in o)return o[k];
   return (...args)=>{calls.push([k,...args]);};
  },
  set(o,k,v){o[k]=v;return true;}
 });
 return {ctx,calls};
}
function compiled(source,start,end,args,exportName){
 const begin=source.indexOf(start),finish=source.indexOf(end,begin);
 assert.ok(begin>=0&&finish>begin,'visual routine exists');
 return new Function(...args,source.slice(begin,finish)+'\nreturn '+exportName+';');
}

test('SnowBike carves two animated physical tracks only while on the slope',()=>{
 const src=read('snowbike-downhill/app.js');
 const draw=compiled(src,'function drawSkiGrooves(){','function drawSkiBike(){',
  ['ctx','game','clamp','reducedMotion'],'drawSkiGrooves');
 const {ctx,calls}=canvasSpy();
 const game={phase:'playing',grounded:true,lane:.2,steerVelocity:.7,time:3.2,boostTime:0};
 const fn=draw(ctx,game,(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),false);
 fn();
 assert.ok(calls.filter(x=>x[0]==='lineTo').length>=18);
 assert.ok(calls.filter(x=>x[0]==='ellipse').length>=10);
 const count=calls.length;
 game.grounded=false;fn();
 assert.equal(calls.length,count,'no track trails during a jump');
 assert.match(src,/drawSnow\(\);drawSkiGrooves\(\);drawGates\(\)/);
 assert.match(src,/suspension coils/);
});

test('ZombiePedal renders articulated zombies rather than static rectangular enemies',()=>{
 const src=read('zombiepedal/app.js');
 const make=compiled(src,'function drawObstacle(enemy){','function drawPickups(){',
  ['ctx','game','fx','WORLD','xPos'],'drawObstacle');
 const {ctx,calls}=canvasSpy(),game={time:1.1};
 const draw=make(ctx,game,{clock:1.1},{roadY:437},x=>x);
 draw({id:4,type:'walker',x:360,stunned:false});
 assert.ok(calls.filter(x=>x[0]==='lineTo').length>17);
 assert.ok(calls.filter(x=>x[0]==='ellipse').length>=8);
 const first=JSON.stringify(calls.filter(x=>x[0]==='lineTo'));
 calls.length=0;game.time=1.4;
 draw({id:4,type:'walker',x:360,stunned:false});
 assert.notEqual(JSON.stringify(calls.filter(x=>x[0]==='lineTo')),first,
  'limbs actually change with game time');
 calls.length=0;
 draw({id:9,type:'helmet',x:360,stunned:true});
 assert.ok(calls.some(x=>x[0]==='arc'));
 calls.length=0;
 draw({id:10,type:'barrier',x:360,stunned:false});
 assert.ok(calls.some(x=>x[0]==='strokeRect'),'barrier remains visible');
});

test('Visual revisions preserve valid JavaScript modules',()=>{
 for(const file of ['snowbike-downhill/app.js','zombiepedal/app.js'])
  execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
});