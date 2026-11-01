(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BiciParkWatchEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const number=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
 const rad=n=>n*Math.PI/180;
 const codes=new Set([0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
 function distance(a,b){const h=Math.sin(rad(b[1]-a[1])/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(rad(b[0]-a[0])/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
 function bearing(a,b){const dl=rad(b[0]-a[0]);return (Math.atan2(Math.sin(dl)*Math.cos(rad(b[1])),Math.cos(rad(a[1]))*Math.sin(rad(b[1]))-Math.sin(rad(a[1]))*Math.cos(rad(b[1]))*Math.cos(dl))*180/Math.PI+360)%360;}
 function sampleRoute(lines,speed,pauseMinutes=0){
  speed=number(speed);pauseMinutes=number(pauseMinutes);
  if(speed===null||speed<5||speed>50||pauseMinutes===null||pauseMinutes<0||pauseMinutes>240)throw Error('invalidPace');
  if(!Array.isArray(lines)||!lines.length)throw Error('invalidTrack');
  const edges=[];let km=0,count=0,previous=null;
  for(const line of lines){
   if(!Array.isArray(line)||line.length<2)throw Error('invalidTrack');
   for(const p of line){if(++count>100000||!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('invalidTrack');}
   if(previous&&distance(previous,line[0])>0.1)throw Error('disconnected');
   for(let i=1;i<line.length;i++){const length=distance(line[i-1],line[i]);if(length>0){edges.push({a:line[i-1],b:line[i],start:km,length});km+=length;}}
   previous=line[line.length-1];
  }
  if(km<0.01)throw Error('shortTrack');
  return [0,.25,.5,.75,1].map(fraction=>{const at=km*fraction,edge=edges.find(e=>e.start+e.length>=at)||edges[edges.length-1],f=Math.max(0,Math.min(1,(at-edge.start)/edge.length));const delta=((edge.b[0]-edge.a[0]+540)%360)-180;return {point:[((edge.a[0]+delta*f+540)%360)-180,edge.a[1]+(edge.b[1]-edge.a[1])*f],km:at,bearing:bearing(edge.a,edge.b),offsetMs:(at/speed*60+pauseMinutes*fraction)*60000};});
 }
 function rowAt(data,timeMs){
  const h=data?.hourly,times=h?.time;if(!Array.isArray(times)||!times.length||!Number.isFinite(timeMs))return null;
  const seconds=timeMs/1000;
  if(seconds<times[0]||seconds>times[times.length-1])return null;
  let index=-1,best=Infinity;times.forEach((t,i)=>{if(typeof t==='number'&&Math.abs(t-seconds)<best){best=Math.abs(t-seconds);index=i;}});
  if(index<0||best>1800)return null;
  const get=k=>number(h[k]?.[index]);
  const row={time:times[index]*1000,code:get('weather_code'),temp:get('temperature_2m'),rain:get('precipitation_probability'),wind:get('wind_speed_10m'),gust:get('wind_gusts_10m'),direction:get('wind_direction_10m'),isDay:get('is_day')};
  row.complete=codes.has(row.code)&&row.temp!==null&&row.rain!==null&&row.rain>=0&&row.rain<=100&&row.wind!==null&&row.wind>=0&&row.gust!==null&&row.gust>=0;
  return row;
 }
 function assess(row,heading){
  if(!row)return {alerts:[],headwind:null,crosswind:null};
  const alerts=[];
  if([95,96,99].includes(row.code))alerts.push('storm');
  if([56,57,66,67,71,73,75,77,85,86].includes(row.code))alerts.push('iceSnow');
  if(row.rain!==null&&row.rain>=60)alerts.push('rain');
  if(row.wind!==null&&row.wind>=30||row.gust!==null&&row.gust>=50)alerts.push('wind');
  if(row.temp!==null&&row.temp>=32)alerts.push('heat');
  if(row.temp!==null&&row.temp<=3)alerts.push('cold');
  if(row.isDay===0)alerts.push('dark');
  const valid=row.wind!==null&&row.wind>=0&&row.direction!==null&&row.direction>=0&&row.direction<=360;
  const angle=rad(row.direction-heading);
  return {alerts,headwind:valid?Math.cos(angle)*row.wind:null,crosswind:valid?Math.abs(Math.sin(angle))*row.wind:null};
 }
 function evaluate(samples,forecasts,departure){
  const points=samples.map((sample,i)=>{const arrival=departure+sample.offsetMs,row=rowAt(forecasts[i]?.data,arrival);return {...sample,arrival,row,...assess(row,sample.bearing),fetchedAt:forecasts[i]?.at||null};});
  return {departure,points,complete:points.every(p=>p.row?.complete),adversePoints:points.filter(p=>p.alerts.some(a=>a!=='dark')).length};
 }
 return {number,distance,bearing,sampleRoute,rowAt,assess,evaluate};
});
