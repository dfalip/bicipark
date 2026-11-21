import {WORLD,LEVELS,newGame,setAim,aimFromPointer,fire,turbo,step,nextShot,
  aliveTargets,starsFor,clamp,SHOT_TYPES,upcomingShot,predictShot} from "./engine.js";

const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const el={
  shots:$("shotsValue"),targets:$("targetsValue"),score:$("scoreValue"),best:$("bestValue"),
  level:$("levelSelect"),subtitle:$("levelSubtitle"),stageName:$("stageName"),
  phase:$("phaseLabel"),tip:$("stageTip"),notice:$("impactNotice"),status:$("gameStatus"),
  fire:$("fireButton"),turbo:$("turboButton"),next:$("nextButton"),retry:$("retryButton"),sound:$("soundToggle"),
  angle:$("angleInput"),power:$("powerInput"),angleValue:$("angleValue"),
  powerValue:$("powerValue"),result:$("resultPanel"),resultTitle:$("resultTitle"),
  resultDescription:$("resultDescription"),resultIcon:$("resultIcon"),
  resultKicker:$("resultKicker"),stars:$("resultStars"),resultButton:$("resultButton"),
  wheelCard:$("wheelCard"),wheelIcon:$("wheelIcon"),wheelName:$("wheelName"),
  wheelHelp:$("wheelHelp"),trajectoryHint:$("trajectoryHint")
};
let game=newGame(0),lastFrame=null,dragging=false,pointerId=null,previousPhase="aim";
let noticeAge=0,prevScore=0;
let trail=[],scorePopups=[],trailClock=0,trackedProjectile=null;
let previewCacheKey=null,previewCache=null;
function cachedPrediction(){
  // Recalculate only when aim or shot changes, not every animation frame.
  const key=[game.levelIndex,game.shotCount,game.angle.toFixed(1),game.power.toFixed(1)].join("|");
  if(previewCacheKey!==key){
    previewCacheKey=key;
    previewCache=predictShot(game);
  }
  return previewCache;
}
const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const bestKey=index=>`bicipark-roda-rumble-best-${index}-v1`;
function storedBest(index){
  try{const n=Number(localStorage.getItem(bestKey(index)));return Number.isFinite(n)&&n>0?n:0;}
  catch{return 0;}
}
function setBest(index,score){
  try{localStorage.setItem(bestKey(index),String(score));}catch{/* private browsing */}
}
function format(n){return Math.round(n).toLocaleString("ca-ES");}
let soundEnabled=false,audioContext=null;
function sound(kind){
  // Procedural effects only; no soundtrack or copyrighted audio samples.
  if(!soundEnabled)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!audioContext)audioContext=new Audio();
    if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
    const oscillator=audioContext.createOscillator();
    const volume=audioContext.createGain();
    const now=audioContext.currentTime;
    const duration=kind==="win"?.28:kind==="impact"?.19:.12;
    const startFrequency=kind==="win"?480:kind==="launch"?240:kind==="ability"?400:145;
    const endFrequency=kind==="win"?730:kind==="launch"?410:kind==="ability"?125:65;
    oscillator.type=kind==="impact"?"sawtooth":"triangle";
    oscillator.frequency.setValueAtTime(startFrequency,now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
    volume.gain.setValueAtTime(.0001,now);
    volume.gain.linearRampToValueAtTime(kind==="impact"?.065:.04,now+.012);
    volume.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(volume);volume.connect(audioContext.destination);
    oscillator.start(now);oscillator.stop(now+duration+.01);
  }catch{/* Sound is strictly optional: never break the game. */}
}
function fireAction(){
  if(fire(game)){trail=[];trailClock=0;sound("launch");}
  syncUI();
}
function specialAction(){
  if(turbo(game))sound("ability");
  syncUI();
}

