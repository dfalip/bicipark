// Local-only BiciPark Play missions. No server tracking and no fabricated rewards.
export const DAILY_STORE='bicipark-play:daily-v1';
const validDay=day=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return false;
 const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;};
export function localDay(date=new Date()){
 const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),
  d=String(date.getDate()).padStart(2,'0');
 return y+'-'+m+'-'+d;
}
export function missionForDay(day){
 if(!validDay(day))return null;
 const [y,m,d]=day.split('-').map(Number);
 const index=Math.floor(Date.UTC(y,m-1,d)/86400000);
 if(index%2===0){
  const course=Math.floor(index/2)%4;
  const courseNames=['Pista del Bosc','Coll de la Guineu','Gran Glacera','Descens Extrem'];
  return {day,game:'snowbike',course,title:'Descens del dia',
   subtitle:courseNames[course],icon:'⛷️',
   description:'Completa la pista amb el millor temps possible. Les portes i els trucs de 360° premien la precisió.',
   href:'../snowbike-downhill/?challenge='+day+'&course='+course};
 }
 const seed=Math.imul(index,2654435761)>>>0;
 return {day,game:'zombiepedal',seed,title:'Fugida del dia',
  subtitle:'Ruta amb zombis compartida',icon:'🧟',
  description:'Tots els que juguin aquest dia reben la mateixa distribució inicial d’obstacles. Combina canvis de carril, salts, pintura i turbo.',
  href:'../zombiepedal/?challenge='+day+'&seed='+seed};
}
export function readDaily(storage){
 try{
  const obj=JSON.parse(storage?.getItem(DAILY_STORE)||'{}');
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return {};
  return Object.fromEntries(Object.entries(obj).filter(([day,r])=>validDay(day)&&
   r&&typeof r==='object'&&['snowbike','zombiepedal'].includes(r.game)&&
   Number.isFinite(r.score)&&r.score>=0&&missionForDay(day)?.game===r.game));
 }catch{return {};}
}
export function dailyStats(records,day){
 if(!validDay(day))return {streak:0,lastSeven:[],completed:0};
 const lastSeven=[];
 for(let i=6;i>=0;i--){
  const [y,m,d]=day.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d-i));
  const key=dt.toISOString().slice(0,10);
  lastSeven.push({day:key,complete:Boolean(records[key]),game:missionForDay(key)?.game});
 }
 let streak=0,dt=new Date(day+'T12:00:00Z');
 // A streak continues from yesterday if today's mission is not yet completed.
 if(!records[day])dt.setUTCDate(dt.getUTCDate()-1);
 for(let i=0;i<365;i++){
  const key=dt.toISOString().slice(0,10);
  if(!records[key])break;
  streak++;dt.setUTCDate(dt.getUTCDate()-1);
 }
 return {streak,lastSeven,completed:lastSeven.filter(x=>x.complete).length};
}
export function readBest(storage){
 const parse=k=>{try{return JSON.parse(storage?.getItem(k)||'null');}catch{return null;}};
 const snow=parse('bicipark-snowbike-downhill-times-v1')||{};
 const times=Object.values(snow).filter(x=>x&&Number.isFinite(x.time)&&x.time>=0).map(x=>x.time);
 const zombie=parse('bicipark-zombiepedal-arcade-v1');
 return {snowTime:times.length?Math.min(...times):null,
  zombieScore:zombie&&Number.isFinite(zombie.story)&&zombie.story>0?zombie.story:null};
}
