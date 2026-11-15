'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(
  readFileSync(path.join(root,'bike-jump/ride-engine.js'))).toString('base64'));
const frame=(e,g,n,ctrl={accelerate:true})=>{
  for(let i=0;i<n;i++)e.stepRace(g,1/60,ctrl);
};
test('Three finite original point-to-point courses include honest ground gaps, checkpoints and rings',async()=>{
  const e=await load();
  assert.equal(e.TRACKS.length,3);
  for(const track of e.TRACKS){
    assert.ok(track.length>4000);
    assert.ok(track.gaps.length>=3);
    assert.ok(track.checkpoints.length>=3);
    assert.ok(track.rings.length>=5);
    assert.ok(track.points[0].x===0);
    for(const [start,end]of track.gaps){
      assert.equal(e.trackSurface(track,start+4).exists,false);
      assert.equal(e.trackSurface(track,end+1).exists,true);
      assert.ok(end>start+100);
    }
    assert.equal(e.trackSurface(track,track.length).exists,true);
  }
});
test('Real driving needs held throttle, respects brake, and automatically launches at ramp edges',async()=>{
  const e=await load(),g=e.newRace();
  assert.equal(g.phase,'ready');
  assert.equal(e.startRace(g),true);
  const initial=g.rider.x;
  frame(e,g,40,{accelerate:true});
  assert.ok(g.rider.x>initial+85);
  const brakeSpeed=g.rider.vx;
  frame(e,g,20,{brake:true});
  assert.ok(g.rider.vx<brakeSpeed);
  for(let i=0;i<350&&g.rider.x<e.TRACKS[0].gaps[0][0]+8;i++){
    e.stepRace(g,1/60,{accelerate:true});
  }
  assert.ok(g.rider.x>e.TRACKS[0].gaps[0][0]-10);
  assert.ok(g.rider.jumps>0,'Ramp must produce a visible automatic jump');
  assert.equal(g.rider.grounded,false,'Gap is physically absent');
});
test('Manual jump adds airtime, has cooldown and cannot fire again midair',async()=>{
  const e=await load(),g=e.newRace();
  e.startRace(g);
  frame(e,g,45,{accelerate:true});
  assert.equal(e.attemptJump(g),true);
  assert.equal(e.attemptJump(g),false);
  assert.ok(g.rider.vy<0);
  assert.equal(g.rider.grounded,false);
  assert.equal(g.rider.jumps,1);
  const y=g.rider.y;
  frame(e,g,12,{accelerate:true,leanForward:true});
  assert.ok(g.rider.y<y,'Jump rises visually');
  assert.ok(g.rider.angle>-.3,'Bike can respond to player lean in mid-air');
});
test('Rings award points once and checkpoints are not awarded twice',async()=>{
  const e=await load(),g=e.newRace();
  e.startRace(g);
  const first=g.rings[0];
  g.rider.x=first.x;g.rider.y=first.y;g.rider.grounded=false;
  g.rider.vx=200;g.rider.vy=-60;
  e.stepRace(g,1/120,{});
  assert.equal(first.found,true);
  const after=g.score;
  e.stepRace(g,1/120,{});
  assert.equal(g.score,after);
  g.rider.x=g.checkpoints[0].x-1;
  const s=e.trackSurface(g.level,g.rider.x);
  g.rider.y=s.y-e.VIEW.clearance;g.rider.vy=0;g.rider.grounded=true;
  e.stepRace(g,1/60,{accelerate:true});
  assert.equal(g.checkpoints[0].reached,true);
  const earned=g.score;
  e.stepRace(g,1/60,{accelerate:true});
  assert.equal(g.score,earned);
});
test('Falls respawn at last reached checkpoint with a time penalty and no endless air',async()=>{
  const e=await load(),g=e.newRace();
  e.startRace(g);
  g.checkpoints[0].reached=true;
  g.rider.x=1450;g.rider.y=900;g.rider.grounded=false;
  const before=g.penalty;
  e.stepRace(g,1/60,{});
  assert.equal(g.rider.failed,1);
  assert.ok(g.rider.x>=g.checkpoints[0].x);
  assert.ok(g.rider.grounded);
  assert.equal(g.penalty,before+3);
});
test('Finishing awards a finite time, rank and score without network tracking',async()=>{
  const e=await load(),g=e.newRace();
  e.startRace(g);
  const len=g.level.length;
  g.rider.x=len-3;
  const s=e.trackSurface(g.level,len-3);
  g.rider.y=s.y-e.VIEW.clearance;g.rider.grounded=true;
  g.rider.vx=360;
  e.stepRace(g,1/60,{accelerate:true});
  assert.equal(g.phase,'finished');
  assert.ok(g.finishTime>0&&Number.isFinite(g.finishTime));
  assert.ok(g.score>=0);
  assert.ok(e.raceGrade(g)>=1 && e.raceGrade(g)<=3);
  assert.ok(e.driveCamera(g,1/60)===undefined);
});
test('Circuit files have valid JavaScript and accessible controls and visible links',async()=>{
  const html=readFileSync(path.join(root,'bike-jump/ride/index.html'),'utf8');
  const css=readFileSync(path.join(root,'bike-jump/ride/styles.css'),'utf8');
  for(const file of ['bike-jump/ride-engine.js','bike-jump/ride/app.js']){
    execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
  }
  for(const id of ['rideCanvas','gasButton','brakeButton','jumpButton','leanBackButton',
     'leanForwardButton','trackSelect','resultPanel','checkpointCount','progressBar']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/aria-describedby="rideHelp rideStatus"/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/touch-action:none/);
});
