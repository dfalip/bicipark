(async()=>{
'use strict';
const list=document.getElementById('routes'),count=document.getElementById('count'),search=document.getElementById('search'),modality=document.getElementById('modality'),availability=document.getElementById('availability'),sort=document.getElementById('sort'),clear=document.getElementById('clearFilters');
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
const num=v=>Number.isFinite(Number(v))?Number(v):null;
// Trust is explicit: an external URL is provenance, not verification. Only entries
// deliberately marked verified may receive the verified-source badge.
const trust=r=>r.needsReview||r.kind==='external'&&r.verified!==true?'review':(r.kind==='local'?'track':'source');
const trustCopy={track:'Track local',source:'Font verificada',review:'Revisió pendent'};
try{
 const res=await fetch('./data/catalog.json');if(!res.ok)throw Error();const routes=await res.json();
 function render(){
  list.replaceChildren();
  const q=search.value.trim().toLocaleLowerCase();
  let items=routes.filter(r=>{const haystack=[r.name,r.modality,r.metricNote].filter(Boolean).join(' ').toLocaleLowerCase();return(!q||haystack.includes(q))&&(!modality.value||r.modality===modality.value)&&(!availability.value||availability.value==='local'&&r.kind==='local'||availability.value==='external'&&r.kind==='external'||availability.value==='review'&&trust(r)==='review')});
  items=[...items].sort((a,b)=>sort.value==='distance'?(num(a.distanceKm)??Infinity)-(num(b.distanceKm)??Infinity):sort.value==='elevation'?(num(a.elevationGain)??Infinity)-(num(b.elevationGain)??Infinity):a.name.localeCompare(b.name,'ca'));
  const local=items.filter(r=>r.kind==='local').length,review=items.filter(r=>trust(r)==='review').length;
  count.textContent=`${items.length} rutes · ${local} amb track local${review?` · ${review} pendents de revisió`:''}`;
  if(!items.length){const empty=node('p','No hi ha rutes que coincideixin amb aquests filtres.');empty.className='catalog-empty';list.append(empty);return}
  for(const r of items){
   const card=node('article','');card.className='panel route-card';
   const title=node('h2',r.name),meta=node('p',`${r.distanceKm??'—'} km · ${r.elevationGain??'—'} m+ · ${r.modality}`);meta.className='route-meta';
   const badge=node('span',trustCopy[trust(r)]);badge.className=`trust-badge trust-${trust(r)}`;card.append(title,badge,meta);
   if(r.metricNote)card.append(node('p',r.metricNote));
   if(trust(r)==='review')card.append(node('p','Metadades pendents de revisió: consulta la font i el track abans de sortir.'));
   const actions=node('p','');actions.className='route-actions';const a=node('a',r.kind==='local'?'Obre el track':'Consulta la ruta');a.href=r.url;actions.append(a);
   if(r.sourceUrl&&r.sourceUrl!==r.url){const source=node('a','Font original');source.href=r.sourceUrl;source.rel='noopener';actions.append(source)}card.append(actions);list.append(card)
  }
 }
 [search,modality,availability,sort].forEach(el=>el.addEventListener(el===search?'input':'change',render));
 clear.addEventListener('click',()=>{search.value='';modality.value='';availability.value='';sort.value='name';render();search.focus()});render()
}catch{count.textContent='No s’ha pogut carregar el catàleg. Torna-ho a provar.'}
})();
