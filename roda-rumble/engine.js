// RodaRumble: original, deterministic offline arcade demolition physics.
// Canvas-world positions in pixels; no external assets or third-party game IP.
export const WORLD={width:1000,height:560,ground:510,anchor:{x:158,y:389}};
export const clamp=(value,a,b)=>Math.min(b,Math.max(a,value));
export const LEVELS=Object.freeze([
  {name:"Primer impacte",subtitle:"Aprèn a trencar la torre de ferralla",shots:4,
   blocks:[
    ["wood",650,480,54,60],["glass",715,478,54,64],
    ["wood",682,430,135,22],["glass",682,379,52,78]
   ],
   robots:[[682,323],[780,488]],bombs:[]},
  {name:"La fàbrica",subtitle:"Fes caure les dues estructures",shots:4,
   blocks:[
    ["wood",555,478,52,64],["steel",622,473,50,74],
    ["glass",588,426,121,24],["wood",590,385,45,60],
    ["wood",812,481,48,56],["glass",874,480,52,57],
    ["wood",844,434,119,22],["glass",844,392,46,63]
   ],
   robots:[[585,350],[844,353],[750,488]],bombs:[]},
  {name:"Efecte dominó",subtitle:"Els bidons vermells desencadenen reaccions",shots:4,
   blocks:[
    ["wood",578,482,52,56],["steel",644,480,42,61],
    ["glass",610,430,133,23],["wood",610,386,49,68],
    ["wood",802,481,54,56],["wood",861,480,54,58],
    ["glass",829,433,144,22],["glass",832,385,46,73]
   ],
   robots:[[610,343],[829,341],[926,488]],bombs:[[730,491]]},
  {name:"Castell circular",subtitle:"Domina l'angle i acaba el desafiament",shots:5,
   blocks:[
    ["steel",570,479,47,62],["wood",632,478,46,65],["glass",692,478,48,65],
    ["wood",634,428,192,23],["glass",589,387,46,60],
    ["wood",676,387,47,60],["wood",635,344,146,20],
    ["steel",822,482,54,57],["glass",890,481,52,58],
    ["wood",853,431,129,23],["glass",849,388,47,66]
   ],
   robots:[[636,310],[852,355],[750,489]],bombs:[[788,491]]},
  {name:"Pont de ferralla",subtitle:"Tira el suport i desencadena un dominó",shots:5,
   blocks:[
    ["glass",545,481,45,56],["steel",607,476,49,67],
    ["wood",576,427,142,21],["glass",580,380,42,72],
    ["wood",770,478,51,64],["wood",830,480,50,59],
    ["glass",800,428,130,22],["wood",805,388,56,58],
    ["steel",912,485,46,52]
   ],robots:[[580,340],[800,352],[920,452]],bombs:[[696,491]]},
  {name:"Gran demolició",subtitle:"Sis rodes i una fortalesa: combina les tres habilitats",shots:6,
   blocks:[
    ["steel",545,480,51,60],["glass",613,479,51,62],["wood",680,480,51,62],
    ["wood",613,428,195,23],["glass",574,382,46,70],["steel",641,384,45,67],
    ["glass",613,334,143,20],["wood",794,482,49,60],["glass",854,482,49,60],
    ["steel",917,480,51,62],["wood",851,427,177,22],
    ["glass",809,384,48,65],["wood",882,386,45,62],["steel",850,337,142,20]
   ],robots:[[609,300],[851,303],[746,487],[950,486]],bombs:[[715,491],[774,492]]}
]);
export const SHOT_TYPES=Object.freeze([
  {id:"impact",label:"RODA MARTELL",icon:"●",color:"#ffe16a",help:"Impacte potent contra fusta i vidre"},
  {id:"pulse",label:"RODA POLS",icon:"✦",color:"#8cfbe4",help:"Turbo: ona expansiva"},
  {id:"drill",label:"RODA TREPANT",icon:"◆",color:"#fd9a76",help:"Perfora millor l'acer"}
]);
export function upcomingShot(g){return SHOT_TYPES[g.shotCount%SHOT_TYPES.length];}
const MATERIAL={wood:{hp:60,mass:1.3,score:85,bounce:.24},
  glass:{hp:32,mass:.85,score:110,bounce:.16},
  steel:{hp:145,mass:2.5,score:140,bounce:.12}};
