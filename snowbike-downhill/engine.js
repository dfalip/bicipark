// SnowBike Downhill: original arcade ski-bike with timed downhill and crossing wildlife.
// Deterministic physics and level generation; no graphics/browser dependencies.
export const COURSES=Object.freeze([
 {name:"Pista del Bosc",region:"Pirineus",length:1450,par:44,gates:9,animals:9,seed:43,wind:.08},
 {name:"Coll de la Guineu",region:"Alps",length:1850,par:53,gates:12,animals:13,seed:117,wind:.14},
 {name:"Gran Glacera",region:"Dolomites",length:2350,par:65,gates:15,animals:17,seed:293,wind:.19},
 {name:"Descens Extrem",region:"Cim del Món",length:2900,par:78,gates:19,animals:22,seed:709,wind:.24}
]);
export const ANIMALS=Object.freeze([
 {id:"rabbit",emoji:"🐇",label:"Conill",radius:.105,speed:.70},
 {id:"fox",emoji:"🦊",label:"Guineu",radius:.14,speed:.52},
 {id:"deer",emoji:"🦌",label:"Cérvol",radius:.19,speed:.40},
 {id:"goat",emoji:"🐐",label:"Cabra",radius:.16,speed:.49}
]);
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function skiTrackCenter(distance,courseId=0){
 return 58*Math.sin(distance/235+courseId*.9)+34*Math.cos(distance/490-courseId*.8);
}
function random(seed){
 let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
export function makeCourse(index=0){
 const id=clamp(Math.trunc(index)||0,0,COURSES.length-1);
 const c=COURSES[id],rand=random(c.seed);
 const gates=[];
 for(let i=0;i<c.gates;i++){
  const at=Math.round((i+1)*c.length/(c.gates+1));
  const lane=Number(((rand()-.5)*.95).toFixed(2));
  gates.push({id:i,at,lane,passed:false,quality:null});
 }
 const animals=[];
 for(let i=0;i<c.animals;i++){
  let at=Math.round(110+(i+.45)*(c.length-210)/c.animals);
  // Keep animal encounters away from slalom gates to allow skillful routes.
  for(const gate of gates)if(Math.abs(at-gate.at)<19)at+=30;
  at=Math.min(c.length-70,at);
  const template=ANIMALS[Math.floor(rand()*ANIMALS.length)];
  const side=rand()<.5?-1:1;
  animals.push({...template,at,id:i,side,phase:"waiting",
   x:side*1.38,seen:false,passed:false,collision:false,
   progress:0,speed:template.speed+(rand()-.5)*.1});
 }
 return {...c,id,gates,animals};
}
export function makeGame(index=0){
 const course=makeCourse(index);
 return {course,phase:"ready",distance:0,time:0,velocity:20,
  lane:0,steerVelocity:0,hearts:3,penalty:0,misses:0,hits:0,
  perfectGates:0,passedGates:0,animalsDodged:0,boost:35,
  boostTime:0,boostUsed:0,stars:0,score:0,finalTime:null,
  event:"Tria una pista i comença el descens!",eventTimer:0,
  events:[],stumble:0,invulnerability:0};
}
export function start(g){if(g.phase!=="ready")return false;g.phase="playing";g.event="ENDAVANT! Controla els esquís.";g.eventTimer=1.25;return true;}
export function pause(g){if(g.phase!=="playing")return false;g.phase="paused";return true;}
export function resume(g){if(g.phase!=="paused")return false;g.phase="playing";return true;}
function announce(g,message,type="notice",details={}){
 g.event=message;g.eventTimer=1.15;
 g.events.push({type,at:g.distance,lane:g.lane,time:g.time,...details});
 if(g.events.length>32)g.events.splice(0,g.events.length-32);
}
export function boost(g){
 if(g.phase!=="playing"||g.boost<30||g.boostTime>0)return false;
 g.boost-=30;g.boostTime=1.65;g.boostUsed++;
 announce(g,"TURBO! Busca una línia neta.","boost");
 return true;
}
function gateCross(g,gate){
 if(gate.passed)return;
 gate.passed=true;g.passedGates++;
 const error=Math.abs(g.lane-gate.lane);
 if(error<=.27){
  gate.quality="perfect";g.perfectGates++;g.score+=250;
  g.boost=clamp(g.boost+22,0,100);
  announce(g,"PORTA PERFECTA! +250 i energia turbo","gate-perfect",{at:gate.at,lane:gate.lane,points:250});
 }else if(error<=.48){
  gate.quality="passed";g.score+=100;g.boost=clamp(g.boost+8,0,100);
  announce(g,"PORTA SUPERADA! +100","gate-pass",{at:gate.at,lane:gate.lane,points:100});
 }else{
  gate.quality="missed";g.misses++;g.penalty+=3;g.score=Math.max(0,g.score-75);
  announce(g,"PORTA FALLADA: +3 s de penalització","gate-miss",{at:gate.at,lane:gate.lane,penalty:3});
 }
}
export function animalPosition(animal){
 return animal.side*(1.38-animal.progress);
}
function animalStep(g,a,dt,previousDistance){
 if(a.passed)return;
 if(a.phase==="waiting"&&g.distance>=a.at-105){a.phase="crossing";a.seen=true;}
 if(a.phase==="crossing"){
  a.progress+=a.speed*dt;
  a.x=animalPosition(a);
 }
 if(g.distance>=a.at-5 && previousDistance<=a.at+11 && !a.collision && g.invulnerability<=0){
  // Check approximate proximity at the rider's downhill crossing.
  const distanceGap=Math.abs(a.at-g.distance);
  if(distanceGap<=12&&Math.abs(g.lane-a.x)<a.radius+.12){
   a.collision=true;g.hits++;g.hearts=Math.max(0,g.hearts-1);
   g.penalty+=5;g.velocity*=.55;g.boostTime=0;
   g.stumble=.85;g.invulnerability=1.35;
   announce(g,"XOC! +5 s · recupera l'equilibri!","animal-hit",
     {at:a.at,lane:a.x,species:a.emoji,penalty:5});
   if(g.hearts===0){
    g.phase="failed";announce(g,"DESCENS INTERROMPUT: 3 col·lisions. Torna-ho a provar!","failed");
   }
  }
 }
 if(g.distance>=a.at+23){
  a.passed=true;
  if(!a.collision){
   g.animalsDodged++;g.score+=80;
   announce(g,"ANIMAL ESQUIVAT! +80","animal-dodge",{at:a.at,lane:a.x,points:80});
  }
 }
}
export function scoreFinish(g){
 if(g.phase!=="finished")return null;
 const time=g.time+g.penalty;
 return {totalTime:time,rawTime:g.time,penalty:g.penalty,
  gates:g.passedGates,perfect:g.perfectGates,animals:g.animalsDodged,
  hits:g.hits,misses:g.misses,stars:g.stars,score:g.score};
}
function advance(g,input,dt){
 if(g.phase!=="playing")return;
 const oldDistance=g.distance;
 g.time+=dt;
 g.eventTimer=Math.max(0,g.eventTimer-dt);
 g.stumble=Math.max(0,g.stumble-dt);
 g.invulnerability=Math.max(0,g.invulnerability-dt);
 const tuck=Boolean(input?.tuck),brake=Boolean(input?.brake);
 const max=47+g.course.id*2+ (tuck?15:0)+(g.boostTime>0?18:0);
 const target=brake?12:max;
 g.velocity+=(target-g.velocity)*Math.min(1,dt*(brake?3.1:tuck?1.9:1.35));
 if(g.boostTime>0)g.boostTime=Math.max(0,g.boostTime-dt);
 const turn=clamp(Number(input?.steer)||0,-1,1);
 const turnStrength=(tuck?.55:1)*(g.stumble>0?.45:1);
 g.steerVelocity+=(turn*1.15*turnStrength-g.steerVelocity)*Math.min(1,dt*9);
 // Wind and increasing speed produce small but manageable course drift.
 const drift=Math.sin(g.distance/115+g.course.seed)*g.course.wind*.12;
 g.lane=clamp(g.lane+(g.steerVelocity+drift)*dt,-1.06,1.06);
 if(Math.abs(g.lane)>1){
  g.velocity=Math.max(8,g.velocity-16*dt);
  g.score=Math.max(0,g.score-Math.round(dt*25));
 }
 g.distance=Math.min(g.course.length,g.distance+g.velocity*dt);
 for(const gate of g.course.gates)if(!gate.passed && oldDistance<gate.at && g.distance>=gate.at)gateCross(g,gate);
 for(const animal of g.course.animals)animalStep(g,animal,dt,oldDistance);
 if(g.phase!=="playing")return;
 if(g.distance>=g.course.length){
  g.phase="finished";
  g.finalTime=g.time+g.penalty;
  const ratio=g.course.par/g.finalTime;
  g.stars=g.hits===0&&g.misses<=1&&ratio>=.93?3:
    g.hits<=1&&g.misses<=3&&ratio>=.77?2:1;
  const timeBonus=Math.max(0,Math.round((g.course.par-g.finalTime+20)*45));
  g.score+=timeBonus+Math.round(g.course.length/4);
  announce(g,"META! Descens completat.","finish");
 }
}
export function step(g,input={},dt=1/60){
 if(!Number.isFinite(dt)||dt<=0)return;
 let remaining=clamp(dt,0,.12);
 while(remaining>1e-8 && g.phase==="playing"){
  const h=Math.min(remaining,1/120);
  advance(g,input,h);
  remaining-=h;
 }
}
