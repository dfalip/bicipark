// ZombiePedal — family-friendly original arcade chase with paintball stun.
// Pure deterministic engine; no network, libraries or real-world weapon simulation.
export const WORLD=Object.freeze({length:5700,roadY:437,width:960,height:540});
export const ZONES=Object.freeze([
 {name:"Carrers abandonats",subtitle:"Primeres ombres",color:"#152948",at:0},
 {name:"Parc infectat",subtitle:"Zombis més ràpids",color:"#173f49",at:1450},
 {name:"La zona industrial",subtitle:"Zombis amb casc",color:"#40345c",at:2900},
 {name:"Pont de la sortida",subtitle:"L'última fugida",color:"#513957",at:4350}
]);
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function rng(seed){let x=(seed>>>0)||1337;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function makeEnemy(type,x,id){
 const rules={walker:[1,11,110],runner:[1,24,160],helmet:[2,9,220],big:[3,8,420],barrier:[Infinity,0,0]};
 const [hp,speed,points]=rules[type];
 return {id,type,x,hp,speed,points,stunned:false,stunTime:0,stunAwards:0,passed:false,hit:false,collision:false};
}
export function makeEnemies(seed=77){
 const random=rng(seed),out=[];let x=285,id=0;
 while(x<WORLD.length-150){
  const zone=Math.min(3,Math.floor(x/1450)),roll=random();
  const type=zone>=2&&roll>.79?"helmet":roll<.12?"barrier":roll>.56?"runner":"walker";
  out.push(makeEnemy(type,Math.round(x),id++));
  x+=135+Math.round(random()*95);
 }
 out.push(makeEnemy("big",WORLD.length-215,id++));
 return out;
}
export function makePickups(seed=77){
 const random=rng(seed+145),out=[];let id=0;
 for(let x=610;x<WORLD.length-80;x+=380+Math.round(random()*80)){
  const roll=random();
  out.push({id:id++,x,kind:roll<.15?"heart":roll<.55?"ammo":"star",collected:false});
 }
 return out;
}
export function makeGame(seed=77){
 return {phase:"ready",seed,time:0,distance:0,speed:26,score:0,
  altitude:0,vy:0,grounded:true,jumps:0,
  hearts:3,ammo:8,maxAmmo:8,ammoClock:0,fireCooldown:0,
  horde:15,invulnerable:0,combo:0,bestCombo:0,comboTimer:0,
  dashCharges:1,maxDashCharges:2,dashTime:0,dashes:0,dashDodges:0,
  enemies:makeEnemies(seed),pickups:makePickups(seed),balls:[],
  hits:0,stuns:0,dodges:0,collected:0,lastEvent:"Pedala, salta i frena els zombis amb boles de pintura!",
  eventTimer:0,zone:0,finishStars:0,gameOverReason:"",
  events:[],stagger:0};
}
export function start(g){if(g.phase!=="ready")return false;g.phase="running";g.lastEvent="FUGIDA INICIADA!";g.eventTimer=1.2;return true;}
export function togglePause(g){
 if(g.phase==="running"){g.phase="paused";return true;}
 if(g.phase==="paused"){g.phase="running";return true;}
 return false;
}
function say(g,msg,type="notice",details={}){
 g.lastEvent=msg;g.eventTimer=1.2;
 g.events.push({type,at:g.distance,time:g.time,...details});
 if(g.events.length>64)g.events.splice(0,g.events.length-64);
}
export function jump(g){
 if(g.phase!=="running"||!g.grounded)return false;
 g.grounded=false;g.vy=410;g.jumps++;
 say(g,"SALT! Aterra abans del següent obstacle.","jump");
 return true;
}
// Limited tactical sprint: a short window to pass through a dangerous enemy.
export function dash(g){
 if(g.phase!=="running"||g.dashCharges<=0||g.dashTime>0||g.stagger>0)return false;
 g.dashCharges--;g.dashTime=.68;g.dashes++;
 g.speed=Math.max(g.speed,79);g.horde=clamp(g.horde-8,0,100);
 say(g,"ESPRINT! Travessa l'obstacle mentre dura el llampec.","dash");
 return true;
}
export function fire(g){
 if(g.phase!=="running"||g.ammo<=0||g.fireCooldown>0)return false;
 g.ammo--;g.fireCooldown=.27;
 g.balls.push({x:g.distance+31,y:g.altitude+33,ttl:1.25});
 say(g,"PINTURA! Frena els zombis sense fer-los mal.","paint-shot",
  {at:g.distance+31,y:g.altitude+33});
 return true;
}
function collision(g){
 if(g.invulnerable>0||g.phase!=="running")return;
 g.hearts--;g.hits++;g.combo=0;g.comboTimer=0;
 g.speed=Math.max(12,g.speed*.66);
 g.horde=clamp(g.horde+22,0,100);
 g.invulnerable=1.05;g.stagger=.75;
 say(g,"XOC! La horda s'acosta. Pedala fort!","collision",{penalty:1});
 if(g.hearts<=0)lose(g,"LA HORDA T'HA ATRAPAT! Sense vides.");
 else if(g.horde>=100)lose(g,"LA HORDA T'HA ATRAPAT! Massa a prop.");
}
function lose(g,reason){g.phase="lost";g.gameOverReason=reason;say(g,reason,"lost");}
function combo(g,points){
 g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
 g.comboTimer=3.7;g.score+=points+Math.min(280,g.combo*15);
}
function enemyStep(g,enemy,dt){
 if(enemy.passed)return;
 if(enemy.stunned){
  enemy.stunTime=Math.max(0,enemy.stunTime-dt);
  if(enemy.stunTime===0)enemy.stunned=false;
 }
 if(enemy.x>g.distance-40 && enemy.x<g.distance+700&&!enemy.stunned)
  enemy.x-=enemy.speed*dt;
 // Projectile collision is checked before rider collision; this rewards accuracy.
 for(const ball of g.balls){
  if(ball.ttl<=0||enemy.stunned||enemy.passed)continue;
  if(enemy.type==="barrier")continue;
  if(Math.abs(ball.x-enemy.x)<26&&ball.y<=72){
   ball.ttl=0;enemy.hp--;
   say(g,"PLOF! Impacte de pintura!","paint-hit",
     {at:enemy.x,y:51,enemyId:enemy.id,typeEnemy:enemy.type});
   if(enemy.hp<=0){
    enemy.stunned=true;
    enemy.stunTime=enemy.type==="big"?2.8:enemy.type==="helmet"?2.4:1.85;
    enemy.hp=enemy.type==="big"?3:enemy.type==="helmet"?2:1;
    if(!enemy.stunAwards){
      enemy.stunAwards=1;g.stuns++;combo(g,enemy.points);
      if(g.stuns%3===0)g.dashCharges=Math.min(g.maxDashCharges,g.dashCharges+1);
    }
    say(g,"ZOMBI FRENAT! +combo","paint-stun",{at:enemy.x,points:enemy.points,enemyId:enemy.id});
   }else{
    g.score+=25;say(g,"IMPACTE DE PINTURA! Torna a apuntar.","paint-hit",
      {at:enemy.x,points:25,enemyId:enemy.id});
   }
  }
 }
 const gap=enemy.x-(g.distance+18);
 if(!enemy.hit&&!enemy.stunned&&Math.abs(gap)<18){
  enemy.hit=true;
  if(g.dashTime>0){
   enemy.passed=true;g.dodges++;g.dashDodges++;
   const points=enemy.type==="big"?275:155;combo(g,points);
   say(g,"ESPRINT PERFECTE! +"+points+" · combo","dash-dodge",
    {at:enemy.x,enemyId:enemy.id,points});
  }else if(g.altitude>38){
   enemy.passed=true;g.dodges++;combo(g,135);
   say(g,"ESQUIVADA AÈRIA! +135","dodge",{at:enemy.x,points:135});
  }else collision(g);
 }
 if(enemy.x<g.distance-45){
  enemy.passed=true;
  if(!enemy.hit&&!enemy.stunned){
   g.dodges++;combo(g,85);
   say(g,"ESQUIVADA! +85","dodge",{at:enemy.x,points:85});
  }
 }
}
function pickupStep(g,item){
 if(item.collected||Math.abs(item.x-g.distance)>26)return;
 if(g.altitude>82)return;
 item.collected=true;g.collected++;
 if(item.kind==="heart"){g.hearts=Math.min(3,g.hearts+1);say(g,"VIDA RECUPERADA!","pickup",{kind:"heart",at:item.x});}
 if(item.kind==="ammo"){g.ammo=Math.min(g.maxAmmo,g.ammo+3);say(g,"MÉS BOLES DE PINTURA!","pickup",{kind:"ammo",at:item.x});}
 if(item.kind==="star"){combo(g,190);g.dashCharges=Math.min(g.maxDashCharges,g.dashCharges+1);say(g,"ESTRELLA! +190 · +1 esprint","pickup",{kind:"star",at:item.x,points:190});}
}
function advance(g,input,dt){
 if(g.phase!=="running")return;
 g.time+=dt;g.eventTimer=Math.max(0,g.eventTimer-dt);
 g.fireCooldown=Math.max(0,g.fireCooldown-dt);
 g.dashTime=Math.max(0,g.dashTime-dt);
 g.invulnerable=Math.max(0,g.invulnerable-dt);
 g.stagger=Math.max(0,g.stagger-dt);
 g.comboTimer=Math.max(0,g.comboTimer-dt);
 if(g.comboTimer===0)g.combo=0;
 g.ammoClock+=dt;
 if(g.ammoClock>=3){g.ammoClock-=3;g.ammo=Math.min(g.maxAmmo,g.ammo+1);}
 const fast=Boolean(input.accelerate),brake=Boolean(input.brake);
 const max=g.dashTime>0?87:fast?74:brake?24:55;
 g.speed+=(max-g.speed)*Math.min(1,dt*(brake?3.1:2.25));
 g.distance=Math.min(WORLD.length,g.distance+g.speed*dt);
 g.score+=Math.round(g.speed*dt*2);
 if(!g.grounded){
  g.altitude+=g.vy*dt;
  g.vy-=880*dt;
  if(g.altitude<=0){
   g.altitude=0;g.vy=0;g.grounded=true;
   say(g,"ATERRATGE! Continua pedalant.","land");
  }
 }
 for(const ball of g.balls){ball.x+=(460+g.speed)*dt;ball.ttl-=dt;}
 g.balls=g.balls.filter(x=>x.ttl>0&&x.x<g.distance+600);
 for(const enemy of g.enemies)enemyStep(g,enemy,dt);
 for(const item of g.pickups)pickupStep(g,item);
 // The horde advances if the rider slows down; accelerating pushes it away.
 const growth=g.speed<35?4.5:g.speed<52?1.2:-1.45;
 g.horde=clamp(g.horde+growth*dt,0,100);
 if(g.horde>=100)lose(g,"LA HORDA T'HA ATRAPAT! Augmenta la velocitat.");
 if(g.phase!=="running")return;
 const zone=Math.min(ZONES.length-1,Math.floor(g.distance/1450));
 if(zone>g.zone){g.zone=zone;g.dashCharges=Math.min(g.maxDashCharges,g.dashCharges+1);g.score+=400;say(g,"NOVA ZONA! +400 · +1 esprint","zone",{zone,points:400});}
 if(g.distance>=WORLD.length){
  g.phase="finished";
  g.finishStars=g.hits===0&&g.time<127?3:g.hits<=2?2:1;
  g.score+=Math.max(0,Math.round(3000-g.time*11));
  say(g,"HAS ESCAPAT! La ciutat queda enrere.","finish");
 }
}
export function step(g,input={},dt=1/60){
 if(!Number.isFinite(dt)||dt<=0)return;
 let rest=clamp(dt,0,.12);
 while(rest>1e-8 && g.phase==="running"){
  const part=Math.min(rest,1/120);
  advance(g,input,part);rest-=part;
 }
}
