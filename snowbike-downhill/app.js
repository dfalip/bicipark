import {COURSES,clamp,skiTrackCenter,makeGame,start,pause,resume,boost,jump,trick,step,scoreFinish} from "./engine.js";
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const ui={course:$("courseSelect"),time:$("timeValue"),speed:$("speedValue"),
 gates:$("gatesValue"),penalty:$("penaltyValue"),hearts:$("heartsValue"),
 best:$("bestValue"),zone:$("zoneValue"),phase:$("phaseValue"),
 progress:$("progressFill"),progressText:$("progressValue"),notice:$("notice"),
 status:$("statusText"),boost:$("boostFill"),boostText:$("boostValue"),
 startPanel:$("startPanel"),finishPanel:$("finishPanel"),pausePanel:$("pausePanel"),
 failedPanel:$("failedPanel"),finishStars:$("finishStars"),
 finishTime:$("finishTime"),finishSummary:$("finishSummary"),
 failedReason:$("failedReason"),next:$("nextButton"),records:$("courseRecords"),
 flash:$("impactFlash"),style:$("styleValue")};
const controls={left:$("leftButton"),right:$("rightButton"),
 tuck:$("tuckButton"),brake:$("brakeButton"),turbo:$("turboButton"),jump:$("jumpButton"),trick:$("trickButton")};
const STORE="bicipark-snowbike-alpine-times-v2";
const DAILY_STORE="bicipark-play:daily-v1";
const dailyChallenge=(()=>{
 const params=new URLSearchParams(window.location.search);
 const day=params.get("challenge");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||""))return null;
 const now=new Date();
 const today=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
 if(day!==today)return null;
 const [y,m,d]=day.split("-").map(Number),index=Math.floor(Date.UTC(y,m-1,d)/86400000);
 const course=Math.floor(index/2)%COURSES.length;
 if(index%2!==0||params.get("course")!==String(course))return null;
 return {day,course};
})();
function recordDailyFinish(result){
 if(!dailyChallenge||game.course.id!==dailyChallenge.course)return false;
 try{
  const raw=JSON.parse(localStorage.getItem(DAILY_STORE)||"{}");
  const records=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const prev=records[dailyChallenge.day];
  if(!prev||prev.game!=="snowbike"||!Number.isFinite(prev.time)||result.totalTime<prev.time){
   records[dailyChallenge.day]={game:"snowbike",score:Math.max(0,Math.round(result.score)),
    time:Number(result.totalTime.toFixed(2)),completedAt:new Date().toISOString()};
   const entries=Object.entries(records).sort(([a],[b])=>a.localeCompare(b)).slice(-365);
   localStorage.setItem(DAILY_STORE,JSON.stringify(Object.fromEntries(entries)));
  }
  return true;
 }catch{return false;}
}

function readRecords(){try{const values=JSON.parse(localStorage.getItem(STORE)||"{}");return values&&typeof values==="object"?values:{};}catch{return {};}}
let records=readRecords();
function storeRecords(){try{localStorage.setItem(STORE,JSON.stringify(records));}catch{/* private session */}}
const keys=new Set(),pointers=new Map();
let game=makeGame(0),lastFrame=null,lastEvent="",noticeTime=0,previousPhase="ready";

const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const visuals={particles:[],words:[],rings:[],shake:0,flash:0,freeze:0,flashColor:"#ff7288"};

