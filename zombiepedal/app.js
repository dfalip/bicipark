import {WORLD,ZONES,clamp,makeGame,start,togglePause,jump,fire,step} from "./engine.js";
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const ui={score:$("scoreValue"),speed:$("speedValue"),distance:$("distanceValue"),
 ammo:$("ammoValue"),hearts:$("heartsValue"),combo:$("comboValue"),
 zone:$("zoneValue"),phase:$("phaseValue"),progress:$("progressFill"),
 progressLabel:$("progressValue"),horde:$("hordeFill"),hordeValue:$("hordeValue"),
 journey:$("journeyFill"),journeyValue:$("journeyValue"),
 notice:$("notice"),status:$("statusText"),record:$("recordValue"),
 ready:$("readyPanel"),finish:$("finishPanel"),lost:$("lostPanel"),
 pause:$("pausePanel"),finishStars:$("finishStars"),
 finishSummary:$("finishSummary"),lostReason:$("lostReason"),
 zones:$("zoneList"),flash:$("impactFlash")};
const touch={pedal:$("pedalButton"),brake:$("brakeButton"),
 jump:$("jumpButton"),paint:$("paintButton")};
const RECORD="bicipark-zombiepedal-best-v1";
function loadBest(){
 try{const value=JSON.parse(localStorage.getItem(RECORD)||"null");
  return value&&typeof value==="object"&&Number.isFinite(value.score)?value:null;
 }catch{return null;}
}
let best=loadBest(),game=makeGame(),lastFrame=null,lastEvent="",lastPhase="ready",noticeLeft=0;
const keys=new Set(),pointers=new Map();

const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const fx={particles:[],words:[],circles:[],shake:0,freeze:0,flash:0,color:"#ff748a",clock:0};
const cyclistAtlas=typeof Image==="function"?new Image():null;
const zombieAtlas=typeof Image==="function"?new Image():null;
if(cyclistAtlas){cyclistAtlas.decoding="async";cyclistAtlas.src="./assets/cyclist-pedal-atlas.svg";}
if(zombieAtlas){zombieAtlas.decoding="async";zombieAtlas.src="./assets/zombie-characters-atlas.svg";}
function spriteReady(sprite,minWidth){return Boolean(sprite?.complete&&sprite.naturalWidth>=minWidth);}

