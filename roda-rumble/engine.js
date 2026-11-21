// RodaRumble: original, deterministic offline arcade demolition physics.
// Canvas-world positions in pixels; no external assets or third-party game IP.
export const WORLD={width:1000,height:560,ground:510,anchor:{x:158,y:389}};
export const clamp=(value,a,b)=>Math.min(b,Math.max(a,value));
export const LEVELS=Object.freeze([
  {name:"Primer impacte",subtitle:"Trenca el suport de vidre i fes caure la passarel·la",shots:4,
   blocks:[
    ["wood",570,485,42,50],["glass",660,485,32,50],
    ["wood",615,449,137,22],
    ["steel",765,474,24,72],["glass",836,474,26,72],
    ["wood",800,427,111,22]
   ],robots:[[615,420],[800,398]],bombs:[[704,493]]},
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
   ],robots:[[609,300],[851,303],[746,487],[950,486]],bombs:[[715,491],[774,492]]},
  {name:"Dues vies",subtitle:"Dues torres separades: decideix quina atacar primer",shots:5,
   blocks:[
    ["wood",527,482,52,56],["glass",593,479,51,62],
    ["wood",561,427,136,22],["steel",560,385,48,67],
    ["glass",738,482,53,56],["wood",804,483,52,55],
    ["steel",872,481,48,59],["wood",804,431,180,22],
    ["glass",761,391,48,61],["wood",849,388,51,65]
   ],robots:[[561,348],[805,395],[918,488]],bombs:[[685,493]]},
  {name:"Reacció en cadena",subtitle:"Tres bidons i un pont: planifica una explosió doble",shots:5,
   blocks:[
    ["wood",540,480,49,58],["glass",602,481,53,55],
    ["wood",572,429,136,20],["steel",574,381,46,70],
    ["glass",735,480,46,62],["steel",792,481,45,60],
    ["wood",764,430,126,22],["glass",767,386,52,64],
    ["wood",895,479,49,59],["glass",944,481,43,56],
    ["wood",919,430,92,21]
   ],robots:[[571,344],[767,353],[920,394],[842,486]],bombs:[[675,490],[856,493],[975,491]]},
  {name:"Torre de cristall",subtitle:"Protegeix les rodes i apunta als pilars fràgils",shots:6,
   blocks:[
    ["glass",580,481,48,60],["glass",639,481,48,60],
    ["wood",610,430,142,20],["glass",575,383,47,69],
    ["glass",646,383,47,69],["steel",610,334,155,23],
    ["steel",804,481,48,60],["glass",863,481,48,60],
    ["wood",834,430,153,22],["glass",794,385,42,68],
    ["glass",878,383,43,70],["wood",834,334,156,22]
   ],robots:[[609,298],[834,300],[720,488],[944,486]],bombs:[[750,492]]},
  {name:"El cap final",subtitle:"Quatre robots, dues cadenes i una torre central reforçada",shots:6,
   blocks:[
    ["steel",525,482,49,60],["wood",590,481,51,60],
    ["glass",558,428,145,21],["wood",556,383,46,67],
    ["steel",677,481,48,61],["glass",737,481,48,61],
    ["wood",707,427,150,23],["steel",703,380,49,73],
    ["glass",703,327,129,20],["steel",817,480,46,64],
    ["wood",879,482,49,60],["glass",846,427,133,22],
    ["glass",814,385,42,66],["steel",882,384,48,66],
    ["wood",851,335,166,21]
   ],robots:[[559,350],[706,290],[849,298],[930,486]],bombs:[[641,491],[793,490],[957,489]]},
 {name:"El túnel",subtitle:"Obre una entrada lateral i enfonsa la coberta",theme:"tunnel",shots:6,queue:["impact","split","drill","blast","spring","pulse"],blocks:[["steel",585,458,34,104],["glass",681,458,26,104],["wood",633,393,142,26],["steel",745,470,32,80],["wood",860,470,36,80],["glass",802,417,148,24],["wood",802,380,40,50],["steel",925,490,50,40]],robots:[[633,486],[633,361],[802,335],[925,452]],bombs:[[708,493],[891,493]]},
 {name:"Taller abandonat",subtitle:"Divideix les rodes i obre diversos fronts",theme:"workshop",shots:6,queue:["split","blast","spring","drill","pulse","impact"],blocks:[["wood",535,470,45,80],["glass",600,470,45,80],["wood",568,418,148,24],["glass",568,370,50,70],["steel",780,470,46,80],["glass",850,470,46,80],["wood",815,418,164,24],["glass",815,370,50,70]],robots:[[568,315],[815,315],[700,488]],bombs:[[660,490],[920,490]]},
 {name:"La grua",subtitle:"Pilars fràgils i reaccions en cadena",theme:"yard",shots:7,queue:["spring","split","blast","drill","pulse","impact","blast"],blocks:[["glass",540,465,44,90],["steel",615,465,44,90],["wood",578,407,166,26],["glass",578,350,50,85],["wood",785,468,46,84],["glass",900,468,46,84],["steel",843,414,192,24],["glass",843,366,46,70],["wood",843,314,140,24]],robots:[[578,292],[843,283],[843,486],[700,488]],bombs:[[680,490],[730,490],[965,490]]}
]);
export const SHOT_TYPES=Object.freeze([
  {id:"impact",label:"RODA MARTELL",icon:"●",color:"#ffe16a",help:"Impacte potent contra fusta i vidre"},
  {id:"pulse",label:"RODA POLS",icon:"✦",color:"#8cfbe4",help:"Turbo: ona expansiva"},
  {id:"drill",label:"RODA TREPANT",icon:"◆",color:"#fd9a76",help:"Perfora millor l'acer"}
,{id:"blast",label:"RODA EXPLOSIVA",icon:"✹",color:"#ff665d",help:"Detona amb una gran ona expansiva"},
  {id:"split",label:"RODA TRIPLE",icon:"✦",color:"#c7a3ff",help:"Es divideix en tres projectils"},
  {id:"spring",label:"RODA REBOT",icon:"↗",color:"#a7e866",help:"Impuls i rebots més elàstics"}
]);
export function upcomingShot(g,offset=0){const queue=LEVELS[g.levelIndex].queue||["impact","pulse","drill"];return SHOT_TYPES.find(t=>t.id===queue[(g.shotCount+offset)%queue.length]);}
const MATERIAL={wood:{hp:60,mass:1.3,score:85,bounce:.24},
  glass:{hp:32,mass:.85,score:110,bounce:.16},
  steel:{hp:145,mass:2.5,score:140,bounce:.12}};