function currentDescription(){
  if(game.phase==="aim")return "Arrossega la roda enrere i deixa-la anar, o ajusta angle i potència.";
  if(game.phase==="flying"){
    if(game.projectile?.turbo)return "Habilitat especial utilitzada. Mira la reacció en cadena!";
    return game.projectile?.type==="pulse"?"Prem ✦ o Espai prop d'una torre: ona expansiva!":
      game.projectile?.type==="drill"?"Prem ✦ o Espai: turbo perforador d'acer!":
      "Prem ✦ o Espai: martell d'impacte!";
  }
  if(game.phase==="between")return "Tens més rodes! Prepara el següent llançament.";
  if(game.phase==="won")return "Nivell superat! Mira les estrelles i continua.";
  return "Se t'han acabat les rodes. Reintenta el nivell.";
}
function syncUI(){
  el.shots.textContent=String(game.shotsLeft);
  el.targets.textContent=String(aliveTargets(game));
  el.score.textContent=format(game.score);
  el.best.textContent=format(Math.max(game.score,storedBest(game.levelIndex)));
  el.phase.textContent=({aim:"APUNTA I DISPARA",flying:"✦ EN VOL",between:"PRÒXIM LLANÇAMENT",
    won:"🏆 VICTÒRIA",lost:"SENSE RODES"})[game.phase];
  el.stageName.textContent=`NIVELL ${game.levelIndex+1} · ${game.levelName.toUpperCase()}`;
  el.tip.textContent=currentDescription();
  el.status.textContent=game.notice;
  el.fire.disabled=game.phase!=="aim";
  el.turbo.disabled=game.phase!=="flying"||Boolean(game.projectile?.turbo);
  const wheel=game.phase==="flying"?SHOT_TYPES.find(w=>w.id===game.projectile?.type):
    upcomingShot(game);
  if(wheel){
    el.wheelCard.style.setProperty("--wheel-color",wheel.color);
    el.wheelIcon.textContent=wheel.icon;
    el.wheelName.textContent=wheel.label;
    el.wheelHelp.textContent=wheel.help;
    el.turbo.textContent=wheel.id==="pulse"?"✦ ONA EXPANSIVA":
      wheel.id==="drill"?"◆ TURBO TREPANT":"● TURBO MARTELL";
  }
  el.wheelCard.hidden=game.phase==="won"||game.phase==="lost";
  el.trajectoryHint.hidden=game.phase!=="aim";
  el.next.hidden=game.phase!=="between";
  el.angle.disabled=game.phase!=="aim";
  el.power.disabled=game.phase!=="aim";
  el.angle.value=String(Math.round(game.angle));
  el.power.value=String(Math.round(game.power));
  el.angleValue.textContent=`${Math.round(game.angle)}°`;
  el.powerValue.textContent=`${Math.round(game.power)}%`;
  el.level.value=String(game.levelIndex);
  el.subtitle.textContent=LEVELS[game.levelIndex].subtitle;
  const complete=game.phase==="won"||game.phase==="lost";
  el.result.hidden=!complete;
  if(complete){
    const win=game.phase==="won",stars=starsFor(game);
    el.resultIcon.textContent=win?"🏆":"🔧";
    el.resultKicker.textContent=win?"MISSIÓ COMPLETADA":"TORNA-HO A PROVAR";
    el.resultTitle.textContent=win?"ESTRUCTURES A TERRA!":"ENCARA QUEDA FERRALLA";
    el.resultDescription.textContent=win
      ?`${format(game.score)} punts · ${game.shotsTotal-game.shotsLeft} rodes llançades · ${stars} estrelles.`
      :`Has aconseguit ${format(game.score)} punts. Prova un angle diferent o busca el vidre i els bidons.`;
    el.stars.textContent=win?"★".repeat(stars)+"☆".repeat(3-stars):"☆☆☆";
    el.stars.setAttribute("aria-label",`${stars} de 3 estrelles`);
    el.resultButton.textContent=win && game.levelIndex<LEVELS.length-1?
      "SEGÜENT NIVELL →":win?"TORNA A JUGAR ↻":"REINTENTA ↻";
  }
}
function reset(index=game.levelIndex){
  game=newGame(index);dragging=false;pointerId=null;previousPhase=game.phase;
  prevScore=0;noticeAge=0;el.notice.hidden=true;trail=[];scorePopups=[];trailClock=0;trackedProjectile=null;
  previewCacheKey=null;previewCache=null;
  syncUI();draw();
}
function announce(){
  const phase=game.phase;
  if(game.score>prevScore){
    if(!reducedMotion){const p=game.projectile;const x=clamp(p?.lastBounce?.x??p?.x??750,45,950),y=clamp(p?.lastBounce?.y??p?.y??300,65,WORLD.ground-20);scorePopups.push({x,y,points:game.score-prevScore,combo:game.combo,life:1.05});if(scorePopups.length>8)scorePopups.shift();}
    sound("impact");
    el.notice.textContent=game.combo>1?"COMBO!":"BOOM!";
    el.notice.hidden=false;noticeAge=.64;
  }
  if(phase!==previousPhase){
    if(phase==="won"){
      sound("win");
      if(game.score>storedBest(game.levelIndex))setBest(game.levelIndex,game.score);
      el.notice.textContent="NIVELL SUPERAT!";el.notice.hidden=false;noticeAge=1.1;
    }else if(phase==="lost") {
      el.notice.textContent="TORNA-HI!";el.notice.hidden=false;noticeAge=.75;
    }
    previousPhase=phase;
  }
  prevScore=game.score;
}
function toWorld(event){
  const rect=canvas.getBoundingClientRect();
  const sx=WORLD.width/Math.max(rect.width,1),sy=WORLD.height/Math.max(rect.height,1);
  return {x:(event.clientX-rect.left)*sx,y:(event.clientY-rect.top)*sy};
}
function grab(event){
  if(game.phase!=="aim"||(event.button!=null&&event.button!==0))return;
  const p=toWorld(event);
  if(Math.hypot(p.x-WORLD.anchor.x,p.y-WORLD.anchor.y)>170)return;
  event.preventDefault();
  pointerId=event.pointerId;dragging=true;
  try{canvas.setPointerCapture(pointerId);}catch{/* old browsers */}
  aimFromPointer(game,p.x,p.y);syncUI();
}
function move(event){
  if(!dragging||event.pointerId!==pointerId)return;
  event.preventDefault();
  const p=toWorld(event);
  aimFromPointer(game,p.x,p.y);syncUI();
}
function release(event){
  if(!dragging||event.pointerId!==pointerId)return;
  event.preventDefault();
  dragging=false;pointerId=null;
  if(event.type==="pointercancel"){syncUI();return;}
  fireAction();
}
canvas.addEventListener("pointerdown",grab);
canvas.addEventListener("pointermove",move);
canvas.addEventListener("pointerup",release);
canvas.addEventListener("pointercancel",release);
canvas.addEventListener("lostpointercapture",event=>{
  if(dragging&&event.pointerId===pointerId){dragging=false;pointerId=null;syncUI();}
});
el.fire.addEventListener("click",fireAction);
el.turbo.addEventListener("click",specialAction);
el.next.addEventListener("click",()=>{nextShot(game);syncUI();});
el.retry.addEventListener("click",()=>reset());
el.sound.addEventListener("click",()=>{
  soundEnabled=!soundEnabled;
  el.sound.setAttribute("aria-pressed",String(soundEnabled));
  el.sound.textContent=soundEnabled?"🔊 SO ACTIVAT":"🔇 SO DESACTIVAT";
  if(soundEnabled)sound("ability");
});
el.level.addEventListener("change",()=>reset(Number(el.level.value)));
el.angle.addEventListener("input",()=>{setAim(game,Number(el.angle.value),game.power);syncUI();});
el.power.addEventListener("input",()=>{setAim(game,game.angle,Number(el.power.value));syncUI();});
el.resultButton.addEventListener("click",()=>{
  reset(game.phase==="won"&&game.levelIndex<LEVELS.length-1?game.levelIndex+1:game.levelIndex);
});
window.addEventListener("keydown",event=>{
  if(event.target instanceof HTMLElement && (["BUTTON","SELECT","INPUT","A","TEXTAREA"].includes(event.target.tagName)||event.target.isContentEditable))return;
  if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))event.preventDefault();
  if(game.phase==="aim"){
    if(event.code==="ArrowUp")setAim(game,game.angle+2,game.power);
    if(event.code==="ArrowDown")setAim(game,game.angle-2,game.power);
    if(event.code==="ArrowRight")setAim(game,game.angle,game.power+3);
    if(event.code==="ArrowLeft")setAim(game,game.angle,game.power-3);
    if(event.code==="Space"&&!event.repeat)fireAction();
  }else if(game.phase==="flying"&&event.code==="Space"&&!event.repeat)specialAction();
  else if(game.phase==="between"&&event.code==="Space"&&!event.repeat)nextShot(game);
  else if((game.phase==="won"||game.phase==="lost")&&event.code==="Space"&&!event.repeat)
    reset(game.phase==="won"&&game.levelIndex<LEVELS.length-1?game.levelIndex+1:game.levelIndex);
  syncUI();
});
window.addEventListener("blur",()=>{dragging=false;pointerId=null;});
document.addEventListener("visibilitychange",()=>{if(document.hidden){dragging=false;pointerId=null;lastFrame=null;}});

