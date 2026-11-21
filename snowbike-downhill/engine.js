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
 {id:"goat",emoji:"🐐",label:"Cabra",radius:.16,speed:.49},
 {id:"yeti",kind:"yeti",emoji:"❄️",label:"Ieti",radius:.29,speed:.43}
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
  const spacing=(c.length-210)/c.animals;
  const nominal=110+(i+.45)*spacing;
  const low=Math.round(nominal-spacing*.32),high=Math.round(nominal+spacing*.32);
  let at=Math.round(low+rand()*(high-low));
  // A seeded irregular encounter within its own window, away from slalom poles.
  const legal=[];
  for(let candidate=low;candidate<=high;candidate++)if(candidate>55&&candidate<c.length-55&&gates.every(g=>Math.abs(g.at-candidate)>=24))legal.push(candidate);
  if(legal.length)at=legal[Math.floor(rand()*legal.length)];
  at=clamp(at,60,c.length-60);
  // Each course includes one legendary yeti encounter; advanced courses have two.
  // Other wildlife stays deterministic and common.
  const special=i===Math.floor(c.animals*.68)||(id>=2&&i===Math.floor(c.animals*.28));
  const template=special?ANIMALS[4]:ANIMALS[Math.floor(rand()*4)];
  const side=rand()<.5?-1:1;
  animals.push({...template,at,id:i,side,phase:"waiting",
   x:side*1.38,seen:false,passed:false,collision:false,jumped:false,
   progress:0,speed:template.speed+(rand()-.5)*.1,lead:115+Math.floor(rand()*30),stride:rand()*Math.PI*2,originAt:at,motionAt:0,motionLane:0,travel:0,alert:0,age:0});
 }
 return {...c,id,gates,animals};
}
export function makeGame(index=0){
 const course=makeCourse(index);
 return {course,phase:"ready",distance:0,time:0,velocity:24,
  lane:0,steerVelocity:0,hearts:3,penalty:0,misses:0,hits:0,
  airHeight:0,airVelocity:0,grounded:true,jumpCooldown:0,jumps:0,jumpDodges:0,
  perfectGates:0,passedGates:0,animalsDodged:0,boost:35,
  streak:0,bestStreak:0,tricks:0,perfectTricks:0,trickFailures:0,
  trickUsed:false,trickQuality:"",trickSpin:0,
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
// Single, timed jump. No double-jump or jumping again during crash recovery.
export function jump(g){
 if(g.phase!=="playing"||!g.grounded||g.jumpCooldown>0||g.stumble>0)return false;
 g.grounded=false;g.airHeight=0;g.airVelocity=3.8;g.jumps++;
 g.trickUsed=false;g.trickSpin=0;g.trickQuality="";
 announce(g,"SALT! Passa per sobre de l'animal.","jump");
 return true;
}
export function boost(g){
 if(g.phase!=="playing"||g.boost<30||g.boostTime>0)return false;
 g.boost-=30;g.boostTime=1.65;g.boostUsed++;
 announce(g,"TURBO! Busca una línia neta.","boost");
 return true;
}
// Risk/reward: perform one full 360 while airborne. Press near the apex for style.
export function trick(g){
 if(g.phase!=="playing"||g.grounded||g.stumble>0||g.trickUsed||
    g.airHeight<.35||g.airVelocity< -1.15)return false;
 g.trickUsed=true;g.trickSpin=0;
 g.trickQuality=Math.abs(g.airVelocity)<1.1?"perfect":"clean";
 announce(g,g.trickQuality==="perfect"?"TRUC PERFECTE! Completa la volta.":"TRUC! Mantén l'equilibri fins aterrar.","trick-start");
 return true;
}
function gateCross(g,gate){
 if(gate.passed)return;
 gate.passed=true;g.passedGates++;
 const error=Math.abs(g.lane-gate.lane);
 if(error<=.27){
  gate.quality="perfect";g.perfectGates++;
  g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);
  const points=250+Math.min(4,g.streak-1)*65;g.score+=points;
  g.boost=clamp(g.boost+22,0,100);
  announce(g,"PORTA PERFECTA! +"+points+" · ratxa ×"+g.streak,"gate-perfect",{at:gate.at,lane:gate.lane,points,streak:g.streak});
 }else if(error<=.48){
  gate.quality="passed";g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);
  const points=100+Math.min(4,g.streak-1)*30;g.score+=points;
  g.boost=clamp(g.boost+8,0,100);
  announce(g,"PORTA SUPERADA! +"+points+" · ratxa ×"+g.streak,"gate-pass",{at:gate.at,lane:gate.lane,points,streak:g.streak});
 }else{
  gate.quality="missed";g.misses++;g.streak=0;g.penalty+=3;g.score=Math.max(0,g.score-75);
  announce(g,"PORTA FALLADA: +3 s de penalització","gate-miss",{at:gate.at,lane:gate.lane,penalty:3});
 }
}
export function animalVisible(animal){return Boolean(animal.seen&&!animal.passed&&animal.phase==="crossing"&&Math.abs(animal.x)<1.62);}
export function animalPosition(animal){
 return animal.side*(1.38-animal.progress);
}
// Distinct locomotion patterns. Phase advances with simulated movement, not wall time.
export function wildlifePace(a){
 const t=a.age||0,q=t+(a.stride||0);
 if(a.label==="Conill")return {pace:1.20+.48*Math.pow(Math.sin(q*5.6),2),along:1.3,cycle:8.8};
 if(a.label==="Guineu")return {pace:1.05+.22*Math.sin(q*2.9),along:3.9,cycle:6.8};
 if(a.label==="Cérvol")return {pace:1.07+.30*Math.sin(q*4.1),along:2.0,cycle:5.3};
 if(a.label==="Cabra")return {pace:.92+.26*Math.cos(q*3.4),along:-1.2,cycle:4.5};
 return {pace:.84+.22*Math.sin(q*2.1),along:1.8,cycle:3.1};
}
export function terrainPace(distance,courseId=0){
 return 1+.075*Math.sin((distance+courseId*29)/75)+.035*Math.sin(distance/31+courseId);
}
function animalStep(g,a,dt,previousDistance){
 if(a.passed)return;
 if(a.phase==="waiting"&&g.distance>=a.at-Math.max(a.lead||115,g.velocity*2.7)){a.phase="crossing";a.seen=true;}
 if(a.phase==="crossing"){
  a.age=(a.age||0)+dt;
  const profile=wildlifePace(a),oldX=a.x,oldAt=a.at;
  // Wildlife reacts to proximity with a short flight response; the large yeti strides steadily.
  const near=Math.abs(a.at-g.distance)<48&&Math.abs(a.x-g.lane)<.85;
  a.alert=clamp((a.alert||0)+(near?dt*3:-dt*1.6),0,1);
  const panic=a.kind==="yeti"?1:1+(.22*a.alert);
  a.progress+=a.speed*profile.pace*panic*dt;
  a.x=animalPosition(a);
  const origin=a.originAt??a.at;
  a.at=clamp(a.at+profile.along*(1+.2*a.alert)*dt,origin-13,origin+19);
  a.motionAt=(a.at-oldAt)/dt;a.motionLane=(a.x-oldX)/dt;
  a.travel=(a.travel||0)+Math.hypot(a.motionAt*.12,a.motionLane)*dt*profile.cycle;
  // Once the animal reaches the far bank it stays out of the piste.
  if(Math.abs(a.x)>1.64&&a.x*a.side<0){a.phase="exited";a.motionAt=0;a.motionLane=0;}
 }
 if(g.distance>=a.at-5 && previousDistance<=a.at+11 && !a.collision && !a.jumped && g.invulnerability<=0){
  // Check approximate proximity at the rider's downhill crossing.
  const distanceGap=Math.abs(a.at-g.distance);
  if(distanceGap<=12&&Math.abs(g.lane-a.x)<a.radius+.12){
   const clearance=a.kind==="yeti"?.57:.33;
   if(!g.grounded&&g.airHeight>=clearance){
    a.jumped=true;g.jumpDodges++;
    const points=a.kind==="yeti"?250:130;
    g.score+=points;
    announce(g,a.kind==="yeti"?"IETI SALTAT! +250":"SALT PERFECTE! +130",
      "jump-dodge",{at:a.at,lane:a.x,species:a.emoji,kind:a.kind||"wildlife",points});
   }else{
    a.collision=true;g.hits++;g.streak=0;g.hearts=Math.max(0,g.hearts-1);
    g.penalty+=5;g.velocity*=.55;g.boostTime=0;
    g.stumble=.85;g.invulnerability=1.35;
    announce(g,a.kind==="yeti"?"XOC AMB UN IETI! +5 s":"XOC! +5 s · recupera l'equilibri!",
      "animal-hit",{at:a.at,lane:a.x,species:a.emoji,kind:a.kind||"wildlife",penalty:5});
    if(g.hearts===0){
     g.phase="failed";announce(g,"DESCENS INTERROMPUT: 3 col·lisions. Torna-ho a provar!","failed");
    }
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
  hits:g.hits,misses:g.misses,stars:g.stars,score:g.score,jumps:g.jumps,jumpDodges:g.jumpDodges,
  tricks:g.tricks,perfectTricks:g.perfectTricks,bestStreak:g.bestStreak,trickFailures:g.trickFailures};
}
function advance(g,input,dt){
 if(g.phase!=="playing")return;
 const oldDistance=g.distance;
 g.time+=dt;
 g.eventTimer=Math.max(0,g.eventTimer-dt);
 g.stumble=Math.max(0,g.stumble-dt);
 g.invulnerability=Math.max(0,g.invulnerability-dt);
 g.jumpCooldown=Math.max(0,g.jumpCooldown-dt);
 if(!g.grounded){
  if(g.trickUsed)g.trickSpin=clamp(g.trickSpin+dt*2.9,0,1);
  g.airHeight+=g.airVelocity*dt;
  g.airVelocity-=8.8*dt;
  if(g.airHeight<=0){
   g.airHeight=0;g.airVelocity=0;g.grounded=true;g.jumpCooldown=.28;
   announce(g,"ATERRATGE A LA NEU!","land");
   if(g.trickUsed){
    if(g.trickSpin>=.99){
     const perfect=g.trickQuality==="perfect";
     const points=perfect?460:260;
     g.tricks++;if(perfect)g.perfectTricks++;
     g.score+=points;g.boost=clamp(g.boost+(perfect?24:14),0,100);
     announce(g,perfect?"360 PERFECTE! +460 · TURBO!":"TRUC COMPLET! +260 · TURBO!","trick-land",
      {points,perfect,boost:perfect?24:14});
    }else{
     g.trickFailures++;g.streak=0;g.penalty+=2;g.velocity*=.78;
     announce(g,"TRUC INCOMPLET! +2 s · perd velocitat.","trick-fail",{penalty:2});
    }
   }
  }
 }
 const tuck=Boolean(input?.tuck),brake=Boolean(input?.brake);
 const max=(55+g.course.id*2+(tuck?18:0)+(g.boostTime>0?22:0))*terrainPace(g.distance,g.course.id);
 const target=brake?12:max;
 g.velocity+=(target-g.velocity)*Math.min(1,dt*(brake?3.3:tuck?2.35:1.75));
 if(g.boostTime>0)g.boostTime=Math.max(0,g.boostTime-dt);
 const turn=clamp(Number(input?.steer)||0,-1,1);
 const turnStrength=(tuck?.64:1)*(g.stumble>0?.45:1)*(g.grounded?1:.84);
 g.steerVelocity+=(turn*1.23*turnStrength-g.steerVelocity)*Math.min(1,dt*9);
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