const centerDist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Deterministic collision response. Normal impact reflects into the surface
// normal, while tangential velocity retains momentum for realistic glancing hits.
export function bounceVector(vx,vy,nx,ny,restitution=.4,tangentRetention=.93){
  const incoming=-(vx*nx+vy*ny);
  if(incoming<=0)return {vx,vy,normalSpeed:0};
  const tx=vx+incoming*nx,ty=vy+incoming*ny;
  return {
    vx:tx*tangentRetention+incoming*restitution*nx,
    vy:ty*tangentRetention+incoming*restitution*ny,
    normalSpeed:incoming
  };
}
const WHEEL_RESTITUTION=Object.freeze({wood:.34,glass:.18,steel:.63});
const GROUND_RESTITUTION=Object.freeze({impact:.47,pulse:.39,drill:.33});

let serial=0;
export function newGame(index=0){
  const level=LEVELS[clamp(index|0,0,LEVELS.length-1)];
  const entities=level.blocks.map(([material,x,y,w,h])=>({
    id:++serial,kind:"block",material,x,y,w,h,hp:MATERIAL[material].hp,asleep:true,
    vx:0,vy:0,angle:0,spin:0,mass:MATERIAL[material].mass,dead:false}));
  const robots=level.robots.map(([x,y])=>({
    id:++serial,kind:"robot",x,y,r:18,vx:0,vy:0,dead:false,blink:0,asleep:true}));
  const bombs=level.bombs.map(([x,y])=>({
    id:++serial,kind:"bomb",x,y,r:17,dead:false}));
  const g={levelIndex:clamp(index|0,0,LEVELS.length-1),levelName:level.name,
    phase:"aim",shotsLeft:level.shots,shotsTotal:level.shots,
    angle:42,power:77,score:0,combo:0,shotCount:0,shotTime:0,settleTime:0,
    blocks:entities,robots,bombs,physicsActive:false,projectile:null,extras:[],debris:[],pulses:[],
    shake:0,celebration:0,notice:"Arrossega la roda enrere i deixa-la anar!",
    lastResult:null};
  // Capture authored support links, including small placement gaps. Only a disturbed support can wake a resting neighbour.
  for(const b of entities)b.supports=entities.filter(q=>q!==b&&q.y>b.y&&Math.abs(q.x-b.x)<(q.w+b.w)/2&&Math.abs(q.y-q.h/2-(b.y+b.h/2))<=18).map(q=>q.id);
  for(const t of robots)t.supports=entities.filter(q=>Math.abs(t.x-q.x)<q.w/2+t.r*.4&&Math.abs(t.y+t.r-(q.y-q.h/2))<=18).map(q=>q.id);
  return g;
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
  g.extras=[];g.projectile={x:WORLD.anchor.x,y:WORLD.anchor.y,r:type==="drill"?17:18,
    vx:Math.cos(theta)*speed,vy:-Math.sin(theta)*speed,angle:0,spin:0,
    type,active:true,turbo:false,lowSpeed:0,bounces:0,lastBounce:null};
  g.shotsLeft-=1;g.shotCount+=1;g.shotTime=0;g.combo=0;g.settleTime=0;
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
  if(p.type==="blast"){shockwave(g,p.x,p.y,205);p.active=false;g.notice="DETONACIÓ!";}
  else if(p.type==="split"){for(const a of [-.23,.23]){const vx=p.vx*Math.cos(a)-p.vy*Math.sin(a),vy=p.vx*Math.sin(a)+p.vy*Math.cos(a);g.extras.push({...p,x:p.x,y:p.y+(a>0?20:-20),vx,vy,r:11,type:"impact",turbo:true,lastBounce:null});}g.notice="RODA TRIPLE!";}
  else if(p.type==="spring"){p.vy=-Math.max(240,Math.abs(p.vy));p.vx+=95;g.notice="SUPER REBOT!";}
  else if(p.type==="pulse"){
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
function sparks(g,x,y,color,count=12,material=null){
  for(let i=0;i<count;i++){
    const a=(i*2.399963229728653)% (Math.PI*2);
    const speed=70+(i%5)*34;
    g.debris.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-100,
      life:.38+(i%5)*.13,maxLife:.9,color,material,r:2+(i%4)});
  }
  if(g.debris.length>170)g.debris.splice(0,g.debris.length-170);
}
function damageBlock(g,b,impulse,x=b.x,y=b.y){
  if(b.dead||impulse<19)return;
  g.physicsActive=true;b.asleep=false;b.disturbed=true;
  const material=MATERIAL[b.material];
  b.hp-=Math.max(0,impulse)*(b.material==="steel"?.36:b.material==="wood"?.75:1.06);
  if(b.hp<=0){
    b.dead=true;g.score+=material.score+(g.combo++*10);
    sparks(g,x,y,b.material==="glass"?"#96f6ff":b.material==="steel"?"#8cb6cb":"#ffca83",24,b.material);
    g.shake=Math.max(g.shake,5);
  }
}
function eliminateRobot(g,t,x=t.x,y=t.y){
  if(t.dead)return;
  g.physicsActive=true;t.dead=true;g.score+=650+(g.combo++*90);
  g.notice="OBJECTIU DESTRUÏT! +650";
  sparks(g,x,y,"#fbef76",27);g.shake=Math.max(g.shake,10);
}
function explode(g,b){
  if(b.dead)return;
  g.physicsActive=true;b.dead=true;g.score+=350;g.shake=15;
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
      target.spin+=(Math.cos(direction)>0?1:-1)*.9;target.disturbed=true;target.asleep=false;
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
    g.physicsActive=true;
    const intensity=1-clamp(dist/reach,0,1);
    const impact=58+intensity*180;
    b.vx+=(dx/(dist||1))*impact/b.mass;
    b.vy+=(dy/(dist||1))*impact/b.mass-48*intensity;
    b.spin+=Math.sign(dx||1)*intensity*2.1;b.disturbed=true;b.asleep=false;
    damageBlock(g,b,impact*(b.material==="steel"?.55:1.15));
  }
  for(const t of g.robots){
    if(t.dead)continue;
    const d=Math.hypot(t.x-x,t.y-y);
    if(d<radius*.54)eliminateRobot(g,t);
    else if(d<radius){g.physicsActive=true;t.asleep=false;t.vx+=(t.x-x)/(d||1)*190;t.vy-=190;}
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
  const a=b.angle||0,cs=Math.cos(a),sn=Math.sin(a),dx0=p.x-b.x,dy0=p.y-b.y;
  const local={x:b.x+dx0*cs+dy0*sn,y:b.y-dx0*sn+dy0*cs,r:p.r};
  const hit=circleBoxAxis(local,b);if(!hit)return null;
  return {...hit,nx:hit.nx*cs-hit.ny*sn,ny:hit.nx*sn+hit.ny*cs};
}
function circleBoxAxis(p,b){
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
  const velocityX=p.vx-b.vx,velocityY=p.vy-b.vy;
  const impact=Math.max(0,-(velocityX*c.nx+velocityY*c.ny));
  p.x+=c.nx*(c.depth+.35);p.y+=c.ny*(c.depth+.35);
  if(impact<.5)return; // No repeated impulse when separating or resting.
  g.physicsActive=true;
  const drill=p.type==="drill" && p.turbo;
  const heavy=p.type==="impact";
  const previousX=p.vx,previousY=p.vy;
  const restitution=WHEEL_RESTITUTION[b.material]*(drill?.42:1);
  const bounced=bounceVector(velocityX,velocityY,c.nx,c.ny,restitution,drill?.99:.92);
  p.vx=clamp(b.vx+bounced.vx,-1000,1000);
  p.vy=clamp(b.vy+bounced.vy,-1000,1000);
  // Blocks get a physically directed impulse with their actual mass.
  const knockback=impact*(heavy?1.35:drill?1.13:1);
  b.vx-=c.nx*knockback/(b.mass*2.3);
  b.vy-=c.ny*knockback/(b.mass*2.3);
  const armX=p.x-b.x,armY=p.y-b.y;
  const torque=(armX*(-c.ny)-armY*(-c.nx))*knockback;
  b.spin=clamp(b.spin+torque/(b.mass*(b.w*b.w+b.h*b.h)/12),-5,5);
  b.disturbed=true;b.asleep=false;
  const materialBonus=drill&&b.material==="steel"?2.7:1;
  damageBlock(g,b,impact*.68*(heavy?1.3:1)*materialBonus);
  if(impact>44){
    p.bounces=(p.bounces||0)+1;
    p.lastBounce={x:p.x,y:p.y,at:g.shotTime,speed:impact,kind:b.material};
  }
  if(impact>92 && (!b.lastImpactAt || g.shotTime-b.lastImpactAt>.16)){
    b.lastImpactAt=g.shotTime;
    sparks(g,p.x,p.y,b.material==="glass"?"#baf8fa":
      b.material==="steel"?"#a6ccf5":"#ffe39e",5);
    g.shake=Math.max(g.shake,3);
  }
}

