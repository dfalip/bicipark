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
let camera={x:0,y:0,z:1};
let trail=[],scorePopups=[],trailClock=0,trackedProjectile=null,shotTrace=[],lastTrace=[];
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
  if(fire(game)){trail=[];shotTrace=[];trailClock=0;sound("launch");}
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
    return game.projectile?.type==="blast"?"Prem Espai prop dels blocs per detonar!":game.projectile?.type==="split"?"Prem Espai per dividir la roda!":game.projectile?.type==="spring"?"Prem Espai per fer un super salt!":game.projectile?.type==="pulse"?"Prem ✦ o Espai prop d'una torre: ona expansiva!":
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
    el.turbo.textContent=wheel.id==="blast"?"✹ DETONA":wheel.id==="split"?"✦ DIVIDEIX":wheel.id==="spring"?"↗ SUPER REBOT":wheel.id==="pulse"?"✦ ONA EXPANSIVA":
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
  camera={x:0,y:0,z:1};prevScore=0;noticeAge=0;el.notice.hidden=true;trail=[];scorePopups=[];trailClock=0;trackedProjectile=null;shotTrace=[];lastTrace=[];
  previewCacheKey=null;previewCache=null;
  syncUI();draw();
}
function announce(){
  const phase=game.phase;
  if(game.score>prevScore){
    if(!reducedMotion){const p=game.projectile;const x=clamp(p?.lastBounce?.x??p?.x??750,45,950),y=clamp(p?.lastBounce?.y??p?.y??300,65,WORLD.ground-20);scorePopups.push({x,y,points:game.score-prevScore,combo:game.combo,life:1.05});if(scorePopups.length>8)scorePopups.shift();}
    sound("impact");
    el.notice.textContent=game.combo>=4?"DEMOLICIÓ!":game.combo>1?"COMBO ×"+game.combo:"BOOM!";
    el.notice.hidden=false;noticeAge=.64;
  }
  if(phase!==previousPhase){
    if(previousPhase==="flying"&&shotTrace.length)lastTrace=shotTrace.slice();
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
  return {x:((event.clientX-rect.left)*sx-camera.x)/camera.z,y:((event.clientY-rect.top)*sy-camera.y)/camera.z};
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
// Hand-drawn scenic layers, cached per arena. Foreground contrast reserved for targets.
let arenaCache=null,arenaCacheKey=-1;
function scene(c,theme){
 const W=1000,H=560,ground=510;
 const grad=(x,y,x2,y2,stops)=>{const g=c.createLinearGradient(x,y,x2,y2);for(const [p,col] of stops)g.addColorStop(p,col);return g;};
 const poly=(pts,fill,edge=null,sw=1)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=sw;c.stroke();}};
 const line=(pts,col,w=1)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.stroke();};
 const oval=(x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();};
 const palette=theme==="tunnel"?["#273444","#637985","#a69e8a"]:theme==="workshop"?["#4d7385","#9bbeb9","#eed1a2"]:theme==="yard"?["#536f94","#aab9c6","#f2c47e"]:["#3f829c","#a1d2cd","#f3d4a3"];
 c.fillStyle=grad(0,0,0,ground,[[0,palette[0]],[.55,palette[1]],[1,palette[2]]]);c.fillRect(0,0,W,H);
 oval(825,116,67,67,"#fff1bd88");oval(825,116,43,43,"#fff6cfbb");
 for(let i=0;i<8;i++){let x=(i*173+31)%1100,y=58+i%3*34;oval(x,y,48,13,"#edf0d88a");oval(x+17,y-9,26,18,"#edf0d880");}
 for(let z=0;z<2;z++){const pts=[[0,ground]];for(let x=0;x<=W;x+=20)pts.push([x,300+z*65+Math.sin(x/140+z)*30+Math.sin(x/47)*9]);pts.push([W,ground]);poly(pts,z?"#557d80":"#85a5a4");}
 // Silhouettes of corrugated sheds, rooftop vents, glazed factory bays.
 for(let i=0;i<7;i++){const x=i*164-30,w=132+(i%3)*12,h=90+(i*37%80),y=ground-h-40;const col=i%2?"#627d84":"#59707d";poly([[x,y],[x+w*.45,y-25],[x+w,y],[x+w,ground],[x,ground]],col);
 c.fillStyle="#83999b";c.fillRect(x+8,y+14,w-16,8);for(let j=0;j<4;j++){c.fillStyle="#3b596771";c.fillRect(x+11+j*(w-17)/4,y+37,19,36);line([[x+13+j*(w-17)/4,y+39],[x+26+j*(w-17)/4,y+39]],"#d6ded477",2);}
 c.fillStyle="#617984";c.fillRect(x+w-22,y-39,12,39);for(let q=0;q<4;q++)line([[x+4,y+62+q*17],[x+w-4,y+62+q*17]],"#9aafb044");
 }
 // A crane and stacked scrap in mid-ground, deliberately low contrast.
 const cx=theme==="yard"?860:330;line([[cx,455],[cx,171],[cx-180,171]],"#536775",11);line([[cx,174],[cx-180,174],[cx-88,205],[cx,174]],"#8c9e9f",4);line([[cx-156,174],[cx-156,286]],"#576b75",2);oval(cx-156,291,5,7,"#566b75");
 for(let i=0;i<19;i++){const x=(i*79+27)%1000,y=ground-19-(i%4)*9;oval(x,y,26,13,"#456371");oval(x,y,14,7,"#789193");}
 if(theme==="tunnel"){poly([[0,0],[1000,0],[1000,133],[820,89],[180,89],[0,133]],"#304454");for(let x=80;x<1000;x+=170){c.fillStyle="#f3d89d";c.fillRect(x,52,60,8);}}
 if(theme==="workshop"){for(let x=10;x<1000;x+=240){line([[x,120],[x,452]],"#466775",10);line([[x,120],[x+190,120]],"#466775",9);}}
 // Continuous ground: worn asphalt, curb, diagonal industrial verge.
 c.fillStyle=grad(0,ground,0,H,[[0,"#455155"],[1,"#253843"]]);c.fillRect(0,ground,W,H-ground);
 c.fillStyle="#b6aa84";c.fillRect(0,ground,1000,5);c.fillStyle="#796f59";c.fillRect(0,ground+5,1000,5);
 for(let i=0;i<40;i++){let x=i*27%1000,y=ground+14+(i*19%31);line([[x,y],[x+9+(i%5)*3,y-1]],"#95a1a14d",1);}
 for(let x=-20;x<1000;x+=42){poly([[x,542],[x+18,542],[x+7,558],[x-11,558]],"#d8b76170");}
}
function backdrop(){
 const theme=LEVELS[game.levelIndex].theme||"scrap";
 if(arenaCacheKey!==game.levelIndex){arenaCache=null;arenaCacheKey=game.levelIndex;try{const cv=document.createElement("canvas");cv.width=1000;cv.height=560;const cc=cv.getContext("2d");if(cc){scene(cc,theme);arenaCache=cv;}}catch{}}
 if(arenaCache)ctx.drawImage(arenaCache,0,0);else scene(ctx,theme);
}
function updateCamera(dt){
 const p=game.projectile,focus=game.phase==="flying"&&!reducedMotion&&p&&p.x>360;
 const z=focus?1.16:1, x=focus?clamp(500-p.x*z,WORLD.width*(1-z),0):0,y=focus?clamp(290-p.y*z,WORLD.height*(1-z),0):0;
 const f=Math.min(1,dt*4);camera.z+=(z-camera.z)*f;camera.x+=(x-camera.x)*f;camera.y+=(y-camera.y)*f;
 if(game.phase==="aim"||reducedMotion)camera={x:0,y:0,z:1};
}
function drawSling(){
 const a=WORLD.anchor;ctx.save();ctx.translate(a.x,a.y);
 artOval(0,118,55,7,"#14243160");
 ctx.fillStyle="#233e4d";roundedRect(-39,91,78,29,5);ctx.fill();ctx.strokeStyle="#132435";ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle="#a7bbc0";roundedRect(-32,91,64,8,3);ctx.fill();
 for(const side of [-1,1]){artLine([[side*23,98],[side*15,42],[side*8,-6],[side*24,-31]],"#24394a",17);artLine([[side*23,98],[side*15,42],[side*8,-6],[side*24,-31]],"#c98d49",11);artLine([[side*23-2,94],[side*15-2,42],[side*8-2,-7],[side*24-2,-31]],"#f2cb80",3);artOval(side*24,-31,8,8,"#647f8b","#182c3c",2);rivet(side*24,-31);rivet(side*23,98);}
 artLine([[-20,55],[20,55]],"#3e5967",8);artLine([[-18,53],[18,53]],"#9eb6b9",3);ctx.restore();
}
function drawAim(){
  if(game.phase!=="aim")return;
  const theta=game.angle*Math.PI/180,force=115+game.power*5.1;
  const a=WORLD.anchor;
  const pull=19+game.power*.72;
  const px=a.x-Math.cos(theta)*pull,py=a.y+Math.sin(theta)*pull;
  // Curved trajectory ghost uses same base launch velocity and gravity.
  ctx.save();
  ctx.strokeStyle="#442b39";ctx.lineWidth=8;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(a.x-24,a.y-31);ctx.lineTo(px,py);
  ctx.lineTo(a.x+24,a.y-31);ctx.stroke();
  ctx.strokeStyle="#f1bd72";ctx.lineWidth=3;ctx.stroke();
  // The previous shot stays visible while aiming, to encourage learning by iteration.
  for(let i=0;i<lastTrace.length;i+=3){const q=lastTrace[i];ctx.fillStyle="#e4f6ec60";ctx.beginPath();ctx.arc(q.x,q.y,2.1,0,Math.PI*2);ctx.fill();}
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
  if(trailClock>=.025){trailClock=0;trail.push({x:p.x,y:p.y,life:.3,type:p.type,turbo:p.turbo});if(shotTrace.length<350)shotTrace.push({x:p.x,y:p.y});if(trail.length>16)trail.shift();}
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
// Original industrial-cartoon art, aligned with each physical collision rectangle.
function artLine(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();}
function artOval(x,y,rx,ry,fill,edge,width=1.5){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(edge){ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.stroke();}}
function artGradient(x,y,x2,y2,stops){const g=ctx.createLinearGradient(x,y,x2,y2);for(const [p,col] of stops)g.addColorStop(p,col);return g;}
function rivet(x,y){artOval(x,y,2.6,2.6,"#233c4d");artOval(x-.6,y-.7,1.5,1.3,"#c9d9d8");}
function drawBlock(b){
 const w=b.w,h=b.h,l=-w/2,t=-h/2,wide=w>h*1.65,ink="#253447";
 const damage=1-clamp(b.hp/({wood:60,glass:32,steel:145}[b.material]),0,1);
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
 ctx.fillStyle="#182f4330";roundedRect(l+3,t+5,w,h,3);ctx.fill();
 ctx.save();roundedRect(l,t,w,h,3);ctx.clip();
 if(b.material==="wood"){
   // Long beams are built from planks; short columns read as reinforced crates.
   ctx.fillStyle=artGradient(l,t,l+w,t+h,[[0,"#ffd28b"],[.35,"#dca169"],[1,"#98603f"]]);ctx.fillRect(l,t,w,h);
   const rows=wide?Math.max(2,Math.round(h/9)):Math.max(2,Math.round(w/15));
   for(let i=1;i<rows;i++){if(wide)artLine([[l,t+h*i/rows],[l+w,t+h*i/rows]],"#825034",1.5);else artLine([[l+w*i/rows,t],[l+w*i/rows,t+h]],"#825034",1.5);}
   for(let i=0;i<7;i++){let yy=t+4+(i*13%Math.max(6,h-7));artLine([[l+3,yy],[l+w*.3,yy+2],[l+w*.7,yy-1],[l+w-3,yy+1]],"#83533355",1);}
   if(!wide&&h>35){artLine([[l+5,t+h-5],[l+w-5,t+5]],"#77482f",9);artLine([[l+5,t+h-5],[l+w-5,t+5]],"#edb77b",5);}
   for(const x of [l+5,l+w-5])for(const y of [t+5,t+h-5])rivet(x,y);
   artLine([[l+2,t+2],[l+w-2,t+2]],"#fff1bb",2);
 }else if(b.material==="steel"){
   // I-beams and riveted box trusses. The outer envelope remains collidable.
   ctx.fillStyle=artGradient(l,t,l+w,t+h,[[0,"#a5bdc5"],[.3,"#526f83"],[1,"#283e56"]]);ctx.fillRect(l,t,w,h);
   const inset=Math.min(7,w*.17,h*.23);ctx.fillStyle="#253c50";ctx.fillRect(l+inset,t+inset,w-2*inset,h-2*inset);
   if(wide){for(let x=l+inset;x<l+w-inset;x+=25)artLine([[x,t+h-inset],[Math.min(x+25,l+w-inset),t+inset]],"#8ca5b1",4);}
   else{artLine([[l+inset,t+inset],[l+w-inset,t+h-inset]],"#7496a6",5);artLine([[l+w-inset,t+inset],[l+inset,t+h-inset]],"#7496a6",5);}
   for(const y of [t+3,t+h-3]){artLine([[l+2,y],[l+w-2,y]],"#d2e2df",2);for(let x=l+7;x<l+w-3;x+=Math.max(12,w/5))rivet(x,y);}
   if(!wide)for(let y=t+10;y<t+h-8;y+=17){rivet(l+4,y);rivet(l+w-4,y);}
 }else{
   // Transparent reinforced workshop glazing, with angled reflections.
   ctx.fillStyle=artGradient(l,t,l+w,t+h,[[0,"#d4ffffd9"],[.44,"#67d5ed99"],[1,"#2686b8bb"]]);ctx.fillRect(l,t,w,h);
   for(let i=0;i<2;i++){artLine([[l+w*.12+i*8,t+h*.8],[l+w*.65+i*8,t+h*.08]],"#f0ffffaa",3);}
   artLine([[l+3,t+h-3],[l+3,t+3],[l+w-3,t+3]],"#eaffff",2.5);
   for(const x of [l+4,l+w-4])for(const y of [t+4,t+h-4])rivet(x,y);
 }
 if(damage>.22){
   if(b.material==="steel"){artOval(0,0,Math.max(3,w*.22),Math.max(3,h*.27),"#1c2c4d70","#76909c",1.5);artLine([[l+4,t+h*.68],[w*.2,t+h*.34]],"#d8e0da",1.4);}
   else{const n=damage>.65?5:damage>.4?3:1;for(let i=0;i<n;i++){const angle=i*2.1-.7,dx=Math.cos(angle)*w*.49,dy=Math.sin(angle)*h*.49;artLine([[0,0],[dx*.38+2,dy*.45-2],[dx*.67-2,dy*.7+2],[dx,dy]],b.material==="glass"?"#e0ffff":"#55392e",b.material==="glass"?1.6:2.1);}}
 }
 ctx.restore();ctx.strokeStyle=ink;ctx.lineWidth=b.material==="glass"?2:2.5;roundedRect(l,t,w,h,3);ctx.stroke();ctx.restore();
}
function drawRobot(t){
 const p=game.projectile,scared=game.phase==="flying"&&p?.active&&Math.hypot(p.x-t.x,p.y-t.y)<190;
 const moving=!reducedMotion&&game.phase==="flying",wobble=moving?Math.sin(game.shotTime*14+t.x)*Math.min(.2,Math.hypot(t.vx,t.vy)/300):0;
 const variant=(game.robots.indexOf(t)+game.levelIndex)%3,ink="#192e40",shell=["#e4ac47","#58c7b1","#a3a5df"][variant],blink=t.blink>2.6;
 const bob=moving?Math.sin(game.shotTime*8+t.x)*1.5:0;
 const look=scared?clamp((p.x-t.x)/60,-2.5,2.5):0;
 ctx.save();ctx.translate(t.x,t.y);artOval(0,18,21,5,"#172d4050");ctx.rotate(wobble);
 const lens=(x,y,rx,ry)=>{artOval(x,y,rx,ry,"#1d394f",ink,1.5);artOval(x,y,rx-2,ry-2,"#d5ffff");if(blink)artLine([[x-rx*.5,y],[x+rx*.5,y]],ink,2);else{artOval(x+look,y,scared?2.4:3.5,scared?4:3.3,ink);artOval(x+look-1,y-1,1,1,"#fff");}};
 if(variant===0){
   // Scout: inverted egg-shaped shell, two mechanical running feet.
   for(const side of [-1,1]){artLine([[side*5,5],[side*8,12],[side*11,15]],ink,6);artLine([[side*5,5],[side*8,12]],"#8faeb9",3);artOval(side*11,15,7,3,"#344e60",ink);}
   artOval(0,5,10,10,"#647d80",ink,2);
   ctx.translate(0,bob);artOval(0,-10,16,15,artGradient(-14,-25,12,5,[[0,"#fff1b0"],[.4,shell],[1,"#a65b35"]]),ink,2.6);
   artOval(-12,-9,3,6,"#bb7f38",ink);artOval(12,-9,3,6,"#bb7f38",ink);
   lens(-6,-11,7,7);lens(6,-11,7,7);
   if(scared)artOval(0,-1,3,4,ink);else artLine([[-4,-1],[0,1],[4,-1]],ink,1.8);
   artLine([[-5,-23],[-13,-33]],ink,2.5);artOval(-13,-33,4,4,scared?"#ff6348":"#f8d561",ink);
 }else if(variant===1){
   // Heavy repair bot: tank treads, separate lifting pincers and protective hardhat.
   for(const side of [-1,1]){ctx.fillStyle="#20394b";roundedRect(side*10-7,8,14,11,4);ctx.fill();for(let i=0;i<3;i++)artOval(side*10-4+i*4,13,2,2,"#90a5ae");}
   artOval(0,5,14,12,artGradient(-14,-7,14,15,[[0,"#a5f2c9"],[1,"#287d7d"]]),ink,2);
   for(const side of [-1,1]){const lift=scared?-9:0;artLine([[side*11,2],[side*18,5+lift],[side*20,1+lift]],ink,5);artLine([[side*11,2],[side*18,5+lift]],"#b5c6c3",2);artLine([[side*17,0+lift],[side*21,-4+lift],[side*23,0+lift]],"#eab45e",3);}
   ctx.translate(0,bob);artOval(0,-12,17,12,"#5b8893",ink,2);lens(-6,-11,6,5);lens(6,-11,6,5);
   ctx.beginPath();ctx.ellipse(0,-15,19,13,0,Math.PI,Math.PI*2);ctx.fillStyle="#e5a84b";ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=2.5;ctx.stroke();artLine([[-19,-15],[19,-15]],"#ffe4a3",4);artLine([[-4,-27],[4,-27]],"#fff3bb",3);
   if(scared)artOval(0,-3,3,3,ink);else artLine([[-5,-4],[5,-4]],ink,1.5);
 }else{
   // Core unit: round reactor, tripod support and panoramic electronic visor.
   for(const side of [-1,1]){artLine([[0,5],[side*11,12],[side*14,16]],ink,5);artLine([[0,5],[side*11,12]],"#b4a8d9",2);artOval(side*14,16,5,2.8,"#58627d",ink);}
   artOval(0,0,16,17,artGradient(-15,-20,15,14,[[0,"#f1e6ff"],[.3,shell],[1,"#4c527c"]]),ink,2.5);artOval(0,6,8,7,"#3f506e",ink);artOval(0,6,4,4,scared?"#ff775e":"#95f6de");
   ctx.translate(0,bob);artOval(0,-9,15,9,"#23394d",ink,2);artOval(0,-9,12,6.5,"#6fc7dc");for(const x of [-5,5]){if(blink)artLine([[x-3,-9],[x+3,-9]],ink,1.6);else artOval(x+look,-9,2.3,scared?4:2.8,ink);}
   artLine([[0,-18],[0,-28]],ink,3);artOval(0,-29,5,3,"#c2ffea",ink);
 }
 ctx.restore();
}
function drawBomb(b){
 ctx.save();ctx.translate(b.x,b.y);
 const g=artGradient(-15,0,15,0,[[0,"#793c41"],[.35,"#ef774e"],[.68,"#bf493c"],[1,"#6a303e"]]);ctx.fillStyle=g;roundedRect(-15,-17,30,34,5);ctx.fill();ctx.strokeStyle="#283444";ctx.lineWidth=2.5;ctx.stroke();
 for(const y of [-12,12]){artOval(0,y,14,3,"#6d3540","#263343");artLine([[-12,y],[12,y]],"#efaa76",1.5);}
 ctx.fillStyle="#f5cb61";ctx.fillRect(-10,-6,20,12);ctx.fillStyle="#30394a";for(let x=-9;x<10;x+=7){ctx.beginPath();ctx.moveTo(x,-6);ctx.lineTo(x+4,-6);ctx.lineTo(x-1,6);ctx.lineTo(x-5,6);ctx.fill();}artOval(0,-17,5,3,"#293c4e");ctx.restore();
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
    ctx.fillStyle=d.color;ctx.translate(d.x,d.y);ctx.rotate((d.vx*.01+d.life*5));ctx.beginPath();if(d.material==="glass"){ctx.moveTo(-d.r,-d.r);ctx.lineTo(d.r*1.5,-d.r*.3);ctx.lineTo(0,d.r*2);ctx.closePath();ctx.fill();}else if(d.material==="wood"){ctx.fillRect(-d.r*2,-d.r*.5,d.r*4,d.r);}else if(d.material==="steel"){ctx.fillRect(-d.r,-d.r,d.r*2,d.r*2);}else{ctx.arc(0,0,d.r,0,Math.PI*2);ctx.fill();}ctx.restore();
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
  ctx.translate(camera.x,camera.y);ctx.scale(camera.z,camera.z);
  backdrop();
  for(const b of game.blocks){if(!b.dead)drawBlock(b);}
  for(const b of game.bombs){if(!b.dead)drawBomb(b);}
  for(const r of game.robots){if(!r.dead)drawRobot(r);}
  drawShockwaves();
  drawSling();
  // Preview the actual remaining wheel queue rather than a text-only ammo count.
  for(let i=0;i<Math.min(game.shotsLeft,8);i++){const k=upcomingShot(game,i);drawWheel(45+i*29,WORLD.ground-16,0,.59,k.id);}
  drawAim();
  const p=game.projectile;
  drawFlightEffects();
  if(p&&p.active)drawWheel(p.x,p.y,p.angle,1,p.type);
  for(const q of game.extras||[])if(q.active)drawWheel(q.x,q.y,q.angle,.62,"split");
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
  // No generic pixel filter: preserve deliberately illustrated edges and depth.
}
function loop(now){
  if(lastFrame===null)lastFrame=now;
  const dt=Math.min((now-lastFrame)/1000,.055);
  lastFrame=now;
  step(game,dt);updateFlightEffects(dt);updateCamera(dt);
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
