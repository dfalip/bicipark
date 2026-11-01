(async()=>{
 'use strict';
 const $=id=>document.getElementById(id),C=BiciParkRideCopy,t=C.t,M=BiciParkCatalogModel,key='bicipark.catalog.favorites.v1',fields=['search','modality','max','local','favorites','sort'];
 let routes=[],favorites=[];
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 function readFavorites(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');favorites=Array.isArray(value)?value.filter(id=>typeof id==='string'):[];}catch{favorites=[];}}
 function safeLink(value){try{const u=new URL(value,location.href);return u.protocol==='https:'||u.origin===location.origin?u.href:null;}catch{return null;}}
 const params=new URLSearchParams(location.search);
 for(const id of fields){if(!params.has(id))continue;if($(id).type==='checkbox')$(id).checked=params.get(id)==='1';else $(id).value=params.get(id);}
 function render(){
  $('routes').replaceChildren();const options={q:$('search').value,modality:$('modality').value,max:$('max').value,local:$('local').checked,favorites:$('favorites').checked,sort:$('sort').value};
  const items=M.filter(routes,options,favorites);$('count').textContent=items.length+' '+t('results')+' · '+items.filter(r=>r.kind==='local').length+' '+t('local');
  if(!items.length)$('routes').append(node('p',t('noResults')));
  for(const r of items){
   const card=node('article','');card.className='panel';card.append(node('h2',r.name),node('p',`${M.distance(r)??'—'} km · ${r.elevationGain??'—'} m+ · ${t(r.modality)}`));const badge=node('p',t(r.kind==='local'?'local':'external'));badge.className='route-badge';card.append(badge);
   if(r.metricNote)card.append(node('p',r.metricNote));if(r.needsReview)card.append(node('p',t('review')));
   const actions=node('div','');actions.className='route-actions';const href=safeLink(r.url);if(href){const a=node('a',t(r.kind==='local'?'openTrack':'openSource'));a.href=href;actions.append(a);}
   const button=node('button',t(favorites.includes(r.id)?'unfavorite':'favorite'));button.className='route-favorite';button.type='button';button.setAttribute('aria-pressed',String(favorites.includes(r.id)));button.setAttribute('aria-label',button.textContent+': '+r.name);
   button.onclick=()=>{const next=favorites.includes(r.id)?favorites.filter(id=>id!==r.id):[...favorites,r.id];try{localStorage.setItem(key,JSON.stringify(next));favorites=next;$('error').textContent='';render();const replacement=[...$('routes').querySelectorAll('button')].find(b=>b.dataset.route===r.id);(replacement||$('favorites')).focus();}catch{$('error').textContent=t('saveError');}};button.dataset.route=r.id;actions.append(button);card.append(actions);
   if(r.sourceUrl&&r.sourceUrl!==r.url&&safeLink(r.sourceUrl)){const source=node('a',t('source'));source.href=safeLink(r.sourceUrl);card.append(source);}$('routes').append(card);
  }
 }
 function update(){const p=new URLSearchParams();for(const id of fields){const el=$(id),value=el.type==='checkbox'?(el.checked?'1':''):el.value;if(value&&!(id==='sort'&&value==='name'))p.set(id,value);}history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);render();}
 for(const id of fields)$(id).addEventListener('input',update);
 $('clear').onclick=()=>{for(const id of fields){const el=$(id);if(el.type==='checkbox')el.checked=false;else el.value=id==='sort'?'name':'';}update();$('search').focus();};
 window.addEventListener('bicipark:language-changed',render);window.addEventListener('storage',event=>{if(event.key===key){readFavorites();render();}});
 try{const res=await fetch('./data/catalog.json');if(!res.ok)throw Error();routes=await res.json();if(!Array.isArray(routes))throw Error();readFavorites();render();}catch{$('count').textContent=t('catalogError');}
})();