function burst(x,y,color,n=18,strength=1){
 if(reducedMotion)n=Math.min(n,7);
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2;
  const v=(60+i%7*18)*strength;
  fx.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,
   life:.36+i%5*.07,total:.7,r:2+i%4*.8,color});
 }
 if(fx.particles.length>145)fx.particles.splice(0,fx.particles.length-145);
}
function textSplash(text,x,y,color="#fff4a5"){
 fx.words.push({text,x,y,vy:-47,life:1.05,color});
 if(fx.words.length>8)fx.words.shift();
}
function eventEffects(event){
 const type=event.type;
 const sourceX=xPos(event.at??game.distance);
 const x=clamp(sourceX,30,930),road=WORLD.roadY;
 if(type==="collision"){
  fx.flash=.73;fx.color="#ff5878";
  fx.shake=reducedMotion?0:24;fx.freeze=reducedMotion?0:.08;
  burst(242,road-40,"#ffacb5",45,1.4);
  burst(242,road-10,"#d0eef1",24,.8);
  textSplash("-1 COR  ·  HORDA +22",285,308,"#ffe5e1");
  ui.notice.classList.add("notice--damage");
  document.querySelector(".stage")?.classList.add("is-hit");
  ui.hearts.parentElement?.classList.add("is-damaged");
 }else if(type==="paint-shot"){
  burst(273,road-73-game.altitude,"#ffe39a",12,.9);
  fx.circles.push({x:284,y:road-71-game.altitude,r:8,life:.29,color:"#fff6b2"});
 }else if(type==="paint-hit"){
  burst(x,road-75,"#e4f58b",22,1);
  textSplash("+25",x,road-120);
 }else if(type==="paint-stun"){
  burst(x,road-74,"#b5f7a6",48,1.5);
  fx.circles.push({x,y:road-70,r:15,life:.7,color:"#c8f7a6"});
  textSplash("PLOF! +COMBO",x,road-155,"#e4ff9c");
  ui.notice.classList.add("notice--reward");
  ui.score.parentElement?.classList.add("is-reward");
 }else if(type==="jump"){
  burst(218,road-5,"#b7d1e2",17,.55);
  fx.circles.push({x:242,y:road-14,r:19,life:.35,color:"#ccfff1"});
 }else if(type==="land"){
  burst(242,road-1,"#d4e0ec",32,.8);
  fx.shake=Math.max(fx.shake,reducedMotion?0:4);
  textSplash("ATERRATGE!",242,road-95,"#d4fbeb");
 }else if(type==="dodge"){
  burst(242,road-105,"#9bf1e2",14,.6);
  textSplash("ESQUIVAT +"+(event.points||85),280,road-145,"#b8ffe0");
 }else if(type==="pickup"){
  const color=event.kind==="heart"?"#ffb0bc":event.kind==="ammo"?"#acf7dc":"#fff09d";
  burst(242,road-70,color,32,1.1);
  textSplash(event.kind==="heart"?"+1 COR":event.kind==="ammo"?"+3 PINTURA":"+190",260,road-145,color);
 }else if(type==="zone"){
  fx.flash=.28;fx.color="#a7fce6";
  fx.circles.push({x:480,y:255,r:30,life:1.4,color:"#fff6b3"});
  burst(480,230,"#d5f6aa",55,1.8);
  textSplash("ZONA "+(event.zone+1)+"!",480,150);
 }else if(type==="finish"){
  burst(480,230,"#fff0ac",65,2);
  fx.circles.push({x:480,y:260,r:30,life:1.5,color:"#fff3a5"});
 }else if(type==="lost"){
  fx.flash=.3;fx.color="#ff5878";fx.shake=reducedMotion?0:11;
 }
}
function consumeEvents(){
 if(!Array.isArray(game.events))return;
 for(const event of game.events.splice(0))eventEffects(event);
}
function updateFx(dt){
 fx.clock+=dt;
 fx.shake=Math.max(0,fx.shake-dt*44);
 fx.flash=Math.max(0,fx.flash-dt*1.4);
 ui.flash.style.opacity=String(Math.min(.76,fx.flash));
 ui.flash.style.background=fx.color==="#ff5878"?
  "radial-gradient(ellipse at 28% 70%,transparent 20%,#ff536be5 100%)":
  "radial-gradient(ellipse at 40% 65%,transparent 20%,#b7f9bbbd 100%)";
 if(fx.flash===0){
  document.querySelector(".stage")?.classList.remove("is-hit");
  ui.hearts.parentElement?.classList.remove("is-damaged");
 }
 for(const p of fx.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt;}
 fx.particles=fx.particles.filter(p=>p.life>0);
 for(const t of fx.words){t.y+=t.vy*dt;t.life-=dt;}
 fx.words=fx.words.filter(t=>t.life>0);
 for(const ring of fx.circles){ring.r+=165*dt;ring.life-=dt;}
 fx.circles=fx.circles.filter(r=>r.life>0);
}
function drawFx(){
 for(const ring of fx.circles){
  ctx.save();ctx.globalAlpha=Math.min(.9,ring.life/.7);
  ctx.lineWidth=5;ctx.strokeStyle=ring.color;ctx.beginPath();
  ctx.arc(ring.x,ring.y,ring.r,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 for(const p of fx.particles){
  ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,p.life/p.total));ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 for(const t of fx.words){
  ctx.save();ctx.globalAlpha=Math.min(1,t.life*2);ctx.textAlign="center";
  ctx.font="1000 23px system-ui";ctx.lineWidth=5;ctx.strokeStyle="#193344";
  ctx.strokeText(t.text,t.x,t.y);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);
  ctx.restore();
 }
}
function drawAtmosphere(){
 const t=game.time;
 // Multilayered skyline and animated light shafts complement vector sprites.
 for(const [h,shade,parallax] of [[240,"#254b58",.12],[310,"#345b65",.25]]){
  ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(0,420);
  for(let x=-50;x<=1030;x+=45){
   const yy=h+Math.sin((x+game.distance*parallax)/130)*31+
    Math.cos((x+game.distance*parallax)/67)*17;
   ctx.lineTo(x,yy);
  }
  ctx.lineTo(1030,420);ctx.closePath();ctx.fill();
 }
 ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle="#e1f4be";ctx.lineWidth=1;
 for(let i=0;i<25;i++){
  const x=((i*127-game.distance*.25)%1200+1200)%1200-60;
  const y=((i*61+t*13)%380);
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y+19);ctx.stroke();
 }
 ctx.restore();
 // Approaching hazard warning at right side; helps anticipate reaction timing.
 const near=game.enemies.find(e=>!e.passed&&!e.stunned&&
  e.x>game.distance+35&&e.x<game.distance+215);
 if(near){
  const x=clamp(xPos(near.x),420,905);
  ctx.save();ctx.fillStyle="#ffb86e";
  ctx.beginPath();ctx.moveTo(x,250);ctx.lineTo(x-16,279);ctx.lineTo(x+16,279);ctx.closePath();ctx.fill();
  ctx.textAlign="center";ctx.font="1000 21px system-ui";ctx.fillStyle="#21364c";
  ctx.fillText("!",x,273);ctx.restore();
 }
}

