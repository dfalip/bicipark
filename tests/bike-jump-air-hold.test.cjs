'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..','bike-jump');
const url=file=>'data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(dir,file))).toString('base64');
const modules=Promise.all([import(url('physics.js')),import(url('levels.js'))]);
function start(level,p){
  const result=p.launchBike({level,progress:level.idealTakeoffProgress,power:1,wind:0});
  return {x:level.takeoffPoint.x,y:level.takeoffPoint.y,...result,
    flightTime:0,controlEffort:0,airReserve:1,angularVelocity:0};
}
test('Holding a limited air boost produces a noticeably longer, but finite, flight',async()=>{
  const [p,l]=await modules,level=l.levels[0];
  const normal=start(level,p),boosted=start(level,p),dt=1/60;
  for(let i=0;i<100;i++){
    p.integrateFlight({bike:normal,level,deltaSeconds:dt,rotationInput:0,wind:0});
    p.integrateFlight({bike:boosted,level,deltaSeconds:dt,rotationInput:0,wind:0,airHold:true});
  }
  assert.ok(boosted.y < normal.y-35,'Holding makes an unmistakable visual difference in altitude');
  assert.ok(boosted.airReserve<.001,'Reserve exhausts in 1.45 seconds');
  assert.ok(boosted.velocityY<normal.velocityY,'Lift is bounded but physically applied to the trajectory');
  const vy=boosted.velocityY,reserve=boosted.airReserve;
  p.integrateFlight({bike:boosted,level,deltaSeconds:.03,rotationInput:0,wind:0,airHold:true});
  assert.ok(boosted.velocityY>vy,'After reserve is spent, gravity resumes despite continued hold');
  assert.equal(boosted.airReserve,reserve);
});
test('Releasing the mouse or Space conserves the remaining one-use air reserve',async()=>{
  const [p,l]=await modules,level=l.levels[0],bike=start(level,p);
  for(let i=0;i<20;i++)p.integrateFlight({bike,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:true});
  const partial=bike.airReserve;
  assert.ok(partial>.7&&partial<.85);
  for(let i=0;i<45;i++)p.integrateFlight({bike,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:false});
  assert.equal(bike.airReserve,partial,'Air reserve only drains while held');
  for(let i=0;i<90;i++)p.integrateFlight({bike,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:true});
  assert.equal(bike.airReserve,0);
  assert.equal(bike.airHoldActive,false);
});
test('Air reserve consumption is frame-rate independent and disabled input is unchanged',async()=>{
  const [p,l]=await modules,level=l.levels[0];
  const at60=start(level,p),at30=start(level,p),without=start(level,p);
  for(let i=0;i<60;i++)p.integrateFlight({bike:at60,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:true});
  for(let i=0;i<30;i++)p.integrateFlight({bike:at30,level,deltaSeconds:1/30,rotationInput:0,wind:0,airHold:true});
  for(let i=0;i<60;i++)p.integrateFlight({bike:without,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:false});
  assert.ok(Math.abs(at60.airReserve-at30.airReserve)<1e-12);
  assert.ok(Math.abs(at60.velocityY-at30.velocityY)<1e-7);
  assert.equal(without.airReserve,1);
  assert.ok(at60.y<without.y);
});
test('Air energy never replenishes within the same jump, even if input toggles',async()=>{
  const [p,l]=await modules,level=l.levels[0],bike=start(level,p);
  bike.airReserve=.04;
  p.integrateFlight({bike,level,deltaSeconds:.1,rotationInput:0,wind:0,airHold:true});
  assert.equal(bike.airReserve,0);
  p.integrateFlight({bike,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:false});
  p.integrateFlight({bike,level,deltaSeconds:1/60,rotationInput:0,wind:0,airHold:true});
  assert.equal(bike.airReserve,0);
  assert.equal(bike.airHoldActive,false);
});
