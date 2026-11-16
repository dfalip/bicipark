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
 zones:$("zoneList")};
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
 if(noticeLeft===0)ui.notice.hidden=true;
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
function xPos(worldX){return 242+(worldX-game.distance);}
function drawBackground(){
 const colors=[["#354764","#89a9ad"],["#284d51","#81b69e"],["#4b456a","#8c8cae"],["#5e415c","#a47b9f"]][game.zone];
 const gradient=ctx.createLinearGradient(0,0,0,540);
 gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,960,540);
 ctx.fillStyle="#d6f0d4a5";ctx.beginPath();ctx.arc(814,92,39,0,Math.PI*2);ctx.fill();
 // Parallax skyline, with reproducible buildings/trees along the world road.
 const sceneryStart=Math.max(0,Math.floor((game.distance-300)/125));
 const sceneryEnd=Math.floor((game.distance+950)/125);
 for(let i=sceneryStart;i<=sceneryEnd;i++){
  const x=242+i*125-game.distance*.44;
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
  const x=((i*150-game.distance*1.4)%1200+1200)%1200-70;
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
  ctx.fillStyle="#f3aa72";ctx.beginPath();ctx.moveTo(0,-46);ctx.lineTo(-19,0);ctx.lineTo(19,0);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff9ca";ctx.fillRect(-10,-23,20,7);
  ctx.fillStyle="#de6f53";ctx.fillRect(-27,-5,54,9);ctx.restore();return;
 }
 const size=enemy.type==="big"?1.35:enemy.type==="runner"?.93:1;
 ctx.scale(size,size);
 if(enemy.stunned){ctx.globalAlpha=.7;ctx.translate(0,8);}
 ctx.fillStyle="#162f3f75";ctx.beginPath();ctx.ellipse(0,3,24,7,0,0,Math.PI*2);ctx.fill();
 const swing=Math.sin(game.time*11+enemy.id)*5;
 ctx.strokeStyle="#294447";ctx.lineWidth=6;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(-7,-24);ctx.lineTo(-9+swing,-3);
 ctx.moveTo(8,-24);ctx.lineTo(12-swing,-3);ctx.stroke();
 ctx.fillStyle=enemy.type==="helmet"?"#71648b":enemy.type==="runner"?"#b47757":"#5e9c73";
 ctx.fillRect(-14,-61,28,37);
 ctx.strokeStyle="#57835f";ctx.lineWidth=6;ctx.beginPath();
 ctx.moveTo(-12,-51);ctx.lineTo(-25,-37+swing);
 ctx.moveTo(12,-51);ctx.lineTo(24,-39-swing);ctx.stroke();
 ctx.fillStyle="#8abda0";ctx.beginPath();ctx.arc(0,-75,17,0,Math.PI*2);ctx.fill();
 if(enemy.type==="helmet"){ctx.fillStyle="#57637f";ctx.beginPath();ctx.arc(0,-81,20,Math.PI,Math.PI*2);ctx.fill();}
 ctx.fillStyle="#244641";ctx.fillRect(-9,-78,6,4);ctx.fillRect(5,-78,6,4);
 if(enemy.stunned){
  ctx.fillStyle="#e8ce64";ctx.font="900 29px system-ui";ctx.textAlign="center";ctx.fillText("✦",0,-100);
  ctx.fillStyle="#ffe16e75";ctx.beginPath();ctx.arc(0,-45,30,0,Math.PI*2);ctx.fill();
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
function drawCyclist(){
 const x=242,y=WORLD.roadY-game.altitude;
 ctx.save();ctx.translate(x,y);
 if(game.invulnerable>0&&Math.floor(game.time*18)%2===0)ctx.globalAlpha=.48;
 if(game.speed>45){
  ctx.strokeStyle="#92ffd176";ctx.lineWidth=4;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-50-i*21,-20-i*9);ctx.lineTo(-86-i*29,-22-i*9);ctx.stroke();}
 }
 ctx.fillStyle="#162e3c";ctx.lineWidth=4;ctx.strokeStyle="#152d40";
 for(const dx of [-29,30]){
  ctx.beginPath();ctx.arc(dx,-15,20,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#d5f4c6";ctx.lineWidth=2;
  for(let k=0;k<4;k++){
   const a=k*Math.PI/4+game.time*game.speed*.08;
   ctx.beginPath();ctx.moveTo(dx-Math.cos(a)*16,-15-Math.sin(a)*16);
   ctx.lineTo(dx+Math.cos(a)*16,-15+Math.sin(a)*16);ctx.stroke();
  }
  ctx.strokeStyle="#152d40";ctx.lineWidth=4;
 }
 ctx.strokeStyle="#f7d77c";ctx.lineWidth=5;ctx.beginPath();
 ctx.moveTo(-29,-15);ctx.lineTo(-6,-43);ctx.lineTo(30,-15);ctx.lineTo(2,-15);
 ctx.lineTo(-29,-15);ctx.moveTo(-6,-43);ctx.lineTo(2,-15);ctx.stroke();
 ctx.strokeStyle="#25374c";ctx.lineWidth=6;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(2,-44);ctx.lineTo(17,-58);ctx.lineTo(28,-32);
 ctx.moveTo(-4,-42);ctx.lineTo(-15,-30);ctx.stroke();
 ctx.fillStyle="#f6a7a1";ctx.beginPath();ctx.ellipse(-6,-67,15,20,-.3,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#bfeb91";ctx.beginPath();ctx.arc(-1,-95,13,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#264a51";ctx.beginPath();ctx.arc(4,-98,4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#1a4f5d";ctx.fillRect(19,-50,20,8);
 ctx.restore();
}
function paint(){
 if(!ctx)return;
 ctx.clearRect(0,0,960,540);drawBackground();
 for(const enemy of game.enemies)drawObstacle(enemy);
 drawPickups();drawPaintballs();drawCyclist();
 ctx.fillStyle="#102f3bc9";ctx.fillRect(0,510,960,30);
 ctx.textAlign="left";ctx.font="900 14px system-ui";ctx.fillStyle="#ecffe0";
 ctx.fillText(`${Math.round(game.time)} s · ${game.jumps} salts`,16,531);
 ctx.textAlign="right";ctx.fillStyle="#fbe8a1";
 ctx.fillText(`${game.stuns} aturats · ${game.dodges} esquivats`,944,531);
}
function frame(time){
 if(lastFrame===null)lastFrame=time;
 const dt=clamp((time-lastFrame)/1000,0,.12);lastFrame=time;
 step(game,{accelerate:held("pedal"),brake:held("brake")},dt);
 feedback(dt);refresh();paint();
 requestAnimationFrame(frame);
}
reset();zones();requestAnimationFrame(frame);
