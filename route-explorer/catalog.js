(async()=>{
'use strict';
const list=document.getElementById('routes'),count=document.getElementById('count'),search=document.getElementById('search'),modality=document.getElementById('modality'),region=document.getElementById('region'),difficulty=document.getElementById('difficulty'),availability=document.getElementById('availability'),sort=document.getElementById('sort'),clear=document.getElementById('clearFilters');
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const trust=r=>r.needsReview||r.kind==='external'&&r.verified!==true?'review':(r.kind==='local'?'track':'source');
const trustCopy={track:'Track local',source:'Font verificada',review:'Revisió pendent'};
try{
 const [catalogRes,metadataRes,verifiedRoutesRes]=await Promise.all([fetch('./data/catalog.json'),fetch('./data/verified-metadata.json'),fetch('./data/verified-routes.json')]);if(!catalogRes.ok)throw Error();
 const baseRoutes=await catalogRes.json(),metadata=metadataRes.ok?await metadataRes.json():{},verifiedRoutes=verifiedRoutesRes.ok?await verifiedRoutesRes.json():[];
 const mergedBase=baseRoutes.map(r=>({...r,...(metadata[r.id]||{})}));
 const knownIds=new Set(mergedBase.map(r=>r.id));
 const routes=[...mergedBase,...verifiedRoutes.filter(r=>r&&r.id&&!knownIds.has(r.id))];
 [...new Set(routes.map(r=>r.region).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca')).forEach(value=>{const option=node('option',value);option.value=value;region.append(option)});
 function render(){
  list.replaceChildren();
  const q=search.value.trim().toLocaleLowerCase();
  let items=routes.filter(r=>{const haystack=[r.name,r.modality,r.region,r.start,r.metricNote].filter(Boolean).join(' ').toLocaleLowerCase();return(!q||haystack.includes(q))&&(!modality.value||r.modality===modality.value)&&(!region.value||r.region===region.value)&&(!difficulty.value||String(r.difficultyLevel)===difficulty.value)&&(!availability.value||availability.value==='local'&&r.kind==='local'||availability.value==='external'&&r.kind==='external'||availability.value==='review'&&trust(r)==='review')});
  items=[...items].sort((a,b)=>sort.value==='distance'?(num(a.distanceKm)??Infinity)-(num(b.distanceKm)??Infinity):sort.value==='elevation'?(num(a.elevationGain)??Infinity)-(num(b.elevationGain)??Infinity):a.name.localeCompare(b.name,'ca'));
  const local=items.filter(r=>r.kind==='local').length,review=items.filter(r=>trust(r)==='review').length;
  count.textContent=`${items.length} rutes · ${local} amb track local${review?` · ${review} pendents de revisió`:''}`;
  if(!items.length){const empty=node('p','No hi ha rutes que coincideixin amb aquests filtres.');empty.className='catalog-empty';list.append(empty);return}
  for(const r of items){
   const card=node('article','');card.className='panel route-card';
   const title=node('h2',r.name),meta=node('p',`${r.distanceKm??'—'} km · ${r.elevationGain??'—'} m+ · ${r.modality}`);meta.className='route-meta';
   const badge=node('span',trustCopy[trust(r)]);badge.className=`trust-badge trust-${trust(r)}`;card.append(title,badge,meta);
   const context=[r.region,r.start&&`Sortida: ${r.start}`,r.duration&&`Durada: ${r.duration}`,r.difficulty&&`Dificultat: ${r.difficulty}`].filter(Boolean).join(' · ');if(context)card.append(node('p',context));
   if(r.metricNote)card.append(node('p',r.metricNote));
   if(r.verified&&r.source){card.append(node('p',`Dades contrastades amb ${r.source}${r.verifiedAt?` · ${r.verifiedAt}`:''}.`))}
   if(trust(r)==='review')card.append(node('p','Metadades pendents de revisió: consulta la font i el track abans de sortir.'));
   const actions=node('p','');actions.className='route-actions';const a=node('a',r.kind==='local'?'Obre el track':'Consulta la ruta');a.href=r.url;actions.append(a);
   if(r.sourceUrl&&r.sourceUrl!==r.url){const source=node('a','Font original');source.href=r.sourceUrl;source.rel='noopener';actions.append(source)}card.append(actions);list.append(card)
  }
 }
 [search,modality,region,difficulty,availability,sort].forEach(el=>el.addEventListener(el===search?'input':'change',render));
 clear.addEventListener('click',()=>{search.value='';modality.value='';region.value='';difficulty.value='';availability.value='';sort.value='name';render();search.focus()});render()
}catch{count.textContent='No s’ha pogut carregar el catàleg. Torna-ho a provar.'}
})();
