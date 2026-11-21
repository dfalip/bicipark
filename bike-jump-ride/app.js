import {WORLD,TRACK,CHECKPOINTS,trackAt,makeGame,begin,step,clamp,CHALLENGES,challengeProgress} from "./engine.js";

const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const ui={play:$("playButton"),again:$("playAgainButton"),restart:$("restartButton"),
  ready:$("readyPanel"),finish:$("finishPanel"),finishSummary:$("finishSummary"),
  finishStars:$("finishStars"),speed:$("speedValue"),distance:$("distanceValue"),
  score:$("scoreValue"),time:$("timeValue"),best:$("bestValue"),progress:$("progressBar"),
  progressLabel:$("progressLabel"),zone:$("zoneLabel"),state:$("stateLabel"),
  status:$("statusText"),notice:$("centerNotice"),jumpBar:$("jumpMeterBar"),
  jumpLabel:$("jumpMeterLabel"),challengeSummary:$("challengeSummary"),
  challengeList:$("challengeList"),finishChallengeSummary:$("finishChallengeSummary")};
const touch={
  brake:$("brakeButton"),leanBack:$("leanBackButton"),jump:$("jumpButton"),
  leanForward:$("leanForwardButton"),gas:$("accelerateButton"),boost:$("boostButton")
};
const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const BEST_KEY="bicipark-bike-jump-ride-freeride-best-v2";
const AWARDS_KEY="bicipark-bike-jump-ride-medals-v1";
function loadBest(){
  try{const x=Number(localStorage.getItem(BEST_KEY));return Number.isFinite(x)&&x>0?x:0;}
  catch{return 0;}
}
function storeBest(value){try{localStorage.setItem(BEST_KEY,String(value));}catch{/* private browsing */}}
function loadAwards(){
  try{
    const stored=JSON.parse(localStorage.getItem(AWARDS_KEY)||"[]");
    const valid=Array.isArray(stored)?stored.filter(id=>CHALLENGES.some(c=>c.id===id)):[];
    return new Set(valid);
  }catch{return new Set();}
}
function storeAwards(){
  try{localStorage.setItem(AWARDS_KEY,JSON.stringify([...awards]));}
  catch{/* private browsing */}
}
function renderChallenges(){
  const current=challengeProgress(game);
  ui.challengeSummary.textContent=`${awards.size} / ${CHALLENGES.length} medalles aconseguides`;
  ui.challengeList.replaceChildren();
  for(const entry of current){
    const tile=document.createElement("div");
    const earned=awards.has(entry.id);
    tile.className="challenge-item"+(entry.achieved?" challenge-item--achieved":"")+
      (earned?" challenge-item--earned":"");
    tile.title=entry.help;
    tile.setAttribute("aria-label",entry.title+": "+entry.help+". "+entry.progress+
      (earned?". Medalla aconseguida.":""));
    const icon=document.createElement("span");
    icon.className="challenge-icon";icon.setAttribute("aria-hidden","true");
    icon.textContent=earned?"★":entry.icon;
    const title=document.createElement("strong");title.textContent=entry.title;
    const desc=document.createElement("small");
    desc.textContent=earned?"★ Aconseguida":entry.progress;
    tile.append(icon,title,desc);ui.challengeList.append(tile);
  }
}
const keys=new Set(),pointers=new Map();
let game=makeGame(),best=loadBest(),awards=loadAwards(),camera=0,lastFrame=null,queuedRelease=false;
let lastChallengeRender=-Infinity;
let previousEvent="",previousPhase="ready",noticeTimer=0;
const particles=[];
function reset(){
  game=makeGame();camera=0;lastFrame=null;previousEvent="";previousPhase="ready";
  keys.clear();pointers.clear();queuedRelease=false;particles.length=0;
  noticeTimer=0;lastChallengeRender=-Infinity;ui.notice.hidden=true;ui.ready.hidden=false;ui.finish.hidden=true;
  for(const button of Object.values(touch))button.setAttribute("aria-pressed","false");
  refresh();renderChallenges();paint();
}
function startRide(){
  if(begin(game)){
    ui.ready.hidden=true;ui.play.blur();
    previousPhase="riding";
    previousEvent="";
    showNotice("ENDAVANT! PEDALA!",1.1);
  }
}
function pressed(action){
  const map={accelerate:["ArrowRight","KeyD"],brake:["ArrowLeft","KeyA"],
    leanBack:["ArrowUp","KeyW"],leanForward:["ArrowDown","KeyS"],
    jump:["Space"],boost:["KeyC","KeyX","KeyF"]};
  return map[action].some(k=>keys.has(k))||[...pointers.values()].includes(action);
}
function jumpIsHeld(){return pressed("jump");}
function releaseJump(){
  if(!jumpIsHeld()&&game.phase==="riding")queuedRelease=true;
}
document.addEventListener("keydown",event=>{
  if(!["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","KeyD","KeyA","KeyW","KeyS","Space","KeyC","KeyX","KeyF"].includes(event.code))return;
  if(event.target instanceof HTMLElement &&
    ["INPUT","BUTTON","SELECT","TEXTAREA","A"].includes(event.target.tagName))return;
  event.preventDefault();
  if(game.phase==="ready"&&["ArrowRight","KeyD","Space"].includes(event.code))startRide();
  keys.add(event.code);
});
document.addEventListener("keyup",event=>{
  if(!keys.has(event.code))return;
  event.preventDefault();
  keys.delete(event.code);
  if(event.code==="Space")releaseJump();
});
window.addEventListener("blur",()=>{
  keys.clear();pointers.clear();queuedRelease=false;
  for(const button of Object.values(touch))button.setAttribute("aria-pressed","false");
});
document.addEventListener("visibilitychange",()=>{if(document.hidden){keys.clear();pointers.clear();queuedRelease=false;game.charge=0;lastFrame=null;for(const button of Object.values(touch))button.setAttribute("aria-pressed","false");}});
function controlPointer(button,action){
  button.addEventListener("pointerdown",event=>{
    if(event.button!=null && event.button!==0)return;
    event.preventDefault();pointers.set(event.pointerId,action);
    button.setAttribute("aria-pressed","true");
    try{button.setPointerCapture(event.pointerId);}catch{/* no pointer capture */ }
    if(game.phase==="ready")startRide();
  });
  function release(event){
    if(pointers.get(event.pointerId)!==action)return;
    pointers.delete(event.pointerId);
    button.setAttribute("aria-pressed",String([...pointers.values()].includes(action)));
    if(action==="jump"){if(event.type==="pointerup")releaseJump();else{queuedRelease=false;game.charge=0;}}
  }
  for(const type of ["pointerup","pointercancel","lostpointercapture"])
    button.addEventListener(type,release);
}
for(const [name,button] of Object.entries(touch))controlPointer(button,name==="gas"?"accelerate":name);
ui.play.addEventListener("click",startRide);
ui.restart.addEventListener("click",reset);
ui.again.addEventListener("click",reset);
function showNotice(msg,seconds=1.1){
  ui.notice.hidden=false;ui.notice.textContent=msg;noticeTimer=seconds;
}
function updateFeedback(dt){
  if(game.lastEvent && game.lastEvent!==previousEvent){
    const important=game.eventTick>.01 || game.phase==="finish";
    previousEvent=game.lastEvent;
    if(important)showNotice(game.lastEvent,game.phase==="crash"?1.2:.9);
    ui.status.textContent=game.lastEvent;
    if(/ANELLA|ATERRATGE|PUNT DE CONTROL|FLIP|WHEELIE/.test(game.lastEvent)){
      for(let i=0;i<17;i++){
        const angle=i*Math.PI*2/17;
        particles.push({x:game.x,y:game.y-35,vx:Math.cos(angle)*(40+i*4),
          vy:Math.sin(angle)*(50+i*3)-70,life:.7,color:i%2?"#fff08d":"#8fffe9"});
      }
    }
  }
  if(game.phase!==previousPhase){
    previousPhase=game.phase;
    if(game.phase==="finish"){
      if(game.score>best){best=game.score;storeBest(best);}
      ui.finish.hidden=false;
      ui.finishStars.textContent="★".repeat(game.finishStars)+"☆".repeat(3-game.finishStars);
      ui.finishSummary.textContent=`${Math.round(game.runTime)} segons · ${game.landings} aterratges · ${game.rings.filter(r=>r.collected).length} anelles · ${game.crashes} caigudes · ${game.score.toLocaleString("ca-ES")} punts.`;
      const won=challengeProgress(game).filter(m=>m.achieved);
      const oldTotal=awards.size;
      for(const medal of won)awards.add(medal.id);
      if(awards.size>oldTotal)storeAwards();
      ui.finishChallengeSummary.textContent=`${won.length} reptes completats en aquesta cursa · ${awards.size}/${CHALLENGES.length} medalles totals.`;
      renderChallenges();
      ui.again.focus({preventScroll:true});
    }
  }
  noticeTimer=Math.max(0,noticeTimer-dt);
  if(noticeTimer===0)ui.notice.hidden=true;
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;p.life-=dt;}
  for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  if(particles.length>100)particles.splice(0,particles.length-100);
}
function formatTime(seconds){
  const total=Math.floor(seconds);
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function refresh(){
  ui.speed.innerHTML=`${Math.round(game.vx*.168)} <small>km/h</small>`;
  ui.distance.innerHTML=`${Math.round(game.distance*.22)} <small>m</small>`;
  ui.score.textContent=Math.round(game.score).toLocaleString("ca-ES");
  ui.time.textContent=formatTime(game.runTime);
  ui.best.textContent=best.toLocaleString("ca-ES");
  $("trickValue").textContent=String(game.frontFlips+game.backFlips+game.wheelies);
  $("comboValue").textContent="×"+game.combo;
  $("boostMeterBar").style.width=game.boost+"%";$("boostMeterLabel").textContent=Math.round(game.boost)+"%";
  ui.progress.style.width=`${Math.round(game.progress*100)}%`;
  ui.progressLabel.textContent=`${Math.round(game.progress*100)}%`;
  ui.jumpBar.style.width=`${Math.round(game.charge*100)}%`;
  ui.jumpLabel.textContent=`${Math.round(game.charge*100)}%`;
  const region=game.x<720?"BOSC DE SORTIDA":game.x<1430?"PRIMER BARRANC":
    game.x<2050?"RAMPA DEL PENYA-SEGAT":game.x<2860?"VAL DE LES ANELLES":
    game.x<3420?"SALT DEL CANÓ":game.x<4060?"TRAM DE VELOCITAT":
    game.x<4430?"GRAN SALT FINAL":"ESPRINT FINS A META";
  ui.zone.textContent=region;
  ui.state.textContent=({ready:"PREPARAT",riding:game.grounded?(game.wheelie>.24?"WHEELIE":"SOBRE EL CIRCUIT"):"EN VOL",
    crash:"CAIGUDA",finish:"META!"})[game.phase]||"JUGANT";
}
function screenX(x){return x-camera;}
function background(){
 if(window.BiciParkPremiumArt){window.BiciParkPremiumArt.world(ctx,1000,560,camera,false,game.runTime);return;}
  const sky=ctx.createLinearGradient(0,0,0,560);
  sky.addColorStop(0,"#65aadd");sky.addColorStop(.57,"#bbf6e5");sky.addColorStop(1,"#e8f8d5");
  ctx.fillStyle=sky;ctx.fillRect(0,0,1000,560);
  ctx.fillStyle="#fff6c6";ctx.beginPath();ctx.arc(824,104,55,0,Math.PI*2);ctx.fill();
  for(const [index,dist,color] of [[0,.12,"#a8cfe1"],[1,.27,"#7bb8be"],[2,.48,"#4b958f"]]){
    ctx.save();ctx.translate(-(camera*dist%580),0);
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,480-index*30);
    for(let x=-600;x<=1900;x+=80){
      const y=265+index*65+Math.sin((x+index*193)/120)*45+
        Math.cos((x+index*163)/64)*25;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(1900,560);ctx.lineTo(0,560);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle="#ffffff80";
  for(let i=0;i<8;i++){
    const x=((i*240-camera*.09)%1300+1300)%1300-200;
    const y=90+(i%4)*30;
    ctx.beginPath();ctx.ellipse(x,y,52,13,0,0,Math.PI*2);ctx.fill();
  }
}
function drawTerrain(){
  const x0=camera-30,x1=camera+1030;
  for(const [i,s] of TRACK.entries()){
    if(s.x1<x0||s.x0>x1)continue;
    ctx.beginPath();
    let x=Math.max(s.x0,x0);
    const start=trackAt(x);
    ctx.moveTo(x,start.y);
    for(x+=8;x<=Math.min(s.x1,x1);x+=8){
      const at=trackAt(x);
      if(at)ctx.lineTo(x,at.y);
    }
    ctx.lineTo(Math.min(s.x1,x1),trackAt(Math.min(s.x1,x1)).y);
    ctx.lineTo(Math.min(s.x1,x1),750);
    ctx.lineTo(Math.max(s.x0,x0),750);
    ctx.closePath();ctx.fillStyle=i%2?"#7d6b4d":"#766344";ctx.fill();
    ctx.strokeStyle=s.type==="ramp"?"#fff2b2":"#cbb58d";
    ctx.lineWidth=s.type==="ramp"?11:9;ctx.stroke();
    ctx.strokeStyle=s.type==="ramp"?"#ffcf5b":"#74a65c";
    ctx.lineWidth=4;ctx.stroke();
    if(s.type!=="ramp"&&window.BiciParkArcadeArt){
      const first=Math.ceil(Math.max(s.x0,x0)/22)*22;
      for(let px=first;px<Math.min(s.x1,x1)-12;px+=22){
        const at=trackAt(px);if(at)window.BiciParkArcadeArt.surface(ctx,px,at.y+15,px);
      }
    }
    if(s.type==="ramp"){
      const art=window.BiciParkPremiumArt;
      if(art){
        for(let xx=s.x0+8;xx<s.x1;xx+=14){
          const yy=trackAt(xx).y;
          art.poly(ctx,[[xx-8,yy+2],[xx+6,yy-4],[xx+6,yy+16],[xx-8,yy+22]],"#b87a3d","#6b482f",1.5);
          if(Math.floor(xx/14)%4===0)art.line(ctx,[[xx,yy+16],[xx,Math.min(552,yy+100)]],"#614731",5);
        }
        art.line(ctx,[[s.x0,s.y0+3],[s.x1,s.y1+3]],"#f5c786",4);
      }
      for(let k=0;k<8;k++){
        const xx=s.x0+(k+.5)*(s.x1-s.x0)/8;
        const yy=trackAt(xx).y;
        ctx.strokeStyle="#314b41";ctx.lineWidth=3;ctx.beginPath();
        ctx.moveTo(xx-7,yy+1);ctx.lineTo(xx+7,yy-5);ctx.stroke();
      }
    }
  }
  for(let i=0;i<TRACK.length-1;i++){
    const a=TRACK[i],b=TRACK[i+1];
    if(b.x0-a.x1<30)continue;
    const center=(a.x1+b.x0)/2;
    if(center<x0||center>x1)continue;
    ctx.fillStyle="#102e48";ctx.globalAlpha=.32;
    ctx.fillRect(a.x1,495,b.x0-a.x1,65);ctx.globalAlpha=1;
    ctx.fillStyle="#fff1b1";ctx.font="1000 16px system-ui";ctx.textAlign="center";
    ctx.fillText("⚡ SALT",center,500);
  }
}
function drawTrees(){
  for(let x=60;x<WORLD.width;x+=112){
    if(x<camera-100||x>camera+1100)continue;
    const at=trackAt(x);if(!at||at.type==="ramp")continue;
    const h=34+(x*13%57);
    if(window.BiciParkPremiumArt){const art=window.BiciParkPremiumArt;art.pine(ctx,x,at.y,h*1.3,false,x);if(x%3===0)art.rock(ctx,x+32,at.y+18,21,false);if(x%5===0)art.marker(ctx,x+50,at.y,false);continue;}
    ctx.fillStyle="#435b4b";ctx.fillRect(x-3,at.y-h*.15,6,h*.2);
    ctx.fillStyle=x%4===0?"#287e79":"#216b70";
    ctx.beginPath();ctx.moveTo(x,at.y-h);
    ctx.lineTo(x-h*.29,at.y-h*.09);ctx.lineTo(x+h*.29,at.y-h*.09);
    ctx.closePath();ctx.fill();
  }
}
function drawCheckpoints(){
  for(const x of CHECKPOINTS.slice(1)){
    if(x<camera-80||x>camera+1070)continue;
    const y=trackAt(x)?.y??460;
    ctx.strokeStyle="#254653";ctx.lineWidth=6;ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x,y-93);ctx.stroke();
    ctx.fillStyle="#fff58e";ctx.beginPath();
    ctx.moveTo(x,y-93);ctx.lineTo(x+44,y-82);
    ctx.lineTo(x,y-62);ctx.closePath();ctx.fill();
    ctx.fillStyle="#143e47";ctx.font="bold 12px system-ui";ctx.fillText("CP",x+7,y-74);
  }
}
function drawRings(){
  const t=game.runTime;
  for(const ring of game.rings){
    if(ring.collected||Math.abs(ring.x-game.x)>1100)continue;
    ctx.save();ctx.translate(ring.x,ring.y);
    const pulse=1+Math.sin(t*5+ring.x)*.06;
    ctx.scale(pulse,pulse);
    ctx.shadowColor="#ffe4a2";ctx.shadowBlur=17;
    ctx.strokeStyle="#ffe67d";ctx.lineWidth=8;ctx.beginPath();
    ctx.arc(0,0,23,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle="#fffedb";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}
function finishFlag(){
  const x=WORLD.finish,y=trackAt(x)?.y??431;
  ctx.strokeStyle="#2b5363";ctx.lineWidth=8;ctx.beginPath();
  ctx.moveTo(x,y);ctx.lineTo(x,y-150);ctx.stroke();
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    ctx.fillStyle=(row+col)%2?"#222c35":"#f9fff6";
    ctx.fillRect(x+col*14,y-150+row*14,14,14);
  }
  ctx.fillStyle="#f7fff9";ctx.font="1000 26px system-ui";ctx.fillText("META",x-20,y-163);
}
function drawBike(){
  const b=game;
  ctx.save();ctx.translate(b.x,b.y);
  const angle=b.angle;
  if(b.grounded&&b.wheelie>.01)ctx.translate(0,29*Math.sin(angle));
  ctx.rotate(angle);
  if(b.phase==="crash")ctx.translate(0,Math.sin(b.crashClock*12)*10);
  if(window.BiciParkPremiumArt){window.BiciParkPremiumArt.rider(ctx,{time:b.runTime,speed:b.vx,air:!b.grounded,wheelie:b.wheelie>.24});ctx.restore();return;}
  ctx.lineWidth=4;ctx.strokeStyle="#192d39";
  for(const x of [-24,24]){
    ctx.beginPath();ctx.arc(x,11,14,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#d8fffb";ctx.lineWidth=2;
    for(let k=0;k<4;k++){
      const a=k*Math.PI/4+b.x*.08;
      ctx.beginPath();ctx.moveTo(x-Math.cos(a)*12,11-Math.sin(a)*12);
      ctx.lineTo(x+Math.cos(a)*12,11+Math.sin(a)*12);ctx.stroke();
    }
    ctx.strokeStyle="#192d39";ctx.lineWidth=4;
  }
  ctx.strokeStyle="#fbeb83";ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(-24,11);ctx.lineTo(0,-11);ctx.lineTo(24,11);ctx.lineTo(-7,10);
  ctx.lineTo(-24,11);ctx.moveTo(0,-11);ctx.lineTo(-7,10);ctx.stroke();
  ctx.strokeStyle="#253d43";ctx.lineWidth=4;ctx.beginPath();
  ctx.moveTo(0,-11);ctx.lineTo(9,-31);ctx.lineTo(20,-26);
  ctx.moveTo(-4,-10);ctx.lineTo(-9,-22);ctx.stroke();
  ctx.strokeStyle="#153943";ctx.lineWidth=6;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(12,-41);
  ctx.lineTo(18,-27);ctx.moveTo(0,-27);ctx.lineTo(-15,-15);ctx.stroke();
  ctx.fillStyle="#f46f88";ctx.beginPath();
  ctx.ellipse(-2,-36,12,16,-.27,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#bdfff0";ctx.beginPath();ctx.arc(4,-57,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2f5251";ctx.beginPath();ctx.arc(8,-60,3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function shadow(){
  if(game.grounded||game.phase==="ready")return;
  const x=game.x,at=trackAt(x);
  if(!at)return;
  const h=clamp(at.y-game.y,0,350);
  ctx.fillStyle=`rgba(12,46,49,${.3-h/1400})`;
  ctx.beginPath();ctx.ellipse(x,at.y+4,28+h*.15,6+h*.04,0,0,Math.PI*2);ctx.fill();
}
function drawParticles(){
  for(const p of particles){
    ctx.globalAlpha=clamp(p.life/.7,0,1);ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function paint(){
  if(!ctx)return;
  ctx.clearRect(0,0,1000,560);background();
  ctx.save();ctx.translate(-camera,0);
  drawTerrain();drawTrees();drawCheckpoints();drawRings();finishFlag();
  shadow();drawBike();drawParticles();
  ctx.restore();
  // Freeride C: retain detailed illustration instead of downsampling the scene.
  ctx.fillStyle="rgba(5,39,56,.55)";ctx.fillRect(0,519,1000,40);
  ctx.textAlign="left";ctx.font="bold 15px system-ui";ctx.fillStyle="#e6fff3";
  ctx.fillText(game.grounded?"RODANT":"✦ EN VOL",20,546);
  ctx.textAlign="right";ctx.fillStyle="#ffef9b";
  ctx.fillText(`${game.rings.filter(r=>r.collected).length}/${game.rings.length} ANELLES`,980,546);
}
function frame(time){
  if(lastFrame===null)lastFrame=time;
  const dt=clamp((time-lastFrame)/1000,0,.08);lastFrame=time;
  const input={accelerate:pressed("accelerate"),brake:pressed("brake"),
    lean:Number(pressed("leanForward"))-Number(pressed("leanBack")),
    jumpHeld:jumpIsHeld(),jumpReleased:queuedRelease,boost:pressed("boost")};
  queuedRelease=false;
  step(game,input,dt);
  const desired=clamp(game.x-240,0,WORLD.width-1000);
  camera+= (desired-camera)*Math.min(1,dt*4.8);
  updateFeedback(dt);refresh();paint();
  if(time-lastChallengeRender>=250){lastChallengeRender=time;renderChallenges();}
  requestAnimationFrame(frame);
}
reset();
requestAnimationFrame(frame);