function persist(){
 const challenger={score:Math.round(game.score),distance:Math.round(game.distance),finished:game.phase==="finished"};
 if(!best||challenger.score>best.score||(challenger.score===best.score&&challenger.distance>best.distance)){
  best=challenger;
  try{localStorage.setItem(RECORD,JSON.stringify(best));}catch{/* storage unavailable */}
 }
}
function refresh(){
 ui.score.textContent=Math.round(game.score).toLocaleString("ca-ES");
 ui.speed.innerHTML=`${Math.round(game.speed*3.6)} <em>km/h</em>`;
 ui.distance.textContent=`${Math.round(game.distance)} / ${WORLD.length} m`;
 ui.ammo.textContent=`${game.ammo} / ${game.maxAmmo}`;
 ui.hearts.textContent="♥ ".repeat(game.hearts).trim()||"0";
 ui.combo.textContent="×"+game.combo;
 ui.zone.textContent=ZONES[game.zone].name.toUpperCase();
 ui.phase.textContent=({ready:"PREPARAT",running:"FUGINT",paused:"PAUSA",finished:"ESCAPAT",lost:"CAPTURAT"})[game.phase];
 const pct=Math.round(game.distance/WORLD.length*100);
 ui.progress.style.width=pct+"%";ui.progressLabel.textContent=pct+"%";
 ui.journey.style.width=pct+"%";ui.journeyValue.textContent=pct+"%";
 ui.horde.style.width=game.horde+"%";ui.hordeValue.textContent=Math.round(game.horde)+"%";
 ui.record.textContent=best?`MILLOR PUNTUACIÓ: ${best.score.toLocaleString("ca-ES")} · ${best.distance} m`:"MILLOR PUNTUACIÓ: —";
 touch.paint.disabled=game.phase!=="running"||game.ammo===0||game.fireCooldown>0;
}
function reset(){
 game=makeGame();lastFrame=null;lastEvent="";lastPhase="ready";noticeLeft=0;
 fx.particles.length=0;fx.words.length=0;fx.circles.length=0;
 fx.flash=0;fx.shake=0;fx.freeze=0;ui.flash.style.opacity="0";
 ui.notice.classList.remove("notice--damage","notice--reward");
 document.querySelector(".stage")?.classList.remove("is-hit","is-combo");
 keys.clear();pointers.clear();
 ui.ready.hidden=false;ui.finish.hidden=true;ui.lost.hidden=true;ui.pause.hidden=true;ui.notice.hidden=true;
 for(const b of Object.values(touch))b.setAttribute("aria-pressed","false");
 ui.status.textContent=game.lastEvent;refresh();paint();
}
function launch(){if(start(game)){ui.ready.hidden=true;lastFrame=null;ui.status.textContent=game.lastEvent;}}
function pauseGame(){
 if(togglePause(game)){ui.pause.hidden=game.phase!=="paused";lastFrame=null;}
}
function validKeyTarget(event){
 return !(event.target instanceof HTMLElement&&["BUTTON","INPUT","TEXTAREA","SELECT","A"].includes(event.target.tagName));
}
document.addEventListener("keydown",event=>{
 if(!["ArrowRight","ArrowLeft","ArrowUp","KeyD","KeyA","KeyW","Space","KeyX","KeyF","KeyP"].includes(event.code))return;
 if(!validKeyTarget(event))return;
 event.preventDefault();
 if(event.code==="KeyP"&&!event.repeat){pauseGame();return;}
 if(game.phase==="ready"&&["ArrowRight","KeyD","Space"].includes(event.code))launch();
 keys.add(event.code);
 if(!event.repeat&&["Space","ArrowUp","KeyW"].includes(event.code))jump(game);
 if(!event.repeat&&["KeyX","KeyF"].includes(event.code))fire(game);
});
document.addEventListener("keyup",event=>{if(keys.delete(event.code))event.preventDefault();});
function held(action){
 const mapping={pedal:["ArrowRight","KeyD"],brake:["ArrowLeft","KeyA"]};
 return [...pointers.values()].includes(action)||(mapping[action]||[]).some(code=>keys.has(code));
}
for(const [action,button] of Object.entries(touch)){
 button.setAttribute("aria-pressed","false");
 button.addEventListener("pointerdown",event=>{
  if(event.button!=null&&event.button!==0)return;
  event.preventDefault();if(game.phase==="ready")launch();
  pointers.set(event.pointerId,action);button.setAttribute("aria-pressed","true");
  try{button.setPointerCapture(event.pointerId);}catch{/* browser support */}
  if(action==="jump")jump(game);
  if(action==="paint")fire(game);
 });
 const release=event=>{
  if(pointers.get(event.pointerId)!==action)return;
  pointers.delete(event.pointerId);
  button.setAttribute("aria-pressed",String([...pointers.values()].includes(action)));
 };
 for(const type of ["pointerup","pointercancel","lostpointercapture"])
  button.addEventListener(type,release);
}
function clearInputs(){
 keys.clear();pointers.clear();
 for(const b of Object.values(touch))b.setAttribute("aria-pressed","false");
}
window.addEventListener("blur",()=>{clearInputs();if(game.phase==="running")pauseGame();});
document.addEventListener("visibilitychange",()=>{lastFrame=null;if(document.hidden&&game.phase==="running"){clearInputs();pauseGame();}});
$("playButton").addEventListener("click",launch);
$("playAgainButton").addEventListener("click",reset);
$("retryButton").addEventListener("click",reset);
$("resetButton").addEventListener("click",reset);
$("pauseButton").addEventListener("click",pauseGame);
$("resumeButton").addEventListener("click",pauseGame);
function zones(){
 ui.zones.replaceChildren();
 for(let i=0;i<ZONES.length;i++){
  const row=document.createElement("div");row.className="zone-row";
  const text=document.createElement("span");text.textContent=ZONES[i].name;
  const status=document.createElement("strong");
  status.textContent=i<=game.zone?"✓ DESBLOQUEJADA":"A "+ZONES[i].at+" m";
  row.append(text,status);ui.zones.append(row);
 }
}
function feedback(dt){
 if(game.lastEvent!==lastEvent){
  lastEvent=game.lastEvent;
  ui.notice.textContent=game.lastEvent;ui.notice.hidden=false;
  ui.status.textContent=game.lastEvent;noticeLeft=1.1;
  zones();
 }
 noticeLeft=Math.max(0,noticeLeft-dt);
 if(noticeLeft===0){
  ui.notice.hidden=true;ui.notice.classList.remove("notice--damage","notice--reward");
 }
 document.querySelector(".stage")?.classList.toggle("is-combo",game.combo>=3);
 if(game.phase!==lastPhase){
  lastPhase=game.phase;
  if(game.phase==="finished"){
   persist();ui.finish.hidden=false;
   ui.finishStars.textContent="★".repeat(game.finishStars)+"☆".repeat(3-game.finishStars);
   ui.finishSummary.textContent=`${Math.round(game.distance)} m · ${Math.round(game.time)} s · ${game.stuns} zombis frenats · ${game.dodges} esquivats · combo màxim ×${game.bestCombo} · ${Math.round(game.score).toLocaleString("ca-ES")} punts.`;
  }else if(game.phase==="lost"){
   persist();ui.lost.hidden=false;ui.lostReason.textContent=game.gameOverReason;
  }
 }
}
const CHASE_PROJECTION=1.16;
function xPos(worldX){return 242+(worldX-game.distance)*CHASE_PROJECTION;}
function drawBackground(){
 const colors=[["#354764","#89a9ad"],["#284d51","#81b69e"],["#4b456a","#8c8cae"],["#5e415c","#a47b9f"]][game.zone];
 const gradient=ctx.createLinearGradient(0,0,0,540);
 gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,960,540);
 drawAtmosphere();
 ctx.fillStyle="#d6f0d4a5";ctx.beginPath();ctx.arc(814,92,39,0,Math.PI*2);ctx.fill();
 // Parallax skyline, with reproducible buildings/trees along the world road.
 const sceneryStart=Math.max(0,Math.floor((game.distance-300)/125));
 const sceneryEnd=Math.floor((game.distance+950)/125);
 for(let i=sceneryStart;i<=sceneryEnd;i++){
  const x=242+i*125-game.distance*.56;
  const h=70+(i*47%142),y=328-h;
  ctx.fillStyle=i%3?"#203f4e90":"#2d526490";
  ctx.fillRect(x,y,89,h);
  ctx.fillStyle="#cdf5a25d";
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
   if((i+row*3+col)%3!==0)ctx.fillRect(x+10+col*17,y+12+row*21,7,9);
 }
 ctx.fillStyle="#315364";ctx.fillRect(0,404,960,136);
 ctx.fillStyle="#273b4f";ctx.fillRect(0,426,960,114);
 ctx.strokeStyle="#ffedb077";ctx.lineWidth=5;ctx.setLineDash([30,25]);
 ctx.beginPath();ctx.moveTo(0,490);ctx.lineTo(960,490);ctx.stroke();ctx.setLineDash([]);
 for(let i=0;i<9;i++){
  const x=((i*150-game.distance*1.75)%1200+1200)%1200-70;
  ctx.fillStyle="#dce7df44";ctx.fillRect(x,412,18,4);
 }
 // Silhouettes of the chasing horde grow with danger.
 ctx.fillStyle="#183335d6";
 const wave=game.time*6;
 for(let i=0;i<5;i++){
  const x=-40+game.horde*.57+i*20;
  const bob=Math.sin(wave+i)*4;
  ctx.beginPath();ctx.arc(x,382+bob,15+i%2*3,0,Math.PI*2);ctx.fill();
  ctx.fillRect(x-13,391+bob,27,62);
 }
}
function drawObstacle(enemy){
 const x=xPos(enemy.x),y=WORLD.roadY;
 if(x<-100||x>1080)return;
 ctx.save();ctx.translate(x,y);
 if(enemy.type==="barrier"){
  // A tangible roadside barricade, with cast shadow and reflective panels.
  ctx.fillStyle="#0c253760";ctx.beginPath();ctx.ellipse(3,4,34,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#e59a56";ctx.beginPath();ctx.moveTo(0,-50);ctx.lineTo(-19,-1);ctx.lineTo(20,-1);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff0c4";ctx.fillRect(-13,-24,26,8);
  ctx.fillStyle="#d36243";ctx.fillRect(-30,-7,60,8);
  ctx.strokeStyle="#ffdf91";ctx.lineWidth=2;ctx.strokeRect(-28,-7,56,7);
  ctx.restore();return;
 }
 const size=enemy.type==="big"?1.35:enemy.type==="runner"?.93:1;
 const pace=enemy.type==="runner"?17:enemy.type==="big"?7:10;
 // Animated illustrated enemy poses. The procedural renderer below is an offline fallback.
 if(spriteReady(zombieAtlas,720)){
  const phase=Math.floor(game.time*(enemy.type==="runner"?11:7)+enemy.id*.6);
  const frame=enemy.type==="helmet"?3:enemy.type==="runner"?2:Math.abs(phase)%2;
  ctx.scale(size,size);
  ctx.rotate(enemy.stunned?.22:Math.sin(game.time*6+enemy.id)*.045);
  if(enemy.stunned)ctx.globalAlpha=.72;
  ctx.drawImage(zombieAtlas,frame*180,0,180,230,-45,-122,90,125);
  if(enemy.stunned){
   ctx.globalAlpha=.23;ctx.fillStyle="#d3ff73";ctx.beginPath();
   ctx.ellipse(0,-64,38,52,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;ctx.font="900 25px system-ui";ctx.textAlign="center";
   ctx.fillStyle="#f5ff99";ctx.fillText("✦",0,-130);
  }
  ctx.restore();return;
 }

 const stride=enemy.stunned?0:Math.sin(game.time*pace+enemy.id*.82);
 const lurch=enemy.stunned?.35:Math.sin(game.time*pace*.5+enemy.id)*.065;
 ctx.scale(size,size);
 ctx.translate(0,enemy.stunned?8+Math.sin(fx.clock*14)*2:0);
 ctx.rotate(enemy.stunned?.27:lurch);
 ctx.fillStyle="#091c2a7d";ctx.beginPath();ctx.ellipse(0,4,25,7,0,0,Math.PI*2);ctx.fill();
 // Bent knees, boots, and ripped trousers move in opposition.
 for(const side of [-1,1]){
  const kneeX=side*11+stride*side*5,kneeY=-19+stride*side*4;
  const footX=side*13+stride*side*13;
  ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#26393b";ctx.lineWidth=12;
  ctx.beginPath();ctx.moveTo(side*9,-35);ctx.lineTo(kneeX,kneeY);ctx.lineTo(footX,-4);ctx.stroke();
  ctx.strokeStyle="#718779";ctx.lineWidth=2.5;ctx.beginPath();
  ctx.moveTo(kneeX-4,-13);ctx.lineTo(kneeX+5,-14);ctx.stroke();
  ctx.fillStyle="#152c35";ctx.beginPath();ctx.ellipse(footX+side*3,-2,12,5,side*.12,0,Math.PI*2);ctx.fill();
 }
 // Irregular jacket silhouette, rather than a flat rectangular enemy.
 const coat=ctx.createLinearGradient(-22,-78,20,-21);
 coat.addColorStop(0,enemy.type==="helmet"?"#817c98":enemy.type==="runner"?"#a47c58":"#688a70");
 coat.addColorStop(.58,enemy.type==="helmet"?"#535b74":enemy.type==="runner"?"#80543c":"#3e6659");
 coat.addColorStop(1,"#263e49");
 ctx.fillStyle="#172d36";ctx.beginPath();ctx.moveTo(-18,-65);ctx.lineTo(15,-69);
 ctx.lineTo(22,-32);ctx.lineTo(10,-29);ctx.lineTo(3,-34);ctx.lineTo(-10,-29);ctx.lineTo(-22,-39);ctx.closePath();ctx.fill();
 ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-15,-65);ctx.quadraticCurveTo(2,-73,18,-63);
 ctx.lineTo(18,-39);ctx.lineTo(9,-36);ctx.lineTo(2,-42);ctx.lineTo(-7,-35);
 ctx.lineTo(-17,-39);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#acb49e";ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(-2,-64);ctx.lineTo(0,-41);ctx.moveTo(9,-53);ctx.lineTo(16,-46);ctx.stroke();
 // Forward-reaching arms: shoulders and elbows articulate independently.
 for(const side of [-1,1]){
  const shoulderX=side*17,shoulderY=-62;
  const elbowX=side*(25+stride*3),elbowY=-47+stride*side*6;
  const handX=side*(34+stride*3),handY=-36-stride*side*4;
  ctx.strokeStyle="#233d42";ctx.lineWidth=11;ctx.beginPath();
  ctx.moveTo(shoulderX,shoulderY);ctx.lineTo(elbowX,elbowY);ctx.lineTo(handX,handY);ctx.stroke();
  ctx.strokeStyle="#638c78";ctx.lineWidth=6;ctx.beginPath();
  ctx.moveTo(shoulderX,shoulderY);ctx.lineTo(elbowX,elbowY);ctx.stroke();
  ctx.fillStyle="#93b69d";ctx.beginPath();ctx.ellipse(handX,handY,6,5,side*.22,0,Math.PI*2);ctx.fill();
 }
 // Neck, ears, jaw, uneven hairline, sunken eyes and visible mouth.
 ctx.fillStyle="#6c9b88";ctx.fillRect(-6,-75,12,12);
 ctx.save();ctx.rotate(stride*.055);
 const skin=ctx.createLinearGradient(-15,-99,15,-72);
 skin.addColorStop(0,"#c5d6a9");skin.addColorStop(.6,"#8bad93");skin.addColorStop(1,"#5d8c83");
 ctx.fillStyle=skin;ctx.beginPath();
 ctx.moveTo(-15,-96);ctx.quadraticCurveTo(-21,-79,-11,-71);
 ctx.quadraticCurveTo(0,-63,12,-73);ctx.quadraticCurveTo(20,-91,10,-100);
 ctx.quadraticCurveTo(-3,-106,-15,-96);ctx.fill();
 ctx.fillStyle="#6f9680";for(const side of [-1,1]){
  ctx.beginPath();ctx.ellipse(side*16,-86,5,8,side*.2,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle="#263d42";ctx.beginPath();
 ctx.moveTo(-16,-95);ctx.lineTo(-9,-106);ctx.lineTo(-4,-101);ctx.lineTo(2,-108);
 ctx.lineTo(8,-101);ctx.lineTo(16,-98);ctx.lineTo(11,-93);ctx.lineTo(0,-97);ctx.lineTo(-9,-91);ctx.fill();
 for(const side of [-1,1]){
  ctx.fillStyle="#294443";ctx.beginPath();ctx.ellipse(side*7,-86,5.6,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=enemy.stunned?"#e8e87f":"#ffcf89";
  ctx.beginPath();ctx.ellipse(side*7,-86,2.1,2,0,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle="#364d4d";ctx.beginPath();ctx.moveTo(-6,-77);ctx.quadraticCurveTo(0,-72,8,-77);
 ctx.quadraticCurveTo(0,-70,-6,-77);ctx.fill();
 ctx.strokeStyle="#e5e4c8";ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-3,-75);ctx.lineTo(5,-75);ctx.stroke();
 if(enemy.type==="helmet"){
  ctx.fillStyle="#394c5b";ctx.beginPath();ctx.arc(0,-96,21,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();
  ctx.fillStyle="#c2b466";ctx.beginPath();ctx.roundRect(-19,-97,38,6,3);ctx.fill();
  ctx.strokeStyle="#abb9ba";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-96,17,Math.PI*1.12,Math.PI*1.87);ctx.stroke();
 }
 ctx.restore();
 if(enemy.stunned){
  ctx.fillStyle="#d9ff72";ctx.globalAlpha=.25;ctx.beginPath();ctx.ellipse(0,-51,34,48,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;ctx.fillStyle="#eaff8e";ctx.font="900 25px system-ui";ctx.textAlign="center";
  ctx.fillText("✦",0,-120);
  for(let i=0;i<4;i++){
   const a=fx.clock*3+i*Math.PI/2;
   ctx.fillStyle=i%2?"#d0fc72":"#72e3bf";
   ctx.beginPath();ctx.arc(Math.cos(a)*30,-91+Math.sin(a)*12,4,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}
function drawPickups(){
 for(const item of game.pickups){
  if(item.collected)continue;
  const x=xPos(item.x);if(x<-45||x>1015)continue;
  const bob=Math.sin(game.time*4+item.id)*6;
  const color={heart:"#ffa5aa",ammo:"#a9eeac",star:"#ffef95"}[item.kind];
  ctx.save();ctx.translate(x,WORLD.roadY-68+bob);
  ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=19;
  ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#244650";ctx.font="900 23px system-ui";ctx.textAlign="center";
  ctx.fillText({heart:"♥",ammo:"●",star:"★"}[item.kind],0,8);
  ctx.restore();
 }
}
function drawPaintballs(){
 for(const ball of game.balls){
  const x=xPos(ball.x),y=WORLD.roadY-40-ball.y;
  if(x<-60||x>1040)continue;
  ctx.fillStyle="#ffda65";ctx.shadowColor="#e3f4a3";ctx.shadowBlur=17;
  ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 }
}

function drawCityRush(){
 if(reducedMotion||game.phase!=="running")return;
 const rush=clamp((game.speed-24)/49,0,1);
 if(rush<=0)return;
 ctx.save();ctx.strokeStyle="#d5fff08a";ctx.lineWidth=1.4+rush*2;
 ctx.globalAlpha=.19+rush*.22;
 for(let i=0;i<26;i++){
  const depth=i%3;
  const x=((i*193-game.distance*(1+depth*.7))%1220+1220)%1220-120;
  const y=390+((i*47+13)%120);
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-25-rush*70-depth*25,y);ctx.stroke();
 }
 ctx.restore();
 // The road flows under the wheels faster than the distant skyline.
 ctx.fillStyle="#ecf7be70";
 for(let i=0;i<10;i++){
  const x=((i*135-game.distance*3.15)%1280+1280)%1280-110;
  ctx.fillRect(x,463,34+game.speed*.6,3);
 }
}
function drawCyclist(){
 const x=242,y=WORLD.roadY-game.altitude;
 // Four pre-illustrated pedal poses, animated by actual game cadence.
 if(spriteReady(cyclistAtlas,1200)){
  const cadence=game.time*game.speed*.092;
  const frame=reducedMotion?0:Math.floor(((cadence%(Math.PI*2))+(Math.PI*2))%(Math.PI*2)/(Math.PI/2))%4;
  ctx.save();ctx.fillStyle="#091b2b70";
  ctx.beginPath();ctx.ellipse(x+2,WORLD.roadY+4,75,9,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);
  if(game.invulnerable>0&&Math.floor(fx.clock*18)%2===0)ctx.globalAlpha=.46;
  const wobble=game.stagger>0?Math.sin(fx.clock*31)*.24*game.stagger/.75:0;
  const airborne=game.grounded?0:clamp(game.vy/1400,-.17,.2);
  ctx.rotate(wobble+airborne);
  if(!reducedMotion&&game.grounded)ctx.translate(0,Math.sin(cadence*2)*.9);
  ctx.drawImage(cyclistAtlas,frame*300,0,300,260,-120,-208,240,208);
  ctx.restore();return;
 }

 const cadence=game.time*game.speed*.092;
 const pedal=Math.sin(cadence),pedalOther=Math.cos(cadence);
 ctx.save();ctx.translate(x,y);
 if(game.invulnerable>0&&Math.floor(fx.clock*18)%2===0)ctx.globalAlpha=.42;
 ctx.rotate((game.stagger>0?Math.sin(fx.clock*31)*.24*game.stagger/.75:0)+
  (game.grounded?0:clamp(game.vy/1400,-.17,.2)));
 // Racing posture changes with acceleration and speed.
 const rush=clamp((game.speed-20)/46,0,1);
 const bikeTilt=game.grounded?Math.sin(cadence)*.018:-.12;
 ctx.rotate(bikeTilt);ctx.translate(0,Math.sin(cadence*2)*.9);
 // Ground shadow, tyre spray and glowing tail lights.
 ctx.save();ctx.globalAlpha=.34;ctx.fillStyle="#081d2b";
 ctx.beginPath();ctx.ellipse(3,4,82,10,0,0,Math.PI*2);ctx.fill();ctx.restore();
 if(game.grounded&&game.speed>30){
  ctx.strokeStyle="#b5dddc88";ctx.lineWidth=2;
  for(let i=0;i<8;i++){
   const dx=(i*19+game.time*game.speed*2)%135;
   ctx.beginPath();ctx.moveTo(-53-dx,-2-i%4*5);
   ctx.lineTo(-76-dx-(game.speed-20)*.7,-4-i%4*5);ctx.stroke();
  }
 }
 // Tyres, rims, hubs and speed-responsive spokes.
 for(const dx of [-44,48]){
  ctx.fillStyle="#091f30";ctx.strokeStyle="#152d3b";ctx.lineWidth=8;
  ctx.beginPath();ctx.arc(dx,-29,27,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#9fe9de";ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(dx,-29,19,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#83b4be";ctx.lineWidth=1.4;
  for(let k=0;k<8;k++){
   const a=k*Math.PI/4+cadence*.9;
   ctx.beginPath();ctx.moveTo(dx,-29);
   ctx.lineTo(dx+Math.cos(a)*19,-29+Math.sin(a)*19);ctx.stroke();
  }
  ctx.fillStyle="#ecf9ed";ctx.beginPath();ctx.arc(dx,-29,4,0,Math.PI*2);ctx.fill();
 }
 // A believable double-triangle mountain-bike frame.
 ctx.strokeStyle="#051f2d";ctx.lineWidth=9;ctx.lineJoin="round";ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(-44,-29);ctx.lineTo(-12,-62);ctx.lineTo(12,-28);
 ctx.lineTo(-44,-29);ctx.moveTo(-12,-62);ctx.lineTo(36,-64);
 ctx.lineTo(12,-28);ctx.moveTo(36,-64);ctx.lineTo(48,-29);ctx.stroke();
 const frameColor=ctx.createLinearGradient(-40,-58,48,-25);
 frameColor.addColorStop(0,"#35f4c3");frameColor.addColorStop(.55,"#f3ee8f");frameColor.addColorStop(1,"#38a8cd");
 ctx.strokeStyle=frameColor;ctx.lineWidth=5.3;ctx.stroke();
 ctx.strokeStyle="#b0f0fb";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(36,-64);ctx.lineTo(48,-29);ctx.stroke();
 ctx.fillStyle="#f4ef9e";ctx.beginPath();ctx.arc(12,-28,8,0,Math.PI*2);ctx.fill();
 // Saddle, handlebars, front-mounted toy paint launcher.
 ctx.strokeStyle="#132b37";ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(-12,-62);ctx.lineTo(-18,-75);ctx.moveTo(37,-65);ctx.lineTo(41,-78);ctx.stroke();
 ctx.fillStyle="#102d43";ctx.beginPath();ctx.roundRect(-32,-76,32,6,3);ctx.fill();
 ctx.strokeStyle="#bed6de";ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(39,-78);ctx.lineTo(57,-81);ctx.stroke();
 ctx.save();ctx.translate(49,-78);
 ctx.fillStyle="#174454";ctx.beginPath();ctx.roundRect(0,-5,33,12,4);ctx.fill();
 ctx.fillStyle="#eefa85";ctx.beginPath();ctx.roundRect(29,-3,12,8,3);ctx.fill();
 ctx.restore();
 // Rider's moving legs and shoes are connected to the rotating crank.
 const hipX=-12,hipY=-96;
 const crankX=12,crankY=-28;
 for(const [phase,color] of [[pedal,"#143a56"],[-pedal,"#234f65"]]){
  const kneeX=-2+(phase>0?7:-9),kneeY=-65+phase*7;
  const footX=crankX+(phase>0?14:-14),footY=crankY+phase*11;
  ctx.lineWidth=10;ctx.lineCap="round";ctx.strokeStyle=color;
  ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.lineTo(footX,footY);ctx.stroke();
  ctx.strokeStyle="#0a2236";ctx.lineWidth=7;ctx.beginPath();
  ctx.moveTo(footX-3,footY);ctx.lineTo(footX+12,footY-2);ctx.stroke();
 }
 // Aerodynamic torso with jacket panels and shoulder articulation.
 ctx.save();ctx.translate(-13,-107);ctx.rotate(-.27-rush*.09);
 ctx.fillStyle="#112e43";ctx.beginPath();ctx.roundRect(-17,-30,42,51,13);ctx.fill();
 const jersey=ctx.createLinearGradient(-18,-30,26,18);
 jersey.addColorStop(0,"#c6f9d6");jersey.addColorStop(.5,"#2fe2b5");jersey.addColorStop(1,"#1089a1");
 ctx.fillStyle=jersey;ctx.beginPath();ctx.roundRect(-14,-27,36,45,11);ctx.fill();
 ctx.fillStyle="#edf891";ctx.fillRect(11,-17,5,29);
 ctx.fillStyle="#16384e";ctx.beginPath();ctx.ellipse(-2,10,17,9,0,0,Math.PI*2);ctx.fill();
 ctx.restore();
 // Both arms grip the handlebar, with gloves and highlights.
 ctx.strokeStyle="#122f44";ctx.lineWidth=10;ctx.beginPath();
 ctx.moveTo(4,-128);ctx.lineTo(26,-104);ctx.lineTo(50,-81);ctx.stroke();
 ctx.strokeStyle="#65e2bc";ctx.lineWidth=6;ctx.beginPath();
 ctx.moveTo(6,-126);ctx.lineTo(25,-106);ctx.stroke();
 ctx.fillStyle="#ffdcaf";ctx.beginPath();ctx.arc(50,-81,5,0,Math.PI*2);ctx.fill();
 // Helmet/visor with a chin line and tiny trailing aerodynamic stripe.
 ctx.fillStyle="#ffdbb0";ctx.beginPath();ctx.arc(4,-148,17,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#0d3141";ctx.lineWidth=4;ctx.beginPath();
 ctx.arc(4,-148,17,-.02,Math.PI*.87);ctx.stroke();
 const helmet=ctx.createLinearGradient(-15,-170,28,-139);
 helmet.addColorStop(0,"#e4fca4");helmet.addColorStop(.6,"#66ecb5");helmet.addColorStop(1,"#178ea6");
 ctx.fillStyle=helmet;ctx.beginPath();
 ctx.arc(3,-154,21,Math.PI*1.05,Math.PI*1.96);
 ctx.lineTo(26,-152);ctx.lineTo(17,-141);ctx.lineTo(-12,-143);ctx.closePath();ctx.fill();
 ctx.fillStyle="#0d3444";ctx.beginPath();ctx.roundRect(7,-153,22,8,4);ctx.fill();
 ctx.fillStyle="#c7f5ea";ctx.fillRect(9,-151,13,3);
 ctx.restore();
}
function paint(){
 if(!ctx)return;
 ctx.clearRect(0,0,960,540);
 ctx.save();
 if(fx.shake>0&&!reducedMotion)
  ctx.translate(Math.sin(fx.clock*79)*fx.shake,Math.cos(fx.clock*103)*fx.shake*.5);
 drawBackground();drawCityRush();
 for(const enemy of game.enemies)drawObstacle(enemy);
 drawPickups();drawPaintballs();drawCyclist();drawFx();
 ctx.restore();
 ctx.fillStyle="#102f3bc9";ctx.fillRect(0,510,960,30);
 ctx.textAlign="left";ctx.font="900 14px system-ui";ctx.fillStyle="#ecffe0";
 ctx.fillText(`${Math.round(game.time)} s · ${game.jumps} salts`,16,531);
 ctx.textAlign="right";ctx.fillStyle="#fbe8a1";
 ctx.fillText(`${game.stuns} aturats · ${game.dodges} esquivats`,944,531);
}
function frame(time){
 if(lastFrame===null)lastFrame=time;
 const dt=clamp((time-lastFrame)/1000,0,.12);lastFrame=time;
 if(fx.freeze>0)fx.freeze=Math.max(0,fx.freeze-dt);
 else step(game,{accelerate:held("pedal"),brake:held("brake")},dt);
 consumeEvents();updateFx(dt);
 feedback(dt);refresh();paint();
 requestAnimationFrame(frame);
}
reset();zones();requestAnimationFrame(frame);
