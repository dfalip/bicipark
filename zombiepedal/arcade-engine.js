// ZombiePedal Arcade City — original deterministic, non-graphic arcade chase.
// World coordinates are virtual pixels, not actual speed or distance.
export const VIEW={width:640,height:360,riderX:140,lanes:[204,249,294]};
export const DISTRICT_LENGTH=2200;
export const DISTRICTS=[
 {name:"Eixample a mitjanit",subtitle:"Carrers estrets i primeres hordes"},
 {name:"Barri del parc",subtitle:"Corredors i barricades"},
 {name:"Districte industrial",subtitle:"Cascos, furgonetes i gegants"},
 {name:"Pont de la sortida",subtitle:"L'última gran onada"}
];
const RULES={
 walker:{hp:1,pace:18,radius:14,height:24,points:120},
 runner:{hp:1,pace:48,radius:15,height:24,points:170},
 helmet:{hp:2,pace:13,radius:15,height:29,points:240},
 giant:{hp:4,pace:9,radius:25,height:45,points:600},
 cone:{hp:0,pace:0,radius:15,height:19,points:75},
 car:{hp:0,pace:0,radius:30,height:37,points:160},
 van:{hp:0,pace:0,radius:34,height:66,points:220}
};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function nextRandom(g){let x=g.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;g.rng=x>>>0;return g.rng/4294967296;}
function addEvent(g,type,fields={}){g.events.push({type,t:g.time,...fields});if(g.events.length>80)g.events.shift();}
function reward(g,n){
 g.combo++;g.maxCombo=Math.max(g.maxCombo,g.combo);g.comboLeft=3.6;
 const mult=1+Math.min(4,Math.floor((g.combo-1)/3));
 const points=n*mult;g.score+=points;return points;
}
export function addEnemy(g,type,x,lane){
 const spec=RULES[type];if(!spec||!Number.isFinite(x)||!Number.isInteger(lane)||lane<0||lane>2)return null;
 const entity={id:g.id++,type,x,lane,hp:spec.hp,stunned:false,stunLeft:0,passed:false,hit:false,warning:false};
 g.enemies.push(entity);return entity;
}
function addPickup(g,kind,x,lane){g.pickups.push({id:g.id++,kind,x,lane,collected:false});}
function populate(g){
 // At most two blocked lanes per encounter; at least one alternative is open.
 // Gaps between encounters give an adult or younger player decision time.
 const horizon=g.distance+1000,end=g.mode==="story"?DISTRICT_LENGTH*4:Infinity;
 while(g.nextSpawn<horizon&&g.nextSpawn<end-120){
  const x=g.nextSpawn,wave=Math.floor(x/DISTRICT_LENGTH),difficulty=Math.min(wave,8);
  const lane=Math.floor(nextRandom(g)*3);
  const choice=nextRandom(g);
  let type=choice<.23?"cone":choice<.35&&wave>0?"car":choice<.43&&wave>1?"van":
   choice>.81&&wave>1?"helmet":choice>.60?"runner":"walker";
  // One readable heavy encounter near the end of each district except the first.
  if(wave>0&&(x%DISTRICT_LENGTH)>1560&&!g.bossWaves.has(wave)){
   type="giant";g.bossWaves.add(wave);
  }
  addEnemy(g,type,x,lane);
  if(wave>0&&nextRandom(g)<.52){
   const other=(lane+1+Math.floor(nextRandom(g)*2))%3;
   addEnemy(g,nextRandom(g)<.4?"cone":"walker",x+20,other);
  }
  if(g.encounters%3===1){
   const kinds=["ammo","shield","turbo","heart","star"];
   const kind=kinds[Math.floor(nextRandom(g)*kinds.length)];
   addPickup(g,kind,x+113,(lane+1)%3);
  }
  g.encounters++;
  g.nextSpawn+=Math.max(225,322-difficulty*11)+Math.floor(nextRandom(g)*72);
 }
 g.enemies=g.enemies.filter(e=>e.x>g.distance-130);
 for(const wave of g.bossWaves)if(wave<Math.floor(g.distance/DISTRICT_LENGTH)-1)g.bossWaves.delete(wave);
 g.pickups=g.pickups.filter(e=>e.x>g.distance-125&&!e.collected);
}
export function makeArcade(seed=77,mode="story"){
 const g={seed:seed>>>0,rng:(seed>>>0)||77,mode:mode==="endless"?"endless":"story",phase:"ready",
  time:0,distance:0,speed:118,lane:1,laneTarget:1,altitude:0,vy:0,hearts:3,ammo:6,maxAmmo:9,
  turboCharges:1,turbo:0,shield:0,invuln:0,cooldown:0,combo:0,comboLeft:0,maxCombo:0,
  score:0,wave:1,stuns:0,dodges:0,hits:0,jumps:0,collects:0,events:[],enemies:[],pickups:[],shots:[],
  id:0,nextSpawn:460,encounters:0,bossWaves:new Set(),result:"",ammoClock:0,threat:12};
 populate(g);return g;
}
export function beginArcade(g){if(g.phase!=="ready")return false;g.phase="running";addEvent(g,"wave",{wave:1});return true;}
export function pauseArcade(g){if(g.phase==="running")g.phase="paused";else if(g.phase==="paused")g.phase="running";else return false;return true;}
export function moveLane(g,delta){
 if(g.phase!=="running"||![-1,1].includes(delta))return false;
 const next=clamp(g.laneTarget+delta,0,2);
 if(next===g.laneTarget)return false;
 g.laneTarget=next;addEvent(g,"lane",{lane:next});return true;
}
export function jumpArcade(g){
 if(g.phase!=="running"||g.altitude>0)return false;
 g.altitude=.1;g.vy=300;g.jumps++;addEvent(g,"jump",{lane:g.lane});return true;
}
export function shootArcade(g){
 if(g.phase!=="running"||g.ammo<=0||g.cooldown>0||g.altitude>26)return false;
 g.ammo--;g.cooldown=.23;
 g.shots.push({x:g.distance+29,lane:g.lane,ttl:1.05});
 addEvent(g,"shot",{x:g.distance+29,lane:g.lane});return true;
}
export function turboArcade(g){
 if(g.phase!=="running"||g.turboCharges<1||g.turbo>0)return false;
 g.turboCharges--;g.turbo=1.05;g.threat=Math.max(0,g.threat-12);
 addEvent(g,"turbo",{lane:g.lane});return true;
}
function end(g,phase,reason){g.phase=phase;g.result=reason;addEvent(g,phase,{reason});}
function impact(g,e){
 if(g.turbo>0||g.shield>0){
   if(g.turbo<=0)g.shield=0;
   e.passed=true;g.dodges++;
   const points=reward(g,RULES[e.type].points);
   addEvent(g,"protected",{x:e.x,lane:e.lane,points,enemy:e.type});return;
 }
 if(g.invuln>0)return;
 g.hearts--;g.hits++;g.combo=0;g.comboLeft=0;g.invuln=1.1;
 g.speed*=.60;g.threat=clamp(g.threat+23,0,100);
 addEvent(g,"hit",{x:e.x,lane:e.lane,enemy:e.type});
 if(g.hearts<=0)end(g,"lost","T'has quedat sense cors!");
}
function collect(g,p){
 p.collected=true;g.collects++;
 if(p.kind==="heart")g.hearts=Math.min(3,g.hearts+1);
 else if(p.kind==="ammo")g.ammo=Math.min(g.maxAmmo,g.ammo+4);
 else if(p.kind==="shield")g.shield=8;
 else if(p.kind==="turbo")g.turboCharges=Math.min(3,g.turboCharges+1);
 const points=p.kind==="star"?reward(g,220):50;
 if(p.kind!=="star")g.score+=points;
 addEvent(g,"pickup",{x:p.x,lane:p.lane,kind:p.kind,points});
}
function tick(g,input,dt){
 g.time+=dt;
 for(const key of ["turbo","shield","invuln","cooldown","comboLeft"])g[key]=Math.max(0,g[key]-dt);
 if(!g.comboLeft)g.combo=0;
 const target=g.turbo>0?255:input.brake?82:input.accelerate?206:146;
 g.speed+=(target-g.speed)*Math.min(1,dt*4);
 g.distance+=g.speed*dt;g.score+=g.speed*dt*.21;
 // Smooth lane steering with continuous collision checks while crossing lanes.
 g.lane+=clamp(g.laneTarget-g.lane,-dt*5.8,dt*5.8);
 if(g.altitude>0){
  g.altitude+=g.vy*dt;g.vy-=790*dt;
  if(g.altitude<=0){g.altitude=0;g.vy=0;addEvent(g,"land",{lane:g.lane});}
 }
 g.ammoClock+=dt;
 if(g.ammoClock>=3.3){g.ammoClock-=3.3;g.ammo=Math.min(g.maxAmmo,g.ammo+1);}
 if(input.fire)shootArcade(g);
 populate(g);
 for(const shot of g.shots){shot.x+=(g.speed+370)*dt;shot.ttl-=dt;}
 for(const e of g.enemies){
  if(e.passed)continue;
  const spec=RULES[e.type],gap=e.x-g.distance;
  if(e.stunned){e.stunLeft-=dt;if(e.stunLeft<=0){e.passed=true;continue;}}
  else{
   // Runners slow down at first, visibly warn, then lunge on the same lane.
   if(e.type==="runner"&&gap<300&&!e.warning){e.warning=true;addEvent(g,"warning",{x:e.x,lane:e.lane,enemy:e.type});}
   if(gap<650)e.x-=spec.pace*(e.warning?1.5:1)*dt;
   if(spec.hp>0){
    for(const s of g.shots){
     if(s.ttl<=0||Math.abs(s.lane-e.lane)>.40||Math.abs(s.x-e.x)>spec.radius+9)continue;
     s.ttl=0;e.hp--;
     addEvent(g,"paint",{x:e.x,lane:e.lane,enemy:e.type,hp:e.hp});
     if(e.hp<=0){
      e.stunned=true;e.stunLeft=3.1;g.stuns++;
      const points=reward(g,spec.points);
      if(g.stuns%4===0)g.turboCharges=Math.min(3,g.turboCharges+1);
      addEvent(g,"stun",{x:e.x,lane:e.lane,enemy:e.type,points});
      break;
     }
    }
   }
  }
  if(!e.hit&&!e.stunned&&Math.abs(e.x-g.distance)<spec.radius+11&&Math.abs(g.lane-e.lane)<.39){
    e.hit=true;
    if(g.altitude>spec.height){
     e.passed=true;g.dodges++;
     addEvent(g,"dodge",{x:e.x,lane:e.lane,points:reward(g,spec.points)});
    }else impact(g,e);
  }
  if(g.phase!=="running")break;
  if(e.x<g.distance-46){
   if(!e.hit&&!e.stunned){g.dodges++;addEvent(g,"dodge",{x:e.x,lane:e.lane,points:reward(g,50)});}
   e.passed=true;
  }
 }
 g.shots=g.shots.filter(s=>s.ttl>0&&s.x<g.distance+760);
 if(g.phase!=="running")return;
 for(const p of g.pickups){
  if(!p.collected&&Math.abs(p.x-g.distance)<22&&Math.abs(p.lane-g.lane)<.39&&g.altitude<34)collect(g,p);
 }
 g.threat=clamp(g.threat+(g.speed<110?5.3:g.speed<150?-.15:-3.3)*dt,0,100);
 if(g.threat>=100){end(g,"lost","La horda t'ha atrapat!");return;}
 const wave=Math.floor(g.distance/DISTRICT_LENGTH)+1;
 if(wave>g.wave){
  if(g.mode==="story"&&wave>4){g.score+=1500+g.hearts*300;end(g,"won","Has travessat tota la ciutat!");return;}
  g.wave=wave;g.ammo=Math.min(g.maxAmmo,g.ammo+2);g.turboCharges=Math.min(3,g.turboCharges+1);
  g.score+=350;addEvent(g,"wave",{wave,points:350});
 }
}
export function stepArcade(g,input={},elapsed=1/60){
 if(!Number.isFinite(elapsed)||elapsed<=0)return;
 let rest=Math.min(.12,elapsed);
 while(rest>1e-8&&g.phase==="running"){const dt=Math.min(1/120,rest);tick(g,input,dt);rest-=dt;}
}
export function achievements(g){
 return [{id:"finish",name:"Fugida completa",earned:g.phase==="won"},
 {id:"combo",name:"Combo ×10",earned:g.maxCombo>=10},
 {id:"paint",name:"15 zombis frenats",earned:g.stuns>=15},
 {id:"survive",name:"Onada 5",earned:g.mode==="endless"&&g.wave>=5},
 {id:"clean",name:"Sense cap xoc",earned:g.phase==="won"&&g.hits===0}];
}