function burst(x,y,color,count=24,force=1){
 if(reducedMotion)count=Math.min(count,6);
 for(let i=0;i<count;i++){
  const angle=(i/count)*Math.PI*2;
  const energy=(45+(i*13%115))*force;
  visuals.particles.push({x,y,vx:Math.cos(angle)*energy,vy:Math.sin(angle)*energy-55,
    life:.45+(i%4)*.075,max:.7,color,radius:2+(i%3)*1.1});
 }
 if(visuals.particles.length>130)visuals.particles.splice(0,visuals.particles.length-130);
}
function floatWord(text,x,y,color="#fff3a5"){
 visuals.words.push({text,x,y,vy:-40,life:1.1,color});
 if(visuals.words.length>8)visuals.words.shift();
}
function effectEvent(event){
 const scene=window.SnowBikeAlpine;
 const p=scene?.project(game,event.at??game.distance,event.lane??game.lane);
 const rider=scene?.project(game,game.distance,game.lane);
 const y=p?Math.max(110,Math.min(467,p.y)):Math.max(110,Math.min(430,screenY(event.at||game.distance)));
 const x=p?p.x:center(event.at||game.distance)+(event.lane??game.lane)*196;
 const riderX=rider?.x??(480+game.lane*196),riderY=rider?.y??427;
 if(event.type==="jump"){
  const skier=riderX;
  burst(skier,riderY,"#e5fbff",25,1.2);
  visuals.rings.push({x:skier,y:riderY,radius:19,life:.48,color:"#acdeff"});
  floatWord("SALT!",skier,332,"#e2d8ff");
 }else if(event.type==="land"){
  const skier=riderX;
  burst(skier,riderY,"#f6ffff",38,1.15);
  visuals.rings.push({x:skier,y:riderY,radius:22,life:.55,color:"#d6faff"});
  floatWord("ATERRATGE!",skier,348,"#c6ffee");
 }else if(event.type==="trick-start"){
  const skier=riderX;
  visuals.rings.push({x:skier,y:355,radius:15,life:.55,color:"#fff39a"});
  burst(skier,356,"#ffe6a4",22,.8);
  floatWord("360°!",skier,285,"#ffe59f");
 }else if(event.type==="trick-land"){
  const skier=riderX;
  burst(skier,412,event.perfect?"#fff0a2":"#b2ffea",event.perfect?55:30,1.3);
  visuals.rings.push({x:skier,y:392,radius:24,life:.8,color:"#ffecab"});
  floatWord((event.perfect?"360 PERFECTE! ":"360 COMPLET! ")+"+"+event.points,skier,290,"#fff0a4");
  ui.notice.classList.add("notice--win");
 }else if(event.type==="trick-fail"){
  visuals.flash=.28;visuals.flashColor="#f7a27a";
  floatWord("TRUC FALLAT · +2 S",480,305,"#ffe4b0");
  burst(riderX,riderY,"#ffbf88",20,.8);
 }else if(event.type==="jump-dodge"){
  const legendary=event.kind==="yeti";
  burst(x,y,legendary?"#fff3b0":"#bde4ff",legendary?52:32,1.35);
  visuals.rings.push({x,y,radius:17,life:.75,color:legendary?"#ffdc81":"#d3c4ff"});
  floatWord(legendary?"IETI SUPERAT! +250":"SALT PERFECTE! +130",480,297,
    legendary?"#ffe398":"#d1faff");
  ui.notice.classList.add("notice--win");
  ui.gates.parentElement?.classList.add("hud-success");
 }else if(event.type==="animal-hit"){
  visuals.shake=reducedMotion?0:21;
  visuals.flash=.62;visuals.freeze=reducedMotion?0:.10;
  visuals.flashColor="#ff5367";
  burst(riderX,riderY,"#fff2f0",31,1.4);
  burst(x,y,"#ff7899",23,1);
  floatWord("-1 VIDA  ·  +5 S",480,350,"#fff3b9");
  ui.notice.classList.add("notice--hit");
  document.querySelector(".game-stage")?.classList.add("is-hit");
  ui.hearts.parentElement?.classList.add("hud-hit");
 }else if(event.type==="gate-perfect"||event.type==="gate-pass"){
  const perfect=event.type==="gate-perfect";
  burst(x,y,perfect?"#fff1a2":"#b0f5f1",perfect?40:19,1.15);
  visuals.rings.push({x,y,radius:14,life:.56,color:perfect?"#ffe87c":"#94fbea"});
  floatWord((perfect?"PERFECTE! ":"PORTA! ")+"+"+event.points+(event.streak>1?" ×"+event.streak:""),x,y-42);
  ui.notice.classList.add("notice--win");
  ui.gates.parentElement?.classList.add("hud-success");
 }else if(event.type==="gate-miss"){
  visuals.flash=.24;visuals.flashColor="#f7a27a";
  floatWord("+3 S",480,300,"#ffe2aa");burst(480,400,"#ffaf88",12,.7);
 }else if(event.type==="animal-dodge"){
  burst(x,y,"#c5f9ec",10,.65);
  floatWord("+80 ESQUIVAT!",x,y-20,"#baffdb");
 }else if(event.type==="boost"){
  visuals.rings.push({x:riderX,y:riderY,radius:22,life:.7,color:"#ffe69a"});
  burst(riderX,riderY,"#fff6b2",22,1);
  floatWord("TURBO!",480,325,"#fff0a4");
 }else if(event.type==="finish"){
  visuals.rings.push({x:480,y:330,radius:40,life:1.6,color:"#ffed9a"});
  burst(480,270,"#fff1a6",60,2.1);
 }
}
function readEvents(){
 if(!Array.isArray(game.events))return;
 for(const event of game.events.splice(0))effectEvent(event);
}
function stepVisuals(dt){
 visuals.shake=Math.max(0,visuals.shake-dt*41);
 visuals.flash=Math.max(0,visuals.flash-dt*1.85);
 ui.flash.style.opacity=String(Math.min(.7,visuals.flash));
 ui.flash.style.background=visuals.flashColor==="#ff5367"?
  "radial-gradient(ellipse at 50% 70%,transparent 28%,#ff465acb 100%)":
  "radial-gradient(ellipse at 50% 70%,transparent 30%,#ffe09aaa 100%)";
 if(visuals.flash<=0){
  document.querySelector(".game-stage")?.classList.remove("is-hit");
  ui.hearts.parentElement?.classList.remove("hud-hit");
 }
 for(const p of visuals.particles){
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;
 }
 visuals.particles=visuals.particles.filter(p=>p.life>0);
 for(const w of visuals.words){w.y+=w.vy*dt;w.life-=dt;}
 visuals.words=visuals.words.filter(w=>w.life>0);
 for(const ring of visuals.rings){ring.radius+=170*dt;ring.life-=dt;}
 visuals.rings=visuals.rings.filter(r=>r.life>0);
}
function drawFeedback(){
 for(const ring of visuals.rings){
  ctx.save();ctx.globalAlpha=Math.min(.9,ring.life/.7);
  ctx.strokeStyle=ring.color;ctx.lineWidth=5;ctx.beginPath();
  ctx.arc(ring.x,ring.y,ring.radius,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 for(const p of visuals.particles){
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,p.life/p.max));
  ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 for(const w of visuals.words){
  ctx.save();ctx.globalAlpha=Math.min(1,w.life*2);ctx.textAlign="center";
  ctx.lineWidth=5;ctx.strokeStyle="#183345";ctx.font="1000 23px system-ui";
  ctx.strokeText(w.text,w.x,w.y);ctx.fillStyle=w.color;ctx.fillText(w.text,w.x,w.y);
  ctx.restore();
 }
}
function drawAlpineLayers(){
 for(const [height,fill,offset] of [[190,"#8db3ce",.14],[250,"#b8d1e3",.24],[303,"#d7e7ee",.39]]){
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(0,540);
  for(let x=-60;x<=1030;x+=45){
   const peak=height+Math.sin((x+game.distance*offset)/147)*34+
     Math.cos((x+game.distance*offset)/51)*22;
   ctx.lineTo(x,peak);
  }
  ctx.lineTo(1030,540);ctx.closePath();ctx.fill();
 }
 ctx.fillStyle="#ffffffb4";
 for(let i=0;i<46;i++){
  const x=((i*127+game.time*(11+i%5)*.7)%1000+1000)%1000;
  const y=((i*89+game.time*(15+i%7)*2)%490+490)%490;
  ctx.beginPath();ctx.arc(x,y,i%4===0?2:1.1,0,Math.PI*2);ctx.fill();
 }
}
function drawSpeedSnow(){
 if(game.phase!=="playing"||game.velocity<24||reducedMotion)return;
 ctx.save();ctx.globalAlpha=.33;ctx.strokeStyle="#80c9e7";ctx.lineWidth=2;
 const skier=480+game.lane*196;
 for(let i=0;i<13;i++){
  const d=(i*19+game.time*game.velocity*4)%200;
  const x=skier+((i%2)?-1:1)*(18+d*.65);
  const y=435+d*.38;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(i%2?8:-8),y+10+game.velocity*.3);ctx.stroke();
 }
 ctx.restore();
}

