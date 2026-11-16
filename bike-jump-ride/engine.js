// BikeJump Ride: original self-contained downhill arcade world.
// Physics is deterministic, with track geometry and scoring separate from rendering.
export const WORLD=Object.freeze({width:5600,height:560,screenWidth:1000,ground:510,radius:22,finish:5480});
export const TRACK=Object.freeze([
 {x0:0,x1:520,y0:438,y1:416,type:"trail"},
 {x0:520,x1:720,y0:416,y1:340,type:"ramp"},
 {x0:930,x1:1430,y0:467,y1:438,type:"trail"},
 {x0:1430,x1:1660,y0:438,y1:337,type:"ramp"},
 {x0:1930,x1:2600,y0:483,y1:432,type:"trail"},
 {x0:2600,x1:2860,y0:432,y1:329,type:"ramp"},
 {x0:3180,x1:3830,y0:484,y1:440,type:"trail"},
 {x0:3830,x1:4060,y0:440,y1:336,type:"ramp"},
 {x0:4430,x1:5600,y0:483,y1:429,type:"trail"}
]);
export const CHECKPOINTS=Object.freeze([0,2050,3420,4570]);
export const RINGS=Object.freeze([
 {x:826,y:286},{x:1110,y:367},{x:1775,y:259},{x:2100,y:363},
 {x:2985,y:253},{x:3370,y:350},{x:4180,y:258},{x:4700,y:369}
]);
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const mix=(a,b,t)=>a+(b-a)*t;
export function trackAt(x){
  for(const s of TRACK){
    if(x>=s.x0 && x<=s.x1){
      const t=(x-s.x0)/(s.x1-s.x0);
      const baseline=mix(s.y0,s.y1,t);
      const ripple=s.type==="trail"?Math.sin(t*Math.PI*3)*3.2:0;
      return {y:baseline+ripple,slope:(s.y1-s.y0)/(s.x1-s.x0)+
        (s.type==="trail"?Math.cos(t*Math.PI*3)*3.2*Math.PI*3/(s.x1-s.x0):0),
        type:s.type};
    }
  }
  return null;
}
export function makeGame(){
  const start=trackAt(80);
  return {phase:"ready",x:80,y:start.y-WORLD.radius,
    vx:0,vy:0,angle:Math.atan(start.slope),angularVelocity:0,
    grounded:true,charge:0,airTime:0,runTime:0,score:0,
    checkpoint:0,checkpointX:80,crashes:0,landings:0,perfectLandings:0,
    rings:RINGS.map(x=>({...x,collected:false})),
    lastEvent:"Prem JUGAR i accelera amb → o el botó!",
    eventTick:0,crashClock:0,landingFx:0,progress:0,
    jumpCount:0,tiltMax:0,flightStartX:0,finishStars:0,
    distance:0,maxSpeed:0};
}
export function begin(g){
  if(g.phase!=="ready")return false;
  g.phase="riding";g.lastEvent="Endavant! Agafa velocitat abans de la primera rampa.";
  return true;
}
export function chargeJump(g,on){
  if(g.phase!=="riding")return false;
  if(on)return true;
  if(!g.grounded)return false;
  const impulse=150+g.charge*185;
  if(g.charge<.12){g.charge=0;return false;}
  g.vy=-impulse;
  g.y-=3;g.grounded=false;g.airTime=0;
  g.flightStartX=g.x;g.jumpCount++;
  g.lastEvent="SALT MANUAL! Controla la inclinació.";
  g.eventTick=.8;g.charge=0;
  return true;
}
export function restartCheckpoint(g){
  if(g.phase!=="crash")return false;
  const fresh=trackAt(g.checkpointX);
  g.x=g.checkpointX;g.y=fresh.y-WORLD.radius;
  g.vx=0;g.vy=0;g.angle=Math.atan(fresh.slope);
  g.angularVelocity=0;g.grounded=true;g.charge=0;
  g.airTime=0;g.phase="riding";g.crashClock=0;
  g.lastEvent="Torna-hi des del punt de control!";
  g.eventTick=.95;
  return true;
}
function crash(g,reason){
  g.phase="crash";g.crashes++;
  g.crashClock=0;g.score=Math.max(0,g.score-150);
  g.vx=Math.min(g.vx,200);
  g.lastEvent=reason;g.eventTick=1.5;
}
function land(g,surface){
  const delta=Math.atan2(Math.sin(g.angle-Math.atan(surface.slope)),
    Math.cos(g.angle-Math.atan(surface.slope)));
  const alignment=Math.abs(delta);
  const impact=g.vy;
  if(alignment>1.13 || impact>1030){
    crash(g,"CAIGUDA! Has aterrat massa inclinat. Reapareixeràs al punt de control.");
    return;
  }
  g.grounded=true;g.y=surface.y-WORLD.radius;
  g.vy=0;g.angularVelocity=0;
  const reward=alignment<.4?300:alignment<.79?185:70;
  g.score+=reward+Math.round(Math.min(160,g.airTime*70));
  g.landings++;
  if(reward===300)g.perfectLandings++;
  g.landingFx=.7;g.charge=0;
  g.lastEvent=reward===300?"ATERRATGE PERFECTE! +300":reward===185?
    "BON ATERRATGE! +185":"ATERRATGE DUR! +70";
  g.eventTick=1.2;
  g.angle=Math.atan(surface.slope)+delta*.36;
  g.airTime=0;
}
function subStep(g,input,dt){
  if(g.phase==="crash"){
    g.crashClock+=dt;g.vy+=680*dt;
    g.x+=g.vx*dt;g.y+=g.vy*dt;g.angle+=4.2*dt;
    if(g.crashClock>=1.25)restartCheckpoint(g);
    return;
  }
  if(g.phase!=="riding")return;
  g.runTime+=dt;
  g.eventTick=Math.max(0,g.eventTick-dt);
  g.landingFx=Math.max(0,g.landingFx-dt);
  const accelerate=Boolean(input?.accelerate);
  const brake=Boolean(input?.brake);
  if(accelerate)g.vx+=370*dt;
  else g.vx-=70*dt;
  if(brake)g.vx-=530*dt;
  g.vx=clamp(g.vx,0,510);
  g.maxSpeed=Math.max(g.maxSpeed,g.vx);
  if(input?.jumpHeld && g.grounded)g.charge=clamp(g.charge+dt*1.65,0,1);
  const earlierSurface=trackAt(g.x);
  const beforeX=g.x;
  g.x+=g.vx*dt;
  g.distance=Math.max(g.distance,g.x-80);
  const surface=trackAt(g.x);
  if(g.grounded){
    if(!surface){
      g.grounded=false;g.airTime=0;
      g.flightStartX=beforeX;g.jumpCount++;
      const rampSlope=earlierSurface?.slope??-.36;
      g.vy=Math.min(-70,rampSlope*g.vx)-(45+g.charge*110);
      g.charge=0;
      g.lastEvent="GRAN SALT! Mantén el manillar equilibrat.";
      g.eventTick=1.0;
      g.y+=g.vy*dt;
    }else{
      const verticalDelta=surface.y-WORLD.radius-g.y;
      if(verticalDelta>26 && g.vx>170){
        // Drop-off: leave the ground instead of teleporting down.
        g.grounded=false;g.airTime=0;g.vy=-50;
        g.flightStartX=beforeX;g.jumpCount++;
      }else{
        g.y=surface.y-WORLD.radius;
        const desired=Math.atan(surface.slope);
        g.angle+=(desired-g.angle)*Math.min(1,dt*8);
      }
    }
    if(g.grounded&&input?.jumpReleased)chargeJump(g,false);
  }
  if(!g.grounded && g.phase==="riding"){
    g.airTime+=dt;
    g.vy+=660*dt;
    g.y+=g.vy*dt;
    g.angularVelocity=clamp(g.angularVelocity+
      clamp(input?.lean||0,-1,1)*4.3*dt,-3.3,3.3);
    g.angularVelocity*=Math.pow(.954,dt*60);
    g.angle+=g.angularVelocity*dt;
    // Automatic mild counter-rotation keeps the default approach accessible.
    if(!input?.lean){
      let next=surface||trackAt(g.x+120)||trackAt(g.x+350);
      const target=Math.atan(next?.slope||0);
      const error=Math.atan2(Math.sin(target-g.angle),Math.cos(target-g.angle));
      g.angle+=clamp(error,-.95,.95)*dt*.72;
    }
    g.tiltMax=Math.max(g.tiltMax,Math.abs(g.angle));
    if(surface&&g.vy>=0&&g.y+WORLD.radius>=surface.y)land(g,surface);
    if(g.y>WORLD.height+170 && g.phase==="riding")
      crash(g,"HAS CAIGUT AL BARRANC! Torna a agafar velocitat.");
  }
  if(g.phase!=="riding")return;
  for(const ring of g.rings){
    if(!ring.collected&&Math.hypot(ring.x-g.x,ring.y-g.y)<38){
      ring.collected=true;g.score+=250;
      g.lastEvent="ANELLA ACONSEGUIDA! +250";g.eventTick=.8;
    }
  }
  for(let i=1;i<CHECKPOINTS.length;i++){
    const at=CHECKPOINTS[i];
    if(g.x>=at && g.checkpoint<i){
      g.checkpoint=i;g.checkpointX=at;g.score+=100;
      g.lastEvent="PUNT DE CONTROL! +100";g.eventTick=1.1;
    }
  }
  g.progress=clamp(g.x/WORLD.finish,0,1);
  if(g.x>=WORLD.finish){
    g.phase="finish";
    const secs=g.runTime;
    const timeReward=Math.max(0,Math.round(2500-secs*55));
    g.score+=timeReward;
    g.finishStars=g.crashes===0&&secs<34?3:g.crashes<=2?2:1;
    g.lastEvent="META! Has completat el circuit.";
    g.eventTick=3;
  }
}
export function step(g,input,dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  let remaining=clamp(dt,0,.08);
  const release=Boolean(input?.jumpReleased);
  let first=true;
  while(remaining>1e-8){
    const h=Math.min(remaining,1/120);
    subStep(g,{...input,jumpReleased:release&&first},h);
    first=false;remaining-=h;
  }
}


