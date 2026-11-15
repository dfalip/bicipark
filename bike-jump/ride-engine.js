// BikeJump Ride circuits. Original arcade platform-racing game, no third-party
// art or services. Deterministic world coordinates and real (arcade) collisions.
export const VIEW={width:1000,height:560,clearance:18};
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const P=(pairs)=>pairs.map(([x,y])=>({x,y}));
export const TRACKS=Object.freeze([
 {id:"forest",name:"Bosc Volador",tag:"🌲 FOREST FLOW",length:4850,par:44,
  background:"forest",
  points:P([[0,448],[240,450],[430,462],[625,455],[790,346],[835,326],
    [1120,425],[1310,438],[1480,432],[1670,356],[1720,343],
    [1980,427],[2300,443],[2510,392],[2640,365],[2800,410],
    [3030,440],[3220,355],[3280,330],[3590,438],[3880,455],
    [4200,435],[4490,414],[4850,425]]),
  gaps:[[836,1120],[1721,1980],[3281,3590]],
  rings:[[1025,260],[1420,350],[1900,270],[2420,330],[3500,245],[4050,350]],
  checkpoints:[1260,2390,3770],
  obstacles:[{x:1550,type:"log"},{x:2760,type:"cone"},{x:4000,type:"log"}]},
 {id:"canyon",name:"Canyon Rush",tag:"🏜 CANYON RUSH",length:5160,par:49,
  background:"canyon",
  points:P([[0,450],[260,442],[500,464],[750,355],[825,318],
    [1190,433],[1430,446],[1740,330],[1800,308],
    [2130,437],[2370,458],[2600,384],[2730,372],
    [3050,425],[3320,454],[3630,327],[3690,318],
    [4100,448],[4430,422],[4750,448],[5160,430]]),
  gaps:[[826,1190],[1801,2130],[3691,4100]],
  rings:[[1110,255],[1590,327],[2050,245],[2940,330],[3970,225],[4620,360]],
  checkpoints:[1400,2500,4350],
  obstacles:[{x:1540,type:"cone"},{x:2430,type:"log"},{x:4590,type:"cone"}]},
 {id:"skyline",name:"Skyline Dash",tag:"🌆 SKYLINE DASH",length:5420,par:52,
  background:"city",
  points:P([[0,438],[290,454],[510,448],[740,345],[806,310],
    [1190,444],[1490,448],[1740,372],[1890,334],
    [2250,434],[2540,438],[2800,329],[2860,308],
    [3260,439],[3560,460],[3830,375],[3900,355],
    [4260,430],[4580,449],[4870,380],[4960,355],[5420,427]]),
  gaps:[[807,1190],[1891,2250],[2861,3260],[3901,4260]],
  rings:[[1100,225],[1640,334],[2120,260],[3150,230],[4160,270],[4820,325]],
  checkpoints:[1450,2550,3520,4590],
  obstacles:[{x:1390,type:"log"},{x:2530,type:"cone"},{x:4590,type:"log"}]}
]);
export function trackSurface(level,x){
  x=clamp(x,0,level.length);
  const gap=level.gaps.find(([start,end])=>x>=start&&x<end);
  if(gap)return {exists:false,y:null,slope:null};
  const pts=level.points;
  let i=0;
  while(i<pts.length-2&&x>pts[i+1].x)i++;
  const a=pts[i],b=pts[i+1],dx=Math.max(.00001,b.x-a.x);
  return {exists:true,y:a.y+(b.y-a.y)*clamp((x-a.x)/dx,0,1),
    slope:(b.y-a.y)/dx};
}
export function jumpEnergy(level,bike){
  const s=trackSurface(level,bike.x);
  return s.exists?clamp((Math.abs(s.slope)+.4)*bike.vx,180,390):240;
}
export function newRace(index=0){
  const i=clamp(index|0,0,TRACKS.length-1),level=TRACKS[i],surface=trackSurface(level,85);
  return {index:i,phase:"ready",level,elapsed:0,penalty:0,
    rider:{x:85,y:surface.y-VIEW.clearance,vx:0,vy:0,angle:0,spin:0,
      grounded:true,jumps:0,failed:0,landingQuality:"",wheelSpin:0,jumpCooldown:0,
      suspension:0},
    rings:level.rings.map(([x,y])=>({x,y,found:false})),
    checkpoints:level.checkpoints.map(x=>({x,reached:false})),
    obstacles:level.obstacles.map(o=>({...o,hit:false})),
    score:0,bestCombo:0,combo:0,notice:"Un toc a GAS per començar a conduir.",noticeTime:0,
    camera:{x:500,y:280,zoom:1},particles:[],finishTime:null};
}
function pulse(g,text,time=.85){
  g.notice=text;g.noticeTime=time;
}
function flash(g,x,y,color,count=10){
  for(let i=0;i<count;i++){
    const angle=i*2.39996,force=65+(i%5)*23;
    g.particles.push({x,y,vx:Math.cos(angle)*force,
      vy:Math.sin(angle)*force-70,t:.55+(i%5)*.06,color,r:2+i%3});
  }
  if(g.particles.length>110)g.particles.splice(0,g.particles.length-110);
}
export function startRace(g){
  if(g.phase!=="ready")return false;
  g.phase="racing";g.rider.vx=135;
  pulse(g,"ARRANCA! Mantén GAS i salta abans dels obstacles.",1.8);
  return true;
}
export function attemptJump(g){
  const b=g.rider;
  if(g.phase!=="racing"||!b.grounded||b.jumpCooldown>0||b.vx<90)return false;
  b.grounded=false;b.vy=-clamp(210+b.vx*.32,225,340);
  b.spin=-.08;b.jumps++;
  b.jumpCooldown=.75;
  flash(g,b.x,b.y+16,"#fff4bc",8);
  pulse(g,"SALTA! Inclina la bici per preparar l'aterratge.",1);
  return true;
}
function land(g,surface){
  const b=g.rider,angle=Math.atan(surface.slope),
    error=Math.abs(normalize(b.angle-angle));
  const heavy=b.vy>390,crash=error>1.13||(heavy&&error>.78);
  if(crash){
    b.failed++;g.penalty+=2.5;g.combo=0;b.vx*=.48;
    pulse(g,"ATERRATGE DUR! −2,5 s de penalització.",1.2);
    flash(g,b.x,b.y,"#ffa594",18);
  }else{
    const perfect=error<.38 && b.vy<365;
    b.landingQuality=perfect?"perfect":"rough";
    g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
    g.score+=perfect?300:100;
    pulse(g,perfect?"✦ ATERRATGE PERFECTE! +300":"BONA RECEPCIÓ! +100");
    flash(g,b.x,b.y+16,perfect?"#d8ffa5":"#f4e4c2",perfect?16:9);
  }
  b.y=surface.y-VIEW.clearance;
  b.vy=0;b.spin=0;b.grounded=true;
  b.angle=angle;b.suspension=1;b.jumpCooldown=.35;
}
function normalize(v){return Math.atan2(Math.sin(v),Math.cos(v));}
function updatePhysics(g,dt,control){
  const b=g.rider,level=g.level;
  b.jumpCooldown=Math.max(0,b.jumpCooldown-dt);
  const ground=trackSurface(level,b.x);
  if(b.grounded){
    const throttle=control.accelerate?255:0;
    const braking=control.brake?510:0;
    const slope=ground.exists?ground.slope:0;
    const acc=throttle-55-braking+clamp(slope*160,-125,125);
    b.vx=clamp(b.vx+acc*dt,0,435);
    b.x=clamp(b.x+b.vx*dt,0,level.length+40);
    b.wheelSpin+=b.vx*dt/15;
    const next=trackSurface(level,b.x);
    if(!next.exists && ground.exists){
      // Take off at the physical lip, carry momentum across the gap.
      const lip=level.gaps.find(([start])=>b.x>=start-4&&b.x<start+12);
      if(lip){
        b.x=lip[0]+1;
        b.vy=-jumpEnergy(level,{x:lip[0]-2,vx:b.vx});
        b.grounded=false;b.jumps++;b.spin=-.17;
        pulse(g,"GRAN SALT! Travessa el buit!");
        flash(g,b.x,b.y+10,"#fff3bd",13);
      }else{b.grounded=false;b.vy=0;}
    }else if(next.exists){
      b.y=next.y-VIEW.clearance;
      const slopeAngle=Math.atan(next.slope);
      b.angle=normalize(b.angle+(slopeAngle-b.angle)*Math.min(1,dt*10));
    }
  }else{
    b.vx=clamp(b.vx+(control.accelerate?25:0)*dt-(control.brake?75:0)*dt,20,460);
    b.vy+=605*dt;
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    const lean=(Number(!!control.leanForward)-Number(!!control.leanBack));
    b.spin=clamp(b.spin+lean*2.7*dt,-1.9,1.9);
    b.spin*=Math.exp(-1.5*dt);
    b.angle=normalize(b.angle+b.spin*dt);
    b.wheelSpin+=b.vx*dt/15;
    const surface=trackSurface(level,b.x);
    if(surface.exists&&b.vy>0&&b.y>=surface.y-VIEW.clearance){
      land(g,surface);
    }
  }
  b.suspension=Math.max(0,b.suspension-dt*3);
  if(b.y>850 || (b.vx<15&&b.x<level.length-20&&g.elapsed>8&&g.elapsed%5<dt)){
    respawn(g);
  }
  for(const ring of g.rings){
    if(!ring.found && Math.hypot(b.x-ring.x,b.y-ring.y)<39){
      ring.found=true;g.score+=250+g.combo*25;
      pulse(g,"ANELLA ACONSEGUIDA! +250");
      flash(g,ring.x,ring.y,"#fff2a1",21);
    }
  }
  for(const cp of g.checkpoints){
    if(!cp.reached&&b.x>=cp.x){
      cp.reached=true;g.score+=150;
      pulse(g,"CHECKPOINT! +150");
    }
  }
  for(const obs of g.obstacles){
    if(!obs.hit && b.grounded && Math.abs(b.x-obs.x)<21){
      obs.hit=true;b.vx*=.38;g.penalty+=1.5;
      g.combo=0;g.score=Math.max(0,g.score-100);
      pulse(g,"OBSTACLE! Has perdut velocitat.");
      flash(g,obs.x,b.y,"#ff9c6f",16);
    }
  }
  if(b.x>=level.length){
    g.phase="finished";g.finishTime=g.elapsed+g.penalty;
    const all=g.rings.filter(r=>r.found).length;
    const bonus=Math.max(0,Math.round((level.par-g.finishTime)*45));
    g.score+=bonus+all*50;
    pulse(g,"META! Has completat el circuit!",3);
  }
}
export function respawn(g){
  if(g.phase!=="racing")return;
  const cp=[85,...g.checkpoints.filter(c=>c.reached).map(c=>c.x+8)].at(-1);
  const x=trackSurface(g.level,cp).exists?cp:Math.min(g.level.length,cp+80);
  const s=trackSurface(g.level,x),b=g.rider;
  b.x=x;b.y=(s.exists?s.y:438)-VIEW.clearance;b.vx=115;b.vy=0;
  b.angle=Math.atan(s.slope||0);b.spin=0;b.grounded=true;
  b.failed++;b.jumpCooldown=.35;g.combo=0;g.penalty+=3;
  pulse(g,"RESCAT! Tornes a l'últim checkpoint (+3 s).",1.7);
  flash(g,b.x,b.y,"#ff997e",16);
}
export function stepRace(g,elapsed,control={}){
  if(!(elapsed>0))return;
  let left=clamp(elapsed,0,.07);
  while(left>1e-6){
    const dt=Math.min(left,1/120);left-=dt;
    if(g.phase==="racing"){
      g.elapsed+=dt;
      updatePhysics(g,dt,control);
    }
    if(g.noticeTime>0)g.noticeTime=Math.max(0,g.noticeTime-dt);
    for(const p of g.particles){
      p.vy+=290*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;
    }
    g.particles=g.particles.filter(p=>p.t>0);
  }
}
export function driveCamera(g,seconds){
  const b=g.rider;
  const zoom=clamp(1-(b.grounded?0:.13)-clamp(b.vx/1600,0,.16),.68,1);
  const target={x:clamp(b.x+165,500,g.level.length-290),
    y:clamp(b.y-50,240,410),zoom};
  const a=1-Math.exp(-Math.max(0,seconds)*4.5);
  g.camera.x+=(target.x-g.camera.x)*a;
  g.camera.y+=(target.y-g.camera.y)*a;
  g.camera.zoom+=(target.zoom-g.camera.zoom)*a;
}
export function raceGrade(g){
  if(g.phase!=="finished")return 0;
  const t=g.finishTime;
  return t<g.level.par&&g.rings.filter(r=>r.found).length>=4?3:
    t<g.level.par*1.25?2:1;
}
