import {VIEW,TRACKS,clamp,trackSurface,newRace,startRace,attemptJump,
  stepRace,driveCamera,raceGrade} from "../ride-engine.js";
const canvas=document.getElementById("rideCanvas"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const ui={select:$("trackSelect"),distance:$("distanceText"),time:$("timeText"),
  score:$("scoreText"),rings:$("ringsText"),record:$("recordText"),label:$("trackLabel"),
  phase:$("phaseLabel"),notice:$("noticeText"),progress:$("progressBar"),start:$("startPanel"),
  startButton:$("startButton"),result:$("resultPanel"),finishTitle:$("finishTitle"),
  finishStars:$("finishStars"),finishSummary:$("finishSummary"),again:$("againButton"),
  next:$("nextTrackButton"),gas:$("gasButton"),brake:$("brakeButton"),
  jump:$("jumpButton"),back:$("leanBackButton"),forward:$("leanForwardButton"),
  reset:$("resetButton"),pause:$("pauseButton"),status:$("rideStatus"),
  checkpoint:$("checkpointCount"),jumps:$("jumpCount")};
let game=newRace(0),previous=null,paused=false,renderedPhase="ready";
const heldKeys=new Set(),pressedPointers=new Map();
const bindings=[[ui.gas,"accelerate"],[ui.brake,"brake"],
  [ui.back,"leanBack"],[ui.forward,"leanForward"]];
const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const recordKey=id=>`bicipark-bikejump-ride-${id}-v1`;
function readRecord(index){
  try{const x=Number(localStorage.getItem(recordKey(index)));return x>0&&Number.isFinite(x)?x:null;}
  catch{return null;}
}
function saveRecord(index,time){
  try{localStorage.setItem(recordKey(index),String(time));}catch{/* anonymous storage */}
}
const fmtTime=t=>`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,"0")}`;
const num=n=>Math.round(n).toLocaleString("ca-ES");
function control(name){return heldKeys.has(name)||[...pressedPointers.values()].includes(name);}
function clearControls(){
  heldKeys.clear();pressedPointers.clear();
  for(const [button] of bindings)button.setAttribute("aria-pressed","false");
}
function pressControl(button,name){
  button.addEventListener("pointerdown",ev=>{
    if(ev.button!=null&&ev.button!==0)return;
    ev.preventDefault();
    pressedPointers.set(ev.pointerId,name);
    try{button.setPointerCapture(ev.pointerId);}catch{/* fallback */}
    button.setAttribute("aria-pressed","true");
  });
  const release=ev=>{
    pressedPointers.delete(ev.pointerId);
    button.setAttribute("aria-pressed",String(control(name)));
  };
  button.addEventListener("pointerup",release);
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);
}
for(const [button,name]of bindings)pressControl(button,name);
window.addEventListener("pointerup",ev=>{
  if(pressedPointers.delete(ev.pointerId))syncControlButtons();
});
window.addEventListener("pointercancel",ev=>{
  if(pressedPointers.delete(ev.pointerId))syncControlButtons();
});
function syncControlButtons(){
  for(const [button,name]of bindings)button.setAttribute("aria-pressed",String(control(name)));
}
function begin(){
  if(game.phase==="ready")startRace(game);
  paused=false;
  syncUI();
}
function jump(){
  if(game.phase==="ready"){begin();return;}
  if(paused)return;
  attemptJump(game);
  syncUI();
}
ui.startButton.addEventListener("click",begin);
ui.jump.addEventListener("click",jump);
ui.again.addEventListener("click",()=>reset(game.index));
ui.next.addEventListener("click",()=>reset((game.index+1)%TRACKS.length));
ui.reset.addEventListener("click",()=>reset(game.index));
ui.select.addEventListener("change",()=>reset(Number(ui.select.value)));
ui.pause.addEventListener("click",()=>{if(game.phase!=="racing")return;
  paused=!paused;clearControls();ui.pause.textContent=paused?"▶ Continua":"⏸ Pausa";
  ui.pause.setAttribute("aria-pressed",String(paused));syncUI();});