let wasTurboPressed=false;
function formatTime(sec){const n=Math.max(0,Number(sec)||0);return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(Math.floor(n%60)).padStart(2,"0")}.${Math.floor(n*10)%10}`;}
function gameReset(index=game.course.id){
 game=makeGame(index);lastFrame=null;lastEvent="";noticeTime=0;
 visuals.particles.length=0;visuals.words.length=0;visuals.rings.length=0;
 visuals.shake=0;visuals.flash=0;visuals.freeze=0;
 ui.flash.style.opacity="0";ui.notice.classList.remove("notice--hit","notice--win");
 document.querySelector(".game-stage")?.classList.remove("is-hit","is-turbo");
 previousPhase="ready";keys.clear();pointers.clear();wasTurboPressed=false;
 ui.course.value=String(index);
 for(const button of Object.values(controls))button.setAttribute("aria-pressed","false");
 ui.startPanel.hidden=false;ui.finishPanel.hidden=true;ui.failedPanel.hidden=true;ui.pausePanel.hidden=true;ui.notice.hidden=true;
 ui.status.textContent=game.event;refresh();paint();
}
function beginRace(){if(start(game)){ui.startPanel.hidden=true;$("startButton").blur();ui.status.textContent=game.event;lastFrame=null;}}
function togglePause(){
 if(game.phase==="playing"){clearControls();pause(game);ui.pausePanel.hidden=false;lastFrame=null;}
 else if(game.phase==="paused"){clearControls();resume(game);ui.pausePanel.hidden=true;$("resumeButton").blur();$("pauseButton").blur();lastFrame=null;}
}
function keyAllowed(event){
 return !(event.target instanceof HTMLElement&&["BUTTON","SELECT","INPUT","TEXTAREA","A"].includes(event.target.tagName));
}
document.addEventListener("keydown",event=>{
 if(!["ArrowLeft","ArrowRight","ArrowDown","ArrowUp","KeyA","KeyD","KeyS","KeyW","Space","KeyJ","KeyT","KeyK","KeyP"].includes(event.code))return;
 if(!keyAllowed(event))return;
 event.preventDefault();
 if(event.code==="KeyP"&&!event.repeat){togglePause();return;}
 if(game.phase==="ready"&&["ArrowDown","ArrowLeft","ArrowRight","Space","KeyJ"].includes(event.code))beginRace();
 keys.add(event.code);
 if(["Space","KeyJ"].includes(event.code)&&!event.repeat)jump(game);
 if(event.code==="KeyT"&&!event.repeat)boost(game);
 if(event.code==="KeyK"&&!event.repeat)trick(game);
});
document.addEventListener("keyup",event=>{
 if(keys.delete(event.code))event.preventDefault();
});
function down(action){
 return [...pointers.values()].includes(action)||
 ({left:["ArrowLeft","KeyA"],right:["ArrowRight","KeyD"],
 tuck:["ArrowDown","KeyS"],brake:["ArrowUp","KeyW"],turbo:["KeyT"]}[action]||[]).some(k=>keys.has(k));
}
for(const [action,button] of Object.entries(controls)){
 button.setAttribute("aria-pressed","false");
 button.addEventListener("pointerdown",event=>{
  if(event.button!=null&&event.button!==0)return;
  event.preventDefault();
  if(game.phase==="ready")beginRace();
  pointers.set(event.pointerId,action);button.setAttribute("aria-pressed","true");
  try{button.setPointerCapture(event.pointerId);}catch{/* browser differences */}
  if(action==="turbo")boost(game);
  if(action==="jump")jump(game);
  if(action==="trick")trick(game);
 });
 // Native keyboard activation of a focused game button (Enter/Space).
 button.addEventListener("click",event=>{
  if(event.detail!==0)return; // Pointer actions already fire on pointerdown.
  if(game.phase==="ready")beginRace();
  if(action==="jump")jump(game);
  if(action==="trick")trick(game);
  if(action==="turbo")boost(game);
 });
 const release=event=>{
  if(pointers.get(event.pointerId)!==action)return;
  pointers.delete(event.pointerId);
  button.setAttribute("aria-pressed",String([...pointers.values()].includes(action)));
 };
 for(const type of ["pointerup","pointercancel","lostpointercapture"])
  button.addEventListener(type,release);
}
function clearControls(){
 keys.clear();pointers.clear();wasTurboPressed=false;
 for(const b of Object.values(controls))b.setAttribute("aria-pressed","false");
}
window.addEventListener("blur",()=>{clearControls();if(game.phase==="playing")togglePause();});
document.addEventListener("visibilitychange",()=>{lastFrame=null;if(document.hidden&&game.phase==="playing"){clearControls();togglePause();}});
$("startButton").addEventListener("click",beginRace);
$("pauseButton").addEventListener("click",togglePause);
$("resumeButton").addEventListener("click",togglePause);
$("restartButton").addEventListener("click",()=>gameReset());
$("retryFinish").addEventListener("click",()=>gameReset());
$("retryFailed").addEventListener("click",()=>gameReset());
$("nextButton").addEventListener("click",()=>gameReset((game.course.id+1)%COURSES.length));
ui.course.addEventListener("change",()=>gameReset(Number(ui.course.value)));
for(let i=0;i<COURSES.length;i++){
 const option=document.createElement("option");option.value=String(i);
 option.textContent=`${String(i+1).padStart(2,"0")} · ${COURSES[i].name}`;
 ui.course.append(option);
}
function saveFinish(){
 const result=scoreFinish(game);
 if(!result)return;
 const previous=records[game.course.id];
 if(!previous||result.totalTime<previous.time){
  records[game.course.id]={time:Number(result.totalTime.toFixed(2)),stars:result.stars,score:result.score};
  storeRecords();
 }
}
function drawRecords(){
 ui.records.replaceChildren();
 for(let i=0;i<COURSES.length;i++){
  const row=document.createElement("div");row.className="record-row";
  const name=document.createElement("span");name.textContent=COURSES[i].name;
  const val=document.createElement("strong");
  val.textContent=records[i]?formatTime(records[i].time)+" · "+ "★".repeat(records[i].stars):"Sense marca";
  row.append(name,val);ui.records.append(row);
 }
}
function feedback(dt){
 if(game.event!==lastEvent){
  lastEvent=game.event;ui.status.textContent=game.event;ui.notice.textContent=game.event;
  ui.notice.hidden=false;noticeTime=1.2;
 }
 noticeTime=Math.max(0,noticeTime-dt);
 if(noticeTime===0){ui.notice.hidden=true;ui.notice.classList.remove("notice--hit","notice--win");}
 document.querySelector(".game-stage")?.classList.toggle("is-turbo",game.boostTime>0);
 if(game.phase!==previousPhase){
  previousPhase=game.phase;
  if(game.phase==="finished"){
   saveFinish();drawRecords();
   const result=scoreFinish(game);
   ui.finishStars.textContent="★".repeat(game.stars)+"☆".repeat(3-game.stars);
   ui.finishTime.textContent=formatTime(result.totalTime);
   ui.finishSummary.textContent=`Temps real ${formatTime(result.rawTime)} · +${result.penalty} s de penalització · ${result.perfect} portes perfectes · ratxa màxima ×${result.bestStreak} · ${result.animals} animals esquivats · ${result.jumpDodges} saltats · ${result.tricks} trucs 360° · ${result.score} punts`;
   if(recordDailyFinish(result))ui.finishSummary.textContent+=" · REPTE DIARI COMPLETAT!";
   ui.finishPanel.hidden=false;
   ui.next.focus({preventScroll:true});
  }
  if(game.phase==="failed"){
   ui.failedReason.textContent=game.event;
   ui.failedPanel.hidden=false;
  }
 }
}
function refresh(){
 ui.time.textContent=formatTime(game.time+game.penalty);
 $("scoreValue").textContent=Math.round(game.score).toLocaleString("ca-ES");$("comboValue").textContent="×"+game.streak;
 ui.speed.innerHTML=`${Math.round(game.velocity*3.6)} <em>km/h</em>`;
 ui.gates.textContent=`${game.passedGates} / ${game.course.gates.length}`;
 ui.penalty.textContent=`+${game.penalty} s`;
 ui.hearts.textContent="♥ ".repeat(game.hearts).trim()||"0";
 ui.best.textContent=records[game.course.id]?formatTime(records[game.course.id].time):"—";
 ui.zone.textContent=game.course.name.toUpperCase();
 ui.phase.textContent=({ready:"PREPARAT",playing:game.boostTime>0?"⚡ TURBO":"EN DESCENS",paused:"PAUSA",finished:"META",failed:"FINAL"})[game.phase];
 const progress=Math.round(game.distance/game.course.length*100);
 ui.progress.style.width=progress+"%";ui.progressText.textContent=progress+"%";
 ui.boost.style.width=game.boost+"%";ui.boostText.textContent=Math.round(game.boost)+"%";
 const next=game.course.gates.find(gate=>!gate.passed);
 const distance=next?Math.max(0,Math.round(next.at-game.distance)):null;
 const canTrick=game.phase==="playing"&&!game.grounded&&!game.trickUsed&&
  game.airHeight>=.35&&game.airVelocity>=-1.15;
 ui.style.textContent=game.phase!=="playing"?
  "360° + PORTES EN RATXA":canTrick?"ARA! PREM K / TRUC 360°":
  game.trickUsed&&!game.grounded?"360° EN CURS":
  game.streak>0?"RATXA ×"+game.streak+(next?" · porta "+distance+" m":""):
  next?"SEGÜENT PORTA "+distance+" m":"ÚLTIM TRAM";
 controls.turbo.disabled=game.phase!=="playing"||game.boost<30||game.boostTime>0;
 controls.trick.setAttribute("aria-disabled",String(game.phase!=="playing"||game.grounded||game.trickUsed||game.airHeight<.35||game.airVelocity< -1.15));
 controls.jump.setAttribute("aria-disabled",
  String(game.phase!=="playing"||!game.grounded||game.jumpCooldown>0||game.stumble>0));
}
const TRACK_PROJECTION=.58;
function screenY(at){return 427-(at-game.distance)*TRACK_PROJECTION;}
function center(at){return 480+skiTrackCenter(at,game.course.id)-skiTrackCenter(game.distance,game.course.id);}
function drawSnow(){
 const bg=ctx.createLinearGradient(0,0,960,540);
 const colors=[["#a7d8ef","#e9f6ff"],["#aedbd2","#f5fbfa"],["#c5d1f1","#f7f9ff"],["#b1d2ed","#eaf6fb"]][game.course.id];
 bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);
 ctx.fillStyle=bg;ctx.fillRect(0,0,960,540);
 if(window.BiciParkPremiumArt)window.BiciParkPremiumArt.world(ctx,960,540,game.distance,true,game.time);else drawAlpineLayers();
 const start=game.distance+(427-(-20))/TRACK_PROJECTION;
 const end=game.distance+(427-560)/TRACK_PROJECTION;
 const bounds=[];
 for(let y=-20;y<=560;y+=14){
  const at=game.distance+(427-y)/TRACK_PROJECTION;
  const c=center(at),w=230+15*Math.sin(at/167);
  bounds.push({y,left:c-w,right:c+w});
 }
 ctx.beginPath();ctx.moveTo(bounds[0].left,bounds[0].y);
 for(const b of bounds)ctx.lineTo(b.left,b.y);
 for(const b of bounds.slice().reverse())ctx.lineTo(b.right,b.y);
 ctx.closePath();
 const snow=ctx.createLinearGradient(0,0,0,540);snow.addColorStop(0,"#d8ebff");snow.addColorStop(.6,"#f7fcff");snow.addColorStop(1,"#dce9ff");ctx.fillStyle=snow;ctx.fill();
 ctx.save();ctx.clip();
 for(let i=0;i<26;i++){const y=(i*28+game.distance*TRACK_PROJECTION)%580-20,at=game.distance+(427-y)/TRACK_PROJECTION,x=center(at)+((i*73)%370-185);ctx.fillStyle=i%3?"#c6ddf2":"#b6cfe9";ctx.fillRect(x,y,24+i%5*6,3);ctx.fillStyle="#fff";ctx.fillRect(x+7,y+4,17,2);}
 ctx.restore();
 ctx.strokeStyle="#b7d6e0";ctx.lineWidth=5;ctx.beginPath();
 for(let i=0;i<bounds.length;i++){
  const b=bounds[i];if(i===0)ctx.moveTo(b.left,b.y);else ctx.lineTo(b.left,b.y);
 }ctx.stroke();ctx.beginPath();
 for(let i=0;i<bounds.length;i++){
  const b=bounds[i];if(i===0)ctx.moveTo(b.right,b.y);else ctx.lineTo(b.right,b.y);
 }ctx.stroke();
 ctx.strokeStyle="#d2e9f0";ctx.lineWidth=3;ctx.setLineDash([11,20]);
 for(const s of [-.55,.55]){
  ctx.beginPath();
  for(let y=0;y<=540;y+=12){
   const at=game.distance+(427-y)/TRACK_PROJECTION,x=center(at)+s*200;
   if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();
 }
 ctx.setLineDash([]);
 const arcadeArt=window.BiciParkArcadeArt;
 if(arcadeArt){
  const start=Math.floor((game.distance-220)/38),end=Math.floor((game.distance+900)/38);
  for(let i=start;i<=end;i++){
   const at=i*38,y=screenY(at);if(y<0||y>540)continue;
   const side=i%2===0?-1:1;
   arcadeArt.surface(ctx,center(at)+side*(248+Math.abs(i*37%130)),y,i,"snow");
  }
 }
 // Stable seeded scenery is drawn from track-distance positions, not random per frame.
 const i0=Math.max(0,Math.floor((game.distance-250)/85));
 const i1=Math.floor((game.distance+1030)/85);
 for(let i=i1;i>=i0;i--){
  const at=i*85,screen=screenY(at);if(screen<0||screen>550)continue;
  const side=i%2===0?-1:1;
  const x=center(at)+side*(270+(i*31%170));
  const scale=.5+screen/650;
  ctx.save();ctx.translate(x,screen);ctx.scale(scale,scale);
  if(window.BiciParkPremiumArt){const art=window.BiciParkPremiumArt;art.pine(ctx,0,6,115+(i%4)*17,true,i);if(i%3===0)art.rock(ctx,35,15,35,true);if(i%4===0)art.marker(ctx,-25,9,true);ctx.restore();continue;}
  if(arcadeArt){arcadeArt.tree(ctx,0,6,74,true);ctx.restore();continue;}
  ctx.fillStyle="#2f5e68";ctx.fillRect(-4,0,8,24);
  ctx.fillStyle=i%7?"#367c73":"#476e84";
  ctx.beginPath();ctx.moveTo(0,-68);ctx.lineTo(-24,3);ctx.lineTo(24,3);ctx.closePath();ctx.fill();
  ctx.fillStyle="#d9f5f5";ctx.beginPath();ctx.moveTo(0,-69);ctx.lineTo(-12,-35);ctx.lineTo(12,-35);ctx.fill();
  ctx.restore();
 }
}
function drawGates(){
 for(const gate of game.course.gates){
  if(gate.passed)continue;
  const y=screenY(gate.at);if(y<-50||y>560)continue;
  const x=center(gate.at)+gate.lane*196;
  const scale=clamp(.55+y/740,.5,1.25);
  const span=78*scale;
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle="#75b5d1";ctx.lineWidth=3;
  ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(-span,0);ctx.lineTo(span,0);ctx.stroke();ctx.setLineDash([]);
  for(const [side,color] of [[-1,"#f64d5b"],[1,"#3c84eb"]]){
   const px=side*span;
   ctx.strokeStyle="#243e56";ctx.lineWidth=5;
   ctx.beginPath();ctx.moveTo(px,7);ctx.lineTo(px,-51*scale);ctx.stroke();
   ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(px,-48*scale);ctx.lineTo(px+side*27*scale,-40*scale);
   ctx.lineTo(px,-28*scale);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle="#31566a";ctx.font="900 12px system-ui";ctx.textAlign="center";
  ctx.fillText("PORTA "+(gate.id+1),0,-55*scale);
  ctx.restore();
 }
}


function drawYeti(a){
 // Original illustrated mythical creature: recognisable pale shaggy silhouette,
 // long arms, icy eyes, snow-dusted fur and animated footsteps.
 const walk=Math.sin(game.time*8+a.id*1.7);
 ctx.save();ctx.translate(Math.sin(game.time*4+a.id)*2,0);
 ctx.fillStyle="#15364f52";ctx.beginPath();ctx.ellipse(0,12,34,9,0,0,Math.PI*2);ctx.fill();
 // Heavy legs and oversized feet.
 for(const side of [-1,1]){
  ctx.strokeStyle="#d0e7ef";ctx.lineWidth=14;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(side*10,-13);ctx.lineTo(side*(12+walk*4),10);ctx.stroke();
  ctx.fillStyle="#627d95";ctx.beginPath();
  ctx.ellipse(side*(15+walk*4),10,13,7,side*.12,0,Math.PI*2);ctx.fill();
 }
 // Thick swinging arms.
 for(const side of [-1,1]){
  const armSwing=walk*8*side;
  ctx.strokeStyle="#eef8fc";ctx.lineWidth=17;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(side*20,-43);
  ctx.quadraticCurveTo(side*32,-30,side*(38+armSwing*.3),-11+armSwing);
  ctx.stroke();
  ctx.fillStyle="#7995a6";ctx.beginPath();
  ctx.arc(side*(38+armSwing*.3),-11+armSwing,9,0,Math.PI*2);ctx.fill();
 }
 const fur=ctx.createLinearGradient(-32,-72,36,10);
 fur.addColorStop(0,"#ffffff");fur.addColorStop(.5,"#dcebf1");fur.addColorStop(1,"#8ba4b9");
 ctx.fillStyle=fur;ctx.strokeStyle="#6b90aa";ctx.lineWidth=2.5;
 ctx.beginPath();ctx.ellipse(0,-31,28,37,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 // Shaggy snowy tufts.
 ctx.fillStyle="#f9ffff";
 for(const side of [-1,1]){
  for(let i=0;i<4;i++){
   ctx.beginPath();ctx.moveTo(side*18,-48+i*13);
   ctx.lineTo(side*(31+i%2*5),-49+i*13);
   ctx.lineTo(side*25,-41+i*13);ctx.closePath();ctx.fill();
  }
 }
 // Mythical hornless polar face, distinct from goats and deer.
 ctx.fillStyle="#eef8fc";ctx.strokeStyle="#8aa5b4";
 ctx.beginPath();ctx.ellipse(0,-67,22,24,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle="#60778f";ctx.beginPath();ctx.ellipse(0,-62,16,13,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#a5eaff";ctx.shadowColor="#4ac9f3";ctx.shadowBlur=9;
 for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*9,-69,5,4,0,0,Math.PI*2);ctx.fill();}
 ctx.shadowBlur=0;ctx.fillStyle="#25465f";ctx.beginPath();ctx.ellipse(0,-54,7,4,0,0,Math.PI*2);ctx.fill();
 // Subtle snow crystals above the shoulders, not emoji artwork.
 ctx.strokeStyle="#ffffffb3";ctx.lineWidth=2;
 for(const side of [-1,1]){
  ctx.beginPath();ctx.moveTo(side*12,-82);ctx.lineTo(side*12,-94);
  ctx.moveTo(side*6,-88);ctx.lineTo(side*18,-88);ctx.stroke();
 }
 ctx.restore();
}
function drawAlpineAnimal(a){
 if(a.kind==="yeti"){drawYeti(a);return;}
 const species=a.emoji==="🐇"?"rabbit":a.emoji==="🦊"?"fox":a.emoji==="🦌"?"deer":"goat";
 const palette={
  rabbit:["#e6e0d5","#b8b2aa","#ffe8ce"],
  fox:["#d58e52","#9e4c33","#fff0d3"],
  deer:["#a97752","#724d3d","#f7d8a4"],
  goat:["#c2c7bd","#72878a","#f5e8cf"]
 }[species];
 const wiggle=Math.sin(game.time*10+a.id*2)*3;
 ctx.save();ctx.translate(wiggle,0);
 // Four hooves move in opposing phases as animals cross the piste.
 ctx.strokeStyle="#384856";ctx.lineWidth=5;ctx.lineCap="round";
 for(const side of [-1,1]){
  const phase=Math.sin(game.time*11+a.id+side)*5;
  ctx.beginPath();ctx.moveTo(side*11,-3);ctx.lineTo(side*15+phase,10);
  ctx.moveTo(side*11,1);ctx.lineTo(side*17-phase,13);ctx.stroke();
 }
 // Body with back shading and small reflective highlights.
 const fur=ctx.createLinearGradient(-26,-20,29,21);
 fur.addColorStop(0,palette[2]);fur.addColorStop(.44,palette[0]);fur.addColorStop(1,palette[1]);
 ctx.fillStyle=fur;ctx.strokeStyle="#42515a";ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(-3,-13,species==="rabbit"?18:25,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 // Tail changes shape depending on the species.
 ctx.fillStyle=species==="fox"?"#fff0de":palette[0];
 ctx.beginPath();ctx.ellipse(-25,-18,species==="fox"?13:8,7,-.3,0,Math.PI*2);ctx.fill();
 // The head points in the direction of crossing.
 const face=18;ctx.fillStyle=palette[0];ctx.strokeStyle="#48515b";
 ctx.beginPath();ctx.ellipse(face,-24,species==="deer"?14:12,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 // Ears, antlers or horns distinguish the silhouettes without Unicode emoji.
 for(const side of [-1,1]){
  const height=species==="rabbit"?31:species==="deer"?26:species==="goat"?23:15;
  const ex=face+side*8;
  ctx.strokeStyle=species==="deer"?"#785a43":species==="goat"?"#e9dcb5":palette[1];
  ctx.lineWidth=species==="deer"?4:7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(ex,-32);ctx.lineTo(ex+side*6,-32-height);
  if(species==="deer"){
   ctx.lineTo(ex+side*12,-32-height+7);
   ctx.moveTo(ex+side*6,-32-height+10);ctx.lineTo(ex+side*16,-32-height+8);
  }
  ctx.stroke();
 }
 ctx.fillStyle="#132d3a";ctx.beginPath();ctx.arc(face+7,-27,2.8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#ffffffa0";ctx.beginPath();ctx.arc(face+6.1,-28,1,0,Math.PI*2);ctx.fill();
 if(species==="fox"){ctx.fillStyle="#fff1d9";ctx.beginPath();ctx.ellipse(27,-16,9,5,-.2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function drawAnimals(){
 const animals=game.course.animals.filter(a=>!a.passed&&screenY(a.at)>-40&&screenY(a.at)<570).sort((a,b)=>b.at-a.at);
 for(const a of animals){
  const y=screenY(a.at);if(y<0||y>540)continue;
  const x=center(a.at)+a.x*192;
  const scale=clamp(.55+y/750,.55,1.18)*(a.kind==="yeti"?1.22:1);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle="#254d604d";ctx.beginPath();ctx.ellipse(0,13,34,10,0,0,Math.PI*2);ctx.fill();
  drawAlpineAnimal(a);
  if(a.phase==="crossing"&&Math.abs(a.at-game.distance)<(a.kind==="yeti"?175:105)){
   ctx.fillStyle="#ffe1a1";ctx.strokeStyle="#31475a";ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(0,-99);ctx.lineTo(-15,-69);ctx.lineTo(15,-69);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="#294157";ctx.font="1000 20px system-ui";ctx.textAlign="center";
   ctx.fillText("!",0,-74);
   if(a.kind==="yeti"){
    ctx.fillStyle="#133850";ctx.font="1000 13px system-ui";
    ctx.fillText("IETI",0,-110);
   }
  }
  ctx.restore();
 }
}
// Carved parallel ski tracks remain attached to the actual rider lane.
function drawSkiGrooves(){
 if(game.phase!=="playing"||!game.grounded)return;
 const x=480+game.lane*196;
 const drift=clamp(game.steerVelocity,-2,2);
 ctx.save();ctx.lineCap="round";
 for(const side of [-1,1]){
  ctx.beginPath();ctx.moveTo(x+side*24,438);
  for(let i=1;i<=9;i++){
   const y=438+i*8;
   ctx.lineTo(x+side*24-drift*i*1.65+Math.sin(game.time*1.5+i*.15)*i*.3,y);
  }
  ctx.strokeStyle="#7997b67a";ctx.lineWidth=5.5;ctx.stroke();
  ctx.strokeStyle="#e9fdffdd";ctx.lineWidth=2;ctx.stroke();
  // Displaced snow throws a short, soft-edged plume alongside each cut.
  if(!reducedMotion){
   ctx.fillStyle=game.boostTime>0?"#fff4c1a8":"#ffffffb2";
   for(let i=0;i<7;i++){
    const y=443+i*9,dx=side*(29+i*2.3)+Math.sin(game.time*17+i*2)*4;
    ctx.beginPath();ctx.ellipse(x+dx-drift*i,y,1.7+i*.14,3+i*.45,side*.2,0,Math.PI*2);ctx.fill();
   }
  }
 }
 ctx.restore();
}

function drawSkiBike(){
 const x=480+game.lane*196,y=427;
 const steer=clamp(game.steerVelocity,-1.4,1.4),air=game.airHeight;
 const moving=game.phase==="playing"&&!reducedMotion;
 const pulse=moving?Math.sin(game.time*(7+game.velocity*.12)):0;
 const crouch=air>0?Math.min(9,air*18):Math.abs(steer)*3+pulse*1.5;
 const lean=steer*8,pitch=game.grounded?0:clamp(game.airVelocity*.045,-.2,.2);
 const shake=game.stumble>0&&moving?Math.sin(game.time*29)*.23:0;
 const seg=(x1,y1,x2,y2,w,col)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const oval=(x,y,rx,ry,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()};
 const part=(x1,y1,x2,y2,w,col)=>{seg(x1,y1,x2,y2,w+4,"#152435");seg(x1,y1,x2,y2,w,col)};
 ctx.save();ctx.translate(x,y);oval(0,7,31+air*18,9+air*4,"#203a514d");
 if(game.grounded&&moving){for(let i=0;i<22;i++){const d=(i*17+game.time*game.velocity*4)%96;const side=i%2?1:-1;oval(side*(12+d*.46)-steer*d*.12,9+d*.55,1+i%3,1+i%2,"#f5fdffb8")}}
 ctx.translate(0,-air*145);ctx.rotate(steer*.17+shake+pitch+(game.grounded||reducedMotion?0:game.trickSpin*Math.PI*2));ctx.scale(.94,.94);
 if(game.invulnerability>0&&Math.floor(game.time*16)%2===0)ctx.globalAlpha=.55;
 // Two longitudinal ski runners, fork and compact frame, drawn independently of rider.
 for(const side of [-1,1]){ctx.save();ctx.translate(side*15,side*steer*3);ctx.rotate(steer*.10+side*.045);
 ctx.fillStyle="#172c40";ctx.beginPath();ctx.moveTo(-5,20);ctx.quadraticCurveTo(-8,1,-6,-32);ctx.quadraticCurveTo(0,-48,6,-32);ctx.lineTo(7,16);ctx.quadraticCurveTo(0,27,-5,20);ctx.fill();
 seg(0,-31,0,18,6,side<0?"#ee7847":"#42c6d5");seg(-2,-27,-2,14,1.5,"#ffedd1");ctx.restore()}
 part(-15,3,0,-18,5,"#f1ac48");part(0,-18,15,3,5,"#f1ac48");part(0,-18,0,-35,5,"#d1e9e9");part(-20,-35,20,-35,4,"#658898");
 // Rider's boots stay on bindings; knees, hips and elbows change with steering and terrain.
 for(const side of [-1,1]){const foot=side*15,knee=side*18+lean*.45,ky=-8+crouch+side*steer*3;part(lean+side*7,-19+crouch,knee,ky,8,"#304d67");part(knee,ky,foot,7,7,"#32516a");part(foot,7,foot,14,9,"#25354a");seg(foot-3,12,foot+3,12,2,"#b4dae0")}
 // Torso in warm alpine jacket, with contrasting backpack and shoulder panels.
 ctx.save();ctx.translate(lean,-28+crouch);ctx.rotate(steer*.13);
 oval(0,0,16,20,"#172b3c");oval(0,-1,13,17,"#ef7847");oval(0,3,8,11,"#a84038");seg(-8,-12,-4,0,3,"#ffca80");seg(8,-12,4,0,3,"#ffca80");
 ctx.restore();
 for(const side of [-1,1]){const shoulder=lean+side*12,sy=-37+crouch,elbow=side*23+lean*.25,ey=-25+crouch*.55;part(shoulder,sy,elbow,ey,7,"#e96d40");part(elbow,ey,side*19,-35,6,"#52677a");oval(side*19,-35,4,4,"#192c3d")}
 // Helmet tracks the torso rather than sliding as a flat illustration.
 const hx=lean*.85,hy=-51+crouch*.85;oval(hx,hy,12,13,"#152a3a");oval(hx,hy-1,10,11,"#f3d16c");seg(hx-5,hy-7,hx+3,hy-9,2,"#fff2b1");seg(hx-8,hy+2,hx+8,hy+2,5,"#24445b");seg(hx-5,hy+1,hx+3,hy+1,1.5,"#a6e7ed");
 ctx.restore();
}
function drawSnowRush(){
 if(reducedMotion||game.phase!=="playing")return;
 const strength=clamp((game.velocity-20)/64,0,1);
 if(strength===0)return;
 ctx.save();ctx.strokeStyle="#78b6d8";ctx.lineWidth=1.4+strength*1.8;
 ctx.globalAlpha=.12+strength*.26;
 for(let i=0;i<33;i++){
  const x=((i*179+game.time*(game.velocity*22+i*12))%1050+1050)%1050;
  const y=((i*97+game.time*(40+i%7*8))%560+560)%560;
  const length=12+strength*45+y*.035;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+length);ctx.stroke();
 }
 ctx.restore();
 // Fast textured piste markers flow towards the bottom of the screen.
 ctx.save();ctx.globalAlpha=.15+strength*.17;ctx.fillStyle="#93b3c9";
 for(let i=0;i<24;i++){
  const d=(i*66+game.distance*7.0)%610;
  const y=d-70;
  const at=game.distance+(427-y)/TRACK_PROJECTION;
  const x=center(at)+((i%2)?-1:1)*((i*47)%138);
  ctx.beginPath();ctx.ellipse(x,y,2+strength*3,8+strength*16,0,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function drawAlpineHud(){
 const art=window.BiciParkPremiumArt;
 const speed=Math.round(game.velocity*3.6);
 function panel(x,y,w,h){art.poly(ctx,[[x+9,y],[x+w,y],[x+w-9,y+h],[x,y+h]],"#12274deb","#79b5e5",1.4);}
 ctx.save();ctx.textAlign="left";
 panel(12,40,185,48);ctx.font="800 11px system-ui";ctx.fillStyle="#e3f4ff";ctx.fillText("PUNTS",26,55);
 ctx.font="italic 900 28px system-ui";ctx.fillStyle="#ffe25c";ctx.fillText(Math.round(game.score).toLocaleString("ca-ES"),26,80);
 panel(747,40,201,48);ctx.font="800 11px system-ui";ctx.fillStyle="#e3f4ff";ctx.fillText("VELOCITAT",763,55);
 ctx.font="italic 900 27px system-ui";ctx.fillStyle="#ffe25c";ctx.fillText(speed+" km/h",763,80);
 if(game.streak>1){panel(759,96,187,35);ctx.font="italic 900 21px system-ui";ctx.fillStyle="#ffdf4e";ctx.fillText("COMBO ×"+game.streak,773,120);}
 panel(12,474,291,32);ctx.font="800 11px system-ui";ctx.fillStyle="#e6f7ff";ctx.fillText("TURBO",24,494);
 for(let i=0;i<10;i++)art.poly(ctx,[[91+i*19,482],[106+i*19,482],[103+i*19,497],[88+i*19,497]],game.boost>i*10?"#38cef2":"#53647a");
 panel(710,474,239,32);ctx.font="800 12px system-ui";ctx.fillStyle="#fcf1bc";ctx.fillText(Math.round(game.distance)+" / "+game.course.length+" m",724,495);
 ctx.restore();
}
function paint(){
 if(!ctx)return;
 ctx.clearRect(0,0,960,540);
 ctx.save();
 if(visuals.shake>0 && !reducedMotion){
  ctx.translate(Math.sin(game.time*69)*visuals.shake,
    Math.cos(game.time*87)*visuals.shake*.54);
 }
 if(window.SnowBikeAlpine&&window.BiciParkPremiumArt){
  window.SnowBikeAlpine.draw(ctx,game,{reduced:reducedMotion});
  drawFeedback();ctx.restore();
  drawAlpineHud();return;
 }
 drawSnow();drawSkiGrooves();drawGates();drawAnimals();
 drawSpeedSnow();
 // Animated speed streaks accentuate fast downhill riding without obscuring obstacles.
 if(game.velocity>43&&game.phase==="playing"){
  ctx.strokeStyle="#64bcda62";ctx.lineWidth=2;
  for(let i=0;i<13;i++){
   const x=(i*107+game.time*70)%930+15;
   const y=((i*73+game.time*game.velocity*18)%500);
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+14+game.velocity/2);ctx.stroke();
  }
 }
 drawSnowRush();drawSkiBike();drawFeedback();
 ctx.restore();
 // Alpine A keeps the pixel treatment, with a higher detail rider and mountain scenery.
 window.BiciParkArcadeArt?.pixelFrame(ctx);
 ctx.fillStyle="#13374cbf";ctx.fillRect(0,508,960,33);
 ctx.textAlign="left";ctx.font="900 15px system-ui";ctx.fillStyle="white";
 ctx.fillText(`${Math.round(game.distance)} / ${game.course.length} m`,15,530);
 ctx.textAlign="right";ctx.fillStyle="#fff39e";
 ctx.fillText(`★ ${game.score.toLocaleString("ca-ES")} · ${game.animalsDodged} animals esquivats`,944,530);
}
function frame(now){
 if(lastFrame===null)lastFrame=now;
 const dt=clamp((now-lastFrame)/1000,0,.12);lastFrame=now;
 const input={
  steer:Number(down("right"))-Number(down("left")),
  tuck:down("tuck"),brake:down("brake")
 };
 if(visuals.freeze>0)visuals.freeze=Math.max(0,visuals.freeze-dt);
 else step(game,input,dt);
 readEvents();
 stepVisuals(dt);
 feedback(dt);refresh();paint();
 requestAnimationFrame(frame);
}
gameReset(dailyChallenge?.course??0);drawRecords();requestAnimationFrame(frame);
