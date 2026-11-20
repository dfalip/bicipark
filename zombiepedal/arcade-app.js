import {VIEW,DISTRICTS,DISTRICT_LENGTH,clamp,makeArcade,beginArcade,pauseArcade,moveLane,jumpArcade,shootArcade,turboArcade,stepArcade,achievements} from "./arcade-engine.js";
import {drawArcade,makeEffects,pushEffects,advanceEffects} from "./arcade-art.js";
const $=id=>document.getElementById(id),canvas=$("city"),ctx=canvas.getContext("2d",{alpha:false});
const buttons=[...document.querySelectorAll("[data-action]")];
const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const STORE="bicipark-zombiepedal-arcade-v1";
let settings={story:0,endless:0,medals:[]};
try{
 const v=JSON.parse(localStorage.getItem(STORE)||"null");
 if(v&&typeof v==="object"){
  for(const mode of ["story","endless"])if(Number.isFinite(v[mode])&&v[mode]>=0)settings[mode]=Math.floor(v[mode]);
  if(Array.isArray(v.medals))settings.medals=[...new Set(v.medals.filter(id=>typeof id==="string"&&achievements(makeArcade()).some(m=>m.id===id)))];
 }
}catch{/* private browsing */}
let seed=77,g=makeArcade(seed),fx=makeEffects(),lastFrame=null,previous="ready";
let soundOn=false,audio=null;
const keys=new Set(),pointers=new Map();
const keyMap={ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",ArrowLeft:"brake",KeyA:"brake",ArrowRight:"gas",KeyD:"gas",Space:"jump",KeyX:"fire",KeyF:"fire",KeyC:"boost"};
function clearInputs(){keys.clear();pointers.clear();for(const b of buttons)b.setAttribute("aria-pressed","false");}
function isHeld(action){return [...keys].some(k=>keyMap[k]===action)||[...pointers.values()].includes(action);}
function updateButtons(){for(const b of buttons)b.setAttribute("aria-pressed",String(isHeld(b.dataset.action)));}
function unlockAudio(){
 if(!soundOn)return;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio)audio=new AC();if(audio.state==="suspended")audio.resume().catch(()=>{});}catch{/* optional */}
}
function beep(type){
 if(!soundOn||!audio||audio.state!=="running")return;
 const options={shot:[420,220,.08],paint:[210,100,.08],stun:[620,910,.15],hit:[130,42,.2],protected:[520,770,.13],pickup:[620,940,.13],turbo:[220,670,.2],wave:[330,660,.26],won:[440,880,.4],lost:[250,90,.3],jump:[250,480,.1],land:[110,85,.07]}[type];
 if(!options)return;
 try{
  const [a,b,d]=options,now=audio.currentTime,o=audio.createOscillator(),gain=audio.createGain();
  o.type=type==="hit"?"triangle":"square";o.frequency.setValueAtTime(a,now);o.frequency.exponentialRampToValueAtTime(b,now+d);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+d);
  o.connect(gain);gain.connect(audio.destination);o.start(now);o.stop(now+d+.015);
 }catch{/* no sound dependency */}
}
function saveFinish(){
 const score=Math.floor(g.score);settings[g.mode]=Math.max(settings[g.mode],score);
 for(const medal of achievements(g))if(medal.earned&&!settings.medals.includes(medal.id))settings.medals.push(medal.id);
 try{localStorage.setItem(STORE,JSON.stringify(settings));}catch{/* private mode */}
}
function renderMedals(){
 $("medals").replaceChildren();
 for(const medal of achievements(g)){
  const div=document.createElement("div"),earned=settings.medals.includes(medal.id);
  div.className="medal"+(earned?" earned":"");div.textContent=(earned?"★ ":"☆ ")+medal.name;
  $("medals").append(div);
 }
}
function setOverlay(){
 const active=g.phase==="ready"||g.phase==="paused"||g.phase==="won"||g.phase==="lost";
 $("overlay").hidden=!active;
 if(!active)return;
 const messages={
  ready:["ARCADE CITY",g.mode==="endless"?"SUPERVIVÈNCIA INFINITA":"LA HORDA JA ARRIBA!","Canvia de carril, esquiva vehicles, frena zombis amb pintura i recull recompenses. No deixis que la horda t'atrapi.","▶ COMENÇA A PEDALAR"],
  paused:["EN PAUSA","LA CIUTAT T'ESPERA","Els enemics i el cronòmetre estan aturats.","▶ CONTINUAR"],
  won:["MISSIÓ COMPLETADA","HAS ESCAPAT!",g.result,"↻ TORNA A JUGAR"],
  lost:["FI DE LA PARTIDA","LA HORDA T'HA ATRAPAT!",g.result,"↻ TORNA A JUGAR"]
 };
 const [k,t,p,b]=messages[g.phase];$("overlayKicker").textContent=k;$("overlayTitle").textContent=t;$("overlayText").textContent=p;$("play").textContent=b;
 $("resultStats").textContent=g.phase==="won"||g.phase==="lost"?Math.floor(g.score)+" punts · "+g.stuns+" aturats · "+g.dodges+" esquivats · combo ×"+g.maxCombo+" · onada "+g.wave:"";
}
function reset(changeSeed=false){
 clearInputs();if(changeSeed)seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 g=makeArcade(seed,$("mode").value);fx=makeEffects();lastFrame=null;previous="ready";
 $("status").textContent="Tria un mode i comença la partida.";
 renderMedals();setOverlay();refresh();paint();
}
function launch(){
 if(beginArcade(g)){lastFrame=null;setOverlay();refresh();}
}
function pause(){
 if(pauseArcade(g)){clearInputs();lastFrame=null;setOverlay();refresh();}
}
function action(a){
 if(g.phase==="ready")launch();
 if(g.phase!=="running")return;
 if(a==="up")moveLane(g,-1);
 if(a==="down")moveLane(g,1);
 if(a==="jump")jumpArcade(g);
 if(a==="fire")shootArcade(g);
 if(a==="boost")turboArcade(g);
}
document.addEventListener("keydown",event=>{
 if(event.target instanceof HTMLElement&&["INPUT","SELECT","BUTTON","TEXTAREA","A"].includes(event.target.tagName))return;
 if(event.code==="KeyP"||event.code==="Escape"){if(!event.repeat){event.preventDefault();pause();}return;}
 const a=keyMap[event.code];if(!a)return;
 event.preventDefault();unlockAudio();keys.add(event.code);updateButtons();
 if(!event.repeat)action(a);
});
document.addEventListener("keyup",ev=>{if(keys.delete(ev.code)){ev.preventDefault();updateButtons();}});
for(const b of buttons){
 b.setAttribute("aria-pressed","false");const a=b.dataset.action;
 b.addEventListener("pointerdown",ev=>{
  if(ev.button!=null&&ev.button!==0)return;
  ev.preventDefault();unlockAudio();
  if(g.phase!=="ready"&&g.phase!=="running")return;
  pointers.set(ev.pointerId,a);updateButtons();
  try{b.setPointerCapture(ev.pointerId);}catch{}
  action(a);
 });
 const release=ev=>{if(pointers.get(ev.pointerId)===a){pointers.delete(ev.pointerId);updateButtons();}};
 for(const event of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(event,release);
 // Keyboard or assistive-technology button activation (pointer handles real touch).
 b.addEventListener("click",ev=>{if(ev.detail===0){unlockAudio();action(a);}});
}
$("play").addEventListener("click",()=>{
 unlockAudio();
 if(g.phase==="paused")pause();
 else if(g.phase==="ready")launch();
 else{reset(true);launch();}
 $("play").blur();
});
$("pause").addEventListener("click",pause);
$("mode").addEventListener("change",()=>{if(!["running","paused"].includes(g.phase))reset();});
$("reset").addEventListener("click",()=>reset());
$("sound").addEventListener("click",()=>{
 soundOn=!soundOn;$("sound").setAttribute("aria-pressed",String(soundOn));$("sound").textContent=soundOn?"♪ SO: ON":"♪ SO: OFF";if(soundOn)unlockAudio();
});
window.addEventListener("blur",()=>{if(g.phase==="running")pause();else clearInputs();});
document.addEventListener("visibilitychange",()=>{lastFrame=null;if(document.hidden&&g.phase==="running")pause();});
const statusMessages={wave:ev=>"ONADA "+ev.wave+" · "+DISTRICTS[(ev.wave-1)%4].name,hit:()=>"Xoc! Has perdut un cor. Canvia de carril o salta.",protected:()=>"Has superat l'obstacle amb protecció!",stun:()=> "Zombi frenat · combo ×"+g.combo,pickup:ev=>({shield:"Escut actiu",ammo:"Pintura recuperada",heart:"Vida recuperada",turbo:"Càrrega de turbo",star:"Estrella aconseguida"}[ev.kind]),warning:()=> "Corredor a prop: prepara una esquivada!",won:ev=>ev.reason,lost:ev=>ev.reason};
function consume(){
 for(const ev of g.events.splice(0)){
  pushEffects(fx,ev,g,reduce);beep(ev.type);
  const message=statusMessages[ev.type]?.(ev);if(message)$("status").textContent=message;
 }
}
function refresh(){
 $("hearts").textContent="♥ ".repeat(g.hearts).trim()||"0";$("ammo").textContent=g.ammo+"/"+g.maxAmmo;
 $("turbo").textContent=g.turboCharges+(g.turbo>0?" ⚡":"");$("shield").textContent=g.shield>0?Math.ceil(g.shield)+" s":"—";
 $("combo").textContent="×"+g.combo;$("wave").textContent=g.wave;
 $("district").textContent=DISTRICTS[(g.wave-1)%4].name.toUpperCase();
 $("phase").textContent=({ready:"PREPARAT",running:g.turbo>0?"TURBO!":g.altitude>0?"EN L'AIRE":"FUGINT",paused:"PAUSA",won:"ESCAPAT",lost:"CAPTURAT"})[g.phase];
 const progress=g.mode==="story"?clamp(g.distance/(DISTRICT_LENGTH*4),0,1):(g.distance%DISTRICT_LENGTH)/DISTRICT_LENGTH;
 $("threat").style.width=g.threat+"%";$("threatText").textContent=Math.round(g.threat)+"%";
 $("progress").style.width=progress*100+"%";$("progressText").textContent=Math.round(progress*100)+"%";
 $("threat").parentElement.setAttribute("role","progressbar");$("threat").parentElement.setAttribute("aria-label","Horda");
 $("threat").parentElement.setAttribute("aria-valuenow",Math.round(g.threat));$("progress").parentElement.setAttribute("role","progressbar");
 $("progress").parentElement.setAttribute("aria-label","Progrés del circuit");$("progress").parentElement.setAttribute("aria-valuenow",Math.round(progress*100));
 $("mode").disabled=["running","paused"].includes(g.phase);$("pause").disabled=!["running","paused"].includes(g.phase);
 $("pause").textContent=g.phase==="paused"?"▶ CONTINUAR":"Ⅱ PAUSA";
 $("best").textContent="RÈCORD LOCAL: "+(settings[g.mode]?settings[g.mode].toLocaleString("ca-ES"):"—");
}
function paint(){if(ctx)drawArcade(ctx,g,fx,reduce);}
function frame(time){
 if(lastFrame===null)lastFrame=time;
 const dt=clamp((time-lastFrame)/1000,0,.1);lastFrame=time;
 if(g.phase==="running")stepArcade(g,{accelerate:isHeld("gas"),brake:isHeld("brake"),fire:isHeld("fire")},dt);
 consume();if(g.phase!=="paused")advanceEffects(fx,dt);
 if(g.phase!==previous){
  if(g.phase==="won"||g.phase==="lost"){saveFinish();renderMedals();clearInputs();setOverlay();$("play").focus({preventScroll:true});}
  previous=g.phase;
 }
 refresh();paint();requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
