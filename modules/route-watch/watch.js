(() => {
 'use strict';
 const $=id=>document.getElementById(id),E=BiciParkWatchEngine,C=BiciParkRideCopy,t=C.t,cache=new Map();
 let routes=[],busy=false,options=[],active=0,message='';
 const node=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;};
 const date=ms=>new Date(ms).toLocaleString(C.lang(),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const fmt=n=>n===null||!Number.isFinite(n)?'—':Math.round(n);
 const status=key=>{message=key;$('status').textContent=t(key);};
 try{const data=JSON.parse(localStorage.getItem('bicipark.planner.routes.v1')||'[]');routes=Array.isArray(data)?data.filter(r=>r&&typeof r.id==='string'&&r.route):[];}catch{}
 for(const route of routes){const o=node('option',route.route.properties?.name||route.id);o.value=route.id;$('route').append(o);}
 const next=new Date(Date.now()+2*3600000);next.setMinutes(0,0,0);$('departure').value=new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,16);
 function habits(){try{const a=JSON.parse(localStorage.getItem('bicipark.watch.routes.v1')||'[]');return Array.isArray(a)?a:[];}catch{return [];}}
 const habitual=habits().find(id=>routes.some(r=>r.id===id));if(habitual)$('route').value=habitual;
 function update(){for(const id of ['route','departure','speed','stops'])$(id).disabled=busy;$('watch').textContent=t(habits().includes($('route').value)?'unhabit':'habit');$('watch').disabled=$('check').disabled=busy||!routes.length;}
 function invalidate(){options=[];$('comparisons').replaceChildren();$('forecast').replaceChildren();status(routes.length?'':'empty');update();}
 for(const id of ['route','departure','speed','stops'])$(id).addEventListener('change',invalidate);
 $('watch').onclick=()=>{try{const id=$('route').value,a=habits();localStorage.setItem('bicipark.watch.routes.v1',JSON.stringify(a.includes(id)?a.filter(x=>x!==id):[...a,id]));update();}catch{status('saveError');}};
 async function forecast(point,base){
  const key=base+'|'+point.join(',');if(cache.has(key)&&Date.now()-cache.get(key).at<900000)return cache.get(key);
  const url=new URL(base);url.searchParams.set('latitude',point[1]);url.searchParams.set('longitude',point[0]);
  for(const [k,v] of Object.entries({hourly:'weather_code,temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',timeformat:'unixtime',timezone:'UTC',forecast_days:'7',wind_speed_unit:'kmh',temperature_unit:'celsius'}))url.searchParams.set(k,v);
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
  try{const res=await fetch(url,{signal:ctl.signal,credentials:'omit'});if(!res.ok)throw Error('unavailable');const data=await res.json();if(!Array.isArray(data.hourly?.time))throw Error('unavailable');const result={at:Date.now(),data};cache.set(key,result);if(cache.size>30)cache.delete(cache.keys().next().value);return result;}finally{clearTimeout(timer);}
 }
 function render(){
  $('comparisons').replaceChildren();$('forecast').replaceChildren();if(!options.length)return;
  const allComplete=options.every(o=>o.complete),least=allComplete?Math.min(...options.map(o=>o.adversePoints)):null;
  options.forEach((o,index)=>{const button=node('button','');button.type='button';button.setAttribute('aria-pressed',String(index===active));button.append(node('strong',date(o.departure)),node('span',o.complete?`${o.adversePoints}/5 ${t('adverse')}`:t('partial')));if(least!==null&&o.adversePoints===least)button.append(node('small',t('lessAlerts')));button.onclick=()=>{active=index;render();};$('comparisons').append(button);});
  const selected=options[active];
  selected.points.forEach((p,i)=>{
   const section=node('section','',`panel watch-point${p.row?.complete?'':' watch-failure'}`),header=node('header','');header.append(node('h2',i===0?t('start'):i===4?t('end'):`${i*25}%`),node('span',p.km.toFixed(1)+' km'));section.append(header,node('p',t('arrival')+': '+date(p.arrival),'watch-time'));
   if(!p.row){section.append(node('p',t('unavailable')));$('forecast').append(section);return;}
   const row=p.row,icon=document.createElement('div');icon.innerHTML=BiciParkWeatherIcons.html(row.code,row.wind,row.isDay!==0);section.append(icon,node('p',`${fmt(row.temp)} °C · ${t('probRain')} ${fmt(row.rain)}% · ${t('windSpeed')} ${fmt(row.wind)} km/h · ${t('gusts')} ${fmt(row.gust)} km/h`,'watch-metrics'));
   if(p.headwind!==null)section.append(node('p',`${t(p.headwind>=0?'headwind':'tailwind')} ${fmt(Math.abs(p.headwind))} km/h · ${t('crosswind')} ${fmt(p.crosswind)} km/h`));
   if(!row.complete)section.append(node('p',t('partial'),'watch-alert'));
   if(p.alerts.length)for(const alert of p.alerts)section.append(node('p',t(alert),'watch-alert'));else if(row.complete)section.append(node('p',t('noAlerts'),'note'));
   section.append(node('p',t('weatherHour')+': '+date(row.time)+' · '+t('fetched')+': '+date(p.fetchedAt),'note'));$('forecast').append(section);
  });
 }
 $('check').onclick=async()=>{
  if(busy)return;invalidate();const departure=new Date($('departure').value).getTime(),now=Date.now();if(!Number.isFinite(departure)||departure<now||departure>now+6*86400000){status('dateError');return;}
  busy=true;update();status('loading');
  try{
   const chosen=routes.find(r=>r.id===$('route').value);if(!chosen)throw Error('invalidTrack');
   const samples=E.sampleRoute(BiciParkGPX.segments(chosen.route),$('speed').value,$('stops').value);
   const config=await fetch('/config/services.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json();});const url=new URL(config.weatherUrl);if(url.protocol!=='https:')throw Error('unavailable');
   const forecasts=[];for(const sample of samples){try{forecasts.push(await forecast(sample.point,url.href));}catch{forecasts.push(null);}}
   options=[-3600000,0,3600000].map(shift=>departure+shift).filter(time=>time>=now).map(time=>E.evaluate(samples,forecasts,time));active=Math.max(0,options.findIndex(o=>o.departure===departure));render();status(options.every(o=>o.complete)?'complete':'partial');
   if(forecasts.some(Boolean))window.BiciParkAnalytics?.track('watch_checked');
  }catch(e){status(['invalidPace','invalidTrack','disconnected','shortTrack'].includes(e.message)?e.message:'unavailable');}finally{busy=false;update();}
 };
 window.addEventListener('bicipark:language-changed',()=>{update();status(message);render();});invalidate();
})();
