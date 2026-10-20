(() => {
 'use strict';let last=0,chain=Promise.resolve();const cache=new Map();
 async function search(text){
  const query=String(text).trim();if(query.length<3)throw Error('Escriu almenys tres caràcters.');if(cache.has(query))return cache.get(query);
  const task=async()=>{const wait=Math.max(0,1100-(Date.now()-last));if(wait)await new Promise(r=>setTimeout(r,wait));last=Date.now();const config=await fetch('/config/services.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuració no disponible.');return r.json()});const url=new URL(config.geocoderUrl);if(url.protocol!=='https:')throw Error('Proveïdor de cerca no configurat.');url.searchParams.set('q',query);url.searchParams.set('limit','5');const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);try{const res=await fetch(url,{signal:ctl.signal,credentials:'omit'});if(!res.ok)throw Error('La cerca no està disponible. Tria el punt al mapa.');const data=await res.json();const rows=(data.features||[]).filter(f=>f.geometry?.type==='Point'&&f.geometry.coordinates.every(Number.isFinite)).map(f=>{const p=f.properties||{};return {lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],label:[p.name,p.street,p.housenumber,p.city,p.country].filter(Boolean).join(',')}});cache.set(query,rows);return rows}finally{clearTimeout(timer)}};
  const result=chain.then(task,task);chain=result.catch(()=>{});return result;
 }
 window.BiciParkGeocoder={search};
})();