// Five opt-in personal challenges. Conditions come exclusively from the real
// local game state; only a completed ride can earn a persistent medal.
export const CHALLENGES=Object.freeze([
  {id:"finish",title:"Primera meta",help:"Acaba el circuit",icon:"🏁"},
  {id:"rings",title:"Caçador d'anelles",help:"Recull almenys 3 anelles i acaba",icon:"◎"},
  {id:"landing",title:"Aterratge fi",help:"Fes 2 aterratges perfectes i acaba",icon:"✦"},
  {id:"clean",title:"Sense caigudes",help:"Acaba sense caure",icon:"✓"},
  {id:"speed",title:"Contrarellotge",help:"Acaba en 25 segons o menys",icon:"⏱"}
]);
export function challengeProgress(g){
  const finished=g.phase==="finish";
  const collected=g.rings.filter(r=>r.collected).length;
  const perfect=g.perfectLandings||0;
  return CHALLENGES.map(c=>{
    let progress="",achieved=false;
    switch(c.id){
      case "finish":
        progress=finished?"Meta completada":"Arriba a meta";
        achieved=finished;break;
      case "rings":
        progress=String(Math.min(collected,3))+"/3 anelles";
        achieved=finished&&collected>=3;break;
      case "landing":
        progress=String(Math.min(perfect,2))+"/2 perfectes";
        achieved=finished&&perfect>=2;break;
      case "clean":
        progress=g.crashes===0?"0 caigudes":g.crashes+" caigudes";
        achieved=finished&&g.crashes===0;break;
      case "speed":
        progress=Number.isFinite(g.runTime)?Math.round(g.runTime)+" / 25 s":"— / 25 s";
        achieved=finished&&g.runTime<=25;break;
      default:throw Error("Unrecognized challenge");
    }
    return {...c,progress,achieved};
  });
}