const centerDist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let serial=0;
export function newGame(index=0){
  const level=LEVELS[clamp(index|0,0,LEVELS.length-1)];
  const entities=level.blocks.map(([material,x,y,w,h])=>({
    id:++serial,kind:"block",material,x,y,w,h,hp:MATERIAL[material].hp,
    vx:0,vy:0,angle:0,spin:0,mass:MATERIAL[material].mass,dead:false}));
  const robots=level.robots.map(([x,y])=>({
    id:++serial,kind:"robot",x,y,r:18,vx:0,vy:0,dead:false,blink:0}));
  const bombs=level.bombs.map(([x,y])=>({
    id:++serial,kind:"bomb",x,y,r:17,dead:false}));
  return {levelIndex:clamp(index|0,0,LEVELS.length-1),levelName:level.name,
    phase:"aim",shotsLeft:level.shots,shotsTotal:level.shots,
    angle:42,power:77,score:0,combo:0,shotCount:0,shotTime:0,
    blocks:entities,robots,bombs,projectile:null,debris:[],pulses:[],
    shake:0,celebration:0,notice:"Arrossega la roda enrere i deixa-la anar!",
    lastResult:null};
}
export function setAim(g,angle,power){
  if(g.phase!=="aim")return false;
  g.angle=clamp(Number(angle)||0,8,78);
  g.power=clamp(Number(power)||0,15,100);
  return true;
}
export function aimFromPointer(g,x,y){
  if(g.phase!=="aim")return false;
  const dx=clamp(WORLD.anchor.x-x,8,145);
  const dy=clamp(y-WORLD.anchor.y,8,155);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const power=Math.hypot(dx,dy)/115*100;
  return setAim(g,angle,power);
}
export function fire(g){
  if(g.phase!=="aim"||g.shotsLeft<=0)return false;
  const theta=g.angle*Math.PI/180;
  const speed=115+g.power*5.1;
  const type=upcomingShot(g).id;
  g.projectile={x:WORLD.anchor.x,y:WORLD.anchor.y,r:type==="drill"?17:18,
    vx:Math.cos(theta)*speed,vy:-Math.sin(theta)*speed,angle:0,spin:0,
    type,active:true,turbo:false,lowSpeed:0};
  g.shotsLeft-=1;g.shotCount+=1;g.shotTime=0;g.combo=0;
  g.phase="flying";g.notice=type==="pulse"
    ?"RODA POLS! Activa el turbo a prop dels blocs per crear una ona expansiva."
    :type==="drill"?"RODA TREPANT! Turbo perfora millor l'acer."
    :"RODA MARTELL! Turbo augmenta la força de l'impacte.";
  return true;
}
export function turbo(g){
  const p=g.projectile;
  if(g.phase!=="flying"||!p||p.turbo)return false;
  p.turbo=true;
  if(p.type==="pulse"){
    if(p.x<440){
      // New players may press early: arm the pulse and fire it automatically
      // when the wheel reaches the scrapyard. Never waste an input at spawn.
      p.pulseArmed=true;
      g.notice="ONA ARMADA! S'activarà quan la roda arribi a les torres.";
    }else{
      shockwave(g,p.x,p.y,145);
      p.vx*=.83;p.vy*=.83;
      g.notice="ONA EXPANSIVA! Mira com cauen les torres.";
    }
  }else if(p.type==="drill"){
    p.vx+=205;p.vy-=25;g.shake=Math.max(g.shake,7);
    g.notice="TREPANT ACTIVAT! Travessa les defenses.";
  }else{
    p.vx+=155;p.vy-=65;g.shake=Math.max(g.shake,5);
    g.notice="MARTELL ACTIVAT! Busca el punt feble.";
  }
  return true;
}
function sparks(g,x,y,color,count=12){
  for(let i=0;i<count;i++){
    const a=(i*2.399963229728653)% (Math.PI*2);
    const speed=70+(i%5)*34;
    g.debris.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-100,
      life:.38+(i%5)*.13,maxLife:.9,color,r:2+(i%4)});
  }
  if(g.debris.length>170)g.debris.splice(0,g.debris.length-170);
}
function damageBlock(g,b,impulse,x=b.x,y=b.y){
  if(b.dead||impulse<19)return;
  const material=MATERIAL[b.material];
  b.hp-=Math.max(0,impulse)*(b.material==="steel"?.36:b.material==="wood"?.75:1.06);
  if(b.hp<=0){
    b.dead=true;g.score+=material.score+(g.combo++*10);
    sparks(g,x,y,b.material==="glass"?"#96f6ff":b.material==="steel"?"#8cb6cb":"#ffca83",17);
    g.shake=Math.max(g.shake,5);
  }
}
function eliminateRobot(g,t,x=t.x,y=t.y){
  if(t.dead)return;
  t.dead=true;g.score+=650+(g.combo++*90);
  g.notice="OBJECTIU DESTRUÏT! +650";
  sparks(g,x,y,"#fbef76",27);g.shake=Math.max(g.shake,10);
}
function explode(g,b){
  if(b.dead)return;
  b.dead=true;g.score+=350;g.shake=15;
  sparks(g,b.x,b.y,"#ff765f",50);
  for(const t of g.robots){
    if(!t.dead && centerDist(t,b)<145)eliminateRobot(g,t);
  }
  for(const target of g.blocks){
    if(target.dead)continue;
    const dist=centerDist(target,b);
    if(dist<180){
      const force=(180-dist)*1.25;
      const direction=Math.atan2(target.y-b.y,target.x-b.x);
      target.vx+=Math.cos(direction)*force/target.mass;
      target.vy+=Math.sin(direction)*force/target.mass-55;
      target.spin+=(Math.cos(direction)>0?1:-1)*.9;
      damageBlock(g,target,force*.65);
    }
  }
  for(const other of g.bombs){
    if(other!==b && !other.dead && centerDist(other,b)<150)explode(g,other);
  }
}
function shockwave(g,x,y,radius=145){
  g.pulses.push({x,y,radius,elapsed:0,duration:.65});
  g.shake=Math.max(g.shake,9);
  sparks(g,x,y,"#98ffed",22);
  for(const b of g.blocks){
    if(b.dead)continue;
    const dx=b.x-x,dy=b.y-y,dist=Math.hypot(dx,dy);
    const reach=radius+Math.max(b.w,b.h)*.28;
    if(dist>reach)continue;
    const intensity=1-clamp(dist/reach,0,1);
    const impact=58+intensity*180;
    b.vx+=(dx/(dist||1))*impact/b.mass;
    b.vy+=(dy/(dist||1))*impact/b.mass-48*intensity;
    b.spin+=Math.sign(dx||1)*intensity*2.1;
    damageBlock(g,b,impact*(b.material==="steel"?.55:1.15));
  }
  for(const t of g.robots){
    if(t.dead)continue;
    const d=Math.hypot(t.x-x,t.y-y);
    if(d<radius*.54)eliminateRobot(g,t);
    else if(d<radius){t.vx+=(t.x-x)/(d||1)*190;t.vy-=190;}
  }
  for(const b of g.bombs){
    if(!b.dead&&Math.hypot(b.x-x,b.y-y)<radius*.78)explode(g,b);
  }
}
export function predictShot(g){
  if(g.phase!=="aim")return {points:[],hit:null};
  const theta=g.angle*Math.PI/180,velocity=115+g.power*5.1;
  let x=WORLD.anchor.x,y=WORLD.anchor.y,
    vx=Math.cos(theta)*velocity,vy=-Math.sin(theta)*velocity;
  const points=[{x,y}];
  for(let i=1;i<=250;i++){
    const dt=1/120;
    vy+=650*dt;vx*=Math.exp(-.045*dt);
    x+=vx*dt;y+=vy*dt;
    if(i%6===0)points.push({x,y});
    if(x>WORLD.width+20||y>WORLD.ground-18||y<-90)break;
    const circle={x,y,r:18};
    let hit=null;
    for(const b of g.blocks){
      if(!b.dead && circleBox(circle,b)){hit={x,y,kind:"block",material:b.material};break;}
    }
    if(!hit)for(const t of g.robots){
      if(!t.dead&&Math.hypot(x-t.x,y-t.y)<18+t.r){hit={x,y,kind:"robot"};break;}
    }
    if(!hit)for(const b of g.bombs){
      if(!b.dead&&Math.hypot(x-b.x,y-b.y)<18+b.r){hit={x,y,kind:"bomb"};break;}
    }
    if(hit){points.push({x,y});return {points,hit};}
  }
  return {points,hit:null};
}
function circleBox(p,b){
  const nearestX=clamp(p.x,b.x-b.w/2,b.x+b.w/2);
  const nearestY=clamp(p.y,b.y-b.h/2,b.y+b.h/2);
  let dx=p.x-nearestX,dy=p.y-nearestY,dist=Math.hypot(dx,dy);
  if(dist>=p.r)return null;
  if(dist<.001){
    dx=p.x-b.x;dy=p.y-b.y;
    if(Math.abs(dx)/b.w>Math.abs(dy)/b.h){dx=dx>=0?1:-1;dy=0;}
    else{dy=dy>=0?1:-1;dx=0;}
    dist=1;
  }
  return {nx:dx/dist,ny:dy/dist,depth:p.r-dist};
}
function collideProjectile(g,p,b){
  const c=circleBox(p,b);
  if(!c)return;
  const impact=Math.max(0,(p.vx-b.vx)*-c.nx+(p.vy-b.vy)*-c.ny);
  p.x+=c.nx*(c.depth+.3);p.y+=c.ny*(c.depth+.3);
  const kick=Math.max(20,impact);
  const drill=p.type==="drill" && p.turbo;
  const heavy=p.type==="impact";
  p.vx+=c.nx*kick*(drill?.19:.65);
  p.vy+=c.ny*kick*(drill?.23:.68);
  const force=kick*(heavy?1.35:drill?1.13:1);
  b.vx-=c.nx*force/(b.mass*2.3);b.vy-=c.ny*force/(b.mass*2.3);
  b.spin+=(-c.ny*(p.vx>0?1:-1))*force/230;
  const materialBonus=drill&&b.material==="steel"?2.7:1;
  damageBlock(g,b,impact*.68*(heavy?1.3:1)*materialBonus);
  if(impact>92 && (!b.lastImpactAt || g.shotTime-b.lastImpactAt>.16)){
    b.lastImpactAt=g.shotTime;
    sparks(g,p.x,p.y,b.material==="glass"?"#baf8fa":"#ffe39e",5);
    g.shake=Math.max(g.shake,3);
  }
}
function collideBlocks(g){
  const blocks=g.blocks.filter(x=>!x.dead);
  for(let i=0;i<blocks.length;i++){
    for(let j=i+1;j<blocks.length;j++){
      const a=blocks[i],b=blocks[j];
      const dx=b.x-a.x,dy=b.y-a.y;
      const ox=(a.w+b.w)/2-Math.abs(dx);
      const oy=(a.h+b.h)/2-Math.abs(dy);
      if(ox<=0||oy<=0)continue;
      if(ox<oy){
        const direction=dx<0?-1:1;
        const correction=ox*.51;
        a.x-=direction*correction;b.x+=direction*correction;
        const rel=Math.abs(a.vx-b.vx);
        const impulse=(a.vx-b.vx)*.36;
        a.vx-=impulse;b.vx+=impulse;
        if(rel>70){damageBlock(g,a,rel*.12);damageBlock(g,b,rel*.12);}
      }else{
        const dir=dy<0?-1:1;
        const adjust=oy*.505;
        a.y-=dir*adjust;b.y+=dir*adjust;
        const rel=Math.abs(a.vy-b.vy);
        const change=(a.vy-b.vy)*.38;
        a.vy-=change;b.vy+=change;
        if(rel>80){damageBlock(g,a,rel*.13);damageBlock(g,b,rel*.13);}
        // Give toppling towers a slight horizontal offset when jolted.
        if(rel>65){a.vx+=(a.x-b.x)*.015;b.vx+=(b.x-a.x)*.015;}
      }
    }
  }
}
function updateBodies(g,dt){
  for(const b of g.blocks){
    if(b.dead)continue;
    b.vy+=660*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    b.angle=clamp(b.angle+b.spin*dt,-.95,.95);
    b.spin*=Math.exp(-2*dt);b.vx*=Math.exp(-1.65*dt);
    if(b.y+b.h/2>=WORLD.ground){
      const impact=Math.abs(b.vy);
      b.y=WORLD.ground-b.h/2;
      b.vy=impact>120?-impact*.12:0;
      b.vx*=.8;b.spin*=.66;
      if(impact>245)damageBlock(g,b,impact*.13);
    }
    b.x=clamp(b.x,280,970);
  }
  collideBlocks(g);
}
function updateTargets(g,dt){
  for(const t of g.robots){
    if(t.dead)continue;
    t.blink=(t.blink+dt)%2.7;
    // Robots ride platforms and fall if their support is broken: no floating
    // targets left behind after a satisfying tower demolition.
    let supportY=WORLD.ground-t.r;
    let platform=null;
    for(const b of g.blocks){
      if(b.dead)continue;
      const top=b.y-b.h/2;
      const bottom=t.y+t.r;
      if(Math.abs(t.x-b.x)<b.w/2+t.r*.4 &&
         bottom<=top+14 && top-t.r<supportY){
        supportY=top-t.r;platform=b;
      }
      const cx=clamp(t.x,b.x-b.w/2,b.x+b.w/2);
      const cy=clamp(t.y,b.y-b.h/2,b.y+b.h/2);
      const dist=Math.hypot(t.x-cx,t.y-cy);
      if(dist<t.r*.85 && Math.hypot(b.vx,b.vy)>72){
        eliminateRobot(g,t);break;
      }
    }
    if(t.dead)continue;
    t.vy+=660*dt;
    t.x+=t.vx*dt;t.y+=t.vy*dt;
    t.vx*=Math.exp(-1.3*dt);
    if(t.y>=supportY){
      const impact=Math.abs(t.vy);
      t.y=supportY;t.vy=0;
      if(impact>230){eliminateRobot(g,t);continue;}
      if(platform&&Math.abs(platform.vx)>30)t.vx=platform.vx*.85;
    }
    t.x=clamp(t.x,305,975);
    if(t.y>WORLD.ground+60)eliminateRobot(g,t);
  }
}
function updateProjectile(g,dt){
  const p=g.projectile;if(!p||!p.active)return;
  p.vy+=650*dt;p.vx*=Math.exp(-.045*dt);
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  p.angle+=p.vx*dt/p.r;
  if(p.pulseArmed && p.x>=450){
    p.pulseArmed=false;
    shockwave(g,p.x,p.y,145);
    p.vx*=.83;p.vy*=.83;
    g.notice="ONA EXPANSIVA! Detonació automàtica a la zona de ferralla.";
  }
  if(p.y+p.r>WORLD.ground){
    p.y=WORLD.ground-p.r;
    p.vy=Math.abs(p.vy)>65?-p.vy*.33:0;
    p.vx*=.68;
  }
  if(p.x<12||p.x>WORLD.width+40||p.y>WORLD.height+30){
    p.active=false;return;
  }
  for(const b of g.blocks){if(!b.dead)collideProjectile(g,p,b);}
  for(const t of g.robots){
    if(!t.dead&&centerDist(p,t)<p.r+t.r){
      const impact=Math.hypot(p.vx,p.vy);
      if(impact>42)eliminateRobot(g,t);
      p.vx*=.72;p.vy-=28;
    }
  }
  for(const b of g.bombs){
    if(!b.dead&&centerDist(p,b)<p.r+b.r)explode(g,b);
  }
  if(Math.hypot(p.vx,p.vy)<30){p.lowSpeed+=dt;}else p.lowSpeed=0;
  if(p.lowSpeed>.7)p.active=false;
}
function updateDebris(g,dt){
  for(const d of g.debris){
    d.vy+=420*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
    d.life-=dt;
  }
  g.debris=g.debris.filter(d=>d.life>0);
}
export function step(g,elapsed){
  if(!(elapsed>0))return;
  let remaining=clamp(elapsed,0,.09);
  while(remaining>1e-7){
    const dt=Math.min(remaining,1/120);
    remaining-=dt;
    if(g.phase==="flying"){
      g.shotTime+=dt;
      updateProjectile(g,dt);
      updateBodies(g,dt);
      updateTargets(g,dt);
      if(g.robots.every(t=>t.dead)){
        g.phase="won";g.score+=g.shotsLeft*300;g.notice="NIVELL SUPERAT! 🎉";
        g.celebration=1.5;
      }else if(g.shotTime>5.15 || (!g.projectile?.active && g.shotTime>.8)){
        g.phase=g.shotsLeft>0?"between":"lost";
        g.notice=g.phase==="between"?"Prepara la següent roda!":"Sense rodes! Torna-ho a provar.";
      }
    }
    if(g.phase==="flying"||g.phase==="won"||g.phase==="lost"||g.phase==="between"){
      updateDebris(g,dt);
    }
    for(const ring of g.pulses)ring.elapsed+=dt;
    g.pulses=g.pulses.filter(ring=>ring.elapsed<ring.duration);
    g.shake=Math.max(0,g.shake-30*dt);
    g.celebration=Math.max(0,g.celebration-dt);
  }
}
export function nextShot(g){
  if(g.phase!=="between")return false;
  g.phase="aim";g.projectile=null;g.angle=42;g.power=77;g.combo=0;g.pulses=[];
  g.notice="Apunta a les estructures i deixa anar la llançadora.";
  return true;
}
export function aliveTargets(g){return g.robots.filter(t=>!t.dead).length;}
export function starsFor(g){
  if(g.phase!=="won")return 0;
  const accuracy=g.shotsTotal-g.shotCount;
  return accuracy>=2?3:accuracy>=1?2:1;
}