// Separating-axis contact for rotating rectangular bodies. The broad phase
// rejects distant pairs; the narrow phase uses both bodies' actual local axes.
function axes(b){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);return [[c,s],[-s,c]];}
function projection(b,u,v,nx,ny){return b.w*.5*Math.abs(u[0]*nx+u[1]*ny)+b.h*.5*Math.abs(v[0]*nx+v[1]*ny);}
export function boxContact(a,b){
 const [au,av]=axes(a),[bu,bv]=axes(b),dx=b.x-a.x,dy=b.y-a.y;
 let depth=Infinity,nx=0,ny=0;
 for(const [x,y] of [au,av,bu,bv]){
   const d=dx*x+dy*y,overlap=projection(a,au,av,x,y)+projection(b,bu,bv,x,y)-Math.abs(d);
   if(overlap<=0)return null;
   if(overlap<depth){depth=overlap;nx=d<0?-x:x;ny=d<0?-y:y;}
 }
 return {nx,ny,depth};
}
function halfHeight(b){return Math.abs(Math.sin(b.angle))*b.w/2+Math.abs(Math.cos(b.angle))*b.h/2;}
function collideBlocks(g){
 const blocks=g.blocks.filter(x=>!x.dead);
 for(let pass=0;pass<3;pass++)for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
   const a=blocks[i],b=blocks[j];if(a.dead||b.dead||a.asleep&&b.asleep)continue;
   if(Math.abs(a.x-b.x)>Math.hypot(a.w,a.h)/2+Math.hypot(b.w,b.h)/2||Math.abs(a.y-b.y)>Math.hypot(a.w,a.h)/2+Math.hypot(b.w,b.h)/2)continue;
   const c=boxContact(a,b);if(!c)continue;
   if(c.depth>.5){a.asleep=b.asleep=false;a.disturbed=b.disturbed=true;}
   const {nx,ny,depth}=c,ia=1/a.mass,ib=1/b.mass,sum=ia+ib;
   const correction=Math.max(0,depth-.15)*.76/sum;
   a.x-=nx*correction*ia;a.y-=ny*correction*ia;b.x+=nx*correction*ib;b.y+=ny*correction*ib;
   const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(rel<=0)continue;a.asleep=b.asleep=false;a.disturbed=b.disturbed=true;
   const imp=rel*(rel>70?1.08:1)/sum;
   a.vx-=nx*imp*ia;a.vy-=ny*imp*ia;b.vx+=nx*imp*ib;b.vy+=ny*imp*ib;
   if(rel>80){a.disturbed=b.disturbed=true;const cross=(b.x-a.x)*ny-(b.y-a.y)*nx;
     a.spin=clamp(a.spin-cross*.0018*rel*ia,-5,5);b.spin=clamp(b.spin-cross*.0018*rel*ib,-5,5);damageBlock(g,a,rel*.19);damageBlock(g,b,rel*.19);}
 }
}
// Support intervals and combined load above a beam. An overlap alone is
// insufficient: the total centre of mass must lie inside the contact footprint.
function supportInfo(g,b){
 const bottom=b.y+halfHeight(b),halfWidth=projection(b,...axes(b),1,0);
 if(bottom>=WORLD.ground-2)return {left:b.x-halfWidth,right:b.x+halfWidth,ground:true};
 let left=Infinity,right=-Infinity;
 for(const q of g.blocks){
   if(q===b||q.dead||q.y<=b.y)continue;
   const qw=projection(q,...axes(q),1,0),top=q.y-halfHeight(q);
   const l=Math.max(b.x-halfWidth,q.x-qw),r=Math.min(b.x+halfWidth,q.x+qw);
   if(r-l>.5&&Math.abs(top-bottom)<=3){left=Math.min(left,l);right=Math.max(right,r);}
 }
 return left<=right?{left,right,ground:false}:null;
}
function loadCenter(g,b){
 const visited=new Set([b]),queue=[b];let mass=b.mass,moment=b.mass*b.x;
 while(queue.length){
   const q=queue.pop(),top=q.y-halfHeight(q),qw=projection(q,...axes(q),1,0);
   for(const a of g.blocks){
     if(a.dead||visited.has(a)||a.y>=q.y)continue;
     const aw=projection(a,...axes(a),1,0);
     if(Math.abs(a.x-q.x)<aw+qw&&Math.abs(a.y+halfHeight(a)-top)<5){
       visited.add(a);queue.push(a);mass+=a.mass;moment+=a.mass*a.x;
     }
   }
   for(const t of g.robots){
     if(t.dead||visited.has(t)||Math.abs(t.x-q.x)>qw+t.r*.25||Math.abs(t.y+t.r-top)>6)continue;
     visited.add(t);mass+=.65;moment+=.65*t.x;
   }
 }
 return moment/mass;
}
function instability(g,b){
 const info=supportInfo(g,b);if(!info)return null;
 const cx=loadCenter(g,b);
 return cx<info.left?cx-info.left:cx>info.right?cx-info.right:0;
}
function updateBodies(g,dt){
 for(const b of g.blocks){
   if(b.dead)continue;
   if(b.asleep){
     const changed=(b.supports||[]).some(id=>{const q=g.blocks.find(x=>x.id===id);return !q||q.dead||!q.asleep;});
     if(!changed)continue;
     b.asleep=false;b.disturbed=true;
   }
   const over=instability(g,b);
   b.vy+=660*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(over!==null&&Math.abs(over)>1){
      // Off-centre load produces a moment around the edge of the support.
      b.spin=clamp(b.spin+Math.sign(over)*Math.min(18,2+Math.abs(over)*.65)*dt,-5,5);
      b.vx+=Math.sign(over)*Math.min(180,Math.abs(over)*9)*dt;
   }
   b.angle=clamp(b.angle+b.spin*dt,-1.57,1.57);
   b.spin*=Math.exp(-1.8*dt);b.vx*=Math.exp(-1.65*dt);
   if(b.y+halfHeight(b)>=WORLD.ground){
      const impact=Math.abs(b.vy);b.y=WORLD.ground-halfHeight(b);
      b.vy=impact>120?-impact*.12:0;b.vx*=.8;b.spin*=.66;
      if(impact>210){b.disturbed=true;damageBlock(g,b,impact*.19);}
   }
   b.x=clamp(b.x,280,970);
 }
 collideBlocks(g);
 // Collision correction may push a rectangle into the ground.
 for(const b of g.blocks)if(!b.dead&&!b.asleep&&b.y+halfHeight(b)>WORLD.ground){b.y=WORLD.ground-halfHeight(b);if(b.vy>0)b.vy=0;}
}
function updateTargets(g,dt){
  for(const t of g.robots){
    if(t.dead)continue;
    t.blink=(t.blink+dt)%2.7;
    if(t.asleep){const changed=(t.supports||[]).some(id=>{const q=g.blocks.find(x=>x.id===id);return !q||q.dead||!q.asleep;});const hit=g.blocks.some(b=>!b.dead&&!b.asleep&&Math.hypot(b.vx,b.vy)>72&&circleBox(t,b));if(!changed&&!hit&&Math.abs(t.vx)+Math.abs(t.vy)===0)continue;t.asleep=false;}
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
function updateProjectile(g,dt,p=g.projectile){
  if(!p||!p.active)return;
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
    // Bounce only when falling. Avoid artificial ground launches or jitter
    // when the wheel is already rolling near the surface.
    if(p.vy>65){
      const hit=bounceVector(p.vx,p.vy,0,-1,(p.type==="spring"?.76:GROUND_RESTITUTION[p.type]??.4),.89);
      p.vx=hit.vx;p.vy=hit.vy;
      p.bounces=(p.bounces||0)+1;
      p.lastBounce={x:p.x,y:p.y,at:g.shotTime,speed:hit.normalSpeed,kind:"ground"};
      if(hit.normalSpeed>160)sparks(g,p.x,p.y,"#d4d2bb",4);
    }else{
      p.vy=0;p.vx*=.94;
    }
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
      updateProjectile(g,dt);for(const p of g.extras||[])updateProjectile(g,dt,p);
      if(g.physicsActive||g.blocks.some(b=>b.dead||b.disturbed||!b.asleep)||g.robots.some(t=>t.dead||Math.abs(t.vx)+Math.abs(t.vy)>0)){
        g.physicsActive=true;updateBodies(g,dt);updateTargets(g,dt);
      }
      if(g.robots.every(t=>t.dead)){
        g.phase="won";g.score+=g.shotsLeft*300;g.notice="NIVELL SUPERAT! 🎉";
        g.celebration=1.5;
      }else{
        const moving=g.physicsActive&&(g.blocks.some(b=>!b.dead&&!b.asleep&&(Math.hypot(b.vx,b.vy)>28||Math.abs(b.spin)>.09||instability(g,b)===null||Math.abs(instability(g,b)??0)>1))||g.robots.some(t=>!t.dead&&Math.hypot(t.vx,t.vy)>32));
        g.settleTime=!g.projectile?.active&&!(g.extras||[]).some(p=>p.active)&&!moving?(g.settleTime||0)+dt:0;
        if(g.shotTime>12 || (g.settleTime>.65 && g.shotTime>.8)){
        g.phase=g.shotsLeft>0?"between":"lost";
        g.notice=g.phase==="between"?"Prepara la següent roda!":"Sense rodes! Torna-ho a provar.";
        }
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
  g.phase="aim";g.projectile=null;g.extras=[];g.angle=42;g.power=77;g.combo=0;g.pulses=[];
  g.notice="Apunta a les estructures i deixa anar la llançadora.";
  return true;
}
export function aliveTargets(g){return g.robots.filter(t=>!t.dead).length;}
export function starsFor(g){
  if(g.phase!=="won")return 0;
  const accuracy=g.shotsTotal-g.shotCount;
  return accuracy>=2?3:accuracy>=1?2:1;
}