window.addEventListener("keydown",event=>{
  if(event.target instanceof HTMLElement && (["INPUT","TEXTAREA","SELECT","BUTTON","A"].includes(event.target.tagName)||event.target.isContentEditable))return;
  const code=event.code;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(code))event.preventDefault();
  if(code==="Space"){
    if(!event.repeat)jump();return;
  }
  if(code==="ArrowUp"||code==="KeyW")heldKeys.add("accelerate");
  if(code==="ArrowDown"||code==="KeyS")heldKeys.add("brake");
  if(code==="ArrowLeft"||code==="KeyA")heldKeys.add("leanBack");
  if(code==="ArrowRight"||code==="KeyD")heldKeys.add("leanForward");
  syncControlButtons();
});
window.addEventListener("keyup",event=>{
  const map={ArrowUp:"accelerate",KeyW:"accelerate",ArrowDown:"brake",KeyS:"brake",
    ArrowLeft:"leanBack",KeyA:"leanBack",ArrowRight:"leanForward",KeyD:"leanForward"};
  if(map[event.code]){heldKeys.delete(map[event.code]);syncControlButtons();}
});
window.addEventListener("blur",()=>{clearControls();previous=null;});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){clearControls();previous=null;if(game.phase==="racing")paused=true;}
});
function reset(index=0){
  game=newRace(index);previous=null;paused=false;renderedPhase=game.phase;
  clearControls();ui.select.value=String(game.index);
  ui.result.hidden=true;ui.start.hidden=false;ui.pause.textContent="⏸ Pausa";
  ui.pause.setAttribute("aria-pressed","false");
  syncUI();draw();
}
function syncUI(){
  ui.distance.textContent=`${Math.min(100,Math.round(game.rider.x/game.level.length*100))}%`;
  ui.time.textContent=fmtTime(game.elapsed+game.penalty);
  ui.score.textContent=num(game.score);
  ui.rings.textContent=`${game.rings.filter(r=>r.found).length} / ${game.rings.length}`;
  const record=readRecord(game.index);
  ui.record.textContent=record?fmtTime(record):"—";
  ui.label.textContent=game.level.tag;
  ui.phase.textContent=paused?"⏸ PAUSA":game.phase==="racing"?
    (game.rider.grounded?"● PEDALANT":"✦ VOLANT"):game.phase==="finished"?"🏁 META":"● PREPARAT";
  ui.status.textContent=paused?"Partida en pausa. Prem Continua per seguir.":game.notice;
  ui.progress.style.width=`${clamp(game.rider.x/game.level.length*100,0,100)}%`;
  ui.checkpoint.textContent=`${game.checkpoints.filter(cp=>cp.reached).length} / ${game.checkpoints.length}`;
  ui.jumps.textContent=String(game.rider.jumps);
  ui.start.hidden=game.phase!=="ready";
  ui.result.hidden=game.phase!=="finished";
  if(game.phase==="racing"&&game.noticeTime>0){
    ui.notice.textContent=game.notice;
    ui.notice.hidden=false;
  }else ui.notice.hidden=true;
  const finish=game.phase==="finished";
  if(finish&&renderedPhase!=="finished"){
    const old=readRecord(game.index);
    if(old===null||game.finishTime<old)saveRecord(game.index,game.finishTime);
    const grade=raceGrade(game);
    ui.finishTitle.textContent=old===null||game.finishTime<old?"🏆 NOU RÈCORD!":"HAS ARRIBAT!";
    ui.finishStars.textContent="★".repeat(grade)+"☆".repeat(3-grade);
    ui.finishSummary.textContent=`${fmtTime(game.finishTime)} · ${num(game.score)} punts · ${game.rings.filter(r=>r.found).length} anelles · ${game.rider.jumps} salts · ${game.rider.failed} caigudes.`;
    ui.next.textContent=game.index<TRACKS.length-1?"SEGÜENT CIRCUIT →":"TORNA AL PRIMER CIRCUIT ↻";
    ui.record.textContent=fmtTime(Math.min(old||Infinity,game.finishTime));
    clearControls();
  }
  renderedPhase=game.phase;
}
function fillGround(){
  const level=game.level,ctxx=ctx;
  ctxx.fillStyle=level.background==="canyon"?"#be7848":level.background==="city"?"#577b84":"#537a61";
  for(let i=0;i<level.points.length-1;i++){
    const a=level.points[i],b=level.points[i+1];
    // Do not bridge gaps with solid terrain (gap has no contact).
    const gap=level.gaps.some(([start,end])=>a.x>=start-1&&b.x<=end);
    if(gap)continue;
    ctxx.beginPath();ctxx.moveTo(a.x,a.y);ctxx.lineTo(b.x,b.y);
    ctxx.lineTo(b.x,1250);ctxx.lineTo(a.x,1250);ctxx.closePath();ctxx.fill();
    ctxx.strokeStyle=level.background==="canyon"?"#facb7d":"#b8f2b8";
    ctxx.lineWidth=7;ctxx.beginPath();ctxx.moveTo(a.x,a.y);ctxx.lineTo(b.x,b.y);ctxx.stroke();
  }
  // Actual jumps are marked at physical ramp lips. A shadow shows the gap.
  for(const [start,end]of level.gaps){
    const s=trackSurface(level,start-1),t=trackSurface(level,end);
    ctxx.strokeStyle="rgba(26,66,83,.36)";ctxx.setLineDash([8,14]);ctxx.lineWidth=3;
    ctxx.beginPath();ctxx.moveTo(start,s.y+35);ctxx.lineTo(end,t.y+35);ctxx.stroke();ctxx.setLineDash([]);
    ctxx.fillStyle="#fff4a0";ctxx.font="1000 20px system-ui";ctxx.fillText("↗",start-20,s.y-34);
  }
}
function farScenery(){
  const theme=game.level.background;
  const colors=theme==="canyon"?["#edac77","#d48b6c","#915f6c"]:
    theme==="city"?["#88bac6","#6393a9","#417b8f"]:["#a7e1c4","#78bda9","#4f968f"];
  const g=ctx.createLinearGradient(0,0,0,560);
  g.addColorStop(0,theme==="canyon"?"#f8b97e":theme==="city"?"#7ba8d9":"#8cc5dd");
  g.addColorStop(1,theme==="canyon"?"#ffe3a5":"#d4f4d9");
  ctx.fillStyle=g;ctx.fillRect(0,0,1000,560);
  ctx.fillStyle="#fff4b9";ctx.beginPath();ctx.arc(820,105,58,0,Math.PI*2);ctx.fill();
  const parallax=(game.camera.x-500)*.16;
  ctx.save();ctx.translate(-parallax,0);
  for(let layer=0;layer<3;layer++){
    const y=295+layer*44;
    ctx.fillStyle=colors[layer];
    ctx.beginPath();ctx.moveTo(-200,y+90);
    for(let x=-200;x<Math.max(2200,game.camera.x*.9+1200);x+=180){
      const h=50+((x+740)*(layer+3)%100);
      ctx.lineTo(x,y+30-h);ctx.lineTo(x+90,y-25-h*.35);
      ctx.lineTo(x+180,y+65);
    }
    ctx.lineTo(2400,900);ctx.lineTo(-200,900);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function drawDecor(){
  const l=game.level;
  for(let x=140;x<l.length;x+=185){
    if(!trackSurface(l,x).exists)continue;
    const s=trackSurface(l,x),base=s.y;
    if(l.background==="forest"){
      ctx.fillStyle="#1b644e";ctx.beginPath();ctx.moveTo(x,base-115);
      ctx.lineTo(x-34,base-13);ctx.lineTo(x+34,base-13);ctx.closePath();ctx.fill();
      ctx.fillStyle="#63513e";ctx.fillRect(x-5,base-15,10,15);
    }else if(l.background==="canyon"){
      ctx.fillStyle="#b76f56";ctx.fillRect(x-13,base-78,26,78);
      ctx.fillStyle="#d6a075";ctx.fillRect(x-30,base-85,60,14);
    }else{
      ctx.fillStyle="#215c73";ctx.fillRect(x-26,base-115,52,105);
      ctx.fillStyle="#f9f0c0";
      for(let k=0;k<3;k++)ctx.fillRect(x-15,base-100+k*26,9,13);
    }
  }
}
function drawRings(time){
  for(const r of game.rings){
    if(r.found)continue;
    const wobble=reduceMotion?0:Math.sin(time*3+r.x*.01)*4;
    ctx.save();ctx.translate(r.x,r.y+wobble);
    ctx.strokeStyle="rgba(250,224,91,.27)";ctx.lineWidth=14;
    ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#fff2a5";ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#ffbe61";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}
function drawMarkers(){
  for(const cp of game.checkpoints){
    const s=trackSurface(game.level,cp.x);
    if(!s.exists)continue;
    ctx.strokeStyle=cp.reached?"#a3ffe0":"#ffefae";ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(cp.x,s.y);ctx.lineTo(cp.x,s.y-95);ctx.stroke();
    ctx.fillStyle=cp.reached?"#58eaba":"#e8bc64";ctx.beginPath();
    ctx.moveTo(cp.x,s.y-95);ctx.lineTo(cp.x+55,s.y-82);
    ctx.lineTo(cp.x,s.y-70);ctx.closePath();ctx.fill();
  }
  const fin=game.level.length,s=trackSurface(game.level,fin);
  ctx.fillStyle="#253c57";ctx.fillRect(fin,s.y-180,13,180);
  for(let r=0;r<7;r++)for(let c=0;c<2;c++){
    ctx.fillStyle=(r+c)%2?"#1b3545":"#fff";
    ctx.fillRect(fin+13+c*15,s.y-180+r*20,15,20);
  }
}
function drawObstacles(){
  for(const obs of game.obstacles){
    if(obs.hit)continue;
    const s=trackSurface(game.level,obs.x);
    if(!s.exists)continue;
    ctx.save();ctx.translate(obs.x,s.y);
    if(obs.type==="log"){
      ctx.fillStyle="#765140";ctx.strokeStyle="#4a3441";ctx.lineWidth=4;
      ctx.beginPath();ctx.roundRect(-24,-23,48,23,7);ctx.fill();ctx.stroke();
      ctx.fillStyle="#d2a276";ctx.beginPath();ctx.arc(15,-11,10,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle="#fa8d5f";ctx.beginPath();ctx.moveTo(0,-39);
      ctx.lineTo(-17,0);ctx.lineTo(17,0);ctx.closePath();ctx.fill();
      ctx.fillStyle="#fff4c1";ctx.fillRect(-12,-10,24,7);
    }
    ctx.restore();
  }
}
function drawShadow(){
  const b=game.rider,s=trackSurface(game.level,b.x);
  if(!s.exists||b.grounded)return;
  const h=Math.max(0,s.y-b.y);
  ctx.fillStyle=`rgba(8,34,54,${clamp(.3-h/950,.07,.34)})`;
  ctx.beginPath();ctx.ellipse(b.x,s.y+3,27+h*.12,9,0,0,Math.PI*2);ctx.fill();
}
function drawBike(){
  const b=game.rider;
  ctx.save();ctx.translate(b.x,b.y+b.suspension*5);ctx.rotate(b.angle);
  ctx.strokeStyle="#172d40";ctx.lineWidth=6;ctx.lineCap="round";
  for(const ox of [-24,24]){
    ctx.beginPath();ctx.arc(ox,13,14,0,Math.PI*2);ctx.stroke();
    ctx.save();ctx.translate(ox,13);ctx.rotate(b.wheelSpin);
    ctx.strokeStyle="#eafdf0";ctx.lineWidth=2;
    for(let i=0;i<4;i++){const a=i*Math.PI/4;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*-12,Math.sin(a)*-12);
      ctx.lineTo(Math.cos(a)*12,Math.sin(a)*12);ctx.stroke();}
    ctx.restore();
  }
  ctx.strokeStyle="#f5e775";ctx.lineWidth=6;ctx.beginPath();
  ctx.moveTo(-24,13);ctx.lineTo(-3,-9);ctx.lineTo(24,13);ctx.lineTo(-5,11);
  ctx.lineTo(-24,13);ctx.moveTo(-3,-9);ctx.lineTo(-5,11);ctx.stroke();
  // Rider with articulated leaning pose.
  ctx.fillStyle="#fa7c94";ctx.beginPath();ctx.moveTo(-10,-18);
  ctx.lineTo(7,-17);ctx.lineTo(14,-42);ctx.lineTo(-1,-45);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#213a43";ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(5,-19);ctx.lineTo(-15,-5);ctx.moveTo(7,-18);ctx.lineTo(13,-2);
  ctx.moveTo(8,-39);ctx.lineTo(23,-22);ctx.stroke();
  ctx.fillStyle="#c6fff0";ctx.beginPath();ctx.arc(8,-51,12,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#123747";ctx.lineWidth=3;ctx.beginPath();ctx.arc(8,-51,12,Math.PI,Math.PI*2);ctx.stroke();
  if(!b.grounded){
    ctx.strokeStyle="rgba(189,255,240,.76)";ctx.lineWidth=3;
    for(let i=0;i<3;i++){
      ctx.beginPath();ctx.moveTo(-47-i*19,5+i*12);
      ctx.lineTo(-27-i*11,5+i*12);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawParticles(){
  for(const p of game.particles){
    ctx.fillStyle=p.color;ctx.globalAlpha=clamp(p.t/.75,0,1);
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function draw(){
  if(!ctx)return;
  farScenery();
  ctx.save();
  ctx.translate(500,280);
  ctx.scale(game.camera.zoom,game.camera.zoom);
  ctx.translate(-game.camera.x,-game.camera.y);
  drawDecor();fillGround();drawMarkers();drawRings(game.elapsed);
  drawObstacles();drawShadow();drawBike();drawParticles();
  ctx.restore();
  // Visible ride speed and next action while the player drives.
  if(game.phase==="racing"){
    ctx.fillStyle="rgba(8,34,48,.83)";
    ctx.beginPath();ctx.roundRect(17,56,195,60,10);ctx.fill();
    ctx.fillStyle="#d4ffb4";ctx.font="900 25px system-ui";ctx.fillText(`${Math.round(game.rider.vx/5.6)} km/h`,31,83);
    ctx.fillStyle="#daf5eb";ctx.font="800 13px system-ui";
    ctx.fillText(game.rider.grounded?"CARRETERA":"✦ EN VOL",31,104);
  }
}
function frame(now){
  const delta=previous==null?0:Math.min(.05,Math.max(0,(now-previous)/1000));
  previous=now;
  if(!paused){
    stepRace(game,delta,{accelerate:control("accelerate"),
      brake:control("brake"),leanBack:control("leanBack"),
      leanForward:control("leanForward")});
  }
  driveCamera(game,paused?0:delta);
  syncUI();draw();requestAnimationFrame(frame);
}
reset(0);
requestAnimationFrame(frame);
