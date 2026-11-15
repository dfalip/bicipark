'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'..','bike-jump');
const read=p=>readFileSync(path.join(dir,p),'utf8').replace(/^\uFEFF/,'');
const code=read('physics.js')+'\n'+read('cinematics.js').replace(
  /import\s*\{[^}]*\}\s*from\s*"\.\/physics\.js";/,'');
const m=import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const course=import('data:text/javascript;base64,'+Buffer.from(read('levels.js')).toString('base64'));

test('Impact direction and copy describe the actual collision orientation',async()=>{
  const [p,l]=await Promise.all([m,course]);
  const level=l.levels[0],x=650;
  const slope=p.getLandingAngle(level,x);
  const crash={slopeAngle:slope,score:0,crashed:true};
  const nose=p.landingStory(crash,{x,rotation:slope+.85});
  const rear=p.landingStory(crash,{x,rotation:slope-.88});
  assert.equal(nose.kind,'crash');
  assert.equal(nose.direction,'forward');
  assert.match(nose.label,/morro/);
  assert.equal(rear.direction,'backward');
  assert.match(rear.label,/enrere/);
  assert.ok(nose.duration>1.2);
  assert.equal(p.landingStory({slopeAngle:slope,score:650,crashed:false},{x,rotation:slope+.4}).kind,'rough');
  assert.equal(p.landingStory({slopeAngle:slope,score:1450,crashed:false},{x,rotation:slope+.2}).kind,'clean');
  assert.equal(p.landingStory({slopeAngle:slope,score:2000,crashed:false},{x,rotation:slope}).kind,'perfect');
});

test('A crash ejects a visible rider, twists the bicycle and makes impact dust',async()=>{
  const [p,l]=await Promise.all([m,course]);const level=l.levels[0],x=640;
  const landing={slopeAngle:p.getLandingAngle(level,x),score:0,crashed:true};
  const bike={x,y:p.getLandingY(level,x)-8,velocityX:260,rotation:landing.slopeAngle+.85,wheelSpin:5};
  const story=p.landingStory(landing,bike);
  const start=p.landingPose({level,story,initial:bike,elapsed:0});
  const half=p.landingPose({level,story,initial:bike,elapsed:story.duration/2});
  const end=p.landingPose({level,story,initial:bike,elapsed:story.duration});
  assert.ok(half.rider&&Number.isFinite(half.rider.x)&&Number.isFinite(half.rider.y));
  assert.ok(half.rider.x>half.x,'Forward wipeout ejects rider ahead of bike');
  assert.ok(half.rotation>start.rotation+.5,'Bike visibly tumbles after collision');
  assert.ok(half.dust>0);
  assert.equal(end.progress,1);
  assert.ok(end.x>bike.x);
  assert.ok(Math.abs(end.rotation-bike.rotation)>1);
});

test('Hard, good and perfect landings have different bounces and suspension',async()=>{
  const [p,l]=await Promise.all([m,course]);const level=l.levels[0],x=620,slope=p.getLandingAngle(level,x);
  const initial={x,y:p.getLandingY(level,x)-8,velocityX:220,rotation:slope+.37,wheelSpin:0};
  const roughStory=p.landingStory({slopeAngle:slope,score:650,crashed:false},initial);
  const cleanStory=p.landingStory({slopeAngle:slope,score:1450,crashed:false},initial);
  const good=p.landingPose({level,story:cleanStory,initial,elapsed:.18});
  const rough=p.landingPose({level,story:roughStory,initial,elapsed:.18});
  assert.equal(rough.rider,null);
  assert.ok(rough.bounce>good.bounce);
  assert.ok(good.compression>0);
  assert.ok(rough.rotation!==good.rotation);
});

test('Camera enlarges the view with altitude and keeps the rider on the course',async()=>{
  const [p,l]=await Promise.all([m,course]);const level=l.levels[0];
  const neutral=p.cinematicCamera({phase:'ready',bike:{x:100,y:110},level});
  const high=p.cinematicCamera({phase:'flight',bike:{x:740,y:120},level});
  const impact=p.cinematicCamera({phase:'impact',bike:{x:820,y:470},level});
  assert.equal(neutral.zoom,1);
  assert.ok(high.zoom<.9&&high.zoom>=.72,'Camera zooms out to show air and landscape');
  assert.ok(high.x>neutral.x);
  assert.equal(impact.zoom,.87);
  const halfway=p.easeCamera(neutral,high,.1);
  assert.ok(halfway.zoom<1&&halfway.zoom>high.zoom);
  assert.ok(halfway.x>neutral.x&&halfway.x<high.x);
});

test('Apparent camera travel never invents official metres',async()=>{
  const [p,l]=await Promise.all([m,course]);const level=l.levels[0];
  const bike={x:level.takeoffPoint.x+280,y:150};
  const real=p.flightReadout(level,bike);
  const shifted=p.cinematicCamera({phase:'flight',bike,level});
  assert.equal(real.distanceMeters,280*level.distanceScale);
  assert.ok(real.clearanceMeters>0);
  assert.ok(shifted.zoom<1);
  const end=p.flightReadout(level,{x:level.takeoffPoint.x+2000,y:0});
  assert.equal(end.distanceMeters,level.maximumDistanceMeters,'Display has same cap as official scoring');
});