function roundedRect(x,y,w,h,r=8){
  ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
}
function backdrop(){
  if(window.BiciParkArcadeArt){window.BiciParkArcadeArt.industrial(ctx,WORLD.width,WORLD.height,WORLD.ground);return;}
  const sky=ctx.createLinearGradient(0,0,0,520);
  sky.addColorStop(0,"#61bbd9");sky.addColorStop(.47,"#b9f6d2");sky.addColorStop(1,"#f5dbac");
  ctx.fillStyle=sky;ctx.fillRect(0,0,WORLD.width,WORLD.height);
  ctx.fillStyle="#fff4b7";
  ctx.beginPath();ctx.arc(854,116,60,0,Math.PI*2);ctx.fill();
  const shift=game.shotTime*3;
  ctx.fillStyle="rgba(255,255,255,.62)";
  for(let i=0;i<7;i++){
    const x=((i*194+32+shift)%1200)-80,y=85+(i%3)*43;
    ctx.beginPath();ctx.ellipse(x,y,53,17,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+20,y-5,19,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle="#76cbb5";ctx.beginPath();
  ctx.moveTo(0,353);ctx.quadraticCurveTo(190,235,410,353);
  ctx.quadraticCurveTo(625,220,1000,345);ctx.lineTo(1000,540);
  ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  ctx.fillStyle="#3e8d8e";ctx.beginPath();
  ctx.moveTo(0,400);ctx.quadraticCurveTo(224,311,415,387);
  ctx.quadraticCurveTo(712,296,1000,398);
  ctx.lineTo(1000,560);ctx.lineTo(0,560);ctx.closePath();ctx.fill();
  // Scrap-yard skyline and bicycles are original procedural shapes.
  ctx.fillStyle="#285e76";
  for(let i=0;i<22;i++){
    const x=i*49+9,h=26+(i*23%65);
    ctx.fillRect(x,WORLD.ground-h,28,h);
    ctx.fillRect(x+7,WORLD.ground-h-13,5,13);
  }
  ctx.fillStyle="#35594e";ctx.fillRect(0,WORLD.ground,1000,50);
  ctx.fillStyle="#567b52";ctx.fillRect(0,WORLD.ground,1000,7);
  ctx.fillStyle="rgba(255,240,174,.17)";
  for(let x=0;x<1000;x+=36)ctx.fillRect(x,WORLD.ground+15,17,3);
  ctx.save();ctx.globalAlpha=.8;
  for(const x of [295,468,956]){
    ctx.fillStyle="#20485b";ctx.fillRect(x,WORLD.ground-61,5,61);
    ctx.strokeStyle="#cfffe1";ctx.lineWidth=4;ctx.beginPath();
    ctx.arc(x+3,WORLD.ground-72,13,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function drawSling(){
  const a=WORLD.anchor;
  ctx.lineCap="round";
  ctx.strokeStyle="#5a3956";ctx.lineWidth=17;
  ctx.beginPath();ctx.moveTo(a.x-12,a.y+70);ctx.lineTo(a.x-16,a.y-9);
  ctx.lineTo(a.x-29,a.y-24);ctx.moveTo(a.x-12,a.y-9);ctx.lineTo(a.x+20,a.y-35);ctx.stroke();
  ctx.strokeStyle="#f9da98";ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(a.x-26,a.y-25);ctx.lineTo(a.x-13,a.y-9);
  ctx.moveTo(a.x+18,a.y-34);ctx.lineTo(a.x-13,a.y-8);ctx.stroke();
  ctx.fillStyle="#6d4054";roundedRect(a.x-31,a.y+64,43,47,7);ctx.fill();
}
function drawAim(){
  if(game.phase!=="aim")return;
  const theta=game.angle*Math.PI/180,force=115+game.power*5.1;
  const a=WORLD.anchor;
  const pull=19+game.power*.72;
  const px=a.x-Math.cos(theta)*pull,py=a.y+Math.sin(theta)*pull;
  // Curved trajectory ghost uses same base launch velocity and gravity.
  ctx.save();
  ctx.strokeStyle="#744b64";ctx.lineWidth=6;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(a.x-29,a.y-24);ctx.lineTo(px,py);
  ctx.lineTo(a.x+20,a.y-35);ctx.stroke();
  const prediction=cachedPrediction();
  for(let i=1;i<prediction.points.length;i++){
    const point=prediction.points[i];
    ctx.fillStyle=`rgba(255,250,190,${Math.max(.22,.9-i*.017)})`;
    ctx.beginPath();ctx.arc(point.x,point.y,Math.max(2,5-i*.06),0,Math.PI*2);ctx.fill();
  }
  if(prediction.hit){
    const {x,y,kind}=prediction.hit;
    ctx.strokeStyle=kind==="bomb"?"#fa6043":kind==="robot"?"#f0fd55":"#e9f8ef";
    ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x+24,y);
    ctx.moveTo(x,y-24);ctx.lineTo(x,y+24);ctx.stroke();
  }
  drawWheel(px,py,-theta,.95,upcomingShot(game).id);
  ctx.fillStyle="#123a50";ctx.font="900 15px system-ui";ctx.textAlign="center";
  ctx.fillText(`${Math.round(game.angle)}° · ${Math.round(game.power)}%`,a.x+90,a.y-92);
  ctx.restore();
}
function drawWheel(x,y,rotation=0,size=1,type="impact"){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size,size);
  const wheelColor=SHOT_TYPES.find(kind=>kind.id===type)?.color||"#9ee6ed";
  const tire=ctx.createLinearGradient(-18,-18,18,18);tire.addColorStop(0,"#596777");tire.addColorStop(.35,"#213044");tire.addColorStop(1,"#101b2d");
  ctx.fillStyle=tire;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#0e2236";ctx.lineWidth=2;ctx.stroke();
  // Individually rotating treads and different rim designs convey each wheel's power.
  for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.fillStyle=i%2?"#657888":"#394d62";ctx.fillRect(-2.4,-19,4.8,4);ctx.restore();}
  ctx.fillStyle="#24394e";ctx.beginPath();ctx.arc(0,0,13.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=wheelColor;ctx.lineWidth=3.5;ctx.stroke();
  ctx.strokeStyle="#d3ffe2";ctx.lineWidth=2;
  for(let i=0;i<(type==="drill"?6:8);i++){let a=i*Math.PI/(type==="drill"?3:4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*12,Math.sin(a)*12);ctx.stroke();}
  ctx.fillStyle=wheelColor;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#eaffef";ctx.lineWidth=1.5;ctx.stroke();
  if(type==="pulse"){ctx.strokeStyle="#d7fff7";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();}
  if(type==="drill"){ctx.strokeStyle=wheelColor;ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.beginPath();ctx.moveTo(-3,-16);ctx.lineTo(0,-21);ctx.lineTo(3,-16);ctx.stroke();ctx.restore();}}
  ctx.restore();
}
function updateFlightEffects(dt){
  if(reducedMotion){trail=[];scorePopups=[];return;}
  const p=game.projectile;
  if(p!==trackedProjectile){trail=[];trailClock=0;trackedProjectile=p;}
  for(const t of trail)t.life-=dt;trail=trail.filter(t=>t.life>0);
  for(const pop of scorePopups){pop.life-=dt;pop.y-=dt*38;}scorePopups=scorePopups.filter(p=>p.life>0);
  if(!p?.active||game.phase!=="flying")return;
  trailClock+=dt;
  if(trailClock>=.025){trailClock=0;trail.push({x:p.x,y:p.y,life:.3,type:p.type,turbo:p.turbo});if(trail.length>16)trail.shift();}
}
function drawFlightEffects(){
  for(const t of trail){const color=SHOT_TYPES.find(k=>k.id===t.type)?.color||"#def8ff";const f=t.life/.3;ctx.save();ctx.globalAlpha=f*.32;ctx.fillStyle=color;ctx.beginPath();ctx.arc(t.x,t.y,(t.turbo?12:7)*f+2,0,Math.PI*2);ctx.fill();ctx.restore();}
  const p=game.projectile;if(!p?.active||!p.turbo||reducedMotion)return;
  const angle=Math.atan2(p.vy,p.vx);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
  for(let i=0;i<5;i++){ctx.globalAlpha=.55-i*.08;ctx.strokeStyle=i%2?"#fff8ba":"#80f9dc";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20-i*5,-8+i*4);ctx.lineTo(-42-i*7,-8+i*4);ctx.stroke();}ctx.restore();
}
function drawScorePopups(){
  for(const p of scorePopups){ctx.save();ctx.globalAlpha=Math.min(1,p.life*3);ctx.font="900 21px system-ui";ctx.textAlign="center";ctx.strokeStyle="#182b3b";ctx.lineWidth=5;const text=(p.combo>1?"COMBO!  ":"")+"+"+format(p.points);ctx.strokeText(text,p.x,p.y);ctx.fillStyle="#fff195";ctx.fillText(text,p.x,p.y);ctx.restore();}
}
function drawBlock(b){
  const colors={wood:["#b96d45","#f4bc78","#7a4a41"],glass:["#51c6dc","#bff9fa","#2e829d"],steel:["#537082","#c0e0e4","#334d65"]};
  const [base,light,edge]=colors[b.material];
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
  ctx.fillStyle="rgba(2,38,40,.15)";roundedRect(-b.w/2+4,-b.h/2+5,b.w,b.h,6);ctx.fill();
  ctx.fillStyle=base;roundedRect(-b.w/2,-b.h/2,b.w,b.h,5);ctx.fill();
  ctx.strokeStyle=edge;ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle=light;
  roundedRect(-b.w/2+6,-b.h/2+7,Math.max(5,b.w-12),8,3);ctx.fill();
  ctx.strokeStyle=b.material==="glass"?"rgba(255,255,255,.7)":"rgba(30,49,58,.28)";
  ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-b.w/2+9,-b.h/2+18);ctx.lineTo(b.w/2-10,b.h/2-9);ctx.stroke();
  if(b.material==="steel"){
    ctx.fillStyle="#e3f6ec";
    for(const xx of [-b.w/2+9,b.w/2-9])for(const yy of [-b.h/2+9,b.h/2-9]){
      ctx.beginPath();ctx.arc(xx,yy,2.8,0,Math.PI*2);ctx.fill();
    }
  }
  window.BiciParkArcadeArt?.material(ctx,b,[base,light,edge]);
  if(b.hp<26){ctx.strokeStyle="#132a3bbb";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-b.h/2);ctx.lineTo(2,-4);ctx.lineTo(-5,8);ctx.lineTo(8,b.h/2);ctx.stroke();}
  ctx.restore();
}
function drawRobot(t){
  ctx.save();ctx.translate(t.x,t.y);
  ctx.fillStyle="rgba(10,53,69,.2)";ctx.beginPath();ctx.ellipse(0,19,19,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#c7fa74";ctx.strokeStyle="#2f5557";ctx.lineWidth=3;
  roundedRect(-17,-16,34,33,9);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#2f5557";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(0,-26);ctx.stroke();
  ctx.fillStyle="#f9e5a4";ctx.beginPath();ctx.arc(0,-28,4,0,Math.PI*2);ctx.fill();
  const blink=t.blink>2.6;
  ctx.fillStyle="#1b4252";
  for(const x of [-8,8]){roundedRect(x-4,-6,8,blink?2:9,3);ctx.fill();}
  ctx.strokeStyle="#31635f";ctx.beginPath();ctx.arc(0,7,6,0,Math.PI);ctx.stroke();
  ctx.restore();
}
function drawBomb(b){
  ctx.save();ctx.translate(b.x,b.y);
  ctx.fillStyle="#e66b52";ctx.strokeStyle="#7e2d4a";ctx.lineWidth=3;
  roundedRect(-15,-17,30,34,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#ffee9b";ctx.font="1000 18px system-ui";ctx.textAlign="center";ctx.fillText("✶",0,7);
  ctx.strokeStyle="#ffe0a8";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-12,-8);ctx.lineTo(12,-8);ctx.stroke();ctx.restore();
}
function drawShockwaves(){
  for(const ring of game.pulses){
    const t=clamp(ring.elapsed/ring.duration,0,1);
    ctx.save();
    ctx.strokeStyle=`rgba(139,255,228,${1-t})`;
    ctx.lineWidth=(1-t)*8+2;
    ctx.beginPath();
    ctx.arc(ring.x,ring.y,ring.radius*(.13+.87*t),0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle=`rgba(132,250,234,${.2*(1-t)})`;
    ctx.beginPath();ctx.arc(ring.x,ring.y,ring.radius*(.13+.87*t),0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}
function drawDebris(){
  for(const d of game.debris){
    ctx.save();ctx.globalAlpha=clamp(d.life/d.maxLife,0,1);
    ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
function drawBounceHalo(){
  const hit=game.projectile?.lastBounce;
  if(!hit||reducedMotion)return;
  const age=game.shotTime-hit.at;
  if(age<0||age>.32)return;
  const progress=age/.32;
  ctx.save();
  ctx.globalAlpha=(1-progress)*.78;
  ctx.lineWidth=4.5-progress*2.5;
  ctx.strokeStyle=hit.kind==="steel"?"#a6dfff":
    hit.kind==="glass"?"#bdfff3":hit.kind==="ground"?"#f1e2ad":"#ffd5a1";
  ctx.beginPath();
  ctx.arc(hit.x,hit.y,24+progress*27,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
}
function draw(){
  if(!ctx)return;
  ctx.clearRect(0,0,WORLD.width,WORLD.height);
  ctx.save();
  if(game.shake>0&&!reducedMotion){
    ctx.translate(Math.sin(game.shotTime*90)*game.shake,Math.cos(game.shotTime*67)*game.shake*.4);
  }
  backdrop();
  for(const b of game.blocks){if(!b.dead)drawBlock(b);}
  for(const b of game.bombs){if(!b.dead)drawBomb(b);}
  for(const r of game.robots){if(!r.dead)drawRobot(r);}
  drawShockwaves();
  drawSling();
  drawAim();
  const p=game.projectile;
  drawFlightEffects();
  if(p&&p.active)drawWheel(p.x,p.y,p.angle,1,p.type);
  drawBounceHalo();
  drawDebris();drawScorePopups();
  if(game.phase==="won"&&!reducedMotion){
    const t=game.celebration;
    for(let i=0;i<22;i++){
      const x=(i*47+game.score*3)%1000,y=80+(i*19)%260;
      ctx.globalAlpha=Math.max(0,t/1.5);
      ctx.fillStyle=i%2?"#eafd76":"#7df7de";ctx.fillRect(x,y,7,18);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
  window.BiciParkArcadeArt?.pixelFrame(ctx);
}
function loop(now){
  if(lastFrame===null)lastFrame=now;
  const dt=Math.min((now-lastFrame)/1000,.055);
  lastFrame=now;
  step(game,dt);updateFlightEffects(dt);
  if(noticeAge>0){
    noticeAge=Math.max(0,noticeAge-dt);
    if(noticeAge===0)el.notice.hidden=true;
  }
  announce();
  syncUI();
  draw();
  requestAnimationFrame(loop);
}
reset(0);
requestAnimationFrame(loop);
