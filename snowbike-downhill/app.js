import {COURSES,clamp,skiTrackCenter,makeGame,start,pause,resume,boost,step,scoreFinish} from "./engine.js";
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
 flash:$("impactFlash")};
const controls={left:$("leftButton"),right:$("rightButton"),
 tuck:$("tuckButton"),brake:$("brakeButton"),turbo:$("turboButton")};
const STORE="bicipark-snowbike-downhill-times-v1";
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
 const y=Math.max(110,Math.min(430,screenY(event.at||game.distance)));
 const x=center(event.at||game.distance)+(event.lane??game.lane)*196;
 if(event.type==="animal-hit"){
  visuals.shake=reducedMotion?0:21;
  visuals.flash=.62;visuals.freeze=reducedMotion?0:.10;
  visuals.flashColor="#ff5367";
  burst(480+game.lane*196,425,"#fff2f0",31,1.4);
  burst(x,y,"#ff7899",23,1);
  floatWord("-1 VIDA  ·  +5 S",480,350,"#fff3b9");
  ui.notice.classList.add("notice--hit");
  document.querySelector(".game-stage")?.classList.add("is-hit");
  ui.hearts.parentElement?.classList.add("hud-hit");
 }else if(event.type==="gate-perfect"||event.type==="gate-pass"){
  const perfect=event.type==="gate-perfect";
  burst(x,y,perfect?"#fff1a2":"#b0f5f1",perfect?40:19,1.15);
  visuals.rings.push({x,y,radius:14,life:.56,color:perfect?"#ffe87c":"#94fbea"});
  floatWord(perfect?"PERFECTE! +250":"+100",x,y-42);
  ui.notice.classList.add("notice--win");
  ui.gates.parentElement?.classList.add("hud-success");
 }else if(event.type==="gate-miss"){
  visuals.flash=.24;visuals.flashColor="#f7a27a";
  floatWord("+3 S",480,300,"#ffe2aa");burst(480,400,"#ffaf88",12,.7);
 }else if(event.type==="animal-dodge"){
  burst(x,y,"#c5f9ec",10,.65);
  floatWord("+80 ESQUIVAT!",x,y-20,"#baffdb");
 }else if(event.type==="boost"){
  visuals.rings.push({x:480+game.lane*196,y:414,radius:22,life:.7,color:"#ffe69a"});
  burst(480+game.lane*196,424,"#fff6b2",22,1);
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
function beginRace(){if(start(game)){ui.startPanel.hidden=true;ui.status.textContent=game.event;lastFrame=null;}}
function togglePause(){
 if(game.phase==="playing"){pause(game);ui.pausePanel.hidden=false;lastFrame=null;}
 else if(game.phase==="paused"){resume(game);ui.pausePanel.hidden=true;lastFrame=null;}
}
function keyAllowed(event){
 return !(event.target instanceof HTMLElement&&["BUTTON","SELECT","INPUT","TEXTAREA","A"].includes(event.target.tagName));
}
document.addEventListener("keydown",event=>{
 if(!["ArrowLeft","ArrowRight","ArrowDown","ArrowUp","KeyA","KeyD","KeyS","KeyW","Space","KeyP"].includes(event.code))return;
 if(!keyAllowed(event))return;
 event.preventDefault();
 if(event.code==="KeyP"&&!event.repeat){togglePause();return;}
 if(game.phase==="ready"&&["ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))beginRace();
 keys.add(event.code);
 if(event.code==="Space"&&!event.repeat)boost(game);
});
document.addEventListener("keyup",event=>{
 if(keys.delete(event.code))event.preventDefault();
});
function down(action){
 return [...pointers.values()].includes(action)||
 ({left:["ArrowLeft","KeyA"],right:["ArrowRight","KeyD"],
 tuck:["ArrowDown","KeyS"],brake:["ArrowUp","KeyW"],turbo:["Space"]}[action]||[]).some(k=>keys.has(k));
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
   ui.finishSummary.textContent=`Temps real ${formatTime(result.rawTime)} · +${result.penalty} s de penalització · ${result.perfect} portes perfectes · ${result.animals} animals esquivats · ${result.score} punts`;
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
 controls.turbo.disabled=game.phase!=="playing"||game.boost<30||game.boostTime>0;
}
function screenY(at){return 427-(at-game.distance)*.48;}
function center(at){return 480+skiTrackCenter(at,game.course.id)-skiTrackCenter(game.distance,game.course.id);}
function drawSnow(){
 const bg=ctx.createLinearGradient(0,0,960,540);
 const colors=[["#a7d8ef","#e9f6ff"],["#aedbd2","#f5fbfa"],["#c5d1f1","#f7f9ff"],["#b1d2ed","#eaf6fb"]][game.course.id];
 bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);
 ctx.fillStyle=bg;ctx.fillRect(0,0,960,540);
 drawAlpineLayers();
 const start=game.distance+(427-(-20))/.48;
 const end=game.distance+(427-560)/.48;
 const bounds=[];
 for(let y=-20;y<=560;y+=14){
  const at=game.distance+(427-y)/.48;
  const c=center(at),w=230+15*Math.sin(at/167);
  bounds.push({y,left:c-w,right:c+w});
 }
 ctx.beginPath();ctx.moveTo(bounds[0].left,bounds[0].y);
 for(const b of bounds)ctx.lineTo(b.left,b.y);
 for(const b of bounds.slice().reverse())ctx.lineTo(b.right,b.y);
 ctx.closePath();ctx.fillStyle="#f5fcff";ctx.fill();
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
   const at=game.distance+(427-y)/.48,x=center(at)+s*200;
   if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();
 }
 ctx.setLineDash([]);
 // Stable seeded scenery is drawn from track-distance positions, not random per frame.
 const i0=Math.max(0,Math.floor((game.distance-250)/85));
 const i1=Math.floor((game.distance+1030)/85);
 for(let i=i1;i>=i0;i--){
  const at=i*85,screen=screenY(at);if(screen<0||screen>550)continue;
  const side=i%2===0?-1:1;
  const x=center(at)+side*(270+(i*31%170));
  const scale=.5+screen/650;
  ctx.save();ctx.translate(x,screen);ctx.scale(scale,scale);
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
function drawAnimals(){
 const animals=game.course.animals.filter(a=>!a.passed&&screenY(a.at)>-40&&screenY(a.at)<570).sort((a,b)=>b.at-a.at);
 for(const a of animals){
  const y=screenY(a.at);if(y<0||y>540)continue;
  const x=center(a.at)+a.x*192;
  const scale=clamp(.55+y/750,.55,1.18);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle="#31567e3a";ctx.beginPath();ctx.ellipse(0,12,25,7,0,0,Math.PI*2);ctx.fill();
  ctx.shadowColor="#273a5870";ctx.shadowBlur=13;
  ctx.font="48px system-ui";ctx.textAlign="center";
  ctx.fillText(a.emoji,0,8);ctx.shadowBlur=0;
  if(a.phase==="crossing"&&Math.abs(a.at-game.distance)<85){
   ctx.fillStyle="#f8bf65";ctx.beginPath();
   ctx.moveTo(0,-77);ctx.lineTo(-13,-52);ctx.lineTo(13,-52);ctx.closePath();ctx.fill();
   ctx.fillStyle="#1a344d";ctx.font="1000 20px system-ui";ctx.fillText("!",0,-56);
  }
  ctx.restore();
 }
}
function drawBike(){
 const x=480+game.lane*196,y=427;
 ctx.save();ctx.translate(x,y);
 ctx.rotate(game.steerVelocity*.09+
  (game.stumble>0?Math.sin(game.time*29)*.36*Math.min(1,game.stumble/.85):0));
 if(game.invulnerability>0&&Math.floor(game.time*16)%2===0)ctx.globalAlpha=.38;
 if(game.boostTime>0){
  for(let i=0;i<5;i++){ctx.strokeStyle="#76ddec88";ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo((i-2)*8,29);ctx.lineTo((i-2)*12,55+i*10);ctx.stroke();}
 }
 // Two visible skis under a mountain ski-bike, viewed from above.
 for(const side of [-1,1]){
  ctx.fillStyle="#1b3b54";ctx.beginPath();
  ctx.roundRect(side*13-5,-26,10,64,5);ctx.fill();
  ctx.fillStyle="#7febd7";ctx.fillRect(side*13-2,-22,4,53);
 }
 ctx.strokeStyle="#e8b55c";ctx.lineWidth=5;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(-17,10);ctx.lineTo(0,26);
 ctx.lineTo(17,10);ctx.lineTo(0,-19);ctx.stroke();
 ctx.strokeStyle="#243f53";ctx.lineWidth=7;
 ctx.beginPath();ctx.moveTo(-17,-10);ctx.lineTo(17,-10);ctx.stroke();
 ctx.fillStyle=game.stumble>0?"#ffe27f":"#e56386";
 ctx.beginPath();ctx.ellipse(0,-3,14,20,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#2d5f88";ctx.beginPath();ctx.arc(0,-14,12,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#a1fcf3";ctx.beginPath();ctx.arc(0,-18,6,Math.PI,Math.PI*2);ctx.fill();
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
 drawSnow();drawGates();drawAnimals();
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
 drawBike();drawFeedback();
 ctx.restore();
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
gameReset();drawRecords();requestAnimationFrame(frame);
